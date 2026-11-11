<?php
session_start();

// Seuls les utilisateurs connectés peuvent ajouter une mesure
if (!isset($_SESSION['user_id'])) {
    $_SESSION['message'] = "Connectez-vous pour ajouter un bâtiment.";
    header('Location: ../index.php#login');
    exit();
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../index.php#mesures');
    exit();
}

// Enregistre le message de notification puis redirige
function notifier($texte, $type = 'success')
{
    $_SESSION['flash'] = $texte;
    $_SESSION['flash_type'] = $type;   // 'success' ou 'error'
    header('Location: ../index.php#mesures');
    exit();
}

// Seuils par défaut selon la ressource
$SEUILS = ['electricite' => 120.0, 'eau' => 100.0, 'chauffage' => 100.0, 'gaze' => 120.0];

$batiment  = trim($_POST['batiment'] ?? '');
$ressource = mb_strtolower(trim($_POST['ressource'] ?? ''), 'UTF-8');
$ressource = strtr($ressource, ['é'=>'e','è'=>'e','ê'=>'e']);
$valeur    = str_replace(',', '.', trim($_POST['valeur'] ?? ''));

// Validation : on refuse tout ce qui pourrait casser le CSV
if (!preg_match('/^[\p{L}0-9 _\'-]{1,50}$/u', $batiment)
    || !isset($SEUILS[$ressource])
    || !is_numeric($valeur) || (float)$valeur < 0) {
    notifier("Mesure invalide : vérifiez le bâtiment, la ressource et la valeur.", 'error');
}

$batiment = preg_replace('/\s+/', '_', $batiment);
$ligne = $batiment . ',' . $ressource . ','
       . number_format((float)$valeur, 2, '.', '') . ','
       . number_format($SEUILS[$ressource], 2, '.', '') . ','
       . date('Y-m-d') . "\n";

$csv = __DIR__ . '/../measures_in.csv';
$f = fopen($csv, 'c+');
if (!$f || !flock($f, LOCK_EX)) {
    notifier("Impossible d’écrire dans measures_in.csv.", 'error');
}
fseek($f, 0, SEEK_END);
$prefixe = '';
if (ftell($f) === 0) {
    $prefixe = "batiment,ressource,valeur,seuil,date\n";   // fichier vide : on écrit l'en-tête
} else {
    fseek($f, -1, SEEK_END);
    if (fread($f, 1) !== "\n") $prefixe = "\n";             // évite de coller deux lignes
    fseek($f, 0, SEEK_END);
}
fwrite($f, $prefixe . $ligne);
fflush($f);
flock($f, LOCK_UN);
fclose($f);

// Mémorise qui a ajouté le bâtiment (pour la page profil) ; un échec ici ne bloque pas l'ajout
try {
    require_once __DIR__ . '/database.php';
    $bdd->prepare("INSERT INTO mesures_ajoutees (user_id, batiment, ressource, valeur, seuil, date_mesure)
                   VALUES (?, ?, ?, ?, ?, CURDATE())")
        ->execute([$_SESSION['user_id'], $batiment, $ressource, (float)$valeur, $SEUILS[$ressource]]);
} catch (Throwable $e) {
    error_log('EcoCampus profil : ' . $e->getMessage());
}

// Alerte déclenchée par cet ajout ? (même règle que le module C : valeur > seuil)
$seuilApplique = $SEUILS[$ressource];
if ((float)$valeur > $seuilApplique) {
    $_SESSION['nouvelle_alerte'] = [
        'batiment'  => str_replace('_', ' ', $batiment),
        'ressource' => ['electricite' => 'électricité', 'eau' => 'eau', 'chauffage' => 'chauffage', 'gaze' => 'gaz'][$ressource] ?? $ressource,
        'valeur'    => (float)$valeur,
        'seuil'     => $seuilApplique,
        'pct'       => round(((float)$valeur / $seuilApplique - 1) * 100, 1),
    ];
}

// On relance le module C pour régénérer data.json
$exe  = realpath(__DIR__ . '/../EcoCampus.exe');
$json = __DIR__ . '/../data.json';
if (!$exe) {
    notifier("Bâtiment ajouté, mais EcoCampus.exe est introuvable à la racine du projet.", 'error');
}

exec(escapeshellarg($exe) . ' ' . escapeshellarg($csv) . ' ' . escapeshellarg($json) . ' --export 2>&1', $sortie, $code);

// Succès réel seulement si le module C a affiché « Export réussi »
// (on teste « Export r » car la console Windows peut abîmer le « é »)
$exportOk = ($code === 0) && strpos(implode("\n", $sortie), 'Export r') !== false;

if ($exportOk) {
    notifier("Bâtiment ajouté et données mises à jour.", 'success');
} elseif ($code === 0) {
    notifier("Bâtiment ajouté, mais data.json n’a pas été régénéré : EcoCampus.exe semble ne pas gérer --export (recompilez-le).", 'error');
} else {
    notifier("Bâtiment ajouté, mais le module C a échoué (code $code).", 'error');
}