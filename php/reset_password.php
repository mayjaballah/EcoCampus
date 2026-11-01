<?php

session_start();
require_once __DIR__ . '/database.php';

// Vérifier que l'utilisateur a bien validé le code
if (!isset($_SESSION['code_verifie']) ||
    $_SESSION['code_verifie'] !== true ||
    !isset($_SESSION['reset_id'])) {

    $_SESSION['message'] = "Veuillez d'abord vérifier votre code.";
    header('Location: ../index.php#forgot-password');
    exit();
}

// Vérifier la méthode d'envoi
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../index.php#reset-password');
    exit();
}

$nouveau_mot_de_passe = $_POST['nouveau_mot_de_passe'] ?? '';
$confirmation = $_POST['confirmation'] ?? '';

// Vérifier les champs
if (strlen($nouveau_mot_de_passe) < 8) {
    $_SESSION['message'] = "Le mot de passe doit contenir au moins 8 caractères.";
    header('Location: ../index.php#reset-password');
    exit();
}

if ($nouveau_mot_de_passe !== $confirmation) {
    $_SESSION['message'] = "Les deux mots de passe ne correspondent pas.";
    header('Location: ../index.php#reset-password');
    exit();
}

// Vérifier que le code est toujours valide
$requete = $bdd->prepare(
    "SELECT * FROM password_resets
     WHERE id = ?
     AND utilise = 0
     AND expiration > NOW()"
);
$requete->execute([$_SESSION['reset_id']]);
$reset = $requete->fetch(PDO::FETCH_ASSOC);

if (!$reset) {
    $_SESSION['message'] = "Le code a expiré ou a déjà été utilisé. Demandez un nouveau code.";
    unset($_SESSION['reset_id'], $_SESSION['code_verifie'], $_SESSION['email_reset']);
    header('Location: ../index.php#forgot-password');
    exit();
}

// Hacher le nouveau mot de passe
$mot_de_passe_hash = password_hash($nouveau_mot_de_passe, PASSWORD_DEFAULT);

// Mettre à jour le mot de passe de l'utilisateur
$requete = $bdd->prepare(
    "UPDATE utilisateurs SET mot_de_passe = ? WHERE email = ?"
);
$requete->execute([$mot_de_passe_hash, $reset['email']]);

// Marquer le code comme utilisé
$requete = $bdd->prepare(
    "UPDATE password_resets SET utilise = 1 WHERE id = ?"
);
$requete->execute([$reset['id']]);

// Supprimer les informations de réinitialisation de la session
unset($_SESSION['reset_id'], $_SESSION['code_verifie'], $_SESSION['email_reset']);

$_SESSION['message'] = "Votre mot de passe a été modifié avec succès. Vous pouvez vous connecter.";

header('Location: ../index.php#login');
exit();

?>