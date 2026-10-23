let D = []; //var global pour stocker les mesures
//on va recuperer les messures de data lors de chargement de page
document.addEventListener("DOMContentLoaded", () => {
    fetch('data.json')
        //baad me tjib les mesures aaamel ...
        //res hiya l rep brute li tjini ml data + ythabet fiha mrigla walee
        .then(res => { 
            if (!res.ok) throw new Error("Fichier introuvable");
            return res.json();//transforme ces mesures hawelhom ll js(tab ou objet)
        })
        //sayee data walet prete
        .then(data => {
            D = data;
            initApp();//lancer l'app
        })
        //si le fichier n'existe pas encore le code utilise des donnes par defaut
        //pour eviter le bloquage de site
        .catch(err => {
            console.warn(err);
            D = [
              { batiment: "Bibliothèque", ressource: "électricité", valeur: 152.4, seuil: 120, date: "2026-09-20", alerte: true },
              { batiment: "Bibliothèque", ressource: "eau", valeur: 35, seuil: 50, date: "2026-09-21", alerte: false },
              { batiment: "Résidence", ressource: "chauffage", valeur: 410.5, seuil: 400, date: "2026-09-20", alerte: true },
              { batiment: "Labo_info", ressource: "électricité", valeur: 98.2, seuil: 150, date: "2026-09-20", alerte: false }
            ];
            initApp();
        });
});

function initApp() {
    calculerKPI();
    remplirTableau(D);
    remplirFiltres();
    remplirGraphiques();
    calculerPageAlertes();
    gererRouter();
}
//fct getEl tlawej aala les element fl html 
const getEl = s => document.querySelector(s);
//fct arrondir besh tnadhef les nbre w tkhali ken un chiffre baad virgule
const arrondir = n => Number(n).toFixed(1);

function calculerKPI() {
    const totalConsom=D.reduce((acc, m) => acc + Number(m.valeur), 0);
    const anomalies=D.filter(m => m.alerte || m.valeur > m.seuil);
    //new set pour eviter les redoublons 
    //tejbed liste fiha les nom des batiments
    //nhoutouh f tab
    const batimentsUniques=[...new Set(D.map(m => m.batiment))];

    getEl('#tot').textContent=arrondir(totalConsom);
    getEl('#nal').textContent=anomalies.length;
    getEl('#nb-bat').textContent=batimentsUniques.length;

    //affichage valeur vs seuil
    //.map mesh thawel kol mesure f tab l ligne html

    getEl('#bars').innerHTML = D.map(m => `
        <div class="row" style="display:flex; justify-content:space-between; margin:10px 0;">
            <span>${m.batiment} . ${m.ressource}</span>
            <b>${arrondir(m.valeur)} / ${m.seuil}</b>
        </div>`).join('');//concatini tous les lignes dans un seul bloc 

        //affcihage anomalies
    getEl('#anos').innerHTML=anomalies.length ? anomalies.map(m => `
        <div class="an" style="background:#ffe9e4; padding:12px; border-radius:14px; margin-bottom:8px; border:1px solid #707070;">
            <strong style="color:#a8321f;">⚠️ ${m.batiment} - ${m.ressource}</strong>
            <small style="color:#707e74;">Valeur : ${m.valeur} (Seuil : ${m.seuil})</small>
        </div>`).join('') : "<p>Aucune anomalie détectée ✅</p>";
}

function remplirTableau(donnees) {
    getEl('#tb').innerHTML=donnees.map(m => `
        <tr>
            <td>${m.batiment}</td>
            <td>${m.ressource}</td>
            <td>${arrondir(m.valeur)}</td>
            <td>${m.seuil}</td>
            <td>${m.date}</td>
            <td><span class="pill ${m.alerte || m.valeur > m.seuil ? 'a' : ''}">${m.alerte || m.valeur > m.seuil ? 'Alerte' : 'Ok'}</span></td>
        </tr>`).join('');
}

function remplirFiltres() {
    const batiments=[...new Set(D.map(m => m.batiment))];
    const ressources=[...new Set(D.map(m => m.ressource))];

    getEl('#fb').innerHTML='<option value="">Tous les bâtiments</option>' + batiments.map(b => `<option value="${b}">${b}</option>`).join('');
    getEl('#fr').innerHTML='<option value="">Toutes les ressources</option>' + ressources.map(r => `<option value="${r}">${r}</option>`).join('');

    getEl('#fb').onchange=filtrer;
    getEl('#fr').onchange=filtrer;
    getEl('#fs').oninput=filtrer;
    
    getEl('#btn-filter-alert').onclick = () => {
        const filtered=D.filter(m => m.alerte || m.valeur > m.seuil);
        remplirTableau(filtered);
    }; 
}

function filtrer() {
    const b=getEl('#fb').value;
    const r=getEl('#fr').value;
    const q=getEl('#fs').value.toLowerCase(); //eviter les problemes des majuscules et miniscules

    const resultat=D.filter(m => 
        (!b || m.batiment === b) &&
        (!r || m.ressource === r) &&
        (!q || m.batiment.toLowerCase().includes(q)) //verifier si le nom de batiment contient ce texte
    );
    remplirTableau(resultat);
}

