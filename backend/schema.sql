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
(3, 2, 'ECON', 'İktisat'),
(4, 2, 'BA', 'İşletme'),
(5, 2, 'IR', 'Siyaset Bilimi ve Uluslararası İlişkiler'),
(6, 3, 'ILAH', 'İlahiyat Programı'),
(7, 4, 'PSYC', 'Psikoloji'),
(8, 4, 'PHIL', 'Felsefe'),
(9, 4, 'HIST', 'Tarih'),
(10, 4, 'TDE', 'Türk Dili ve Edebiyatı'),
(11, 4, 'TRNS', 'İngilizce Mütercim ve Tercümanlık'),
(12, 6, 'LAW', 'Hukuk Lisans Programı');

-- Kullanıcılar (Varsayılan şifreler: 123456)
INSERT INTO users (id, username, password_hash, password_plain, full_name, email, role, faculty_id, department_id) VALUES
(1, 'admin', 'e10adc3949ba59abbe56e057f20f883e', '123456', 'Sistem Yöneticisi', 'admin@29mayis.edu.tr', 'admin', NULL, NULL),
(2, 'ceng_baskan', 'e10adc3949ba59abbe56e057f20f883e', '123456', 'Bilgisayar Müh. Koordinatörü', 'ceng@29mayis.edu.tr', 'coordinator', 1, 1),
(3, 'ilah_baskan', 'e10adc3949ba59abbe56e057f20f883e', '123456', 'İlahiyat Fak. Koordinatörü', 'ilah@29mayis.edu.tr', 'coordinator', 3, 6),
(4, 'iibf_baskan', 'e10adc3949ba59abbe56e057f20f883e', '123456', 'İktisat Bölüm Koordinatörü', 'iibf@29mayis.edu.tr', 'coordinator', 2, 3),
(5, 'psyc_baskan', 'e10adc3949ba59abbe56e057f20f883e', '123456', 'Psikoloji Bölüm Koordinatörü', 'psyc@29mayis.edu.tr', 'coordinator', 4, 7);

-- Derslikler
INSERT INTO classrooms (id, code, name, building, capacity, room_type, features) VALUES
(1, 'A-101', 'A Blok 101 Nolu Derslik', 'A Blok', 50, 'standard', 'Projeksiyon, Akıllı Tahta, Ses Sistemi'),
(2, 'A-102', 'A Blok 102 Nolu Derslik', 'A Blok', 50, 'standard', 'Projeksiyon, Akıllı Tahta'),
(3, 'A-201', 'A Blok 201 Nolu Derslik', 'A Blok', 45, 'standard', 'Projeksiyon'),
(4, 'A-Amfi-1', 'A Blok Büyük Amfi 1', 'A Blok', 120, 'amfi', 'Projeksiyon, Çift Mikrofon, Amfi Düzeni'),
(5, 'B-101', 'B Blok 101 Nolu Derslik', 'B Blok', 60, 'standard', 'Projeksiyon, Akıllı Tahta'),
(6, 'B-201', 'B Blok 201 Nolu Derslik', 'B Blok', 55, 'standard', 'Projeksiyon, Akıllı Tahta'),
(7, 'B-Lab-1', 'Bilgisayar Laboratuvarı 1', 'B Blok', 40, 'lab', '40 PC, Projeksiyon, Yüksek Hızlı İnternet'),
(8, 'B-Lab-2', 'Yazılım Laboratuvarı 2', 'B Blok', 35, 'lab', '35 PC, Geliştirme Ortamı, Projeksiyon'),
(9, 'C-101', 'C Blok 101 Nolu Derslik', 'C Blok', 40, 'standard', 'Projeksiyon'),
(10, 'C-201', 'C Blok 201 Nolu Derslik', 'C Blok', 45, 'standard', 'Projeksiyon'),
(11, 'C-Amfi-2', 'C Blok Konferans Amfisi', 'C Blok', 150, 'amfi', 'Ses Sistemi, Projeksiyon, Amfi'),
(12, 'Merkez-Seminer', 'Merkezi Seminer Salonu', 'Rektörlük Binası', 30, 'seminar', 'Toplantı Masası, Video Konferans');

-- Öğretim Elemanları
INSERT INTO instructors (id, department_id, title, name, email) VALUES
(1, 1, 'Prof. Dr.', 'Mustafa Tahsin', 'mtahsin@29mayis.edu.tr'),
(2, 1, 'Doç. Dr.', 'Elif Demir', 'edemir@29mayis.edu.tr'),
(3, 1, 'Dr. Öğr. Üyesi', 'Mehmet Kaya', 'mkaya@29mayis.edu.tr'),
(4, 2, 'Doç. Dr.', 'Hakan Öztürk', 'hozturk@29mayis.edu.tr'),
(5, 3, 'Prof. Dr.', 'Zeynep Aksoy', 'zaksoy@29mayis.edu.tr'),
(6, 6, 'Prof. Dr.', 'Ali Rıza Aydın', 'aaydin@29mayis.edu.tr'),
(7, 6, 'Doç. Dr.', 'Fatma Betül Çelik', 'fcelik@29mayis.edu.tr'),
(8, 7, 'Dr. Öğr. Üyesi', 'Ayşe Güler', 'aguler@29mayis.edu.tr'),
(9, 12, 'Prof. Dr.', 'Kemal Şahin', 'ksahin@29mayis.edu.tr');

-- Dersler
INSERT INTO courses (id, department_id, code, name, grade_level, weekly_hours) VALUES
(1, 1, 'CENG101', 'Algoritmalar ve Programlama I', 1, 4),
(2, 1, 'CENG103', 'Bilgisayar Mühendisliğine Giriş', 1, 2),
(3, 1, 'MATH101', 'Genel Matematik I', 1, 4),
(4, 1, 'PHYS101', 'Genel Fizik I', 1, 4),
(5, 1, 'CENG201', 'Veri Yapıları', 2, 4),
(6, 1, 'CENG205', 'Ayrık Matematik', 2, 3),
(7, 1, 'CENG301', 'Veritabanı Yönetim Sistemleri', 3, 3),
(8, 1, 'CENG401', 'Bitirme Projesi I', 4, 2),
(9, 3, 'ECON101', 'İktisada Giriş I', 1, 3),
(10, 3, 'ECON201', 'Mikro İktisat', 2, 3),
(11, 6, 'ILAH101', 'Kuran Okuma ve Tecvid I', 1, 4),
(12, 6, 'ILAH103', 'İslam İnanç Esasları', 1, 3),
(13, 6, 'ILAH201', 'Tefsir Usulü ve Tarihi', 2, 3),
(14, 7, 'PSYC101', 'Psikolojiye Giriş', 1, 3),
(15, 12, 'LAW101', 'Anayasa Hukuku', 1, 4);

-- Örnek Başlangıç Programı (Çakışma Kontrolünü test edebilmek için önceden eklenmiş dersler)
INSERT INTO schedule_slots 
(id, department_id, grade_level, course_id, course_name, course_code, instructor_id, instructor_name, classroom_id, classroom_code, day_name, start_hour_index, end_hour_index, start_time, end_time, color_tag)
VALUES
(1, 1, 1, 1, 'Algoritmalar ve Programlama I', 'CENG101', 1, 'Prof. Dr. Mustafa Tahsin', 7, 'B-Lab-1', 'Pazartesi', 1, 3, '09:30', '12:20', '#102A43'),
(2, 1, 1, 3, 'Genel Matematik I', 'MATH101', 3, 'Dr. Öğr. Üyesi Mehmet Kaya', 4, 'A-Amfi-1', 'Salı', 0, 2, '08:30', '11:20', '#7B1123'),
(3, 6, 1, 11, 'Kuran Okuma ve Tecvid I', 'ILAH101', 6, 'Prof. Dr. Ali Rıza Aydın', 6, 'B-201', 'Çarşamba', 1, 3, '09:30', '12:20', '#1A535C'),
(4, 3, 1, 9, 'İktisada Giriş I', 'ECON101', 5, 'Prof. Dr. Zeynep Aksoy', 1, 'A-101', 'Perşembe', 2, 4, '10:30', '13:20', '#D48806');
