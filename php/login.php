<?php
session_start();

require_once('database.php');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $identifiant = trim($_POST['identifiant'] ?? '');
    $mot_de_passe = $_POST['mot_de_passe'] ?? '';

    // Vérifier que les champs ne sont pas vides
    if (empty($identifiant) || empty($mot_de_passe)) {
        $_SESSION['message'] = "Veuillez remplir tous les champs.";
        header('Location: ../index.php#login');
        exit();
    }

    // Rechercher l'utilisateur par username ou email
    $requete = $bdd->prepare(
        "SELECT * FROM utilisateurs
         WHERE username = ? OR email = ?
         LIMIT 1"
    );

    $requete->execute([$identifiant, $identifiant]);

    $utilisateur = $requete->fetch(PDO::FETCH_ASSOC);

    // Vérifier si l'utilisateur existe et si le mot de passe est correct
    if ($utilisateur && password_verify($mot_de_passe, $utilisateur['mot_de_passe'])) {

        // Créer une session pour l'utilisateur connecté
        session_regenerate_id(true);

        $_SESSION['user_id'] = $utilisateur['id'];
        $_SESSION['username'] = $utilisateur['username'];
        $_SESSION['nom'] = $utilisateur['nom'];
        $_SESSION['prenom'] = $utilisateur['prenom'];

        header('Location: ../index.php#dashboard');
        exit();

    } else {
        $_SESSION['message'] = "Nom d'utilisateur ou mot de passe incorrect.";
        header('Location: ../index.php#login');
        exit();
    }

} else {
    header('Location: ../index.php#login');
    exit();
}
?>