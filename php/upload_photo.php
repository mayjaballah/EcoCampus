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
    if (!empty($_POST['ajax'])) {                 // envoi depuis la fenêtre de recadrage
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $type === 'success']);
        exit();
    }
    header('Location: ../index.php#profil');
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../index.php#profil');
    exit();
}

$id = (int)$_SESSION['user_id'];
$dossier = __DIR__ . '/../uploads/avatars/';

$q = $bdd->prepare("SELECT photo FROM utilisateurs WHERE id = ?");
$q->execute([$id]);
$ancienne = (string)$q->fetchColumn();

function supprimerFichier($dossier, $nom)
{
    if ($nom !== '') {
        $chemin = $dossier . basename($nom);
        if (is_file($chemin)) {
            @unlink($chemin);
        }
    }
}

// Suppression de la photo
if (isset($_POST['supprimer'])) {
    $bdd->prepare("UPDATE utilisateurs SET photo = NULL WHERE id = ?")->execute([$id]);
    supprimerFichier($dossier, $ancienne);
    retour("Photo de profil supprimée.");
}

// Envoi d'une nouvelle photo
if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
    retour("Impossible d’envoyer la photo (2 Mo maximum).", 'error');
}
$fichier = $_FILES['photo'];
if ($fichier['size'] > 2 * 1024 * 1024) {
    retour("La photo est trop lourde (2 Mo maximum).", 'error');
}

$types = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
$mime = finfo_file(finfo_open(FILEINFO_MIME_TYPE), $fichier['tmp_name']);
if (!isset($types[$mime]) || @getimagesize($fichier['tmp_name']) === false) {
    retour("Format non accepté : utilisez une image JPG, PNG ou WebP.", 'error');
}

if (!is_dir($dossier) && !mkdir($dossier, 0755, true)) {
    retour("Impossible de créer le dossier uploads/avatars.", 'error');
}

$nom = 'u' . $id . '_' . bin2hex(random_bytes(4)) . '.' . $types[$mime];
if (!move_uploaded_file($fichier['tmp_name'], $dossier . $nom)) {
    retour("Impossible d’enregistrer la photo sur le serveur.", 'error');
}

$bdd->prepare("UPDATE utilisateurs SET photo = ? WHERE id = ?")->execute([$nom, $id]);
supprimerFichier($dossier, $ancienne);

retour("Photo de profil mise à jour.");