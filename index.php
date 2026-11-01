<?php
//pour l'inscription
session_start();

$message = $_SESSION['message'] ?? '';
unset($_SESSION['message']);

?>

<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>EcoCampus</title>
<link rel="stylesheet" href="style.css">
</head>
<body class="splashing">

<!-- Splash Screen / Animation de chargement -->
<div id="splash">
  <div class="sp-in">
    <h2>EcoCampus</h2>
    <p>Chargement des données...</p>
    <div class="sp-line"><b></b></div>
  </div>
</div>

<div class="wrap">
<header>
 <a class="logo" href="#dashboard">EcoCampus</a>
 <div class="right">
  <nav id="nav">
   <a href="#dashboard">Tableau de bord</a>
   <a href="#mesures">Mesures</a>
   <a href="#graphique">Graphique</a>
   <a href="#alertes">Alertes</a>
  </nav>
  <button class="round" id="theme" title="Mode sombre / clair">🌓</button>
  <button class="round" id="btn-pdf" title="Exporter en PDF">📄</button>
  <a href="#login" class="round" id="btn-user-login" title="Se connecter">👤</a>
 </div>
</header>

<!-- TABLEAU DE BORD -->
<section class="page" id="dashboard">
 <h1 class="t" id="range">Suivi de la consommation</h1>
 <div class="grid3">
  <div class="card total">
    <div class="lab">Consommation Totale</div>
    <div class="big" id="tot">0</div>
  </div>
  <div class="card avg">
    <div class="lab">Nombre d'Anomalies</div>
    <div class="big" id="nal" style="color:var(--bad);">0</div>
  </div>
  <div class="card alert">
    <div class="lab">Bâtiments gérés</div>
    <div class="big" id="nb-bat">0</div>
  </div>
  <a href="php/logout.php" class="btn-logout">
    Déconnexion
  </a>
 </div>

 <div class="grid2">
  <div class="card">
    <h2>Valeur vs Seuil</h2>
    <div id="bars"></div>
  </div>
  <div class="card">
    <h2>Anomalies détectées</h2>
    <div id="anos"></div>
  </div>
 </div>
</section>

<!-- GESTION DES MESURES -->
<section class="page" id="mesures">
 <h1 class="t">Gestion des Mesures</h1>
 <div class="filters">
   <select id="fb"><option value="">Tous les bâtiments</option></select>
   <select id="fr"><option value="">Toutes les ressources</option></select>
   <input id="fs" type="search" placeholder="Rechercher par bâtiment...">
   <button class="btn" id="btn-filter-alert" style="width:auto; padding:0 20px;">⚠️ Voir Alertes</button>
 </div>
 <div class="card">
   <div class="scroll">
     <table>
       <thead><tr><th>BÂTIMENT</th><th>RESSOURCE</th><th>VALEUR</th><th>SEUIL</th><th>DATE</th><th>STATUT</th></tr></thead>
       <tbody id="tb"></tbody>
     </table>
   </div>
 </div>
</section>

<!-- GRAPHIQUES DE SYNTHÈSE -->
<section class="page" id="graphique">
 <h1 class="t">Graphiques de Synthèse</h1>
 <div class="card">
   <h2>Consommation par bâtiment</h2>
   <p class="sub">Somme des mesures de chaque bâtiment</p>
   <div class="cols" id="cb"></div>
   <div class="names" id="nb"></div>
 </div>
 <div class="card" style="margin-top:26px">
   <h2>Par ressource</h2>
   <p class="sub">Somme des mesures de chaque ressource</p>
   <div id="rb"></div>
 </div>
</section>

<!-- CENTRE D'ALERTES -->
<section class="page" id="alertes">
 <h1 class="t">Centre d'Alertes</h1>
 <div class="grid3" style="grid-template-columns:1fr 2fr">
  <div class="card alert">
    <div class="lab">ALERTES ACTIVES</div>
    <div class="big" id="na2">0</div>
    <div id="na3">sur 0 mesures</div>
  </div>
  <div class="card total">
    <div class="lab">CONSOMMATION TOTALE</div>
    <div class="big" id="tot2" style="font-size:80px">0</div>
    <p style="color:#b4c0bc;position:relative;z-index:1">Une mesure est en alerte quand sa valeur dépasse son seuil.</p>
    <i class="c1"></i><i class="c2"></i>
  </div>
 </div>
 <div id="al" style="margin-top:20px;"></div>
</section>

<!-- PAGE DE LOGIN DESIGN ECOCAMPUS -->
<section class="page" id="login">
  <div class="login-card-custom">
    <div class="login-header-custom">
      <div style="font-size: 20px; font-weight: 600; margin-bottom: 15px;">🍃 EcoCampus</div>
      <h2>Bienvenue</h2>
      <p>Connectez-vous pour accéder à votre compte</p>
    </div>
    <div class="login-body-custom">
        <?php if (!empty($message)) : ?>
        <div class="message-success">
        <span class="message-icon">✓</span>
        <p><?= htmlspecialchars($message) ?></p>
        </div>
      <?php endif; ?>
      <form id="form-login" action="php/login.php" method="POST">
        <div class="login-field">
          <label for="login-user">Nom d'utilisateur ou e-mail</label>
          <input type="text" id="login-user" name="identifiant" placeholder="votrenom@gmail.com" required>
        </div>
        <div class="login-field">
          <label for="login-pass">Mot de passe</label>
          <input type="password" id="login-pass" name="mot_de_passe" placeholder="Entrez mot de passe" required>
        </div>
        <button type="submit" class="login-btn-custom">Se connecter</button>
      </form>
      <div class="login-links">
        <p><a href="#forgot-password">Mot de passe oublié ?</a></p>
        <p style="margin-top: 6px; color: #707e74;">Vous n'avez pas de compte ? <a href="#register">S'inscrire</a></p>
      </div>
    </div>
  </div>
</section>

<!-- PAGE D'INSCRIPTION -->
<section class="page" id="register">
  <div class="login-card-custom">
    <div class="login-header-custom">
      <div style="font-size: 20px; font-weight: 600; margin-bottom: 15px;">🍃 EcoCampus</div>
      <h2>Créer un compte</h2>
      <p>Rejoignez EcoCampus dès maintenant</p>
    </div>

    <div class="login-body-custom">
        <?php if (!empty($message)) : ?>
            <p style="text-align:center; color:#198754; margin-bottom:15px;">
            <?= htmlspecialchars($message) ?>
            </p>
        <?php endif; ?>
      <form id="form-register" action="php/register.php" method="POST">

        <div class="login-field">
          <label for="nom">Nom</label>
          <input type="text" id="nom" name="nom" placeholder="Votre nom" required>
        </div>

        <div class="login-field">
          <label for="prenom">Prénom</label>
          <input type="text" id="prenom" name="prenom" placeholder="Votre prénom" required>
        </div>

        <div class="login-field">
          <label for="username">Nom d'utilisateur</label>
          <input type="text" id="username" name="username" placeholder="Votre nom d'utilisateur" required>
        </div>

        <div class="login-field">
          <label for="email">Adresse email</label>
          <input type="email" id="email" name="email" placeholder="exemple@gmail.com" required>
        </div>

        <div class="login-field">
          <label for="password">Mot de passe</label>
          <input type="password" id="password" name="mot_de_passe" placeholder="Créer un mot de passe" minlength="8" required>
        </div>

        <div class="login-field">
          <label for="confirm-password">Confirmer le mot de passe</label>
          <input type="password" id="confirm-password" name="confirmation" placeholder="Confirmer votre mot de passe" minlength="8" required>
        </div>

        <button type="submit" class="login-btn-custom">Créer mon compte</button>
      </form>

      <div class="login-links">
        <p>Vous avez déjà un compte ? <a href="#login">Se connecter</a></p>
      </div>
    </div>
  </div>
</section>

<!-- PAGE MOT DE PASSE OUBLIE -->
<section class="page" id="forgot-password">
    <div class="login-card-custom">
        <div class="login-header-custom">
            <div style="font-size: 20px; font-weight: 600; margin-bottom: 15px;">
                🍃 EcoCampus
            </div>
            <h2>Mot de passe oublié ?</h2>
            <p>Entrez votre adresse e-mail pour recevoir un code de vérification.</p>
        </div>
        <div class="login-body-custom">
            <?php if (!empty($message)) : ?>
                <div class="message-success">
                    <span class="message-icon">✓</span>
                    <p><?= htmlspecialchars($message) ?></p>
                </div>
            <?php endif; ?>
            <form action="php/forgot_password.php" method="POST">
                <div class="login-field">
                    <label for="reset-email">Adresse e-mail</label>
                    <input
                        type="email"
                        id="reset-email"
                        name="email"
                        placeholder="exemple@gmail.com"
                        required
                    >
                </div>
                <button type="submit" class="login-btn-custom">
                    Envoyer le code
                </button>
            </form>
            <div class="login-links">
                <p><a href="#login">Retour à la connexion</a></p>
            </div>
        </div>
    </div>
</section>

<!-- Page de vérification du code -->
<section class="page" id="verify-code">
    <div class="login-card-custom">
        <div class="login-header-custom">
            <div style="font-size: 20px; font-weight: 600; margin-bottom: 15px;">
                🍃 EcoCampus
            </div>
            <h2>Vérification du code</h2>
            <p>
                Entrez le code à 6 chiffres envoyé à votre adresse e-mail.
            </p>
        </div>
        <div class="login-body-custom">
            <form action="php/verify_code.php" method="POST">
                <div class="login-field">
                    <label for="code">Code de vérification</label>
                    <input
                        type="text"
                        id="code"
                        name="code"
                        placeholder="Exemple : 123456"
                        maxlength="6"
                        pattern="[0-9]{6}"
                        inputmode="numeric"
                        required
                    >
                </div>
                <button type="submit" class="login-btn-custom">
                    Vérifier le code
                </button>
            </form>
        </div>
    </div>
</section>

<!-- Page de réinitialisation du mot de passe -->
<section class="page" id="reset-password">
    <div class="login-card-custom">
        <div class="login-header-custom">
            <div style="font-size: 20px; font-weight: 600; margin-bottom: 15px;">
                🍃 EcoCampus
            </div>
            <h2>Nouveau mot de passe</h2>
            <p>Veuillez choisir un nouveau mot de passe.</p>
        </div>
        <div class="login-body-custom">
            <form action="php/reset_password.php" method="POST">
                 <div class="login-field">
                    <label for="new-password">Nouveau mot de passe</label>
                    <input
                        type="password"
                        id="new-password"
                        name="nouveau_mot_de_passe"
                        placeholder="Minimum 8 caractères"
                        minlength="8"
                        required
                    >
                </div>
                <div class="login-field">
                    <label for="confirm-password">Confirmer le mot de passe</label>
                    <input
                        type="password"
                        id="confirm-password"
                        name="confirmation"
                        placeholder="Confirmer le mot de passe"
                        minlength="8"
                        required
                    >
                </div>
                <button type="submit" class="login-btn-custom">
                    Modifier le mot de passe
                </button>
            </form>
        </div>
    </div>
</section>

</div>
<!-- Vérifier si l'utilisateur est connecté et transmettre son état au JavaScript -->
<script>
    window.userIsLoggedIn = <?= isset($_SESSION['user_id']) ? 'true' : 'false' ?>;
</script>
<script src="index.js"></script>

</body>
</html>
