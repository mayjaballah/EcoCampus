let D = []; //var global pour stocker les mesures
let graphJour = null; //instance Chart.js du graphique par jour
let S = { T: 0, n: 0 }; //T = total des valeurs, n = nombre d'alertes 
let seulementAlertes = false; //true si le bouton "Voir Alertes" actif (toggle on/off)

const DEFAUT = [
  { batiment: "Bibliothèque", ressource: "électricité", valeur: 152.4, seuil: 120, date: "2026-09-20", alerte: true },
  { batiment: "Bibliothèque", ressource: "eau", valeur: 35, seuil: 50, date: "2026-09-21", alerte: false },
  { batiment: "Résidence", ressource: "chauffage", valeur: 410.5, seuil: 400, date: "2026-09-20", alerte: true },
  { batiment: "Labo_info", ressource: "électricité", valeur: 98.2, seuil: 150, date: "2026-09-20", alerte: false }
];

// ---------- Un seul nom par bâtiment (sans doublons accent / sans accent) ----------
// Même bâtiment sous deux noms : clé écrite ici -> clé à conserver
const ALIAS_BAT = { salle_tp_chimie: 'salle_de_chimie' };

const cleBat = b => String(b).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[\s_]+/g, '_');

function unifierBatiments(data) {
    const canon = {};
    data.forEach(m => {
        let k = cleBat(m.batiment);
        k = ALIAS_BAT[k] || k;
        const nom = String(m.batiment);
        // on garde de préférence la version avec accents
        if (!canon[k] || (!/[À-ÿ]/.test(canon[k]) && /[À-ÿ]/.test(nom))) canon[k] = nom;
    });
    data.forEach(m => {
        const k = cleBat(m.batiment);
        m.batiment = canon[ALIAS_BAT[k] || k];
    });
    return data;
}

//on va recuperer les mesures de data lors de chargement de page
document.addEventListener("DOMContentLoaded", () => {
    fetch('data.json', { cache: 'no-store' })
        .then(res => {
            if (!res.ok) throw new Error("Fichier introuvable");
            return res.json();
        })
        .then(data => {
            D = unifierBatiments(data.map((m, i) => ({ ...m, _i: i, valeur: Number(m.valeur), seuil: Number(m.seuil) })));
            initApp();
        })
        
        .catch(err => {
            console.warn("erreur de lire data.json, utilisation des données par défaut :", err);
            D = DEFAUT;
            initApp();
        });
});

function initApp() {
    calculerKPI();
    remplirTableau(D);
    remplirFiltres();
    remplirGraphiques();
    initGraphJour();
    calculerPageAlertes();
    calculerClassement();
    gererRouter();
}

const getEl = s => document.querySelector(s);

const arrondir = n => Number(n).toFixed(1);

// ---------- Affichage en français (sans "_", avec accents et articles) ----------
const MOTS_ACCENTS = { Bibliotheque: 'Bibliothèque', Amphitheatre: 'Amphithéâtre', Residence: 'Résidence', Etudiants: 'Étudiants', Etudiant: 'Étudiant' };
const RESSOURCES_FR = {
    electricite: { nom: 'électricité', art: 'l’' },
    eau:         { nom: 'eau',         art: 'l’' },
    chauffage:   { nom: 'chauffage',   art: 'le ' },
    gaze:        { nom: 'gaz',         art: 'le ' }
};
const maj = s => s.charAt(0).toUpperCase() + s.slice(1);

// « Salle_TP_Informatique » -> « Salle TP Informatique »
const joli = b => String(b).replace(/_/g, ' ').replace(/[A-Za-z]+/g, w => MOTS_ACCENTS[w] || w);
// nom de ressource seul : « électricité »
const resNom = r => (RESSOURCES_FR[r] ? RESSOURCES_FR[r].nom : String(r));
// avec article : « l’électricité » / « L’électricité »
const resArt = (r, majuscule = false) => {
    const d = RESSOURCES_FR[r];
    const t = d ? d.art + d.nom : 'la ressource ' + r;
    return majuscule ? maj(t) : t;
};
// « de » ou « d’ » selon la première lettre
const de = nom => /^[aeiouyàâéèêîôûh]/i.test(nom) ? 'd’' : 'de ';
// phrase complète : « L’électricité de Salle TP Informatique »
const phraseMesure = m => `${resArt(m.ressource, true)} ${de(joli(m.batiment))}${joli(m.batiment)}`;

//une mesure est en alerte si elle est marquee "alerte" ou si valeur > seuil
const al = m => m.alerte || m.valeur > m.seuil;
//pourcentage de depassement du seuil (ex: 152.4 vs 120 => +27%)
const pc = m => (m.valeur / m.seuil - 1) * 100;

//animation des compteurs
function count(el, to, dec = 1) {
    if (!el) return;
    const t0 = performance.now();
    (function step(t) {
        const p = Math.min((t - t0) / 1400, 1);
        const e = 1 - Math.pow(1 - p, 4);
        el.textContent = (to * e).toFixed(dec);
        if (p < 1) requestAnimationFrame(step);
    })(t0);
}

function calculerKPI() {
    const totalConsom = D.reduce((acc, m) => acc + Number(m.valeur), 0);
    const anomalies = D.filter(m => al(m));
    const batimentsUniques = [...new Set(D.map(m => m.batiment))];

    S = { T: totalConsom, n: anomalies.length };
    remplirResumeRessources();
    const mx = Math.max(...D.map(m => Math.max(m.valeur, m.seuil)), 1) * 1.1;

    if (getEl('#tot')) getEl('#tot').textContent = arrondir(totalConsom);
    if (getEl('#nal')) getEl('#nal').textContent = anomalies.length;
    if (getEl('#nb-bat')) getEl('#nb-bat').textContent = batimentsUniques.length;

    //titre de la periode dynamique
    const dates = [...new Set(D.map(m => m.date))].sort();
    const fmt = d => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    if (getEl('#range')) {
        if (dates.length > 1) {
            //plusieurs dates
            getEl('#range').textContent = `Consommation du campus du ${new Date(dates[0]).getDate()} au ${fmt(dates[dates.length - 1])}`;
        } else if (dates.length === 1) {
            getEl('#range').textContent = `Consommation du campus le ${fmt(dates[0])}`;
        }
    }
    //mini courbe (sparkline)
    const sp = getEl('#sp');
    if (sp && D.length > 0) {
        const pas = D.length > 1 ? 280 / (D.length - 1) : 0; //distance horizontale entre chaque point
        // 70 - ... car, en SVG, l'axe y commence en haut (0 = haut) ; il faut donc inverser la valeur.
        const pts = D.map((m, i) => [i * pas, 70 - (m.valeur / mx) * 60]);
        sp.setAttribute("d", "M" + pts.map(p => p.join(",")).join(" L")); //M = depart, L = ligne vers le point suivant
    }

    //affichage valeur vs seuil
    //data-w = largeur finale de la barre
    getEl('#bars').innerHTML = D.map(m => `
        <div class="row" style="display:flex; flex-direction:column; margin:10px 0;">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span>${phraseMesure(m)}</span>
                <b>${arrondir(m.valeur)} / ${m.seuil}</b>
            </div>
            <div class="track" style="position:relative; height:10px; background:#e3ede0; border-radius:10px; overflow:hidden;">
                <div class="fill ${al(m) ? "bad" : ""}" data-w="${(m.valeur / mx) * 100}" style="height:100%; width:0; background:var(--acc);"></div>
                <i class="tick" style="position:absolute; top:0; bottom:0; width:2px; background:#12372a; left:${(m.seuil / mx) * 100}%"></i>
            </div>
        </div>`).join('');

    //affichage anomalies
    const anosEl = getEl('#anos');
    if (anosEl) {
        anosEl.innerHTML = anomalies.length ? anomalies.map(m => `
            <div class="an">
                <div class="ex">!</div>
                <div>
                    <strong>${phraseMesure(m)}</strong>
                    <small >${arrondir(m.valeur)} / ${arrondir(m.seuil)}</small>
                    ${btnExpliquer(m)}
                </div>
                <span class="pct">+${arrondir(pc(m))}%</span>
            </div>`).join('') : `<p class="empty">Aucune anomalie détectée ✅</p>`;
    }
}

function remplirResumeRessources() {
    const couleurs = {
        electricite: '#9bc53d',
        gaz: '#f58231',
        eau: '#00a8cc',
        chauffage: '#e8604c'
    };
    const ressources = new Map();

    D.forEach(m => {
        const cle = String(m.ressource ?? '').trim().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const nomCle = cle === 'gaze' ? 'gaz' : cle;
        const donnee = ressources.get(nomCle) || {
            nom: m.ressource,
            total: 0,
            mesures: 0,
            alertes: 0
        };
        donnee.total += Number(m.valeur);
        donnee.mesures++;
        if (al(m)) donnee.alertes++;
        ressources.set(nomCle, donnee);
    });

    const entrees = [...ressources.entries()];
    const maxTotal = Math.max(...entrees.map(([, donnee]) => donnee.total), 1);
    const nomSecurise = nom => echapperHTML(maj(resNom(nom)));

    const totaux = getEl('#tot-ressources-list');
    if (totaux) {
        totaux.innerHTML = entrees.length ? entrees.map(([cle, donnee]) => {
            const pct = (donnee.total / maxTotal) * 100;
            const couleur = couleurs[cle] || '#9bc53d';
            return `
                <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#fff;">
                    <span style="display:flex;align-items:center;gap:6px;width:85px;">
                        <i style="width:8px;height:8px;border-radius:50%;background:${couleur};display:inline-block;"></i>
                        ${nomSecurise(donnee.nom)}
                    </span>
                    <div style="flex-grow:1;height:6px;background:rgba(255,255,255,.15);border-radius:3px;margin:0 10px;overflow:hidden;">
                        <div style="width:${pct}%;height:100%;background:${couleur};border-radius:3px;"></div>
                    </div>
                    <b style="font-weight:600;">${arrondir(donnee.total)}</b>
                </div>`;
        }).join('') : '<p>Aucune mesure disponible</p>';
    }

    const moyennes = getEl('#avg-ressources-list');
    if (moyennes) {
        const elements = entrees.map(([cle, donnee]) => {
            const couleur = couleurs[cle] || '#12372a';
            return `
                <div>
                    <div style="font-size:13px;color:var(--mut);display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                        <i style="width:8px;height:8px;border-radius:50%;background:${couleur};display:inline-block;"></i>
                        ${nomSecurise(donnee.nom)}
                    </div>
                    <div style="font-size:32px;font-weight:700;color:var(--ink);line-height:1;">${arrondir(donnee.total / donnee.mesures)}</div>
                    <div style="font-size:12px;color:var(--mut);margin-top:4px;">${donnee.mesures} mesure${donnee.mesures > 1 ? 's' : ''}</div>
                </div>`;
        }).join('');
        const courbe = `
            <svg viewBox="0 0 300 40" style="width:100%;height:50px;overflow:visible;" aria-hidden="true">
                <path d="M 0 30 Q 75 5 150 25 T 300 10" fill="none" stroke="#2f8a5e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
            </svg>`;
        const liste = elements.length
            ? `<div style="display:flex;justify-content:space-around;gap:16px;flex-wrap:wrap;margin-bottom:20px;">${elements}</div>${courbe}`
            : '<p>Aucune mesure disponible</p>';
        moyennes.innerHTML = liste;
    }

    const htmlAlertes = entrees.length ? entrees.map(([cle, donnee]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--badink);">
            <span>${nomSecurise(donnee.nom)}</span>
            <b style="font-weight:700;">${donnee.alertes}</b>
        </div>`).join('') : '<p>Aucune mesure disponible</p>';
    //même liste dans le dashboard et dans l'onglet Alertes
    ['#alert-ressources-list', '#alert-ressources-list-2'].forEach(sel => {
        const zone = getEl(sel);
        if (zone) zone.innerHTML = htmlAlertes;
    });
}

const echapperHTML = valeur => String(valeur).replace(/[&<>"']/g, caractere => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}[caractere]));

function remplirTableau(donnees) {
    //animation:up .5s ${i*0.07}s => chaque ligne s'affiche avec un retard (effet cascade)
    getEl('#tb').innerHTML = donnees.map((m, i) => `
        <tr style="animation:up .5s ${i * 0.07}s both">
            <td>${joli(m.batiment)}</td>
            <td>${maj(resNom(m.ressource))}</td>
            <td>${arrondir(m.valeur)}</td>
            <td>${m.seuil}</td>
            <td>${m.date}</td>
            <td><span class="pill ${al(m) ? 'a' : ''}">${al(m) ? 'Alerte' : 'Ok'}</span></td>
            <td>${tendanceHtml(m)}</td>
            ${window.userIsLoggedIn ? (m._i !== undefined
                ? `<td><button type="button" class="btn-suppr" data-i="${m._i}" title="Supprimer cette mesure"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6"/></svg>Supprimer</button></td>`
                : '<td></td>') : ''}
        </tr>`).join('');
}

function remplirFiltres() {
    const batiments = [...new Set(D.map(m => m.batiment))];
    const ressources = [...new Set(D.map(m => m.ressource))];
    const dates = [...new Set(D.map(m => m.date))];

    getEl('#fb').innerHTML = '<option value="">Tous les bâtiments</option>' + batiments.map(b => `<option value="${b}">${joli(b)}</option>`).join('');
    getEl('#fr').innerHTML = '<option value="">Toutes les ressources</option>' + ressources.map(r => `<option value="${r}">${maj(resNom(r))}</option>`).join('');

    // Filtre de période (facultatif : uniquement si #fp est présent dans le HTML).
    const fp = getEl('#fp');
    if (fp) {
        fp.innerHTML = '<option value="">Période</option>' + dates.map(d => `<option value="${d}">${d}</option>`).join('');
        fp.onchange = filtrer;
    }

    getEl('#fb').onchange = filtrer;
    getEl('#fr').onchange = filtrer;
    getEl('#fs').oninput = filtrer;
    const ft = getEl('#ft');
    if (ft) ft.onchange = filtrer;
    const btnAlert = getEl('#btn-filter-alert');
    if (btnAlert) {
        btnAlert.onclick = e => {
            seulementAlertes = !seulementAlertes; 
            e.currentTarget.classList.toggle("on", seulementAlertes); //classe "on" au style
            filtrer();
        };
    }
}

function filtrer() {
    const b = getEl('#fb').value;
    const r = getEl('#fr').value;
    const fp = getEl('#fp');
    const p = fp ? fp.value : '';
    const q = getEl('#fs').value.toLowerCase();
    const resultat = D.filter(m =>
        (!b || m.batiment === b) &&
        (!r || m.ressource === r) &&
        (!p || m.date === p) &&
        (!seulementAlertes || al(m)) &&
        (!q || (joli(m.batiment) + " " + resNom(m.ressource) + " " + m.ressource).toLowerCase().includes(q)) //recherche f batiment + ressource
    );
    // Tri par valeur (comme le menu du module C) ; resultat est une copie, D garde son ordre
    const ft = getEl('#ft');
    const ordre = ft ? ft.value : '';
    if (ordre) resultat.sort((x, y) => ordre === 'asc' ? x.valeur - y.valeur : y.valeur - x.valeur);
    remplirTableau(resultat);
}

function remplirGraphiques() {
    const couleurs = {
        gaz: '#facc15',
        electricite: '#a3e635',
        eau: '#38bdf8',
        chauffage: '#fb923c'
    };
    const ordre = ['chauffage', 'eau', 'electricite', 'gaz'];
    const parBatiment = new Map();
    const sommetsR = new Map();

    D.forEach(m => {
        const nomRessource = String(m.ressource ?? '').trim();
        const cleRessource = nomRessource.toLowerCase().normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        const batiment = String(m.batiment ?? '').trim();
        const valeur = Number(m.valeur);
        if (!nomRessource || !Number.isFinite(valeur)) return;

        const cle = cleRessource === 'gaze' ? 'gaz' : cleRessource;
        const nomAffiche = maj(resNom(nomRessource));
        const sommet = sommetsR.get(cle) || { nom: nomAffiche, total: 0 };
        sommet.total += valeur;
        sommetsR.set(cle, sommet);

        if (!batiment) return;
        const donneesBatiment = parBatiment.get(batiment) || { total: 0, ressources: new Map() };
        donneesBatiment.total += valeur;
        donneesBatiment.ressources.set(
            cle,
            (donneesBatiment.ressources.get(cle) || 0) + valeur
        );
        parBatiment.set(batiment, donneesBatiment);
    });

    const maxValR = Math.max(...[...sommetsR.values()].map(({ total }) => total), 1);

    const graphiqueRessources = getEl('#rb');
    if (graphiqueRessources) graphiqueRessources.innerHTML = [...sommetsR.values()].map(({ nom, total }) => `
        <div class="row">
            <span class="res-name">${echapperHTML(nom)}</span>
            <div class="track">
                <div class="fill" data-w="${(total / maxValR) * 100}"></div>
            </div>
            <b class="res-val">${arrondir(total)}</b>
        </div>`).join('');

    const graphiqueBatiments = getEl('#cb');
    const nomsBatiments = getEl('#nb');
    if (!graphiqueBatiments || !nomsBatiments) return;

    const batiments = [...parBatiment.entries()];
    const maxTotalBatiment = Math.max(...batiments.map(([, donnee]) => donnee.total), 1);
    graphiqueBatiments.innerHTML = batiments.map(([batiment, donnee]) => {
        const hauteur = (donnee.total / maxTotalBatiment) * 100;
        const segments = [...donnee.ressources.entries()]
            .sort(([a], [b]) => {
                const rangA = ordre.indexOf(a);
                const rangB = ordre.indexOf(b);
                return (rangA === -1 ? ordre.length : rangA) - (rangB === -1 ? ordre.length : rangB);
            })
            .map(([ressource, valeur]) => {
                const nomRessource = ressource === 'gaz' ? 'Gaz'
                    : ressource === 'electricite' ? 'Électricité'
                    : maj(resNom(ressource));
                const libelle = `${nomRessource} : ${arrondir(valeur)}`;
                const hauteurSegment = donnee.total > 0 ? (valeur / donnee.total) * 100 : 0;
                return `<div class="bar-segment" style="height:${hauteurSegment}%;background:${couleurs[ressource] || '#a3e635'};width:100%;" data-tooltip="${echapperHTML(libelle)}"></div>`;
            }).join('');

        return `
            <div class="col" style="position:relative;overflow:visible;">
                <i data-h="${hauteur}%" style="display:flex;flex-direction:column-reverse;overflow:visible;border-radius:8px 8px 0 0;background:transparent;height:${hauteur}%;position:relative;">
                    ${segments}
                </i>
            </div>`;
    }).join('');
    nomsBatiments.innerHTML = batiments.map(([batiment]) =>
        `<div title="${echapperHTML(joli(batiment))}">${echapperHTML(joli(batiment))}</div>`
    ).join('');

    const axe = getEl('#cb-axis');
    if (axe) {
        axe.innerHTML = Array.from({ length: 5 }, (_, i) => {
            const valeur = maxTotalBatiment * i / 4;
            return `<span>${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(valeur)}</span>`;
        }).join('');
    }
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
            <div class="card an" style="border-radius:36px;padding:22px 28px">
                <div class="ex">!</div>
                <div class="alert-info">
                    <strong>${phraseMesure(m)}</strong>
                    <small>${m.date} · valeur ${arrondir(m.valeur)} · seuil ${arrondir(m.seuil)}</small>
                    ${btnExpliquer(m)}
                </div>
                <span class="pct">+${pc}%</span>
            </div>`;
        }).join('');
    }
}

let isLoggedIn = window.userIsLoggedIn; // pour connaitre que l user est inscrit

const pill=getEl("#pill");
const links=[...document.querySelectorAll('nav a')];
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

function route() {
    let h=location.hash.slice(1) || (isLoggedIn ? 'dashboard' : 'login'); 
    if (!isLoggedIn && h !== 'login' && h !== 'register' && h !== 'forgot-password' && h !== 'verify-code' && h !== 'reset-password') {
    h = 'login';
    location.hash = '#login';
    }
    if (!document.getElementById(h)) h = isLoggedIn ? 'dashboard' : 'login';
    if (!isLoggedIn) {
        document.body.classList.add('cover');
    } else {
         document.body.classList.remove('cover');
    }
    document.querySelectorAll('.page').forEach(p => p.classList.toggle('show', p.id===h)); //toggle ajoute la classe show à la page p.id
    links.forEach(l=>l.classList.toggle('on',l.hash==='#'+h));
    placerPill();
    scrollTo({top:0,behavior:'smooth'});
    const pg = getEl('#' + h);                                  // la page affichée
    pg.querySelectorAll('.fill').forEach(e => {                 // pour chaque barre
        e.style.width = 0;                                      // on la remet à 0
        setTimeout(() => e.style.width = e.dataset.w + '%', 150); // puis largeur réelle après 150 ms
    });
    pg.querySelectorAll('.col i').forEach(e => {                // pour chaque colonne
        e.style.height = 0;                                     // on la remet à 0
        setTimeout(() => e.style.height = e.dataset.h, 150);    // puis hauteur réelle après 150 ms
    });

    if (h === 'graphique') dessinerGraphJour();                 // (re)dessine la courbe quand la page est visible

    //compteurs animés du dashboard
    if (h === 'dashboard') {
        count(getEl('#tot'), S.T);                              // total
        count(getEl('#avg'), D.length ? S.T / D.length : 0);    // moyenne
        count(getEl('#nal'), S.n, 0);                           // nombre d'alertes

        const p = getEl('#sp');                                 // relance le tracé de la courbe
        if (p) {
            p.style.animation = 'none';                         // coupe l'animation
            p.getBoundingClientRect();                          // force le recalcul du navigateur
            p.style.animation = '';
        }
    }

    //compteurs animés de la page Alertes
    if (h === 'alertes') {
        count(getEl('#tot2'), S.T);
        count(getEl('#na2'), S.n, 0);
    }
        
}
function gererRouter() {    
    window.addEventListener('hashchange',route);
    window.addEventListener('resize',placerPill);
    document.fonts && document.fonts.ready.then(placerPill);
    route();
}


const root=document.documentElement;//yjib l html

const sun  = '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>';
const moon = '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>';

//applique le thème, change l'icône et le sauvegarde dans le navigateur
function setTheme(t) {                                          // t = "dark" ou "light"
    root.dataset.theme = t;                                     // data-theme sur <html> (utilisé par le CSS)
    t === 'dark' ? root.setAttribute('data-dark', '') : root.removeAttribute('data-dark'); // ajoute/retire data-dark
    getEl('#ic').innerHTML = t === 'dark' ? sun : moon;         // soleil en sombre, lune en clair
    try { localStorage.setItem('eco-theme', t); } catch (e) {}  // sauvegarde (try/catch si stockage bloqué)
    if (graphJour) dessinerGraphJour();
}

//thème sauvegardé, sinon celui du système
let saved = null;
try { saved = localStorage.getItem('eco-theme'); } catch (e) {}
setTheme(saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));



getEl('#theme').onclick = () => {
    const current=root.dataset.theme;//recupere theme actuel
    setTheme(current==='dark' ? 'light' : 'dark');
};

getEl('#btn-pdf').onclick = () => {
    window.print();
};
const splash=getEl('#splash');
setTimeout(()=>splash.classList.add('out'),3500);
setTimeout(() => {
    splash.remove();
    document.body.classList.remove('splashing');//supprime la class splashing 
    route();
}, 4000);

// Notifications (toast + alerte) : fermeture auto après data-duration ms ou au clic sur la croix
document.querySelectorAll('[data-notif]').forEach(n => {
  let timer;
  const fermer = () => {
    clearTimeout(timer);
    n.classList.add('is-leaving');
    n.addEventListener('animationend', () => n.remove(), { once: true });
    setTimeout(() => n.remove(), 400); // sécurité si l'animation est désactivée
  };
  n.querySelector('.notif-close').addEventListener('click', fermer);
  timer = setTimeout(fermer, Number(n.dataset.duration) || 5000);
});

// ---------- Boutons « Expliquer » (envoient une question au chatbot) ----------
// n'existent que si l'utilisateur est connecté (le chatbot aussi)
const btnExpliquer = m => window.userIsLoggedIn
    ? `<button type="button" class="btn-explain" data-m="${D.indexOf(m)}" title="Demander à l'assistant"><span aria-hidden="true">✨</span> Expliquer</button>`
    : '';

const questionAlerte = m =>
    `Explique cette alerte : ${m.batiment}, ${m.ressource}, valeur ${arrondir(m.valeur)} ` +
    `pour un seuil de ${arrondir(m.seuil)} (+${arrondir(pc(m))} %) le ${m.date}. ` +
    `Quelle est la cause probable et que faire ?`;

// un seul écouteur pour tous les boutons (même ceux créés dynamiquement)
document.addEventListener('click', e => {
    const b = e.target.closest('.btn-explain');
    if (!b || !window.EcoBot) return;
    let q = b.dataset.q;                                   // bouton d'un graphique : question fixe
    if (b.dataset.m !== undefined) {                       // bouton d'une alerte : question construite
        const m = D[Number(b.dataset.m)];
        if (!m) return;
        q = questionAlerte(m);
    }
    window.EcoBot.ask(q);
});

// ---------- Graphique de consommation par jour (Chart.js) ----------
const COULEURS_RES = { electricite: '#f2b84b', eau: '#4aa3df', chauffage: '#e8604c' };
const AUTRES_COULEURS = ['#9b8cff', '#4cc9a0', '#ff8fb1'];
const LIBELLE_RES = { electricite: 'Électricité', eau: 'Eau', chauffage: 'Chauffage', gaze: 'Gaz' };
const nomRes = r => LIBELLE_RES[r] || (r.charAt(0).toUpperCase() + r.slice(1));

//remplit les deux filtres du graphique
function initGraphJour() {
    const sb = getEl('#gj-bat'), sr = getEl('#gj-res');
    if (!sb || !sr) return;
    const bats = [...new Set(D.map(m => m.batiment))].sort();
    const ress = [...new Set(D.map(m => m.ressource))].sort();
    sb.innerHTML = '<option value="">Tous les bâtiments</option>' +
        bats.map(b => `<option value="${b}">${joli(b)}</option>`).join('');
    sr.innerHTML = '<option value="">Toutes les ressources</option>' +
        ress.map(r => `<option value="${r}">${maj(resNom(r))}</option>`).join('');
    sb.onchange = dessinerGraphJour;
    sr.onchange = dessinerGraphJour;
}

function dessinerGraphJour() {
    const canvas = getEl('#gj-canvas');
    if (!canvas) return;
    if (graphJour) { graphJour.destroy(); graphJour = null; }
    if (typeof Chart === 'undefined') {
        canvas.parentElement.innerHTML = '<p class="empty">Chart.js n’a pas pu être chargé (vérifiez la connexion internet).</p>';
        return;
    }

    const bat = getEl('#gj-bat').value;
    const res = getEl('#gj-res').value;
    const sel = D.filter(m => (!bat || m.batiment === bat) && (!res || m.ressource === res));
    const jours = [...new Set(sel.map(m => m.date))].sort();          // un point par jour présent dans les données
    const ressources = [...new Set(sel.map(m => m.ressource))].sort(); // une courbe par ressource

    //couleurs qui suivent le thème clair/sombre
    const css = getComputedStyle(document.documentElement);
    const txt = css.getPropertyValue('--mut').trim() || '#707e74';
    const grille = css.getPropertyValue('--soft').trim() || '#e3ede0';
    const encre = css.getPropertyValue('--ink').trim() || '#12372a';

    let k = 0;
    const datasets = ressources.map(r => {
        const couleur = COULEURS_RES[r] || AUTRES_COULEURS[k++ % AUTRES_COULEURS.length];
        return {
            label: nomRes(r),
            //somme des mesures de ce jour (null si aucune mesure ce jour-là)
            data: jours.map(j => {
                const l = sel.filter(m => m.ressource === r && m.date === j);
                return l.length ? l.reduce((a, m) => a + m.valeur, 0) : null;
            }),
            borderColor: couleur, backgroundColor: couleur,
            borderWidth: 3, tension: 0.3, spanGaps: true,   // relie les jours sans mesure
            pointRadius: 5, pointHoverRadius: 8
        };
    });
    
    //moyenne mobile calculée par le module C (en pointillés, seulement quand une ressource est choisie pour rester lisible)
    if (res) {
        ressources.forEach(r => {
            const couleur = datasets.find(d => d.label === nomRes(r)).borderColor;
            datasets.push({
                label: nomRes(r) + ' – moyenne mobile (C)',
                data: jours.map(j => {
                    const l = sel.filter(m => m.ressource === r && m.date === j && isFinite(Number(m.moyenne_mobile)));
                    return l.length ? l.reduce((a, m) => a + Number(m.moyenne_mobile), 0) : null;
                }),
                borderColor: couleur, backgroundColor: couleur,
                borderDash: [6, 6], borderWidth: 2, tension: 0.3, spanGaps: true, pointRadius: 0
            });
        });
    }

    Chart.defaults.font.family = "'Readex Pro', sans-serif";
    graphJour = new Chart(canvas, {
        type: 'line',
        data: {
            labels: jours.map(j => new Date(j).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })),
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: encre, usePointStyle: true } },
                tooltip: { callbacks: { label: c => ` ${c.dataset.label} : ${arrondir(c.parsed.y)}` } }
            },
            scales: {
                x: { ticks: { color: txt }, grid: { color: grille } },
                y: { beginAtZero: true, ticks: { color: txt }, grid: { color: grille },
                     title: { display: true, text: 'Consommation', color: txt } }
            }
        }
    });

    //le bouton « Expliquer » envoie au chatbot les filtres actuellement choisis
    const be = getEl('#gj-explain');
    if (be) {
        be.dataset.q = `Explique le graphique de consommation par jour ` +
            (bat ? `du bâtiment ${bat}` : 'de tous les bâtiments') +
            (res ? `, ressource ${res}` : ', toutes ressources') +
            ` : comment évolue-t-elle d'un jour à l'autre et que remarques-tu ?`;
    }
}

// ---------- Classement écologique : podium des bâtiments les plus gourmands ----------
function calculerClassement() {
    const zone = getEl('#podium');
    if (!zone) return;

    //pour chaque bâtiment : cumul des dépassements (%), nombre d'alertes, nombre de mesures
    const par = {};
    D.forEach(m => {
        const b = par[m.batiment] || (par[m.batiment] = { nom: m.batiment, depass: 0, alertes: 0, n: 0 });
        b.n++;
        if (al(m) && m.seuil > 0) {
            b.depass += Math.max(pc(m), 0);
            b.alertes++;
        }
    });

    const classement = Object.values(par)
        .filter(b => b.alertes > 0)
        .map(b => ({ ...b, score: Math.max(0, Math.round(100 - b.depass / b.n)) }))
        .sort((a, b) => b.depass - a.depass)
        .slice(0, 3)
        .map((b, i) => ({ ...b, rang: i + 1 }));

    if (!classement.length) {
        zone.innerHTML = '<p class="empty">Aucun dépassement de seuil : tous les bâtiments sont exemplaires 🌿</p>';
        return;
    }

    //ordre d'affichage du podium : 2e, 1er, 3e (le 1er au milieu)
    const ordre = [classement[1], classement[0], classement[2]].filter(Boolean);
    const medailles = { 1: '🥇', 2: '🥈', 3: '🥉' };
    zone.innerHTML = ordre.map(b => `
        <div class="pod pod-${b.rang}" style="--d:${(b.rang - 1) * 0.15}s">
            <div class="pod-medal" aria-hidden="true">${medailles[b.rang]}</div>
            <div class="pod-name">${joli(b.nom)}</div>
            <div class="pod-pct">+${arrondir(b.depass)} %</div>
            <div class="pod-step"><span>${b.rang}</span></div>
            <small>${b.alertes} alerte${b.alertes > 1 ? 's' : ''} · score éco ${b.score}/100</small>
        </div>`).join('');
}

// ---------- Tendance (moyenne mobile calculée par le module C) ----------
const TENDANCES = {
    hausse: ['↑', 'up',   'En hausse'],
    baisse: ['↓', 'down', 'En baisse'],
    stable: ['→', 'flat', 'Stable']
};
const tendanceHtml = m => {
    const d = TENDANCES[m.tendance];
    if (!d) return `<span class="trend na" title="Pas assez de mesures précédentes pour calculer une tendance">–</span>`;
    const mm = Number(m.moyenne_mobile);
    return `<span class="trend ${d[1]}" title="${d[2]} · moyenne mobile (3 mesures) : ${arrondir(mm)}">${d[0]} <small>${arrondir(mm)}</small></span>`;
};

// ---------- Profil : recadrage de la photo (cadre carré redimensionnable + cercle de visée) ----------
(function () {
    const input = getEl('#photo-input'), btn = getEl('#btn-choisir-photo'), modalEl = getEl('#modalCrop');
    if (!input || !btn || !modalEl) return;
    const stage = getEl('#crop-stage'), img = getEl('#crop-img'), box = getEl('#crop-box'), ok = getEl('#crop-ok');
    const OUT = 400, MIN = 60;                 // taille de la photo finale / taille minimale du cadre
    let url = null, k = 1, W = 0, H = 0, c = { x: 0, y: 0, s: 0 }, drag = null;
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    const draw = () => {
        box.style.left = c.x + 'px'; box.style.top = c.y + 'px';
        box.style.width = c.s + 'px'; box.style.height = c.s + 'px';
    };

    // adapte l'image à la fenêtre et place le cadre au centre
    function layout() {
        if (!img.naturalWidth) return;
        const maxW = stage.parentElement.clientWidth - 32, maxH = 340;
        k = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
        W = Math.round(img.naturalWidth * k); H = Math.round(img.naturalHeight * k);
        stage.style.width = W + 'px'; stage.style.height = H + 'px';
        const s = Math.round(Math.min(W, H) * 0.8);
        c = { x: Math.round((W - s) / 2), y: Math.round((H - s) / 2), s };
        draw();
    }
    modalEl.addEventListener('shown.bs.modal', layout);

    btn.addEventListener('click', () => input.click());

    input.addEventListener('change', () => {
        const f = input.files[0];
        if (!f) return;
        if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
            alert('Format non accepté : utilisez une image JPG, PNG ou WebP.');
            input.value = '';
            return;
        }
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(f);
        img.onload = () => modal.show();
        img.src = url;
        input.value = '';
    });

    // déplacer le cadre (corps) ou le redimensionner (poignées d'angle) : souris et doigt
    const pos = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

    box.addEventListener('pointerdown', e => {
        e.preventDefault();
        drag = { h: e.target.dataset.c || null, start: pos(e), c: { ...c } };
        box.setPointerCapture(e.pointerId);
    });

    box.addEventListener('pointermove', e => {
        if (!drag) return;
        const p = pos(e), d = drag.c;
        if (!drag.h) {                                           // déplacement
            c.x = clamp(d.x + p.x - drag.start.x, 0, W - c.s);
            c.y = clamp(d.y + p.y - drag.start.y, 0, H - c.s);
        } else {                                                 // redimensionnement (le coin opposé reste fixe, le cadre reste carré)
            let ax, ay, s;
            if (drag.h === 'se') {
                ax = d.x; ay = d.y;
                s = Math.min(p.x - ax, p.y - ay, W - ax, H - ay);
                c.s = Math.max(MIN, s); c.x = ax; c.y = ay;
            } else if (drag.h === 'nw') {
                ax = d.x + d.s; ay = d.y + d.s;
                s = Math.min(ax - p.x, ay - p.y, ax, ay);
                c.s = Math.max(MIN, s); c.x = ax - c.s; c.y = ay - c.s;
            } else if (drag.h === 'ne') {
                ax = d.x; ay = d.y + d.s;
                s = Math.min(p.x - ax, ay - p.y, W - ax, ay);
                c.s = Math.max(MIN, s); c.x = ax; c.y = ay - c.s;
            } else {                                             // sw
                ax = d.x + d.s; ay = d.y;
                s = Math.min(ax - p.x, p.y - ay, ax, H - ay);
                c.s = Math.max(MIN, s); c.x = ax - c.s; c.y = ay;
            }
        }
        draw();
    });
    const fin = () => { drag = null; };
    box.addEventListener('pointerup', fin);
    box.addEventListener('pointercancel', fin);

    // valider : on découpe la zone du cadre et on l'envoie au serveur
    ok.addEventListener('click', () => {
        const cv = document.createElement('canvas');
        cv.width = cv.height = OUT;
        const g = cv.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, OUT, OUT);        // fond blanc si PNG transparent
        g.drawImage(img, c.x / k, c.y / k, c.s / k, c.s / k, 0, 0, OUT, OUT);
        ok.disabled = true; ok.textContent = 'Envoi…';
        cv.toBlob(blob => {
            const fd = new FormData();
            fd.append('photo', blob, 'avatar.jpg');
            fd.append('ajax', '1');
            fetch('php/upload_photo.php', { method: 'POST', body: fd })
                .then(r => r.json())
                .then(() => { location.hash = '#profil'; location.reload(); })
                .catch(() => {
                    alert('Envoi impossible. Vérifiez que le serveur fonctionne.');
                    ok.disabled = false; ok.textContent = 'Valider';
                });
        }, 'image/jpeg', 0.9);
    });
})();

// ---------- Profil : fenêtre mot de passe (changer / actuel oublié) ----------
(function () {
    const modalEl = getEl('#modalMdp');
    if (!modalEl) return;
    const pChange = getEl('#mdp-change'), pForgot = getEl('#mdp-forgot');
    getEl('#mdp-oublie').addEventListener('click', () => { pChange.hidden = true; pForgot.hidden = false; });
    getEl('#mdp-retour').addEventListener('click', () => { pForgot.hidden = true; pChange.hidden = false; });
    modalEl.addEventListener('hidden.bs.modal', () => { pForgot.hidden = true; pChange.hidden = false; });
})();

// ---------- Profil : fenêtre nom d'utilisateur ----------
(function () {
    const m = getEl('#modalUser');
    if (!m) return;
    m.addEventListener('shown.bs.modal', () => { const i = getEl('#new-username'); i.focus(); i.select(); });
})();

// ---------- Suppression d'une mesure (confirmation avant envoi) ----------
document.addEventListener('click', e => {
    const b = e.target.closest('.btn-suppr');
    if (!b) return;
    const m = D.find(x => x._i === Number(b.dataset.i));
    if (!m) return;
    getEl('#suppr-i').value = m._i;
    getEl('#suppr-res').value = m.ressource;
    getEl('#suppr-val').value = m.valeur;
    getEl('#suppr-date').value = m.date;
    getEl('#suppr-texte').textContent =
        `Voulez-vous vraiment supprimer ${phraseMesure(m)} (valeur ${arrondir(m.valeur)}, le ${m.date}) ?`;
    bootstrap.Modal.getOrCreateInstance(getEl('#modalSuppr')).show();
});
