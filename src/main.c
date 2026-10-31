#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "gestion.h"

#define FICHIER_ENTREE "measures_in.csv"
#define FICHIER_SORTIE "data.json"
#define FIN_SAISIE (-2)

/* Fonction sécurisée pour lire une ligne de texte */
static int lireTexte(const char *invite, char *dest, size_t taille)
{
    printf("%s", invite);
    if (fgets(dest, (int)taille, stdin) == NULL)
    {
        dest[0] = '\0';
        return 0;
    }
    dest[strcspn(dest, "\r\n")] = '\0'; // Supprimer le saut de ligne final '\n'
    return 1;
}

/* Fonction sécurisée pour lire un entier au clavier */
static int lireEntier(const char *invite)
{
    char buf[64];
    char *fin;
    long v;

    if (!lireTexte(invite, buf, sizeof(buf))) return FIN_SAISIE;
    v = strtol(buf, &fin, 10);
    if (fin == buf || *fin != '\0') return -1; // Erreur de saisie
    return (int)v;
}

/* Fonction sécurisée pour lire un nombre réel (double) */
static double lireDouble(const char *invite)
{
    char buf[64];
    char *fin;
    double v;

    while (lireTexte(invite, buf, sizeof(buf)))
    {
        v = strtod(buf, &fin);
        if (fin != buf && *fin == '\0') return v;
        printf("Valeur invalide, recommencez.\n");
    }
    return 0.0;
}

/* Validation du format de la date (AAAA-MM-JJ) */
static int validerDate(const char *date)
{
    if (strlen(date) != 10) return 0;
    if (date[4] != '-' || date[7] != '-') return 0;
    return 1;
}

/* Affichage de l'en-tête du tableau en console */
static void afficherEntete(void)
{
    printf("\n%-4s %-26s %-12s %9s %9s  %-11s %s\n",
           "No", "Batiment", "Ressource", "Valeur", "Seuil", "Date", "Alerte");
    printf("-----------------------------------------------------------------------------------\n");
}

static void afficherMesure(int i, const Mesure *m)
{
    printf("%-4d %-26s %-12s %9.2f %9.2f  %-11s %s\n",
           i, m->batiment, m->ressource, m->valeur, m->seuil, m->date,
           m->alerte ? "ALERTE" : "ok");
}

static void afficherToutes(const Mesure *mesures, int nb)
{
    if (nb == 0) { printf("Aucune mesure en memoire.\n"); return; }
    afficherEntete();
    for (int i = 0; i < nb; i++) afficherMesure(i, &mesures[i]);
    printf("Total : %d mesure(s)\n", nb);
}

/* Action d'ajout d'une mesure depuis le menu avec validation des entrées[cite: 2] */
static void actionAjouter(Mesure **mesures, int *nb)
{
    char batiment[100], ressource[100], date[100];
    Mesure m;

    lireTexte("Batiment (ex: Bibliotheque) : ", batiment, sizeof(batiment));
    lireTexte("Ressource (electricite/eau/chauffage) : ", ressource, sizeof(ressource));

    // Validation : Empêcher les valeurs négatives
    do {
        m.valeur = lireDouble("Valeur : ");
        if (m.valeur < 0) printf("Erreur : La valeur ne peut pas etre negative !\n");
    } while (m.valeur < 0);

    m.seuil = 0.0; // Sera calculé automatiquement par ajouterMesure

    // Validation du format de la date
    do {
        lireTexte("Date (AAAA-MM-JJ) : ", date, sizeof(date));
        if (!validerDate(date)) printf("Erreur : Format de date invalide ( Utilisez AAAA-MM-JJ ).\n");
    } while (!validerDate(date));

    m.batiment = batiment;
    m.ressource = ressource;
    m.date = date;
    m.alerte = false;

    if (ajouterMesure(mesures, nb, &m)) {
        printf("Mesure ajoutee avec succes !\n");
    } else {
        printf("Erreur lors de l'ajout.\n");
    }
}

/* Action de recherche par bâtiment et ressource[cite: 2] */
static void actionRechercher(const Mesure *mesures, int nb)
{
    char batiment[100], ressource[100];
    int debut = 0, idx, trouve = 0;

    lireTexte("Batiment : ", batiment, sizeof(batiment));
    lireTexte("Ressource : ", ressource, sizeof(ressource));

    while (debut < nb)
    {
        idx = rechercherMesure(mesures + debut, nb - debut, batiment, ressource);
        if (idx == -1) break;
        if (trouve == 0) afficherEntete();
        afficherMesure(debut + idx, &mesures[debut + idx]);
        trouve++;
        debut += idx + 1;
    }
    if (trouve == 0) printf("Aucune mesure trouvee.\n");
}

/* Action de suppression d'une mesure[cite: 2] */
static void actionSupprimer(Mesure **mesures, int *nb)
{
    afficherToutes(*mesures, *nb);
    if (*nb == 0) return;
    int indice = lireEntier("Numero de la mesure a supprimer : ");
    if (supprimerMesure(mesures, nb, indice)) printf("Suppression reussie.\n");
    else printf("Numero invalide.\n");
}

/* Action d'affichage des statistiques[cite: 2] */
static void actionStatistiques(const Mesure *mesures, int nb)
{
    char batiment[100];
    int n; double total, moyenne;
    lireTexte("Batiment (vide = tous) : ", batiment, sizeof(batiment));

    if (batiment[0] != '\0') {
        statistiquesBatiment(mesures, nb, batiment, &n, &total, &moyenne);
        return;
    }
    // Si vide, afficher pour tous les bâtiments uniques
    for (int i = 0; i < nb; i++) {
        int deja = 0;
        for (int j = 0; j < i; j++) {
            if (strcmp(mesures[i].batiment, mesures[j].batiment) == 0) { deja = 1; break; }
        }
        if (!deja) {
            statistiquesBatiment(mesures, nb, mesures[i].batiment, &n, &total, &moyenne);
            printf("\n");
        }
    }
}

/* Action de détection des anomalies[cite: 2] */
static void actionAnomalies(Mesure *mesures, int nb)
{
    int nbAlertes = 0;
    detecterToutesAnomalies(mesures, nb);
    for (int i = 0; i < nb; i++) {
        if (mesures[i].alerte) {
            if (nbAlertes == 0) afficherEntete();
            afficherMesure(i, &mesures[i]);
            nbAlertes++;
        }
    }
    printf("%d anomalie(s) detectee(s).\n", nbAlertes);
}

/* Action d'exportation JSON[cite: 2] */
static void actionExporter(const Mesure *mesures, int nb, const char *fichier)
{
    if (exporterJSON(fichier, mesures, nb)) printf("Export reussi vers %s\n", fichier);
    else printf("Erreur d'exportation.\n");
}

/* Action de filtrage par ressource[cite: 2] */
static void actionFiltrerParRessource(const Mesure *mesures, int nb)
{
    char ressource[100];
    int trouve = 0;
    lireTexte("Ressource a filtrer (electricite/eau) : ", ressource, sizeof(ressource));
    for (int i = 0; i < nb; i++) {
        if (strcmp(mesures[i].ressource, ressource) == 0) {
            if (trouve == 0) afficherEntete();
            afficherMesure(i, &mesures[i]);
            trouve++;
        }
    }
    if (trouve == 0) printf("Aucun resultat pour cette ressource.\n");
}

/* Affichage du menu principal[cite: 2] */
static void afficherMenu(void)
{
    printf("\n========== ECOCAMPUS - Gestion des mesures ==========\n");
    printf(" 1. Afficher toutes les mesures\n");
    printf(" 2. Ajouter une mesure\n");
    printf(" 3. Rechercher (batiment + ressource)\n");
    printf(" 4. Supprimer une mesure\n");
    printf(" 5. Trier par valeur (croissant/decroissant)\n");
    printf(" 6. Statistiques par batiment\n");
    printf(" 7. Detecter / afficher les anomalies\n");
    printf(" 8. Exporter vers JSON\n");
    printf(" 9. Filtrer les mesures par ressource\n");
    printf(" 0. Quitter\n");
    printf("=====================================================\n");
}

/* Programme principal[cite: 2] */
int main(int argc, char *argv[])
{
    const char *entree = (argc > 1) ? argv[1] : FICHIER_ENTREE;
    const char *sortie = (argc > 2) ? argv[2] : FICHIER_SORTIE;
    Mesure *mesures = NULL;
    int nb, choix;

    // 1. Chargement initial depuis le fichier CSV[cite: 2]
    nb = chargerMesures(entree, &mesures);
    if (nb < 0) { printf("Impossible de charger %s.\n", entree); return 1; }
    printf("%d mesure(s) chargee(s) depuis %s.\n", nb, entree);

    detecterToutesAnomalies(mesures, nb);
    afficherToutes(mesures, nb);

    // 2. Boucle interactive du menu[cite: 2]
    do
    {
        afficherMenu();
        choix = lireEntier("Votre choix : ");

        switch (choix)
        {
        case 1: afficherToutes(mesures, nb); break;
        case 2: actionAjouter(&mesures, &nb); break;
        case 3: actionRechercher(mesures, nb); break;
        case 4: actionSupprimer(&mesures, &nb); break;
        case 5: {
            int ordre = lireEntier("Ordre de tri (1 = Croissant, 0 = Decroissant) : ");
            trierMesuresParValeur(mesures, nb, ordre);
            afficherToutes(mesures, nb);
            break;
        }
        case 6: actionStatistiques(mesures, nb); break;
        case 7: actionAnomalies(mesures, nb); break;
        case 8: actionExporter(mesures, nb, sortie); break;
        case 9: actionFiltrerParRessource(mesures, nb); break;
        case 0: printf("Au revoir !\n"); break;
        default: printf("Choix invalide.\n"); break;
        }
    } while (choix != 0 && choix != FIN_SAISIE);

    // 3. Libération de la mémoire avant de quitter le programme[cite: 2]
    libererMesures(&mesures, nb);
    return 0;
}