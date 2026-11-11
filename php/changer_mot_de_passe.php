<?php
session_start();
require_once __DIR__ . '/database.php';

if (!isset($_SESSION['user_id'])) {
    header('Location: ../index.php#login');
    exit();
}

function retour($texte, $type = 'success')
{
    $_SESSION['flash'] = $texte;
    $_SESSION['flash_type'] = $type;
    header('Location: ../index.php#profil');
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../index.php#profil');
    exit();
}

$actuel = $_POST['mot_de_passe_actuel'] ?? '';
$nouveau = $_POST['nouveau_mot_de_passe'] ?? '';
$confirmation = $_POST['confirmation'] ?? '';

$q = $bdd->prepare("SELECT mot_de_passe FROM utilisateurs WHERE id = ?");
$q->execute([$_SESSION['user_id']]);
$hash = $q->fetchColumn();

if (!$hash || !password_verify($actuel, $hash)) {
    retour("Le mot de passe actuel est incorrect.", 'error');
}
if (strlen($nouveau) < 8) {
    retour("Le nouveau mot de passe doit contenir au moins 8 caractères.", 'error');
}
if ($nouveau !== $confirmation) {
    retour("Les deux nouveaux mots de passe ne correspondent pas.", 'error');
}
if ($nouveau === $actuel) {
    retour("Le nouveau mot de passe doit être différent de l’ancien.", 'error');
}

$bdd->prepare("UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?")
    ->execute([password_hash($nouveau, PASSWORD_DEFAULT), $_SESSION['user_id']]);
session_regenerate_id(true);

retour("Votre mot de passe a été modifié avec succès.");