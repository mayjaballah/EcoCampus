
#ifndef GESTION_H
#define GESTION_H

/* Bibliotheques necessaires */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>


/* =====================================================
   3.1 - MODELISATION D'UNE MESURE
   ===================================================== */

/*
   Structure representant une mesure de consommation.

   Les champs correspondent exactement aux champs JSON :
   batiment, ressource, valeur, seuil, date, alerte.

   Les chaines de caracteres sont allouees dynamiquement
   dans le fichier gestion.c.
*/
typedef struct {
    char *batiment;     // Nom du batiment
    char *ressource;    // Type de ressource
    double valeur;      // Valeur de consommation
    double seuil;       // Seuil de reference
    char *date;         // Date au format AAAA-MM-JJ
    bool alerte;        // true si valeur > seuil
} Mesure;


/* =====================================================
   3.2 - CHARGEMENT DES DONNEES
   ===================================================== */

/*
   Charge les mesures depuis un fichier CSV.
   Alloue dynamiquement la memoire necessaire.
   Retourne le nombre de mesures chargees.
   Retourne -1 en cas d'erreur.
*/
int chargerMesures(const char *nomFichier,
                   Mesure **mesures);


/* =====================================================
   3.3 - AJOUT D'UNE MESURE
   ===================================================== */

/*
   Ajoute une mesure au tableau dynamique.
   Realloue la memoire avec realloc si necessaire.
   Retourne 1 si l'ajout reussit, 0 sinon.
*/
int ajouterMesure(Mesure **mesures,
                  int *nbMesures,
                  const Mesure *nouvelleMesure);


/* =====================================================
   3.4 - RECHERCHE D'UNE MESURE
   ===================================================== */

/*
   Recherche les mesures d'un batiment et d'une ressource.
   Retourne l'indice de la premiere mesure trouvee.
   Retourne -1 si aucune mesure ne correspond.
*/
int rechercherMesure(const Mesure *mesures,
                     int nbMesures,
                     const char *batiment,
                     const char *ressource);


/* =====================================================
   3.5 - SUPPRESSION D'UNE MESURE
   ===================================================== */

/*
   Supprime la mesure situee a l'indice indique.
   Libere la memoire de ses chaines de caracteres.
   Decale les mesures suivantes et met a jour le compteur.
   Retourne 1 si la suppression reussit, 0 sinon.
*/
int supprimerMesure(Mesure **mesures,
                    int *nbMesures,
                    int indice);


/* =====================================================
   3.6 - TRI DES MESURES
   ===================================================== */

/*
   Trie les mesures par ordre croissant de valeur.
   Utilise un tableau dynamique de mesures.
*/
void trierMesuresParValeur(Mesure *mesures,
                           int nbMesures);


/* =====================================================
   3.7 - STATISTIQUES PAR BATIMENT
   ===================================================== */

/*
   Calcule les statistiques d'un batiment :
   - nombre de mesures ;
   - consommation totale ;
   - consommation moyenne.

   Les resultats sont retournes par pointeurs.
   Retourne 1 si le batiment existe, 0 sinon.
*/
int statistiquesBatiment(const Mesure *mesures,
                          int nbMesures,
                          const char *batiment,
                          int *nombre,
                          double *total,
                          double *moyenne);


/* =====================================================
   3.8 - DETECTION DES ANOMALIES
   ===================================================== */

/*
   Determine si une mesure est anormale.
   Une anomalie existe si valeur > seuil.
   Met a jour le champ alerte.
   Retourne true si la mesure depasse le seuil.
*/
bool detecterAnomalie(Mesure *mesure);


/*
   Calcule et met a jour le champ alerte
   pour toutes les mesures.
*/
void detecterToutesAnomalies(Mesure *mesures,
                             int nbMesures);


/* =====================================================
   3.9 - EXPORTATION JSON
   ===================================================== */

/*
   Exporte toutes les mesures dans un fichier JSON.
   Respecte le format defini :
   batiment, ressource, valeur, seuil, date, alerte.

   Retourne 1 si l'exportation reussit, 0 sinon.
*/
int exporterJSON(const char *nomFichier,
                 const Mesure *mesures,
                 int nbMesures);


/* =====================================================
   LIBERATION DE LA MEMOIRE
   ===================================================== */

/*
   Libere les chaines de caracteres de chaque mesure,
   puis le tableau dynamique lui-meme.
*/
void libererMesures(Mesure **mesures,
                    int nbMesures);

#endif
