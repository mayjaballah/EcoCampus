<?php
/* =====================================================
   php/supprimer_mesure.php - Suppression d'une mesure
   Affichage : views/supprimer_mesure.phtml (fenêtre de confirmation)
   Étapes : 1) retirer la ligne de measures_in.csv
            2) retirer la mesure de la page profil (base de données)
            3) relancer EcoCampus.exe pour régénérer data.json
   ===================================================== */

session_start();

// Seuls les utilisateurs connectés peuvent supprimer une mesure
if (!isset($_SESSION['user_id'])) {
    $_SESSION['message'] = "Connectez-vous pour supprimer une mesure.";
    header('Location: ../index.php#login');
    exit();
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../index.php#mesures');
    exit();
}

/* ---------- Fonctions ---------- */

// Enregistre le message de notification puis redirige
function notifier($texte, $type = 'success')
{
    $_SESSION['flash'] = $texte;
    $_SESSION['flash_type'] = $type;   // 'success' ou 'error'
    header('Location: ../index.php#mesures');
    exit();
}

/* Supprime du CSV la ligne que l'utilisateur voit à l'écran.
   Retourne les champs de la ligne supprimée : [1] bâtiment, [2] ressource, [3] valeur, [4] seuil, [5] date */
function supprimerLigneCsv($csv, $index, $ressource, $valeur, $date)
{
    if (!is_file($csv)) {
        notifier("measures_in.csv est introuvable.", 'error');
    }
    $f = fopen($csv, 'r+');
    if (!$f || !flock($f, LOCK_EX)) {
        if ($f) {
            fclose($f);
        }
        notifier("Impossible d’écrire dans measures_in.csv.", 'error');
    }

    // On retrouve la ligne comme le fait le module C : l'en-tête est ignoré
    // et les lignes invalides ne comptent pas (même numérotation que data.json)
    $lignes = preg_split('/(?<=\n)/', stream_get_contents($f), -1, PREG_SPLIT_NO_EMPTY);
    $num = '[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?';
    $compte = -1;
    $cible = null;
    $info = null;
    foreach ($lignes as $k => $ligne) {
        if ($k === 0) continue;
        if (!preg_match("/^([^,]{1,99}),([^,]{1,99}),($num),($num),([^\r\n]{1,99})/", $ligne, $m)) continue;
        $compte++;
        if ($compte === $index) { $cible = $k; $info = $m; break; }
    }

    // Contrôle : la ligne trouvée doit être celle que l'utilisateur a vue à l'écran
    if ($cible === null
        || $info[2] !== $ressource
        || abs((float)$info[3] - $valeur) > 0.01
        || trim($info[5]) !== $date) {
        flock($f, LOCK_UN);
        fclose($f);
        notifier("La liste a changé depuis votre dernier affichage : rechargez la page et réessayez.", 'error');
    }

    array_splice($lignes, $cible, 1);
    rewind($f);
    ftruncate($f, 0);
    fwrite($f, implode('', $lignes));
    fflush($f);
    flock($f, LOCK_UN);
    fclose($f);

    return $info;
}

/* ---------- 1. Contrôle de la requête ---------- */

if (!hash_equals($_SESSION['csrf'] ?? '', $_POST['csrf'] ?? '')) {
    notifier("Session expirée : rechargez la page puis réessayez.", 'error');
}

$index     = filter_var($_POST['index'] ?? '', FILTER_VALIDATE_INT);
$ressource = trim($_POST['ressource'] ?? '');
$valeur    = (float) str_replace(',', '.', trim($_POST['valeur'] ?? ''));
$date      = trim($_POST['date'] ?? '');

if ($index === false || $index < 0 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    notifier("Mesure invalide : suppression annulée.", 'error');
}

/* ---------- 2. Suppression dans le CSV ---------- */

$csv  = __DIR__ . '/../measures_in.csv';
$json = __DIR__ . '/../data.json';
$info = supprimerLigneCsv($csv, $index, $ressource, $valeur, $date);

/* ---------- 3. Page profil ----------
   Si la mesure avait été ajoutée depuis le site, on la retire aussi de la page profil ;
   un échec ici ne bloque pas la suppression. */

try {
    require_once __DIR__ . '/database.php';
    $bdd->prepare("DELETE FROM mesures_ajoutees
                   WHERE batiment = ? AND ressource = ? AND ABS(valeur - ?) < 0.01 AND date_mesure = ?
                   LIMIT 1")
        ->execute([$info[1], $ressource, (float)$info[3], $date]);
} catch (Throwable $e) {
    error_log('EcoCampus profil : ' . $e->getMessage());
}

/* ---------- 4. Relance du module C pour régénérer data.json ---------- */

$exe = realpath(__DIR__ . '/../EcoCampus.exe');
if (!$exe) {
    notifier("Mesure supprimée, mais EcoCampus.exe est introuvable à la racine du projet.", 'error');
}

exec(escapeshellarg($exe) . ' ' . escapeshellarg($csv) . ' ' . escapeshellarg($json) . ' --export 2>&1', $sortie, $code);

// Succès réel seulement si le module C a affiché « Export réussi »
$exportOk = ($code === 0) && strpos(implode("\n", $sortie), 'Export r') !== false;

$noms = ['electricite' => 'électricité', 'eau' => 'eau', 'chauffage' => 'chauffage', 'gaze' => 'gaz'];
$resume = str_replace('_', ' ', $info[1]) . ' (' . ($noms[$ressource] ?? $ressource) . ') du ' . $date;

if ($exportOk) {
    notifier("Mesure supprimée : $resume.", 'success');
} elseif ($code === 0) {
    notifier("Mesure supprimée, mais data.json n’a pas été régénéré : EcoCampus.exe semble ne pas gérer --export (recompilez-le).", 'error');
} else {
    notifier("Mesure supprimée, mais le module C a échoué (code $code).", 'error');
}
