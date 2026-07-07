# La Gâtinelle — application de gestion

Application de gestion de la monnaie locale la Gâtinelle : achat de gâtinelles
(espèces, virement, carte), paiement chez les commerçants agréés, reconversion
en euros, et administration (validation des commerçants, suivi de la masse en
circulation).

## Démarrage

```bash
npm install
cp .env.example .env   # puis complétez AUTH_SECRET, ASSOCIATION_IBAN, CRON_SECRET
npx prisma migrate dev
node prisma/seed.mjs    # crée un compte admin de test (voir la sortie console)
npm run dev
```

L'application est ensuite disponible sur http://localhost:3000.

## Comptes et rôles

- **Particulier** / **Commerçant** : créés via `/inscription`.
- **AGENT** / **ADMIN** : rôles internes à l'association, à attribuer
  manuellement en base (champ `staffRole` sur `User`) ou via le script de seed
  pour un premier compte admin.
- Un compte commerçant doit être **validé par un administrateur** (page
  `/admin`) avant de pouvoir recevoir des paiements.

## Connexion rapide en caisse (numéro d'adhérent + PIN)

Pour éviter de saisir email + mot de passe à chaque paiement en caisse,
l'inscription attribue aussi un **numéro d'adhérent** (1 lettre + 5 chiffres,
affiché à l'utilisateur après inscription et sur `/compte`) et un **code PIN à
4 chiffres** choisi par l'utilisateur. C'est le mode de connexion par défaut
sur `/connexion` (l'email/mot de passe reste disponible via un lien de
bascule). Modèle repris de l'Eusko / euskopay (Euskal Moneta, Pays Basque).

- Voir `src/lib/pin.ts` (vérification + verrouillage) et
  `src/lib/auth.ts` (provider Auth.js `member-pin`).
- Après 3 échecs, l'accès est bloqué (`pinBlocked`) — déblocable uniquement
  par un administrateur, section « Accès PIN bloqués » de `/admin`.
- L'utilisateur peut changer son PIN depuis `/compte` (section Sécurité).
- La session dure 90 jours (`maxAge` dans `src/lib/auth.ts`) : sur son propre
  téléphone, l'adhérent n'a normalement à se reconnecter que rarement.

## Paiement par carte (Up2Pay e-Transactions — Crédit Agricole)

Le paiement CB redirige vers la page hébergée Up2Pay e-Transactions (protocole
`PBX_*`, signature HMAC-SHA512 pour nos envois, signature RSA-SHA1 pour leurs
réponses). Voir `src/lib/up2pay.ts`.

- `.env` contient par défaut les identifiants du **compte de démonstration
  mutualisé et public** fourni par Crédit Agricole (SITE 1999887 / RANG 32 /
  IDENTIFIANT 215), utilisable tel quel contre l'environnement de recette
  (`https://preprod-tpeweb.e-transactions.fr/php/`) pour tester le parcours
  sans compte marchand réel. Carte de test : `1111 2222 3333 4444`, date et
  CVV quelconques.
- Avant la mise en production, remplacez `UP2PAY_SITE` / `UP2PAY_RANG` /
  `UP2PAY_IDENTIFIANT` / `UP2PAY_HMAC_KEY` par les identifiants de **votre**
  boutique (Back-Office Vision Air, onglet Paramètres) et `UP2PAY_PAYMENT_URL`
  par `https://tpeweb.e-transactions.fr/php/`.
- La notification serveur à serveur (IPN, `/api/up2pay/ipn`) est la seule
  source fiable de crédit du compte — elle nécessite que votre application
  soit joignable publiquement en HTTPS depuis internet (pas testable en
  `localhost` sans tunnel type ngrok). Les URL de retour navigateur
  (`/compte?achat=...`) ne sont qu'un confort d'affichage.
- `UP2PAY_PUBLIC_KEY` (clé RSA de vérification des réponses) est fixe et ne
  dépend pas de votre compte marchand.

## Job de péremption

Les gâtinelles achetées par un particulier expirent 1 an après leur achat
(les gâtinelles détenues par un commerçant n'expirent jamais). Le passage en
péremption se fait via `/api/cron/expire-lots`, à appeler une fois par jour
par un ordonnanceur externe avec l'en-tête
`Authorization: Bearer <CRON_SECRET>`. Un fichier `vercel.json` est fourni si
vous déployez sur Vercel (Vercel Cron).

## Tests

```bash
npm test
```

Les tests couvrent la logique métier critique du grand livre (`src/lib/wallet.ts`) :
règles de péremption, dépense FIFO par date d'expiration, solde insuffisant,
reconversion ; le protocole Up2Pay (`src/lib/up2pay.ts`) : calcul HMAC,
vérification de signature RSA ; et le verrouillage PIN (`src/lib/pin.ts`).

## Base de données

SQLite en développement (fichier `prisma/dev.db`, ignoré par git). Avant une
mise en production avec plusieurs utilisateurs simultanés, migrez vers
PostgreSQL (changement du `provider` dans `prisma/schema.prisma` +
`prisma migrate`).
