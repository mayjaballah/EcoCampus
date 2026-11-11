<?php
// php/notif.php : prépare une notification pour index.php
// (affichée dans la pile .notif-stack, comme les messages d'ajout de mesure et d'alerte)

/* $type : 'success' (coche verte) ou 'error' (croix rouge) */
function notifier($message, $type = 'error')
{
    $_SESSION['flash'] = $message;
    $_SESSION['flash_type'] = ($type === 'success') ? 'success' : 'error';
}
