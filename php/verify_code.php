<?php

// Démarrer la session
session_start();

// Inclure la connexion à la base de données
require_once __DIR__ . '/database.php';

// Vérifier que le formulaire a été envoyé avec POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // Vérifier que l'utilisateur possède une adresse email dans la session
    if (!isset($_SESSION['email_reset'])) {
        $_SESSION['message'] = "Veuillez demander un nouveau code.";
        header('Location: ../index.php#forgot-password');
        exit();
    }

    // Récupérer le code saisi par l'utilisateur
    $code_saisi = trim($_POST['code'] ?? '');

    // Vérifier que le code contient exactement 6 chiffres
    if (!preg_match('/^[0-9]{6}$/', $code_saisi)) {
        $_SESSION['message'] = "Le code doit contenir 6 chiffres.";
        header('Location: ../index.php#verify-code');
        exit();
    }

    // Récupérer le code le plus récent qui n'a pas encore été utilisé
    // et qui n'est pas expiré
    $email = $_SESSION['email_reset'];

    $requete = $bdd->prepare(
        "SELECT * FROM password_resets
         WHERE email = ?
         AND utilise = 0
         AND expiration > NOW()
         ORDER BY id DESC
         LIMIT 1"
    );

    $requete->execute([$email]);

    // Récupérer l'enregistrement du code
    $reset = $requete->fetch(PDO::FETCH_ASSOC);

    // Vérifier si un code valide existe
    if (!$reset) {
        $_SESSION['message'] = "Le code a expiré ou n'existe plus. Demandez un nouveau code.";
        header('Location: ../index.php#forgot-password');
        exit();
    }

    // Vérifier si le nombre maximum de tentatives est atteint
    if ($reset['tentatives'] >= 5) {
        $_SESSION['message'] = "Nombre maximum de tentatives atteint. Demandez un nouveau code.";
        header('Location: ../index.php#forgot-password');
        exit();
    }

    // Comparer le code saisi avec le code crypté dans la base
    if (password_verify($code_saisi, $reset['code'])) {

        // Mémoriser l'identifiant du code vérifié
        $_SESSION['reset_id'] = $reset['id'];

        // Autoriser l'accès à la page de changement du mot de passe
        $_SESSION['code_verifie'] = true;

        // Rediriger vers la prochaine étape
        header('Location: ../index.php#reset-password');
        exit();

    } else {

        // Incrémenter le nombre de tentatives en cas de code incorrect
        $maj = $bdd->prepare(
            "UPDATE password_resets
             SET tentatives = tentatives + 1
             WHERE id = ?"
        );

        $maj->execute([$reset['id']]);

        // Afficher un message d'erreur
        $_SESSION['message'] = "Code incorrect. Veuillez réessayer.";

        // Rediriger vers la page de vérification
        header('Location: ../index.php#verify-code');
        exit();
    }

} else {

    // Rediriger si le fichier est ouvert directement
    header('Location: ../index.php#forgot-password');
    exit();
}

?>
