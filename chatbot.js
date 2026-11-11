/* =====================================================
   chatbot.js - fenêtre de chat EcoCampus
   Construit lui-même son HTML : il suffit d'ajouter chatbot.css
   et ce script dans index.php (voir les 2 lignes à ajouter).
   Le widget n'apparaît que si l'utilisateur est connecté
   (window.userIsLoggedIn est défini dans index.php).
   ===================================================== */
(function () {
  "use strict";

  if (!window.userIsLoggedIn) return;

  var ENDPOINT = "php/chatbot.php";
  var SUGGESTIONS = [
    "Quels bâtiments sont en alerte ?",
    "Quel bâtiment consomme le plus ?",
    "Comment réduire la consommation ?"
  ];
  var historique = []; // [{role: "user" | "assistant", content: "..."}]
  var occupe = false;

  /* ---------- Outils ---------- */
  function el(tag, classe, texte) {
    var n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texte) n.textContent = texte; // textContent : jamais de HTML venant du modèle
    return n;
  }

  var SVG_NS = "http://www.w3.org/2000/svg";
  function icone(chemin) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    var p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", chemin);
    svg.appendChild(p);
    return svg;
  }
  var ICONE_CHAT = "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z";
  var ICONE_FEUILLE = "M5 19c0-8 5-13 14-14 0 9-5 14-14 14zM5 19l7-7";
  var ICONE_ENVOI = "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z";

  /* ---------- Construction de l'interface ---------- */
  var racine = el("div", "ecobot");

  var bouton = el("button", "ecobot-launcher");
  bouton.type = "button";
  bouton.setAttribute("aria-label", "Ouvrir l’assistant EcoCampus");
  bouton.setAttribute("aria-expanded", "false");
  bouton.appendChild(icone(ICONE_CHAT));

  var panneau = el("section", "ecobot-panel");
  panneau.setAttribute("aria-label", "Assistant EcoCampus");

  var entete = el("div", "ecobot-head");
  entete.appendChild(icone(ICONE_FEUILLE));
  var titre = el("div", "ecobot-title");
  titre.appendChild(el("strong", "", "Assistant EcoCampus"));
  titre.appendChild(el("span", "", "Pose une question sur les mesures"));
  entete.appendChild(titre);
  var fermer = el("button", "ecobot-close", "×");
  fermer.type = "button";
  fermer.setAttribute("aria-label", "Fermer l’assistant");
  entete.appendChild(fermer);

  var journal = el("div", "ecobot-log");
  journal.setAttribute("role", "log");
  journal.setAttribute("aria-live", "polite");

  var zoneSuggestions = el("div", "ecobot-chips");

  var formulaire = el("form", "ecobot-form");
  var champ = el("input", "ecobot-input");
  champ.type = "text";
  champ.maxLength = 500;
  champ.placeholder = "Écris ta question…";
  champ.setAttribute("aria-label", "Votre message");
  champ.autocomplete = "off";
  var envoyer = el("button", "ecobot-send");
  envoyer.type = "submit";
  envoyer.setAttribute("aria-label", "Envoyer");
  envoyer.appendChild(icone(ICONE_ENVOI));
  formulaire.appendChild(champ);
  formulaire.appendChild(envoyer);

  panneau.appendChild(entete);
  panneau.appendChild(journal);
  panneau.appendChild(zoneSuggestions);
  panneau.appendChild(formulaire);
  racine.appendChild(panneau);
  racine.appendChild(bouton);
  document.body.appendChild(racine);

  /* ---------- Messages ---------- */
  function defiler() {
    journal.scrollTop = journal.scrollHeight;
  }

  function ajouterMessage(texte, type) {
    var m = el("div", "ecobot-msg " + type, texte);
    journal.appendChild(m);
    defiler();
    return m;
  }

  function afficherIndicateur() {
    var m = el("div", "ecobot-msg bot ecobot-typing");
    m.setAttribute("aria-label", "L’assistant écrit");
    m.appendChild(el("i"));
    m.appendChild(el("i"));
    m.appendChild(el("i"));
    journal.appendChild(m);
    defiler();
    return m;
  }

  function bloquer(etat) {
    occupe = etat;
    champ.disabled = etat;
    envoyer.disabled = etat;
  }

  /* ---------- Envoi d'un message ---------- */
  function envoyerMessage(texte) {
    texte = texte.trim();
    if (!texte || occupe) return;

    zoneSuggestions.style.display = "none";
    ajouterMessage(texte, "user");
    champ.value = "";
    bloquer(true);
    var indicateur = afficherIndicateur();

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: texte, history: historique.slice(-8) })
    })
      .then(function (res) {
        return res.json().then(
          function (data) { return { ok: res.ok, data: data }; },
          function () { return { ok: false, data: {} }; } // réponse non JSON (erreur PHP)
        );
      })
      .then(function (r) {
        indicateur.remove();
        if (r.ok && r.data.reply) {
          historique.push({ role: "user", content: texte });
          historique.push({ role: "assistant", content: r.data.reply });
          ajouterMessage(r.data.reply, "bot");
        } else {
          ajouterMessage(r.data.error || "Le serveur n’a pas répondu correctement. Vérifiez que XAMPP et php/chatbot.php fonctionnent.", "err");
        }
      })
      .catch(function () {
        indicateur.remove();
        ajouterMessage("Connexion impossible avec le serveur. Vérifiez que le site est lancé via XAMPP (http://localhost/...).", "err");
      })
      .then(function () {
        bloquer(false);
        champ.focus();
      });
  }

  /* ---------- Ouverture / fermeture ---------- */
  function ouvrir(etat) {
    panneau.classList.toggle("is-open", etat);
    bouton.setAttribute("aria-expanded", String(etat));
    bouton.setAttribute("aria-label", etat ? "Fermer l’assistant EcoCampus" : "Ouvrir l’assistant EcoCampus");
    if (etat) champ.focus();
  }

  bouton.addEventListener("click", function () {
    ouvrir(!panneau.classList.contains("is-open"));
  });
  fermer.addEventListener("click", function () {
    ouvrir(false);
    bouton.focus();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panneau.classList.contains("is-open")) {
      ouvrir(false);
      bouton.focus();
    }
  });
  formulaire.addEventListener("submit", function (e) {
    e.preventDefault();
    envoyerMessage(champ.value);
  });

    /* ---------- Pont pour les boutons « Expliquer » du site ---------- */
  window.EcoBot = {
    ask: function (question) {
      ouvrir(true);               // ouvre le panneau
      envoyerMessage(question);   // ignoré si une réponse est déjà en cours
    }
  };

  /* ---------- Boutons « Expliquer » du site ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".btn-explain");
    if (!b) return;
    var q = b.getAttribute("data-q");
    if (!q) return;
    ouvrir(true);
    envoyerMessage(q);
  });
})();
