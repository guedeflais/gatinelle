# Cahier des charges — Application mobile de paiement Gâtinelle + Application web d'administration

## 1. Contexte

La Gâtinelle est la monnaie locale complémentaire de la Gâtine Poitevine, portée par
l'association Ici en Gâtine Poitevine - Gâtin'émois. Elle est utilisée par des
particuliers et acceptée chez plus de 200 commerçants et prestataires agréés du
territoire. Une première version de l'application (web, responsive, installable comme
PWA/appli Android) existe déjà et est en production sur `gatinelle.fr` / Google Play.

Ce document spécifie la construction de deux applications distinctes :
1. Une **application mobile de paiement**, à destination des particuliers et des
   commerçants, intégrant un **mode festival/événement**.
2. Une **application web d'administration**, à destination des bénévoles et
   responsables de l'association.

Développement envisagé avec **Bolt** (bolt.new). Voir section 9 pour les points
d'attention techniques propres à cet outil.

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

## 3. Rôles et comptes utilisateurs

| Rôle | Description |
|---|---|
| **Particulier** | Achète des gâtinelles, consulte son solde/historique, paie un commerçant, consulte l'annuaire. |
| **Commerçant** | Tout ce que fait un particulier, + reçoit des paiements, + demande une reconversion en euros. |
| **Agent** (bénévole de comptoir) | Valide les achats en espèces. |
| **Admin** | Tout ce que fait un agent, + valide les virements et les commerçants, + traite les reconversions, + pilote le mode festival, + consulte la masse en circulation. |

Un compte a un type (Particulier ou Commerçant) et, indépendamment, un rôle opérationnel
optionnel (Agent ou Admin) s'il s'agit d'un membre actif de l'association.

## 4. Application mobile de paiement — fonctionnalités

### 4.1 Comptes et connexion
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
- La carte NFC n'est utilisée que dans le cadre du **mode festival** (voir 4.7), pas pour
  le paiement chez un commerçant au quotidien (voir 4.4) — ce choix évite de dépendre du
  matériel personnel du client ou du commerçant en dehors d'un événement où l'association
  contrôle les appareils utilisés aux stands.

### 4.2 Achat de gâtinelles
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

### 4.3 Solde et historique
- Solde = somme des lots actifs et non expirés.
- Alerte sur les lots expirant sous 30 jours (particuliers uniquement).
- Historique des transactions (achats, paiements, reconversions, péremptions).

### 4.4 Paiement chez un commerçant

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

### 4.5 Espace commerçant
- Historique des paiements reçus.
- Demande de reconversion en euros (plafonnée au solde actif) ; les lots correspondants
  sont marqués convertis immédiatement, le virement réel est effectué par l'association
  après traitement admin.

### 4.6 Annuaire
- Liste des commerçants validés (nom, adresse, catégorie), réservée aux comptes
  connectés.

### 4.7 Mode festival / événement

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
aux stands le jour de l'événement, contrairement au commerce courant (voir 4.4) où l'on
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
- Le rechargement de solde (espèces/CB) réutilise le circuit d'achat classique (4.2),
  validé par un agent au comptoir d'entrée.

**Paiement au stand par lecture de carte NFC** :
- Le stand (équipé d'un téléphone Android fourni par l'association) scanne la carte NFC
  du client et saisit ou sélectionne le montant (voir catalogue de produits ci-dessous).
- **En dessous de 50 €** : le paiement est validé immédiatement, aucune saisie n'est
  demandée au client.
- **Au-delà de 50 €** : le client doit saisir son **code PIN directement sur l'appareil
  du stand** pour confirmer le paiement — ce seuil est propre au mode festival (le
  commerce courant, initié par le client lui-même, n'en a pas besoin, voir 4.4).
- Le seuil de 50 € doit être un paramètre ajustable côté administration, pas une valeur
  figée dans le code.

**Catalogue de produits par stand** :
- Avant l'événement, l'administration permet de définir, pour chaque stand, une liste de
  produits avec leur prix (ex. "Bière 4 €", "Sandwich 6 €").
- Au comptoir, le stand n'a qu'à **cliquer sur le produit vendu** (le montant se
  remplit automatiquement) puis **scanner la carte NFC du client** pour finaliser le
  paiement — sans jamais avoir à taper un montant à la main.

**Point de vigilance technique majeur (lecture NFC)** : la lecture NFC depuis une page
web (Web NFC / `NDEFReader`) ne fonctionne **que sur Chrome pour Android**. Elle n'est
supportée par **aucun navigateur sur iPhone/iPad** (restriction délibérée d'Apple, sans
solution de contournement côté web). Conséquences à intégrer dans la conception :
- Ceci ne pose pas de problème pour ce mode, puisque l'appareil qui scanne est toujours
  un téléphone Android fourni par l'association, jamais un appareil personnel du client
  ou du stand.
- La carte remise au participant est une carte NFC physique dédiée (norme NFC Forum
  Type 2, ex. NTAG213 — suffisant, seul son numéro de série sert d'identifiant, aucune
  donnée n'est stockée sur la carte elle-même) — **le téléphone personnel du participant
  n'est jamais utilisé comme carte** (l'émulation de carte NFC sur un téléphone n'est
  pas garantie selon le modèle/OS, ce point est donc explicitement écarté).
- Prévoir un mode de repli clair (saisie manuelle du numéro d'adhérent) si un appareil de
  stand ne supporte pas la lecture NFC malgré tout (panne, mauvaise configuration).

## 5. Application web d'administration — fonctionnalités

- **Tableau de bord de la masse en circulation** : total émis, total périmé, total
  reconverti, total en circulation (= émis − périmé − reconverti).
- **File de validation des achats en attente** (espèces : Agent ou Admin ; virement :
  Admin uniquement).
- **File de validation des commerçants** (validation/rejet d'une inscription
  commerçant).
- **File des demandes de reconversion** (marquer comme payée après virement bancaire
  réel effectué par l'association).
- **Gestion des accès PIN bloqués** (déblocage par un Admin).
- **Mode festival** :
  - Création d'un "stand" : un compte commerçant créé directement validé (sans passer
    par la file de validation classique), avec ses identifiants affichés une seule fois.
  - **Gestion du catalogue de produits d'un stand** : ajout/modification/suppression de
    produits (nom + prix) associés à un stand, utilisés ensuite par ce stand pour
    encaisser par simple clic (voir 4.7).
  - Liste des stands actifs, avec possibilité de les retirer de l'annuaire après
    l'événement (l'historique de leurs transactions reste conservé).
- **Import en masse** (besoin identifié, non détaillé plus avant dans ce document) :
  possibilité d'importer un fichier (Excel) d'adhérents/commerçants existants, avec
  reprise d'un solde déjà détenu si applicable, et distribution d'identifiants
  provisoires. À spécifier plus précisément (structure exacte du fichier source) le
  moment venu.

## 6. Règles métier à respecter impérativement

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
   - **Commerce courant** : paiement toujours **initié par le client** (QR code ou
     identifiant du commerçant, depuis sa propre session), aucun PIN requis à cette
     étape — le commerçant n'a besoin d'aucun matériel spécifique.
   - **Mode festival uniquement** : paiement **initié par le stand**, par lecture d'une
     carte NFC physique du client (jamais le téléphone du client). En dessous de 50 €,
     aucune confirmation n'est demandée ; au-delà, le client doit saisir son code PIN
     sur l'appareil du stand.
8. Toute donnée personnelle collectée doit avoir une finalité déclarée, une durée de
   conservation définie, et une politique de confidentialité conforme au RGPD
   (responsable de traitement identifié, droits d'accès/rectification/effacement,
   contact CNIL).

## 7. Exigences de sécurité (retour d'expérience de la v1 en production)

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

## 8. Contraintes non fonctionnelles

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

## 9. Points d'attention spécifiques à un développement avec Bolt

- Depuis février 2025 (Bolt V2), Bolt propose un gabarit **Expo/React Native** et génère
  du vrai code d'application native (écrans, navigation, style), et pas seulement une
  application web — à privilégier pour ce projet plutôt que le gabarit web classique.
- **Limite importante** : Bolt fonctionne dans un environnement de type "conteneur
  navigateur", qui ne peut pas exécuter Xcode, Android Studio, ni la chaîne de
  compilation native d'Expo (EAS Build). Bolt génère et prévisualise le code (via Expo
  Go, en scannant un QR code depuis un téléphone), mais **ne produit pas lui-même** le
  fichier installable final (.apk/.aab pour Android, build iOS).
- Pour obtenir un vrai fichier installable à partir du projet généré par Bolt, il faut
  passer par le service de compilation cloud d'Expo (**EAS Build**), ou par un service
  tiers dédié à ce pont (ex. Newly, Capgo). **Point notable qui corrige une affirmation
  précédente de ce document** : EAS Build peut compiler et signer une application iOS
  dans le cloud **sans qu'un Mac local ne soit nécessaire** — la barrière "il faut un
  Mac" pour iOS ne tient donc plus automatiquement dès lors qu'on passe par Expo, à
  condition de rester dans ce cas précis :
  - Un compte développeur Apple payant (99$/an) reste nécessaire.
  - La lecture NFC sur iPhone (CoreNFC) resterait à intégrer via une bibliothèque dédiée
    (ex. `react-native-nfc-manager`) et un plugin de configuration Expo — techniquement
    possible via EAS Build, mais avec les mêmes restrictions propres à CoreNFC
    (session de lecture limitée dans le temps, pas de lecture en arrière-plan continue
    comme sur Android) et une revue Apple qui reste plus stricte que celle de Google
    Play, en particulier pour une application à caractère financier.
  Ce point mérite d'être vérifié concrètement (test réel avec EAS Build) avant de
  considérer une application iOS native comme acquise pour ce projet.
- Le paiement par carte bancaire nécessite une intégration avec un vrai prestataire de
  paiement agréé (API/formulaire hébergé) — ce n'est pas quelque chose que Bolt peut
  générer seul, une vraie convention avec un prestataire (banque, PSP) est un
  prérequis indépendant du développement logiciel.
- Toute application générée doit passer par une revue de sécurité équivalente à celle
  menée sur la v1 (voir section 7) avant toute mise en production avec de l'argent réel
  en jeu — la rapidité de génération de code par un outil d'IA ne dispense pas de cette
  vérification.

## 10. Hors périmètre (v1)

- Résilience hors-ligne complète du mode festival.
- Lecture NFC native sur iPhone (CoreNFC) : redevenue théoriquement accessible sans Mac
  via Expo/EAS Build (voir section 9), mais à valider concrètement avant d'en faire un
  engagement ferme pour cette version — reste une décision à prendre séparément, pas un
  chantier à exclure par principe.
- Import en masse des adhérents/commerçants existants (besoin confirmé, spécification
  détaillée à faire séparément une fois le fichier source disponible).
- Paramétrisation multi-structures (rendre l'application réutilisable/configurable pour
  d'autres associations de monnaie locale) — envisagée comme étape ultérieure, une fois
  le mode festival éprouvé en conditions réelles.
