# 🎓 İstanbul 29 Mayıs Üniversitesi - Ders, Derslik ve Hoca Eşleştirme Sistemi

İstanbul 29 Mayıs Üniversitesi için özel olarak geliştirilmiş, web tabanlı interaktif ders programı, derslik planlama ve hoca eşleştirme otomasyonu.

![İstanbul 29 Mayıs Üniversitesi](https://img.shields.io/badge/Üniversite-İstanbul%2029%20Mayıs-7B1123?style=for-the-badge)
![Durum](https://img.shields.io/badge/Sürüm-1.0.0-gold?style=for-the-badge)
![Altyapı](https://img.shields.io/badge/Altyapı-PHP%20%7C%20MySQL%20%7C%20Python%20SQLite-102A43?style=for-the-badge)

---

## 🌟 Temel Özellikler

1. **Excel Benzeri İnteraktif Ders Programı Matrisi (08:00 - 20:00):**
   - 12 akademik saat bloğu (08:00-09:00'dan 19:00-20:00'ye kadar).
   - Mouse ile hücreleri sürükleyerek blok seçimi yapma.
   - Seçilen hücreleri otomatik birleştirme (`rowspan`) ve blok ders atama.
2. **Akıllı Çakışma Önleme Motoru (Conflict Prevention Engine):**
   - **Sınıf Çakışması:** Seçilen günde ve saatte sınıf başka bir bölüm veya ders tarafından doluysa anında uyarı ve müsait alternatif derslik önerisi.
   - **Hoca Çakışması:** İlgili öğretim üyesinin aynı saatte başka bir şubede veya bölümde dersi varsa anında ikaz.
3. **Bölüm ve Fakülte İzolasyonu:**
   - Her bölüm kendi koordinatör hesabı ile giriş yapar, sadece kendi programını düzenler.
4. **Bölüme Özel Ders ve Hoca Havuzu Yönetimi:**
   - Koordinatörler kendi bölümlerine ait dersleri (kod ve ad) ve hocaları ekleyebilir, güncelleyebilir ve silebilir.
5. **Kampüs Genel Doluluk Matrisi:**
   - Tüm kampüs dersliklerinin gün ve saat bazındaki anlık doluluğunu hem **Süper Admin** hem de **Bölüm Koordinatörleri** canlı olarak izleyebilir.
6. **Süper Admin Yönetim Paneli:**
   - Tüm bölümlerin programlarını, ders ve hoca havuzlarını yönetme.
   - Kullanıcı hesaplarını, kurumsal e-posta adreslerini ve şifreleri görüntüleme (👁️ göster/gizle anahtarı ile).
7. **Microsoft 365 E-Posta Entegrasyonu:**
   - **Şifremi Unuttum:** Kurumsal `@29mayis.edu.tr` e-posta adresine güvenli şifre sıfırlama bağlantısı gönderimi.
   - **Hocalara Program Gönder:** Koordinatörün tek tıkla tüm bölüm hocalarına kişiselleştirilmiş haftalık ders çizelgelerini e-posta ile iletmesi.

---

## 🚀 Hızlı Başlangıç (Yerel Bilgisayarda Çalıştırma)

1. Proje dizinindeki **`BASLAT.bat`** dosyasına çift tıklayın.
2. Otomatik olarak yerel sunucu açılacak ve tarayıcınızda `http://localhost:8080/login.html` sayfası açılacaktır.

---

## ☁️ GitHub'a Yükleme

Projeyi GitHub deponuza (`https://github.com/yavuzkayacan/hoca_ders`) göndermek için klasördeki **`GITHUB_YUKLE.bat`** dosyasına çift tıklamanız yeterlidir.

---


## 📬 1. Microsoft 365 E-Posta Altyapısı Canlıda Nasıl Çalışır?

İstanbul 29 Mayıs Üniversitesi kurumsal e-posta hizmetini Microsoft 365 / Exchange Online üzerinden (`@29mayis.edu.tr`) almaktadır. Sistemimiz, harici bir kütüphaneye gerek duymadan **saf PHP TLS soketleri (`backend/mailer.php`)** üzerinden doğrudan Microsoft 365 sunucularına bağlanacak şekilde hazırlanmıştır.

### Bilgi İşlem Daire Başkanlığı'ndan Talep Edilecekler:
Canlıda e-postaların sorunsuz çıkması için üniversite Bilgi İşlem biriminden aşağıdaki adımları isteyiniz:

1. **Sistem İçin Bir E-Posta Hesabı:**
   - Örnek: `dersprogrami@29mayis.edu.tr` veya `noreply@29mayis.edu.tr`
2. **Authenticated SMTP İzninin Açılması:**
   - Microsoft 365 Yönetim Merkezi'nde güvenlik sebebiyle yeni hesaplarda SMTP bazen kapalı gelir.
   - *M365 Admin Center -> Users -> Active Users -> İlgili Posta Kutusu -> Mail -> Manage email apps -> **Authenticated SMTP** kutucuğu işaretlenmelidir.*
3. **2FA / MFA Durumu (Uygulama Şifresi):**
   - Eğer kurumsal hesapta iki aşamalı doğrulama (SMS/Authenticator) zorunlu ise, hesaba girilip **Güvenlik Bilgileri -> Uygulama Şifresi (App Password)** üretilir ve bu şifre kullanılır.

### Canlı Ayarların Yapılması (`backend/config.php`):
`backend/config.php` dosyasını açıp aşağıdaki alanları canlı bilgilerinizle doldurunuz:

```php
// E-posta gönderimini aktif edin:
define('SMTP_ENABLED', true); 

define('SMTP_HOST', 'smtp.office365.com');
define('SMTP_PORT', 587); // STARTTLS Portu
define('SMTP_USER', 'dersprogrami@29mayis.edu.tr'); // Kurumsal hesap
define('SMTP_PASS', 'BilgiIslemSifresiVeyaUygulamaSifresi'); // Şifre
define('SMTP_FROM_EMAIL', 'dersprogrami@29mayis.edu.tr');
define('SMTP_FROM_NAME', '29 Mayıs Üniv. Ders Programı Sistemi');

// Şifre sıfırlama linklerinin doğru çalışması için canlı adresiniz:
define('APP_URL', 'https://dersprogrami.29mayis.edu.tr');
```

---

## 🌐 2. Sistemi Canlıya Alma Adımları (Adım Adım Rehber)

Üniversitenin alt alan adı ve hosting sunucusunda sistemi yayına almak için aşağıdaki 5 basit adımı takip edebilirsiniz:

### ADIM 1: Alt Alan Adını (Subdomain) Oluşturun
1. Üniversitenin web hosting paneline (cPanel / Plesk) giriş yapın.
2. **Subdomains (Alt Alan Adları)** bölümüne girin.
3. Alt alan adı olarak örneğin `dersprogrami` yazın (`dersprogrami.29mayis.edu.tr` olacaktır).
4. Belge Kökü (Document Root) olarak `public_html/dersprogrami` klasörünü seçip **Oluştur**'a tıklayın.

### ADIM 2: MySQL Veritabanını Kurun
1. cPanel ana sayfasından **MySQL Veritabanları (MySQL Databases)** bölümüne girin.
2. Yeni bir veritabanı oluşturun (Örn: `mayis29_derslik`).
3. Yeni bir veritabanı kullanıcısı oluşturun (Örn: `mayis29_user`) ve güçlü bir şifre belirleyin.
4. "Kullanıcıyı Veritabanına Ekle" kısmından kullanıcıyı veritabanına bağlayıp **"Tüm Yetkileri Ver (ALL PRIVILEGES)"** seçeneğini işaretleyin.
5. cPanel ana sayfasına dönüp **phpMyAdmin**'e tıklayın.
6. Sol menüden oluşturduğunuz veritabanına tıklayın.
7. Üst menüdeki **İçe Aktar (Import)** sekmesine gelin, `Dosya Seç` diyerek projenizdeki **`backend/schema.sql`** dosyasını yükleyin ve **Git** butonuna basın. (Tüm tablolar, fakülteler, kampüs derslikleri otomatik yüklenecektir.)

### ADIM 3: Veritabanı ve Mail Ayarlarını Girin
Bilgisayarınızdaki veya sunucudaki **`backend/config.php`** dosyasını açın:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'mayis29_derslik');       // 2. Adımda açtığınız ad
define('DB_USER', 'mayis29_user');          // 2. Adımda açtığınız kullanıcı
define('DB_PASS', 'BelirlediginizSifre');   // Veritabanı şifresi

define('SMTP_ENABLED', true);               // Microsoft 365 aktif
define('SMTP_USER', 'dersprogrami@29mayis.edu.tr');
define('SMTP_PASS', 'MailSifreniz');
define('APP_URL', 'https://dersprogrami.29mayis.edu.tr');
```

### ADIM 4: Dosyaları Sunucuya Yükleyin
1. **FileZilla (FTP)** programını açın veya cPanel içindeki **Dosya Yöneticisi (File Manager)** aracını kullanın.
2. `public_html/dersprogrami/` klasörünün içine projenin tüm dosyalarını yükleyin:
   ```text
   /public_html/dersprogrami/
   ├── index.html
   ├── login.html
   ├── admin.html
   ├── reset-password.html
   ├── css/
   │   ├── style.css
   │   └── grid.css
   ├── js/
   │   ├── mock-data.js
   │   ├── schedule-grid.js
   │   ├── conflict-checker.js
   │   ├── app.js
   │   └── admin.js
   └── backend/
       ├── config.php
       ├── mailer.php
       ├── api.php
       └── schema.sql
   ```
*(Not: `server.py` ve `database.db` yerel test içindir, canlı cPanel hostinge yüklenmesi gerekmez; canlıda standart PHP ve MySQL çalışır.)*

### ADIM 5: SSL Sertifikasını (HTTPS) Aktifleştirin
1. cPanel'de **SSL/TLS Status** veya **Let's Encrypt SSL** bölümüne gelin.
2. `dersprogrami.29mayis.edu.tr` alt alan adını seçip **Run AutoSSL** veya **Issue SSL** butonuna basın.
3. Birkaç dakika içinde yeşil kilit simgesi (HTTPS) aktif olacaktır.

---

## 🎯 3. Canlı Test ve Kullanım

Tarayıcınızdan artık sisteminize erişebilirsiniz:
- **Canlı Giriş Ekranı:** `https://dersprogrami.29mayis.edu.tr/login.html`
- **Varsayılan Yönetici:** `admin` / `123456` *(İlk girişte admin panelinden şifrenizi değiştirebilirsiniz)*
- **Bölüm Koordinatörleri:** `ceng_baskan`, `ilah_baskan`, `iibf_baskan` / `123456`

### Canlıda E-Posta Akışlarının Çalışması:
1. **Şifremi Unuttum:** Kullanıcı kurumsal e-postasını girdiğinde Microsoft 365 üzerinden `https://dersprogrami.29mayis.edu.tr/reset-password.html?token=...` bağlantısını içeren şık kurumsal e-posta anında iletilir.
2. **Hocalara Program Gönder:** Koordinatör "Hocalara Program Gönder" butonuna bastığında her hocanın gelen kutusuna kendi gün ve saatlerini, sınıf kodlarını içeren kişisel haftalık ders çizelgesi ulaşır.
