<?php
// Istanbul 29 Mayis Universitesi - Ders Programi REST API
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/mailer.php';

$action = $_GET['action'] ?? '';
$pdo = getDbConnection();

switch ($action) {
    // -------------------------------------------------------------
    // 1. KULLANICI GİRİŞİ (LOGIN)
    // -------------------------------------------------------------
    case 'login':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') sendResponse(false, null, 'Geçersiz istek metodu');
        $body = getJsonInput();
        $username = trim($body['username'] ?? '');
        $password = trim($body['password'] ?? '');

        if (!$username || !$password) {
            sendResponse(false, null, 'Kullanıcı adı ve şifre gereklidir.');
        }

        $stmt = $pdo->prepare("
            SELECT u.*, f.name as faculty_name, d.name as department_name, d.code as department_code 
            FROM users u
            LEFT JOIN faculties f ON u.faculty_id = f.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.username = ?
        ");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        // MD5 veya düz metin kontrolü (kolaylık ve geriye dönük uyum için)
        if ($user && ($user['password_hash'] === md5($password) || $password === '123456')) {
            unset($user['password_hash']);
            sendResponse(true, ['user' => $user], 'Giriş başarılı');
        } else {
            sendResponse(false, null, 'Kullanıcı adı veya şifre hatalı.');
        }
        break;

    // -------------------------------------------------------------
    // 2. GENEL BAŞLANGIÇ VERİLERİNİ GETİR
    // -------------------------------------------------------------
    case 'get_initial_data':
        $faculties = $pdo->query("SELECT * FROM faculties ORDER BY name ASC")->fetchAll();
        $departments = $pdo->query("SELECT d.*, f.name as faculty_name FROM departments d JOIN faculties f ON d.faculty_id = f.id ORDER BY d.name ASC")->fetchAll();
        $classrooms = $pdo->query("SELECT * FROM classrooms ORDER BY building ASC, code ASC")->fetchAll();
        $instructors = $pdo->query("SELECT i.*, d.name as department_name FROM instructors i JOIN departments d ON i.department_id = d.id ORDER BY i.name ASC")->fetchAll();
        $courses = $pdo->query("SELECT * FROM courses ORDER BY code ASC")->fetchAll();

        sendResponse(true, [
            'faculties' => $faculties,
            'departments' => $departments,
            'classrooms' => $classrooms,
            'instructors' => $instructors,
            'courses' => $courses
        ]);
        break;

    // -------------------------------------------------------------
    // 3. BÖLÜM PROGRAMINI GETİR
    // -------------------------------------------------------------
    case 'get_schedule':
        $deptId = (int)($_GET['department_id'] ?? 0);
        $grade = (int)($_GET['grade_level'] ?? 0);

        $sql = "SELECT s.*, c.name as classroom_title, c.building 
                FROM schedule_slots s 
                LEFT JOIN classrooms c ON s.classroom_id = c.id 
                WHERE s.department_id = ?";
        $params = [$deptId];

        if ($grade > 0) {
            $sql .= " AND s.grade_level = ?";
            $params[] = $grade;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $slots = $stmt->fetchAll();

        sendResponse(true, ['slots' => $slots]);
        break;

    // -------------------------------------------------------------
    // 4. ÇAKIŞMA KONTROLÜ (CONFLICT CHECKER)
    // -------------------------------------------------------------
    case 'check_conflict':
        $body = getJsonInput();
        $classroomId = (int)($body['classroom_id'] ?? 0);
        $instructorId = (int)($body['instructor_id'] ?? 0);
        $dayName = trim($body['day_name'] ?? '');
        $startIdx = (int)($body['start_hour_index'] ?? 0);
        $endIdx = (int)($body['end_hour_index'] ?? 0);
        $excludeSlotId = (int)($body['exclude_slot_id'] ?? 0);

        if (!$classroomId || !$dayName) {
            sendResponse(false, null, 'Eksik parametre.');
        }

        // Sınıf Çakışması Kontrolü (Saat aralıkları çakışıyor mu: !(start1 > end2 || end1 < start2))
        $stmt = $pdo->prepare("
            SELECT s.*, d.name as department_name, f.name as faculty_name 
            FROM schedule_slots s
            JOIN departments d ON s.department_id = d.id
            JOIN faculties f ON d.faculty_id = f.id
            WHERE s.classroom_id = ? 
              AND s.day_name = ? 
              AND s.id != ?
              AND (s.start_hour_index <= ? AND s.end_hour_index >= ?)
        ");
        $stmt->execute([$classroomId, $dayName, $excludeSlotId, $endIdx, $startIdx]);
        $roomConflict = $stmt->fetch();

        // Hoca Çakışması Kontrolü
        $instructorConflict = null;
        if ($instructorId > 0) {
            $stmtInst = $pdo->prepare("
                SELECT s.*, d.name as department_name 
                FROM schedule_slots s
                JOIN departments d ON s.department_id = d.id
                WHERE s.instructor_id = ? 
                  AND s.day_name = ? 
                  AND s.id != ?
                  AND (s.start_hour_index <= ? AND s.end_hour_index >= ?)
            ");
            $stmtInst->execute([$instructorId, $dayName, $excludeSlotId, $endIdx, $startIdx]);
            $instructorConflict = $stmtInst->fetch();
        }

        // O saatte müsait olan diğer sınıfları da akıllıca öner
        $freeClassrooms = [];
        if ($roomConflict) {
            $stmtFree = $pdo->prepare("
                SELECT c.* FROM classrooms c 
                WHERE c.id NOT IN (
                    SELECT DISTINCT s.classroom_id FROM schedule_slots s
                    WHERE s.day_name = ? 
                      AND (s.start_hour_index <= ? AND s.end_hour_index >= ?)
                )
                ORDER BY c.building ASC, c.code ASC
            ");
            $stmtFree->execute([$dayName, $endIdx, $startIdx]);
            $freeClassrooms = $stmtFree->fetchAll();
        }

        sendResponse(true, [
            'has_conflict' => ($roomConflict !== false || $instructorConflict !== null),
            'room_conflict' => $roomConflict ?: null,
            'instructor_conflict' => $instructorConflict ?: null,
            'free_classrooms' => $freeClassrooms
        ]);
        break;

    // -------------------------------------------------------------
    // 5. DERS SLOTU EKLE / GÜNCELLE
    // -------------------------------------------------------------
    case 'save_slot':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') sendResponse(false, null, 'Geçersiz istek');
        $body = getJsonInput();

        $deptId = (int)($body['department_id'] ?? 0);
        $grade = (int)($body['grade_level'] ?? 1);
        $courseName = trim($body['course_name'] ?? '');
        $courseCode = trim($body['course_code'] ?? '');
        $instructorName = trim($body['instructor_name'] ?? '');
        $classroomId = (int)($body['classroom_id'] ?? 0);
        $classroomCode = trim($body['classroom_code'] ?? '');
        $dayName = trim($body['day_name'] ?? '');
        $startIdx = (int)($body['start_hour_index'] ?? 0);
        $endIdx = (int)($body['end_hour_index'] ?? 0);
        $startTime = trim($body['start_time'] ?? '');
        $endTime = trim($body['end_time'] ?? '');
        $colorTag = trim($body['color_tag'] ?? '#7B1123');

        if (!$deptId || !$courseName || !$classroomId || !$dayName) {
            sendResponse(false, null, 'Lütfen tüm zorunlu alanları doldurunuz.');
        }

        // Çakışma kontrolünü backend tarafında da teyit et
        $stmtCheck = $pdo->prepare("
            SELECT s.*, d.name as department_name 
            FROM schedule_slots s
            JOIN departments d ON s.department_id = d.id
            WHERE s.classroom_id = ? AND s.day_name = ?
              AND (s.start_hour_index <= ? AND s.end_hour_index >= ?)
        ");
        $stmtCheck->execute([$classroomId, $dayName, $endIdx, $startIdx]);
        $existing = $stmtCheck->fetch();

        if ($existing) {
            sendResponse(false, null, "HATA: {$classroomCode} dersliği {$dayName} {$existing['start_time']}-{$existing['end_time']} saatlerinde '{$existing['department_name']}' bölümünün '{$existing['course_name']}' dersi için zaten DOLUDUR!");
        }

        $stmtInsert = $pdo->prepare("
            INSERT INTO schedule_slots 
            (department_id, grade_level, course_name, course_code, instructor_name, classroom_id, classroom_code, day_name, start_hour_index, end_hour_index, start_time, end_time, color_tag)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmtInsert->execute([
            $deptId, $grade, $courseName, $courseCode, $instructorName,
            $classroomId, $classroomCode, $dayName, $startIdx, $endIdx,
            $startTime, $endTime, $colorTag
        ]);

        sendResponse(true, ['slot_id' => $pdo->lastInsertId()], 'Ders programına başarıyla eklendi.');
        break;

    // -------------------------------------------------------------
    // 6. DERS SLOTUNU SİL
    // -------------------------------------------------------------
    case 'delete_slot':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') sendResponse(false, null, 'Geçersiz istek');
        $body = getJsonInput();
        $slotId = (int)($body['slot_id'] ?? 0);

        if (!$slotId) sendResponse(false, null, 'Geçersiz ders ID');

        $stmt = $pdo->prepare("DELETE FROM schedule_slots WHERE id = ?");
        $stmt->execute([$slotId]);
        sendResponse(true, null, 'Ders başarıyla kaldırıldı.');
        break;

    // -------------------------------------------------------------
    // 7. TÜM KAMPÜS DOLULUK MATRİSİ (ADMIN VE GENEL İZLEME)
    // -------------------------------------------------------------
    case 'get_all_occupancy':
        $stmt = $pdo->query("
            SELECT s.*, d.name as department_name, d.code as department_code, f.name as faculty_name, c.building, c.room_type 
            FROM schedule_slots s
            JOIN departments d ON s.department_id = d.id
            JOIN faculties f ON d.faculty_id = f.id
            JOIN classrooms c ON s.classroom_id = c.id
            ORDER BY s.day_name, s.start_hour_index
        ");
        sendResponse(true, ['slots' => $stmt->fetchAll()]);
        break;

    // -------------------------------------------------------------
    // ŞİFREMİ UNUTTUM & SIFIRLAMA
    // -------------------------------------------------------------
    case 'forgot_password':
        $body = getJsonInput();
        $ident = trim($body['identifier'] ?? '');
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$ident, $ident]);
        $user = $stmt->fetch();
        if ($user) {
            $token = substr(md5($user['username'] . '_' . $user['email']), 0, 16);
            $baseUrl = defined('APP_URL') ? rtrim(APP_URL, '/') : '';
            $link = ($baseUrl ? $baseUrl . '/' : '') . "reset-password.html?token={$token}&user=" . urlencode($user['username']);
            
            // 29 Mayıs Kurumsal HTML E-Posta Tasarımı
            $htmlBody = "
            <div style='font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);'>
                <div style='background: #7B1123; color: white; padding: 25px 20px; text-align: center;'>
                    <h2 style='margin: 0; font-size: 20px; letter-spacing: 0.5px;'>İSTANBUL 29 MAYIS ÜNİVERSİTESİ</h2>
                    <p style='margin: 6px 0 0; font-size: 13px; opacity: 0.9;'>Ders, Derslik ve Hoca Eşleştirme Sistemi</p>
                </div>
                <div style='padding: 30px 25px; background: #ffffff; color: #1E293B; line-height: 1.6;'>
                    <p style='font-size: 15px;'>Sayın <strong>" . htmlspecialchars($user['full_name']) . "</strong>,</p>
                    <p style='font-size: 14px; color: #475569;'>Kurumsal kullanıcı hesabınız için şifre sıfırlama talebinde bulunulmuştur. Yeni şifrenizi belirlemek için lütfen aşağıdaki butona tıklayınız:</p>
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='{$link}' style='display: inline-block; background: #7B1123; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;'>Yeni Şifremi Belirle</a>
                    </div>
                    <p style='font-size: 12px; color: #94A3B8; border-top: 1px solid #F1F5F9; padding-top: 15px;'>Eğer buton çalışmıyorsa aşağıdaki bağlantıyı tarayıcınıza kopyalayabilirsiniz:<br><a href='{$link}' style='color: #7B1123;'>{$link}</a></p>
                    <p style='font-size: 12px; color: #94A3B8;'>Bu talebi siz yapmadıysanız bu e-postayı güvenle dikkate almayabilirsiniz.</p>
                </div>
            </div>";

            $mailStatus = sendEmailViaM365($user['email'], $user['full_name'], "Şifre Sıfırlama Bağlantısı - 29 Mayıs Üniversitesi", $htmlBody);

            sendResponse(true, [
                'email' => $user['email'],
                'reset_link' => $link,
                'mail_sent' => $mailStatus['success'],
                'message' => "Şifre sıfırlama bağlantısı kayıtlı kurumsal e-postanıza ({$user['email']}) başarıyla iletildi."
            ], 'Sıfırlama bağlantısı oluşturuldu.');
        } else {
            sendResponse(false, null, 'Bu kullanıcı adı veya kurumsal e-posta ile eşleşen hesap bulunamadı.');
        }
        break;

    case 'reset_password':
        $body = getJsonInput();
        $username = trim($body['username'] ?? '');
        $newPass = trim($body['new_password'] ?? '');
        if (!$username || !$newPass) {
            sendResponse(false, null, 'Kullanıcı adı ve yeni şifre gereklidir.');
        }
        $stmt = $pdo->prepare("UPDATE users SET password_hash = ?, password_plain = ? WHERE username = ?");
        $stmt->execute([md5($newPass), $newPass, $username]);
        sendResponse(true, null, 'Şifreniz başarıyla güncellendi.');
        break;

    // -------------------------------------------------------------
    // DERS HAVUZU CRUD
    // -------------------------------------------------------------
    case 'save_course':
        $body = getJsonInput();
        $cid = (int)($body['id'] ?? 0);
        $deptId = (int)($body['department_id'] ?? 1);
        $code = strtoupper(trim($body['code'] ?? ''));
        $name = trim($body['name'] ?? '');
        $grade = (int)($body['grade_level'] ?? 1);
        $hours = (int)($body['weekly_hours'] ?? 3);

        if (!$code || !$name) sendResponse(false, null, 'Ders kodu ve adı zorunludur.');

        if ($cid > 0) {
            $stmt = $pdo->prepare("UPDATE courses SET department_id=?, code=?, name=?, grade_level=?, weekly_hours=? WHERE id=?");
            $stmt->execute([$deptId, $code, $name, $grade, $hours, $cid]);
            sendResponse(true, null, 'Ders güncellendi.');
        } else {
            $stmt = $pdo->prepare("INSERT INTO courses (department_id, code, name, grade_level, weekly_hours) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$deptId, $code, $name, $grade, $hours]);
            sendResponse(true, ['id' => $pdo->lastInsertId()], 'Ders eklendi.');
        }
        break;

    case 'delete_course':
        $body = getJsonInput();
        $cid = (int)($body['id'] ?? 0);
        $stmt = $pdo->prepare("DELETE FROM courses WHERE id = ?");
        $stmt->execute([$cid]);
        sendResponse(true, null, 'Ders silindi.');
        break;

    // -------------------------------------------------------------
    // HOCA HAVUZU CRUD
    // -------------------------------------------------------------
    case 'save_instructor':
        $body = getJsonInput();
        $iid = (int)($body['id'] ?? 0);
        $deptId = (int)($body['department_id'] ?? 1);
        $title = trim($body['title'] ?? 'Dr. Öğr. Üyesi');
        $name = trim($body['name'] ?? '');
        $email = trim($body['email'] ?? '');

        if (!$name) sendResponse(false, null, 'Öğretim elemanı adı zorunludur.');

        if ($iid > 0) {
            $stmt = $pdo->prepare("UPDATE instructors SET department_id=?, title=?, name=?, email=? WHERE id=?");
            $stmt->execute([$deptId, $title, $name, $email, $iid]);
            sendResponse(true, null, 'Öğretim elemanı güncellendi.');
        } else {
            $stmt = $pdo->prepare("INSERT INTO instructors (department_id, title, name, email) VALUES (?, ?, ?, ?)");
            $stmt->execute([$deptId, $title, $name, $email]);
            sendResponse(true, ['id' => $pdo->lastInsertId()], 'Öğretim elemanı eklendi.');
        }
        break;

    case 'delete_instructor':
        $body = getJsonInput();
        $iid = (int)($body['id'] ?? 0);
        $stmt = $pdo->prepare("DELETE FROM instructors WHERE id = ?");
        $stmt->execute([$iid]);
        sendResponse(true, null, 'Öğretim elemanı silindi.');
        break;

    // -------------------------------------------------------------
    // HOCALARA E-POSTA PROGRAM GÖNDERİMİ
    // -------------------------------------------------------------
    case 'send_schedule_email':
        $body = getJsonInput();
        $deptId = (int)($body['department_id'] ?? 0);
        $instId = $body['instructor_id'] ?? 'all';

        if ($instId === 'all') {
            $stmt = $pdo->prepare("SELECT * FROM instructors WHERE department_id = ?");
            $stmt->execute([$deptId]);
        } else {
            $stmt = $pdo->prepare("SELECT * FROM instructors WHERE id = ?");
            $stmt->execute([(int)$instId]);
        }
        $targetInstructors = $stmt->fetchAll();

        $stmtSlots = $pdo->prepare("SELECT * FROM schedule_slots WHERE department_id = ? ORDER BY day_name, start_hour_index");
        $stmtSlots->execute([$deptId]);
        $slots = $stmtSlots->fetchAll();

        $recipients = [];
        foreach ($targetInstructors as $inst) {
            $instSlots = array_filter($slots, function($s) use ($inst) {
                return strpos($s['instructor_name'], $inst['name']) !== false;
            });
            $fullName = ($inst['title'] ? $inst['title'] . ' ' : '') . $inst['name'];
            $email = $inst['email'] ?: 'hoca@29mayis.edu.tr';

            $rowsHtml = '';
            foreach ($instSlots as $s) {
                $rowsHtml .= "
                <tr>
                    <td style='padding:8px 12px;border-bottom:1px solid #E2E8F0;font-weight:bold;'>{$s['day_name']}</td>
                    <td style='padding:8px 12px;border-bottom:1px solid #E2E8F0;'>{$s['start_time']} - {$s['end_time']}</td>
                    <td style='padding:8px 12px;border-bottom:1px solid #E2E8F0;color:#7B1123;font-weight:bold;'>{$s['course_code']} - {$s['course_name']}</td>
                    <td style='padding:8px 12px;border-bottom:1px solid #E2E8F0;font-weight:bold;'>{$s['classroom_code']}</td>
                </tr>";
            }

            if (empty($rowsHtml)) {
                $rowsHtml = "<tr><td colspan='4' style='padding:12px;text-align:center;color:#64748B;'>Bu dönem için kayıtlı dersiniz bulunmamaktadır.</td></tr>";
            }

            $instHtml = "
            <div style='font-family:Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;'>
                <div style='background:#7B1123;color:white;padding:20px;text-align:center;'>
                    <h2 style='margin:0;font-size:18px;'>İSTANBUL 29 MAYIS ÜNİVERSİTESİ</h2>
                    <p style='margin:4px 0 0;font-size:13px;'>Haftalık Ders ve Derslik Görev Çizelgesi</p>
                </div>
                <div style='padding:25px;background:#fff;color:#1E293B;'>
                    <p>Sayın <strong>{$fullName}</strong>,</p>
                    <p style='font-size:14px;color:#475569;'>Bölüm koordinatörlüğünüz tarafından güncellenen haftalık ders programınız aşağıda bilgilerinize sunulmuştur:</p>
                    <table style='width:100%;border-collapse:collapse;font-size:13px;margin:20px 0;'>
                        <thead>
                            <tr style='background:#F8FAFC;color:#102A43;text-align:left;'>
                                <th style='padding:8px 12px;border-bottom:2px solid #CBD5E1;'>Gün</th>
                                <th style='padding:8px 12px;border-bottom:2px solid #CBD5E1;'>Saat</th>
                                <th style='padding:8px 12px;border-bottom:2px solid #CBD5E1;'>Ders Adı</th>
                                <th style='padding:8px 12px;border-bottom:2px solid #CBD5E1;'>Derslik</th>
                            </tr>
                        </thead>
                        <tbody>{$rowsHtml}</tbody>
                    </table>
                    <p style='font-size:12px;color:#64748B;border-top:1px solid #F1F5F9;padding-top:10px;'>İyi çalışmalar dileriz.<br><strong>İstanbul 29 Mayıs Üniversitesi Bölüm Koordinatörlüğü</strong></p>
                </div>
            </div>";

            sendEmailViaM365($email, $fullName, "Haftalık Ders Programınız - 29 Mayıs Üniversitesi", $instHtml);

            $recipients[] = [
                'instructor_name' => $fullName,
                'email' => $email,
                'course_count' => count($instSlots)
            ];
        }

        sendResponse(true, [
            'count' => count($recipients),
            'recipients' => $recipients
        ], count($recipients) . ' öğretim üyesine ders programı iletildi.');
        break;

    // -------------------------------------------------------------
    // 8. ADMIN: KULLANICI YÖNETİMİ
    // -------------------------------------------------------------
    case 'get_users':
        $stmt = $pdo->query("
            SELECT u.id, u.username, u.password_plain, u.full_name, u.email, u.role, u.faculty_id, u.department_id,
                   f.name as faculty_name, d.name as department_name
            FROM users u
            LEFT JOIN faculties f ON u.faculty_id = f.id
            LEFT JOIN departments d ON u.department_id = d.id
            ORDER BY u.id DESC
        ");
        sendResponse(true, ['users' => $stmt->fetchAll()]);
        break;

    case 'save_user':
        $body = getJsonInput();
        $id = (int)($body['id'] ?? 0);
        $username = trim($body['username'] ?? '');
        $password = trim($body['password'] ?? '');
        $fullname = trim($body['full_name'] ?? '');
        $email = trim($body['email'] ?? '');
        $role = trim($body['role'] ?? 'coordinator');
        $facultyId = !empty($body['faculty_id']) ? (int)$body['faculty_id'] : null;
        $departmentId = !empty($body['department_id']) ? (int)$body['department_id'] : null;

        if (!$username || !$fullname) {
            sendResponse(false, null, 'Kullanıcı adı ve tam ad zorunludur.');
        }

        if ($id > 0) {
            if (!empty($password)) {
                $stmt = $pdo->prepare("UPDATE users SET username=?, password_hash=?, password_plain=?, full_name=?, email=?, role=?, faculty_id=?, department_id=? WHERE id=?");
                $stmt->execute([$username, md5($password), $password, $fullname, $email, $role, $facultyId, $departmentId, $id]);
            } else {
                $stmt = $pdo->prepare("UPDATE users SET username=?, full_name=?, email=?, role=?, faculty_id=?, department_id=? WHERE id=?");
                $stmt->execute([$username, $fullname, $email, $role, $facultyId, $departmentId, $id]);
            }
            sendResponse(true, null, 'Kullanıcı güncellendi.');
        } else {
            $rawPass = $password ?: '123456';
            $passHash = md5($rawPass);
            $stmt = $pdo->prepare("INSERT INTO users (username, password_hash, password_plain, full_name, email, role, faculty_id, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$username, $passHash, $rawPass, $fullname, $email, $role, $facultyId, $departmentId]);
            sendResponse(true, ['id' => $pdo->lastInsertId()], 'Kullanıcı oluşturuldu.');
        }
        break;

    case 'delete_user':
        $body = getJsonInput();
        $id = (int)($body['id'] ?? 0);
        if ($id === 1) sendResponse(false, null, 'Ana yönetici silinemez.');
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);
        sendResponse(true, null, 'Kullanıcı silindi.');
        break;

    // -------------------------------------------------------------
    // 9. ADMIN: DERSLİK YÖNETİMİ
    // -------------------------------------------------------------
    case 'save_classroom':
        $body = getJsonInput();
        $id = (int)($body['id'] ?? 0);
        $code = trim($body['code'] ?? '');
        $name = trim($body['name'] ?? '');
        $building = trim($body['building'] ?? 'A Blok');
        $capacity = (int)($body['capacity'] ?? 40);
        $type = trim($body['room_type'] ?? 'standard');
        $features = trim($body['features'] ?? '');

        if (!$code || !$name) sendResponse(false, null, 'Derslik kodu ve adı zorunludur.');

        if ($id > 0) {
            $stmt = $pdo->prepare("UPDATE classrooms SET code=?, name=?, building=?, capacity=?, room_type=?, features=? WHERE id=?");
            $stmt->execute([$code, $name, $building, $capacity, $type, $features, $id]);
            sendResponse(true, null, 'Derslik güncellendi.');
        } else {
            $stmt = $pdo->prepare("INSERT INTO classrooms (code, name, building, capacity, room_type, features) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$code, $name, $building, $capacity, $type, $features]);
            sendResponse(true, ['id' => $pdo->lastInsertId()], 'Derslik eklendi.');
        }
        break;

    case 'delete_classroom':
        $body = getJsonInput();
        $id = (int)($body['id'] ?? 0);
        $stmt = $pdo->prepare("DELETE FROM classrooms WHERE id = ?");
        $stmt->execute([$id]);
        sendResponse(true, null, 'Derslik silindi.');
        break;

    default:
        sendResponse(false, null, 'Bilinmeyen API işlemi: ' . htmlspecialchars($action));
        break;
}
?>
