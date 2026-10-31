#ifndef GESTION_H
#define GESTION_H

/* Bibliothèques standards nécessaires pour les E/S, la mémoire et les booléens */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

/* =====================================================
   3.1 - MODÉLISATION D'UNE MESURE
   ===================================================== */
/* 
   Structure représentant une ligne de mesure de consommation.
   Les chaînes de caractères (batiment, ressource, date) sont allouées dynamiquement.
*/
typedef struct {
    char *batiment;     // Nom du bâtiment (ex: Bibliothèque)
    char *ressource;    // Type de ressource (ex: electricite, eau)
    double valeur;      // Valeur de consommation mesurée
    double seuil;       // Seuil limite de référence
    char *date;         // Date au format AAAA-MM-JJ
    bool alerte;        // Vrai (true) si la valeur dépasse le seuil
} Mesure;


/* =====================================================
   3.2 - CHARGEMENT DES DONNÉES
   ===================================================== */
/* Lit le fichier CSV et remplit dynamiquement un tableau de Mesures[cite: 1]. */
int chargerMesures(const char *nomFichier, Mesure **mesures);


/* =====================================================
   3.3 - AJOUT D'UNE MESURE
   ===================================================== */
/* Ajoute une nouvelle mesure en appliquant un seuil fixe/automatique[cite: 1]. */
int ajouterMesure(Mesure **mesures, int *nbMesures, const Mesure *nouvelleMesure);


/* =====================================================
   3.4 - RECHERCHE D'UNE MESURE
   ===================================================== */
/* Recherche une mesure par bâtiment et ressource[cite: 1]. */
int rechercherMesure(const Mesure *mesures, int nbMesures, const char *batiment, const char *ressource);


/* =====================================================
   3.5 - SUPPRESSION D'UNE MESURE
   ===================================================== */
/* Supprime une mesure selon son indice dans le tableau et décale les éléments[cite: 1]. */
int supprimerMesure(Mesure **mesures, int *nbMesures, int indice);


/* =====================================================
   3.6 - TRI DES MESURES
   ===================================================== */
/* Trie les mesures par valeur (croissant ou décroissant selon le paramètre)[cite: 1]. */
void trierMesuresParValeur(Mesure *mesures, int nbMesures, int croissant);


/* =====================================================
   3.7 - STATISTIQUES PAR BÂTIMENT
   ===================================================== */
/* Calcule les statistiques (total, moyenne, min, max) pour un bâtiment[cite: 1]. */
int statistiquesBatiment(const Mesure *mesures, int nbMesures, const char *batiment, int *nombre, double *total, double *moyenne);


/* =====================================================
   3.8 - DÉTECTION DES ANOMALIES
   ===================================================== */
/* Vérifie si une mesure dépasse son seuil et met à jour son alerte[cite: 1]. */
bool detecterAnomalie(Mesure *mesure);
void detecterToutesAnomalies(Mesure *mesures, int nbMesures);


/* =====================================================
   3.9 - EXPORTATION JSON
   ===================================================== */
/* Exporte toutes les mesures actuelles vers un fichier au format JSON[cite: 1]. */
int exporterJSON(const char *nomFichier, const Mesure *mesures, int nbMesures);


/* =====================================================
   LIBÉRATION DE LA MÉMOIRE
   ===================================================== */
/* Libère proprement toute la mémoire allouée dynamiquement pour éviter les fuites (Memory Leaks)[cite: 1]. */
void libererMesures(Mesure **mesures, int nbMesures);

#endif