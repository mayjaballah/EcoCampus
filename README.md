# EcoCampus

Système intelligent de suivi et d'optimisation de la consommation énergétique du campus
(électricité, eau, chauffage, gaz). Mini-projet DSI2 – année universitaire 2026 / 2027.

Le projet est composé de deux modules qui communiquent par un fichier d'échange :

- **Module C** : moteur de traitement des données (chargement, tri, recherche, statistiques,
  détection d'anomalies, moyenne mobile et tendance, export JSON).
- **Module Web** : tableau de bord PHP / HTML / CSS / JavaScript avec comptes utilisateurs,
  graphiques, classement, notifications et assistant IA.

## Architecture

```
measures_in.csv ──► EcoCampus.exe (module C) ──► data.json ──► index.php + index.js (tableau de bord)
        ▲                       ▲                                        │
        │                       └──── php/ajouter_mesure.php ◄───────────┘
        └──────── (ligne ajoutée)      « Ajouter un bâtiment »
```

1. `measures_in.csv` contient les mesures brutes.
2. `EcoCampus.exe` lit le CSV, calcule les alertes, la moyenne mobile et la tendance, puis écrit `data.json`.
3. Le site charge `data.json` avec `fetch()` et construit l'affichage.
4. Quand un utilisateur ajoute un bâtiment depuis le site, PHP ajoute une ligne au CSV puis relance le module C
   pour régénérer `data.json`.

## Fichiers

| Fichier / dossier | Rôle |
|---|---|
| `include/gestion.h` | Structure `Mesure` et prototypes des fonctions du module C |
| `src/gestion.c` | Fonctions du module C : chargement, ajout, recherche, suppression, tri, statistiques, anomalies, tendance, export JSON |
| `src/main.c` | Programme principal avec menu interactif et mode `--export` |
| `measures_in.csv` | Jeu de données d'entrée (33 mesures) |
| `data.json` | Fichier de sortie généré par le module C |
| `EcoCampus.exe` | Exécutable du module C appelé par le site (à la racine du projet) |
| `index.php` | Page unique du site (toutes les « pages » sont des sections routées par `#ancre`) |
| `index.js` | Logique du tableau de bord : chargement, filtres, graphiques, classement, thème, export PDF, recadrage de photo |
| `style.css` | Thème, mode sombre / clair, composants |
| `responsive.css` | Adaptation mobile et tablette |
| `chatbot.js`, `chatbot.css` | Fenêtre de l'assistant EcoCampus |
| `php/` | Scripts serveur : comptes, mot de passe, profil, ajout de mesure, chatbot |
| `PHPMailer/` | Bibliothèque d'envoi d'e-mails (code de réinitialisation du mot de passe) |
| `uploads/avatars/` | Photos de profil (créé automatiquement) |

Contenu de `php/` :

| Script | Rôle |
|---|---|
| `database.php` | Connexion PDO à la base `ecocampus_auth` |
| `config.php` | Identifiants confidentiels (Gmail, Groq). **Ne pas publier** |
| `register.php`, `login.php`, `logout.php` | Inscription, connexion, déconnexion |
| `forgot_password.php`, `verify_code.php`, `reset_password.php` | Réinitialisation du mot de passe par code e-mail |
| `changer_mot_de_passe.php`, `changer_username.php`, `upload_photo.php` | Gestion du profil |
| `ajouter_mesure.php` | Ajout d'un bâtiment et régénération de `data.json` |
| `chatbot.php` | API du chatbot (interroge Groq avec le contexte de `data.json`) |
| `notif.php` | Fonction `notifier()` pour les messages affichés par `index.php` |

## Module C

### Compilation

```
gcc -Wall -Iinclude -o EcoCampus src/main.c src/gestion.c
```

Sous Windows, générer `EcoCampus.exe` et le placer à la racine du projet (là où le site le cherche).

### Exécution

```
./EcoCampus                                   # Linux / Mac / MSYS2
EcoCampus.exe                                 # Windows
./EcoCampus measures_in.csv data.json         # avec les fichiers précisés
./EcoCampus measures_in.csv data.json --export   # export direct, sans menu (utilisé par le site)
```

Par défaut, le programme lit `measures_in.csv` et écrit `data.json` dans le dossier courant.
Avec `--export`, le programme charge le CSV, régénère `data.json` et affiche « Export réussi ».
`php/ajouter_mesure.php` s'appuie sur ce message pour confirmer que la régénération a fonctionné.

### Fonctions principales (`gestion.c`)

| Fonction | Rôle |
|---|---|
| `chargerMesures` | Lit le CSV dans un tableau dynamique (`realloc`), ignore les lignes invalides, renvoie -1 si le fichier est absent |
| `ajouterMesure` | Ajoute une mesure ; reprend le seuil existant du couple bâtiment/ressource, sinon applique un seuil par défaut |
| `rechercherMesure` | Cherche la première mesure d'un bâtiment et d'une ressource |
| `supprimerMesure` | Supprime par indice, libère la mémoire et décale le tableau |
| `trierMesuresParValeur` | Tri à bulles, croissant ou décroissant |
| `statistiquesBatiment` | Nombre de mesures, total, moyenne, minimum et maximum d'un bâtiment |
| `detecterAnomalie`, `detecterToutesAnomalies` | Alerte si `valeur > seuil` |
| `calculerTendance` | Moyenne mobile et tendance (voir ci-dessous) |
| `exporterJSON` | Écrit `data.json` avec les champs d'alerte et de tendance |
| `libererMesures` | Libère les chaînes allouées puis le tableau |

Seuils par défaut quand un couple bâtiment/ressource est nouveau : électricité 120, eau 100, autres ressources 150
(côté web, `ajouter_mesure.php` applique : électricité 120, eau 100, chauffage 100, gaz 120).

### Moyenne mobile et tendance

Pour chaque mesure, le module C cherche les deux mesures **précédentes** du même bâtiment et de la même ressource
(date antérieure, ou même date mais ligne antérieure dans le fichier).

- `moyenne_mobile` : moyenne de la mesure courante et de ces deux mesures précédentes (fenêtre de 3 au maximum).
- `tendance` :
  - `indisponible` : aucune mesure précédente ;
  - `hausse` : valeur supérieure de plus de 5 % à la moyenne des précédentes ;
  - `baisse` : valeur inférieure de plus de 5 % à cette moyenne ;
  - `stable` : sinon.

### Menu du programme

1. Afficher toutes les mesures
2. Ajouter une mesure
3. Rechercher (bâtiment + ressource)
4. Supprimer une mesure (par numéro)
5. Trier par valeur croissante
6. Statistiques par bâtiment (vide = tous les bâtiments)
7. Détecter / afficher les anomalies (valeur > seuil)
8. Exporter vers JSON (`data.json`)
0. Quitter

## Formats d'échange

### Entrée : CSV

Une ligne d'en-tête, puis une mesure par ligne :

```
batiment,ressource,valeur,seuil,date
Salle_TP_Informatique,electricite,152.4,120.0,2026-09-20
```

Les ressources reconnues par le site : `electricite`, `eau`, `chauffage`, `gaze` (gaz).
Les espaces des noms de bâtiments sont remplacés par `_` ; le site les réaffiche avec des espaces.

### Sortie : JSON

Tableau d'objets :

| Champ | Type | Description |
|---|---|---|
| `batiment` | texte | Nom du bâtiment |
| `ressource` | texte | `electricite`, `eau`, `chauffage` ou `gaze` |
| `valeur` | nombre | Consommation mesurée |
| `seuil` | nombre | Seuil de référence |
| `date` | texte | Date au format `AAAA-MM-JJ` |
| `alerte` | booléen | `true` si `valeur > seuil` |
| `moyenne_mobile` | nombre | Moyenne sur la mesure et les 2 précédentes |
| `tendance` | texte | `hausse`, `baisse`, `stable` ou `indisponible` |

```json
{
    "batiment": "Bibliothèque",
    "ressource": "electricite",
    "valeur": 900.00,
    "seuil": 120.00,
    "date": "2026-11-09",
    "alerte": true,
    "moyenne_mobile": 380.00,
    "tendance": "hausse"
}
```

## Module Web

### Pages

Le site est une page unique (`index.php`) dont les sections s'affichent selon l'ancre de l'URL.
Les visiteurs non connectés sont redirigés vers `#login`.

| Ancre | Contenu |
|---|---|
| `#dashboard` | Total, moyenne, nombre d'alertes (compteurs animés), graphique valeur vs seuil, liste des anomalies, moyenne par ressource |
| `#mesures` | Tableau complet avec tendance, filtres (bâtiment, ressource, période), recherche, bouton « Voir Alertes », ajout d'un bâtiment |
| `#graphique` | Consommation par jour (courbe avec moyenne mobile du module C), par bâtiment, par ressource |
| `#alertes` | Compteurs d'alertes et **classement écologique** (podium des 3 bâtiments au plus fort dépassement, avec score éco) |
| `#profil` | Informations du compte, photo, changement de nom d'utilisateur et de mot de passe, liste des bâtiments ajoutés |
| `#login`, `#register`, `#forgot-password`, `#verify-code`, `#reset-password` | Authentification |

### Fonctionnalités

- Chargement dynamique de `data.json` par `fetch()` (jeu de secours intégré si le fichier est introuvable).
- Mise en évidence des anomalies (rouge, pictogramme d'alerte) et colonne **Tendance** (↑ ↓ →) avec la moyenne mobile en info-bulle.
- Graphiques Chart.js : barres valeur vs seuil, courbe par jour, répartition par bâtiment et par ressource.
- Mode sombre / clair mémorisé dans le navigateur.
- Export PDF par impression optimisée (bouton de l'en-tête).
- **Notifications animées** : message de succès ou d'erreur après chaque action, et alerte spécifique « Nouvelle anomalie détectée » quand un ajout dépasse son seuil (avec le pourcentage de dépassement).
- Boutons **✨ Expliquer** sur les graphiques : ils envoient une question préparée à l'assistant.
- Écran d'accueil animé (splash) et animations d'entrée des barres et colonnes.

### Ajout d'un bâtiment

Le bouton « Ajouter un bâtiment » ouvre une fenêtre (bâtiment, ressource, valeur). `php/ajouter_mesure.php` :

1. vérifie que l'utilisateur est connecté et valide les champs (caractères autorisés, ressource connue, valeur numérique positive) ;
2. ajoute la ligne à `measures_in.csv` avec verrouillage du fichier (`flock`), la date du jour et le seuil par défaut de la ressource ;
3. enregistre l'ajout dans la table `mesures_ajoutees` pour la page profil ;
4. prépare l'alerte animée si `valeur > seuil` ;
5. lance `EcoCampus.exe measures_in.csv data.json --export` puis affiche un message de succès ou d'erreur
   (module C introuvable, échec, ou exécutable ne gérant pas `--export`).

### Responsive

`responsive.css` (chargé en dernier dans `index.php`) n'agit que dans des `@media` :

- ≤ 768 px : menu fixe en bas de l'écran comme une application, en-tête compact, champs à 16 px (évite le zoom sur iPhone), filtres pleine largeur ;
- les tableaux deviennent des **cartes** (chaque cellule affiche son intitulé : Bâtiment, Ressource, Valeur, Seuil, Date, Statut, Tendance) ;
- podium, alertes, notifications et chatbot réajustés ; le bouton PDF est masqué sous 520 px ;
- sur écran tactile, les effets de survol sont désactivés.

## Comptes utilisateurs

- Inscription avec nom, prénom, nom d'utilisateur, e-mail et mot de passe (8 caractères minimum).
- Mots de passe hachés avec `password_hash`, sessions régénérées à la connexion et au changement de mot de passe.
- Connexion par nom d'utilisateur **ou** e-mail.
- Mot de passe oublié : code à 6 chiffres envoyé par e-mail (PHPMailer + Gmail), stocké haché, valable 10 minutes, 5 tentatives maximum, usage unique.
- Profil : changement de nom d'utilisateur (3 à 30 caractères, unicité contrôlée), changement de mot de passe,
  photo JPG / PNG / WebP de 2 Mo maximum avec recadrage avant envoi.

## Assistant EcoCampus (chatbot)

- Fenêtre de chat flottante (`chatbot.js` + `chatbot.css`), visible uniquement pour un utilisateur connecté.
- `php/chatbot.php` lit `data.json`, calcule un résumé par bâtiment et ressource (total, moyenne, min, max, alertes), puis interroge l'API **Groq**
  (modèle `openai/gpt-oss-20b` par défaut) avec ce contexte.
- L'assistant répond en français, uniquement sur la consommation du campus, sans accès aux comptes utilisateurs.
- Protections : connexion obligatoire, 15 messages par minute et par session, historique limité aux 8 derniers échanges,
  message limité à 500 caractères, affichage en `textContent` (aucun HTML venant du modèle).
- Suggestions de départ : bâtiments en alerte, bâtiment le plus consommateur, conseils de réduction.

## Installation du site (XAMPP)

1. Copier le projet dans `htdocs/` (par exemple `htdocs/EcoCampus/`) et démarrer **Apache** et **MySQL**.
2. Créer la base `ecocampus_auth` (phpMyAdmin) avec les tables ci-dessous.
3. Placer `EcoCampus.exe` à la racine du projet et vérifier qu'il gère `--export` (le recompiler sinon).
4. Créer `php/config.php` :

   ```php
   <?php
   define('GMAIL_USERNAME', 'votre.adresse@gmail.com');
   define('GMAIL_PASSWORD', 'mot de passe d\'application Gmail');
   define('GROQ_API_KEY', 'gsk_...');
   define('GROQ_MODEL', 'openai/gpt-oss-20b'); // facultatif
   ```

5. Ouvrir `http://localhost/EcoCampus/index.php`. Le site doit être lancé via XAMPP (et non en ouvrant le fichier directement) pour que PHP, `fetch()` et le chatbot fonctionnent.

### Base de données

Colonnes utilisées par le code (types à adapter si besoin) :

```sql
CREATE TABLE utilisateurs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  username VARCHAR(30) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  mot_de_passe VARCHAR(255) NOT NULL,
  photo VARCHAR(255) NULL
);

CREATE TABLE password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(255) NOT NULL,
  expiration DATETIME NOT NULL,
  utilise TINYINT(1) NOT NULL DEFAULT 0,
  tentatives INT NOT NULL DEFAULT 0
);

CREATE TABLE mesures_ajoutees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  batiment VARCHAR(100) NOT NULL,
  ressource VARCHAR(20) NOT NULL,
  valeur DOUBLE NOT NULL,
  seuil DOUBLE NOT NULL,
  date_mesure DATE NOT NULL
);
```

## Sécurité

- `php/config.php` contient des identifiants : l'ajouter au `.gitignore` et ne jamais l'envoyer sur GitHub.
- Requêtes SQL préparées (PDO) partout ; sorties HTML échappées avec `htmlspecialchars`.
- Validation stricte des champs de l'ajout de mesure pour ne pas corrompre le CSV ; chemin de l'exécutable passé à `escapeshellarg`.
- Envoi de photo : contrôle de taille, du type MIME réel et de l'image, nom de fichier aléatoire.

## Équipe

- May jaballah
- Malek chuigui
- Nour eltoffehi
- Abir habouria
- Nourane zekri
