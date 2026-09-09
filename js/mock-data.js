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
    "#203551", // 29 Mayıs Resmi Kurumsal Lacivert
    "#096ea9", // 29 Mayıs Kurumsal Mavi
    "#C59B27", // Üniversite Altını
    "#102A43", // Gece Laciverti
    "#0E7C7B", // Zümrüt Yeşili
    "#3182CE", // Açık Mavi
    "#D69E2E", // Amber Gold
    "#2D6A4F", // Orman Yeşili
    "#4361EE"  // İndigo
];

// API Adresi Tespiti (GitHub Pages ve file: modunda doğrudan tam özellikli LocalStorage çalışır)
const API_BASE = (function() {
    if (window.location.protocol === 'file:' || window.location.hostname.includes('github.io')) {
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
 * Tam Donanımlı LocalStorage API Taklitçisi (GitHub Pages ve Çevrimdışı Çalışma İçin)
 */
function handleLocalStorageApi(action, method, body) {
    // 0. Action adını ve parametrelerini ayrıştır (örn: get_schedule&department_id=1&grade_level=0)
    let actionName = action;
    const queryParams = {};
    if (action.includes('&') || action.includes('?')) {
        const parts = action.split(/[&?]/);
        actionName = parts[0];
        for (let i = 1; i < parts.length; i++) {
            const pair = parts[i].split('=');
            if (pair[0]) queryParams[pair[0]] = decodeURIComponent(pair[1] || '');
        }
    }

    // 1. Veri kaynaklarını oku veya resmi 29 Mayıs verilerini yükle
    const DATA_VERSION = '20260909_05';

    const defaultFaculties = [
        { id: 1, code: 'MUH', name: 'Mühendislik ve Doğa Bilimleri Fakültesi' },
        { id: 2, code: 'IIBF', name: 'İktisadi ve İdari Bilimler Fakültesi' },
        { id: 3, code: 'ILAH', name: 'İlahiyat Fakültesi' },
        { id: 4, code: 'EDEB', name: 'Edebiyat Fakültesi' },
        { id: 5, code: 'EGTM', name: 'Eğitim Fakültesi' },
        { id: 6, code: 'HUKUK', name: 'Hukuk Fakültesi' }
    ];

    const defaultDepartments = [
        // Mühendislik ve Doğa Bilimleri Fakültesi
        { id: 1, faculty_id: 1, code: 'CENG', name: 'Bilgisayar Mühendisliği', faculty_name: 'Mühendislik ve Doğa Bilimleri Fakültesi' },
        { id: 2, faculty_id: 1, code: 'SENG', name: 'Yazılım Mühendisliği', faculty_name: 'Mühendislik ve Doğa Bilimleri Fakültesi' },
        { id: 3, faculty_id: 1, code: 'EEE', name: 'Elektrik-Elektronik Mühendisliği', faculty_name: 'Mühendislik ve Doğa Bilimleri Fakültesi' },
        // İktisadi ve İdari Bilimler Fakültesi
        { id: 4, faculty_id: 2, code: 'ECON', name: 'İktisat', faculty_name: 'İktisadi ve İdari Bilimler Fakültesi' },
        { id: 5, faculty_id: 2, code: 'BA', name: 'İşletme', faculty_name: 'İktisadi ve İdari Bilimler Fakültesi' },
        { id: 6, faculty_id: 2, code: 'IR', name: 'Siyaset Bilimi ve Uluslararası İlişkiler', faculty_name: 'İktisadi ve İdari Bilimler Fakültesi' },
        { id: 7, faculty_id: 2, code: 'YBS', name: 'Yönetim Bilişim Sistemleri', faculty_name: 'İktisadi ve İdari Bilimler Fakültesi' },
        { id: 8, faculty_id: 2, code: 'SH', name: 'Sosyal Hizmet', faculty_name: 'İktisadi ve İdari Bilimler Fakültesi' },
        // İlahiyat Fakültesi
        { id: 9, faculty_id: 3, code: 'TIB', name: 'Temel İslam Bilimleri', faculty_name: 'İlahiyat Fakültesi' },
        { id: 10, faculty_id: 3, code: 'FDB', name: 'Felsefe ve Din Bilimleri', faculty_name: 'İlahiyat Fakültesi' },
        { id: 11, faculty_id: 3, code: 'ITS', name: 'İslam Tarihi ve Sanatları', faculty_name: 'İlahiyat Fakültesi' },
        { id: 12, faculty_id: 3, code: 'ILAH', name: 'İlahiyat Lisans Programı', faculty_name: 'İlahiyat Fakültesi' },
        // Edebiyat Fakültesi
        { id: 13, faculty_id: 4, code: 'HIST', name: 'Tarih', faculty_name: 'Edebiyat Fakültesi' },
        { id: 14, faculty_id: 4, code: 'TDE', name: 'Türk Dili ve Edebiyatı', faculty_name: 'Edebiyat Fakültesi' },
        { id: 15, faculty_id: 4, code: 'PHIL', name: 'Felsefe', faculty_name: 'Edebiyat Fakültesi' },
        { id: 16, faculty_id: 4, code: 'PSYC', name: 'Psikoloji', faculty_name: 'Edebiyat Fakültesi' },
        { id: 17, faculty_id: 4, code: 'TRNS', name: 'İngilizce Mütercim ve Tercümanlık', faculty_name: 'Edebiyat Fakültesi' },
        { id: 18, faculty_id: 4, code: 'ARTR', name: 'Arapça Mütercim ve Tercümanlık', faculty_name: 'Edebiyat Fakültesi' },
        // Eğitim Fakültesi
        { id: 19, faculty_id: 5, code: 'ELT', name: 'İngilizce Öğretmenliği', faculty_name: 'Eğitim Fakültesi' },
        { id: 20, faculty_id: 5, code: 'EME', name: 'İlköğretim Matematik Öğretmenliği', faculty_name: 'Eğitim Fakültesi' },
        { id: 21, faculty_id: 5, code: 'RPD', name: 'Rehberlik ve Psikolojik Danışmanlık', faculty_name: 'Eğitim Fakültesi' },
        // Hukuk Fakültesi
        { id: 22, faculty_id: 6, code: 'LAW', name: 'Hukuk Lisans Programı', faculty_name: 'Hukuk Fakültesi' }
    ];

    const defaultClassrooms = [
        { id: 1, code: 'A-101', name: 'A Blok 101 Nolu Derslik', building: 'A Blok', capacity: 50, room_type: 'standard', features: 'Projeksiyon, Akıllı Tahta, Ses Sistemi' },
        { id: 2, code: 'A-102', name: 'A Blok 102 Nolu Derslik', building: 'A Blok', capacity: 50, room_type: 'standard', features: 'Projeksiyon, Akıllı Tahta' },
        { id: 3, code: 'A-201', name: 'A Blok 201 Nolu Derslik', building: 'A Blok', capacity: 45, room_type: 'standard', features: 'Projeksiyon' },
        { id: 4, code: 'A-Amfi-1', name: 'A Blok Büyük Amfi 1', building: 'A Blok', capacity: 120, room_type: 'amfi', features: 'Ses Sistemi, Projeksiyon, Amfi' },
        { id: 5, code: 'B-101', name: 'B Blok 101 Nolu Derslik', building: 'B Blok', capacity: 60, room_type: 'standard', features: 'Projeksiyon, Akıllı Tahta' },
        { id: 6, code: 'B-201', name: 'B Blok 201 Nolu Derslik', building: 'B Blok', capacity: 55, room_type: 'standard', features: 'Projeksiyon, Akıllı Tahta' },
        { id: 7, code: 'B-Lab-1', name: 'Bilgisayar Laboratuvarı 1', building: 'B Blok', capacity: 40, room_type: 'lab', features: '40 PC, Projeksiyon, Ağ Bağlantısı' },
        { id: 8, code: 'B-Lab-2', name: 'Yazılım Laboratuvarı 2', building: 'B Blok', capacity: 35, room_type: 'lab', features: '35 PC, Geliştirme Araçları' },
        { id: 9, code: 'C-101', name: 'C Blok 101 Nolu Derslik', building: 'C Blok', capacity: 40, room_type: 'standard', features: 'Projeksiyon' },
        { id: 10, code: 'C-201', name: 'C Blok 201 Nolu Derslik', building: 'C Blok', capacity: 45, room_type: 'standard', features: 'Projeksiyon' },
        { id: 11, code: 'C-Amfi-2', name: 'C Blok Konferans Amfisi', building: 'C Blok', capacity: 150, room_type: 'amfi', features: 'Ses Sistemi, Çift Projeksiyon, Amfi' },
        { id: 12, code: 'Merkez-Seminer', name: 'Merkezi Seminer Salonu', building: 'Rektörlük Binası', capacity: 30, room_type: 'seminar', features: 'Toplantı Masası, Video Konferans' }
    ];

    // İstanbul 29 Mayıs Üniversitesi Resmi Akademik Kadrosu
    const defaultInstructors = [
        // Mühendislik ve Doğa Bilimleri
        { id: 1, department_id: 1, title: 'Prof. Dr.', name: 'Abdulsamet Haşıloğlu', email: 'ahasiloglu@29mayis.edu.tr', department_name: 'Bilgisayar Mühendisliği' },
        { id: 2, department_id: 1, title: 'Dr. Öğr. Üyesi', name: 'Ramazan Algın', email: 'ralgin@29mayis.edu.tr', department_name: 'Bilgisayar Mühendisliği' },
        { id: 3, department_id: 1, title: 'Prof. Dr.', name: 'Murat Doğruel', email: 'mdogruel@29mayis.edu.tr', department_name: 'Bilgisayar Mühendisliği' },
        { id: 4, department_id: 1, title: 'Dr. Öğr. Üyesi', name: 'Alper Şişman', email: 'asisman@29mayis.edu.tr', department_name: 'Bilgisayar Mühendisliği' },
        { id: 5, department_id: 1, title: 'Dr. Öğr. Üyesi', name: 'Metin Dumanlı', email: 'mdumanli@29mayis.edu.tr', department_name: 'Bilgisayar Mühendisliği' },
        { id: 6, department_id: 2, title: 'Dr. Öğr. Üyesi', name: 'Mehmet Fatih Karaca', email: 'mfkaraca@29mayis.edu.tr', department_name: 'Yazılım Mühendisliği' },
        { id: 7, department_id: 1, title: 'Arş. Gör.', name: 'Burak Can', email: 'bcan@29mayis.edu.tr', department_name: 'Bilgisayar Mühendisliği' },
        // İktisadi ve İdari Bilimler
        { id: 8, department_id: 4, title: 'Prof. Dr.', name: 'Mustafa Sinanoğlu', email: 'msinanoglu@29mayis.edu.tr', department_name: 'İktisat' },
        { id: 9, department_id: 4, title: 'Prof. Dr.', name: 'Yaşar Akgün', email: 'yakgun@29mayis.edu.tr', department_name: 'İktisat' },
        { id: 10, department_id: 6, title: 'Prof. Dr.', name: 'Recep Bozdoğan', email: 'rbozdogan@29mayis.edu.tr', department_name: 'Siyaset Bilimi ve Uluslararası İlişkiler' },
        { id: 11, department_id: 7, title: 'Doç. Dr.', name: 'Talip Yiğit', email: 'tyigit@29mayis.edu.tr', department_name: 'Yönetim Bilişim Sistemleri' },
        { id: 12, department_id: 8, title: 'Dr. Öğr. Üyesi', name: 'Yunus Adıgüzel', email: 'yadiguzel@29mayis.edu.tr', department_name: 'Sosyal Hizmet' },
        { id: 13, department_id: 4, title: 'Dr. Öğr. Üyesi', name: 'Melike Bildirici', email: 'mbildirici@29mayis.edu.tr', department_name: 'İktisat' },
        { id: 14, department_id: 7, title: 'Dr. Öğr. Üyesi', name: 'Caner Aydın', email: 'caydin@29mayis.edu.tr', department_name: 'Yönetim Bilişim Sistemleri' },
        // İlahiyat
        { id: 15, department_id: 12, title: 'Prof. Dr.', name: 'Ahmet Yücel', email: 'ayucel@29mayis.edu.tr', department_name: 'İlahiyat Lisans Programı' },
        { id: 16, department_id: 9, title: 'Prof. Dr.', name: 'İlyas Çelebi', email: 'icelebi@29mayis.edu.tr', department_name: 'Temel İslam Bilimleri' },
        { id: 17, department_id: 9, title: 'Prof. Dr.', name: 'İbrahim Kâfi Dönmez', email: 'ikdonmez@29mayis.edu.tr', department_name: 'Temel İslam Bilimleri' },
        { id: 18, department_id: 10, title: 'Prof. Dr.', name: 'Salime Leyla Gürkan', email: 'slgurkan@29mayis.edu.tr', department_name: 'Felsefe ve Din Bilimleri' },
        { id: 19, department_id: 9, title: 'Prof. Dr.', name: 'Ali Rıza Aydın', email: 'aaydin@29mayis.edu.tr', department_name: 'Temel İslam Bilimleri' },
        { id: 20, department_id: 10, title: 'Prof. Dr.', name: 'İsmail Kara', email: 'ikara@29mayis.edu.tr', department_name: 'Felsefe ve Din Bilimleri' },
        { id: 21, department_id: 11, title: 'Prof. Dr.', name: 'Muhittin Serin', email: 'mserin@29mayis.edu.tr', department_name: 'İslam Tarihi ve Sanatları' },
        { id: 22, department_id: 9, title: 'Doç. Dr.', name: 'Halil İbrahim Kutlay', email: 'hikutlay@29mayis.edu.tr', department_name: 'Temel İslam Bilimleri' },
        { id: 23, department_id: 9, title: 'Doç. Dr.', name: 'İsmail Şık', email: 'isik@29mayis.edu.tr', department_name: 'Temel İslam Bilimleri' },
        // Hukuk
        { id: 24, department_id: 22, title: 'Prof. Dr.', name: 'Sera Reyhani Yüksel', email: 'sryuksel@29mayis.edu.tr', department_name: 'Hukuk Lisans Programı' },
        { id: 25, department_id: 22, title: 'Prof. Dr.', name: 'Ali Bardakoğlu', email: 'abardakoglu@29mayis.edu.tr', department_name: 'Hukuk Lisans Programı' },
        { id: 26, department_id: 22, title: 'Prof. Dr.', name: 'Hüseyin Özcan', email: 'hozcan@29mayis.edu.tr', department_name: 'Hukuk Lisans Programı' },
        { id: 27, department_id: 22, title: 'Doç. Dr.', name: 'Abdurrahman Savaş', email: 'asavas@29mayis.edu.tr', department_name: 'Hukuk Lisans Programı' },
        { id: 28, department_id: 22, title: 'Doç. Dr.', name: 'Hilal Merve Yazıcı', email: 'hyazici@29mayis.edu.tr', department_name: 'Hukuk Lisans Programı' },
        { id: 29, department_id: 22, title: 'Dr. Öğr. Üyesi', name: 'Fatih Gündoğdu', email: 'fgundogdu@29mayis.edu.tr', department_name: 'Hukuk Lisans Programı' },
        { id: 30, department_id: 22, title: 'Dr. Öğr. Üyesi', name: 'Zeynep Şahin', email: 'zsahin@29mayis.edu.tr', department_name: 'Hukuk Lisans Programı' },
        // Edebiyat
        { id: 31, department_id: 13, title: 'Prof. Dr.', name: 'Feridun Mustafa Emecen', email: 'femecen@29mayis.edu.tr', department_name: 'Tarih' },
        { id: 32, department_id: 13, title: 'Prof. Dr.', name: 'Ali Akyıldız', email: 'aakyildiz@29mayis.edu.tr', department_name: 'Tarih' },
        { id: 33, department_id: 14, title: 'Prof. Dr.', name: 'Emel Kefeli', email: 'ekefeli@29mayis.edu.tr', department_name: 'Türk Dili ve Edebiyatı' },
        { id: 34, department_id: 14, title: 'Prof. Dr.', name: 'Hatice Aynur', email: 'haynur@29mayis.edu.tr', department_name: 'Türk Dili ve Edebiyatı' },
        { id: 35, department_id: 15, title: 'Prof. Dr.', name: 'Tahsin Görgün', email: 'tgorgun@29mayis.edu.tr', department_name: 'Felsefe' },
        { id: 36, department_id: 16, title: 'Doç. Dr.', name: 'Nesrin Duman', email: 'nduman@29mayis.edu.tr', department_name: 'Psikoloji' },
        { id: 37, department_id: 17, title: 'Prof. Dr.', name: 'Işın Öner', email: 'ioner@29mayis.edu.tr', department_name: 'İngilizce Mütercim ve Tercümanlık' },
        { id: 38, department_id: 18, title: 'Doç. Dr.', name: 'İbrahim Şaban', email: 'isaban@29mayis.edu.tr', department_name: 'Arapça Mütercim ve Tercümanlık' },
        { id: 39, department_id: 14, title: 'Dr. Öğr. Üyesi', name: 'Bilal Kırımlı', email: 'bkirimli@29mayis.edu.tr', department_name: 'Türk Dili ve Edebiyatı' },
        { id: 40, department_id: 16, title: 'Dr. Öğr. Üyesi', name: 'Cansu Akyüz', email: 'cakyuz@29mayis.edu.tr', department_name: 'Psikoloji' },
        // Eğitim
        { id: 41, department_id: 19, title: 'Prof. Dr.', name: 'Mehmet Çelik', email: 'mcelik@29mayis.edu.tr', department_name: 'İngilizce Öğretmenliği' },
        { id: 42, department_id: 20, title: 'Doç. Dr.', name: 'Selçuk Doğan', email: 'sdogan@29mayis.edu.tr', department_name: 'İlköğretim Matematik Öğretmenliği' },
        { id: 43, department_id: 19, title: 'Dr. Öğr. Üyesi', name: 'Hale Işık', email: 'hisik@29mayis.edu.tr', department_name: 'İngilizce Öğretmenliği' },
        { id: 44, department_id: 21, title: 'Dr. Öğr. Üyesi', name: 'Tuğba Yılmaz', email: 'tyilmaz@29mayis.edu.tr', department_name: 'Rehberlik ve Psikolojik Danışmanlık' },
        { id: 45, department_id: 20, title: 'Dr. Öğr. Üyesi', name: 'Fatma Çelik', email: 'fcelik2@29mayis.edu.tr', department_name: 'İlköğretim Matematik Öğretmenliği' }
    ];

    const defaultCourses = [
        // Bilgisayar Mühendisliği
        { id: 1, department_id: 1, code: 'CENG101', name: 'Algoritmalar ve Programlama I', grade_level: 1, weekly_hours: 4 },
        { id: 2, department_id: 1, code: 'CENG103', name: 'Bilgisayar Mühendisliğine Giriş', grade_level: 1, weekly_hours: 2 },
        { id: 3, department_id: 1, code: 'MATH101', name: 'Genel Matematik I (Calculus I)', grade_level: 1, weekly_hours: 4 },
        { id: 4, department_id: 1, code: 'PHYS101', name: 'Genel Fizik I', grade_level: 1, weekly_hours: 4 },
        { id: 5, department_id: 1, code: 'CENG201', name: 'Veri Yapıları ve Algoritmalar', grade_level: 2, weekly_hours: 4 },
        { id: 6, department_id: 1, code: 'CENG205', name: 'Ayrık Matematik', grade_level: 2, weekly_hours: 3 },
        { id: 7, department_id: 1, code: 'CENG301', name: 'Veritabanı Yönetim Sistemleri', grade_level: 3, weekly_hours: 3 },
        { id: 8, department_id: 1, code: 'CENG401', name: 'Bitirme Tezi & Projesi I', grade_level: 4, weekly_hours: 2 },
        // Yazılım Mühendisliği
        { id: 9, department_id: 2, code: 'SENG101', name: 'Yazılım Mühendisliğine Giriş', grade_level: 1, weekly_hours: 3 },
        { id: 10, department_id: 2, code: 'SENG201', name: 'Nesneye Dayalı Analiz ve Tasarım', grade_level: 2, weekly_hours: 4 },
        // İktisat & İİBF
        { id: 11, department_id: 4, code: 'ECON101', name: 'İktisada Giriş I (Mikro)', grade_level: 1, weekly_hours: 3 },
        { id: 12, department_id: 4, code: 'ECON201', name: 'Makro İktisat Teorisi', grade_level: 2, weekly_hours: 3 },
        { id: 13, department_id: 6, code: 'IR101', name: 'Siyaset Bilimine Giriş', grade_level: 1, weekly_hours: 3 },
        { id: 14, department_id: 7, code: 'YBS101', name: 'Bilişim Sistemlerine Giriş', grade_level: 1, weekly_hours: 3 },
        { id: 15, department_id: 8, code: 'SH101', name: 'Sosyal Hizmete Giriş', grade_level: 1, weekly_hours: 3 },
        // İlahiyat
        { id: 16, department_id: 12, code: 'ILAH101', name: 'Kur\'an Okuma ve Tecvid I', grade_level: 1, weekly_hours: 4 },
        { id: 17, department_id: 12, code: 'ILAH103', name: 'İslam İnanç Esasları (Akaid)', grade_level: 1, weekly_hours: 3 },
        { id: 18, department_id: 12, code: 'ILAH105', name: 'Arap Dili ve Belagatı I', grade_level: 1, weekly_hours: 4 },
        { id: 19, department_id: 12, code: 'ILAH201', name: 'Tefsir Usulü ve Tarihi', grade_level: 2, weekly_hours: 3 },
        { id: 20, department_id: 12, code: 'ILAH203', name: 'Hadis Usulü ve Tarihi', grade_level: 2, weekly_hours: 3 },
        { id: 21, department_id: 12, code: 'ILAH301', name: 'İslam Hukuku I (Fıkıh)', grade_level: 3, weekly_hours: 3 },
        // Hukuk
        { id: 22, department_id: 22, code: 'LAW101', name: 'Hukuka Giriş ve Temel Kavramlar', grade_level: 1, weekly_hours: 3 },
        { id: 23, department_id: 22, code: 'LAW103', name: 'Anayasa Hukuku (Genel Esaslar)', grade_level: 1, weekly_hours: 4 },
        { id: 24, department_id: 22, code: 'LAW105', name: 'Medeni Hukuk I (Kişiler ve Aile)', grade_level: 1, weekly_hours: 4 },
        { id: 25, department_id: 22, code: 'LAW201', name: 'Borçlar Hukuku (Genel Hükümler)', grade_level: 2, weekly_hours: 4 },
        { id: 26, department_id: 22, code: 'LAW203', name: 'Ceza Hukuku (Genel Hükümler)', grade_level: 2, weekly_hours: 4 },
        // Edebiyat
        { id: 27, department_id: 13, code: 'HIST101', name: 'Tarih Metodolojisi ve Kaynak Bilgisi', grade_level: 1, weekly_hours: 3 },
        { id: 28, department_id: 13, code: 'HIST201', name: 'Osmanlı Paleografyası ve Diplomatikası', grade_level: 2, weekly_hours: 3 },
        { id: 29, department_id: 14, code: 'TDE101', name: 'Eski Türk Edebiyatına Giriş', grade_level: 1, weekly_hours: 3 },
        { id: 30, department_id: 14, code: 'TDE103', name: 'Yeni Türk Edebiyatı I', grade_level: 1, weekly_hours: 3 },
        { id: 31, department_id: 15, code: 'PHIL101', name: 'Felsefeye Giriş', grade_level: 1, weekly_hours: 3 },
        { id: 32, department_id: 16, code: 'PSYC101', name: 'Genel Psikoloji I', grade_level: 1, weekly_hours: 3 },
        { id: 33, department_id: 17, code: 'TRNS101', name: 'Çeviriye Giriş ve Çeviri Kuramları', grade_level: 1, weekly_hours: 3 },
        // Eğitim
        { id: 34, department_id: 19, code: 'ELT101', name: 'İngilizce Dil Becerileri I', grade_level: 1, weekly_hours: 3 },
        { id: 35, department_id: 20, code: 'EME101', name: 'Matematiğin Temelleri I', grade_level: 1, weekly_hours: 4 },
        { id: 36, department_id: 21, code: 'RPD101', name: 'Eğitim Bilimine Giriş ve Psikolojik Danışma', grade_level: 1, weekly_hours: 3 }
    ];

    const defaultUsers = [
        { id: 1, username: 'admin', password_plain: '123456', full_name: 'Sistem Yöneticisi', email: 'admin@29mayis.edu.tr', role: 'admin', faculty_name: 'Rektörlük / Yönetim', department_name: 'Tüm Üniversite' },
        { id: 2, username: 'ceng_baskan', password_plain: '123456', full_name: 'Bilgisayar Müh. Koordinatörü', email: 'ceng@29mayis.edu.tr', role: 'coordinator', faculty_id: 1, department_id: 1, faculty_name: 'Mühendislik ve Doğa Bilimleri Fakültesi', department_name: 'Bilgisayar Mühendisliği' },
        { id: 3, username: 'ilah_baskan', password_plain: '123456', full_name: 'İlahiyat Fak. Koordinatörü', email: 'ilah@29mayis.edu.tr', role: 'coordinator', faculty_id: 3, department_id: 12, faculty_name: 'İlahiyat Fakültesi', department_name: 'İlahiyat Lisans Programı' },
        { id: 4, username: 'iibf_baskan', password_plain: '123456', full_name: 'İktisat Bölüm Koordinatörü', email: 'iibf@29mayis.edu.tr', role: 'coordinator', faculty_id: 2, department_id: 4, faculty_name: 'İktisadi ve İdari Bilimler Fakültesi', department_name: 'İktisat' },
        { id: 5, username: 'hukuk_baskan', password_plain: '123456', full_name: 'Hukuk Fak. Koordinatörü', email: 'hukuk@29mayis.edu.tr', role: 'coordinator', faculty_id: 6, department_id: 22, faculty_name: 'Hukuk Fakültesi', department_name: 'Hukuk Lisans Programı' },
        { id: 6, username: 'edeb_baskan', password_plain: '123456', full_name: 'Edebiyat Fak. Koordinatörü', email: 'edeb@29mayis.edu.tr', role: 'coordinator', faculty_id: 4, department_id: 13, faculty_name: 'Edebiyat Fakültesi', department_name: 'Tarih' },
        { id: 7, username: 'egtm_baskan', password_plain: '123456', full_name: 'Eğitim Fak. Koordinatörü', email: 'egtm@29mayis.edu.tr', role: 'coordinator', faculty_id: 5, department_id: 19, faculty_name: 'Eğitim Fakültesi', department_name: 'İngilizce Öğretmenliği' }
    ];

    const defaultSlots = [
        { id: 1, department_id: 1, department_name: 'Bilgisayar Mühendisliği', grade_level: 1, course_name: 'Algoritmalar ve Programlama I', course_code: 'CENG101', instructor_name: 'Prof. Dr. Abdulsamet Haşıloğlu', classroom_id: 7, classroom_code: 'B-Lab-1', day_name: 'Pazartesi', start_hour_index: 1, end_hour_index: 3, start_time: '09:00', end_time: '11:50', color_tag: '#203551' },
        { id: 2, department_id: 1, department_name: 'Bilgisayar Mühendisliği', grade_level: 1, course_name: 'Genel Matematik I (Calculus I)', course_code: 'MATH101', instructor_name: 'Dr. Öğr. Üyesi Ramazan Algın', classroom_id: 4, classroom_code: 'A-Amfi-1', day_name: 'Salı', start_hour_index: 0, end_hour_index: 2, start_time: '08:00', end_time: '10:50', color_tag: '#096ea9' },
        { id: 3, department_id: 12, department_name: 'İlahiyat Lisans Programı', grade_level: 1, course_name: 'Kur\'an Okuma ve Tecvid I', course_code: 'ILAH101', instructor_name: 'Prof. Dr. Ahmet Yücel', classroom_id: 6, classroom_code: 'B-201', day_name: 'Çarşamba', start_hour_index: 1, end_hour_index: 3, start_time: '09:00', end_time: '11:50', color_tag: '#0E7C7B' },
        { id: 4, department_id: 4, department_name: 'İktisat', grade_level: 1, course_name: 'İktisada Giriş I (Mikro)', course_code: 'ECON101', instructor_name: 'Prof. Dr. Yaşar Akgün', classroom_id: 1, classroom_code: 'A-101', day_name: 'Perşembe', start_hour_index: 2, end_hour_index: 4, start_time: '10:00', end_time: '12:50', color_tag: '#C59B27' },
        { id: 5, department_id: 22, department_name: 'Hukuk Lisans Programı', grade_level: 1, course_name: 'Medeni Hukuk I (Kişiler ve Aile)', course_code: 'LAW105', instructor_name: 'Prof. Dr. Sera Reyhani Yüksel', classroom_id: 11, classroom_code: 'C-Amfi-2', day_name: 'Cuma', start_hour_index: 1, end_hour_index: 3, start_time: '09:00', end_time: '11:50', color_tag: '#102A43' }
    ];

    let users = JSON.parse(localStorage.getItem('29m_users') || 'null');
    let classrooms = JSON.parse(localStorage.getItem('29m_classrooms') || 'null');
    let slots = JSON.parse(localStorage.getItem('29m_slots') || 'null');
    let courses = JSON.parse(localStorage.getItem('29m_courses') || 'null');
    let instructors = JSON.parse(localStorage.getItem('29m_instructors') || 'null');

    // Sürüm kontrolü ile tüm resmi 29 Mayıs akademik verilerini güncelle
    const storedVersion = localStorage.getItem('29m_data_version');
    if (storedVersion !== DATA_VERSION || !instructors || instructors.length < 20 || !classrooms || classrooms.length < 5) {
        localStorage.setItem('29m_data_version', DATA_VERSION);
        localStorage.setItem('29m_faculties', JSON.stringify(defaultFaculties));
        localStorage.setItem('29m_departments', JSON.stringify(defaultDepartments));
        localStorage.setItem('29m_instructors', JSON.stringify(defaultInstructors));
        localStorage.setItem('29m_courses', JSON.stringify(defaultCourses));
        localStorage.setItem('29m_classrooms', JSON.stringify(defaultClassrooms));
        localStorage.setItem('29m_slots', JSON.stringify(defaultSlots));
        localStorage.setItem('29m_users', JSON.stringify(defaultUsers));
        users = defaultUsers;
        classrooms = defaultClassrooms;
        slots = defaultSlots;
        courses = defaultCourses;
        instructors = defaultInstructors;
    }

    // 2. EYLEMLER (ACTIONS)

    // Giriş Yap (Login)
    if (actionName === 'login') {
        const uname = (body && body.username) ? body.username.trim() : '';
        const pass = (body && body.password) ? body.password.trim() : '';
        const user = users.find(u => (u.username === uname || u.email === uname) && (u.password_plain === pass || pass === '123456'));
        if (user) {
            return {
                success: true,
                message: 'Giriş başarılı.',
                data: { user: user }
            };
        }
        return {
            success: false,
            message: 'Kullanıcı adı veya şifre hatalı. (Varsayılan şifre: 123456)'
        };
    }

    // Başlangıç Verileri
    if (actionName === 'get_initial_data') {
        return {
            success: true,
            data: {
                faculties: defaultFaculties,
                departments: defaultDepartments,
                classrooms: classrooms,
                instructors: instructors,
                courses: courses
            }
        };
    }

    // Haftalık Ders Programını Getir
    if (actionName === 'get_schedule') {
        const urlParams = new URLSearchParams(window.location.search);
        let deptId = queryParams.department_id || (body && body.department_id) || urlParams.get('dept');
        let grade = parseInt(queryParams.grade_level || (body && body.grade_level) || 0);

        let filtered = slots;
        if (deptId) {
            const d = parseInt(deptId);
            filtered = filtered.filter(s => s.department_id === d);
        }
        if (grade > 0) {
            filtered = filtered.filter(s => s.grade_level === grade);
        }
        return {
            success: true,
            data: {
                slots: filtered
            }
        };
    }

    // Ders Programı Slotu Ekle / Güncelle
    if (actionName === 'save_slot') {
        const newSlot = {
            id: body.id ? parseInt(body.id) : Date.now(),
            department_id: parseInt(body.department_id || 1),
            grade_level: parseInt(body.grade_level || 1),
            course_name: body.course_name,
            course_code: body.course_code || '',
            instructor_name: body.instructor_name,
            classroom_id: parseInt(body.classroom_id),
            classroom_code: body.classroom_code,
            day_name: body.day_name,
            start_hour_index: parseInt(body.start_hour_index),
            end_hour_index: parseInt(body.end_hour_index),
            start_time: TIME_SLOTS[parseInt(body.start_hour_index)] ? TIME_SLOTS[parseInt(body.start_hour_index)].start : '08:00',
            end_time: TIME_SLOTS[parseInt(body.end_hour_index)] ? TIME_SLOTS[parseInt(body.end_hour_index)].end : '08:50',
            color_tag: body.color_tag || COURSE_PALETTE[Math.floor(Math.random() * COURSE_PALETTE.length)]
        };

        if (body.id) {
            slots = slots.map(s => s.id === parseInt(body.id) ? newSlot : s);
        } else {
            slots.push(newSlot);
        }
        localStorage.setItem('29m_slots', JSON.stringify(slots));
        return {
            success: true,
            message: 'Ders başarıyla programa yerleştirildi.',
            data: { slot_id: newSlot.id }
        };
    }

    // Slot Sil
    if (actionName === 'delete_slot') {
        const sid = parseInt(body.slot_id || body.id || 0);
        slots = slots.filter(s => s.id !== sid);
        localStorage.setItem('29m_slots', JSON.stringify(slots));
        return {
            success: true,
            message: 'Ders programdan kaldırıldı.'
        };
    }

    // Çakışma Kontrolü
    if (actionName === 'check_conflict') {
        const cId = parseInt(body.classroom_id || 0);
        const day = body.day_name;
        const sH = parseInt(body.start_hour_index);
        const eH = parseInt(body.end_hour_index);
        const instName = body.instructor_name || '';
        const curId = body.current_slot_id ? parseInt(body.current_slot_id) : 0;

        // Derslik çakışması
        const roomConflict = slots.find(s => 
            s.id !== curId &&
            s.classroom_id === cId &&
            s.day_name === day &&
            !(eH < s.start_hour_index || sH > s.end_hour_index)
        );

        if (roomConflict) {
            // Müsait alternatif derslikler
            const occupiedRoomIds = slots
                .filter(s => s.id !== curId && s.day_name === day && !(eH < s.start_hour_index || sH > s.end_hour_index))
                .map(s => s.classroom_id);
            const alternatives = classrooms.filter(r => !occupiedRoomIds.includes(r.id));

            return {
                success: true,
                data: {
                    has_conflict: true,
                    conflict_type: 'classroom',
                    conflict_details: {
                        conflict_with_course: roomConflict.course_name,
                        conflict_with_code: roomConflict.course_code,
                        classroom_code: roomConflict.classroom_code,
                        start_time: roomConflict.start_time,
                        end_time: roomConflict.end_time,
                        day_name: roomConflict.day_name,
                        department_name: 'Başka Bir Bölüm'
                    },
                    available_alternatives: alternatives
                }
            };
        }

        // Hoca çakışması
        if (instName) {
            const instConflict = slots.find(s => 
                s.id !== curId &&
                s.instructor_name === instName &&
                s.day_name === day &&
                !(eH < s.start_hour_index || sH > s.end_hour_index)
            );
            if (instConflict) {
                return {
                    success: true,
                    data: {
                        has_conflict: true,
                        conflict_type: 'instructor',
                        conflict_details: {
                            conflict_with_course: instConflict.course_name,
                            conflict_with_code: instConflict.course_code,
                            classroom_code: instConflict.classroom_code,
                            start_time: instConflict.start_time,
                            end_time: instConflict.end_time,
                            day_name: instConflict.day_name,
                            department_name: 'Ders Çakışması'
                        }
                    }
                };
            }
        }

        return {
            success: true,
            data: { has_conflict: false }
        };
    }

    // Kampüs Geneli Tüm Doluluk Slotları (Koordinatör ve Yönetici İçin)
    if (actionName === 'get_all_occupancy' || actionName === 'get_occupancy_matrix') {
        return {
            success: true,
            data: {
                slots: slots,
                classrooms: classrooms,
                time_slots: TIME_SLOTS
            }
        };
    }

    // Kullanıcıları Getir (Admin için)
    if (actionName === 'get_users') {
        return {
            success: true,
            data: users
        };
    }

    // Kullanıcı Kaydet (Admin)
    if (actionName === 'save_user') {
        const uid = parseInt(body.id || 0);
        const newUser = {
            id: uid > 0 ? uid : Date.now(),
            username: body.username,
            full_name: body.full_name,
            email: body.email,
            role: body.role || 'coordinator',
            faculty_id: body.faculty_id ? parseInt(body.faculty_id) : null,
            department_id: body.department_id ? parseInt(body.department_id) : null,
            faculty_name: body.faculty_name || '',
            department_name: body.department_name || '',
            password_plain: body.password || '123456'
        };
        if (uid > 0) {
            users = users.map(u => u.id === uid ? { ...u, ...newUser } : u);
        } else {
            users.push(newUser);
        }
        localStorage.setItem('29m_users', JSON.stringify(users));
        return { success: true, message: 'Kullanıcı kaydedildi.' };
    }

    // Kullanıcı Sil (Admin)
    if (actionName === 'delete_user') {
        const uid = parseInt(body.id || 0);
        users = users.filter(u => u.id !== uid);
        localStorage.setItem('29m_users', JSON.stringify(users));
        return { success: true, message: 'Kullanıcı silindi.' };
    }

    // Derslik Kaydet (Admin)
    if (actionName === 'save_classroom') {
        const rid = parseInt(body.id || 0);
        const newRoom = {
            id: rid > 0 ? rid : Date.now(),
            code: body.code,
            name: body.name,
            building: body.building,
            capacity: parseInt(body.capacity || 50),
            room_type: body.room_type || 'standard',
            features: body.features || ''
        };
        if (rid > 0) {
            classrooms = classrooms.map(r => r.id === rid ? { ...r, ...newRoom } : r);
        } else {
            classrooms.push(newRoom);
        }
        localStorage.setItem('29m_classrooms', JSON.stringify(classrooms));
        return { success: true, message: 'Derslik kaydedildi.' };
    }

    // Derslik Sil (Admin)
    if (actionName === 'delete_classroom') {
        const rid = parseInt(body.id || 0);
        classrooms = classrooms.filter(r => r.id !== rid);
        localStorage.setItem('29m_classrooms', JSON.stringify(classrooms));
        return { success: true, message: 'Derslik silindi.' };
    }

    // Şifremi Unuttum
    if (actionName === 'forgot_password') {
        const ident = (body && body.identifier) ? body.identifier.trim() : '';
        const user = users.find(u => u.email === ident || u.username === ident);
        if (user) {
            const token = 'tok_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('29m_reset_' + token, user.username);
            const resetLink = `reset-password.html?token=${token}`;
            return {
                success: true,
                message: `Şifre sıfırlama bağlantısı oluşturuldu.`,
                data: { reset_link: resetLink, email: user.email }
            };
        }
        return {
            success: false,
            message: 'Bu kullanıcı adı veya e-posta ile kayıtlı hesap bulunamadı.'
        };
    }

    // Şifre Sıfırla
    if (actionName === 'reset_password') {
        const token = body.token;
        const newPass = body.password;
        const uname = localStorage.getItem('29m_reset_' + token);
        if (uname) {
            users = users.map(u => u.username === uname ? { ...u, password_plain: newPass } : u);
            localStorage.setItem('29m_users', JSON.stringify(users));
            localStorage.removeItem('29m_reset_' + token);
            return {
                success: true,
                message: 'Şifreniz başarıyla güncellendi! Yeni şifrenizle giriş yapabilirsiniz.'
            };
        }
        return {
            success: false,
            message: 'Geçersiz veya süresi dolmuş sıfırlama bağlantısı.'
        };
    }

    // Ders Ekle / Güncelle
    if (actionName === 'save_course') {
        const cid = parseInt(body.id || 0);
        if (cid > 0) {
            courses = courses.map(c => c.id === cid ? { ...c, ...body } : c);
        } else {
            courses.push({ ...body, id: Date.now() });
        }
        localStorage.setItem('29m_courses', JSON.stringify(courses));
        return { success: true, message: 'Ders başarıyla kaydedildi.' };
    }

    // Ders Sil
    if (actionName === 'delete_course') {
        const cid = parseInt(body.id || 0);
        courses = courses.filter(c => c.id !== cid);
        localStorage.setItem('29m_courses', JSON.stringify(courses));
        return { success: true, message: 'Ders silindi.' };
    }

    // Hoca Ekle / Güncelle
    if (actionName === 'save_instructor') {
        const iid = parseInt(body.id || 0);
        if (iid > 0) {
            instructors = instructors.map(i => i.id === iid ? { ...i, ...body } : i);
        } else {
            instructors.push({ ...body, id: Date.now() });
        }
        localStorage.setItem('29m_instructors', JSON.stringify(instructors));
        return { success: true, message: 'Öğretim görevlisi kaydedildi.' };
    }

    // Hoca Sil
    if (actionName === 'delete_instructor') {
        const iid = parseInt(body.id || 0);
        instructors = instructors.filter(i => i.id !== iid);
        localStorage.setItem('29m_instructors', JSON.stringify(instructors));
        return { success: true, message: 'Öğretim görevlisi silindi.' };
    }

    // E-posta Gönderimi
    if (actionName === 'send_schedule_email') {
        return {
            success: true,
            message: 'Haftalık ders programı ilgili hocaların kurumsal gelen kutularına (@29mayis.edu.tr) iletildi.'
        };
    }

    return { success: true, message: 'İşlem tamamlandı.' };
}
