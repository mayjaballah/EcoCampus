#include "gestion.h"

static char *copierChaine(const char *source){
    char *copie = malloc(strlen(source) + 1);

    if (copie != NULL)
    {
        strcpy(copie, source);
    }

    return copie;
}

int chargerMesures(const char *nomFichier , Mesure **mesures){
    FILE *f;
    char ligne[512];
    char batiment[100];
    char ressource[100];
    char date[100];
    double valeur, seuil;
    int n = 0;
    Mesure *temp;

    if (nomFichier == NULL || mesures == NULL)
    {
        return -1;
    }

    *mesures = NULL;

    f = fopen(nomFichier, "r");

    if (f == NULL)
    {
        printf("Erreur d'ouverture du fichier.\n");
        return -1;
    }

    if (fgets(ligne, sizeof(ligne), f) == NULL)
    {
        fclose(f);
        return 0;
    }

    while (fgets(ligne, sizeof(ligne), f) != NULL)
    {
        if (sscanf(ligne, "%99[^,],%99[^,],%lf,%lf,%99[^\r\n]",
                   batiment,
                   ressource,
                   &valeur,
                   &seuil,
                   date) == 5)
        {
            temp = realloc(*mesures, (n + 1) * sizeof(Mesure));

            if (temp == NULL)
            {
                int i;

                for (i = 0; i < n; i++)
                {
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

            (*mesures)[n].batiment = copierChaine(batiment);
            (*mesures)[n].ressource = copierChaine(ressource);
            (*mesures)[n].date = copierChaine(date);

            if ((*mesures)[n].batiment == NULL ||
                (*mesures)[n].ressource == NULL ||
                (*mesures)[n].date == NULL)
            {
                int i;

                free((*mesures)[n].batiment);
                free((*mesures)[n].ressource);
                free((*mesures)[n].date);

                for (i = 0; i < n; i++)
                {
                    free((*mesures)[i].batiment);
                    free((*mesures)[i].ressource);
                    free((*mesures)[i].date);
                }

                free(*mesures);
                *mesures = NULL;

                fclose(f);
                return -1;
            }

            (*mesures)[n].valeur = valeur;
            (*mesures)[n].seuil = seuil;
            (*mesures)[n].alerte = (valeur > seuil);

            n++;
        }
    }

    fclose(f);

    return n;
}

int rechercherMesure(const Mesure *mesures , int nbMesures,
const char *batiment , const char *ressource){
    int i;

    for (i = 0; i < nbMesures; i++)
    {
        if (strcmp(mesures[i].batiment, batiment) == 0 &&
            strcmp(mesures[i].ressource, ressource) == 0)
        {
            return i;
        }
    }

    return -1;
}

void trierMesuresParValeur(Mesure *mesures , int nbMesures){
    int i, j;
    Mesure temp;

    for (i = 0; i < nbMesures - 1; i++)
    {
        for (j = 0; j < nbMesures - 1 - i; j++)
        {
            if (mesures[j].valeur > mesures[j + 1].valeur)
            {
                temp = mesures[j];
                mesures[j] = mesures[j + 1];
                mesures[j + 1] = temp;
            }
        }
    }
}

bool detecterAnomalie(Mesure *mesure){
    if (mesure->valeur > mesure->seuil)
    {
        mesure->alerte = true;
    }
    else
    {
        mesure->alerte = false;
    }

    return mesure->alerte;
}

void detecterToutesAnomalies(Mesure *mesures, int nbMesures)
{
    int i;

    for (i = 0; i < nbMesures; i++)
    {
        detecterAnomalie(&mesures[i]);
    }
}

