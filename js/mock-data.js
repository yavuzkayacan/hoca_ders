/**
 * Istanbul 29 Mayis Universitesi - Ders Programi Sistemi
 * Sabit Tanimlar, Zaman Dilimleri ve Varsayilan Veriler (08:00 - 20:00)
 */

const TIME_SLOTS = [
    { index: 0, start: "08:00", end: "08:50", label: "08:00 - 08:50" },
    { index: 1, start: "09:00", end: "09:50", label: "09:00 - 09:50" },
    { index: 2, start: "10:00", end: "10:50", label: "10:00 - 10:50" },
    { index: 3, start: "11:00", end: "11:50", label: "11:00 - 11:50" },
    { index: 4, start: "12:00", end: "12:50", label: "12:00 - 12:50" },
    { index: 5, start: "13:00", end: "13:50", label: "13:00 - 13:50" },
    { index: 6, start: "14:00", end: "14:50", label: "14:00 - 14:50" },
    { index: 7, start: "15:00", end: "15:50", label: "15:00 - 15:50" },
    { index: 8, start: "16:00", end: "16:50", label: "16:00 - 16:50" },
    { index: 9, start: "17:00", end: "17:50", label: "17:00 - 17:50" },
    { index: 10, start: "18:00", end: "18:50", label: "18:00 - 18:50" },
    { index: 11, start: "19:00", end: "20:00", label: "19:00 - 20:00" }
];

const DAYS_OF_WEEK = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

const COURSE_PALETTE = [
    "#7B1123", // 29 Mayıs Bordo
    "#102A43", // Kurumsal Koyu Lacivert
    "#0B69A3", // Mavi
    "#0E7C7B", // Zümrüt Yeşili
    "#B07D02", // Amber Gold
    "#6B3074", // Mürdüm Moru
    "#9E2A2B", // Kiremit
    "#2D6A4F", // Orman Yeşili
    "#4361EE"  // İndigo
];

// API Adresi Tespiti (Python yerel sunucusu mu yoksa PHP hosting mi?)
const API_BASE = (function() {
    if (window.location.protocol === 'file:') {
        return 'local_storage';
    }
    if (window.location.port === '8080') {
        return '/api';
    }
    return 'backend/api.php';
})();

/**
 * Universel API Istek Yardimcisi
 */
async function apiRequest(action, method = 'GET', bodyData = null) {
    if (API_BASE === 'local_storage') {
        return handleLocalStorageApi(action, method, bodyData);
    }

    try {
        let url = `${API_BASE}?action=${action}`;
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (bodyData && method === 'POST') {
            options.body = JSON.stringify(bodyData);
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP Hata: ${response.status}`);
        }
        return await response.json();
    } catch (err) {
        console.warn("Sunucu API bağlantı uyarısı, yerel önbelleğe geçiliyor:", err);
        return handleLocalStorageApi(action, method, bodyData);
    }
}

/**
 * LocalStorage Fallback
 */
function handleLocalStorageApi(action, method, body) {
    let users = JSON.parse(localStorage.getItem('29m_users') || 'null');
    let classrooms = JSON.parse(localStorage.getItem('29m_classrooms') || 'null');
    let slots = JSON.parse(localStorage.getItem('29m_slots') || 'null');
    let courses = JSON.parse(localStorage.getItem('29m_courses') || 'null');
    let instructors = JSON.parse(localStorage.getItem('29m_instructors') || 'null');

    if (!classrooms) {
        classrooms = [
            { id: 1, code: 'A-101', name: 'A Blok 101 Nolu Derslik', building: 'A Blok', capacity: 50, room_type: 'standard', features: 'Projeksiyon, Akıllı Tahta' },
            { id: 2, code: 'A-102', name: 'A Blok 102 Nolu Derslik', building: 'A Blok', capacity: 50, room_type: 'standard', features: 'Projeksiyon' },
            { id: 3, code: 'A-201', name: 'A Blok 201 Nolu Derslik', building: 'A Blok', capacity: 45, room_type: 'standard', features: 'Projeksiyon' },
            { id: 4, code: 'A-Amfi-1', name: 'A Blok Büyük Amfi 1', building: 'A Blok', capacity: 120, room_type: 'amfi', features: 'Ses Sistemi, Projeksiyon' },
            { id: 5, code: 'B-101', name: 'B Blok 101 Nolu Derslik', building: 'B Blok', capacity: 60, room_type: 'standard', features: 'Projeksiyon' },
            { id: 6, code: 'B-201', name: 'B Blok 201 Nolu Derslik', building: 'B Blok', capacity: 55, room_type: 'standard', features: 'Projeksiyon, Akıllı Tahta' },
            { id: 7, code: 'B-Lab-1', name: 'Bilgisayar Laboratuvarı 1', building: 'B Blok', capacity: 40, room_type: 'lab', features: '40 PC, Projeksiyon' },
            { id: 8, code: 'B-Lab-2', name: 'Yazılım Laboratuvarı 2', building: 'B Blok', capacity: 35, room_type: 'lab', features: '35 PC, Projeksiyon' },
            { id: 9, code: 'C-101', name: 'C Blok 101 Nolu Derslik', building: 'C Blok', capacity: 40, room_type: 'standard', features: 'Projeksiyon' },
            { id: 10, code: 'C-201', name: 'C Blok 201 Nolu Derslik', building: 'C Blok', capacity: 45, room_type: 'standard', features: 'Projeksiyon' },
            { id: 11, code: 'C-Amfi-2', name: 'C Blok Konferans Amfisi', building: 'C Blok', capacity: 150, room_type: 'amfi', features: 'Ses Sistemi, Projeksiyon' }
        ];
        localStorage.setItem('29m_classrooms', JSON.stringify(classrooms));
    }

    if (!courses) {
        courses = [
            { id: 1, department_id: 1, code: 'CENG101', name: 'Algoritmalar ve Programlama I', grade_level: 1, weekly_hours: 4 },
            { id: 2, department_id: 1, code: 'CENG103', name: 'Bilgisayar Mühendisliğine Giriş', grade_level: 1, weekly_hours: 2 },
            { id: 3, department_id: 1, code: 'MATH101', name: 'Genel Matematik I', grade_level: 1, weekly_hours: 4 },
            { id: 4, department_id: 1, code: 'PHYS101', name: 'Genel Fizik I', grade_level: 1, weekly_hours: 4 },
            { id: 5, department_id: 1, code: 'CENG201', name: 'Veri Yapıları', grade_level: 2, weekly_hours: 4 },
            { id: 6, department_id: 1, code: 'CENG205', name: 'Ayrık Matematik', grade_level: 2, weekly_hours: 3 },
            { id: 7, department_id: 1, code: 'CENG301', name: 'Veritabanı Yönetim Sistemleri', grade_level: 3, weekly_hours: 3 },
            { id: 8, department_id: 1, code: 'CENG401', name: 'Bitirme Projesi I', grade_level: 4, weekly_hours: 2 },
            { id: 9, department_id: 3, code: 'ECON101', name: 'İktisada Giriş I', grade_level: 1, weekly_hours: 3 },
            { id: 10, department_id: 6, code: 'ILAH101', name: 'Kuran Okuma ve Tecvid I', grade_level: 1, weekly_hours: 4 }
        ];
        localStorage.setItem('29m_courses', JSON.stringify(courses));
    }

    if (!instructors) {
        instructors = [
            { id: 1, department_id: 1, title: 'Prof. Dr.', name: 'Mustafa Tahsin', email: 'mtahsin@29mayis.edu.tr', department_name: 'Bilgisayar Mühendisliği' },
            { id: 2, department_id: 1, title: 'Doç. Dr.', name: 'Elif Demir', email: 'edemir@29mayis.edu.tr', department_name: 'Bilgisayar Mühendisliği' },
            { id: 3, department_id: 1, title: 'Dr. Öğr. Üyesi', name: 'Mehmet Kaya', email: 'mkaya@29mayis.edu.tr', department_name: 'Bilgisayar Mühendisliği' },
            { id: 4, department_id: 2, title: 'Doç. Dr.', name: 'Hakan Öztürk', email: 'hozturk@29mayis.edu.tr', department_name: 'Yazılım Mühendisliği' },
            { id: 5, department_id: 3, title: 'Prof. Dr.', name: 'Zeynep Aksoy', email: 'zaksoy@29mayis.edu.tr', department_name: 'İktisat' },
            { id: 6, department_id: 6, title: 'Prof. Dr.', name: 'Ali Rıza Aydın', email: 'aaydin@29mayis.edu.tr', department_name: 'İlahiyat Programı' }
        ];
        localStorage.setItem('29m_instructors', JSON.stringify(instructors));
    }

    if (!slots) {
        slots = [
            { id: 1, department_id: 1, grade_level: 1, course_name: 'Algoritmalar ve Programlama I', course_code: 'CENG101', instructor_name: 'Prof. Dr. Mustafa Tahsin', classroom_id: 7, classroom_code: 'B-Lab-1', day_name: 'Pazartesi', start_hour_index: 1, end_hour_index: 3, start_time: '09:00', end_time: '11:50', color_tag: '#102A43' },
            { id: 2, department_id: 1, grade_level: 1, course_name: 'Genel Matematik I', course_code: 'MATH101', instructor_name: 'Dr. Öğr. Üyesi Mehmet Kaya', classroom_id: 4, classroom_code: 'A-Amfi-1', day_name: 'Salı', start_hour_index: 0, end_hour_index: 2, start_time: '08:00', end_time: '10:50', color_tag: '#7B1123' },
            { id: 3, department_id: 6, grade_level: 1, course_name: 'Kuran Okuma ve Tecvid I', course_code: 'ILAH101', instructor_name: 'Prof. Dr. Ali Rıza Aydın', classroom_id: 6, classroom_code: 'B-201', day_name: 'Çarşamba', start_hour_index: 1, end_hour_index: 3, start_time: '09:00', end_time: '11:50', color_tag: '#0E7C7B' }
        ];
        localStorage.setItem('29m_slots', JSON.stringify(slots));
    }

    if (!users) {
        users = [
            { id: 1, username: 'admin', password_plain: '123456', full_name: 'Sistem Yöneticisi', email: 'admin@29mayis.edu.tr', role: 'admin', faculty_name: 'Yönetim', department_name: 'Tüm Üniversite' },
            { id: 2, username: 'ceng_baskan', password_plain: '123456', full_name: 'Bilgisayar Müh. Koordinatörü', email: 'ceng@29mayis.edu.tr', role: 'coordinator', faculty_id: 1, department_id: 1, faculty_name: 'Mühendislik ve Doğa Bilimleri Fakültesi', department_name: 'Bilgisayar Mühendisliği' },
            { id: 3, username: 'ilah_baskan', password_plain: '123456', full_name: 'İlahiyat Fak. Koordinatörü', email: 'ilah@29mayis.edu.tr', role: 'coordinator', faculty_id: 3, department_id: 6, faculty_name: 'İlahiyat Fakültesi', department_name: 'İlahiyat Programı' }
        ];
        localStorage.setItem('29m_users', JSON.stringify(users));
    }

    if (action === 'get_initial_data') {
        return {
            success: true,
            data: {
                faculties: [
                    { id: 1, code: 'MUH', name: 'Mühendislik ve Doğa Bilimleri Fakültesi' },
                    { id: 2, code: 'IIBF', name: 'İktisadi ve İdari Bilimler Fakültesi' },
                    { id: 3, code: 'ILAH', name: 'İlahiyat Fakültesi' },
                    { id: 4, code: 'EDEB', name: 'Edebiyat Fakültesi' },
                    { id: 5, code: 'EGTM', name: 'Eğitim Fakültesi' },
                    { id: 6, code: 'HUKUK', name: 'Hukuk Fakültesi' }
                ],
                departments: [
                    { id: 1, faculty_id: 1, code: 'CENG', name: 'Bilgisayar Mühendisliği', faculty_name: 'Mühendislik ve Doğa Bilimleri Fakültesi' },
                    { id: 2, faculty_id: 1, code: 'SENG', name: 'Yazılım Mühendisliği', faculty_name: 'Mühendislik ve Doğa Bilimleri Fakültesi' },
                    { id: 3, faculty_id: 2, code: 'ECON', name: 'İktisat', faculty_name: 'İktisadi ve İdari Bilimler Fakültesi' },
                    { id: 4, faculty_id: 2, code: 'BA', name: 'İşletme', faculty_name: 'İktisadi ve İdari Bilimler Fakültesi' },
                    { id: 5, faculty_id: 2, code: 'IR', name: 'Siyaset Bilimi ve Uluslararası İlişkiler', faculty_name: 'İktisadi ve İdari Bilimler Fakültesi' },
                    { id: 6, faculty_id: 3, code: 'ILAH', name: 'İlahiyat Programı', faculty_name: 'İlahiyat Fakültesi' },
                    { id: 7, faculty_id: 4, code: 'PSYC', name: 'Psikoloji', faculty_name: 'Edebiyat Fakültesi' },
                    { id: 8, faculty_id: 4, code: 'PHIL', name: 'Felsefe', faculty_name: 'Edebiyat Fakültesi' },
                    { id: 9, faculty_id: 4, code: 'HIST', name: 'Tarih', faculty_name: 'Edebiyat Fakültesi' },
                    { id: 10, faculty_id: 4, code: 'TDE', name: 'Türk Dili ve Edebiyatı', faculty_name: 'Edebiyat Fakültesi' },
                    { id: 11, faculty_id: 4, code: 'TRNS', name: 'İngilizce Mütercim ve Tercümanlık', faculty_name: 'Edebiyat Fakültesi' },
                    { id: 12, faculty_id: 6, code: 'LAW', name: 'Hukuk Lisans Programı', faculty_name: 'Hukuk Fakültesi' }
                ],
                classrooms: classrooms,
                instructors: instructors,
                courses: courses
            }
        };
    }

    if (action === 'save_course') {
        const cid = parseInt(body.id || 0);
        if (cid > 0) {
            courses = courses.map(c => c.id === cid ? { ...c, ...body } : c);
        } else {
            courses.push({ ...body, id: Date.now() });
        }
        localStorage.setItem('29m_courses', JSON.stringify(courses));
        return { success: true, message: 'Ders başarıyla kaydedildi.' };
    }

    if (action === 'delete_course') {
        const cid = parseInt(body.id || 0);
        courses = courses.filter(c => c.id !== cid);
        localStorage.setItem('29m_courses', JSON.stringify(courses));
        return { success: true, message: 'Ders silindi.' };
    }

    if (action === 'save_instructor') {
        const iid = parseInt(body.id || 0);
        if (iid > 0) {
            instructors = instructors.map(i => i.id === iid ? { ...i, ...body } : i);
        } else {
            instructors.push({ ...body, id: Date.now() });
        }
        localStorage.setItem('29m_instructors', JSON.stringify(instructors));
        return { success: true, message: 'Öğretim görevlisi kaydedildi.' };
    }

    if (action === 'delete_instructor') {
        const iid = parseInt(body.id || 0);
        instructors = instructors.filter(i => i.id !== iid);
        localStorage.setItem('29m_instructors', JSON.stringify(instructors));
        return { success: true, message: 'Öğretim görevlisi silindi.' };
    }

    return { success: true, message: 'İşlem tamamlandı.' };
}
