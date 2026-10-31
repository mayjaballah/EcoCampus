#include "gestion.h"

/* Fonction utilitaire statique pour dupliquer une chaîne de caractères de manière sécurisée */
static char *copierChaine(const char *source){
    if (source == NULL) return NULL;
    char *copie = malloc(strlen(source) + 1);
    if (copie != NULL)
    {
        strcpy(copie, source);
    }
    return copie;
}

/* 1. Charger les mesures depuis le fichier CSV[cite: 3] */
int chargerMesures(const char *nomFichier , Mesure **mesures){
    FILE *f;
    char ligne[512];
    char batiment[100], ressource[100], date[100];
    double valeur, seuil;
    int n = 0;
    Mesure *temp;

    if (nomFichier == NULL || mesures == NULL) return -1;

    *mesures = NULL;
    f = fopen(nomFichier, "r");
    if (f == NULL) {
        printf("Erreur d'ouverture du fichier.\n");
        return -1;
    }

    // Ignorer la première ligne (en-tête du CSV)
    if (fgets(ligne, sizeof(ligne), f) == NULL) {
        fclose(f);
        return 0;
    }

    // Lire le fichier ligne par ligne
    while (fgets(ligne, sizeof(ligne), f) != NULL)
    {
        // Extraction des champs séparés par des virgules
        if (sscanf(ligne, "%99[^,],%99[^,],%lf,%lf,%99[^\r\n]", batiment, ressource, &valeur, &seuil, date) == 5)
        {
            // Agrandissement dynamique du tableau de mesures
            temp = realloc(*mesures, (n + 1) * sizeof(Mesure));
            if (temp == NULL) {
                // En cas d'échec de réallocation, libérer la mémoire déjà allouée
                for (int i = 0; i < n; i++) {
                    free((*mesures)[i].batiment);
                    free((*mesures)[i].ressource);
                    free((*mesures)[i].date);
                }
                free(*mesures);
                *mesures = NULL;
                fclose(f);
                return -1;
            }
            *mesures = temp;

            // Allocation et copie des chaînes de caractères
            (*mesures)[n].batiment = copierChaine(batiment);
            (*mesures)[n].ressource = copierChaine(ressource);
            (*mesures)[n].date = copierChaine(date);
            (*mesures)[n].valeur = valeur;
            (*mesures)[n].seuil = seuil;
            (*mesures)[n].alerte = (valeur > seuil); // Détection automatique d'alerte

            n++; // Incrémenter le nombre de mesures chargées
        }
    }

    fclose(f);
    return n; // Retourne le nombre total de mesures lues
}

/* 2. Rechercher une mesure par bâtiment et ressource[cite: 3] */
int rechercherMesure(const Mesure *mesures , int nbMesures, const char *batiment , const char *ressource){
    for (int i = 0; i < nbMesures; i++)
    {
        if (strcmp(mesures[i].batiment, batiment) == 0 && strcmp(mesures[i].ressource, ressource) == 0)
        {
            return i; // Retourne l'indice dès qu'une correspondance est trouvée
        }
    }
    return -1; // Non trouvé
}

/* 3. Trier les mesures par valeur (croissant ou décroissant)[cite: 3] */
void trierMesuresParValeur(Mesure *mesures , int nbMesures, int croissant){
    Mesure temp;
    for (int i = 0; i < nbMesures - 1; i++)
    {
        for (int j = 0; j < nbMesures - 1 - i; j++)
        {
            // Condition ternaire pour basculer entre tri croissant et décroissant
            bool condition = croissant ? (mesures[j].valeur > mesures[j + 1].valeur) 
                                       : (mesures[j].valeur < mesures[j + 1].valeur);
            if (condition)
            {
                temp = mesures[j];
                mesures[j] = mesures[j + 1];
                mesures[j + 1] = temp;
            }
        }
    }
}

/* 4. Détecter les anomalies (valeur > seuil)[cite: 3] */
bool detecterAnomalie(Mesure *mesure){
    mesure->alerte = (mesure->valeur > mesure->seuil);
    return mesure->alerte;
}

void detecterToutesAnomalies(Mesure *mesures, int nbMesures) {
    for (int i = 0; i < nbMesures; i++) {
        detecterAnomalie(&mesures[i]);
    }
}

/* 5. Ajouter une mesure avec gestion automatique du seuil fixe[cite: 3] */
int ajouterMesure(Mesure **mesures, int *nbMesures, const Mesure *nouvelleMesure){
    double seuilFixe = -1.0;

    // Chercher si le bâtiment et la ressource existent déjà pour récupérer leur seuil officiel/fixe
    for (int i = 0; i < *nbMesures; i++) {
        if (strcmp((*mesures)[i].batiment, nouvelleMesure->batiment) == 0 &&
            strcmp((*mesures)[i].ressource, nouvelleMesure->ressource) == 0) {
            seuilFixe = (*mesures)[i].seuil; // Récupérer le seuil existant
            break;
        }
    }

    // Si c'est un nouveau bâtiment/ressource, appliquer un seuil par défaut automatique
    if (seuilFixe < 0) {
        if (strcmp(nouvelleMesure->ressource, "electricite") == 0) seuilFixe = 120.0;
        else if (strcmp(nouvelleMesure->ressource, "eau") == 0) seuilFixe = 100.0;
        else seuilFixe = 150.0;
    }

    // Réallocation dynamique pour inclure la nouvelle mesure
    Mesure *temp = realloc(*mesures, (*nbMesures + 1) * sizeof(Mesure));
    if (temp == NULL) return 0;
    *mesures = temp;

    // Copie des données de la nouvelle mesure
    (*mesures)[*nbMesures].batiment = copierChaine(nouvelleMesure->batiment);
    (*mesures)[*nbMesures].ressource = copierChaine(nouvelleMesure->ressource);
    (*mesures)[*nbMesures].date = copierChaine(nouvelleMesure->date); // (ou nouvelleMesure->date)
    (*mesures)[*nbMesures].valeur = nouvelleMesure->valeur;
    (*mesures)[*nbMesures].seuil = seuilFixe; // Application du seuil fixe
    detecterAnomalie(&(*mesures)[*nbMesures]);

    (*nbMesures)++;
    return 1;
}

/* 6. Supprimer une mesure par son indice[cite: 3] */
int supprimerMesure(Mesure **mesures, int *nbMesures, int indice){
    if (indice < 0 || indice >= *nbMesures) return 0;

    // Libérer les chaînes allouées pour cet indice
    free((*mesures)[indice].batiment);
    free((*mesures)[indice].ressource);
    free((*mesures)[indice].date);
    
    // Décalage des éléments vers la gauche
    for (int i = indice; i < *nbMesures - 1; i++) {
        (*mesures)[i] = (*mesures)[i + 1];
    }
    (*nbMesures)--;
    
    // Réajustement de la mémoire du tableau
    if (*nbMesures > 0) {
        Mesure *temp = realloc(*mesures, (*nbMesures) * sizeof(Mesure));
        if (temp != NULL) *mesures = temp;
    } else {
        free(*mesures);
        *mesures = NULL;
    }
    return 1;
}

/* 7. Calculer les statistiques d'un bâtiment[cite: 3] */
int statistiquesBatiment(const Mesure *mesures, int nbMesures, const char *batiment, int *nbre, double *tot, double *moy){
    *nbre = 0; *tot = 0.0; *moy = 0.0;
    double min = 0.0, max = 0.0;
    int first = 1;

    for (int i = 0; i < nbMesures; i++) {
        if (strcmp(mesures[i].batiment, batiment) == 0) {
            double val = mesures[i].valeur;
            (*nbre)++;
            (*tot) += val;
            if (first) {
                min = val; max = val;
                first = 0;
            } else {
                if (val < min) min = val;
                if (val > max) max = val;
            }
        }
    }

    if (*nbre == 0) return 0;

    *moy = (*tot) / (*nbre);
    // Affichage des statistiques calculées
    printf("---- Statistiques pour le batiment : %s ---- \n", batiment);
    printf("Nombre de mesures : %d\n", *nbre);
    printf("Consommation totale : %.2f\n", *tot);
    printf("Consommation moyenne : %.2f\n", *moy);
    return 1;
}

/* 8. Exporter toutes les mesures au format JSON[cite: 3] */
int exporterJSON(const char *nomFichier, const Mesure *mesures, int nbMesures){
    FILE *f = fopen(nomFichier, "w");
    if (f == NULL) return 0;

    fprintf(f, "[\n");
    for (int i = 0; i < nbMesures; i++) {
        fprintf(f, "{\n");
        fprintf(f, "    \"batiment\": \"%s\",\n", mesures[i].batiment);
        fprintf(f, "    \"ressource\": \"%s\",\n", mesures[i].ressource);
        fprintf(f, "    \"valeur\": %.2f,\n", mesures[i].valeur);
        fprintf(f, "    \"seuil\": %.2f,\n", mesures[i].seuil);
        fprintf(f, "    \"date\": \"%s\",\n", mesures[i].date);
        fprintf(f, "    \"alerte\": %s\n", mesures[i].alerte ? "true" : "false");
        fprintf(f, "}%s\n", (i == nbMesures - 1) ? "" : ",");
    }
    fprintf(f, "]\n");
    fclose(f);
    return 1;
}

/* 9. Libération complète de la mémoire dynamique[cite: 3] */
void libererMesures(Mesure **mesures, int nbMesures) {
    if (mesures == NULL || *mesures == NULL) return;
    for (int i = 0; i < nbMesures; i++) {
        free((*mesures)[i].batiment);
        free((*mesures)[i].ressource);
        free((*mesures)[i].date);
    }
    free(*mesures);
    *mesures = NULL;
}