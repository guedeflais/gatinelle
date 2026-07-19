# Cahier des charges — Application Gâtinelle (PWA)

## 1. Contexte

La Gâtinelle est la monnaie locale complémentaire de la Gâtine Poitevine, portée par
l'association Ici en Gâtine Poitevine - Gâtin'émois. Elle est utilisée par des
particuliers et acceptée chez plus de 200 commerçants et prestataires agréés du
territoire.

Une application web (responsive, installable comme PWA sur Android et iOS) est déjà en
production sur `gatinelle.fr` / Google Play, et couvre à elle seule l'ensemble du besoin
identifié : paiement chez les commerçants, mode festival, et administration par les
bénévoles.

**Décision actée : pas d'application mobile native séparée.** L'hypothèse initialement
envisagée d'un développement natif (via Bolt/Expo) est abandonnée — la solution PWA
actuelle répond en tous points aux besoins retenus (voir section 3 et section 10), sans
les coûts et contraintes d'un développement natif (comptes développeur séparés, revues
de store distinctes, chaîne de compilation dédiée).

Ce document spécifie les fonctionnalités de cette application unique, à destination :
- des **particuliers et commerçants** (achat, paiement, reconversion, mode festival) ;
- des **bénévoles et responsables de l'association** (administration).

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
- La carte NFC n'est utilisée que dans le cadre du **mode festival** (voir 5.7), pas pour
  le paiement chez un commerçant au quotidien (voir 5.4) — ce choix évite de dépendre du
  matériel personnel du client ou du commerçant en dehors d'un événement où l'association
  contrôle les appareils utilisés aux stands.

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

## 10. Choix technique : PWA plutôt qu'application native

Le développement d'une application mobile native (envisagé initialement via Bolt/Expo)
est abandonné : la PWA actuelle satisfait déjà, sans code natif, les deux besoins qui
auraient pu sembler le justifier :

- **Paiement par QR code ou code commerçant** (phase 1) : ne demande aucune API native,
  fonctionne dans n'importe quel navigateur moderne (voir 5.4).
- **Paiement par carte/bracelet NFC en mode festival** (phase 2) : repose sur l'API Web
  NFC (`NDEFReader`), disponible dans Chrome sur Android — précisément la seule
  plateforme utilisée pour ce mode, puisque les téléphones des stands sont fournis et
  contrôlés par l'association (voir 5.7). L'absence de support Web NFC sur iPhone n'est
  donc pas une contrainte à contourner : elle est hors sujet, le besoin exprimé se
  limitant explicitement aux téléphones Android.

Ce choix évite la gestion de deux chaînes de publication (App Store + Play Store), un
compte développeur Apple payant, une chaîne de compilation native (EAS Build) et une
revue Apple plus stricte pour une application à caractère financier — sans aucune perte
fonctionnelle au regard des besoins retenus.

## 11. Hors périmètre

- Application mobile native (iOS/Android) : abandonnée (voir section 10) — la PWA
  couvre l'ensemble des besoins retenus.
- Résilience hors-ligne complète du mode festival.
- Import en masse des adhérents/commerçants existants (besoin confirmé, spécification
  détaillée à faire séparément une fois le fichier source disponible).
- Paramétrisation multi-structures : phase 3 du déploiement (voir section 3), après le
  mode festival éprouvé en conditions réelles.
