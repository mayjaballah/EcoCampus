<?php
//pour l'inscription
session_start();

$message = $_SESSION['message'] ?? '';
unset($_SESSION['message']);
$nouvelleAlerte = $_SESSION['nouvelle_alerte'] ?? null;
unset($_SESSION['nouvelle_alerte']);
$flash = $_SESSION['flash'] ?? '';
unset($_SESSION['flash']);
$flashType = $_SESSION['flash_type'] ?? 'success';
unset($_SESSION['flash_type']);
// Anciens messages ($_SESSION['message'], encore utilisés par « mot de passe oublié ») :
// on les affiche aussi sous forme de notification
if ($message !== '' && $flash === '') {
    $flash = $message;
    $flashType = preg_match('/succès|envoyé|modifié|créé/iu', $message) ? 'success' : 'error';
    $message = '';
}
$peutExpliquer = isset($_SESSION['user_id']);

// ----- Données de la page profil (utilisateur connecté) -----
$profil = null;
$mesAjouts = [];
$photoUrl = '';
if ($peutExpliquer) {
    try {
        require_once __DIR__ . '/php/database.php';
        $q = $bdd->prepare("SELECT nom, prenom, username, email, photo FROM utilisateurs WHERE id = ?");
        $q->execute([$_SESSION['user_id']]);
        $profil = $q->fetch(PDO::FETCH_ASSOC) ?: null;
    } catch (Throwable $e) {
        error_log('EcoCampus profil : ' . $e->getMessage());
    }
    try {
        $q = $bdd->prepare("SELECT batiment, ressource, valeur, seuil, date_mesure
                            FROM mesures_ajoutees WHERE user_id = ? ORDER BY id DESC LIMIT 50");
        $q->execute([$_SESSION['user_id']]);
        $mesAjouts = $q->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        error_log('EcoCampus profil : ' . $e->getMessage());
    }
}
$photoUrl = ($profil && !empty($profil['photo'])) ? 'uploads/avatars/' . rawurlencode($profil['photo']) : '';
$initiales = $profil ? mb_strtoupper(mb_substr($profil['prenom'], 0, 1) . mb_substr($profil['nom'], 0, 1)) : '?';
$resFr = ['electricite' => 'Électricité', 'eau' => 'Eau', 'chauffage' => 'Chauffage', 'gaze' => 'Gaz'];
?>

<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>EcoCampus</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="chatbot.css">
<link rel="stylesheet" href="responsive.css?v=<?= filemtime(__DIR__ . '/responsive.css') ?>">
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="splashing">

<!-- ========== SPLASH (page de démarrage animée) ========== -->

<div id="splash">
 <div class="sp-in">
  <i class="sp-logo"><svg viewBox="0 0 24 24"><path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14zM5 19l7-7"/></svg></i><!-- La balise SVG crée l'icône ou le logo. -->
  <div class="sp-ttl"><span style="--i:0">E</span><span style="--i:1">c</span><span style="--i:2">o</span><span class="g" style="--i:3">C</span><span class="g" style="--i:4">a</span><span class="g" style="--i:5">m</span><span class="g" style="--i:6">p</span><span class="g" style="--i:7">u</span><span class="g" style="--i:8">s</span></div>
  <!-- EcoCampus de la page d'accueil. -->
  <p class="sp-tag">Suivi de la consommation du campus</p>
  <div class="sp-line"><b></b></div><!-- barre de chargement -->
 </div>
</div>

<div class="wrap"><!-- Conteneur principal regroupant tout le site. -->

<!-- ========== HEADER ========== -->
<!-- [BOOTSTRAP] header : d-flex + align-items-center + flex-wrap + gap-3 remplacent les règles CSS "display:flex; align-items:center; flex-wrap:wrap; gap". -->
<header class="d-flex align-items-center flex-wrap gap-3">
 <a class="logo" href="#dashboard"><!-- Le logo renvoie au tableau de bord lorsqu'on clique dessus. -->
    <i><svg viewBox="0 0 24 24"><path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14zM5 19l7-7"/></svg></i>EcoCampus</a> <!-- Icône feuille et nom du site. -->
 <!-- [BOOTSTRAP] .right : d-flex + align-items-center + gap-3 remplacent les règles CSS de .right (supprimées). La classe "right" est conservée, car body.cover et @media print l'utilisent. -->
 <div class="right d-flex align-items-center gap-3"><!-- Partie droite de l'en-tête (menu et boutons). -->
  <nav id="nav"><span id="pill"></span>
   <a href="#dashboard">Tableau de bord</a>
   <a href="#mesures">Mesures</a>
   <a href="#graphique">Graphique</a>
   <a href="#alertes">Alertes</a>
  </nav>
  <button class="round" id="theme"  title="Mode sombre / clair"><!-- Le titre s'affiche au survol du bouton. -->
   <svg viewBox="0 0 24 24" id="ic"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/></svg><!-- La balise SVG crée l'icône à partir de ces valeurs. --> <!-- Icône de lune, remplacée par une icône de soleil par JavaScript. -->
  </button>
  <button class="round" id="btn-pdf"  title="Exporter en PDF"> <!-- Bouton d'exportation en PDF. -->
   <svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/></svg><!-- Icône de document : premier tracé de la feuille, second tracé du pli et des lignes. -->
  </button>
  <?php if ($peutExpliquer) : ?>
  <a class="round avatar-link" href="#profil" title="Mon profil">
   <?php if ($photoUrl) : ?>
    <img src="<?= htmlspecialchars($photoUrl) ?>" alt="Mon profil">
   <?php else : ?>
    <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7"/></svg>
   <?php endif; ?>
  </a>
  <?php else : ?>
  <a class="round" href="#login" title="Se connecter"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7"/></svg></a>
  <?php endif; ?>
  <a class="round" href="php/logout.php" id="btn-logout" title="Déconnexion">
   <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  </a>
</div>
</header>

<!-- ========== TABLEAU DE BORD ========== -->
<section class="page" id="dashboard"><!-- =================== Page Tableau de bord ============-->
 <h1 class="t" id="range">Suivi de la consommation</h1>
 <!-- Indicateurs de consommation et alertes répartis par ressource. -->
 <div class="row g-4 mb-4">
  <div class="col-lg-4">
   <div class="card total h-100 d-flex flex-column justify-content-between" style="padding: 22px;">
    <div style="position: relative; z-index: 1;">
     <div class="lab" style="font-size: 11px; letter-spacing: 0.5px; margin-bottom: 16px; opacity: 0.85;">Consommation totale par ressource</div>
     <div id="tot-ressources-list" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;"></div>
    </div>
    <i class="c1"></i><i class="c2"></i>
   </div>
  </div>
  <div class="col-lg-4">
   <div class="card avg h-100 d-flex flex-column justify-content-between" style="padding: 22px;">
    <div class="lab" style="font-size: 11px; letter-spacing: 0.5px; margin-bottom: 16px;">Moyenne de consommation par ressource</div>
    <div id="avg-ressources-list" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;"></div>
   </div>
  </div>
  <div class="col-lg-4">
   <div class="card alert pulse h-100 d-flex flex-column justify-content-between" style="padding: 22px;">
    <div>
     <div class="lab" style="font-size: 11px; letter-spacing: 0.5px; margin-bottom: 4px; font-weight: 600;">Alertes</div>
     <div class="big" id="nal" style="font-size: 42px; font-weight: 700; line-height: 1.1;">0</div>
     <div style="font-size: 12px; margin-bottom: 16px;">seuils dépassés</div>
     <div id="alert-ressources-list" style="display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--line); padding-top: 12px;"></div>
    </div>
    <div style="font-size: 11px; opacity: 0.8; margin-top: 14px;">Suivi des dépassements par ressource</div>
   </div>
  </div>
 </div>
 <!-- [BOOTSTRAP] grid2 (CSS) -> row g-4 + col-lg-7 / col-lg-5 (les proportions étaient de 1.55fr/1fr et sont désormais de 58 %/42 %). -->
 <div class="row g-4">
  <div class="col-lg-7">
   <div class="card h-100">
    <div class="card-head">
     <div>
      <h2>Valeur vs seuil</h2>
      <p class="sub">Le trait vertical marque le seuil de chaque mesure</p>
     </div>
     <?php if ($peutExpliquer) : ?>
     <button type="button" class="btn-explain" data-q="Explique le graphique « Valeur vs seuil » : que montre-t-il et quelles mesures dépassent leur seuil ?"><span aria-hidden="true">✨</span> Expliquer</button>
     <?php endif; ?>
    </div>
    <div id="bars" class="bars"></div><!-- Les données modifiées ou ajoutées s'affichent ici. -->
   </div>
  </div>
  <div class="col-lg-5">
   <div class="card h-100"><!-- Carte des anomalies. -->
    <h2 style="margin-bottom:22px">Anomalies détectées</h2>
    <div id="anos"></div><!-- JavaScript ajoute les anomalies ici. -->
   </div>
  </div>
 </div><!-- Fermeture de la ligne. -->
</section>

<!-- ========== MESURES ========== -->
<section class="page" id="mesures"><!--====== PAGE MESURES======= -->
 <h1 class="t">Mesures</h1>
 <!-- [BOOTSTRAP] .filters : d-flex + flex-wrap + gap-3 + mb-4 remplacent les règles CSS (display:flex; gap; flex-wrap; margin-bottom). -->
 <div class="filters d-flex flex-wrap gap-3 mb-4"><!-- Barre des filtres. -->
  <!-- [BOOTSTRAP] form-select / form-control définissent le style des champs. "w-auto" évite qu'ils occupent toute la largeur par défaut. -->
  <select id="fb" class="form-select w-auto"></select> <!-- Liste des filtres par bâtiment, remplie par JavaScript. -->
  <select id="fr" class="form-select w-auto"></select><!-- Liste des filtres par ressource, remplie par JavaScript. -->
  <select id="fp" class="form-select w-auto"></select><!-- Liste des filtres par période, remplie par JavaScript. -->
  <input id="fs" type="search" class="form-control w-auto" placeholder="Rechercher"><!-- champ recherche-->
  
  <button type="button" class="btn btn-eco-light" data-bs-toggle="modal" data-bs-target="#modalAjout">
  Ajouter un bâtiment
  </button>
    <!-- [BOOTSTRAP] "btn" est un bouton Bootstrap ; "btn-eco-light" est notre variante CSS qui remplace les couleurs Bootstrap grâce aux variables --bs-btn-*.
        La classe "on", ajoutée par JavaScript, reste fonctionnelle et colore le bouton en rouge. -->
    <button id="btn-filter-alert" type="button" class="btn btn-eco-light">
    <svg class="warn" viewBox="0 0 14 14" aria-hidden="true">
      <circle class="wc" cx="7" cy="7" r="6" fill="#e8604c"/>
      <path class="wx" d="M7 3.8v3.4M7 9.8v.1" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
    <span>Voir Alertes</span>
  </button><!-- Bouton affichant uniquement les alertes. -->
 </div>

 <div class="card"><div class="table-responsive"><!-- Carte et conteneur assurant le défilement horizontal du tableau sur téléphone. -->
  <!-- [BOOTSTRAP] class="table" applique le style de tableau de Bootstrap.
       table-hover : remplace la règle CSS tbody tr:hover.
       align-middle : centre le contenu verticalement. mb-0 : supprime la marge inférieure. -->
  <table class="table table-hover align-middle mb-0">
   <thead>
    <tr>
      <th>BÂTIMENT</th>
      <th>RESSOURCE</th>
      <th>VALEUR</th>
      <th>SEUIL</th>
      <th>DATE</th>
      <th>STATUT</th>
      <th>TENDANCE</th>
    </tr>
  </thead>
   <tbody id="tb"></tbody><!-- Corps du tableau, rempli de lignes par JavaScript. -->
  </table>
 </div></div><!-- Fermeture de table-responsive et de la carte. -->
</section>

<!-- ========== GRAPHIQUES ========== -->
<section class="page" id="graphique"><!-- ========= PAGE GRAPHIQUES ======== -->
 <h1 class="t">Graphiques</h1>
  <div class="card">
  <div class="card-head">
   <div>
    <h2>Consommation par jour</h2>
    <p class="sub">Évolution jour après jour, par ressource</p>
   </div>
   <?php if ($peutExpliquer) : ?>
   <button type="button" id="gj-explain" class="btn-explain" data-q="Explique le graphique de consommation par jour : comment évolue la consommation d'un jour à l'autre ?"><span aria-hidden="true">✨</span> Expliquer</button>
   <?php endif; ?>
  </div>
  <div class="gj-filters">
   <select id="gj-bat" class="form-select w-auto" aria-label="Filtrer par bâtiment"></select>
   <select id="gj-res" class="form-select w-auto" aria-label="Filtrer par ressource"></select>
  </div>
  <div class="gj-wrap"><canvas id="gj-canvas" role="img" aria-label="Courbe de consommation par jour"></canvas></div>
 </div>
 <div class="card building-chart" style="margin-top:26px">
  <div class="card-head">
   <div>
    <h2>Consommation par bâtiment</h2>
    <p class="sub">Répartition des ressources par bâtiment</p>
   </div>
   <?php if ($peutExpliquer) : ?>
   <button type="button" class="btn-explain" data-q="Explique le graphique « Consommation par bâtiment » : compare la consommation des bâtiments selon les ressources et indique ceux qui consomment le plus."><span aria-hidden="true">✨</span> Expliquer</button>
   <?php endif; ?>
  </div>
  <div class="building-chart-legend">
   <span><i style="background:#a3e635"></i>Électricité</span>
   <span><i style="background:#38bdf8"></i>Eau</span>
   <span><i style="background:#fb923c"></i>Chauffage</span>
   <span><i style="background:#facc15"></i>Gaz</span>
  </div>
  <div class="cols-wrapper">
   <div id="cb-axis" class="building-chart-axis" aria-hidden="true"></div>
   <div class="building-chart-content">
    <div class="cols" id="cb"></div>
    <div class="names" id="nb"></div>
   </div>
  </div>
 </div>
 <div class="card" style="margin-top:26px">
  <div class="card-head" style="margin-bottom:26px">
   <div>
    <h2>Par ressource</h2>
    <p class="sub" style="margin-bottom:0">Somme des mesures de chaque ressource</p>
   </div>
   <?php if ($peutExpliquer) : ?>
   <button type="button" class="btn-explain" data-q="Explique le graphique « Par ressource » : comment se répartit la consommation entre électricité, eau et chauffage ?"><span aria-hidden="true">✨</span> Expliquer</button>
   <?php endif; ?>
  </div>
  <div id="rb" class="bars"></div><!-- Affiche les barres de chaque ressource ("bars" fonctionne comme #bars ci-dessus). -->
 </div>
</section>

<!-- ========== ALERTES ========== -->
<section class="page" id="alertes"> <!-- ======== PAGE ALERTES ======== -->
 <h1 class="t">Alertes</h1>
 <div class="row g-4 mb-4">
  <div class="col-lg-4">
   <div class="card alert pulse h-100 d-flex flex-column justify-content-between" style="padding: 22px;">
    <div>
     <div class="lab" style="font-size: 11px; letter-spacing: 0.5px; margin-bottom: 4px; font-weight: 600;">Alertes</div>
     <div class="big" id="na2" style="font-size: 42px; font-weight: 700; line-height: 1.1;">0</div>
     <div style="font-size: 12px; margin-bottom: 16px;">seuils dépassés</div>
     <div id="alert-ressources-list-2" style="display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--line); padding-top: 12px;"></div>
    </div>
    <div style="font-size: 11px; opacity: 0.8; margin-top: 14px;">Suivi des dépassements par ressource</div>
   </div>
  </div>
  <div class="col-lg-8">
   <div class="card h-100">
    <div class="card-head">
     <div>
      <h2>Classement écologique</h2>
      <p class="sub">Les bâtiments les plus gourmands, selon leurs dépassements de seuil</p>
     </div>
     <?php if ($peutExpliquer) : ?>
     <button type="button" class="btn-explain" data-q="Explique le classement écologique des bâtiments : pourquoi les premiers sont-ils les plus gourmands et que faire pour réduire leurs dépassements de seuil ?"><span aria-hidden="true">✨</span> Expliquer</button>
     <?php endif; ?>
    </div>
    <div id="podium" class="podium"></div>
    <p class="podium-note">Classement = somme des dépassements de seuil (en %). Score éco = 100 − dépassement moyen par mesure.</p>
   </div>
  </div>
 </div><!-- Fermeture de la ligne. -->
 <div id="al"></div><!-- JavaScript ajoute ici la liste des alertes. -->
</section>

<?php if ($peutExpliquer) : ?>
<!-- ========== MON PROFIL ========== -->
<section class="page" id="profil">
 <h1 class="t">Mon profil</h1>

 <div class="card prof-main">
  <h2 class="prof-title">Vos informations</h2>

  <div class="prof-layout">

   <!-- Gauche : photo -->
   <div class="prof-left">
    <div class="prof-avatar">
     <?php if ($photoUrl) : ?>
      <img src="<?= htmlspecialchars($photoUrl) ?>" alt="Photo de profil">
     <?php else : ?>
      <?= htmlspecialchars($initiales) ?>
     <?php endif; ?>
     <button type="button" id="btn-choisir-photo" class="avatar-edit" aria-label="Changer la photo de profil" title="Changer la photo">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
     </button>
    </div>
    <input type="file" id="photo-input" accept="image/png,image/jpeg,image/webp" hidden>
    <?php if ($photoUrl) : ?>
    <form action="php/upload_photo.php" method="POST">
     <button type="submit" name="supprimer" value="1" class="link-btn">Supprimer la photo</button>
    </form>
    <?php endif; ?>
   </div>

   <!-- Droite : informations personnelles, en face de la photo -->
   <div class="prof-right">
    <dl class="info-list">
     <div><dt>Prénom</dt><dd><?= htmlspecialchars($profil['prenom'] ?? ($_SESSION['prenom'] ?? '')) ?></dd></div>
     <div><dt>Nom</dt><dd><?= htmlspecialchars($profil['nom'] ?? ($_SESSION['nom'] ?? '')) ?></dd></div>
     <div>
      <dt>Nom d’utilisateur</dt>
      <dd><?= htmlspecialchars($profil['username'] ?? ($_SESSION['username'] ?? '')) ?> <button type="button" class="link-btn" data-bs-toggle="modal" data-bs-target="#modalUser">Modifier</button></dd>
     </div>
     <div><dt>E-mail</dt><dd><?= htmlspecialchars($profil['email'] ?? '—') ?></dd></div>
     <div>
      <dt>Mot de passe</dt>
      <dd>•••••••••• <button type="button" class="link-btn" data-bs-toggle="modal" data-bs-target="#modalMdp">Modifier</button></dd>
     </div>
    </dl>
   </div>

  </div>
 </div>

 <!-- Mesures ajoutées -->
 <div class="card prof-wide">
  <h2>Mes bâtiments ajoutés</h2>
  <p class="sub">Les bâtiments que vous avez enregistrés depuis le bouton « Ajouter un bâtiment »</p>
  <?php if (empty($mesAjouts)) : ?>
   <p class="empty">Vous n’avez encore ajouté aucun bâtiment.</p>
  <?php else : ?>
   <div class="table-responsive">
    <table class="table table-hover align-middle mb-0">
     <thead>
      <tr><th>BÂTIMENT</th><th>RESSOURCE</th><th>VALEUR</th><th>SEUIL</th><th>DATE</th><th>STATUT</th></tr>
     </thead>
     <tbody>
      <?php foreach ($mesAjouts as $a) : $enAlerte = (float)$a['valeur'] > (float)$a['seuil']; ?>
      <tr>
       <td><?= htmlspecialchars(str_replace('_', ' ', $a['batiment'])) ?></td>
       <td><?= htmlspecialchars($resFr[$a['ressource']] ?? $a['ressource']) ?></td>
       <td><?= number_format((float)$a['valeur'], 1) ?></td>
       <td><?= number_format((float)$a['seuil'], 1) ?></td>
       <td><?= date('d/m/Y', strtotime($a['date_mesure'])) ?></td>
       <td><span class="pill <?= $enAlerte ? 'a' : '' ?>"><?= $enAlerte ? 'Alerte' : 'Ok' ?></span></td>
      </tr>
      <?php endforeach; ?>
     </tbody>
    </table>
   </div>
  <?php endif; ?>
 </div>
</section>
<?php endif; ?>

<!-- ========== LOGIN ========== -->
<section class="page" id="login">
 <div class="hero flex flex-col items-center justify-center text-center"><!-- tailwind-->
  <i class="orb o1"></i><i class="orb o2"></i>
  <h1 class="ttl"><span style="--i:0">E</span><span style="--i:1">c</span><span style="--i:2">o</span><span class="g" style="--i:3">C</span><span class="g" style="--i:4">a</span><span class="g" style="--i:5">m</span><span class="g" style="--i:6">p</span><span class="g" style="--i:7">u</span><span class="g" style="--i:8">s</span></h1>
  <div class="bar"></div>
  <div class="card login">
   <div class="logo" style="justify-content:center;margin-bottom:14px"><i><svg viewBox="0 0 24 24"><path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14zM5 19l7-7"/></svg></i></div>
   <h2>Bienvenue</h2>
   <p class="sub" style="margin-bottom:26px">Connectez-vous pour accéder à votre compte</p>

   <form id="form-login" action="php/login.php" method="POST">
    <label for="login-user" class="block text-left font-medium text-green-200 mb-1">Nom d’utilisateur ou e-mail <!-- tailwind-->
     <input type="text" id="login-user" name="identifiant"  class="block w-full rounded-full border border-green-900 bg-[#0a1a14] text-green-100 placeholder-green-300/60 px-6 py-3 mt-1 mb-4 font-medium focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" placeholder="votrenom@gmail.com" required></label><!-- tailwind-->
    <label for="login-pass" class="block text-left font-medium text-green-200 mb-1">Mot de passe<!-- tailwind-->
     <input type="password" id="login-pass" name="mot_de_passe"  class="block w-full rounded-full border border-green-900 bg-[#0a1a14] text-green-100 placeholder-green-300/60 px-6 py-3 mt-1 mb-4 font-medium focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" placeholder="Entrez mot de passe" required></label><!-- tailwind-->
    <button type="submit" class="block w-full rounded-full bg-[#0f3d2a] text-[#c8f7a0] font-semibold text-center px-6 py-3 mt-1 cursor-pointer transition hover:bg-[#14543a] focus:outline-none focus:ring-2 focus:ring-green-500">Se connecter</button><!-- tailwind-->
   </form>
   
   <div class="login-links" style="margin-top: 15px;">
     <p><a href="#forgot-password">Mot de passe oublié ?</a></p>
     <p style="margin-top: 6px;">Vous n'avez pas de compte ? <a href="#register">S'inscrire</a></p>
   </div>
  </div>
 </div>
</section>
<!-- ========== PAGE D'INSCRIPTION ========== -->
<section class="page" id="register">
 <div class="hero !flex !flex-col !items-center !justify-center text-center">
  <i class="orb o1"></i><i class="orb o2"></i>
  <h1 class="ttl"><span style="--i:0">E</span><span style="--i:1">c</span><span style="--i:2">o</span><span class="g" style="--i:3">C</span><span class="g" style="--i:4">a</span><span class="g" style="--i:5">m</span><span class="g" style="--i:6">p</span><span class="g" style="--i:7">u</span><span class="g" style="--i:8">s</span></h1>
  <div class="bar"></div>
  <div class="card login" style="max-width: 520px;">
   <div class="logo" style="justify-content:center;margin-bottom:14px"><i><svg viewBox="0 0 24 24"><path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14zM5 19l7-7"/></svg></i></div>
   <h2>Créer un compte</h2>
   <p class="sub" style="margin-bottom:26px">Rejoignez EcoCampus dès maintenant</p>

   <form id="form-register" action="php/register.php" method="POST">
    <label for="nom" class="block text-left font-medium text-green-200 mb-1">Nom
     <input type="text" id="nom" name="nom" class="block w-full rounded-full border border-green-900 bg-[#0a1a14] text-green-100 placeholder-green-300/60 px-6 py-3 mt-1 mb-4 font-medium focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" placeholder="Votre nom" required></label>
    <label for="prenom" class="block text-left font-medium text-green-200 mb-1">Prénom
     <input type="text" id="prenom" name="prenom" class="block w-full rounded-full border border-green-900 bg-[#0a1a14] text-green-100 placeholder-green-300/60 px-6 py-3 mt-1 mb-4 font-medium focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" placeholder="Votre prénom" required></label>
    <label for="username" class="block text-left font-medium text-green-200 mb-1">Nom d'utilisateur
     <input type="text" id="username" name="username" class="block w-full rounded-full border border-green-900 bg-[#0a1a14] text-green-100 placeholder-green-300/60 px-6 py-3 mt-1 mb-4 font-medium focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" placeholder="Votre nom d'utilisateur" required></label>
    <label for="email" class="block text-left font-medium text-green-200 mb-1">Adresse email
     <input type="email" id="email" name="email" class="block w-full rounded-full border border-green-900 bg-[#0a1a14] text-green-100 placeholder-green-300/60 px-6 py-3 mt-1 mb-4 font-medium focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" placeholder="exemple@gmail.com" required></label>
    <label for="password" class="block text-left font-medium text-green-200 mb-1">Mot de passe
     <input type="password" id="password" name="mot_de_passe" class="block w-full rounded-full border border-green-900 bg-[#0a1a14] text-green-100 placeholder-green-300/60 px-6 py-3 mt-1 mb-4 font-medium focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" placeholder="Créer un mot de passe (min. 8 caractères)" minlength="8" required></label>
    <label for="confirm-password" class="block text-left font-medium text-green-200 mb-1">Confirmer le mot de passe
     <input type="password" id="confirm-password" name="confirmation" class="block w-full rounded-full border border-green-900 bg-[#0a1a14] text-green-100 placeholder-green-300/60 px-6 py-3 mt-1 mb-4 font-medium focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" placeholder="Confirmer votre mot de passe" minlength="8" required></label>
    <button type="submit" class="block w-full rounded-full bg-[#0f3d2a] text-[#c8f7a0] font-semibold text-center px-6 py-3 mt-1 cursor-pointer transition hover:bg-[#14543a] focus:outline-none focus:ring-2 focus:ring-green-500">Créer mon compte</button>
   </form>
   
   <div class="login-links" style="margin-top: 15px;">
     <p>Vous avez déjà un compte ? <a href="#login">Se connecter</a></p>
   </div>
  </div>
 </div>
</section>

<!-- ========== PAGE MOT DE PASSE OUBLIE ========== -->
<section class="page" id="forgot-password">
 <div class="hero !flex !flex-col !items-center !justify-center text-center">
  <i class="orb o1"></i><i class="orb o2"></i>
  <h1 class="ttl"><span style="--i:0">E</span><span style="--i:1">c</span><span style="--i:2">o</span><span class="g" style="--i:3">C</span><span class="g" style="--i:4">a</span><span class="g" style="--i:5">m</span><span class="g" style="--i:6">p</span><span class="g" style="--i:7">u</span><span class="g" style="--i:8">s</span></h1>
  <div class="bar"></div>
  <div class="card login">
   <div class="logo" style="justify-content:center;margin-bottom:14px"><i><svg viewBox="0 0 24 24"><path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14zM5 19l7-7"/></svg></i></div>
   <h2>Mot de passe oublié ?</h2>
   <p class="sub" style="margin-bottom:26px">Entrez votre adresse e-mail pour recevoir un code de vérification.</p>

   <form action="php/forgot_password.php" method="POST">
    <label for="reset-email" class="d-block text-start fw-medium">Adresse e-mail
     <input type="email" id="reset-email" name="email" class="block w-full rounded-full border border-green-900 bg-[#0a1a14] text-green-100 placeholder-green-300/60 px-6 py-3 mt-1 mb-4 font-medium focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" placeholder="exemple@gmail.com" required></label>
    <button type="submit" class="block w-full rounded-full bg-[#0f3d2a] text-[#c8f7a0] font-semibold text-center px-6 py-3 mt-1 cursor-pointer transition hover:bg-[#14543a] focus:outline-none focus:ring-2 focus:ring-green-500">Envoyer le code</button>
   </form>
   
   <div class="login-links" style="margin-top: 15px;">
     <p><a href="#login">Retour à la connexion</a></p>
   </div>
  </div>
 </div>
</section>

<!-- ========== PAGE DE VERIFICATION DU CODE ========== -->
<section class="page" id="verify-code">
 <div class="hero flex flex-col items-center justify-center text-center">
  <i class="orb o1"></i><i class="orb o2"></i>
  <h1 class="ttl"><span style="--i:0">E</span><span style="--i:1">c</span><span style="--i:2">o</span><span class="g" style="--i:3">C</span><span class="g" style="--i:4">a</span><span class="g" style="--i:5">m</span><span class="g" style="--i:6">p</span><span class="g" style="--i:7">u</span><span class="g" style="--i:8">s</span></h1>
  <div class="bar"></div>
  <div class="card login">
   <div class="logo" style="justify-content:center;margin-bottom:14px"><i><svg viewBox="0 0 24 24"><path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14zM5 19l7-7"/></svg></i></div>
   <h2>Vérification du code</h2>
   <p class="sub" style="margin-bottom:26px">Entrez le code à 6 chiffres envoyé à votre adresse e-mail.</p>

   <form action="php/verify_code.php" method="POST">
    <label for="code" class="d-block text-start fw-medium">Code de vérification
     <input type="text" id="code" name="code" class="block w-full rounded-full border border-green-900 bg-[#0a1a14] text-green-100 placeholder-green-300/60 px-6 py-3 mt-1 mb-4 font-medium focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" placeholder="Exemple : 123456" maxlength="6" pattern="[0-9]{6}" inputmode="numeric" required></label>
    <button type="submit" class="block w-full rounded-full bg-[#0f3d2a] text-[#c8f7a0] font-semibold text-center px-6 py-3 mt-1 cursor-pointer transition hover:bg-[#14543a] focus:outline-none focus:ring-2 focus:ring-green-500">Vérifier le code</button>
   </form>
   
   <div class="login-links" style="margin-top: 15px;">
     <p><a href="#login">Retour à la connexion</a></p>
   </div>
  </div>
 </div>
</section>

<!-- ========== PAGE DE REINITIALISATION DU MOT DE PASSE ========== -->
<section class="page" id="reset-password">
 <div class="hero d-flex flex-column align-items-center justify-content-center text-center">
  <i class="orb o1"></i><i class="orb o2"></i>
  <h1 class="ttl"><span style="--i:0">E</span><span style="--i:1">c</span><span style="--i:2">o</span><span class="g" style="--i:3">C</span><span class="g" style="--i:4">a</span><span class="g" style="--i:5">m</span><span class="g" style="--i:6">p</span><span class="g" style="--i:7">u</span><span class="g" style="--i:8">s</span></h1>
  <div class="bar"></div>
  <div class="card login">
   <div class="logo" style="justify-content:center;margin-bottom:14px"><i><svg viewBox="0 0 24 24"><path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14zM5 19l7-7"/></svg></i></div>
   <h2>Nouveau mot de passe</h2>
   <p class="sub" style="margin-bottom:26px">Veuillez choisir un nouveau mot de passe.</p>

   <form action="php/reset_password.php" method="POST">
    <label for="new-password" class="d-block text-start fw-medium">Nouveau mot de passe
     <input type="password" id="new-password" name="nouveau_mot_de_passe" class="form-control rounded-pill px-4 py-3 mt-1 mb-3 fw-medium" placeholder="Minimum 8 caractères" minlength="8" required></label>
    <label for="confirm-password-reset" class="d-block text-start fw-medium">Confirmer le mot de passe
     <input type="password" id="confirm-password-reset" name="confirmation" class="form-control rounded-pill px-4 py-3 mt-1 mb-3 fw-medium" placeholder="Confirmer le mot de passe" minlength="8" required></label>
    <button type="submit" class="btn btn-eco w-100 mt-1">Modifier le mot de passe</button>
   </form>
   
   <div class="login-links" style="margin-top: 15px;">
     <p><a href="#login">Retour à la connexion</a></p>
   </div>
  </div>
 </div>
</section>

<!-- Fenêtre Modale d'ajout de bâtiment -->
<div class="modal fade" id="modalAjout" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content" style="background: var(--card); color: var(--ink); border-radius: 28px; border: 1px solid var(--line);">
      <div class="modal-header border-0 pb-0">
        <h5 class="modal-title" style="font-weight: 600;">Ajouter un bâtiment</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body pt-3">
        <form id="form-ajout-bat" action="php/ajouter_mesure.php" method="POST">
          <div class="mb-3 text-start">
            <label class="form-label fw-medium" style="font-size: 14px;">Nom du bâtiment</label>
            <input type="text" id="new-bat" name="batiment" class="form-control rounded-pill px-3 py-2" placeholder="Ex: Bibliothèque" required>
          </div>
          <div class="mb-3 text-start">
            <label class="form-label fw-medium" style="font-size: 14px;">Ressource</label>
            <input type="text" id="new-res" name="ressource" class="form-control rounded-pill px-3 py-2" placeholder="Ex: électricité" required>
          </div>
          <div class="mb-3 text-start">
            <label class="form-label fw-medium" style="font-size: 14px;">Valeur mesurée</label>
            <input type="number" step="0.1" id="new-val" name="valeur" class="form-control rounded-pill px-3 py-2" placeholder="150.5" required>
          </div>
          <button type="submit" class="btn btn-eco w-100 mt-2" style="border-radius: 25px; padding: 12px;">Enregistrer le bâtiment</button>
        </form>
      </div>
    </div>
  </div>
</div>
<?php if ($peutExpliquer) : ?>
<!-- Fenêtre : modifier le nom d'utilisateur -->
<div class="modal fade" id="modalUser" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content modal-eco">
      <div class="modal-header border-0 pb-0">
        <h5 class="modal-title" style="font-weight:600">Modifier le nom d’utilisateur</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
      </div>
      <div class="modal-body pt-3">
        <form action="php/changer_username.php" method="POST" class="pw-form">
          <input type="text" id="new-username" name="username" class="form-control rounded-pill px-4 py-2"
                 value="<?= htmlspecialchars($profil['username'] ?? '') ?>"
                 placeholder="Nouveau nom d’utilisateur" minlength="3" maxlength="30"
                 pattern="[A-Za-z0-9._\-]{3,30}" autocomplete="username" required>
          <p class="prof-hint" style="margin:0">3 à 30 caractères : lettres, chiffres, point, tiret ou underscore (pas d’espace ni de @).</p>
          <button type="submit" class="btn btn-eco w-100">Enregistrer</button>
        </form>
      </div>
    </div>
  </div>
</div>

<!-- Fenêtre : ajuster la photo de profil -->
<div class="modal fade" id="modalCrop" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content modal-eco">
      <div class="modal-header border-0 pb-0">
        <h5 class="modal-title" style="font-weight:600">Ajuster la photo</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
      </div>
      <div class="modal-body pt-3 text-center">
        <div class="crop-stage" id="crop-stage">
          <img id="crop-img" alt="">
          <div class="crop-box" id="crop-box">
            <span class="crop-circle"></span>
            <span class="crop-grid"></span>
            <i class="crop-h nw" data-c="nw"></i>
            <i class="crop-h ne" data-c="ne"></i>
            <i class="crop-h sw" data-c="sw"></i>
            <i class="crop-h se" data-c="se"></i>
          </div>
        </div>
        <p class="prof-hint">Déplacez le cadre ou tirez sur ses coins pour choisir la zone visible.</p>
        <div class="crop-actions">
          <button type="button" class="btn btn-eco-light" data-bs-dismiss="modal">Annuler</button>
          <button type="button" class="btn btn-eco" id="crop-ok">Valider</button>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- Fenêtre : modifier le mot de passe -->
<div class="modal fade" id="modalMdp" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content modal-eco">
      <div class="modal-header border-0 pb-0">
        <h5 class="modal-title" style="font-weight:600">Modifier le mot de passe</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
      </div>
      <div class="modal-body pt-3">

        <div id="mdp-change">
          <form action="php/changer_mot_de_passe.php" method="POST" class="pw-form">
            <input type="password" name="mot_de_passe_actuel" class="form-control rounded-pill px-4 py-2" placeholder="Mot de passe actuel" autocomplete="current-password" required>
            <input type="password" name="nouveau_mot_de_passe" class="form-control rounded-pill px-4 py-2" placeholder="Nouveau mot de passe (8 caractères min.)" minlength="8" autocomplete="new-password" required>
            <input type="password" name="confirmation" class="form-control rounded-pill px-4 py-2" placeholder="Confirmer le nouveau mot de passe" minlength="8" autocomplete="new-password" required>
            <button type="submit" class="btn btn-eco w-100">Modifier le mot de passe</button>
          </form>
          <p class="mdp-forgot"><button type="button" class="link-btn" id="mdp-oublie">Mot de passe actuel oublié ?</button></p>
        </div>

        <div id="mdp-forgot" hidden>
          <p style="margin:0 0 18px">Pas de souci : nous allons envoyer un code de vérification à <strong><?= htmlspecialchars($profil['email'] ?? '') ?></strong>.
             Une fois le code saisi, vous pourrez choisir un nouveau mot de passe sans indiquer l’ancien.</p>
          <form action="php/forgot_password.php" method="POST">
            <input type="hidden" name="email" value="<?= htmlspecialchars($profil['email'] ?? '') ?>">
            <button type="submit" class="btn btn-eco w-100">Envoyer le code par e-mail</button>
          </form>
          <p class="mdp-forgot"><button type="button" class="link-btn" id="mdp-retour">← Retour</button></p>
        </div>

      </div>
    </div>
  </div>
</div>
<?php endif; ?>

</div>
<!-- Vérifier si l'utilisateur est connecté et transmettre son état au JavaScript -->
<script>
    window.userIsLoggedIn = <?= isset($_SESSION['user_id']) ? 'true' : 'false' ?>;
</script>

<?php if ($flash || $nouvelleAlerte) : ?>
<div class="notif-stack">

  <?php if ($flash) : ?>
  <div class="notif <?= $flashType === 'error' ? 'is-error' : 'is-success' ?>" data-notif data-duration="4500"
       style="--dur:4.5s" role="<?= $flashType === 'error' ? 'alert' : 'status' ?>">
    <span class="notif-icon" aria-hidden="true"><?= $flashType === 'error' ? '✕' : '✓' ?></span>
    <div class="notif-text"><span><?= htmlspecialchars($flash) ?></span></div>
    <button type="button" class="notif-close" aria-label="Fermer">×</button>
    <i class="notif-bar"></i>
  </div>
  <?php endif; ?>

  <?php if ($nouvelleAlerte) : ?>
  <div class="notif is-alert" data-notif data-duration="7000" style="--dur:7s" role="alert">
    <span class="notif-icon" aria-hidden="true">⚠</span>
    <div class="notif-text">
      <strong>Nouvelle anomalie détectée</strong>
      <span>
        <?= htmlspecialchars($nouvelleAlerte['batiment']) ?> (<?= htmlspecialchars($nouvelleAlerte['ressource']) ?>) :
        <?= number_format($nouvelleAlerte['valeur'], 1) ?> pour un seuil de <?= number_format($nouvelleAlerte['seuil'], 1) ?>
        (+<?= $nouvelleAlerte['pct'] ?> %)
      </span>
    </div>
    <button type="button" class="notif-close" aria-label="Fermer">×</button>
    <i class="notif-bar"></i>
  </div>
  <?php endif; ?>

</div>
<?php endif; ?>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
<script src="chatbot.js"></script>
<script src="index.js"></script>
</body>
</html>