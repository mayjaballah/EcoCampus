<?php
session_start();
require_once('notif.php');

// Supprimer toutes les variables de session
session_unset();

// Détruire la session
session_destroy();

// Nouvelle session vide, uniquement pour afficher la notification de déconnexion
session_start();
session_regenerate_id(true);
notifier("Vous avez été déconnecté(e).", 'success');

// Retourner à la page de connexion
header('Location: ../index.php#login');
exit();
?>
