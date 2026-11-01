<?php

// Importer la classe PHPMailer pour envoyer des emails
use PHPMailer\PHPMailer\PHPMailer;

// Démarrer la session
session_start();

// Inclure le fichier de connexion à la base de données
require_once __DIR__ . '/database.php';
// Inclure les informations confidentielles
require_once __DIR__ . '/config.php';

// Inclure les fichiers nécessaires de PHPMailer
require_once __DIR__ . '/../PHPMailer/src/Exception.php';
require_once __DIR__ . '/../PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/../PHPMailer/src/SMTP.php';


// Vérifier que le formulaire a été envoyé avec la méthode POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // Récupérer l'adresse e-mail et supprimer les espaces inutiles
    $email = trim($_POST['email'] ?? '');

    // Vérifier que l'e-mail n'est pas vide
    if (empty($email)) {
        $_SESSION['message'] = "Veuillez saisir votre adresse e-mail.";
        header('Location: ../index.php#forgot-password');
        exit();
    }

    // Vérifier si l'e-mail existe dans la table utilisateurs
    $requete = $bdd->prepare(
        "SELECT id FROM utilisateurs WHERE email = ?"
    );

    // Exécuter la requête avec l'adresse e-mail saisie
    $requete->execute([$email]);

    // Récupérer les informations de l'utilisateur
    $utilisateur = $requete->fetch(PDO::FETCH_ASSOC);

    // Si l'e-mail n'existe pas dans la base de données
    if (!$utilisateur) {
        $_SESSION['message'] = "Aucun compte associé à cette adresse e-mail.";
        header('Location: ../index.php#forgot-password');
        exit();
    }

    // Générer un code aléatoire de 6 chiffres
    $code = random_int(100000, 999999);

    // Crypter le code avant de le stocker dans la base de données
    $code_hash = password_hash((string)$code, PASSWORD_DEFAULT);

    // Définir une date d'expiration de 10 minutes
    $expiration = $bdd->query(
        "SELECT DATE_ADD(NOW(), INTERVAL 10 MINUTE)"
    )->fetchColumn();

    // Enregistrer le code dans la table password_resets
    $requete = $bdd->prepare(
        "INSERT INTO password_resets (email, code, expiration)
         VALUES (?, ?, ?)"
    );

    // Exécuter l'insertion
    $requete->execute([$email, $code_hash, $expiration]);

    // Récupérer l'identifiant de l'enregistrement créé
    $id_reset = $bdd->lastInsertId();


    // Essayer d'envoyer le code de vérification par Gmail
    try {

        // Créer un nouvel objet PHPMailer
        $mail = new PHPMailer(true);

        // Activer le protocole SMTP
        $mail->isSMTP();

        // Définir le serveur SMTP de Gmail
        $mail->Host = 'smtp.gmail.com';

        // Activer l'authentification SMTP
        $mail->SMTPAuth = true;

       // Récupérer les informations Gmail depuis config.php
        $mail->Username = GMAIL_USERNAME;
        $mail->Password = GMAIL_PASSWORD;

        // Définir l'adresse de l'expéditeur ,la personne ou l'application qui envoie le message.
        $mail->setFrom(GMAIL_USERNAME, 'EcoCampus');

        // Utiliser le chiffrement STARTTLS
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;

        // Définir le port SMTP de Gmail
        $mail->Port = 587;

        // Définir l'encodage des caractères
        $mail->CharSet = 'UTF-8';

        // Définir l'adresse et le nom de l'expéditeur
        $mail->setFrom('TON_EMAIL@gmail.com', 'EcoCampus');

        // Définir l'adresse e-mail du destinataire
        $mail->addAddress($email);

        // Activer l'envoi d'un message au format HTML
        $mail->isHTML(true);

        // Définir le sujet de l'e-mail
        $mail->Subject = 'Code de verification EcoCampus';

        // Définir le contenu HTML de l'e-mail
        $mail->Body = "
            <h2>EcoCampus</h2>
            <p>Voici votre code de vérification :</p>
            <h1>$code</h1>
            <p>Ce code est valable pendant 10 minutes.</p>
        ";

        // Définir une version texte pour les logiciels qui ne lisent pas le HTML
        $mail->AltBody = "Votre code de vérification est : $code.
                          Il est valable pendant 10 minutes.";

        // Envoyer l'e-mail
        $mail->send();


        // Mémoriser l'adresse e-mail pour l'étape de vérification
        $_SESSION['email_reset'] = $email;

        // Enregistrer un message de confirmation
        $_SESSION['message'] = "Un code de vérification a été envoyé à votre adresse e-mail.";

        // Rediriger vers la page de vérification du code
        header('Location: ../index.php#verify-code');
        exit();

    } catch (\Throwable $e) {

        // Si l'envoi échoue, supprimer le code enregistré dans la base
        $supprimer = $bdd->prepare(
            "DELETE FROM password_resets WHERE id = ?"
        );

        // Exécuter la suppression
        $supprimer->execute([$id_reset]);

        // Enregistrer un message d'erreur
        $_SESSION['message'] = "Erreur lors de l'envoi du code. Vérifiez la configuration Gmail.";

        // Rediriger vers le formulaire
        header('Location: ../index.php#forgot-password');
        exit();
    }

} else {

    // Si le formulaire n'a pas été envoyé avec POST,
    // rediriger l'utilisateur vers la page Mot de passe oublié
    header('Location: ../index.php#forgot-password');
    exit();
}

?>

