<?php

session_start();

require_once('database.php');
require_once('notif.php');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $nom = trim($_POST['nom'] ?? '');
    $prenom = trim($_POST['prenom'] ?? '');
    $username = trim($_POST['username'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $mot_de_passe = $_POST['mot_de_passe'] ?? '';
    $confirmation = $_POST['confirmation'] ?? '';

    // Vérifier que les mots de passe correspondent
    if ($mot_de_passe !== $confirmation) {
        notifier("Les mots de passe ne correspondent pas.", 'error');
        header('Location: ../index.php#register');
        exit();
    }

    // Vérifier la longueur du mot de passe
    if (strlen($mot_de_passe) < 8) {
        notifier("Le mot de passe doit contenir au moins 8 caractères.", 'error');
        header('Location: ../index.php#register');
        exit();
    }

    // Vérifier si le nom d'utilisateur ou l'email existe déjà
    $verifier = $bdd->prepare(
        "SELECT id FROM utilisateurs WHERE username = ? OR email = ?"
    );

    $verifier->execute([$username, $email]);

    if ($verifier->rowCount() > 0) {
        notifier("Ce nom d'utilisateur ou cet email existe déjà.", 'error');
        header('Location: ../index.php#register');
        exit();
    }

    // Crypter le mot de passe
    $mot_de_passe_hash = password_hash($mot_de_passe, PASSWORD_DEFAULT);

    // Insérer le nouvel utilisateur
    $requete = $bdd->prepare(
        "INSERT INTO utilisateurs (nom, prenom, username, email, mot_de_passe)
         VALUES (?, ?, ?, ?, ?)"
    );

    $requete->execute([
        $nom,
        $prenom,
        $username,
        $email,
        $mot_de_passe_hash
    ]);

    notifier("Votre compte a été créé avec succès ! Vous pouvez vous connecter.", 'success');

    header('Location: ../index.php#login');
    exit();

} else {
    header('Location: ../index.php#register');
    exit();
}

?>
