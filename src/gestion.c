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
        if (sscanf(ligne, "%99[^,],%99[^,],%lf,%lf,%99[^\r\n]",batiment,ressource,&valeur,&seuil,date) == 5)
        {
            temp = realloc(*mesures, (n + 1) * sizeof(Mesure));

            if (temp == NULL)
            {
                for (int i = 0; i < n; i++)
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

                free((*mesures)[n].batiment);
                free((*mesures)[n].ressource);
                free((*mesures)[n].date);

                for (int i = 0; i < n; i++)
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

int rechercherMesure(const Mesure *mesures , int nbMesures,const char *batiment , const char *ressource){

    for (int i = 0; i < nbMesures; i++)
    {
        if (strcmp(mesures[i].batiment, batiment) == 0 && strcmp(mesures[i].ressource, ressource) == 0)
        {
            return i;
        }
    }

    return -1;
}

void trierMesuresParValeur(Mesure *mesures , int nbMesures, int croissant){
    Mesure temp;

    for (int i = 0; i < nbMesures - 1; i++)
    {
        for (int j = 0; j < nbMesures - 1 - i; j++)
        {
            if (croissant ? (mesures[j].valeur > mesures[j + 1].valeur) : (mesures[j].valeur < mesures[j + 1].valeur))
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

    for (int i = 0; i < nbMesures; i++)
    {
        detecterAnomalie(&mesures[i]);
    }
}

//Partie de nour

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

int supprimerMesure(Mesure **mesures, int *nbMesures, int indice){
    if(indice<0 || indice>=*nbMesures){
        return 0;
    }
    free((*mesures)[indice].batiment);
    free((*mesures)[indice].ressource);
    free((*mesures)[indice].date);
    //decalage à gauche des mesures apres l'indice supprime
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

int calculerTendance(const Mesure *mesures, int nbMesures, int i,
                     double *moyenneMobile, const char **tendance)
{
    int precedents[2];
    int nbPrec = 0;
    double sommePrec = 0.0;
    int k, j, m;

    /* On cherche les 2 mesures les plus récentes AVANT la mesure i
       (même bâtiment, même ressource, date antérieure) */
    for (k = 0; k < 2; k++)
    {
        int meilleur = -1;

        for (j = 0; j < nbMesures; j++)
        {
            int dejaPris = 0;
            int cmp;

            if (j == i) continue;
            if (strcmp(mesures[j].batiment, mesures[i].batiment) != 0 ||
                strcmp(mesures[j].ressource, mesures[i].ressource) != 0) continue;

            cmp = strcmp(mesures[j].date, mesures[i].date); /* AAAA-MM-JJ : l'ordre texte = l'ordre chronologique */
            if (cmp > 0 || (cmp == 0 && j > i)) continue;   /* pas antérieure */

            for (m = 0; m < nbPrec; m++)
            {
                if (precedents[m] == j) dejaPris = 1;
            }
            if (dejaPris) continue;

            if (meilleur == -1 ||
                strcmp(mesures[j].date, mesures[meilleur].date) > 0 ||
                (strcmp(mesures[j].date, mesures[meilleur].date) == 0 && j > meilleur))
            {
                meilleur = j;
            }
        }

        if (meilleur == -1) break;
        precedents[nbPrec++] = meilleur;
        sommePrec += mesures[meilleur].valeur;
    }

    *moyenneMobile = (mesures[i].valeur + sommePrec) / (nbPrec + 1);

    if (nbPrec == 0)
    {
        *tendance = "indisponible";
    }
    else
    {
        double moyPrec = sommePrec / nbPrec;

        if (mesures[i].valeur > moyPrec * 1.05)      *tendance = "hausse";
        else if (mesures[i].valeur < moyPrec * 0.95) *tendance = "baisse";
        else                                         *tendance = "stable";
    }

    return nbPrec;
}

int exporterJSON(const char *nomFichier, const Mesure *mesures, int nbMesures){
    FILE *f=fopen(nomFichier,"w");
    if(f==NULL){
        return 0;
    }
    fprintf(f,"[\n");
    for(int i=0;i<nbMesures;i++){
        double moyenneMobile;
        const char *tendance;

        calculerTendance(mesures, nbMesures, i, &moyenneMobile, &tendance);

        fprintf(f,"{\n");
        fprintf(f,"    \"batiment\": \"%s\",\n",mesures[i].batiment);
        fprintf(f,"    \"ressource\": \"%s\",\n",mesures[i].ressource);
        fprintf(f,"    \"valeur\": %.2f,\n",mesures[i].valeur);
        fprintf(f,"    \"seuil\": %.2f,\n",mesures[i].seuil);
        fprintf(f,"    \"date\": \"%s\",\n",mesures[i].date);
        fprintf(f,"    \"alerte\": %s,\n",mesures[i].alerte ? "true" : "false");
        fprintf(f,"    \"moyenne_mobile\": %.2f,\n",moyenneMobile);
        fprintf(f,"    \"tendance\": \"%s\"\n",tendance);
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
