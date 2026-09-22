<?php
/**
 * ANA Office & Admin Consultant — form handler
 * ---------------------------------------------------------------------------
 * Single endpoint for every form on the site. The form tells it which ruleset
 * to apply through a hidden `form_type` field; everything else is validated,
 * sanitised and mailed to the address in $CONFIG['to'].
 *
 * Requires PHP 7.4+ on a host where mail() is configured (cPanel, Hostinger,
 * GoDaddy and most shared hosts). It will NOT run on GitHub Pages.
 *
 * Responds with JSON:
 *   200 {"ok":true,"message":"..."}
 *   422 {"ok":false,"message":"...","errors":{"field":"reason"}}
 *   4xx/5xx {"ok":false,"message":"..."}
 */

declare(strict_types=1);

/* ------------------------------------------------------------------ config */

$CONFIG = [
    'to'            => 'admin@anasupport.biz',
    'from'          => 'admin@anasupport.biz',   // must be on your own domain
    'from_name'     => 'ANA Website',
    'subject_prefix' => '[ANA] ',

    'max_files'      => 5,
    'max_file_bytes' => 5 * 1024 * 1024,    // 5 MB per file
    'max_total_bytes' => 15 * 1024 * 1024,  // 15 MB per submission
    'allowed_ext'    => ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'xls', 'xlsx', 'txt'],
    'allowed_mime'   => [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'text/plain',
    ],

    'throttle_seconds' => 30,   // minimum gap between submissions from one IP
    'throttle_dir'     => sys_get_temp_dir() . '/ana-form-throttle',
];

/* ----------------------------------------------------------------- rulesets
 * required : must be present and non-empty
 * optional : accepted if present
 * types    : email | phone | url | date | text  (text is the default)
 * labels   : used in validation messages and in the email body
 */

$FORMS = [
    'contact' => [
        'subject' => 'Website enquiry',
        'fields'  => [
            'name'    => ['label' => 'Name',    'required' => true,  'type' => 'text', 'max' => 120],
            'email'   => ['label' => 'Email',   'required' => true,  'type' => 'email'],
            'message' => ['label' => 'Message', 'required' => true,  'type' => 'text', 'max' => 5000, 'min' => 10],
        ],
        'files' => false,
    ],

    'quote' => [
        'subject' => 'Quote request',
        'fields'  => [
            'full_name'        => ['label' => 'Full name',        'required' => true,  'type' => 'text', 'max' => 120],
            'company'          => ['label' => 'Company',          'required' => false, 'type' => 'text', 'max' => 160],
            'contact_number'   => ['label' => 'Contact number',   'required' => true,  'type' => 'phone'],
            'email'            => ['label' => 'Email',            'required' => true,  'type' => 'email'],
            'service_category' => ['label' => 'Service category', 'required' => false, 'type' => 'text', 'max' => 60],
            'office_type'      => ['label' => 'Office type',      'required' => false, 'type' => 'text', 'max' => 80],
            'admin_service'    => ['label' => 'Admin service',    'required' => false, 'type' => 'text', 'max' => 80],
            'quantity'         => ['label' => 'Quantity',         'required' => false, 'type' => 'text', 'max' => 120],
            'location'         => ['label' => 'Location',         'required' => false, 'type' => 'text', 'max' => 160],
            'start_date'       => ['label' => 'Service start date', 'required' => false, 'type' => 'date'],
            'end_date'         => ['label' => 'Service end date',   'required' => false, 'type' => 'date', 'after' => 'start_date'],
            'requirement'      => ['label' => 'Requirement',      'required' => true,  'type' => 'text', 'max' => 5000, 'min' => 10],
        ],
        'files' => true,
    ],

    'partner' => [
        'subject' => 'Partnership enquiry',
        'fields'  => [
            'full_name'           => ['label' => 'Full name',           'required' => true,  'type' => 'text', 'max' => 120],
            'company'             => ['label' => 'Company',             'required' => true,  'type' => 'text', 'max' => 160],
            'contact_number'      => ['label' => 'Contact number',      'required' => true,  'type' => 'phone'],
            'email'               => ['label' => 'Work email',          'required' => true,  'type' => 'email'],
            'engagement_model'    => ['label' => 'Engagement model',    'required' => false, 'type' => 'text', 'max' => 80],
            'primary_requirement' => ['label' => 'Primary requirement', 'required' => false, 'type' => 'text', 'max' => 120],
            'headcount'           => ['label' => 'Headcount',           'required' => false, 'type' => 'text', 'max' => 60],
            'locations'           => ['label' => 'Locations',           'required' => false, 'type' => 'text', 'max' => 160],
            'start_date'          => ['label' => 'Preferred start date', 'required' => false, 'type' => 'date'],
            'requirement'         => ['label' => 'Operations brief',    'required' => true,  'type' => 'text', 'max' => 5000, 'min' => 10],
        ],
        'files' => true,
    ],

    'career' => [
        'subject' => 'Job application',
        'fields'  => [
            'full_name'            => ['label' => 'Full name',        'required' => true,  'type' => 'text', 'max' => 120],
            'contact_number'       => ['label' => 'Contact number',   'required' => true,  'type' => 'phone'],
            'email'                => ['label' => 'Email',            'required' => true,  'type' => 'email'],
            'role_applied_for'     => ['label' => 'Role applied for', 'required' => true,  'type' => 'text', 'max' => 120],
            'total_experience'     => ['label' => 'Total experience', 'required' => false, 'type' => 'text', 'max' => 60],
            'notice_period'        => ['label' => 'Notice period',    'required' => false, 'type' => 'text', 'max' => 60],
            'current_location'     => ['label' => 'Current location', 'required' => false, 'type' => 'text', 'max' => 160],
            'current_expected_ctc' => ['label' => 'Current & expected CTC', 'required' => false, 'type' => 'text', 'max' => 120],
            'profile_link'         => ['label' => 'Profile link',     'required' => false, 'type' => 'url'],
            'about_you'            => ['label' => 'About you',        'required' => true,  'type' => 'text', 'max' => 5000, 'min' => 20],
        ],
        'files' => true,
    ],
];

/* --------------------------------------------------------------- utilities */

function respond(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/** Strip control characters and trim. Prevents header injection in any field. */
function clean(string $v): string
{
    $v = str_replace(["\r", "\0"], '', $v);
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
    return trim($v);
}

/** Single-line value for use in a header — newlines removed entirely. */
function cleanHeader(string $v): string
{
    return trim(preg_replace('/[\r\n\t]+/', ' ', clean($v)) ?? '');
}

function clientIp(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
}

/** Crude per-IP throttle using a temp file. Returns true when allowed. */
function throttleOk(array $cfg): bool
{
    $dir = $cfg['throttle_dir'];
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return true; // cannot throttle — do not block legitimate mail
    }
    $file = $dir . '/' . sha1(clientIp()) . '.txt';
    $now  = time();
    if (is_file($file)) {
        $last = (int) @file_get_contents($file);
        if ($last && ($now - $last) < $cfg['throttle_seconds']) {
            return false;
        }
    }
    @file_put_contents($file, (string) $now, LOCK_EX);
    return true;
}

function validPhone(string $v): bool
{
    $digits = preg_replace('/\D+/', '', $v) ?? '';
    return strlen($digits) >= 7
        && strlen($digits) <= 15
        && (bool) preg_match('/^[0-9+()\-.\s]+$/', $v);
}

function validDate(string $v): bool
{
    $d = DateTime::createFromFormat('Y-m-d', $v);
    return $d !== false && $d->format('Y-m-d') === $v;
}

/* ------------------------------------------------------------ method check */

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, ['ok' => false, 'message' => 'This endpoint only accepts POST requests.']);
}

/* ------------------------------------------------- form type + anti-spam */

$type = clean((string) ($_POST['form_type'] ?? ''));
if (!isset($FORMS[$type])) {
    respond(400, ['ok' => false, 'message' => 'Unknown form. Please reload the page and try again.']);
}
$spec = $FORMS[$type];

// Honeypot: a field hidden from humans. Anything in it is a bot.
if (clean((string) ($_POST['website'] ?? '')) !== '') {
    // Pretend success so the bot does not retry.
    respond(200, ['ok' => true, 'message' => 'Thank you — your message has been received.']);
}

if (!throttleOk($CONFIG)) {
    respond(429, [
        'ok' => false,
        'message' => 'You have just submitted a form. Please wait a moment before sending another.',
    ]);
}

/* ---------------------------------------------------------- field validation */

$errors = [];
$values = [];

foreach ($spec['fields'] as $name => $rule) {
    $raw = $_POST[$name] ?? '';
    if (is_array($raw)) {
        $raw = implode(', ', array_map('strval', $raw));
    }
    $v = clean((string) $raw);
    $label = $rule['label'];

    if ($v === '') {
        if (!empty($rule['required'])) {
            $errors[$name] = $label . ' is required.';
        }
        $values[$name] = '';
        continue;
    }

    $max = $rule['max'] ?? 2000;
    if (mb_strlen($v) > $max) {
        $errors[$name] = $label . ' must be ' . $max . ' characters or fewer.';
        continue;
    }
    if (isset($rule['min']) && mb_strlen($v) < $rule['min']) {
        $errors[$name] = $label . ' must be at least ' . $rule['min'] . ' characters.';
        continue;
    }

    switch ($rule['type'] ?? 'text') {
        case 'email':
            if (!filter_var($v, FILTER_VALIDATE_EMAIL)) {
                $errors[$name] = 'Enter a valid email address.';
            }
            break;

        case 'phone':
            if (!validPhone($v)) {
                $errors[$name] = 'Enter a valid contact number, including country code.';
            }
            break;

        case 'url':
            if (!filter_var($v, FILTER_VALIDATE_URL) || !preg_match('#^https?://#i', $v)) {
                $errors[$name] = 'Enter a full link starting with http:// or https://';
            }
            break;

        case 'date':
            if (!validDate($v)) {
                $errors[$name] = 'Enter a valid date.';
            }
            break;
    }

    $values[$name] = $v;
}

// Cross-field rule: end date must not precede start date.
foreach ($spec['fields'] as $name => $rule) {
    if (empty($rule['after'])) {
        continue;
    }
    $other = $rule['after'];
    if (!empty($values[$name]) && !empty($values[$other])
        && empty($errors[$name]) && empty($errors[$other])
        && strtotime($values[$name]) < strtotime($values[$other])) {
        $errors[$name] = $rule['label'] . ' cannot be earlier than ' . $spec['fields'][$other]['label'] . '.';
    }
}

/* ----------------------------------------------------------- file validation */

$attachments = [];

if (!empty($spec['files']) && !empty($_FILES['attachment']['name'])) {
    $f = $_FILES['attachment'];
    $names = is_array($f['name']) ? $f['name'] : [$f['name']];
    $tmps  = is_array($f['tmp_name']) ? $f['tmp_name'] : [$f['tmp_name']];
    $sizes = is_array($f['size']) ? $f['size'] : [$f['size']];
    $errs  = is_array($f['error']) ? $f['error'] : [$f['error']];

    $total = 0;
    $count = 0;

    foreach ($names as $i => $origName) {
        if (($errs[$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE || $origName === '') {
            continue;
        }
        if (($errs[$i] ?? 1) !== UPLOAD_ERR_OK) {
            $errors['attachment'] = 'One of your files failed to upload. Please try again.';
            break;
        }

        $count++;
        if ($count > $CONFIG['max_files']) {
            $errors['attachment'] = 'Attach no more than ' . $CONFIG['max_files'] . ' files.';
            break;
        }

        $size = (int) ($sizes[$i] ?? 0);
        $total += $size;
        if ($size > $CONFIG['max_file_bytes']) {
            $errors['attachment'] = 'Each file must be under '
                . (int) ($CONFIG['max_file_bytes'] / 1048576) . ' MB.';
            break;
        }
        if ($total > $CONFIG['max_total_bytes']) {
            $errors['attachment'] = 'Your attachments total more than '
                . (int) ($CONFIG['max_total_bytes'] / 1048576) . ' MB.';
            break;
        }

        $tmp = $tmps[$i];
        if (!is_uploaded_file($tmp)) {
            $errors['attachment'] = 'That upload could not be verified. Please try again.';
            break;
        }

        $ext = strtolower(pathinfo((string) $origName, PATHINFO_EXTENSION));
        if (!in_array($ext, $CONFIG['allowed_ext'], true)) {
            $errors['attachment'] = 'Allowed file types: ' . implode(', ', $CONFIG['allowed_ext']) . '.';
            break;
        }

        $mime = '';
        if (function_exists('finfo_open')) {
            $fi = finfo_open(FILEINFO_MIME_TYPE);
            if ($fi) {
                $mime = (string) finfo_file($fi, $tmp);
                finfo_close($fi);
            }
        }
        if ($mime !== '' && !in_array($mime, $CONFIG['allowed_mime'], true)) {
            $errors['attachment'] = 'One of your files is not an accepted document or image type.';
            break;
        }

        $safeName = preg_replace('/[^A-Za-z0-9._-]+/', '_', basename((string) $origName)) ?? 'attachment';
        $attachments[] = [
            'name' => substr($safeName, 0, 100),
            'mime' => $mime !== '' ? $mime : 'application/octet-stream',
            'data' => (string) file_get_contents($tmp),
        ];
    }
}

if ($errors) {
    respond(422, [
        'ok'      => false,
        'message' => 'Please check the highlighted fields and try again.',
        'errors'  => $errors,
    ]);
}

/* ------------------------------------------------------------ compose email */

$replyName  = cleanHeader($values['full_name'] ?? $values['name'] ?? '');
$replyEmail = cleanHeader($values['email'] ?? '');

$subject = $CONFIG['subject_prefix'] . $spec['subject'];
if ($replyName !== '') {
    $subject .= ' — ' . $replyName;
}

$lines = [];
$lines[] = $spec['subject'];
$lines[] = str_repeat('=', mb_strlen($spec['subject']));
$lines[] = '';
foreach ($spec['fields'] as $name => $rule) {
    $v = $values[$name] ?? '';
    if ($v === '') {
        continue;
    }
    $lines[] = $rule['label'] . ': ' . $v;
}
if ($attachments) {
    $lines[] = '';
    $lines[] = 'Attachments: ' . implode(', ', array_column($attachments, 'name'));
}
$lines[] = '';
$lines[] = str_repeat('-', 48);
$lines[] = 'Submitted: ' . date('d M Y, H:i') . ' (server time)';
$lines[] = 'Page: ' . cleanHeader((string) ($_POST['page'] ?? ($_SERVER['HTTP_REFERER'] ?? 'unknown')));
$lines[] = 'IP: ' . clientIp();

$body = implode("\r\n", $lines);

$fromHeader = sprintf('%s <%s>', $CONFIG['from_name'], $CONFIG['from']);
$headers = [
    'MIME-Version: 1.0',
    'From: ' . $fromHeader,
    'X-Mailer: PHP/' . phpversion(),
];
if ($replyEmail !== '' && filter_var($replyEmail, FILTER_VALIDATE_EMAIL)) {
    $headers[] = $replyName !== ''
        ? sprintf('Reply-To: %s <%s>', $replyName, $replyEmail)
        : 'Reply-To: ' . $replyEmail;
}

if ($attachments) {
    $boundary = 'ana_' . bin2hex(random_bytes(12));
    $headers[] = 'Content-Type: multipart/mixed; boundary="' . $boundary . '"';

    $parts   = [];
    $parts[] = '--' . $boundary;
    $parts[] = 'Content-Type: text/plain; charset=UTF-8';
    $parts[] = 'Content-Transfer-Encoding: base64';
    $parts[] = '';
    $parts[] = chunk_split(base64_encode($body));

    foreach ($attachments as $a) {
        $parts[] = '--' . $boundary;
        $parts[] = 'Content-Type: ' . $a['mime'] . '; name="' . $a['name'] . '"';
        $parts[] = 'Content-Transfer-Encoding: base64';
        $parts[] = 'Content-Disposition: attachment; filename="' . $a['name'] . '"';
        $parts[] = '';
        $parts[] = chunk_split(base64_encode($a['data']));
    }
    $parts[] = '--' . $boundary . '--';
    $message = implode("\r\n", $parts);
} else {
    $headers[] = 'Content-Type: text/plain; charset=UTF-8';
    $headers[] = 'Content-Transfer-Encoding: base64';
    $message = chunk_split(base64_encode($body));
}

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

$sent = @mail(
    $CONFIG['to'],
    $encodedSubject,
    $message,
    implode("\r\n", $headers),
    '-f' . $CONFIG['from']
);

if (!$sent) {
    error_log('ANA form-handler: mail() failed for form type "' . $type . '"');
    respond(500, [
        'ok' => false,
        'message' => 'We could not send your message just now. Please email admin@anasupport.biz directly.',
    ]);
}

respond(200, [
    'ok'      => true,
    'message' => 'Thank you — your submission has been received.',
]);
