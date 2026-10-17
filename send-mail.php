<?php
/*
 * Kontaktformular: nimmt die Eingaben per POST entgegen und sendet sie
 * als E-Mail an das Postfach der Firma.
 *
 * - Es werden keine Daten in einer Datenbank oder Logdatei gespeichert.
 * - Die IP-Adresse des Absenders wird weder gespeichert noch in die E-Mail geschrieben.
 * - Schutz vor Spam: verstecktes Feld (Honeypot) und Mindest-Ausfüllzeit.
 */

declare(strict_types=1);

const RECIPIENT = 'info@niceland-hamburg.de';
// Absender muss eine Adresse der eigenen Domain sein, sonst lehnen Mailserver (z. B. Hetzner) die Mail ab.
const SENDER = 'info@niceland-hamburg.de';
const SENDER_NAME = 'Niceland Website';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, bool $ok, string $message): void
{
    http_response_code($status);
    echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function field(string $name): string
{
    $value = $_POST[$name] ?? '';
    return is_string($value) ? trim($value) : '';
}

function length(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function mimeHeader(string $value): string
{
    return '=?UTF-8?B?' . base64_encode($value) . '?=';
}

// Schutz vor Massenversand: höchstens 10 Nachrichten pro Stunde und 40 pro Tag für die gesamte Website.
// Es werden nur Zeitstempel gespeichert, keine personenbezogenen Daten (keine IP-Adresse, keine Inhalte).
function rateLimitExceeded(): bool
{
    $file = rtrim(sys_get_temp_dir(), '/\\') . DIRECTORY_SEPARATOR . 'niceland-form-rate-' . md5(__DIR__) . '.json';
    $handle = @fopen($file, 'c+');
    if ($handle === false) {
        return false; // Ohne Schreibzugriff kein Limit, aber auch kein Ausfall des Formulars
    }

    $exceeded = false;
    if (flock($handle, LOCK_EX)) {
        $now = time();
        $stored = json_decode((string) stream_get_contents($handle), true);
        $times = is_array($stored) ? array_filter($stored, static fn ($t) => is_int($t) && $t > $now - 86400) : [];

        $lastHour = count(array_filter($times, static fn ($t) => $t > $now - 3600));
        if ($lastHour >= 10 || count($times) >= 40) {
            $exceeded = true;
        } else {
            $times[] = $now;
            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, json_encode(array_values($times)));
        }
        flock($handle, LOCK_UN);
    }
    fclose($handle);

    return $exceeded;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, false, 'Methode nicht erlaubt.');
}

// Unnötig große Anfragen ablehnen (Formular ist höchstens wenige KB groß)
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 30000) {
    respond(413, false, 'Die Anfrage ist zu groß.');
}

// Nur Anfragen von der eigenen Website annehmen
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    $originHost = (string) parse_url($origin, PHP_URL_HOST);
    $ownHost = preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? ''));
    if (strcasecmp($originHost, $ownHost) !== 0) {
        respond(403, false, 'Anfrage nicht erlaubt.');
    }
}

// Spam-Schutz: Honeypot-Feld muss leer sein, Formular darf nicht in unter 3 Sekunden ausgefüllt werden.
// Bots bekommen eine Erfolgsmeldung, damit sie nichts merken; es wird aber nichts gesendet.
$elapsed = (int) field('t');
if (field('website') !== '' || $elapsed < 3) {
    respond(200, true, 'Danke für Ihre Nachricht!');
}

$name = field('name');
$email = field('email');
$phone = field('phone');
$subject = field('subject');
$message = field('message');
$consent = field('consent') !== '';

if (!$consent) {
    respond(422, false, 'Bitte bestätigen Sie die Datenschutzerklärung.');
}

if ($name === '' || length($name) > 100) {
    respond(422, false, 'Bitte geben Sie Ihren Namen an (maximal 100 Zeichen).');
}

if (length($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, false, 'Bitte geben Sie eine gültige E-Mail-Adresse an.');
}

if ($phone !== '' && (length($phone) > 40 || !preg_match('/^[0-9+()\/.\-\s]+$/', $phone))) {
    respond(422, false, 'Bitte geben Sie eine gültige Telefonnummer an.');
}

if (length($subject) > 150) {
    respond(422, false, 'Der Betreff ist zu lang (maximal 150 Zeichen).');
}

if ($message === '' || length($message) > 5000) {
    respond(422, false, 'Bitte geben Sie eine Nachricht ein (maximal 5000 Zeichen).');
}

// Schutz vor Header-Injection: keine Zeilenumbrüche in Kopf-Feldern
foreach ([$name, $email, $phone, $subject] as $headerValue) {
    if (preg_match('/[\r\n]/', $headerValue)) {
        respond(422, false, 'Ungültige Eingabe.');
    }
}

if (rateLimitExceeded()) {
    respond(429, false, 'Es wurden gerade sehr viele Nachrichten gesendet. Bitte versuchen Sie es später erneut oder schreiben Sie uns direkt an ' . RECIPIENT . '.');
}

date_default_timezone_set('Europe/Berlin');

$mailSubject = 'Kontaktformular: ' . ($subject !== '' ? $subject : 'Anfrage von ' . $name);

$body = "Neue Nachricht über das Kontaktformular auf niceland-hamburg.de\r\n"
    . "------------------------------------------------------------\r\n\r\n"
    . "Name:     {$name}\r\n"
    . "E-Mail:   {$email}\r\n"
    . 'Telefon:  ' . ($phone !== '' ? $phone : '-') . "\r\n"
    . 'Betreff:  ' . ($subject !== '' ? $subject : '-') . "\r\n\r\n"
    . "Nachricht:\r\n"
    . str_replace(["\r\n", "\r", "\n"], "\r\n", $message) . "\r\n\r\n"
    . "------------------------------------------------------------\r\n"
    . 'Gesendet am ' . date('d.m.Y \u\m H:i') . " Uhr.\r\n"
    . "Der Absender hat die Datenschutzerklärung gelesen und der Verarbeitung zugestimmt.\r\n";

$headers = [
    'From: ' . mimeHeader(SENDER_NAME) . ' <' . SENDER . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];

$sent = mail(RECIPIENT, mimeHeader($mailSubject), $body, implode("\r\n", $headers));

if (!$sent) {
    respond(500, false, 'Die Nachricht konnte nicht gesendet werden. Bitte schreiben Sie uns direkt an ' . RECIPIENT . '.');
}

respond(200, true, 'Danke für Ihre Nachricht! Wir melden uns schnellstmöglich bei Ihnen.');
