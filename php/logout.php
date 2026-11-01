
<?php
session_start();

// Supprimer toutes les variables de session
session_unset();

// Détruire la session
session_destroy();

// Retourner à la page de connexion
header('Location: ../index.php#login');
exit();
?>
 