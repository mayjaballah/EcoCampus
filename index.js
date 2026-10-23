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

function remplirGraphiques() {
    // Bâtiments
    const sommetsB={};//objet vide 
    D.forEach(m => {
        sommetsB[m.batiment]=(sommetsB[m.batiment] || 0) + Number(m.valeur);
    });//ken sommetsB[m.batiment] indefind besh yekhou 0 w yzid l valeur mteaa l batiment
    const maxValB=Math.max(...Object.values(sommetsB), 1);
    //ken l tab vide yaatina 1

    getEl('#cb').innerHTML=Object.entries(sommetsB).map(([bat, val]) => `
        <div class="col">
            <span class="val-label">${arrondir(val)}</span>
            <i style="height: ${(val / maxValB) * 100}%;"></i>
        </div>`).join('');

    getEl('#nb').innerHTML = Object.keys(sommetsB).map(bat => <div>${bat}</div>).join('');

    // Ressources
    const sommetsR = {};
    D.forEach(m => {
        const name=m.ressource.charAt(0).toUpperCase() + m.ressource.slice(1);//awel harf f ressource yhoutou majus w yzidou l beki mteouu b slice(1)
        sommetsR[name]=(sommetsR[name] || 0)+Number(m.valeur);
    });
    const maxValR = Math.max(...Object.values(sommetsR), 1);

    getEl('#rb').innerHTML = Object.entries(sommetsR).map(([res, val]) => `
        <div class="row">
            <span class="res-name">${res}</span>
            <div class="track">
                <div class="fill" style="width: ${(val / maxValR) * 100}%;"></div>
            </div>
            <b class="res-val">${arrondir(val)}</b>
        </div>`).join('');
}

function calculerPageAlertes() {
    const totalConsom=D.reduce((acc, m) => acc + Number(m.valeur), 0);
    const anomalies=D.filter(m => m.alerte || m.valeur > m.seuil);

    if(getEl('#na2')) getEl('#na2').textContent=anomalies.length;
    if (getEl('#na3')) getEl('#na3').textContent = `sur ${D.length} mesures`;
    if(getEl('#tot2')) getEl('#tot2').textContent = arrondir(totalConsom);

    if(getEl('#al')) {
        getEl('#al').innerHTML=anomalies.map(m => {
            const pc=((m.valeur / m.seuil - 1) * 100).toFixed(1);
            return `
            <div class="card-alert-row">
                <div class="ex">!</div>
                <div class="alert-info">
                    <strong>${m.batiment} : ${m.ressource}</strong>
                    <small>${m.date} · valeur ${arrondir(m.valeur)} · seuil ${arrondir(m.seuil)}</small>
                </div>
                <span class="pct">+${pc}%</span>
            </div>`;
        }).join('');
    }
}
let isLoggedIn=false; // pour connaitre que l user est inscrit
//tlem w tnadhem navigation mtaa site
function gererRouter() {
    //besh nshoufou anehi l page li besh nemshoulha
    function route() {
        //location.h =>tjib ay haja maktouba #ayhaja
        //.slice(1) => tfassakh awel lettre (#)
        //ken l user moush aamel login awel page todhher hiya login
        let h=location.hash.slice(1) || (isLoggedIn ? 'dashboard' : 'login'); 
        //ken l user maamalsh login w yheb yemshi l paga okhra yraj3ou bessif ll login
        if (!isLoggedIn && h!=='login') {
            h='login';
            location.hash='#login';
        }
        //ken l page moush mawjouda yafichi dashbord wala login kenou moush connecté
        if (!document.getElementById(h)) h = isLoggedIn ? 'dashboard' : 'login';
        //si p.id hiya nafsha l h yzid l classe show ll page hedhika
        document.querySelectorAll('.page').forEach(p => p.classList.toggle('show', p.id===h));
    }
    //lors de changement de page (lktiba li baad #) naaytou ll fct rooter
    window.addEventListener('hashchange', route);
    //yaayet ll fct rooter meghir matbadel l page (expl ki taamel refresh) wala ki tabda awel marra
    route();
}

//gestion de form login w verif user name w l password 
document.addEventListener("DOMContentLoaded", ()=>{
    const formLog=getEl('#form-login');
    if (formLog) {
        formLog.onsubmit=(e)=>{
            e.preventDefault(); //yamnaa l rechargement de page
            const u=getEl('#login-user').value;
            const p=getEl('#login-pass').value;
            //test simple tnajem mbaad tbadlou bl bd wala l condition mteeek
            if (u==='admin' && p==='1234') {
                isLoggedIn=true;
                alert("Connexion réussite ! Bienvenue");
                location.hash='#dashboard'; //yhezna direct l dashboard
            }
            else{
                alert('Nom d utilisateur ou mot de passe incorrecte !');
            }
        };
    }
});

const root=document.documentElement;//yjib l html
getEl('#theme').onclick = () => {
    const current=root.dataset.theme;//recupere theme actuel
    root.dataset.theme=current==='dark' ? 'light' : 'dark';//nhoutou theme jdid f 
};

getEl('#btn-pdf').onclick = () => {
    window.print();//ouvre la fenetre d'impression
};

setTimeout(() => {
    const splash=getEl('#splash');
    if (splash) {
        splash.style.opacity = '0';//rendre la page transparente (tadrijian)
        setTimeout(() => splash.remove(), 500);//supprime la page apres 0.5s
        document.body.classList.remove('splashing');//supprime la class splashing 
    }
}, 1500);