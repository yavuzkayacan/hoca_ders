/**
 * Istanbul 29 Mayis Universitesi - Ders Programi
 * Ana Uygulama Mantigi ve Bolum Arayuzu Yoneticisi
 */

class UniversityApp {
    constructor() {
        this.currentUser = null;
        this.initialData = {
            faculties: [],
            departments: [],
            classrooms: [],
            instructors: [],
            courses: []
        };
        this.currentDepartment = null;
        this.currentFaculty = null;
        this.currentGradeLevel = 0; // 0 = Tumu
        this.scheduleSlots = [];
        this.grid = null;
        this.selectedRange = null;

        this.init();
    }

    async init() {
        if (!this.checkAuth()) return;
        this.initElements();
        await this.loadInitialData();
        this.setupUserDepartment();
        this.initGrid();
        this.initEventListeners();
        await this.loadSchedule();
    }

    /**
     * Oturum kontrolu
     */
    checkAuth() {
        const storedUser = sessionStorage.getItem('29m_user');
        if (!storedUser) {
            window.location.href = 'login.html';
            return false;
        }
        
        try {
            this.currentUser = JSON.parse(storedUser);
        } catch (e) {
            window.location.href = 'login.html';
            return false;
        }

        // URL parametresi ile bolum degistirilmis mi kontrol et (?dept=6 gibi)
        const urlParams = new URLSearchParams(window.location.search);
        const deptParam = urlParams.get('dept');
        if (deptParam) {
            this.currentUser.department_id = parseInt(deptParam);
        }

        this.renderUserHeader();
        return true;
    }

    renderUserHeader() {
        const userNameEl = document.getElementById('navUserName');
        const userRoleEl = document.getElementById('navUserRole');
        const adminLink = document.getElementById('navAdminLink');

        if (userNameEl) userNameEl.textContent = this.currentUser.full_name || this.currentUser.username;
        if (userRoleEl) {
            userRoleEl.textContent = this.currentUser.role === 'admin' ? 'YÖNETİCİ' : 'KOORDİNATÖR';
        }
        if (adminLink) {
            adminLink.style.display = 'inline-flex';
        }
    }

    initElements() {
        this.modal = document.getElementById('addCourseModal');
        this.selectionBanner = document.getElementById('selectionBanner');
        this.btnOpenModal = document.getElementById('btnOpenAddModal');
        this.selectionText = document.getElementById('selectionText');
        this.facultyPill = document.getElementById('currentFacultyBadge');
        this.deptTitle = document.getElementById('currentDeptTitle');
    }

    async loadInitialData() {
        const res = await apiRequest('get_initial_data');
        if (res && res.success && res.data) {
            this.initialData = res.data;
        }
    }

    setupUserDepartment() {
        // Kullanicinin bolumunu bul
        const deptId = this.currentUser.department_id || 1;
        this.currentDepartment = this.initialData.departments.find(d => d.id == deptId) || {
            id: 1,
            name: 'Bilgisayar Mühendisliği',
            faculty_name: 'Mühendislik ve Doğa Bilimleri Fakültesi'
        };

        if (this.deptTitle) {
            this.deptTitle.textContent = this.currentDepartment.name + ' Haftalık Ders Programı';
        }
        if (this.facultyPill) {
            this.facultyPill.textContent = this.currentDepartment.faculty_name || '29 Mayıs Üniversitesi';
        }

        this.populateModalSelects();
    }

    populateModalSelects() {
        // Derslikler (Bloklara gore gruplandirilmis)
        const roomSelect = document.getElementById('slotClassroom');
        if (roomSelect) {
            roomSelect.innerHTML = '<option value="">-- Derslik Seçiniz --</option>';
            
            // Bloklara gore grupla
            const buildings = {};
            this.initialData.classrooms.forEach(c => {
                const b = c.building || 'Diğer';
                if (!buildings[b]) buildings[b] = [];
                buildings[b].push(c);
            });

            for (const [bName, rooms] of Object.entries(buildings)) {
                const optGroup = document.createElement('optgroup');
                optGroup.label = `🏛️ ${bName}`;
                rooms.forEach(r => {
                    const opt = document.createElement('option');
                    opt.value = r.id;
                    opt.textContent = `${r.code} - ${r.name} (Kapasite: ${r.capacity})`;
                    optGroup.appendChild(opt);
                });
                roomSelect.appendChild(optGroup);
            }
        }

        // Bolumun dersleri
        const courseSelect = document.getElementById('slotCourseSelect');
        if (courseSelect) {
            courseSelect.innerHTML = '<option value="">-- Listeden Seçin veya Manuel Yazın --</option>';
            const deptCourses = this.initialData.courses.filter(c => c.department_id == this.currentDepartment.id);
            deptCourses.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.dataset.code = c.code;
                opt.dataset.name = c.name;
                opt.dataset.grade = c.grade_level;
                opt.textContent = `${c.code} - ${c.name} (${c.grade_level}. Sınıf)`;
                courseSelect.appendChild(opt);
            });
        }

        // Hocalar
        const instSelect = document.getElementById('slotInstructor');
        if (instSelect) {
            instSelect.innerHTML = '<option value="">-- Öğretim Görevlisi Seçiniz --</option>';
            this.initialData.instructors.forEach(inst => {
                const opt = document.createElement('option');
                opt.value = inst.id;
                opt.dataset.name = `${inst.title || ''} ${inst.name}`;
                opt.textContent = `${inst.title || ''} ${inst.name} (${inst.department_name || ''})`;
                instSelect.appendChild(opt);
            });
        }
    }

    initGrid() {
        this.grid = new ScheduleGrid('scheduleGridWrapper');
        // İskelet tabloyu sayfa yüklenir yüklenmez anında çiz
        this.grid.render([]);

        // Hucre secildiginde tetiklenir
        this.grid.onSelectionChange = (range) => {
            this.selectedRange = range;
            if (range) {
                this.selectionText.innerHTML = `<strong>${range.day}</strong> günü <strong>${range.startTime} - ${range.endTime}</strong> saatleri (${range.hourCount} Ders Saati) seçildi.`;
                this.btnOpenModal.style.display = 'inline-flex';
                this.btnOpenModal.classList.add('pulse-anim');
            } else {
                this.selectionText.innerHTML = `Tabloda ders atamak istediğiniz saat hücrelerini tıklayıp sürükleyerek seçebilirsiniz.`;
                this.btnOpenModal.style.display = 'none';
            }
        };

        // Cift tiklandiginda dogrudan modal ac
        this.grid.onCellDoubleClick = (range) => {
            this.selectedRange = range;
            this.openAddModal();
        };

        // Ders silme
        this.grid.onSlotDelete = async (slotId) => {
            if (confirm('Bu dersi haftalık programdan kaldırmak istediğinizden emin misiniz?')) {
                const res = await apiRequest('delete_slot', 'POST', { slot_id: slotId });
                if (res && res.success) {
                    this.showToast('Ders programdan kaldırıldı.', 'success');
                    await this.loadSchedule();
                } else {
                    this.showToast(res ? res.message : 'Silme başarısız', 'danger');
                }
            }
        };
    }

    async loadSchedule() {
        const deptId = (this.currentDepartment && this.currentDepartment.id) ? this.currentDepartment.id : (this.currentUser.department_id || 1);
        const res = await apiRequest(`get_schedule&department_id=${deptId}&grade_level=${this.currentGradeLevel}`);
        if (res && res.success && res.data) {
            this.scheduleSlots = (res.data && res.data.slots) ? res.data.slots : (Array.isArray(res.data) ? res.data : []);
            this.grid.render(this.scheduleSlots);
        }
    }

    initEventListeners() {
        // Modal Ac / Kapa
        if (this.btnOpenModal) {
            this.btnOpenModal.addEventListener('click', () => this.openAddModal());
        }

        const btnCloseModal = document.getElementById('btnCloseModal');
        const btnCancelModal = document.getElementById('btnCancelModal');
        if (btnCloseModal) btnCloseModal.addEventListener('click', () => this.closeAddModal());
        if (btnCancelModal) btnCancelModal.addEventListener('click', () => this.closeAddModal());

        // Sinif Seviyesi Filtreleri (Tumu, 1, 2, 3, 4)
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentGradeLevel = parseInt(btn.getAttribute('data-grade'));
                await this.loadSchedule();
            });
        });

        // Form Ici Olaylar
        const courseSelect = document.getElementById('slotCourseSelect');
        if (courseSelect) {
            courseSelect.addEventListener('change', () => {
                const opt = courseSelect.options[courseSelect.selectedIndex];
                if (opt && opt.value) {
                    document.getElementById('slotCourseCode').value = opt.dataset.code || '';
                    document.getElementById('slotCourseName').value = opt.dataset.name || '';
                    if (opt.dataset.grade) {
                        document.getElementById('slotGradeLevel').value = opt.dataset.grade;
                    }
                }
            });
        }

        // Derslik veya hoca degistiginde gercek zamanli cakisma kontrolu
        const roomSelect = document.getElementById('slotClassroom');
        const instSelect = document.getElementById('slotInstructor');

        const triggerConflictCheck = async () => {
            if (!this.selectedRange) return;
            const cId = roomSelect.value;
            const iId = instSelect.value;

            if (cId) {
                await window.conflictChecker.check({
                    classroomId: cId,
                    instructorId: iId,
                    dayName: this.selectedRange.day,
                    startHourIndex: this.selectedRange.startHour,
                    endHourIndex: this.selectedRange.endHour
                });
            } else {
                window.conflictChecker.clearAlert();
            }
        };

        if (roomSelect) roomSelect.addEventListener('change', triggerConflictCheck);
        if (instSelect) instSelect.addEventListener('change', triggerConflictCheck);

        // Kaydet Form Submit
        const form = document.getElementById('addCourseForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSaveSlot();
            });
        }

        // Cikis Butonu
        const btnLogout = document.getElementById('btnLogout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                sessionStorage.removeItem('29m_user');
                window.location.href = 'login.html';
            });
        }

        // Excel / XLSX Dışa Aktar Butonu
        const btnExport = document.getElementById('btnExportExcel');
        if (btnExport) {
            btnExport.addEventListener('click', () => this.exportScheduleToExcel());
        }

        // Yalnızca Program Tablosunu Temiz Yazdır / PDF
        const btnPrint = document.getElementById('btnPrintSchedule');
        if (btnPrint) {
            btnPrint.addEventListener('click', () => {
                const currentSlots = (this.currentGradeLevel > 0)
                    ? this.scheduleSlots.filter(s => s.grade_level === this.currentGradeLevel)
                    : this.scheduleSlots;
                this.printCleanSchedule(currentSlots);
            });
        }

        // Koordinatör Kampüs Doluluk Modalı
        const btnCoordOcc = document.getElementById('btnOpenCoordOccupancy');
        if (btnCoordOcc) {
            btnCoordOcc.addEventListener('click', () => this.openCoordinatorOccupancy());
        }

        const coordDay = document.getElementById('coordMatrixDay');
        const coordBld = document.getElementById('coordMatrixBuilding');
        if (coordDay) coordDay.addEventListener('change', () => this.renderCoordOccupancyMatrix());
        if (coordBld) coordBld.addEventListener('change', () => this.renderCoordOccupancyMatrix());

        // Ders ve Hoca Havuzu Modalı
        const btnPool = document.getElementById('btnOpenPoolModal');
        if (btnPool) {
            btnPool.addEventListener('click', () => this.openPoolModal());
        }

        // Hocalara Program Gönder Modalı
        const btnSend = document.getElementById('btnOpenSendModal');
        if (btnSend) {
            btnSend.addEventListener('click', () => this.openSendModal());
        }

        const sendTarget = document.getElementById('sendTargetSelect');
        if (sendTarget) {
            sendTarget.addEventListener('change', () => this.updateSendPreview());
        }

        // Hoca Kişisel Programı Ön İzleme Butonları
        const btnOpenPreview = document.getElementById('btnOpenInstPreview');
        if (btnOpenPreview) {
            btnOpenPreview.addEventListener('click', () => {
                const val = document.getElementById('sendTargetSelect').value;
                this.openInstructorPreviewModal(val !== 'all' ? val : null);
            });
        }

        const btnOpenPreviewDirect = document.getElementById('btnOpenInstPreviewDirect');
        if (btnOpenPreviewDirect) {
            btnOpenPreviewDirect.addEventListener('click', () => {
                const val = document.getElementById('sendTargetSelect').value;
                this.openInstructorPreviewModal(val !== 'all' ? val : null);
            });
        }

        const previewInstSelect = document.getElementById('previewInstSelect');
        if (previewInstSelect) {
            previewInstSelect.addEventListener('change', (e) => {
                this.renderInstructorPreview(e.target.value);
            });
        }

        const btnInstPdf = document.getElementById('btnInstPreviewPdf');
        if (btnInstPdf) {
            btnInstPdf.addEventListener('click', () => this.printCurrentPreviewInstructor());
        }

        const btnInstXlsx = document.getElementById('btnInstPreviewXlsx');
        if (btnInstXlsx) {
            btnInstXlsx.addEventListener('click', () => this.exportCurrentPreviewInstructorXlsx());
        }

        const btnInstSendSingle = document.getElementById('btnInstPreviewSendSingle');
        if (btnInstSendSingle) {
            btnInstSendSingle.addEventListener('click', () => this.sendCurrentPreviewInstructorEmail());
        }
    }

    openAddModal() {
        if (!this.selectedRange) {
            this.showToast('Lütfen önce haftalık tablodan birleştirilecek saat aralığını seçiniz.', 'warning');
            return;
        }

        document.getElementById('modalSelectedDay').textContent = this.selectedRange.day;
        document.getElementById('modalSelectedTime').textContent = `${this.selectedRange.startTime} - ${this.selectedRange.endTime} (${this.selectedRange.hourCount} Saat)`;

        // Form alanlarini sifirla
        document.getElementById('slotCourseSelect').value = '';
        document.getElementById('slotCourseCode').value = '';
        document.getElementById('slotCourseName').value = '';
        document.getElementById('slotClassroom').value = '';
        document.getElementById('slotInstructor').value = '';

        window.conflictChecker.clearAlert();
        this.modal.classList.add('active');
    }

    closeAddModal() {
        this.modal.classList.remove('active');
        window.conflictChecker.clearAlert();
    }

    async handleSaveSlot() {
        if (!this.selectedRange) return;

        const courseCode = document.getElementById('slotCourseCode').value.trim();
        const courseName = document.getElementById('slotCourseName').value.trim();
        const gradeLevel = parseInt(document.getElementById('slotGradeLevel').value);
        const classroomId = parseInt(document.getElementById('slotClassroom').value);
        const instructorSelect = document.getElementById('slotInstructor');
        const instructorName = instructorSelect.selectedIndex > 0 ? instructorSelect.options[instructorSelect.selectedIndex].text : '';
        const colorTag = document.getElementById('slotColorTag').value;

        if (!courseName) {
            this.showToast('Lütfen ders adını giriniz.', 'warning');
            return;
        }
        if (!classroomId) {
            this.showToast('Lütfen bir derslik seçiniz.', 'warning');
            return;
        }

        const selectedRoomObj = this.initialData.classrooms.find(c => c.id == classroomId);
        const classroomCode = selectedRoomObj ? selectedRoomObj.code : 'Derslik';

        const payload = {
            department_id: this.currentDepartment.id,
            grade_level: gradeLevel,
            course_name: courseName,
            course_code: courseCode,
            instructor_name: instructorName,
            classroom_id: classroomId,
            classroom_code: classroomCode,
            day_name: this.selectedRange.day,
            start_hour_index: this.selectedRange.startHour,
            end_hour_index: this.selectedRange.endHour,
            start_time: this.selectedRange.startTime,
            end_time: this.selectedRange.endTime,
            color_tag: colorTag
        };

        const res = await apiRequest('save_slot', 'POST', payload);
        if (res && res.success) {
            this.showToast('Hücreler birleştirildi ve ders başarıyla atandı!', 'success');
            this.closeAddModal();
            this.grid.clearSelection();
            await this.loadSchedule();
        } else {
            this.showToast(res ? res.message : 'Ders kaydedilemedi.', 'danger');
        }
    }

    exportScheduleToExcel(isInstructorMode = false, targetInstructor = null) {
        if (typeof XLSX === 'undefined') {
            this.showToast('Excel kütüphanesi yüklenemedi. Sayfayı yenileyiniz.', 'danger');
            return;
        }

        const facultyName = this.currentFaculty ? this.currentFaculty.name : "İlahiyat Fakültesi";
        const deptName = this.currentDepartment ? this.currentDepartment.name : "Temel İslam Bilimleri";
        
        let slots = this.scheduleSlots || [];
        let subTitle = "2025-2026 Eğitim-Öğretim Yılı Bahar Yarıyılı";
        let detailTitle = "Tüm Sınıflar Haftalık Ders Programı";
        let cleanFileName = `${deptName}_Haftalik_Ders_Programi.xlsx`;

        if (isInstructorMode && targetInstructor) {
            slots = this.scheduleSlots.filter(s => s.instructor_name && s.instructor_name.includes(targetInstructor.name));
            detailTitle = `Öğretim Elemanı: ${targetInstructor.title || ''} ${targetInstructor.name}`;
            cleanFileName = `${(targetInstructor.name || 'Hoca').replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ]/g, '_')}_Kisisel_Ders_Programi.xlsx`;
        } else if (this.currentGradeLevel > 0) {
            slots = this.scheduleSlots.filter(s => s.grade_level === this.currentGradeLevel);
            detailTitle = `${this.currentGradeLevel}. Sınıf Haftalık Ders Programı`;
            cleanFileName = `${deptName}_${this.currentGradeLevel}_Sinif_Ders_Programi.xlsx`;
        }

        const wb = XLSX.utils.book_new();

        // Üst antet satırları
        const dateStr = new Date().toLocaleDateString('tr-TR') + ' ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const wsData = [
            ["T.C. İSTANBUL 29 MAYIS ÜNİVERSİTESİ", "", "", "", "", "", ""],
            [`${facultyName} / ${deptName}`, "", "", "", "", "", ""],
            [`${subTitle} • ${detailTitle}`, "", "", "", "", "", ""],
            [`Oluşturulma Tarihi: ${dateStr}`, "", "", "", "", "", ""],
            ["", "", "", "", "", "", ""],
            ["Saat / Gün", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"]
        ];

        const merges = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
            { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } }
        ];

        // Slot haritası ve kapsanan saat hücreleri
        const slotMap = {};
        const coveredCells = {};
        slots.forEach(slot => {
            const key = `${slot.day_name}-${slot.start_hour_index}`;
            slotMap[key] = slot;
            for (let h = slot.start_hour_index + 1; h <= slot.end_hour_index; h++) {
                coveredCells[`${slot.day_name}-${h}`] = true;
            }
        });

        // Tablo satırlarını oluştur (12 saat dilimi)
        TIME_SLOTS.forEach(timeSlot => {
            const row = [`${timeSlot.index + 1}. Ders\r\n(${timeSlot.start} - ${timeSlot.end})`];

            DAYS_OF_WEEK.forEach((day, dayIndex) => {
                const cellKey = `${day}-${timeSlot.index}`;
                const colIndex = dayIndex + 1;
                const rowIndex = 6 + timeSlot.index;

                if (coveredCells[cellKey]) {
                    row.push("");
                    return;
                }

                if (slotMap[cellKey]) {
                    const slot = slotMap[cellKey];
                    const rowSpan = (slot.end_hour_index - slot.start_hour_index) + 1;
                    
                    let cellText = `${slot.course_code || ''} - ${slot.course_name || ''}\r\n📍 Derslik: ${slot.classroom_code || ''}`;
                    if (!isInstructorMode) {
                        cellText += `\r\n👨‍🏫 ${slot.instructor_name || ''}`;
                    }
                    cellText += `\r\n🎓 ${slot.grade_level}. Sınıf (${slot.start_time} - ${slot.end_time})`;

                    row.push(cellText);

                    if (rowSpan > 1) {
                        merges.push({
                            s: { r: rowIndex, c: colIndex },
                            e: { r: rowIndex + rowSpan - 1, c: colIndex }
                        });
                    }
                } else {
                    row.push("");
                }
            });

            wsData.push(row);
        });

        // İmza satırı
        wsData.push(["", "", "", "", "", "", ""]);
        wsData.push(["Hazırlayan / Program Koordinatörü\r\nİmza / Tarih", "", "", "", "Bölüm Başkanı / Dekan\r\nMühür / Onay", "", ""]);
        merges.push({ s: { r: wsData.length - 1, c: 0 }, e: { r: wsData.length - 1, c: 2 } });
        merges.push({ s: { r: wsData.length - 1, c: 4 }, e: { r: wsData.length - 1, c: 6 } });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!merges'] = merges;

        // Kolon genişlikleri
        ws['!cols'] = [
            { wch: 22 }, // Saat / Gün
            { wch: 34 }, // Pazartesi
            { wch: 34 }, // Salı
            { wch: 34 }, // Çarşamba
            { wch: 34 }, // Perşembe
            { wch: 34 }, // Cuma
            { wch: 34 }  // Cumartesi
        ];

        // Satır yükseklikleri
        const rowHeights = [
            { hpt: 26 },
            { hpt: 22 },
            { hpt: 20 },
            { hpt: 16 },
            { hpt: 10 },
            { hpt: 26 }
        ];
        for (let i = 0; i < TIME_SLOTS.length; i++) {
            rowHeights.push({ hpt: 52 });
        }
        rowHeights.push({ hpt: 14 });
        rowHeights.push({ hpt: 38 });
        ws['!rows'] = rowHeights;

        // Tüm hücreler için ortalama ve metin kaydırma stili
        if (ws['!ref']) {
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const addr = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
                    if (!ws[addr].s) ws[addr].s = {};
                    ws[addr].s.alignment = {
                        vertical: 'center',
                        horizontal: 'center',
                        wrapText: true
                    };
                }
            }
        }

        XLSX.utils.book_append_sheet(wb, ws, "Ders_Programi");
        XLSX.writeFile(wb, cleanFileName);
        this.showToast(`Excel (.xlsx) dosyası indirildi: ${cleanFileName}`, 'success');
    }

    printCleanSchedule(slots, options = {}) {
        const facultyName = options.facultyName || (this.currentFaculty ? this.currentFaculty.name : "İlahiyat Fakültesi");
        const deptName = options.departmentName || (this.currentDepartment ? this.currentDepartment.name : "Temel İslam Bilimleri Bölümü");
        const subtitle = options.subtitle || "2025-2026 Eğitim-Öğretim Yılı Bahar Yarıyılı";
        const filterLabel = options.filterLabel || (this.currentGradeLevel === 0 ? "Tüm Sınıflar Haftalık Ders Programı" : `${this.currentGradeLevel}. Sınıf Haftalık Ders Programı`);
        const isInstructor = options.isInstructor || false;
        const instructorName = options.instructorName || "";
        const instructorEmail = options.instructorEmail || "";

        const slotMap = {};
        const coveredCells = {};
        (slots || []).forEach(slot => {
            const key = `${slot.day_name}-${slot.start_hour_index}`;
            slotMap[key] = slot;
            for (let h = slot.start_hour_index + 1; h <= slot.end_hour_index; h++) {
                coveredCells[`${slot.day_name}-${h}`] = true;
            }
        });

        let tableRowsHtml = '';
        TIME_SLOTS.forEach(timeSlot => {
            tableRowsHtml += '<tr>';
            tableRowsHtml += `
                <td class="time-col-cell">
                    <div class="slot-num">${timeSlot.index + 1}. Ders</div>
                    <div class="slot-time">${timeSlot.start} - ${timeSlot.end}</div>
                </td>
            `;

            DAYS_OF_WEEK.forEach(day => {
                const cellKey = `${day}-${timeSlot.index}`;
                if (coveredCells[cellKey]) return;

                if (slotMap[cellKey]) {
                    const slot = slotMap[cellKey];
                    const rowSpan = (slot.end_hour_index - slot.start_hour_index) + 1;
                    tableRowsHtml += `
                        <td class="occupied-cell" rowspan="${rowSpan}">
                            <div class="cell-course-code">${slot.course_code || 'DERS'}</div>
                            <div class="cell-course-name">${slot.course_name || ''}</div>
                            <div class="cell-room">📍 ${slot.classroom_code || ''}</div>
                            ${!isInstructor ? `<div class="cell-inst">👨‍🏫 ${slot.instructor_name || ''}</div>` : ''}
                            <div class="cell-grade">🎓 ${slot.grade_level}. Sınıf (${slot.start_time} - ${slot.end_time})</div>
                        </td>
                    `;
                } else {
                    tableRowsHtml += `<td class="empty-cell"></td>`;
                }
            });

            tableRowsHtml += '</tr>';
        });

        const printHtml = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>${facultyName} - ${deptName} Ders Programı</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 6mm 8mm 6mm 8mm;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body {
            background: #ffffff;
            color: #0f172a;
            padding: 2px;
            font-size: 10px;
        }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #8B2332;
            padding-bottom: 6px;
            margin-bottom: 6px;
        }
        .header-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .logo-box {
            width: 42px;
            height: 42px;
            border-radius: 6px;
            background: #8B2332;
            color: #ffffff;
            font-weight: 800;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            letter-spacing: -1px;
        }
        .header-titles h1 {
            font-size: 13.5px;
            font-weight: 700;
            color: #1B2A4A;
            margin: 0;
            line-height: 1.2;
        }
        .header-titles h2 {
            font-size: 11.5px;
            font-weight: 600;
            color: #8B2332;
            margin: 2px 0 0 0;
            line-height: 1.2;
        }
        .header-titles .meta-sub {
            font-size: 9px;
            color: #475569;
            margin-top: 2px;
        }
        .header-right {
            text-align: right;
        }
        .badge-pill {
            display: inline-block;
            background: #F1F5F9;
            border: 1px solid #CBD5E1;
            color: #1E293B;
            font-size: 9.5px;
            font-weight: 600;
            padding: 3px 8px;
            border-radius: 4px;
        }
        .date-str {
            font-size: 8.5px;
            color: #64748B;
            margin-top: 3px;
        }
        table.print-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        table.print-table th, table.print-table td {
            border: 1px solid #CBD5E1;
            text-align: center;
            vertical-align: middle;
        }
        table.print-table th {
            background: #1B2A4A !important;
            color: #ffffff !important;
            font-size: 9.5px;
            font-weight: 600;
            padding: 4px 2px;
            height: 22px;
        }
        table.print-table th.time-head {
            width: 72px;
            background: #0f172a !important;
        }
        td.time-col-cell {
            background: #F8FAFC !important;
            padding: 2px;
            width: 72px;
        }
        .slot-num {
            font-weight: 700;
            font-size: 9px;
            color: #334155;
        }
        .slot-time {
            font-size: 8px;
            color: #64748B;
            white-space: nowrap;
        }
        td.empty-cell {
            background: #FFFFFF;
            height: 34px;
        }
        td.occupied-cell {
            background: #F8FAFC !important;
            border: 1.5px solid #8B2332 !important;
            padding: 2px 4px;
            line-height: 1.25;
        }
        .cell-course-code {
            font-weight: 700;
            font-size: 9.5px;
            color: #8B2332;
        }
        .cell-course-name {
            font-weight: 600;
            font-size: 8.5px;
            color: #0F172A;
            margin: 1px 0;
            word-wrap: break-word;
        }
        .cell-room {
            font-size: 8px;
            color: #1E293B;
            font-weight: 600;
        }
        .cell-inst {
            font-size: 7.5px;
            color: #475569;
        }
        .cell-grade {
            font-size: 7.5px;
            color: #475569;
            display: inline-block;
            background: #E2E8F0;
            padding: 1px 4px;
            border-radius: 2px;
            margin-top: 1px;
        }
        .footer-bar {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 8px;
            padding-top: 4px;
            border-top: 1px solid #E2E8F0;
            font-size: 8px;
            color: #64748B;
        }
        .signatures {
            display: flex;
            gap: 40px;
        }
        .sign-box {
            text-align: center;
            width: 140px;
        }
        .sign-title {
            font-weight: 600;
            color: #334155;
            margin-bottom: 22px;
        }
        .sign-line {
            border-top: 1px dashed #94A3B8;
            padding-top: 2px;
            color: #94A3B8;
            font-size: 8px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <div class="logo-box">29M</div>
            <div class="header-titles">
                <h1>T.C. İSTANBUL 29 MAYIS ÜNİVERSİTESİ</h1>
                <h2>${facultyName} / ${deptName}</h2>
                <div class="meta-sub">${subtitle} • ${filterLabel}</div>
            </div>
        </div>
        <div class="header-right">
            ${isInstructor ? `
                <div class="badge-pill">👨‍🏫 ${instructorName}</div>
                <div class="date-str">${instructorEmail ? '✉️ ' + instructorEmail + ' • ' : ''}Tarih: ${new Date().toLocaleDateString('tr-TR')}</div>
            ` : `
                <div class="badge-pill">🏛️ Ders Programı Koordinatörlüğü</div>
                <div class="date-str">Tarih: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})}</div>
            `}
        </div>
    </div>

    <table class="print-table">
        <thead>
            <tr>
                <th class="time-head">Saat / Gün</th>
                ${DAYS_OF_WEEK.map(d => `<th>${d}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${tableRowsHtml}
        </tbody>
    </table>

    <div class="footer-bar">
        <div>
            Bu program çizelgesi İstanbul 29 Mayıs Üniversitesi Akademik Planlama Sistemi tarafından üretilmiştir.
        </div>
        <div class="signatures">
            <div class="sign-box">
                <div class="sign-title">Hazırlayan / Koordinatör</div>
                <div class="sign-line">İmza / Tarih</div>
            </div>
            <div class="sign-box">
                <div class="sign-title">Bölüm Başkanı / Dekan</div>
                <div class="sign-line">Mühür / Onay</div>
            </div>
        </div>
    </div>
</body>
</html>`;

        let printFrame = document.getElementById('cleanPrintIframe');
        if (printFrame) {
            printFrame.remove();
        }
        printFrame = document.createElement('iframe');
        printFrame.id = 'cleanPrintIframe';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);

        const doc = printFrame.contentWindow.document;
        doc.open();
        doc.write(printHtml);
        doc.close();

        setTimeout(() => {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
            setTimeout(() => {
                if (printFrame && printFrame.parentNode) {
                    printFrame.parentNode.removeChild(printFrame);
                }
            }, 3000);
        }, 400);
    }

    // =============================================================
    // KOORDİNATÖR KAMPÜS DOLULUK MATRİSİ
    // =============================================================
    async openCoordinatorOccupancy() {
        document.getElementById('coordOccupancyModal').classList.add('active');
        // Modal açılır açılmaz beklemeden hemen çiz
        this.renderCoordOccupancyMatrix();
        await this.loadCoordOccupancyMatrix();
    }

    async loadCoordOccupancyMatrix() {
        const res = await apiRequest('get_all_occupancy');
        if (res && res.success && res.data) {
            this.allOccupancySlots = res.data.slots || [];
            this.renderCoordOccupancyMatrix();
        }
    }

    renderCoordOccupancyMatrix() {
        const container = document.getElementById('coordOccupancyContainer');
        if (!container) return;
        const dayEl = document.getElementById('coordMatrixDay');
        const bldEl = document.getElementById('coordMatrixBuilding');
        const day = dayEl ? dayEl.value : 'Pazartesi';
        const bld = bldEl ? bldEl.value : '';

        let rooms = (this.initialData && this.initialData.classrooms) ? this.initialData.classrooms : [];
        if (bld) rooms = rooms.filter(r => r.building === bld);

        let html = `
            <div class="table-scroll-container">
                <table class="excel-schedule-table">
                    <thead>
                        <tr>
                            <th style="width: 140px; position: sticky; left:0; z-index: 25; background: #071520;">Derslik / Saat</th>
                            ${TIME_SLOTS.map(t => `<th style="font-size: 0.78rem;">${t.start}<br><small style="color:var(--gold);">${t.end}</small></th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;

        rooms.forEach(r => {
            html += `<tr>`;
            html += `
                <td class="time-cell" style="text-align: left; padding: 0.5rem 0.75rem;">
                    <strong>${r.code}</strong>
                    <div style="font-size: 0.7rem; color: var(--text-muted);">${r.building} (${r.capacity} Kişi)</div>
                </td>
            `;

            TIME_SLOTS.forEach(time => {
                const match = (this.allOccupancySlots || []).find(s => 
                    s.classroom_id == r.id && 
                    s.day_name === day && 
                    s.start_hour_index <= time.index && 
                    s.end_hour_index >= time.index
                );

                if (match) {
                    const deptObj = (this.initialData && this.initialData.departments) ? this.initialData.departments.find(d => d.id == match.department_id) : null;
                    const deptTitle = match.department_name || (deptObj ? deptObj.name : '29 Mayıs Üniversitesi');
                    html += `
                        <td style="background: rgba(123, 17, 35, 0.08); border: 1px solid var(--surface-border); padding: 0.35rem; vertical-align: top;">
                            <div style="border-left: 3px solid #7B1123; padding-left: 0.35rem; font-size: 0.72rem;">
                                <strong style="color: #7B1123; display:block;">${match.course_code || match.course_name}</strong>
                                <span style="font-size: 0.68rem; color: var(--navy); display:block;">${deptTitle}</span>
                                <span style="font-size: 0.65rem; color: var(--text-muted); display:block;">👨‍🏫 ${match.instructor_name}</span>
                            </div>
                        </td>
                    `;
                } else {
                    html += `
                        <td style="background: #F0FDF4; border: 1px solid var(--surface-border); text-align: center; color: #15803D; font-size: 0.72rem; font-weight: 600;">
                            BOŞ
                        </td>
                    `;
                }
            });

            html += `</tr>`;
        });

        html += `</tbody></table></div>`;
        container.innerHTML = html;
    }

    // =============================================================
    // DERS VE HOCA HAVUZU YÖNETİMİ
    // =============================================================
    openPoolModal() {
        document.getElementById('poolModal').classList.add('active');
        this.switchPoolTab('courses');
    }

    switchPoolTab(tab) {
        const btnC = document.getElementById('tabBtnCourses');
        const btnI = document.getElementById('tabBtnInstructors');
        const secC = document.getElementById('poolSectionCourses');
        const secI = document.getElementById('poolSectionInstructors');

        if (tab === 'courses') {
            btnC.classList.add('active');
            btnI.classList.remove('active');
            secC.style.display = 'block';
            secI.style.display = 'none';
            this.renderPoolCourses();
        } else {
            btnC.classList.remove('active');
            btnI.classList.add('active');
            secC.style.display = 'none';
            secI.style.display = 'block';
            this.renderPoolInstructors();
        }
    }

    renderPoolCourses() {
        const tbody = document.getElementById('poolCoursesTableBody');
        const countEl = document.getElementById('deptCourseCount');
        const deptCourses = this.initialData.courses.filter(c => c.department_id == this.currentDepartment.id);
        if (countEl) countEl.textContent = deptCourses.length;

        if (deptCourses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 1.5rem; color: var(--text-muted);">Henüz tanımlı ders yok. Yukarıdan ekleyebilirsiniz.</td></tr>';
            return;
        }

        tbody.innerHTML = deptCourses.map(c => `
            <tr>
                <td><strong style="color: var(--primary); font-family: var(--font-mono);">${c.code}</strong></td>
                <td>${c.name}</td>
                <td><span class="grade-badge">${c.grade_level}. Sınıf</span></td>
                <td>${c.weekly_hours || 3} Saat / Hafta</td>
                <td style="text-align: right;">
                    <button type="button" class="btn btn-danger btn-sm" onclick="window.app.deletePoolCourse(${c.id})">🗑️ Sil</button>
                </td>
            </tr>
        `).join('');
    }

    openAddCourseForm() {
        const f = document.getElementById('courseAddFormContainer');
        f.style.display = f.style.display === 'none' ? 'block' : 'none';
    }

    async saveNewCourse() {
        const code = document.getElementById('newPoolCourseCode').value.trim();
        const name = document.getElementById('newPoolCourseName').value.trim();
        const grade = parseInt(document.getElementById('newPoolCourseGrade').value);

        if (!code || !name) {
            this.showToast('Lütfen ders kodu ve adını doldurunuz.', 'warning');
            return;
        }

        const res = await apiRequest('save_course', 'POST', {
            department_id: this.currentDepartment.id,
            code: code,
            name: name,
            grade_level: grade,
            weekly_hours: 3
        });

        if (res && res.success) {
            this.showToast('Yeni ders havuza eklendi.', 'success');
            document.getElementById('courseAddFormContainer').style.display = 'none';
            document.getElementById('newPoolCourseCode').value = '';
            document.getElementById('newPoolCourseName').value = '';
            await this.loadInitialData();
            this.populateModalSelects();
            this.renderPoolCourses();
        } else {
            this.showToast(res ? res.message : 'Kayıt başarısız.', 'danger');
        }
    }

    async deletePoolCourse(id) {
        if (confirm('Bu dersi havuzdan silmek istediğinizden emin misiniz?')) {
            const res = await apiRequest('delete_course', 'POST', { id: id });
            if (res && res.success) {
                this.showToast('Ders silindi.', 'success');
                await this.loadInitialData();
                this.populateModalSelects();
                this.renderPoolCourses();
            }
        }
    }

    renderPoolInstructors() {
        const tbody = document.getElementById('poolInstructorsTableBody');
        const countEl = document.getElementById('deptInstCount');
        const deptInsts = this.initialData.instructors.filter(i => i.department_id == this.currentDepartment.id);
        if (countEl) countEl.textContent = deptInsts.length;

        if (deptInsts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 1.5rem; color: var(--text-muted);">Henüz tanımlı öğretim elemanı yok.</td></tr>';
            return;
        }

        tbody.innerHTML = deptInsts.map(i => `
            <tr>
                <td><strong>${i.title || 'Dr. Öğr. Üyesi'}</strong></td>
                <td>${i.name}</td>
                <td style="color: var(--navy); font-size: 0.85rem;">${i.email || (i.name.toLowerCase().replace(/ /g,'') + '@29mayis.edu.tr')}</td>
                <td style="text-align: right;">
                    <button type="button" class="btn btn-danger btn-sm" onclick="window.app.deletePoolInstructor(${i.id})">🗑️ Sil</button>
                </td>
            </tr>
        `).join('');
    }

    openAddInstructorForm() {
        const f = document.getElementById('instAddFormContainer');
        f.style.display = f.style.display === 'none' ? 'block' : 'none';
    }

    async saveNewInstructor() {
        const title = document.getElementById('newPoolInstTitle').value;
        const name = document.getElementById('newPoolInstName').value.trim();
        const email = document.getElementById('newPoolInstEmail').value.trim();

        if (!name) {
            this.showToast('Lütfen öğretim elemanı adını giriniz.', 'warning');
            return;
        }

        const res = await apiRequest('save_instructor', 'POST', {
            department_id: this.currentDepartment.id,
            title: title,
            name: name,
            email: email
        });

        if (res && res.success) {
            this.showToast('Yeni öğretim üyesi havuza eklendi.', 'success');
            document.getElementById('instAddFormContainer').style.display = 'none';
            document.getElementById('newPoolInstName').value = '';
            document.getElementById('newPoolInstEmail').value = '';
            await this.loadInitialData();
            this.populateModalSelects();
            this.renderPoolInstructors();
        } else {
            this.showToast(res ? res.message : 'Kayıt başarısız.', 'danger');
        }
    }

    async deletePoolInstructor(id) {
        if (confirm('Bu öğretim üyesini havuzdan silmek istediğinizden emin misiniz?')) {
            const res = await apiRequest('delete_instructor', 'POST', { id: id });
            if (res && res.success) {
                this.showToast('Öğretim üyesi silindi.', 'success');
                await this.loadInitialData();
                this.populateModalSelects();
                this.renderPoolInstructors();
            }
        }
    }

    // =============================================================
    // HOCALARA E-POSTA İLE PROGRAM GÖNDERME
    // =============================================================
    openSendModal() {
        const select = document.getElementById('sendTargetSelect');
        const deptInsts = this.initialData.instructors.filter(i => i.department_id == this.currentDepartment.id);

        select.innerHTML = '<option value="all">📢 Tüm Bölüm Hocalarına Toplu Gönder (Kişisel Programları ile)</option>';
        deptInsts.forEach(i => {
            const opt = document.createElement('option');
            opt.value = i.id;
            opt.textContent = `👤 ${i.title || ''} ${i.name} (${i.email || 'e-posta'})`;
            select.appendChild(opt);
        });

        document.getElementById('sendSuccessBox').style.display = 'none';
        document.getElementById('sendScheduleModal').classList.add('active');
        this.updateSendPreview();
    }

    updateSendPreview() {
        const val = document.getElementById('sendTargetSelect').value;
        const titleEl = document.getElementById('sendPreviewTitle');
        const contentEl = document.getElementById('sendPreviewContent');
        const deptInsts = this.initialData.instructors.filter(i => i.department_id == this.currentDepartment.id);

        if (val === 'all') {
            titleEl.textContent = `Önizleme: Tüm Bölüm Hocaları (${deptInsts.length} Kişi)`;
            let preview = `<strong>Sayın Bölüm Öğretim Elemanları,</strong><br>${this.currentDepartment.name} haftalık ders programı hazırlanmıştır. Aşağıdaki listede her hocamızın haftalık ders yükü ve atanmış derslikleri bulunmaktadır:<br><br>`;

            deptInsts.forEach(inst => {
                const mySlots = this.scheduleSlots.filter(s => s.instructor_name && s.instructor_name.includes(inst.name));
                preview += `<strong>• ${inst.title || ''} ${inst.name}:</strong> ${mySlots.length} Ders Bloğu<br>`;
                if (mySlots.length > 0) {
                    mySlots.forEach(s => {
                        preview += `&nbsp;&nbsp;&nbsp;↳ <em>${s.day_name} ${s.start_time}-${s.end_time}:</em> ${s.course_code} - ${s.course_name} (${s.classroom_code})<br>`;
                    });
                } else {
                    preview += `&nbsp;&nbsp;&nbsp;↳ <em>Bu dönem atanmış dersi bulunmamaktadır.</em><br>`;
                }
            });

            contentEl.innerHTML = preview;
        } else {
            const inst = deptInsts.find(i => i.id == val);
            const mySlots = this.scheduleSlots.filter(s => s.instructor_name && s.instructor_name.includes(inst ? inst.name : ''));
            titleEl.textContent = `Önizleme: ${inst ? inst.title + ' ' + inst.name : 'Hoca'}`;

            let preview = `<strong>Sayın ${inst ? inst.title + ' ' + inst.name : ''},</strong><br><br>${this.currentDepartment.name} ${this.currentFaculty ? this.currentFaculty.name : ''} bünyesinde 2025-2026 akademik yılı haftalık ders programınız aşağıda bilgilerinize sunulmuştur:<br><br>`;
            if (mySlots.length > 0) {
                mySlots.forEach(s => {
                    preview += `📅 <strong>${s.day_name}</strong> | ⏱️ <strong>${s.start_time} - ${s.end_time}</strong><br>`;
                    preview += `&nbsp;&nbsp;&nbsp;📚 Ders: <strong>${s.course_code} - ${s.course_name}</strong> (${s.grade_level}. Sınıf)<br>`;
                    preview += `&nbsp;&nbsp;&nbsp;📍 Derslik: <strong>${s.classroom_code}</strong><br><hr style="border:none;border-top:1px dashed #E2E8F0;margin:0.4rem 0;">`;
                });
            } else {
                preview += `<em>Henüz programda adınıza atanmış bir ders bulunmamaktadır.</em>`;
            }
            contentEl.innerHTML = preview;
        }
    }

    async dispatchScheduleEmail() {
        const val = document.getElementById('sendTargetSelect').value;
        const btn = document.getElementById('btnConfirmSendSchedule');
        const box = document.getElementById('sendSuccessBox');

        btn.disabled = true;
        btn.textContent = 'Gönderiliyor...';

        const res = await apiRequest('send_schedule_email', 'POST', {
            department_id: this.currentDepartment.id,
            instructor_id: val
        });

        if (res && res.success) {
            box.style.display = 'block';
            box.innerHTML = `
                <strong>✅ Kişisel Ders Programları Başarıyla İletildi!</strong><br>
                Haftalık ders programı, her hocamız için <strong>Kişisel PDF Çizelgesi</strong> ve <strong>Excel (.xlsx)</strong> formatında eklenerek kurumsal e-posta adreslerine (@29mayis.edu.tr) güvenle iletilmiştir.<br>
                <span style="display:inline-block;margin-top:4px;font-size:0.8rem;color:#047857;">${res.message || 'Gönderim tamamlandı.'}</span>
            `;
            this.showToast('Kişisel PDF ve XLSX programları hocalara iletildi!', 'success');
        } else {
            this.showToast('Gönderim sırasında hata oluştu.', 'danger');
        }

        btn.disabled = false;
        btn.textContent = '🚀 Programı E-Posta Olarak Gönder (PDF + XLSX Ekli)';
    }

    // =============================================================
    // HOCA KİŞİSEL DERS PROGRAMI ÖN İZLEME VE ÇIKTI MOTORU
    // =============================================================
    openInstructorPreviewModal(targetInstId = null) {
        const select = document.getElementById('previewInstSelect');
        const deptInsts = this.initialData.instructors.filter(i => i.department_id == this.currentDepartment.id);

        select.innerHTML = '';
        deptInsts.forEach(i => {
            const opt = document.createElement('option');
            opt.value = i.id;
            opt.textContent = `👤 ${i.title || ''} ${i.name} (${i.email || 'e-posta'})`;
            select.appendChild(opt);
        });

        let chosenId = targetInstId;
        if (!chosenId && deptInsts.length > 0) {
            chosenId = deptInsts[0].id;
        }
        if (chosenId) {
            select.value = chosenId;
        }

        this.renderInstructorPreview(select.value);
        document.getElementById('instructorPreviewModal').classList.add('active');
    }

    renderInstructorPreview(instId) {
        const deptInsts = this.initialData.instructors.filter(i => i.department_id == this.currentDepartment.id);
        const inst = deptInsts.find(i => i.id == instId) || deptInsts[0];
        if (!inst) return;

        this.currentPreviewInstructor = inst;

        // Hocanın kendi ders slotlarını süz
        const mySlots = this.scheduleSlots.filter(s => s.instructor_name && s.instructor_name.includes(inst.name));
        const totalHours = mySlots.reduce((sum, s) => sum + ((s.end_hour_index - s.start_hour_index) + 1), 0);

        // Özet rozetlerini doldur
        const badgeEl = document.getElementById('previewInstSummaryBadge');
        if (badgeEl) {
            badgeEl.innerHTML = `
                <span class="badge" style="background:#E2E8F0; color:#1E293B; font-weight:600; padding:0.35rem 0.65rem; border-radius:4px; font-size:0.8rem;">
                    📚 ${mySlots.length} Ders Bloğu
                </span>
                <span class="badge" style="background:#DBEAFE; color:#1E40AF; font-weight:600; padding:0.35rem 0.65rem; border-radius:4px; font-size:0.8rem;">
                    ⏱️ Haftalık ${totalHours} Saat
                </span>
                <span class="badge" style="background:#FEF3C7; color:#92400E; font-weight:600; padding:0.35rem 0.65rem; border-radius:4px; font-size:0.8rem;">
                    📧 ${inst.email || (inst.name.toLowerCase().replace(/\s+/g, '') + '@29mayis.edu.tr')}
                </span>
            `;
        }

        const container = document.getElementById('instructorPreviewGridContainer');
        if (!container) return;

        const slotMap = {};
        const coveredCells = {};
        mySlots.forEach(slot => {
            const key = `${slot.day_name}-${slot.start_hour_index}`;
            slotMap[key] = slot;
            for (let h = slot.start_hour_index + 1; h <= slot.end_hour_index; h++) {
                coveredCells[`${slot.day_name}-${h}`] = true;
            }
        });

        let html = `
            <table class="inst-preview-table">
                <thead>
                    <tr>
                        <th class="time-col">Saat / Gün</th>
                        ${DAYS_OF_WEEK.map(d => `<th>${d}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        TIME_SLOTS.forEach(timeSlot => {
            html += '<tr>';
            html += `
                <td class="inst-time-cell">
                    <div>${timeSlot.index + 1}. Ders</div>
                    <div style="font-size:0.72rem; color:#64748B;">${timeSlot.start} - ${timeSlot.end}</div>
                </td>
            `;

            DAYS_OF_WEEK.forEach(day => {
                const cellKey = `${day}-${timeSlot.index}`;
                if (coveredCells[cellKey]) return;

                if (slotMap[cellKey]) {
                    const s = slotMap[cellKey];
                    const rowSpan = (s.end_hour_index - s.start_hour_index) + 1;
                    html += `
                        <td class="inst-occupied-cell" rowspan="${rowSpan}">
                            <div class="inst-card">
                                <div class="inst-card-code">${s.course_code || 'DERS'}</div>
                                <div class="inst-card-title">${s.course_name}</div>
                                <div style="margin-top: 3px;">
                                    <span class="inst-card-room">📍 ${s.classroom_code}</span>
                                    <span class="inst-card-grade">🎓 ${s.grade_level}. Sınıf</span>
                                </div>
                                <div style="font-size:0.72rem; color:#64748B; margin-top:2px;">
                                    ⏱️ ${s.start_time} - ${s.end_time}
                                </div>
                            </div>
                        </td>
                    `;
                } else {
                    html += `<td class="inst-empty-cell"><span style="opacity:0.35;">—</span></td>`;
                }
            });

            html += '</tr>';
        });

        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }

    printCurrentPreviewInstructor() {
        if (!this.currentPreviewInstructor) return;
        const inst = this.currentPreviewInstructor;
        const mySlots = this.scheduleSlots.filter(s => s.instructor_name && s.instructor_name.includes(inst.name));
        this.printCleanSchedule(mySlots, {
            isInstructor: true,
            instructorName: `${inst.title || ''} ${inst.name}`,
            instructorEmail: inst.email || `${inst.name.toLowerCase().replace(/\s+/g, '')}@29mayis.edu.tr`,
            subtitle: '2025-2026 Eğitim-Öğretim Yılı Bahar Yarıyılı',
            filterLabel: 'Öğretim Elemanı Kişisel Haftalık Ders Programı'
        });
    }

    exportCurrentPreviewInstructorXlsx() {
        if (!this.currentPreviewInstructor) return;
        this.exportScheduleToExcel(true, this.currentPreviewInstructor);
    }

    async sendCurrentPreviewInstructorEmail() {
        if (!this.currentPreviewInstructor) return;
        const inst = this.currentPreviewInstructor;
        const btn = document.getElementById('btnInstPreviewSendSingle');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'İletiliyor...';
        }

        const res = await apiRequest('send_schedule_email', 'POST', {
            department_id: this.currentDepartment.id,
            instructor_id: inst.id
        });

        if (res && res.success) {
            this.showToast(`${inst.title || ''} ${inst.name} için kişisel program (PDF ve XLSX ekli) başarıyla gönderildi!`, 'success');
        } else {
            this.showToast('E-posta gönderiminde hata oluştu.', 'danger');
        }

        if (btn) {
            btn.disabled = false;
            btn.textContent = '✉️ Bu Hocaya E-Posta Gönder';
        }
    }

    showToast(message, type = 'info') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button style="background:none;border:none;cursor:pointer;font-size:1.1rem;" onclick="this.parentElement.remove()">&times;</button>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 4000);
    }
}

// Uygulamayi baslat
window.addEventListener('DOMContentLoaded', () => {
    window.app = new UniversityApp();
});
