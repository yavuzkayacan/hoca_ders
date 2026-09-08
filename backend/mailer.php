<?php
// Istanbul 29 Mayis Universitesi - Microsoft 365 / SMTP E-Posta Gonderici
// Harici kutuphane (Composer vb.) gerektirmeden saf PHP ile Microsoft 365 SMTP uzerinden mail gonderir.

require_once __DIR__ . '/config.php';

function sendEmailViaM365($toEmail, $toName, $subject, $htmlBody) {
    // Eger config'de mail aktif degilse veya test modundaysa simule et
    if (!defined('SMTP_ENABLED') || !SMTP_ENABLED) {
        return [
            'success' => true,
            'simulated' => true,
            'message' => 'SMTP aktiflestirilmedi (Test Modu). E-posta basariyla olusturuldu fakat gonderim simule edildi.'
        ];
    }

    $host = SMTP_HOST; // smtp.office365.com
    $port = SMTP_PORT; // 587
    $username = SMTP_USER; // ornek: dersprogrami@29mayis.edu.tr
    $password = SMTP_PASS;
    $fromEmail = SMTP_FROM_EMAIL;
    $fromName = SMTP_FROM_NAME;

    $timeout = 25;
    $socket = @fsockopen($host, $port, $errno, $errstr, $timeout);

    if (!$socket) {
        return ['success' => false, 'message' => "Sunucuya baglanilamadi ($errno): $errstr"];
    }

    $read = function() use ($socket) {
        $response = "";
        while ($str = fgets($socket, 515)) {
            $response .= $str;
            if (substr($str, 3, 1) == " ") break;
        }
        return $response;
    };

    $send = function($cmd) use ($socket, $read) {
        fputs($socket, $cmd . "\r\n");
        return $read();
    };

    $res = $read(); // Sunucu karsilama mesaji (220)

    // 1. EHLO
    $res = $send("EHLO " . gethostname());

    // 2. STARTTLS baslat (Microsoft 365 icin zorunludur)
    $res = $send("STARTTLS");
    if (substr($res, 0, 3) != "220") {
        fclose($socket);
        return ['success' => false, 'message' => "STARTTLS basarisiz: " . $res];
    }

    // Soketi TLS sifrelemesine yukselt
    $crypto = stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT);
    if (!$crypto) {
        fclose($socket);
        return ['success' => false, 'message' => "TLS kripto katmani olusturulamadi."];
    }

    // TLS sonrasi tekrar EHLO
    $res = $send("EHLO " . gethostname());

    // 3. AUTH LOGIN
    $res = $send("AUTH LOGIN");
    if (substr($res, 0, 3) != "334") {
        fclose($socket);
        return ['success' => false, 'message' => "AUTH LOGIN reddedildi: " . $res];
    }

    $res = $send(base64_encode($username));
    $res = $send(base64_encode($password));
    if (substr($res, 0, 3) != "235") {
        fclose($socket);
        return ['success' => false, 'message' => "Microsoft 365 kimlik dogrulama hatasi (Kullanici adi/sifre yanlis veya SMTP AUTH kapali): " . $res];
    }

    // 4. MAIL FROM & RCPT TO
    $res = $send("MAIL FROM: <$fromEmail>");
    $res = $send("RCPT TO: <$toEmail>");

    // 5. DATA
    $res = $send("DATA");

    // E-Posta Basliklari (UTF-8 ve Turkce Karakter Uyumlu)
    $encodedSubject = "=?UTF-8?B?" . base64_encode($subject) . "?=";
    $encodedFromName = "=?UTF-8?B?" . base64_encode($fromName) . "?=";
    $encodedToName = "=?UTF-8?B?" . base64_encode($toName) . "?=";

    $headers = [
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        "From: $encodedFromName <$fromEmail>",
        "To: $encodedToName <$toEmail>",
        "Subject: $encodedSubject",
        "Date: " . date("r"),
        "X-Mailer: 29Mayis-Timetable-Mailer/1.0"
    ];

    $emailData = implode("\r\n", $headers) . "\r\n\r\n" . $htmlBody . "\r\n.";
    $res = $send($emailData);

    // 6. QUIT
    $send("QUIT");
    fclose($socket);

    if (substr($res, 0, 3) == "250") {
        return ['success' => true, 'message' => 'E-posta Microsoft 365 uzerinden basariyla gonderildi.'];
    } else {
        return ['success' => false, 'message' => "E-posta gonderim hatasi: " . $res];
    }
}
?>
