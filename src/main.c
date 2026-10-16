/* main.c - EcoCampus : programme principal (menu interactif)
 * Utilise le module gestion.c / gestion.h
 *
 * Compilation : gcc -Wall -o ecocampus main.c gestion.c
 * Exécution   : ./ecocampus [measures_in.csv] [data.json]
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "gestion.h"

#define FICHIER_ENTREE "measures_in.csv"
#define FICHIER_SORTIE "data.json"
#define FIN_SAISIE (-2)   /* retourné par lireEntier() en fin de saisie (EOF) */

/* ---------- Fonctions utilitaires de saisie ---------- */

/* Lit une ligne de texte. Retourne 0 si fin de saisie (EOF). */
static int lireTexte(const char *invite, char *dest, size_t taille)
{
    printf("%s", invite);
    if (fgets(dest, (int)taille, stdin) == NULL)
    {
        dest[0] = '\0';
        return 0;
    }
    dest[strcspn(dest, "\r\n")] = '\0';
    return 1;
}

/* Lit un entier. Retourne -1 si saisie invalide, FIN_SAISIE si fin de saisie. */
static int lireEntier(const char *invite)
{
    char buf[64];
    char *fin;
    long v;

    if (!lireTexte(invite, buf, sizeof(buf)))
    {
        return FIN_SAISIE;
    }
    v = strtol(buf, &fin, 10);
    if (fin == buf || *fin != '\0')
    {
        return -1;
    }
    return (int)v;
}

/* Lit un réel, redemande tant que la saisie est invalide. */
static double lireDouble(const char *invite)
{
    char buf[64];
    char *fin;
    double v;

    while (lireTexte(invite, buf, sizeof(buf)))
    {
        v = strtod(buf, &fin);
        if (fin != buf && *fin == '\0')
        {
            return v;
        }
        printf("Valeur invalide, recommencez.\n");
    }
    return 0.0;
}

/* ---------- Affichage ---------- */

static void afficherEntete(void)
{
    printf("\n%-4s %-26s %-12s %9s %9s  %-11s %s\n",
           "N°", "Bâtiment", "Ressource", "Valeur", "Seuil", "Date", "Alerte");
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
    int i;

    if (nb == 0)
    {
        printf("Aucune mesure en mémoire.\n");
        return;
    }
    afficherEntete();
    for (i = 0; i < nb; i++)
    {
        afficherMesure(i, &mesures[i]);
    }
    printf("Total : %d mesure(s)\n", nb);
}

/* ---------- Actions du menu ---------- */

static void actionAjouter(Mesure **mesures, int *nb)
{
    char batiment[100], ressource[100], date[100];
    Mesure m;

    lireTexte("Bâtiment (ex: Bibliotheque) : ", batiment, sizeof(batiment));
    lireTexte("Ressource (electricite/eau/chauffage) : ", ressource, sizeof(ressource));
    m.valeur = lireDouble("Valeur : ");
    m.seuil = lireDouble("Seuil : ");
    lireTexte("Date (AAAA-MM-JJ) : ", date, sizeof(date));

    if (batiment[0] == '\0' || ressource[0] == '\0' || date[0] == '\0')
    {
        printf("Ajout annulé : champ vide.\n");
        return;
    }

    m.batiment = batiment;   /* ajouterMesure() fait sa propre copie */
    m.ressource = ressource;
    m.date = date;
    m.alerte = false;

    if (ajouterMesure(mesures, nb, &m))
    {
        printf("Mesure ajoutée (alerte : %s).\n",
               (*mesures)[*nb - 1].alerte ? "OUI" : "non");
    }
    else
    {
        printf("Erreur : ajout impossible.\n");
    }
}

static void actionRechercher(const Mesure *mesures, int nb)
{
    char batiment[100], ressource[100];
    int debut = 0, idx, trouve = 0;

    lireTexte("Bâtiment : ", batiment, sizeof(batiment));
    lireTexte("Ressource : ", ressource, sizeof(ressource));

    /* rechercherMesure() renvoie la 1re correspondance : on boucle pour toutes les trouver */
    while (debut < nb)
    {
        idx = rechercherMesure(mesures + debut, nb - debut, batiment, ressource);
        if (idx == -1)
        {
            break;
        }
        if (trouve == 0)
        {
            afficherEntete();
        }
        afficherMesure(debut + idx, &mesures[debut + idx]);
        trouve++;
        debut += idx + 1;
    }

    if (trouve == 0)
    {
        printf("Aucune mesure pour %s / %s.\n", batiment, ressource);
    }
    else
    {
        printf("%d résultat(s).\n", trouve);
    }
}

static void actionSupprimer(Mesure **mesures, int *nb)
{
    int indice;

    afficherToutes(*mesures, *nb);
    if (*nb == 0)
    {
        return;
    }
    indice = lireEntier("Numéro de la mesure à supprimer : ");
    if (supprimerMesure(mesures, nb, indice))
    {
        printf("Mesure %d supprimée. Il reste %d mesure(s).\n", indice, *nb);
    }
    else
    {
        printf("Numéro invalide.\n");
    }
}

/* Statistiques d'un bâtiment, ou de tous les bâtiments si la saisie est vide */
static void actionStatistiques(const Mesure *mesures, int nb)
{
    char batiment[100];
    int i, j, deja, n;
    double total, moyenne;

    lireTexte("Bâtiment (vide = tous) : ", batiment, sizeof(batiment));

    if (batiment[0] != '\0')
    {
        statistiquesBatiment(mesures, nb, batiment, &n, &total, &moyenne);
        return;
    }

    for (i = 0; i < nb; i++)
    {
        deja = 0;
        for (j = 0; j < i; j++)
        {
            if (strcmp(mesures[i].batiment, mesures[j].batiment) == 0)
            {
                deja = 1;
                break;
            }
        }
        if (!deja)
        {
            statistiquesBatiment(mesures, nb, mesures[i].batiment, &n, &total, &moyenne);
            printf("\n");
        }
    }
}

static void actionAnomalies(Mesure *mesures, int nb)
{
    int i, nbAlertes = 0;

    detecterToutesAnomalies(mesures, nb);
    for (i = 0; i < nb; i++)
    {
        if (mesures[i].alerte)
        {
            if (nbAlertes == 0)
            {
                afficherEntete();
            }
            afficherMesure(i, &mesures[i]);
            nbAlertes++;
        }
    }
    printf("%d anomalie(s) détectée(s) sur %d mesure(s).\n", nbAlertes, nb);
}

static void actionExporter(const Mesure *mesures, int nb, const char *fichier)
{
    if (exporterJSON(fichier, mesures, nb))
    {
        printf("Export réussi : %d mesure(s) écrites dans %s\n", nb, fichier);
    }
    else
    {
        printf("Erreur : export vers %s impossible.\n", fichier);
    }
}

static void afficherMenu(void)
{
    printf("\n========== ECOCAMPUS - Gestion des mesures ==========\n");
    printf(" 1. Afficher toutes les mesures\n");
    printf(" 2. Ajouter une mesure\n");
    printf(" 3. Rechercher (bâtiment + ressource)\n");
    printf(" 4. Supprimer une mesure\n");
    printf(" 5. Trier par valeur croissante\n");
    printf(" 6. Statistiques par bâtiment\n");
    printf(" 7. Détecter / afficher les anomalies\n");
    printf(" 8. Exporter vers JSON\n");
    printf(" 0. Quitter\n");
    printf("=====================================================\n");
}

/* ---------- Programme principal ---------- */

int main(int argc, char *argv[])
{
    const char *entree = (argc > 1) ? argv[1] : FICHIER_ENTREE;
    const char *sortie = (argc > 2) ? argv[2] : FICHIER_SORTIE;
    Mesure *mesures = NULL;
    int nb, choix;

    /* 1. Chargement + affichage de contrôle */
    nb = chargerMesures(entree, &mesures);
    if (nb < 0)
    {
        printf("Impossible de charger %s.\n", entree);
        return 1;
    }
    printf("%d mesure(s) chargée(s) depuis %s.\n", nb, entree);

    detecterToutesAnomalies(mesures, nb);
    afficherToutes(mesures, nb);

    /* 2. Menu */
    do
    {
        afficherMenu();
        choix = lireEntier("Votre choix : ");

        switch (choix)
        {
        case 1: afficherToutes(mesures, nb);              break;
        case 2: actionAjouter(&mesures, &nb);             break;
        case 3: actionRechercher(mesures, nb);            break;
        case 4: actionSupprimer(&mesures, &nb);           break;
        case 5:
            trierMesuresParValeur(mesures, nb);
            printf("Mesures triées par valeur croissante.\n");
            afficherToutes(mesures, nb);
            break;
        case 6: actionStatistiques(mesures, nb);          break;
        case 7: actionAnomalies(mesures, nb);             break;
        case 8: actionExporter(mesures, nb, sortie);      break;
        case 0: printf("Au revoir !\n");                  break;
        default: printf("Choix invalide.\n");             break;
        }
    } while (choix != 0 && choix != FIN_SAISIE);

    libererMesures(&mesures, nb);
    return 0;
}
