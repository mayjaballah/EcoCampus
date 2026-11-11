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

$id = (int)$_SESSION['user_id'];
$nouveau = trim($_POST['username'] ?? '');

if (!preg_match('/^[A-Za-z0-9._-]{3,30}$/', $nouveau)) {
    retour("Nom d’utilisateur invalide : 3 à 30 caractères (lettres, chiffres, point, tiret, underscore), sans espace ni @.", 'error');
}

// Identique à l'actuel : rien à faire
$q = $bdd->prepare("SELECT username FROM utilisateurs WHERE id = ?");
$q->execute([$id]);
$actuel = (string)$q->fetchColumn();
if (strcasecmp($actuel, $nouveau) === 0 && $actuel === $nouveau) {
    retour("C’est déjà votre nom d’utilisateur.", 'error');
}

// Déjà utilisé par quelqu'un d'autre ?
$q = $bdd->prepare("SELECT id FROM utilisateurs WHERE username = ? AND id <> ?");
$q->execute([$nouveau, $id]);
if ($q->fetch()) {
    retour("Ce nom d’utilisateur est déjà pris.", 'error');
}

try {
    $bdd->prepare("UPDATE utilisateurs SET username = ? WHERE id = ?")->execute([$nouveau, $id]);
} catch (PDOException $e) {
    // cas de deux demandes simultanées (contrainte d'unicité de la base)
    retour("Ce nom d’utilisateur est déjà pris.", 'error');
}

$_SESSION['username'] = $nouveau;
retour("Votre nom d’utilisateur a été modifié.");