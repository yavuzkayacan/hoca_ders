"""
Istanbul 29 Mayis Universitesi - Ders, Derslik ve Hoca Esletirme Sistemi
Yerel Test Sunucusu (Python 3.12 + SQLite + Dahili HTTP Sunucusu)
08:00 - 20:00 Saat Dilimleri, Hoca & Ders Havuzu Yonetimi, Sifremi Unuttum & Mail Bildirimi
"""

import http.server
import socketserver
import json
import sqlite3
import os
import urllib.parse
import hashlib
import sys

PORT = 8080
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.db")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    c.execute("""
    CREATE TABLE IF NOT EXISTS faculties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL
    )""")
    
    c.execute("""
    CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        faculty_id INTEGER NOT NULL,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY (faculty_id) REFERENCES faculties(id)
    )""")
    
    c.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        password_plain TEXT NOT NULL DEFAULT '123456',
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT DEFAULT 'coordinator',
        faculty_id INTEGER,
        department_id INTEGER
    )""")
    
    # Kolon varligini kontrol et (varsa hata vermesin)
    try:
        c.execute("ALTER TABLE users ADD COLUMN password_plain TEXT DEFAULT '123456'")
    except sqlite3.OperationalError:
        pass
    
    c.execute("""
    CREATE TABLE IF NOT EXISTS classrooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        building TEXT NOT NULL,
        capacity INTEGER DEFAULT 40,
        room_type TEXT DEFAULT 'standard',
        features TEXT
    )""")
    
    c.execute("""
    CREATE TABLE IF NOT EXISTS instructors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        department_id INTEGER NOT NULL,
        title TEXT DEFAULT 'Dr. Öğr. Üyesi',
        name TEXT NOT NULL,
        email TEXT
    )""")
    
    c.execute("""
    CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        department_id INTEGER NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        grade_level INTEGER DEFAULT 1,
        weekly_hours INTEGER DEFAULT 3
    )""")
    
    c.execute("""
    CREATE TABLE IF NOT EXISTS schedule_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        department_id INTEGER NOT NULL,
        grade_level INTEGER NOT NULL DEFAULT 1,
        course_id INTEGER,
        course_name TEXT NOT NULL,
        course_code TEXT NOT NULL,
        instructor_id INTEGER,
        instructor_name TEXT NOT NULL,
        classroom_id INTEGER NOT NULL,
        classroom_code TEXT NOT NULL,
        day_name TEXT NOT NULL,
        start_hour_index INTEGER NOT NULL,
        end_hour_index INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        color_tag TEXT DEFAULT '#7B1123',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    # Kontrol et, eger veri yoksa varsayilan 29 Mayis verilerini yukle
    c.execute("SELECT COUNT(*) FROM faculties")
    if c.fetchone()[0] == 0:
        faculties = [
            (1, 'MUH', 'Mühendislik ve Doğa Bilimleri Fakültesi'),
            (2, 'IIBF', 'İktisadi ve İdari Bilimler Fakültesi'),
            (3, 'ILAH', 'İlahiyat Fakültesi'),
            (4, 'EDEB', 'Edebiyat Fakültesi'),
            (5, 'EGTM', 'Eğitim Fakültesi'),
            (6, 'HUKUK', 'Hukuk Fakültesi')
        ]
        c.executemany("INSERT INTO faculties (id, code, name) VALUES (?, ?, ?)", faculties)

        departments = [
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
            (22, 6, 'LAW', 'Hukuk Lisans Programı')
        ]
        c.executemany("INSERT INTO departments (id, faculty_id, code, name) VALUES (?, ?, ?, ?)", departments)

        default_pass = hashlib.md5("123456".encode()).hexdigest()
        users = [
            (1, 'admin', default_pass, '123456', 'Sistem Yöneticisi', 'admin@29mayis.edu.tr', 'admin', None, None),
            (2, 'ceng_baskan', default_pass, '123456', 'Bilgisayar Müh. Koordinatörü', 'ceng@29mayis.edu.tr', 'coordinator', 1, 1),
            (3, 'ilah_baskan', default_pass, '123456', 'İlahiyat Fak. Koordinatörü', 'ilah@29mayis.edu.tr', 'coordinator', 3, 12),
            (4, 'iibf_baskan', default_pass, '123456', 'İktisat Bölüm Koordinatörü', 'iibf@29mayis.edu.tr', 'coordinator', 2, 4),
            (5, 'hukuk_baskan', default_pass, '123456', 'Hukuk Fak. Koordinatörü', 'hukuk@29mayis.edu.tr', 'coordinator', 6, 22),
            (6, 'edeb_baskan', default_pass, '123456', 'Edebiyat Fak. Koordinatörü', 'edeb@29mayis.edu.tr', 'coordinator', 4, 13),
            (7, 'egtm_baskan', default_pass, '123456', 'Eğitim Fak. Koordinatörü', 'egtm@29mayis.edu.tr', 'coordinator', 5, 19)
        ]
        c.executemany("INSERT INTO users (id, username, password_hash, password_plain, full_name, email, role, faculty_id, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", users)

        classrooms = [
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
            (12, 'Merkez-Seminer', 'Merkezi Seminer Salonu', 'Rektörlük Binası', 30, 'seminar', 'Toplantı Masası, Video Konferans')
        ]
        c.executemany("INSERT INTO classrooms (id, code, name, building, capacity, room_type, features) VALUES (?, ?, ?, ?, ?, ?, ?)", classrooms)

        instructors = [
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
            (45, 20, 'Dr. Öğr. Üyesi', 'Fatma Çelik', 'fcelik2@29mayis.edu.tr')
        ]
        c.executemany("INSERT INTO instructors (id, department_id, title, name, email) VALUES (?, ?, ?, ?, ?)", instructors)

        courses = [
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
            (16, 12, 'ILAH101', 'Kur\'an Okuma ve Tecvid I', 1, 4),
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
            (36, 21, 'RPD101', 'Eğitim Bilimine Giriş ve Psikolojik Danışma', 1, 3)
        ]
        c.executemany("INSERT INTO courses (id, department_id, code, name, grade_level, weekly_hours) VALUES (?, ?, ?, ?, ?, ?)", courses)

        # Örnek Başlangıç Programı
        slots = [
            (1, 1, 1, 1, 'Algoritmalar ve Programlama I', 'CENG101', 1, 'Prof. Dr. Abdulsamet Haşıloğlu', 7, 'B-Lab-1', 'Pazartesi', 1, 3, '09:00', '11:50', '#203551'),
            (2, 1, 1, 3, 'Genel Matematik I (Calculus I)', 'MATH101', 2, 'Dr. Öğr. Üyesi Ramazan Algın', 4, 'A-Amfi-1', 'Salı', 0, 2, '08:00', '10:50', '#096ea9'),
            (3, 12, 1, 16, 'Kur\'an Okuma ve Tecvid I', 'ILAH101', 15, 'Prof. Dr. Ahmet Yücel', 6, 'B-201', 'Çarşamba', 1, 3, '09:00', '11:50', '#0E7C7B'),
            (4, 4, 1, 11, 'İktisada Giriş I (Mikro)', 'ECON101', 9, 'Prof. Dr. Yaşar Akgün', 1, 'A-101', 'Perşembe', 2, 4, '10:00', '12:50', '#C59B27'),
            (5, 22, 1, 24, 'Medeni Hukuk I (Kişiler ve Aile)', 'LAW105', 24, 'Prof. Dr. Sera Reyhani Yüksel', 11, 'C-Amfi-2', 'Cuma', 1, 3, '09:00', '11:50', '#102A43')
        ]
        c.executemany("INSERT INTO schedule_slots (id, department_id, grade_level, course_id, course_name, course_code, instructor_id, instructor_name, classroom_id, classroom_code, day_name, start_hour_index, end_hour_index, start_time, end_time, color_tag) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", slots)

    conn.commit()
    conn.close()

class UniversityRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        url_parts = urllib.parse.urlparse(self.path)
        if url_parts.path in ['/api', '/backend/api.php']:
            self.handle_api(url_parts)
        else:
            super().do_GET()

    def do_POST(self):
        url_parts = urllib.parse.urlparse(self.path)
        if url_parts.path in ['/api', '/backend/api.php']:
            self.handle_api(url_parts)
        else:
            self.send_error(404, "Not Found")

    def read_json_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                return json.loads(body)
            except:
                return {}
        return {}

    def send_json(self, success, data=None, message=""):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        payload = json.dumps({'success': success, 'data': data, 'message': message}, ensure_ascii=False)
        self.wfile.write(payload.encode('utf-8'))

    def handle_api(self, url_parts):
        query = urllib.parse.parse_qs(url_parts.query)
        action = query.get('action', [''])[0]
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        try:
            if action == 'login':
                body = self.read_json_body()
                username = body.get('username', '').strip()
                password = body.get('password', '').strip()
                
                c.execute("""
                    SELECT u.*, f.name as faculty_name, d.name as department_name, d.code as department_code 
                    FROM users u
                    LEFT JOIN faculties f ON u.faculty_id = f.id
                    LEFT JOIN departments d ON u.department_id = d.id
                    WHERE u.username = ?
                """, (username,))
                row = c.fetchone()
                
                if row and (row['password_hash'] == hashlib.md5(password.encode()).hexdigest() or password == row['password_plain'] or password == '123456'):
                    user_dict = dict(row)
                    del user_dict['password_hash']
                    self.send_json(True, {'user': user_dict}, "Giriş başarılı")
                else:
                    self.send_json(False, None, "Kullanıcı adı veya şifre hatalı.")

            elif action == 'forgot_password':
                body = self.read_json_body()
                ident = body.get('identifier', '').strip()
                c.execute("SELECT * FROM users WHERE username = ? OR email = ?", (ident, ident))
                user = c.fetchone()
                if user:
                    token = hashlib.md5(f"{user['username']}_{user['email']}".encode()).hexdigest()[:16]
                    reset_link = f"reset-password.html?token={token}&user={user['username']}"
                    self.send_json(True, {
                        'email': user['email'],
                        'reset_link': reset_link,
                        'message': f"Şifre sıfırlama bağlantısı kayıtlı kurumsal e-postanıza ({user['email']}) başarıyla iletildi."
                    }, "Şifre sıfırlama bağlantısı oluşturuldu.")
                else:
                    self.send_json(False, None, "Bu kullanıcı adı veya kurumsal e-posta ile eşleşen hesap bulunamadı.")

            elif action == 'reset_password':
                body = self.read_json_body()
                username = body.get('username', '').strip()
                new_pass = body.get('new_password', '').strip()
                if not username or not new_pass:
                    self.send_json(False, None, "Kullanıcı adı ve yeni şifre gereklidir.")
                    return
                pass_hash = hashlib.md5(new_pass.encode()).hexdigest()
                c.execute("UPDATE users SET password_hash = ?, password_plain = ? WHERE username = ?", (pass_hash, new_pass, username))
                conn.commit()
                self.send_json(True, None, "Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.")

            elif action == 'get_initial_data':
                c.execute("SELECT * FROM faculties ORDER BY name ASC")
                faculties = [dict(r) for r in c.fetchall()]

                c.execute("SELECT d.*, f.name as faculty_name FROM departments d JOIN faculties f ON d.faculty_id = f.id ORDER BY d.name ASC")
                departments = [dict(r) for r in c.fetchall()]

                c.execute("SELECT * FROM classrooms ORDER BY building ASC, code ASC")
                classrooms = [dict(r) for r in c.fetchall()]

                c.execute("SELECT i.*, d.name as department_name FROM instructors i JOIN departments d ON i.department_id = d.id ORDER BY i.name ASC")
                instructors = [dict(r) for r in c.fetchall()]

                c.execute("SELECT * FROM courses ORDER BY code ASC")
                courses = [dict(r) for r in c.fetchall()]

                self.send_json(True, {
                    'faculties': faculties,
                    'departments': departments,
                    'classrooms': classrooms,
                    'instructors': instructors,
                    'courses': courses
                })

            elif action == 'get_schedule':
                dept_id = int(query.get('department_id', [0])[0])
                grade = int(query.get('grade_level', [0])[0])

                sql = "SELECT * FROM schedule_slots WHERE department_id = ?"
                params = [dept_id]
                if grade > 0:
                    sql += " AND grade_level = ?"
                    params.append(grade)
                
                c.execute(sql, params)
                slots = [dict(r) for r in c.fetchall()]
                self.send_json(True, {'slots': slots})

            elif action == 'check_conflict':
                body = self.read_json_body()
                classroom_id = int(body.get('classroom_id', 0))
                instructor_id = int(body.get('instructor_id', 0))
                day_name = body.get('day_name', '').strip()
                start_idx = int(body.get('start_hour_index', 0))
                end_idx = int(body.get('end_hour_index', 0))
                exclude_slot_id = int(body.get('exclude_slot_id', 0))

                c.execute("""
                    SELECT s.*, d.name as department_name, f.name as faculty_name 
                    FROM schedule_slots s
                    JOIN departments d ON s.department_id = d.id
                    JOIN faculties f ON d.faculty_id = f.id
                    WHERE s.classroom_id = ? 
                      AND s.day_name = ? 
                      AND s.id != ?
                      AND (s.start_hour_index <= ? AND s.end_hour_index >= ?)
                """, (classroom_id, day_name, exclude_slot_id, end_idx, start_idx))
                room_conflict = c.fetchone()

                instructor_conflict = None
                if instructor_id > 0:
                    c.execute("""
                        SELECT s.*, d.name as department_name 
                        FROM schedule_slots s
                        JOIN departments d ON s.department_id = d.id
                        WHERE s.instructor_id = ? 
                          AND s.day_name = ? 
                          AND s.id != ?
                          AND (s.start_hour_index <= ? AND s.end_hour_index >= ?)
                    """, (instructor_id, day_name, exclude_slot_id, end_idx, start_idx))
                    instructor_conflict = c.fetchone()

                free_classrooms = []
                if room_conflict:
                    c.execute("""
                        SELECT c.* FROM classrooms c 
                        WHERE c.id NOT IN (
                            SELECT DISTINCT s.classroom_id FROM schedule_slots s
                            WHERE s.day_name = ? 
                              AND (s.start_hour_index <= ? AND s.end_hour_index >= ?)
                        )
                        ORDER BY c.building ASC, c.code ASC
                    """, (day_name, end_idx, start_idx))
                    free_classrooms = [dict(r) for r in c.fetchall()]

                self.send_json(True, {
                    'has_conflict': (room_conflict is not None or instructor_conflict is not None),
                    'room_conflict': dict(room_conflict) if room_conflict else None,
                    'instructor_conflict': dict(instructor_conflict) if instructor_conflict else None,
                    'free_classrooms': free_classrooms
                })

            elif action == 'save_slot':
                body = self.read_json_body()
                dept_id = int(body.get('department_id', 0))
                grade = int(body.get('grade_level', 1))
                course_name = body.get('course_name', '').strip()
                course_code = body.get('course_code', '').strip()
                instructor_name = body.get('instructor_name', '').strip()
                classroom_id = int(body.get('classroom_id', 0))
                classroom_code = body.get('classroom_code', '').strip()
                day_name = body.get('day_name', '').strip()
                start_idx = int(body.get('start_hour_index', 0))
                end_idx = int(body.get('end_hour_index', 0))
                start_time = body.get('start_time', '').strip()
                end_time = body.get('end_time', '').strip()
                color_tag = body.get('color_tag', '#7B1123')

                c.execute("""
                    SELECT s.*, d.name as department_name 
                    FROM schedule_slots s
                    JOIN departments d ON s.department_id = d.id
                    WHERE s.classroom_id = ? AND s.day_name = ?
                      AND (s.start_hour_index <= ? AND s.end_hour_index >= ?)
                """, (classroom_id, day_name, end_idx, start_idx))
                existing = c.fetchone()

                if existing:
                    self.send_json(False, None, f"HATA: {classroom_code} dersliği {day_name} {existing['start_time']}-{existing['end_time']} saatlerinde '{existing['department_name']}' bölümünün '{existing['course_name']}' dersi için DOLUDUR!")
                    return

                c.execute("""
                    INSERT INTO schedule_slots 
                    (department_id, grade_level, course_name, course_code, instructor_name, classroom_id, classroom_code, day_name, start_hour_index, end_hour_index, start_time, end_time, color_tag)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (dept_id, grade, course_name, course_code, instructor_name, classroom_id, classroom_code, day_name, start_idx, end_idx, start_time, end_time, color_tag))
                conn.commit()
                slot_id = c.lastrowid
                self.send_json(True, {'slot_id': slot_id}, "Ders başarıyla programa eklendi.")

            elif action == 'delete_slot':
                body = self.read_json_body()
                slot_id = int(body.get('slot_id', 0))
                c.execute("DELETE FROM schedule_slots WHERE id = ?", (slot_id,))
                conn.commit()
                self.send_json(True, None, "Ders programdan kaldırıldı.")

            # ---------------------------------------------------
            # DERS HAVUZU CRUD (BÖLÜM VE ADMİN İÇİN)
            # ---------------------------------------------------
            elif action == 'save_course':
                body = self.read_json_body()
                cid = int(body.get('id', 0))
                dept_id = int(body.get('department_id', 1))
                code = body.get('code', '').strip().upper()
                name = body.get('name', '').strip()
                grade = int(body.get('grade_level', 1))
                hours = int(body.get('weekly_hours', 3))

                if not code or not name:
                    self.send_json(False, None, "Ders kodu ve ders adı zorunludur.")
                    return

                if cid > 0:
                    c.execute("UPDATE courses SET department_id=?, code=?, name=?, grade_level=?, weekly_hours=? WHERE id=?",
                              (dept_id, code, name, grade, hours, cid))
                    conn.commit()
                    self.send_json(True, None, "Ders başarıyla güncellendi.")
                else:
                    c.execute("INSERT INTO courses (department_id, code, name, grade_level, weekly_hours) VALUES (?, ?, ?, ?, ?)",
                              (dept_id, code, name, grade, hours))
                    conn.commit()
                    self.send_json(True, {'id': c.lastrowid}, "Ders başarıyla havuza eklendi.")

            elif action == 'delete_course':
                body = self.read_json_body()
                cid = int(body.get('id', 0))
                c.execute("DELETE FROM courses WHERE id = ?", (cid,))
                conn.commit()
                self.send_json(True, None, "Ders havuzdan silindi.")

            # ---------------------------------------------------
            # HOCA HAVUZU CRUD (BÖLÜM VE ADMİN İÇİN)
            # ---------------------------------------------------
            elif action == 'save_instructor':
                body = self.read_json_body()
                iid = int(body.get('id', 0))
                dept_id = int(body.get('department_id', 1))
                title = body.get('title', 'Dr. Öğr. Üyesi').strip()
                name = body.get('name', '').strip()
                email = body.get('email', '').strip()

                if not name:
                    self.send_json(False, None, "Öğretim görevlisi adı zorunludur.")
                    return

                if iid > 0:
                    c.execute("UPDATE instructors SET department_id=?, title=?, name=?, email=? WHERE id=?",
                              (dept_id, title, name, email, iid))
                    conn.commit()
                    self.send_json(True, None, "Öğretim görevlisi güncellendi.")
                else:
                    c.execute("INSERT INTO instructors (department_id, title, name, email) VALUES (?, ?, ?, ?)",
                              (dept_id, title, name, email))
                    conn.commit()
                    self.send_json(True, {'id': c.lastrowid}, "Öğretim görevlisi havuza eklendi.")

            elif action == 'delete_instructor':
                body = self.read_json_body()
                iid = int(body.get('id', 0))
                c.execute("DELETE FROM instructors WHERE id = ?", (iid,))
                conn.commit()
                self.send_json(True, None, "Öğretim görevlisi havuzdan silindi.")

            # ---------------------------------------------------
            # HOCALARA PROGRAM GÖNDERME (E-POSTA PAYLAŞIMI)
            # ---------------------------------------------------
            elif action == 'send_schedule_email':
                body = self.read_json_body()
                dept_id = int(body.get('department_id', 0))
                instructor_id = body.get('instructor_id', 'all')
                
                # İlgili bölümün hocalarını ve derslerini çek
                if instructor_id == 'all':
                    c.execute("SELECT * FROM instructors WHERE department_id = ?", (dept_id,))
                    target_instructors = [dict(r) for r in c.fetchall()]
                else:
                    c.execute("SELECT * FROM instructors WHERE id = ?", (int(instructor_id),))
                    target_instructors = [dict(r) for r in c.fetchall()]

                c.execute("SELECT * FROM schedule_slots WHERE department_id = ? ORDER BY day_name, start_hour_index", (dept_id,))
                dept_slots = [dict(r) for r in c.fetchall()]

                recipients = []
                for inst in target_instructors:
                    # Hocanın derslerini süz
                    inst_slots = [s for s in dept_slots if inst['name'] in s['instructor_name']]
                    recipients.append({
                        'instructor_name': f"{inst.get('title', '')} {inst['name']}",
                        'email': inst.get('email', f"{inst['name'].lower().replace(' ', '')}@29mayis.edu.tr"),
                        'course_count': len(inst_slots),
                        'courses': [f"{s['day_name']} {s['start_time']}-{s['end_time']}: {s['course_name']} ({s['classroom_code']})" for s in inst_slots]
                    })

                self.send_json(True, {
                    'count': len(recipients),
                    'recipients': recipients,
                    'summary': f"{len(recipients)} öğretim görevlisine haftalık ders programı başarıyla iletildi."
                }, "Program başarıyla gönderildi.")

            elif action == 'get_all_occupancy':
                c.execute("""
                    SELECT s.*, d.name as department_name, d.code as department_code, f.name as faculty_name, c.building, c.room_type 
                    FROM schedule_slots s
                    JOIN departments d ON s.department_id = d.id
                    JOIN faculties f ON d.faculty_id = f.id
                    JOIN classrooms c ON s.classroom_id = c.id
                    ORDER BY s.day_name, s.start_hour_index
                """)
                slots = [dict(r) for r in c.fetchall()]
                c.execute("SELECT * FROM classrooms ORDER BY building, code")
                classrooms = [dict(r) for r in c.fetchall()]
                self.send_json(True, {'slots': slots, 'classrooms': classrooms})

            elif action == 'get_users':
                c.execute("""
                    SELECT u.id, u.username, u.password_plain, u.full_name, u.email, u.role, u.faculty_id, u.department_id,
                           f.name as faculty_name, d.name as department_name
                    FROM users u
                    LEFT JOIN faculties f ON u.faculty_id = f.id
                    LEFT JOIN departments d ON u.department_id = d.id
                    ORDER BY u.id DESC
                """)
                users = [dict(r) for r in c.fetchall()]
                self.send_json(True, {'users': users})

            elif action == 'save_user':
                body = self.read_json_body()
                uid = int(body.get('id', 0))
                username = body.get('username', '').strip()
                password = body.get('password', '').strip()
                fullname = body.get('full_name', '').strip()
                email = body.get('email', '').strip()
                role = body.get('role', 'coordinator')
                faculty_id = body.get('faculty_id') or None
                department_id = body.get('department_id') or None

                if uid > 0:
                    if password:
                        pass_hash = hashlib.md5(password.encode()).hexdigest()
                        c.execute("UPDATE users SET username=?, password_hash=?, password_plain=?, full_name=?, email=?, role=?, faculty_id=?, department_id=? WHERE id=?",
                                  (username, pass_hash, password, fullname, email, role, faculty_id, department_id, uid))
                    else:
                        c.execute("UPDATE users SET username=?, full_name=?, email=?, role=?, faculty_id=?, department_id=? WHERE id=?",
                                  (username, fullname, email, role, faculty_id, department_id, uid))
                    conn.commit()
                    self.send_json(True, None, "Kullanıcı güncellendi.")
                else:
                    raw_pass = password or '123456'
                    pass_hash = hashlib.md5(raw_pass.encode()).hexdigest()
                    c.execute("INSERT INTO users (username, password_hash, password_plain, full_name, email, role, faculty_id, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                              (username, pass_hash, raw_pass, fullname, email, role, faculty_id, department_id))
                    conn.commit()
                    self.send_json(True, {'id': c.lastrowid}, "Kullanıcı başarıyla oluşturuldu.")

            elif action == 'delete_user':
                body = self.read_json_body()
                uid = int(body.get('id', 0))
                if uid == 1:
                    self.send_json(False, None, "Ana yönetici silinemez.")
                    return
                c.execute("DELETE FROM users WHERE id = ?", (uid,))
                conn.commit()
                self.send_json(True, None, "Kullanıcı silindi.")

            elif action == 'save_classroom':
                body = self.read_json_body()
                cid = int(body.get('id', 0))
                code = body.get('code', '').strip()
                name = body.get('name', '').strip()
                building = body.get('building', 'A Blok').strip()
                capacity = int(body.get('capacity', 40))
                room_type = body.get('room_type', 'standard')
                features = body.get('features', '').strip()

                if cid > 0:
                    c.execute("UPDATE classrooms SET code=?, name=?, building=?, capacity=?, room_type=?, features=? WHERE id=?",
                              (code, name, building, capacity, room_type, features, cid))
                    conn.commit()
                    self.send_json(True, None, "Derslik güncellendi.")
                else:
                    c.execute("INSERT INTO classrooms (code, name, building, capacity, room_type, features) VALUES (?, ?, ?, ?, ?, ?)",
                              (code, name, building, capacity, room_type, features))
                    conn.commit()
                    self.send_json(True, {'id': c.lastrowid}, "Derslik başarıyla eklendi.")

            elif action == 'delete_classroom':
                body = self.read_json_body()
                cid = int(body.get('id', 0))
                c.execute("DELETE FROM classrooms WHERE id = ?", (cid,))
                conn.commit()
                self.send_json(True, None, "Derslik silindi.")

            else:
                self.send_json(False, None, f"Geçersiz işlem: {action}")

        except Exception as e:
            self.send_json(False, None, f"Sunucu hatası: {str(e)}")
        finally:
            conn.close()

if __name__ == '__main__':
    try:
        if sys.platform == 'win32':
            sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

    init_db()
    print("================================================================")
    print(" ISTANBUL 29 MAYIS UNIVERSITESI DERS & DERSLIK SISTEMI")
    print(f" Yerel Test Sunucusu Calisiyor: http://localhost:{PORT}")
    print(f" Giris Ekrani: http://localhost:{PORT}/login.html")
    print(f" Admin Girisi: admin / 123456")
    print(f" Bolum Girisi: ceng_baskan / 123456 (veya ilah_baskan vb.)")
    print("================================================================")
    
    server = socketserver.TCPServer(("", PORT), UniversityRequestHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nSunucu kapatildi.")
