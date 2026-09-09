-- Istanbul 29 Mayis Universitesi - Ders, Derslik ve Hoca Esletirme Sistemi
-- MySQL Veritabani Semasi (cPanel / phpMyAdmin / MySQL icin)

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS schedule_slots;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS instructors;
DROP TABLE IF EXISTS classrooms;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS faculties;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Fakülteler
CREATE TABLE faculties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bölümler
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    FOREIGN KEY (faculty_id) REFERENCES faculties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Kullanıcılar (Koordinatörler ve Admin)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    password_plain VARCHAR(100) NOT NULL DEFAULT '123456',
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    role ENUM('admin', 'coordinator') DEFAULT 'coordinator',
    faculty_id INT NULL,
    department_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculties(id) ON DELETE SET NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Derslikler (Kampüs Geneli)
CREATE TABLE classrooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE, -- Örn: A-101, B-204, LAB-1
    name VARCHAR(100) NOT NULL,       -- Örn: A Blok 101 Nolu Amfi
    building VARCHAR(50) NOT NULL,    -- A Blok, B Blok, C Blok, Merkezi vb.
    capacity INT DEFAULT 40,
    room_type ENUM('standard', 'amfi', 'lab', 'seminar') DEFAULT 'standard',
    features TEXT NULL               -- Projeksiyon, Akıllı Tahta vb.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Öğretim Elemanları / Hocalar
CREATE TABLE instructors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT NOT NULL,
    title VARCHAR(50) DEFAULT 'Dr. Öğr. Üyesi', -- Prof. Dr., Doç. Dr., vb.
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Dersler
CREATE TABLE courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT NOT NULL,
    code VARCHAR(30) NOT NULL,        -- Örn: BLM101, PSK204
    name VARCHAR(150) NOT NULL,
    grade_level INT DEFAULT 1,        -- 1, 2, 3, 4. Sınıf
    weekly_hours INT DEFAULT 3,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Haftalık Ders Programı Eşleştirmeleri (Schedule Slots)
CREATE TABLE schedule_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT NOT NULL,
    grade_level INT NOT NULL DEFAULT 1, -- 1, 2, 3, 4. Sınıf
    course_id INT NULL,
    course_name VARCHAR(150) NOT NULL,
    course_code VARCHAR(30) NOT NULL,
    instructor_id INT NULL,
    instructor_name VARCHAR(100) NOT NULL,
    classroom_id INT NOT NULL,
    classroom_code VARCHAR(30) NOT NULL,
    day_name VARCHAR(20) NOT NULL,     -- Pazartesi, Salı, Çarşamba, Perşembe, Cuma, Cumartesi
    start_hour_index INT NOT NULL,     -- 0, 1, 2, 3... (zaman tablosundaki indeks)
    end_hour_index INT NOT NULL,       -- bitiş indeksi (dahil)
    start_time VARCHAR(10) NOT NULL,   -- Örn: 08:30
    end_time VARCHAR(10) NOT NULL,     -- Örn: 11:20
    academic_year VARCHAR(20) DEFAULT '2025-2026',
    semester VARCHAR(20) DEFAULT 'Bahar',
    color_tag VARCHAR(20) DEFAULT '#7B1123',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ÖRNEK BAŞLANGIÇ VERİLERİ (29 MAYIS ÜNİVERSİTESİ)
-- ============================================================

-- Fakülteler
INSERT INTO faculties (id, code, name) VALUES
(1, 'MUH', 'Mühendislik ve Doğa Bilimleri Fakültesi'),
(2, 'IIBF', 'İktisadi ve İdari Bilimler Fakültesi'),
(3, 'ILAH', 'İlahiyat Fakültesi'),
(4, 'EDEB', 'Edebiyat Fakültesi'),
(5, 'EGTM', 'Eğitim Fakültesi'),
(6, 'HUKUK', 'Hukuk Fakültesi');

-- Bölümler
INSERT INTO departments (id, faculty_id, code, name) VALUES
(1, 1, 'CENG', 'Bilgisayar Mühendisliği'),
(2, 1, 'SENG', 'Yazılım Mühendisliği'),
(3, 1, 'EEE', 'Elektrik-Elektronik Mühendisliği'),
(4, 2, 'ECON', 'İktisat'),
(5, 2, 'BA', 'İşletme'),
(6, 2, 'IR', 'Siyaset Bilimi ve Uluslararası İlişkiler'),
(7, 2, 'YBS', 'Yönetim Bilişim Sistemleri'),
(8, 2, 'SH', 'Sosyal Hizmet'),
(9, 3, 'TIB', 'Temel İslam Bilimleri'),
(10, 3, 'FDB', 'Felsefe ve Din Bilimleri'),
(11, 3, 'ITS', 'İslam Tarihi ve Sanatları'),
(12, 3, 'ILAH', 'İlahiyat Lisans Programı'),
(13, 4, 'HIST', 'Tarih'),
(14, 4, 'TDE', 'Türk Dili ve Edebiyatı'),
(15, 4, 'PHIL', 'Felsefe'),
(16, 4, 'PSYC', 'Psikoloji'),
(17, 4, 'TRNS', 'İngilizce Mütercim ve Tercümanlık'),
(18, 4, 'ARTR', 'Arapça Mütercim ve Tercümanlık'),
(19, 5, 'ELT', 'İngilizce Öğretmenliği'),
(20, 5, 'EME', 'İlköğretim Matematik Öğretmenliği'),
(21, 5, 'RPD', 'Rehberlik ve Psikolojik Danışmanlık'),
(22, 6, 'LAW', 'Hukuk Lisans Programı');

-- Kullanıcılar (Varsayılan şifreler: 123456)
INSERT INTO users (id, username, password_hash, password_plain, full_name, email, role, faculty_id, department_id) VALUES
(1, 'admin', 'e10adc3949ba59abbe56e057f20f883e', '123456', 'Sistem Yöneticisi', 'admin@29mayis.edu.tr', 'admin', NULL, NULL),
(2, 'ceng_baskan', 'e10adc3949ba59abbe56e057f20f883e', '123456', 'Bilgisayar Müh. Koordinatörü', 'ceng@29mayis.edu.tr', 'coordinator', 1, 1),
(3, 'ilah_baskan', 'e10adc3949ba59abbe56e057f20f883e', '123456', 'İlahiyat Fak. Koordinatörü', 'ilah@29mayis.edu.tr', 'coordinator', 3, 12),
(4, 'iibf_baskan', 'e10adc3949ba59abbe56e057f20f883e', '123456', 'İktisat Bölüm Koordinatörü', 'iibf@29mayis.edu.tr', 'coordinator', 2, 4),
(5, 'hukuk_baskan', 'e10adc3949ba59abbe56e057f20f883e', '123456', 'Hukuk Fak. Koordinatörü', 'hukuk@29mayis.edu.tr', 'coordinator', 6, 22),
(6, 'edeb_baskan', 'e10adc3949ba59abbe56e057f20f883e', '123456', 'Edebiyat Fak. Koordinatörü', 'edeb@29mayis.edu.tr', 'coordinator', 4, 13),
(7, 'egtm_baskan', 'e10adc3949ba59abbe56e057f20f883e', '123456', 'Eğitim Fak. Koordinatörü', 'egtm@29mayis.edu.tr', 'coordinator', 5, 19);

-- Derslikler
INSERT INTO classrooms (id, code, name, building, capacity, room_type, features) VALUES
(1, 'A-101', 'A Blok 101 Nolu Derslik', 'A Blok', 50, 'standard', 'Projeksiyon, Akıllı Tahta, Ses Sistemi'),
(2, 'A-102', 'A Blok 102 Nolu Derslik', 'A Blok', 50, 'standard', 'Projeksiyon, Akıllı Tahta'),
(3, 'A-201', 'A Blok 201 Nolu Derslik', 'A Blok', 45, 'standard', 'Projeksiyon'),
(4, 'A-Amfi-1', 'A Blok Büyük Amfi 1', 'A Blok', 120, 'amfi', 'Ses Sistemi, Projeksiyon, Amfi'),
(5, 'B-101', 'B Blok 101 Nolu Derslik', 'B Blok', 60, 'standard', 'Projeksiyon, Akıllı Tahta'),
(6, 'B-201', 'B Blok 201 Nolu Derslik', 'B Blok', 55, 'standard', 'Projeksiyon, Akıllı Tahta'),
(7, 'B-Lab-1', 'Bilgisayar Laboratuvarı 1', 'B Blok', 40, 'lab', '40 PC, Projeksiyon, Ağ Bağlantısı'),
(8, 'B-Lab-2', 'Yazılım Laboratuvarı 2', 'B Blok', 35, 'lab', '35 PC, Geliştirme Araçları'),
(9, 'C-101', 'C Blok 101 Nolu Derslik', 'C Blok', 40, 'standard', 'Projeksiyon'),
(10, 'C-201', 'C Blok 201 Nolu Derslik', 'C Blok', 45, 'standard', 'Projeksiyon'),
(11, 'C-Amfi-2', 'C Blok Konferans Amfisi', 'C Blok', 150, 'amfi', 'Ses Sistemi, Çift Projeksiyon, Amfi'),
(12, 'Merkez-Seminer', 'Merkezi Seminer Salonu', 'Rektörlük Binası', 30, 'seminar', 'Toplantı Masası, Video Konferans');

-- Öğretim Elemanları (İstanbul 29 Mayıs Üniversitesi Resmi Akademik Kadrosu)
INSERT INTO instructors (id, department_id, title, name, email) VALUES
(1, 1, 'Prof. Dr.', 'Abdulsamet Haşıloğlu', 'ahasiloglu@29mayis.edu.tr'),
(2, 1, 'Dr. Öğr. Üyesi', 'Ramazan Algın', 'ralgin@29mayis.edu.tr'),
(3, 1, 'Prof. Dr.', 'Murat Doğruel', 'mdogruel@29mayis.edu.tr'),
(4, 1, 'Dr. Öğr. Üyesi', 'Alper Şişman', 'asisman@29mayis.edu.tr'),
(5, 1, 'Dr. Öğr. Üyesi', 'Metin Dumanlı', 'mdumanli@29mayis.edu.tr'),
(6, 2, 'Dr. Öğr. Üyesi', 'Mehmet Fatih Karaca', 'mfkaraca@29mayis.edu.tr'),
(7, 1, 'Arş. Gör.', 'Burak Can', 'bcan@29mayis.edu.tr'),
(8, 4, 'Prof. Dr.', 'Mustafa Sinanoğlu', 'msinanoglu@29mayis.edu.tr'),
(9, 4, 'Prof. Dr.', 'Yaşar Akgün', 'yakgun@29mayis.edu.tr'),
(10, 6, 'Prof. Dr.', 'Recep Bozdoğan', 'rbozdogan@29mayis.edu.tr'),
(11, 7, 'Doç. Dr.', 'Talip Yiğit', 'tyigit@29mayis.edu.tr'),
(12, 8, 'Dr. Öğr. Üyesi', 'Yunus Adıgüzel', 'yadiguzel@29mayis.edu.tr'),
(13, 4, 'Dr. Öğr. Üyesi', 'Melike Bildirici', 'mbildirici@29mayis.edu.tr'),
(14, 7, 'Dr. Öğr. Üyesi', 'Caner Aydın', 'caydin@29mayis.edu.tr'),
(15, 12, 'Prof. Dr.', 'Ahmet Yücel', 'ayucel@29mayis.edu.tr'),
(16, 9, 'Prof. Dr.', 'İlyas Çelebi', 'icelebi@29mayis.edu.tr'),
(17, 9, 'Prof. Dr.', 'İbrahim Kâfi Dönmez', 'ikdonmez@29mayis.edu.tr'),
(18, 10, 'Prof. Dr.', 'Salime Leyla Gürkan', 'slgurkan@29mayis.edu.tr'),
(19, 9, 'Prof. Dr.', 'Ali Rıza Aydın', 'aaydin@29mayis.edu.tr'),
(20, 10, 'Prof. Dr.', 'İsmail Kara', 'ikara@29mayis.edu.tr'),
(21, 11, 'Prof. Dr.', 'Muhittin Serin', 'mserin@29mayis.edu.tr'),
(22, 9, 'Doç. Dr.', 'Halil İbrahim Kutlay', 'hikutlay@29mayis.edu.tr'),
(23, 9, 'Doç. Dr.', 'İsmail Şık', 'isik@29mayis.edu.tr'),
(24, 22, 'Prof. Dr.', 'Sera Reyhani Yüksel', 'sryuksel@29mayis.edu.tr'),
(25, 22, 'Prof. Dr.', 'Ali Bardakoğlu', 'abardakoglu@29mayis.edu.tr'),
(26, 22, 'Prof. Dr.', 'Hüseyin Özcan', 'hozcan@29mayis.edu.tr'),
(27, 22, 'Doç. Dr.', 'Abdurrahman Savaş', 'asavas@29mayis.edu.tr'),
(28, 22, 'Doç. Dr.', 'Hilal Merve Yazıcı', 'hyazici@29mayis.edu.tr'),
(29, 22, 'Dr. Öğr. Üyesi', 'Fatih Gündoğdu', 'fgundogdu@29mayis.edu.tr'),
(30, 22, 'Dr. Öğr. Üyesi', 'Zeynep Şahin', 'zsahin@29mayis.edu.tr'),
(31, 13, 'Prof. Dr.', 'Feridun Mustafa Emecen', 'femecen@29mayis.edu.tr'),
(32, 13, 'Prof. Dr.', 'Ali Akyıldız', 'aakyildiz@29mayis.edu.tr'),
(33, 14, 'Prof. Dr.', 'Emel Kefeli', 'ekefeli@29mayis.edu.tr'),
(34, 14, 'Prof. Dr.', 'Hatice Aynur', 'haynur@29mayis.edu.tr'),
(35, 15, 'Prof. Dr.', 'Tahsin Görgün', 'tgorgun@29mayis.edu.tr'),
(36, 16, 'Doç. Dr.', 'Nesrin Duman', 'nduman@29mayis.edu.tr'),
(37, 17, 'Prof. Dr.', 'Işın Öner', 'ioner@29mayis.edu.tr'),
(38, 18, 'Doç. Dr.', 'İbrahim Şaban', 'isaban@29mayis.edu.tr'),
(39, 14, 'Dr. Öğr. Üyesi', 'Bilal Kırımlı', 'bkirimli@29mayis.edu.tr'),
(40, 16, 'Dr. Öğr. Üyesi', 'Cansu Akyüz', 'cakyuz@29mayis.edu.tr'),
(41, 19, 'Prof. Dr.', 'Mehmet Çelik', 'mcelik@29mayis.edu.tr'),
(42, 20, 'Doç. Dr.', 'Selçuk Doğan', 'sdogan@29mayis.edu.tr'),
(43, 19, 'Dr. Öğr. Üyesi', 'Hale Işık', 'hisik@29mayis.edu.tr'),
(44, 21, 'Dr. Öğr. Üyesi', 'Tuğba Yılmaz', 'tyilmaz@29mayis.edu.tr'),
(45, 20, 'Dr. Öğr. Üyesi', 'Fatma Çelik', 'fcelik2@29mayis.edu.tr');

-- Dersler
INSERT INTO courses (id, department_id, code, name, grade_level, weekly_hours) VALUES
(1, 1, 'CENG101', 'Algoritmalar ve Programlama I', 1, 4),
(2, 1, 'CENG103', 'Bilgisayar Mühendisliğine Giriş', 1, 2),
(3, 1, 'MATH101', 'Genel Matematik I (Calculus I)', 1, 4),
(4, 1, 'PHYS101', 'Genel Fizik I', 1, 4),
(5, 1, 'CENG201', 'Veri Yapıları ve Algoritmalar', 2, 4),
(6, 1, 'CENG205', 'Ayrık Matematik', 2, 3),
(7, 1, 'CENG301', 'Veritabanı Yönetim Sistemleri', 3, 3),
(8, 1, 'CENG401', 'Bitirme Tezi & Projesi I', 4, 2),
(9, 2, 'SENG101', 'Yazılım Mühendisliğine Giriş', 1, 3),
(10, 2, 'SENG201', 'Nesneye Dayalı Analiz ve Tasarım', 2, 4),
(11, 4, 'ECON101', 'İktisada Giriş I (Mikro)', 1, 3),
(12, 4, 'ECON201', 'Makro İktisat Teorisi', 2, 3),
(13, 6, 'IR101', 'Siyaset Bilimine Giriş', 1, 3),
(14, 7, 'YBS101', 'Bilişim Sistemlerine Giriş', 1, 3),
(15, 8, 'SH101', 'Sosyal Hizmete Giriş', 1, 3),
(16, 12, 'ILAH101', 'Kur''an Okuma ve Tecvid I', 1, 4),
(17, 12, 'ILAH103', 'İslam İnanç Esasları (Akaid)', 1, 3),
(18, 12, 'ILAH105', 'Arap Dili ve Belagatı I', 1, 4),
(19, 12, 'ILAH201', 'Tefsir Usulü ve Tarihi', 2, 3),
(20, 12, 'ILAH203', 'Hadis Usulü ve Tarihi', 2, 3),
(21, 12, 'ILAH301', 'İslam Hukuku I (Fıkıh)', 3, 3),
(22, 22, 'LAW101', 'Hukuka Giriş ve Temel Kavramlar', 1, 3),
(23, 22, 'LAW103', 'Anayasa Hukuku (Genel Esaslar)', 1, 4),
(24, 22, 'LAW105', 'Medeni Hukuk I (Kişiler ve Aile)', 1, 4),
(25, 22, 'LAW201', 'Borçlar Hukuku (Genel Hükümler)', 2, 4),
(26, 22, 'LAW203', 'Ceza Hukuku (Genel Hükümler)', 2, 4),
(27, 13, 'HIST101', 'Tarih Metodolojisi ve Kaynak Bilgisi', 1, 3),
(28, 13, 'HIST201', 'Osmanlı Paleografyası ve Diplomatikası', 2, 3),
(29, 14, 'TDE101', 'Eski Türk Edebiyatına Giriş', 1, 3),
(30, 14, 'TDE103', 'Yeni Türk Edebiyatı I', 1, 3),
(31, 15, 'PHIL101', 'Felsefeye Giriş', 1, 3),
(32, 16, 'PSYC101', 'Genel Psikoloji I', 1, 3),
(33, 17, 'TRNS101', 'Çeviriye Giriş ve Çeviri Kuramları', 1, 3),
(34, 19, 'ELT101', 'İngilizce Dil Becerileri I', 1, 3),
(35, 20, 'EME101', 'Matematiğin Temelleri I', 1, 4),
(36, 21, 'RPD101', 'Eğitim Bilimine Giriş ve Psikolojik Danışma', 1, 3);

-- Örnek Başlangıç Programı
INSERT INTO schedule_slots 
(id, department_id, grade_level, course_id, course_name, course_code, instructor_id, instructor_name, classroom_id, classroom_code, day_name, start_hour_index, end_hour_index, start_time, end_time, color_tag)
VALUES
(1, 1, 1, 1, 'Algoritmalar ve Programlama I', 'CENG101', 1, 'Prof. Dr. Abdulsamet Haşıloğlu', 7, 'B-Lab-1', 'Pazartesi', 1, 3, '09:00', '11:50', '#203551'),
(2, 1, 1, 3, 'Genel Matematik I (Calculus I)', 'MATH101', 2, 'Dr. Öğr. Üyesi Ramazan Algın', 4, 'A-Amfi-1', 'Salı', 0, 2, '08:00', '10:50', '#096ea9'),
(3, 12, 1, 16, 'Kur''an Okuma ve Tecvid I', 'ILAH101', 15, 'Prof. Dr. Ahmet Yücel', 6, 'B-201', 'Çarşamba', 1, 3, '09:00', '11:50', '#0E7C7B'),
(4, 4, 1, 11, 'İktisada Giriş I (Mikro)', 'ECON101', 9, 'Prof. Dr. Yaşar Akgün', 1, 'A-101', 'Perşembe', 2, 4, '10:00', '12:50', '#C59B27'),
(5, 22, 1, 24, 'Medeni Hukuk I (Kişiler ve Aile)', 'LAW105', 24, 'Prof. Dr. Sera Reyhani Yüksel', 11, 'C-Amfi-2', 'Cuma', 1, 3, '09:00', '11:50', '#102A43');
