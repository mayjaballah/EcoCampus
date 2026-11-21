<?php

session_start();

require_once __DIR__ . '/database.php';

// Redirection vers la page d'inscription en cas d'erreur
function retourInscription($message, $type = 'error')
{
    $_SESSION['flash'] = $message;
    $_SESSION['flash_type'] = $type;

    header('Location: ../index.php#register');
    exit();
}

// Vérifier que le formulaire a été envoyé
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../index.php#register');
    exit();
}

// Vérifier le token de sécurité
$csrf = $_POST['csrf'] ?? '';

if (
    empty($_SESSION['csrf']) ||
    !hash_equals($_SESSION['csrf'], $csrf)
) {
    retourInscription("Formulaire invalide. Veuillez réessayer.");
}

// Récupérer les données du formulaire
$nom = trim($_POST['nom'] ?? '');
$prenom = trim($_POST['prenom'] ?? '');
$username = trim($_POST['username'] ?? '');
$email = trim($_POST['email'] ?? '');
$mot_de_passe = $_POST['mot_de_passe'] ?? '';
$confirmation = $_POST['confirmation'] ?? '';

// Vérifier les champs obligatoires
if (
    $nom === '' ||
    $prenom === '' ||
    $username === '' ||
    $email === '' ||
    $mot_de_passe === '' ||
    $confirmation === ''
) {
    retourInscription("Veuillez remplir tous les champs.");
}

// Vérifier l'adresse email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    retourInscription("Adresse email invalide.");
}

// Vérifier le username
if (!preg_match('/^[A-Za-z0-9._-]{3,30}$/', $username)) {
    retourInscription("Nom d'utilisateur invalide.");
}

// Vérifier la longueur du mot de passe
if (strlen($mot_de_passe) < 8) {
    retourInscription("Le mot de passe doit contenir au moins 8 caractères.");
}

// Vérifier la confirmation
if ($mot_de_passe !== $confirmation) {
    retourInscription("Les mots de passe ne correspondent pas.");
}

try {

    // Vérifier si le username ou l'email existe déjà
    $verifier = $bdd->prepare(
        "SELECT id FROM utilisateurs
         WHERE username = ? OR email = ?"
    );

    $verifier->execute([$username, $email]);

    if ($verifier->fetch()) {
        retourInscription(
            "Ce nom d'utilisateur ou cet email existe déjà."
        );
    }

    // Crypter le mot de passe
    $mot_de_passe_hash = password_hash(
        $mot_de_passe,
        PASSWORD_DEFAULT
    );

    // Ajouter le nouvel utilisateur
    $requete = $bdd->prepare(
        "INSERT INTO utilisateurs
        (nom, prenom, username, email, mot_de_passe)
        VALUES (?, ?, ?, ?, ?)"
    );

    $requete->execute([
        $nom,
        $prenom,
        $username,
        $email,
        $mot_de_passe_hash
    ]);

    // Inscription réussie : rediriger vers la connexion
    $_SESSION['flash'] = "Votre compte a été créé avec succès ! Vous pouvez vous connecter.";
    $_SESSION['flash_type'] = 'success';

    header('Location: ../index.php#login');
    exit();

} catch (PDOException $e) {

    // Enregistrer l'erreur dans le journal du serveur
    error_log("Erreur inscription : " . $e->getMessage());

    retourInscription(
        "Une erreur est survenue pendant la création du compte."
    );
}

?>
