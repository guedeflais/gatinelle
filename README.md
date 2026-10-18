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

## Paiement par carte (CAWL E-COMMERCE — Crédit Agricole)

Le paiement CB redirige vers la page hébergée CAWL E-COMMERCE (API REST,
requêtes signées HMAC-SHA256 « GCS v1HMAC »). Voir `src/lib/cawl.ts` et
`src/lib/cardPurchase.ts`. Documentation : https://docs.ecommerce.cawl-solutions.fr

Parcours : `POST /api/purchases/card` crée la transaction (PENDING) et une
session de paiement CAWL, puis le client est redirigé vers CAWL. À son retour
(`/api/cawl/retour`), le serveur interroge CAWL et crédite le compte si le
paiement est capturé (CAPTURED). Le **webhook** (`/api/cawl/webhook`) couvre
le cas où le client ferme son navigateur avant de revenir : les deux chemins
peuvent se produire en même temps, un seul crédite (mise à jour gardée).

Configuration (variables d'environnement, voir `.env.example`) :

- `CAWL_MERCHANT_ID` : identifiant marchand (PSPID).
- `CAWL_API_KEY_ID` / `CAWL_API_SECRET` : clé API (portail marchand,
  Développeur). Les clés de **test** et de **production** sont différentes.
- `CAWL_API_URL` : `https://payment.preprod.cawl-solutions.fr` (test, par
  défaut) ou `https://payment.cawl-solutions.fr` (production).
- `CAWL_WEBHOOK_KEY_ID` / `CAWL_WEBHOOK_SECRET` : clé de webhook (portail,
  Développeur > Webhooks ; le secret n'est affiché que 60 secondes). L'URL à
  déclarer est `https://<votre-domaine>/api/cawl/webhook`.
- Portails marchands : test `https://portail.preprod.cawl-solutions.fr/`,
  production `https://portail.cawl-solutions.fr/`.
- Tant que `CAWL_MERCHANT_ID` / `CAWL_API_KEY_ID` / `CAWL_API_SECRET` sont
  vides, le paiement par carte répond « pas encore configuré » (503).
- Le webhook et le retour client nécessitent un site joignable publiquement en
  HTTPS (pas testable en `localhost` sans tunnel type ngrok).

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

PostgreSQL (Prisma Postgres via Vercel Storage en production). Le schéma
requiert désormais une vraie base Postgres, y compris en local : pas de mode
SQLite de secours. Pour développer en local, utilisez soit la même base que
la production (avec précaution, ce sont de vraies données), soit une base
Postgres gratuite dédiée au développement (Neon, Prisma Postgres...) et son
propre `DATABASE_URL` dans `.env`.

Les migrations s'appliquent automatiquement à chaque déploiement Vercel
(`prisma migrate deploy` intégré au script `build`). En local, après une
modification du schéma :

```bash
npx prisma migrate dev --name <description>
```
