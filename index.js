let D = []; //var global pour stocker les mesures
let S = { T: 0, n: 0 }; // [AJOUT] résumé : T = total des valeurs, n = nombre d'alertes (utilisé par les compteurs)
let seulementAlertes = false; // [AJOUT] true quand le bouton "Voir Alertes" est actif

// [AJOUT] Données par défaut dans une constante (utilisées si data.json est introuvable)
const DEFAUT = [
  { batiment: "Bibliothèque", ressource: "électricité", valeur: 152.4, seuil: 120, date: "2026-09-20", alerte: true },
  { batiment: "Bibliothèque", ressource: "eau", valeur: 35, seuil: 50, date: "2026-09-21", alerte: false },
  { batiment: "Résidence", ressource: "chauffage", valeur: 410.5, seuil: 400, date: "2026-09-20", alerte: true },
  { batiment: "Labo_info", ressource: "électricité", valeur: 98.2, seuil: 150, date: "2026-09-20", alerte: false }
];

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
            // [AJOUT] on force valeur et seuil en nombres (au cas où le JSON les donne en texte)
            D = data.map(m => ({ ...m, valeur: Number(m.valeur), seuil: Number(m.seuil) }));
            initApp();//lancer l'app
        })
        //si le fichier n'existe pas encore le code utilise des donnes par defaut
        //pour eviter le bloquage de site
        .catch(err => {
            console.warn(err);
            D = DEFAUT; // [MODIF] on utilise la constante DEFAUT définie en haut
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

// [AJOUT] une mesure est en alerte si elle est marquée "alerte" ou si sa valeur dépasse son seuil
const al = m => m.alerte || m.valeur > m.seuil;
// [AJOUT] pourcentage de dépassement du seuil (ex : valeur 150, seuil 100 => +50 %)
const pc = m => (m.valeur / m.seuil - 1) * 100;

// [AJOUT] fait monter un nombre de 0 jusqu'à nombre totale en 1,4 seconde (animation des compteurs)
function count(el, to, dec = 1) {                      // el = élément HTML, to = valeur finale, dec = nb de décimales
  const t0 = performance.now();                        // instant de départ de l'animation

  (function step(t) {                                  // fonction auto-appelée à chaque image
    const p = Math.min((t - t0) / 1400, 1);            // progression de 0 à 1 sur 1400 ms
    const e = 1 - Math.pow(1 - p, 4);                  // ralentissement à la fin (ease-out)
    el.textContent = (to * e).toFixed(dec);            // affiche la valeur intermédiaire
    if (p < 1) requestAnimationFrame(step);            // si pas fini, on continue à la prochaine image
  })(t0);                                              // premier appel
}

function calculerKPI() {
    const totalConsom=D.reduce((acc, m) => acc + Number(m.valeur), 0);
    const anomalies=D.filter(m => m.alerte || m.valeur > m.seuil);
    //new set pour eviter les redoublons 
    //tejbed liste fiha les nom des batiments
    //nhoutouh f tab
    const batimentsUniques=[...new Set(D.map(m => m.batiment))];

    S = { T: totalConsom, n: anomalies.length }; // [AJOUT] on mémorise le résumé pour les compteurs animés
    const mx = Math.max(...D.map(m => Math.max(m.valeur, m.seuil)), 1) * 1.1; // [AJOUT] échelle max des barres (+10 %)

    getEl('#tot').textContent=arrondir(totalConsom);
    getEl('#nal').textContent=anomalies.length;
    getEl('#nb-bat').textContent=batimentsUniques.length;

    // [AJOUT] titre de la période (ex : "du 20 au 21 septembre 2026")
    const dates = [...new Set(D.map(m => m.date))].sort(); //D.map(m => m.date)) : tjib kol les dates men les mesures / new Set(...) tna7i el redoublons (ken 3andek 3 mesures fi nafs el nhar, el date tطla3 marra wahda).
    const fmt = d => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); // t7awel date men 2026-09-20 l “20 septembre 2026” b el français (jour, mois en lettres, année).
    if (dates.length > 1) {                                // ken famma akther men date, ya3ni période
        getEl('#range').textContent = `Consommation du campus du ${new Date(dates[0]).getDate()} au ${fmt(dates[dates.length - 1])}`;//new Date(dates[0]).getDate() tاkhou el jour ta3 awel date bark (20).  / fmt(dates[dates.length - 1]) tاkhou akher date b format kamel (21 septembre 2026).
    } else if (dates.length === 1) {                       // une seule date
        getEl('#range').textContent = `Consommation du campus le ${fmt(dates[0])}`;
    }//Ken dates.length === 0 (ma famma 7ata mesure), ma ya3mel chay w el titre yبقa kif ma houwa fil HTML

    // [AJOUT] mini courbe (sparkline) de la carte "Moyenne"
    const pas = D.length > 1 ? 280 / (D.length - 1) : 0;   // écart horizontal entre 2 points
    const pts = D.map((m, i) => [i * pas, 70 - (m.valeur / mx) * 60]); // coordonnées [x, y] de chaque point
    getEl('#sp').setAttribute("d", "M" + pts.map(p => p.join(",")).join(" L")); // tracé SVG "M x,y L x,y ..."

    //affichage valeur vs seuil
    //.map mesh thawel kol mesure f tab l ligne html
    // [MODIF] la barre (.fill, largeur en data-w) + le trait vertical du seuil (.tick) remplacent l'ancien texte "valeur / seuil"
    //<div class="track">: el piste (el fond/rail) elli fiha el barre. Houwa el 100% ta3 el largeur.
    //al(m) ? "bad" : "": ken el mesure fi alerte (valeur > seuil wala alerte: true), tزid class bad (el CSS ylawenha bl a7mar). Sinon ma tzid chay.
    //valeur / mx * 100.: mx houwa a9sa 9ima (valeur wala seuil) + 10%, donc el barre ma tوsel abadan l 100% w yab9a fama blasa.
    getEl('#bars').innerHTML = D.map(m => `
        <div class="row">
            <span>${m.batiment} . ${m.ressource}</span>
            <div class="track"> 
                <div class="fill ${al(m) ? "bad" : ""}" data-w="${m.valeur / mx * 100}"></div>
                <i class="tick" style="left:${m.seuil / mx * 100}%"></i>
            </div>
            <b>${arrondir(m.valeur)}</b>
        </div>`).join('');//concatini tous les lignes dans un seul bloc 

        //affcihage anomalies
    // [MODIF] style dans le CSS  + ajout du pourcentage
    getEl('#anos').innerHTML=anomalies.length ? anomalies.map(m => `
        <div class="an">
            <div class="ex">!</div>
            <div>
                <strong>${m.batiment} . ${m.ressource}</strong>
                <small>${arrondir(m.valeur)} / ${arrondir(m.seuil)}</small>
            </div>
            <span class="pct">+${arrondir(pc(m))}%</span>
        </div>`).join('') : `<p class="empty">Aucune anomalie détectée ✅</p>`;
}

function remplirTableau(donnees) {
    // [MODIF] (m, i) : i sert à décaler l'animation d'apparition de chaque ligne
    getEl('#tb').innerHTML=donnees.map((m, i) => `
        <tr style="animation:up .5s ${i * .07}s both">
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
    const dates=[...new Set(D.map(m => m.date))]; // [AJOUT] liste des dates pour le filtre "Période"

    // [CORRECTION] backticks ` ` au lieu de ' ' sinon ${b} ne se remplace pas
    getEl('#fb').innerHTML='<option value="">Tous les bâtiments</option>' + batiments.map(b => `<option value="${b}">${b}</option>`).join('');
    getEl('#fr').innerHTML='<option value="">Toutes les ressources</option>' + ressources.map(r => `<option value="${r}">${r}</option>`).join('');
    getEl('#fp').innerHTML='<option value="">Période</option>' + dates.map(d => `<option value="${d}">${d}</option>`).join(''); // [AJOUT]

    getEl('#fb').onchange=filtrer;
    getEl('#fr').onchange=filtrer;
    getEl('#fp').onchange=filtrer; // [AJOUT] filtre par période
    getEl('#fs').oninput=filtrer;
    
    // [MODIF] le bouton active / désactive le filtre (toggle) et se combine avec les autres filtres
    getEl('#btn-filter-alert').onclick = e => {
        seulementAlertes = !seulementAlertes;                        // on inverse l'état
        e.currentTarget.classList.toggle("on", seulementAlertes);    // style "actif" du bouton
        filtrer();                                                   // on réapplique tous les filtres
    }; 
}

function filtrer() {
    const b=getEl('#fb').value;
    const r=getEl('#fr').value;
    const p=getEl('#fp').value; // [AJOUT] période (date) choisie
    const q=getEl('#fs').value.toLowerCase(); //eviter les problemes des majuscules et miniscules

    const resultat=D.filter(m => 
        (!b || m.batiment === b) &&
        (!r || m.ressource === r) &&
        (!p || m.date === p) && // [AJOUT] filtre par date
        (!seulementAlertes || al(m)) && // [AJOUT] si "Voir Alertes" est actif, seulement les alertes
        (m.batiment + " " + m.ressource).toLowerCase().includes(q) // [MODIF] la recherche porte sur bâtiment ET ressource
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

    // [MODIF] data-h (au lieu de style height) : la hauteur est animée par route()
    getEl('#cb').innerHTML=Object.entries(sommetsB).map(([bat, val]) => `
        <div class="col">
            <span class="val-label">${arrondir(val)}</span>
            <i data-h="${(val / maxValB) * 100}%"></i>
        </div>`).join('');

    getEl('#nb').innerHTML = Object.keys(sommetsB).map(bat => `<div>${bat}</div>`).join('');

    // Ressources
    const sommetsR = {};
    D.forEach(m => {
        const name=m.ressource.charAt(0).toUpperCase() + m.ressource.slice(1);//awel harf f ressource yhoutou majus w yzidou l beki mteouu b slice(1)
        sommetsR[name]=(sommetsR[name] || 0)+Number(m.valeur);
    });
    const maxValR = Math.max(...Object.values(sommetsR), 1);

    // [MODIF] data-w (au lieu de style width) : la largeur est animée par route()
    getEl('#rb').innerHTML = Object.entries(sommetsR).map(([res, val]) => `
        <div class="row">
            <span class="res-name">${res}</span>
            <div class="track">
                <div class="fill" data-w="${(val / maxValR) * 100}"></div>
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
            // [MODIF] carte arrondie "card an" (même rendu que le 2e fichier)
            return `
            <div class="card an" style="border-radius:36px;padding:22px 28px">
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

// [AJOUT] éléments de la navigation (le fond vert "pill" et les liens)
const pill  = getEl('#pill');                                   // le fond vert qui glisse derrière le lien actif
const links = [...document.querySelectorAll('nav a')];         // tous les liens de la nav

// [AJOUT] place le fond vert derrière le lien actif
function placerPill() {
    const a = links.find(l => l.classList.contains('on'));      // le lien actif
    if (a) {                                                    // s'il existe
        pill.style.opacity = 1;                                 // on montre le fond
        pill.style.left  = a.offsetLeft + 'px';                 // même position que le lien
        pill.style.width = a.offsetWidth + 'px';                // même largeur que le lien
    } else {                                                    // sinon
        pill.style.opacity = 0;                                 // on le cache
    }
}

//besh nshoufou anehi l page li besh nemshoulha
// [MODIF] route() est sortie de gererRouter pour que le splash puisse l'appeler aussi
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
    if (!document.querySelector('.page#' + h)) h = isLoggedIn ? 'dashboard' : 'login'; // [MODIF] on cherche précisément une .page
    document.body.classList.toggle('cover', h === 'login'); // [AJOUT] page login = mode "cover" (sans nav ni logo)
    //si p.id hiya nafsha l h yzid l classe show ll page hedhika
    document.querySelectorAll('.page').forEach(p => p.classList.toggle('show', p.id===h));

    // [AJOUT] lien actif dans la nav + déplacement du fond vert
    links.forEach(l => l.classList.toggle('on', l.hash === '#' + h));
    placerPill();

    scrollTo({ top: 0, behavior: 'smooth' });                   // [AJOUT] remonte en haut en douceur

    // [AJOUT] relance les animations des barres et colonnes de la page affichée
    const pg = getEl('#' + h);                                  // la page affichée
    pg.querySelectorAll('.fill').forEach(e => {                 // pour chaque barre
        e.style.width = 0;                                      // on la remet à 0
        setTimeout(() => e.style.width = e.dataset.w + '%', 150); // puis largeur réelle après 150 ms
    });
    pg.querySelectorAll('.col i').forEach(e => {                // pour chaque colonne
        e.style.height = 0;                                     // on la remet à 0
        setTimeout(() => e.style.height = e.dataset.h, 150);    // puis hauteur réelle après 150 ms
    });

    // [AJOUT] compteurs animés du dashboard
    if (h === 'dashboard') {
        count(getEl('#tot'), S.T);                              // total
        count(getEl('#avg'), D.length ? S.T / D.length : 0);    // moyenne
        count(getEl('#nal'), S.n, 0);                           // nombre d'alertes

        const p = getEl('#sp');                                 // relance le tracé de la courbe
        p.style.animation = 'none';                             // coupe l'animation
        p.getBoundingClientRect();                              // force le recalcul du navigateur
        p.style.animation = '';                                 // l'animation repart de zéro
    }

    // [AJOUT] compteurs animés de la page Alertes
    if (h === 'alertes') {
        count(getEl('#tot2'), S.T);
        count(getEl('#na2'), S.n, 0);
    }
}

//tlem w tnadhem navigation mtaa site
function gererRouter() {
    //lors de changement de page (lktiba li baad #) naaytou ll fct rooter
    window.addEventListener('hashchange', route);
    window.addEventListener('resize', placerPill);              // [AJOUT] replace le fond vert quand la fenêtre change de taille
    document.fonts && document.fonts.ready.then(placerPill);    // [AJOUT] replace le fond vert quand les polices sont chargées
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
                getEl('#login-msg').textContent=""; // [MODIF] on efface le message d'erreur (à la place de alert("Connexion réussite..."))
                location.hash='#dashboard'; //yhezna direct l dashboard
            }
            else{
                getEl('#login-msg').textContent="Nom d’utilisateur ou mot de passe incorrect !"; // [MODIF] message dans la page (à la place de alert)
            }
        };
    }
});

const root=document.documentElement;//yjib l html

// [AJOUT] icônes SVG : soleil (affiché en mode sombre) et lune (affichée en mode clair)
const sun  = '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>';
const moon = '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>';

// [AJOUT] applique le thème, change l'icône et le sauvegarde dans le navigateur
function setTheme(t) {                                          // t = "dark" ou "light"
    root.dataset.theme = t;                                     // data-theme sur <html> (utilisé par le CSS)
    t === 'dark' ? root.setAttribute('data-dark', '') : root.removeAttribute('data-dark'); // ajoute/retire data-dark
    getEl('#ic').innerHTML = t === 'dark' ? sun : moon;         // soleil en sombre, lune en clair
    try { localStorage.setItem('eco-theme', t); } catch (e) {}  // sauvegarde (try/catch si stockage bloqué)
}

// [AJOUT] thème sauvegardé, sinon celui du système
let saved = null;
try { saved = localStorage.getItem('eco-theme'); } catch (e) {}
setTheme(saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

getEl('#theme').onclick = () => {
    const current=root.dataset.theme;//recupere theme actuel
    setTheme(current==='dark' ? 'light' : 'dark');//[MODIF] setTheme change le thème + icône + sauvegarde
};

getEl('#btn-pdf').onclick = () => {
    window.print();//ouvre la fenetre d'impression
};

// [MODIF] splash : fondu à 3,5 s (classe "out"), puis suppression à 4 s + relance de route()
const splash = getEl('#splash');
setTimeout(() => splash.classList.add('out'), 3500);            // après 3,5 s : fondu CSS
setTimeout(() => {                                              // après 4 s :
    splash.remove();                                            // on supprime le splash
    document.body.classList.remove('splashing');//supprime la class splashing 
    route();                                                    // relance les animations de la page affichée
}, 4000);