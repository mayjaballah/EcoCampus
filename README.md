# EcoCampus - Module C (traitement des données)

Programme en C qui gère les mesures de consommation des bâtiments du campus
(électricité, eau, chauffage), détecte les anomalies et génère un fichier JSON
pour le module web.

## Fichiers

| Fichier | Rôle |
|---|---|
| `gestion.h` | Structure `Mesure` et prototypes des fonctions |
| `gestion.c` | Fonctions du module : chargement, ajout, recherche, suppression, tri, statistiques, anomalies, export JSON |
| `main.c` | Programme principal avec menu interactif |
| `measures_in.csv` | Jeu de données d'entrée (20 mesures) |
| `data.json` | Fichier de sortie généré par le programme |

## Compilation

```
gcc -Wall -o ecocampus main.c gestion.c
```

## Exécution

```
./ecocampus                            # Linux / Mac / MSYS2
ecocampus.exe                          # Windows
./ecocampus measures_in.csv data.json  # avec les fichiers précisés
```

Par défaut, le programme lit `measures_in.csv` et écrit `data.json` dans le dossier courant.

## Format du fichier d'entrée (CSV)

Une ligne d'en-tête, puis une mesure par ligne :

```
batiment,ressource,valeur,seuil,date
Salle_TP_Informatique,electricite,152.4,120.0,2026-09-20
```

## Menu du programme

1. Afficher toutes les mesures
2. Ajouter une mesure
3. Rechercher (bâtiment + ressource)
4. Supprimer une mesure (par numéro)
5. Trier par valeur croissante
6. Statistiques par bâtiment (vide = tous les bâtiments)
7. Détecter / afficher les anomalies (valeur > seuil)
8. Exporter vers JSON (`data.json`)
0. Quitter

## Format du fichier de sortie (JSON)

Tableau d'objets avec les champs `batiment`, `ressource`, `valeur`, `seuil`, `date`
et `alerte` (`true` si valeur > seuil) :

```json
{
    "batiment": "Salle_TP_Informatique",
    "ressource": "electricite",
    "valeur": 152.40,
    "seuil": 120.00,
    "date": "2026-09-20",
    "alerte": true
}
```

## Équipe

- May jaballah
- Malek chuigui
- Nour eltoffehi
- Abir habouria
- Nourane zekri
