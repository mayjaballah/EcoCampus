let D = []; // Variable globale pour stocker les mesures
let S = { T: 0, n: 0 }; // Résumé : T = total des valeurs, n = nombre d'alertes
let seulementAlertes = false; // True quand le bouton "Voir Alertes" est actif

// Données par défaut (utilisées si data.json est introuvable)
const DEFAUT = [
  { batiment: "Bibliothèque", ressource: "électricité", valeur: 152.4, seuil: 120, date: "2026-09-20", alerte: true },
  { batiment: "Bibliothèque", ressource: "eau", valeur: 35, seuil: 50, date: "2026-09-21", alerte: false },
  { batiment: "Résidence", ressource: "chauffage", valeur: 410.5, seuil: 400, date: "2026-09-20", alerte: true },
  { batiment: "Labo_info", ressource: "électricité", valeur: 98.2, seuil: 150, date: "2026-09-20", alerte: false }
];

// Récupération des mesures au chargement de la page
document.addEventListener("DOMContentLoaded", () => {
    fetch('data.json')
        .then(res => {
            if (!res.ok) throw new Error("Fichier introuvable");
            return res.json();
        })
        .then(data => {
            // On force valeur et seuil en nombres
            D = data.map(m => ({ ...m, valeur: Number(m.valeur), seuil: Number(m.seuil) }));
            initApp(); // Lancer l'app
        })
        .catch(err => {
            console.warn("Fichier data.json introuvable, utilisation des données par défaut :", err);
            D = DEFAUT; 
            initApp();
        });
});

const getEl = s => document.querySelector(s);
const arrondir = n => Number(n).toFixed(1);

// Une mesure est en alerte si elle est marquée "alerte" ou si sa valeur dépasse son seuil
const al = m => m.alerte || m.valeur > m.seuil;
// Pourcentage de dépassement du seuil
const pc = m => (m.valeur / m.seuil - 1) * 100;

// Animation des compteurs
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

function initApp() {
    calculerKPI();
    remplirTableau(D);
    remplirFiltres();
    remplirGraphiques();
    calculerPageAlertes();
    gererRouter();
}

function calculerKPI() {
    const totalConsom = D.reduce((acc, m) => acc + Number(m.valeur), 0);
    const anomalies = D.filter(m => al(m));
    const batimentsUniques = [...new Set(D.map(m => m.batiment))];

    S = { T: totalConsom, n: anomalies.length };
    const mx = Math.max(...D.map(m => Math.max(m.valeur, m.seuil)), 1) * 1.1;

    getEl('#tot').textContent = arrondir(totalConsom);
    getEl('#nal').textContent = anomalies.length;
    getEl('#nb-bat').textContent = batimentsUniques.length;

    // Titre de la période dynamique
    const dates = [...new Set(D.map(m => m.date))].sort();
    const fmt = d => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    if (dates.length > 1) {
        getEl('#range').textContent = `Consommation du campus du ${new Date(dates[0]).getDate()} au ${fmt(dates[dates.length - 1])}`;
    } else if (dates.length === 1) {
        getEl('#range').textContent = `Consommation du campus le ${fmt(dates[0])}`;
    }

    // Mini courbe (sparkline)
    const sp = getEl('#sp');
    if (sp && D.length > 0) {
        const pas = D.length > 1 ? 280 / (D.length - 1) : 0;
        const pts = D.map((m, i) => [i * pas, 70 - (m.valeur / mx) * 60]);
        sp.setAttribute("d", "M" + pts.map(p => p.join(",")).join(" L"));
    }

    // Affichage valeur vs seuil
    getEl('#bars').innerHTML = D.map(m => `
        <div class="row" style="display:flex; flex-direction:column; margin:10px 0;">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span>${m.batiment} . ${m.ressource}</span>
                <b>${arrondir(m.valeur)} / ${m.seuil}</b>
            </div>
            <div class="track" style="position:relative; height:10px; background:#e3ede0; border-radius:10px; overflow:hidden;"> 
                <div class="fill ${al(m) ? "bad" : ""}" data-w="${(m.valeur / mx) * 100}" style="height:100%; width:0; background:var(--acc);"></div>
                <i class="tick" style="position:absolute; top:0; bottom:0; width:2px; background:#12372a; left:${(m.seuil / mx) * 100}%"></i>
            </div>
        </div>`).join('');

    // Affichage des anomalies
    const anosEl = getEl('#anos');
    if (anosEl) {
        anosEl.innerHTML = anomalies.length ? anomalies.map(m => `
            <div class="an" style="background:#ffe9e4; padding:12px; border-radius:14px; margin-bottom:8px; border:1px solid #707070; display:flex; align-items:center; gap:12px;">
                <div class="ex" style="background:#e5604a; color:#fff; width:30px; height:30px; border-radius:50%; display:grid; place-items:center; font-weight:bold;">!</div>
                <div style="flex:1;">
                    <strong>${m.batiment} . ${m.ressource}</strong>
                    <small style="display:block; color:#707e74;">${arrondir(m.valeur)} / ${arrondir(m.seuil)}</small>
                </div>
                <span class="pct" style="color:#a8321f; font-weight:bold;">+${arrondir(pc(m))}%</span>
            </div>`).join('') : `<p class="empty">Aucune anomalie détectée ✅</p>`;
    }
}

function remplirTableau(donnees) {
    getEl('#tb').innerHTML = donnees.map((m, i) => `
        <tr style="animation:up .5s ${i * 0.07}s both">
            <td>${m.batiment}</td>
            <td>${m.ressource}</td>
            <td>${arrondir(m.valeur)}</td>
            <td>${m.seuil}</td>
            <td>${m.date}</td>
            <td><span class="pill ${al(m) ? 'a' : ''}">${al(m) ? 'Alerte' : 'Ok'}</span></td>
        </tr>`).join('');
}

function remplirFiltres() {
    const batiments = [...new Set(D.map(m => m.batiment))];
    const ressources = [...new Set(D.map(m => m.ressource))];
    const dates = [...new Set(D.map(m => m.date))];

    getEl('#fb').innerHTML = '<option value="">Tous les bâtiments</option>' + batiments.map(b => `<option value="${b}">${b}</option>`).join('');
    getEl('#fr').innerHTML = '<option value="">Toutes les ressources</option>' + ressources.map(r => `<option value="${r}">${r}</option>`).join('');
    
    const fp = getEl('#fp');
    if (fp) {
        fp.innerHTML = '<option value="">Période</option>' + dates.map(d => `<option value="${d}">${d}</option>`).join('');
        fp.onchange = filtrer;
    }

    getEl('#fb').onchange = filtrer;
    getEl('#fr').onchange = filtrer;
    getEl('#fs').oninput = filtrer;

    const btnAlert = getEl('#btn-filter-alert');
    if (btnAlert) {
        btnAlert.onclick = e => {
            seulementAlertes = !seulementAlertes;
            e.currentTarget.classList.toggle("on", seulementAlertes);
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
        (!q || (m.batiment + " " + m.ressource).toLowerCase().includes(q))
    );
    remplirTableau(resultat);
}

function remplirGraphiques() {
    const sommetsB = {};
    D.forEach(m => {
        sommetsB[m.batiment] = (sommetsB[m.batiment] || 0) + Number(m.valeur);
    });
    const maxValB = Math.max(...Object.values(sommetsB), 1);

    getEl('#cb').innerHTML = Object.entries(sommetsB).map(([bat, val]) => `
        <div class="col" style="display:flex; flex-direction:column; align-items:center;">
            <span class="val-label">${arrondir(val)}</span>
            <i data-h="${(val / maxValB) * 100}%" style="height:0;"></i>
        </div>`).join('');

    getEl('#nb').innerHTML = Object.keys(sommetsB).map(bat => `<div>${bat}</div>`).join('');

    const sommetsR = {};
    D.forEach(m => {
        const name = m.ressource.charAt(0).toUpperCase() + m.ressource.slice(1);
        sommetsR[name] = (sommetsR[name] || 0) + Number(m.valeur);
    });
    const maxValR = Math.max(...Object.values(sommetsR), 1);

    getEl('#rb').innerHTML = Object.entries(sommetsR).map(([res, val]) => `
        <div class="row">
            <span class="res-name">${res}</span>
            <div class="track">
                <div class="fill" data-w="${(val / maxValR) * 100}" style="width:0;"></div>
            </div>
            <b class="res-val">${arrondir(val)}</b>
        </div>`).join('');
}

function calculerPageAlertes() {
    const anomalies = D.filter(m => al(m));

    if(getEl('#na2')) getEl('#na2').textContent = anomalies.length;
    if(getEl('#na3')) getEl('#na3').textContent = `sur ${D.length} mesures`;
    if(getEl('#tot2')) getEl('#tot2').textContent = arrondir(S.T);

    const alContainer = getEl('#al');
    if(alContainer) {
        alContainer.innerHTML = anomalies.map(m => {
            const pcn = pc(m).toFixed(1);
            return `
            <div class="card an" style="border-radius:36px; padding:22px 28px; margin-bottom:15px; display:flex; align-items:center; justify-content:space-between;">
                <div class="ex" style="background:#e5604a; color:#fff; width:48px; height:48px; border-radius:50%; display:grid; place-items:center; font-weight:bold; font-size:20px;">!</div>
                <div class="alert-info" style="flex:1; margin-left:18px;">
                    <strong style="font-size:18px;">${m.batiment} : ${m.ressource}</strong>
                    <small style="display:block; color:#707e74;">${m.date} · valeur ${arrondir(m.valeur)} · seuil ${arrondir(m.seuil)}</small>
                </div>
                <span class="pct" style="font-size:20px; font-weight:bold; color:#a8321f;">+${pcn}%</span>
            </div>`;
        }).join('');
    }
}

let isLoggedIn = false; 

const pill = getEl('#pill'); 
const links = [...document.querySelectorAll('nav a')]; 

function placerPill() {
    if (!pill) return;
    const a = links.find(l => l.classList.contains('on')); 
    if (a) { 
        pill.style.opacity = 1; 
        pill.style.left = a.offsetLeft + 'px'; 
        pill.style.width = a.offsetWidth + 'px'; 
    } else { 
        pill.style.opacity = 0; 
    }
}

function route() {
    let h = location.hash.slice(1) || (isLoggedIn ? 'dashboard' : 'login'); 
    if (!isLoggedIn && h !== 'login') {
        h = 'login';
        location.hash = '#login';
    }
    if (!document.querySelector('.page#' + h)) h = isLoggedIn ? 'dashboard' : 'login'; 
    document.body.classList.toggle('cover', h === 'login'); 
    
    document.querySelectorAll('.page').forEach(p => p.classList.toggle('show', p.id === h));

    links.forEach(l => l.classList.toggle('on', l.hash === '#' + h));
    placerPill();

    scrollTo({ top: 0, behavior: 'smooth' }); 

    const pg = getEl('#' + h); 
    if (pg) {
        pg.querySelectorAll('.fill').forEach(e => { 
            e.style.width = 0; 
            setTimeout(() => e.style.width = e.dataset.w + '%', 150); 
        });
        pg.querySelectorAll('.col i').forEach(e => { 
            e.style.height = 0; 
            setTimeout(() => e.style.height = e.dataset.h, 150); 
        });
    }

    if (h === 'dashboard') {
        count(getEl('#tot'), S.T); 
        count(getEl('#nal'), S.n, 0); 

        const p = getEl('#sp'); 
        if (p) {
            p.style.animation = 'none'; 
            p.getBoundingClientRect(); 
            p.style.animation = ''; 
        }
    }

    if (h === 'alertes') {
        count(getEl('#tot2'), S.T);
        count(getEl('#na2'), S.n, 0);
    }
}

function gererRouter() {
    window.addEventListener('hashchange', route);
    window.addEventListener('resize', placerPill); 
    if (document.fonts) document.fonts.ready.then(placerPill); 
    route();
}

// Gestion du formulaire de connexion
document.addEventListener("DOMContentLoaded", () => {
    const formLogin = getEl('#form-login');
    if (formLogin) {
        formLogin.onsubmit = (e) => {
            e.preventDefault();
            const u = getEl('#login-user').value;
            const p = getEl('#login-pass').value;
            
            if (u === 'admin' && p === '1234') {
                isLoggedIn = true;
                const msg = getEl('#login-msg');
                if (msg) msg.textContent = ""; 
                location.hash = '#dashboard'; 
            } else {
                const msg = getEl('#login-msg');
                if (msg) {
                    msg.textContent = "Nom d’utilisateur ou mot de passe incorrect !";
                } else {
                    alert('Nom d utilisateur ou mot de passe incorrect !');
                }
            }
        };
    }
});

const root = document.documentElement;

const sun = '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>';
const moon = '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>';

function setTheme(t) { 
    root.dataset.theme = t; 
    t === 'dark' ? root.setAttribute('data-dark', '') : root.removeAttribute('data-dark'); 
    const ic = getEl('#ic');
    if (ic) ic.innerHTML = t === 'dark' ? sun : moon; 
    try { localStorage.setItem('eco-theme', t); } catch (e) {} 
}

let saved = null;
try { saved = localStorage.getItem('eco-theme'); } catch (e) {}
setTheme(saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

const themeBtn = getEl('#theme');
if (themeBtn) {
    themeBtn.onclick = () => {
        const current = root.dataset.theme;
        setTheme(current === 'dark' ? 'light' : 'dark');
    };
}

const pdfBtn = getEl('#btn-pdf');
if (pdfBtn) {
    pdfBtn.onclick = () => {
        window.print();
    };
}

// Gestion du Splash Screen
const splash = getEl('#splash');
if (splash) {
    setTimeout(() => splash.classList.add('out'), 3500);          
    setTimeout(() => {                            
        splash.remove();                            
        document.body.classList.remove('splashing');
        route();                                    
    }, 4000);
}