<?php
// Istanbul 29 Mayis Universitesi - Ders Programi Sistemi
// Veritabani ve Sistem Yapilandirma Dosyasi

// Karakter kodlamasi ve basliklar
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// cPanel / Hosting Veritabani Bilgileri (Hosting ayarlarınıza göre güncelleyiniz)
define('DB_HOST', 'localhost');
define('DB_NAME', 'mayis29_derslik_db');
define('DB_USER', 'mayis29_user');
define('DB_PASS', 'Sifreniz123!');
define('DB_CHARSET', 'utf8mb4');

// -------------------------------------------------------------
// MICROSOFT 365 / EXCHANGE ONLINE E-POSTA AYARLARI
// -------------------------------------------------------------
// Canlıda e-posta gönderimini açmak için true yapınız:
define('SMTP_ENABLED', false); 
define('SMTP_HOST', 'smtp.office365.com');
define('SMTP_PORT', 587);
define('SMTP_USER', 'dersprogrami@29mayis.edu.tr'); // Bilgi İşlem tarafından verilen kurumsal hesap
define('SMTP_PASS', 'KurumsalMailSifresi123');
define('SMTP_FROM_EMAIL', 'dersprogrami@29mayis.edu.tr');
define('SMTP_FROM_NAME', '29 Mayıs Üniv. Ders Programı Sistemi');

// Sistemin canlıdaki alt alan adı (Şifre sıfırlama linkleri için)
define('APP_URL', 'https://dersprogrami.29mayis.edu.tr');

function getDbConnection() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        // Eger MySQL henuz bagli degilse veya yerel test ediliyorsa JSON hata dondurur
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Veritabani baglanti hatasi: ' . $e->getMessage(),
            'hint' => 'Hosting panelinden (cPanel) veritabani olusturuldugundan ve config.php icindeki sifrenin dogru oldugundan emin olun.'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
}

function sendResponse($success, $data = null, $message = '') {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

function getJsonInput() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}
?>
