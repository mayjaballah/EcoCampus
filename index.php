<?php
//pour l'inscription
session_start();
if (empty($_SESSION['csrf'])) { $_SESSION['csrf'] = bin2hex(random_bytes(16)); }

$message = $_SESSION['message'] ?? '';
unset($_SESSION['message']);
$nouvelleAlerte = $_SESSION['nouvelle_alerte'] ?? null;
unset($_SESSION['nouvelle_alerte']);
$flash = $_SESSION['flash'] ?? '';
unset($_SESSION['flash']);
$flashType = $_SESSION['flash_type'] ?? 'success';
unset($_SESSION['flash_type']);
// Anciens messages ($_SESSION['message'], encore utilisés par « mot de passe oublié ») :
// on les affiche aussi sous forme de notification
if ($message !== '' && $flash === '') {
    $flash = $message;
    $flashType = preg_match('/succès|envoyé|modifié|créé/iu', $message) ? 'success' : 'error';
    $message = '';
}
$peutExpliquer = isset($_SESSION['user_id']);

// ----- Données de la page profil (utilisateur connecté) -----
$profil = null;
$mesAjouts = [];
$photoUrl = '';
if ($peutExpliquer) {
    try {
        require_once __DIR__ . '/php/database.php';
        $q = $bdd->prepare("SELECT nom, prenom, username, email, photo FROM utilisateurs WHERE id = ?");
        $q->execute([$_SESSION['user_id']]);
        $profil = $q->fetch(PDO::FETCH_ASSOC) ?: null;
    } catch (Throwable $e) {
        error_log('EcoCampus profil : ' . $e->getMessage());
    }
    try {
        $q = $bdd->prepare("SELECT batiment, ressource, valeur, seuil, date_mesure
                            FROM mesures_ajoutees WHERE user_id = ? ORDER BY id DESC LIMIT 50");
        $q->execute([$_SESSION['user_id']]);
        $mesAjouts = $q->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        error_log('EcoCampus profil : ' . $e->getMessage());
    }
}
$photoUrl = ($profil && !empty($profil['photo'])) ? 'uploads/avatars/' . rawurlencode($profil['photo']) : '';
$initiales = $profil ? mb_strtoupper(mb_substr($profil['prenom'], 0, 1) . mb_substr($profil['nom'], 0, 1)) : '?';
$resFr = ['electricite' => 'Électricité', 'eau' => 'Eau', 'chauffage' => 'Chauffage', 'gaze' => 'Gaz'];

// Affichage : la vue est dans php/index.phtml, insérée dans le layout
ob_start();
require __DIR__ . '/php/index.phtml';
$contenu = ob_get_clean();
require __DIR__ . '/php/layout.phtml';
?>
