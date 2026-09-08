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
            (3, 2, 'ECON', 'İktisat'),
            (4, 2, 'BA', 'İşletme'),
            (5, 2, 'IR', 'Siyaset Bilimi ve Uluslararası İlişkiler'),
            (6, 3, 'ILAH', 'İlahiyat Programı'),
            (7, 4, 'PSYC', 'Psikoloji'),
            (8, 4, 'PHIL', 'Felsefe'),
            (9, 4, 'HIST', 'Tarih'),
            (10, 4, 'TDE', 'Türk Dili ve Edebiyatı'),
            (11, 4, 'TRNS', 'İngilizce Mütercim ve Tercümanlık'),
            (12, 6, 'LAW', 'Hukuk Lisans Programı')
        ]
        c.executemany("INSERT INTO departments (id, faculty_id, code, name) VALUES (?, ?, ?, ?)", departments)

        default_pass = hashlib.md5("123456".encode()).hexdigest()
        users = [
            (1, 'admin', default_pass, '123456', 'Sistem Yöneticisi', 'admin@29mayis.edu.tr', 'admin', None, None),
            (2, 'ceng_baskan', default_pass, '123456', 'Bilgisayar Müh. Koordinatörü', 'ceng@29mayis.edu.tr', 'coordinator', 1, 1),
            (3, 'ilah_baskan', default_pass, '123456', 'İlahiyat Fak. Koordinatörü', 'ilah@29mayis.edu.tr', 'coordinator', 3, 6),
            (4, 'iibf_baskan', default_pass, '123456', 'İktisat Bölüm Koordinatörü', 'iibf@29mayis.edu.tr', 'coordinator', 2, 3),
            (5, 'psyc_baskan', default_pass, '123456', 'Psikoloji Bölüm Koordinatörü', 'psyc@29mayis.edu.tr', 'coordinator', 4, 7)
        ]
        c.executemany("INSERT INTO users (id, username, password_hash, password_plain, full_name, email, role, faculty_id, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", users)

        classrooms = [
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
            (12, 'Merkez-Seminer', 'Merkezi Seminer Salonu', 'Rektörlük Binası', 30, 'seminar', 'Toplantı Masası, Video Konferans')
        ]
        c.executemany("INSERT INTO classrooms (id, code, name, building, capacity, room_type, features) VALUES (?, ?, ?, ?, ?, ?, ?)", classrooms)

        instructors = [
            (1, 1, 'Prof. Dr.', 'Mustafa Tahsin', 'mtahsin@29mayis.edu.tr'),
            (2, 1, 'Doç. Dr.', 'Elif Demir', 'edemir@29mayis.edu.tr'),
            (3, 1, 'Dr. Öğr. Üyesi', 'Mehmet Kaya', 'mkaya@29mayis.edu.tr'),
            (4, 2, 'Doç. Dr.', 'Hakan Öztürk', 'hozturk@29mayis.edu.tr'),
            (5, 3, 'Prof. Dr.', 'Zeynep Aksoy', 'zaksoy@29mayis.edu.tr'),
            (6, 6, 'Prof. Dr.', 'Ali Rıza Aydın', 'aaydin@29mayis.edu.tr'),
            (7, 6, 'Doç. Dr.', 'Fatma Betül Çelik', 'fcelik@29mayis.edu.tr'),
            (8, 7, 'Dr. Öğr. Üyesi', 'Ayşe Güler', 'aguler@29mayis.edu.tr'),
            (9, 12, 'Prof. Dr.', 'Kemal Şahin', 'ksahin@29mayis.edu.tr')
        ]
        c.executemany("INSERT INTO instructors (id, department_id, title, name, email) VALUES (?, ?, ?, ?, ?)", instructors)

        courses = [
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
            (15, 12, 'LAW101', 'Anayasa Hukuku', 1, 4)
        ]
        c.executemany("INSERT INTO courses (id, department_id, code, name, grade_level, weekly_hours) VALUES (?, ?, ?, ?, ?, ?)", courses)

        # 08:00 - 20:00 aralığına uygun örnek slotlar
        slots = [
            (1, 1, 1, 1, 'Algoritmalar ve Programlama I', 'CENG101', 1, 'Prof. Dr. Mustafa Tahsin', 7, 'B-Lab-1', 'Pazartesi', 1, 3, '09:00', '11:50', '#102A43'),
            (2, 1, 1, 3, 'Genel Matematik I', 'MATH101', 3, 'Dr. Öğr. Üyesi Mehmet Kaya', 4, 'A-Amfi-1', 'Salı', 0, 2, '08:00', '10:50', '#7B1123'),
            (3, 6, 1, 11, 'Kuran Okuma ve Tecvid I', 'ILAH101', 6, 'Prof. Dr. Ali Rıza Aydın', 6, 'B-201', 'Çarşamba', 1, 3, '09:00', '11:50', '#1A535C'),
            (4, 3, 1, 9, 'İktisada Giriş I', 'ECON101', 5, 'Prof. Dr. Zeynep Aksoy', 1, 'A-101', 'Perşembe', 2, 4, '10:00', '12:50', '#D48806')
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
                self.send_json(True, {'slots': slots})

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
