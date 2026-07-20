# Cahier des charges — Application Gâtinelle (web/PWA + application native iOS et Android)

## 1. Contexte

La Gâtinelle est la monnaie locale complémentaire de la Gâtine Poitevine, portée par
l'association Ici en Gâtine Poitevine - Gâtin'émois. Elle est utilisée par des
particuliers et acceptée chez plus de 200 commerçants et prestataires agréés du
territoire.

Une application web (responsive, installable comme PWA sur Android et iOS) est déjà en
production sur `gatinelle.fr` / Google Play, et couvre à elle seule l'ensemble du besoin
fonctionnel identifié : paiement chez les commerçants, mode festival, et administration
par les bénévoles.

**Décision actée : une application mobile native unique, publiée à la fois sur l'App
Store et sur Google Play**, le web/PWA restant la plateforme de référence pour
l'administration et pour l'accès sans installation. Contrairement à Google Play, Apple
accepte mal les applications qui ne sont qu'un habillage d'un site web (règle de revue
4.2 "Minimum Functionality") — une PWA installée depuis Safari fonctionne déjà très
bien sur iPhone, mais ne peut pas être publiée de façon fiable sur l'App Store. Une
vraie application native (React Native/Expo, voir section 10) est donc développée pour
les particuliers et commerçants, en réutilisant les API déjà construites pour la PWA ;
une fois écrite pour iOS, la même base de code produit aussi la version Android (React
Native étant multi-plateforme par nature), qui remplacera à terme le TWA actuel sur la
fiche Google Play existante. Ce n'est pas un retour à l'hypothèse Bolt/Expo initialement
envisagée puis écartée, mais un développement direct, sans générateur de code
automatisé.

Ce document spécifie les fonctionnalités communes au web/PWA et à l'application
native, à destination :
- des **particuliers et commerçants** (achat, paiement, reconversion, mode festival) ;
- des **bénévoles et responsables de l'association** (administration — reste sur le web
  uniquement, voir section 10).

## 2. Objectifs

- Permettre l'achat, la détention, le paiement et la reconversion de gâtinelles, sans
  jamais manipuler de données bancaires directement (paiement CB délégué à un
  prestataire agréé).
- Permettre l'organisation d'événements sans espèces (marché, festival) où le solde non
  dépensé continue naturellement à circuler chez les commerçants agréés après
  l'événement, plutôt que d'être remboursé et de sortir de l'économie locale.
- Donner à l'association les outils de pilotage nécessaires (validations, suivi de la
  masse en circulation, gestion des événements) sans jamais nécessiter d'intervention
  technique pour les tâches courantes.

## 3. Phases de déploiement

Une seule application (la PWA), déployée en 3 phases successives :

1. **Phase 1 — Paiement chez les commerçants** ✅ *en production*
   Paiement par QR code ou saisie du code commerçant (voir 5.4), sans matériel
   spécifique côté commerçant. Déjà déployé et utilisable sur `gatinelle.fr`.

2. **Phase 2 — Ouverture du mode festival** 🔜 *en attente*
   Paiement par carte ou bracelet NFC sur téléphone Android (voir 5.7), à ouvrir une
   fois le test des cartes NFC réalisé avec succès en conditions réelles (fiabilité de
   lecture, ergonomie au comptoir).

3. **Phase 3 — Paramétrisation multi-structures** 📋 *envisagée*
   Rendre l'application configurable/réutilisable pour d'autres monnaies locales, une
   fois le mode festival éprouvé en conditions réelles.

## 4. Rôles et comptes utilisateurs

| Rôle | Description |
|---|---|
| **Particulier** | Achète des gâtinelles, consulte son solde/historique, paie un commerçant, consulte l'annuaire. |
| **Commerçant** | Tout ce que fait un particulier, + reçoit des paiements, + demande une reconversion en euros. |
| **Agent** (bénévole de comptoir) | Valide les achats en espèces. |
| **Admin** | Tout ce que fait un agent, + valide les virements et les commerçants, + traite les reconversions, + pilote le mode festival, + consulte la masse en circulation. |

Un compte a un type (Particulier ou Commerçant) et, indépendamment, un rôle opérationnel
optionnel (Agent ou Admin) s'il s'agit d'un membre actif de l'association.

## 5. Fonctionnalités côté particuliers et commerçants

### 5.1 Comptes et connexion
- Inscription classique : nom complet, email, mot de passe, choix Particulier/Commerçant
  (+ informations du commerce si Commerçant : nom, adresse, catégorie, IBAN).
- Connexion par email + mot de passe.
- Connexion rapide par **numéro d'adhérent + code PIN à 4 chiffres** (format : 1 lettre +
  5 chiffres, ex. `A00042`), pensée pour une connexion en quelques secondes au comptoir.
  Blocage après 3 échecs de PIN, déblocage réservé à un Admin. Le mot de passe classique
  a un blocage temporaire auto-expirant (pas de blocage définitif, l'email étant trop
  facilement connu pour justifier un vecteur de déni de service).
- Page "Modifier mon profil" : nom, email pour tous ; adresse, catégorie, IBAN en plus
  pour un commerçant.
- La carte NFC n'est utilisée que dans le cadre du **mode festival** (voir 5.7) et de la
  **Gâtine Box** (voir 5.8), pas pour le paiement chez un commerçant au quotidien (voir
  5.4) — ce choix évite de dépendre du matériel personnel du client ou du commerçant en
  dehors de ces deux contextes.
- **Un compte peut être lié à plusieurs cartes/bracelets NFC** (bracelet de festival
  perdu puis réémis, carte Gâtine Box ajoutée à un compte déjà existant, etc.) — gérable
  depuis l'espace "Mon compte".

### 5.2 Achat de gâtinelles
- 1 gâtinelle = 1 euro, sans exception.
- Trois moyens de paiement :
  - **Espèces** : crée une demande en attente, validée par un Agent/Admin au comptoir.
  - **Virement** : crée une demande en attente, IBAN de l'association affiché,
    validation manuelle par un Admin après vérification bancaire.
  - **Carte bancaire** : paiement immédiat via un prestataire de paiement agréé
    (formulaire hébergé par le prestataire — l'application ne doit jamais recevoir ni
    stocker de données de carte bancaire).
- Les gâtinelles achetées par un **particulier expirent après 1 an** (calculé à partir de
  la date d'achat). Les gâtinelles détenues par un **commerçant n'expirent jamais**,
  qu'elles proviennent d'un achat direct ou d'un paiement reçu.

### 5.3 Solde et historique
- Solde = somme des lots actifs et non expirés.
- Alerte sur les lots expirant sous 30 jours (particuliers uniquement).
- Historique des transactions (achats, paiements, reconversions, péremptions).

### 5.4 Paiement chez un commerçant ✅ *Phase 1 — en production*

**Le paiement est toujours initié par le client**, pas par le commerçant — ce choix
évite de dépendre du matériel du commerçant (tous les commerçants n'ont pas un
smartphone Android) et garantit que c'est le client, depuis sa propre session
authentifiée, qui autorise le débit de son compte :
- Le client scanne le **QR code du commerçant** (affiché à son comptoir) ou saisit
  manuellement son **identifiant/code commerçant**.
- Le client saisit le montant à payer, depuis sa propre session déjà authentifiée.
- Aucune saisie de PIN n'est nécessaire à cette étape : le fait d'être déjà connecté sur
  son propre appareil constitue la confirmation.
- Le prélèvement se fait en priorité sur les lots les plus proches de leur date
  d'expiration (FIFO par date d'expiration), pour ne jamais faire perdre inutilement des
  gâtinelles à un particulier.

Le commerçant n'a besoin d'aucun matériel spécifique pour recevoir un paiement : un
simple code ou QR affiché à son comptoir suffit, quel que soit son propre téléphone (y
compris s'il n'en a pas sur lui).

### 5.5 Espace commerçant
- Historique des paiements reçus.
- Demande de reconversion en euros (plafonnée au solde actif) ; les lots correspondants
  sont marqués convertis immédiatement, le virement réel est effectué par l'association
  après traitement admin.

### 5.6 Annuaire
- Carte interactive et liste des commerçants validés (nom, adresse, catégorie),
  accessible publiquement (sans connexion requise).

### 5.7 Mode festival / événement 🔜 *Phase 2 — en attente du test terrain des cartes NFC*

Objectif : gérer les paiements sans espèces d'un événement local, avec un double
principe :
- Éviter toute manipulation d'argent liquide pendant l'événement.
- Faire en sorte que le solde non dépensé continue naturellement à circuler chez les
  commerçants agréés après l'événement (contrairement aux prestataires cashless
  classiques, qui remboursent le solde non dépensé et le font sortir de l'économie
  locale).

**Le mode festival est le seul contexte où le paiement se fait par lecture de carte
NFC**, et où il est initié par le stand (pas par le client) — ce choix n'est possible
que parce que l'association fournit et contrôle le matériel (téléphones Android) remis
aux stands le jour de l'événement, contrairement au commerce courant (voir 5.4) où l'on
ne peut pas garantir que chaque commerçant dispose d'un tel appareil.

**Inscription express** (à l'entrée d'un événement, pour un participant non encore
adhérent) :
- Formulaire minimal : nom complet + email uniquement (pas de mot de passe/PIN à saisir
  par le participant — un mot de passe et un PIN sont générés côté serveur ; le PIN reste
  nécessaire par la suite uniquement pour confirmer un paiement au-delà de 50 € au stand,
  voir ci-dessous, donc il doit rester consultable/modifiable par le participant une fois
  son compte créé, par exemple via la page profil).
- Le compte créé est lié à une **carte NFC** (uniquement une carte physique — pas le
  téléphone du participant, voir point de vigilance ci-dessous) remise sur place au
  moment de la création.
- Le rechargement de solde (espèces/CB) réutilise le circuit d'achat classique (5.2),
  validé par un agent au comptoir d'entrée.

**Paiement au stand par lecture de carte NFC** :
- Le stand (équipé d'un téléphone Android fourni par l'association) scanne la carte NFC
  du client et saisit ou sélectionne le montant (voir catalogue de produits ci-dessous).
- **En dessous de 50 €** : le paiement est validé immédiatement, aucune saisie n'est
  demandée au client.
- **Au-delà de 50 €** : le client doit saisir son **code PIN directement sur l'appareil
  du stand** pour confirmer le paiement — ce seuil est propre au mode festival (le
  commerce courant, initié par le client lui-même, n'en a pas besoin, voir 5.4).
- Le seuil de 50 € doit être un paramètre ajustable côté administration, pas une valeur
  figée dans le code.

**Catalogue de produits par stand** :
- Avant l'événement, l'administration permet de définir, pour chaque stand, une liste de
  produits avec leur prix (ex. "Bière 4 €", "Sandwich 6 €").
- Au comptoir, le stand n'a qu'à **cliquer sur le produit vendu** (le montant se
  remplit automatiquement) puis **scanner la carte NFC du client** pour finaliser le
  paiement — sans jamais avoir à taper un montant à la main.

**Point de vigilance technique** : la lecture NFC depuis une page web (Web NFC /
`NDEFReader`) ne fonctionne que sur Chrome pour Android. Ce n'est pas une contrainte à
contourner ici : le besoin exprimé se limite explicitement aux **téléphones Android**
fournis et contrôlés par l'association pour ce mode (voir section 10) — aucun appareil
personnel, ni du client ni du stand, n'est requis pour lire une carte NFC.
- La carte remise au participant est une carte NFC physique dédiée (norme NFC Forum
  Type 2, ex. NTAG213 — suffisant, seul son numéro de série sert d'identifiant, aucune
  donnée n'est stockée sur la carte elle-même) — **le téléphone personnel du participant
  n'est jamais utilisé comme carte** (l'émulation de carte NFC sur un téléphone n'est
  pas garantie selon le modèle/OS, ce point est donc explicitement écarté).
- Prévoir un mode de repli clair (saisie manuelle du numéro d'adhérent) si un appareil de
  stand ne supporte pas la lecture NFC malgré tout (panne, mauvaise configuration).

### 5.8 Gâtine Box (carte cadeau NFC) 📋 *envisagée*

La Gâtine Box est une box cadeau contenant une carte NFC, vendue chez **n'importe quel
commerçant agréé du réseau** (pas seulement en mode festival) — **c'est le client qui
fixe librement le montant** au moment de l'achat, exactement comme pour une carte
cadeau classique du commerce.

**Confection de la box** (réservée à l'administration, avant toute mise en vente) :
- Une carte NFC neuve est associée à un **numéro de box** (visible, imprimé à
  l'extérieur de l'emballage) et à un **code d'activation** distinct (imprimé sur un
  papier glissé à l'intérieur, invisible de l'extérieur).
- La box est ensuite fermée avec un **autocollant inviolable** ("scellé de garantie",
  matériel courant et peu coûteux, sans impression spécialisée nécessaire). Ce sceau est
  la seule barrière physique nécessaire : tant qu'il est intact, personne — ni le
  commerçant, ni l'association après la confection — n'a pu voir le code d'activation.
- En base de données, seul le **hash** du code d'activation est stocké (jamais en clair
  — même principe que les mots de passe et codes PIN, voir 7.6), avec le numéro de box
  (en clair, lui, puisqu'il doit être lisible pour la vente) et l'identifiant de la
  carte associée. Statut initial : "fabriquée, non vendue".

**Vente chez le commerçant** :
- Le commerçant reçoit le paiement du client (au montant que celui-ci choisit) et
  saisit le **numéro de box** (visible sur l'emballage) + le prix reçu, après avoir
  vérifié que le sceau est intact.
- Le serveur enregistre ce prix **une seule fois, de façon définitive** (non modifiable
  ensuite) et fait passer la box au statut "vendue".
- Le commerçant n'a à aucun moment accès au code d'activation : la vente ne lui donne
  aucun moyen d'activer la box lui-même (voir règle de sécurité 7.9).

**Activation par le bénéficiaire, depuis l'application** :
- Le bénéficiaire ouvre la box (cassant le sceau) et y trouve le code d'activation.
- S'il a déjà un compte, il se connecte puis saisit le numéro de box + le code
  d'activation. S'il n'en a pas encore, il en crée un (inscription classique, voir 5.1)
  puis fait de même.
- Le serveur vérifie que le code correspond (hash comparé en temps constant) et que la
  box est encore au statut "vendue" (jamais déjà activée) : si oui, le compte est
  crédité du prix enregistré par le commerçant, la carte NFC est liée au compte, et la
  box passe définitivement au statut "activée".
- Une fois activée, la carte et le compte fonctionnent **exactement comme n'importe quel
  autre compte/carte** de l'association — aucune restriction résiduelle liée à leur
  origine "Gâtine Box".

## 6. Fonctionnalités côté administration

Accessibles aux comptes ayant le rôle Agent ou Admin (voir section 4), au sein de la même
application (pas une application séparée) :

- **Tableau de bord de la masse en circulation** : total émis, total périmé, total
  reconverti, total en circulation (= émis − périmé − reconverti).
- **File de validation des achats en attente** (espèces : Agent ou Admin ; virement :
  Admin uniquement).
- **File de validation des commerçants** (validation/rejet d'une inscription
  commerçant).
- **File des demandes de reconversion** (marquer comme payée après virement bancaire
  réel effectué par l'association).
- **Gestion des accès PIN bloqués** (déblocage par un Admin).
- **Mode festival** (phase 2, voir section 3) :
  - Création d'un "stand" : un compte commerçant créé directement validé (sans passer
    par la file de validation classique), avec ses identifiants affichés une seule fois.
  - **Gestion du catalogue de produits d'un stand** : ajout/modification/suppression de
    produits (nom + prix) associés à un stand, utilisés ensuite par ce stand pour
    encaisser par simple clic (voir 5.7).
  - Liste des stands actifs, avec possibilité de les retirer de l'annuaire après
    l'événement (l'historique de leurs transactions reste conservé).
- **Confection des Gâtine Box** (voir 5.8) : génération d'un numéro de box + code
  d'activation pour chaque nouvelle carte NFC destinée à une box, réservée aux comptes
  Admin — jamais accessible à un commerçant.
- **Import en masse** (besoin identifié, non détaillé plus avant dans ce document) :
  possibilité d'importer un fichier (Excel) d'adhérents/commerçants existants, avec
  reprise d'un solde déjà détenu si applicable, et distribution d'identifiants
  provisoires. À spécifier plus précisément (structure exacte du fichier source) le
  moment venu.

## 7. Règles métier à respecter impérativement

1. 1 gâtinelle = 1 euro, toujours.
2. Péremption à 1 an uniquement pour les gâtinelles détenues par un **particulier**,
   jamais pour celles détenues par un **commerçant** (achetées directement ou reçues en
   paiement).
3. Dépense FIFO par date d'expiration (les lots qui expirent en premier sont utilisés
   en premier) lors d'un paiement.
4. Un paiement doit être **atomique et protégé contre le double débit** en cas de
   requêtes concurrentes (verrou/condition au niveau de la base de données sur le
   montant restant d'un lot, pas seulement une vérification en mémoire).
5. Les données de carte bancaire ne transitent et ne sont stockées à aucun moment par
   l'application — uniquement par le prestataire de paiement agréé.
6. Mots de passe et codes PIN : jamais stockés en clair (hachage), comparaison en temps
   constant côté serveur pour éviter les attaques par mesure de temps de réponse.
7. Deux mécanismes de paiement distincts selon le contexte :
   - **Commerce courant** (phase 1) : paiement toujours **initié par le client** (QR
     code ou identifiant du commerçant, depuis sa propre session), aucun PIN requis à
     cette étape — le commerçant n'a besoin d'aucun matériel spécifique.
   - **Mode festival uniquement** (phase 2) : paiement **initié par le stand**, par
     lecture d'une carte NFC physique du client (jamais le téléphone du client). En
     dessous de 50 €, aucune confirmation n'est demandée ; au-delà, le client doit
     saisir son code PIN sur l'appareil du stand.
8. Toute donnée personnelle collectée doit avoir une finalité déclarée, une durée de
   conservation définie, et une politique de confidentialité conforme au RGPD
   (responsable de traitement identifié, droits d'accès/rectification/effacement,
   contact CNIL).
9. **Gâtine Box** (voir 5.8) : le numéro de box est visible et sert à la vente, mais
   l'activation exige en plus le **code d'activation** caché à l'intérieur de la box
   (jamais connu du commerçant) ; le prix est enregistré **une seule fois, de façon
   définitive** ; l'activation est **atomique et protégée contre l'activation en
   double** (même principe que la règle 4) ; **un compte Commerçant ne peut jamais
   activer de box** — seul le bénéficiaire, depuis son propre compte, en a le droit.

## 8. Exigences de sécurité (retour d'expérience de la v1 en production)

- Toute opération modifiant un solde doit être exécutée dans une transaction de base de
  données garantissant qu'aucune lecture obsolète ne peut permettre un double débit
  (cas testé et corrigé sur la v1 : paiements concurrents sur le même lot).
- Verrouillage de compte (PIN) : compteur d'échecs incrémenté de façon atomique
  (pas de lecture-puis-écriture séparée), pour éviter qu'une rafale de tentatives
  simultanées ne dépasse la limite autorisée.
- En-têtes de sécurité HTTP (CSP, HSTS, X-Frame-Options, etc.) sur toutes les réponses.
- Génération de tout mot de passe/PIN par défaut de façon aléatoire et sécurisée —
  jamais de valeur par défaut prévisible, y compris pour des comptes de test ou de
  démonstration.
- La saisie du PIN de confirmation en mode festival (au-delà de 50 €) sur l'appareil du
  stand doit bénéficier de **la même rigueur que la connexion rapide** : comparaison en
  temps constant côté serveur, compteur d'échecs et blocage après plusieurs tentatives
  infructueuses (même mécanisme que le blocage PIN existant), pour empêcher qu'un stand
  malveillant ou un tiers ne tente de deviner le PIN d'un client par essais répétés sur
  cette étape de confirmation.
- Le **code d'activation d'une Gâtine Box** (voir 5.8/7.9) est haché (jamais stocké en
  clair) et comparé en temps constant côté serveur, avec un compteur d'échecs et un
  blocage après plusieurs tentatives infructueuses — même rigueur que la vérification
  d'un code PIN, pour empêcher qu'un tiers connaissant seulement le numéro de box
  (visible) ne devine le code caché par essais répétés.

## 9. Contraintes non fonctionnelles

- **RGPD / mentions légales** : politique de confidentialité, CGU, mentions légales,
  page de suppression de compte accessible publiquement.
- **Accessibilité** : formulaires utilisables au clavier, contrastes suffisants
  (particulièrement important pour un usage en plein air/lumière forte lors d'un
  événement).
- **Résilience réseau** : le mode festival dépend d'une connexion réseau fonctionnelle
  sur place dans cette première version ; une résilience hors-ligne (mise en file
  d'attente locale, synchronisation différée) est un besoin réel mais à traiter après un
  premier test terrain, pas dès la v1.
- **Hébergement** : base de données et application doivent supporter un environnement de
  test/développement strictement séparé de la production (aucune donnée réelle
  d'adhérent ne doit jamais être exposée à un test).

## 10. Choix technique : web/PWA pour l'administration + application native pour particuliers et commerçants

### 10.1 Le web/PWA reste la plateforme de référence

Sur le fond fonctionnel, aucun développement natif n'est nécessaire : la PWA actuelle
satisfait déjà, sans code natif, les deux besoins qui auraient pu sembler en justifier
un :

- **Paiement par QR code ou code commerçant** (phase 1) : ne demande aucune API native,
  fonctionne dans n'importe quel navigateur moderne (voir 5.4).
- **Paiement par carte/bracelet NFC en mode festival** (phase 2) : repose sur l'API Web
  NFC (`NDEFReader`), disponible dans Chrome sur Android — précisément la seule
  plateforme utilisée pour ce mode, puisque les téléphones des stands sont fournis et
  contrôlés par l'association (voir 5.7). L'absence de support Web NFC sur iPhone n'est
  donc pas une contrainte à contourner ici : le besoin exprimé se limite explicitement
  aux téléphones Android pour ce mode.

C'est pour cette raison que l'hypothèse initiale d'un développement natif via
Bolt/Expo avait été écartée : elle n'était pas justifiée par le besoin fonctionnel.

### 10.2 Une application native, pour particuliers et commerçants (App Store + Google Play)

Le web/PWA reste pleinement fonctionnel sur iPhone (installation depuis Safari, "Ajouter
à l'écran d'accueil"), mais **ne peut pas être publié de façon fiable sur l'App Store**
lui-même : Apple rejette régulièrement les applications qui ne sont qu'un habillage
d'un site web sans fonctionnalité native ajoutée (règle de revue 4.2 "Minimum
Functionality"), un risque encore plus élevé pour une application à caractère
financier.

Décision : développer une **véritable application native (React Native / Expo)**,
avec ses propres écrans (pas un simple habillage du site) :
- Développement direct (pas via Bolt ni aucun autre générateur de code automatisé),
  s'appuyant sur les API déjà construites côté serveur pour la PWA (`/api/register`,
  `/api/payments`, etc.) — pas de nouvelle logique métier, une nouvelle couche d'écrans.
- **Une seule base de code pour les deux stores** : React Native étant multi-plateforme
  par nature, produire la version Android à partir du même projet, une fois la version
  iOS écrite, est une étape marginale (`eas build --platform android`), pas un second
  développement — évite de maintenir deux fronts différents (web et natif) avec la même
  logique dupliquée à chaque évolution future.
- Test en cours de développement via Expo Go (scan d'un QR code depuis un téléphone),
  sans nécessiter de Mac.
- Compilation des binaires finaux et signature via **EAS Build** (service cloud
  d'Expo), pour les deux plateformes, sans Mac local nécessaire.
- Un **compte développeur Apple payant (99 $/an)** est requis, à créer et gérer par
  l'association elle-même (démarche non déléguée à un tiers) ; le compte développeur
  Google Play existe déjà.
- L'acceptation par Apple n'est jamais garantie à 100 %, mais une vraie application
  native a des chances nettement meilleures qu'un PWA habillé.
- Périmètre : les écrans côté **particuliers et commerçants** (section 5) uniquement.
  L'administration (section 6) reste sur le web uniquement — c'est un usage bénévole,
  ponctuel, sans besoin d'être dans un store.
- **Sur Google Play**, l'application native remplacera à terme le TWA actuel sur la
  **même fiche existante** (mise à jour normale du même `applicationId`, pas une
  nouvelle fiche à créer) — à faire une fois l'application native testée et stable sur
  Android, pas en même temps que le développement iOS initial.
- Ampleur à anticiper : refaire chaque écran existant en natif est un chantier
  conséquent, pas un ajout rapide.

## 11. Hors périmètre

- Administration en natif : reste sur le web uniquement (usage bénévole, voir 10.2).
- Résilience hors-ligne complète du mode festival.
- Import en masse des adhérents/commerçants existants (besoin confirmé, spécification
  détaillée à faire séparément une fois le fichier source disponible).
- Paramétrisation multi-structures : phase 3 du déploiement (voir section 3), après le
  mode festival éprouvé en conditions réelles.
