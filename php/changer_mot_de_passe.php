<?php

session_start();

require_once __DIR__ . '/database.php';

// Retourner au profil avec une notification
function retourMotDePasse($message, $type = 'success')
{
    $_SESSION['flash'] = $message;
    $_SESSION['flash_type'] = $type;

    header('Location: ../index.php#profil');
    exit();
}

// Vérifier que l'utilisateur est connecté
if (!isset($_SESSION['user_id'])) {
    header('Location: ../index.php#login');
    exit();
}

// Vérifier la méthode d'envoi
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../index.php#profil');
    exit();
}

// Vérifier le token de sécurité
$csrf = $_POST['csrf'] ?? '';

if (
    empty($_SESSION['csrf']) ||
    !hash_equals($_SESSION['csrf'], $csrf)
) {
    retourMotDePasse("Formulaire invalide. Veuillez réessayer.", 'error');
}

// Récupérer les données
$id = (int) $_SESSION['user_id'];

$actuel = $_POST['mot_de_passe_actuel'] ?? '';
$nouveau = $_POST['nouveau_mot_de_passe'] ?? '';
$confirmation = $_POST['confirmation'] ?? '';

// Vérifier que les champs sont remplis
if ($actuel === '' || $nouveau === '' || $confirmation === '') {
    retourMotDePasse("Veuillez remplir tous les champs.", 'error');
}

try {

    // Récupérer le mot de passe actuel dans la base
    $q = $bdd->prepare(
        "SELECT mot_de_passe FROM utilisateurs WHERE id = ?"
    );

    $q->execute([$id]);

    $hash = $q->fetchColumn();

    // Vérifier l'ancien mot de passe
    if (!$hash || !password_verify($actuel, $hash)) {
        retourMotDePasse(
            "Le mot de passe actuel est incorrect.",
            'error'
        );
    }

    // Vérifier la longueur du nouveau mot de passe
    if (strlen($nouveau) < 8) {
        retourMotDePasse(
            "Le nouveau mot de passe doit contenir au moins 8 caractères.",
            'error'
        );
    }

    // Vérifier la confirmation
    if ($nouveau !== $confirmation) {
        retourMotDePasse(
            "Les deux nouveaux mots de passe ne correspondent pas.",
            'error'
        );
    }

    // Vérifier que le nouveau mot de passe est différent
    if (password_verify($nouveau, $hash)) {
        retourMotDePasse(
            "Le nouveau mot de passe doit être différent de l'ancien.",
            'error'
        );
    }

    // Crypter le nouveau mot de passe
    $nouveauHash = password_hash(
        $nouveau,
        PASSWORD_DEFAULT
    );

    // Enregistrer le nouveau mot de passe
    $q = $bdd->prepare(
        "UPDATE utilisateurs
         SET mot_de_passe = ?
         WHERE id = ?"
    );

    $q->execute([$nouveauHash, $id]);

    // Renouveler l'identifiant de session
    session_regenerate_id(true);

    retourMotDePasse(
        "Votre mot de passe a été modifié avec succès."
    );

} catch (PDOException $e) {

    error_log("Erreur modification mot de passe : " . $e->getMessage());

    retourMotDePasse(
        "Une erreur est survenue pendant la modification.",
        'error'
    );
}

?>
