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

//Partie de nour

int ajouterMesure(Mesure **mesures, int *nbMesures, const Mesure *nouvelleMesure){
    Mesure *temp = realloc(*mesures, (*nbMesures+1)* sizeof(Mesure));
    if(temp==NULL){
        return 0;
    }
    *mesures=temp;
    (*mesures)[*nbMesures].batiment=strdup(nouvelleMesure->batiment);
    (*mesures)[*nbMesures].ressource=strdup(nouvelleMesure->ressource);
    (*mesures)[*nbMesures].date=strdup(nouvelleMesure->date);
    if(!(*mesures)[*nbMesures].batiment || !(*mesures)[*nbMesures].ressource || !(*mesures)[*nbMesures].date){
        return 0;
    }
    (*mesures)[*nbMesures].valeur=nouvelleMesure->valeur;
    (*mesures)[*nbMesures].seuil=nouvelleMesure->seuil;
    detecterAnomalie(&(*mesures)[*nbMesures]);
    (*nbMesures)++;
    return 1;
}

int supprimerMesure(Mesure **mesures, int *nbMesures, int indice){
    if(indice<0 || indice>=*nbMesures){
        return 0;
    }
    free((*mesures)[indice].batiment);
    free((*mesures)[indice].ressource);
    free((*mesures)[indice].date);
    //decalage à gauche des mesures après l'indice supprimé
    for(int i=indice;i< *nbMesures-1;i++){
        (*mesures)[i]=(*mesures)[i+1];
    }
    (*nbMesures)--;
    if(*nbMesures>0){
        Mesure *temp=realloc(*mesures, (*nbMesures)*sizeof(Mesure));
        if(temp!=NULL){
            *mesures=temp;
        }
    }
    else{
        free(*mesures);
        *mesures=NULL;
    }
    return 1;
}
int statistiquesBatiment(const Mesure *mesures, int nbMesures, const char *batiment, int *nbre, double *tot, double *moy){
    *nbre=0;
    *tot=0.0;
    *moy=0.0;
    double min=0.0;
    double max=0.0;
    int first=1;
    for(int i=0;i<nbMesures;i++){
        if(strcmp(mesures[i].batiment, batiment)==0){
            double val=mesures[i].valeur;
            (*nbre)++;
            (*tot)+=val;
            if(first){
                min=val;
                max=val;
                first=0;
            }
            else{
                if(val<min) min=val;
                if(val>max) max=val;
            }
        }
    }
    if(*nbre==0){
        printf("Aucune donnes trouve pour le batiment %s \n", batiment);
        return 0;
    }
    *moy=(*tot)/(*nbre);
    printf("----Statistiques pour le batiment : %s ---- \n", batiment);
    printf("Nombre de mesures : %d\n", *nbre);
    printf("Consommation totale : %.2f\n", *tot);
    printf("Consommation moyenne : %.2f\n", *moy);
    printf("Consommation minimale : %.2f\n", min);
    printf("Consommation maximale : %.2f\n", max);
    return 1;
}

int exporterJSON(const char *nomFichier, const Mesure *mesures, int nbMesures){
    FILE *f=fopen(nomFichier,"w");
    if(f==NULL){
        return 0;
    }
    fprintf(f,"[\n");
    for(int i=0;i<nbMesures;i++){
        fprintf(f,"{\n");
        fprintf(f,"    \"batiment\": \"%s\",\n",mesures[i].batiment);
        fprintf(f,"    \"ressource\": \"%s\",\n",mesures[i].ressource);
        fprintf(f,"    \"valeur\": %.2f,\n",mesures[i].valeur);
        fprintf(f,"    \"seuil\": %.2f,\n",mesures[i].seuil);
        fprintf(f,"    \"date\": \"%s\",\n",mesures[i].date);
        fprintf(f,"    \"alerte\": %s\n",mesures[i].alerte ? "true" : "false");
        fprintf(f,"}%s\n",(i==nbMesures-1)? "" : ",");
    }
    fprintf(f,"]\n");
    fclose(f);
    return 1;
}
void libererMesures(Mesure **mesures, int nbMesures) {
    if(mesures==NULL || *mesures==NULL){
        return;
    }
    for(int i=0;i<nbMesures;i++){
        free((*mesures)[i].batiment);
        free((*mesures)[i].ressource);
        free((*mesures)[i].date);
    }
    free(*mesures);
    *mesures=NULL;
}
