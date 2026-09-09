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

        // Excel / CSV Disa Aktar Butonu
        const btnExport = document.getElementById('btnExportExcel');
        if (btnExport) {
            btnExport.addEventListener('click', () => this.exportScheduleToExcel());
        }

        // Yazdir Butonu
        const btnPrint = document.getElementById('btnPrintSchedule');
        if (btnPrint) {
            btnPrint.addEventListener('click', () => window.print());
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

    exportScheduleToExcel() {
        let csvContent = "\uFEFF"; // UTF-8 BOM Turkce karakterler icin
        csvContent += "Saat / Gün;Pazartesi;Salı;Çarşamba;Perşembe;Cuma;Cumartesi\n";

        TIME_SLOTS.forEach(time => {
            let row = [`"${time.start} - ${time.end}"`];
            DAYS_OF_WEEK.forEach(day => {
                const match = this.scheduleSlots.find(s => 
                    s.day_name === day && 
                    s.start_hour_index <= time.index && 
                    s.end_hour_index >= time.index
                );
                if (match) {
                    row.push(`"${match.course_code} - ${match.course_name} (${match.classroom_code} / ${match.instructor_name})"`);
                } else {
                    row.push('""');
                }
            });
            csvContent += row.join(';') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentDepartment.name}_Ders_Programi.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Excel formatında ders programı indirildi.', 'success');
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
                <strong>✅ E-Postalar Başarıyla İletildi!</strong><br>
                ${res.message || 'Öğretim elemanlarının kurumsal mail adreslerine haftalık ders çizelgesi gönderildi.'}
            `;
            this.showToast('Ders programı hocalara iletildi!', 'success');
        } else {
            this.showToast('Gönderim sırasında hata oluştu.', 'danger');
        }

        btn.disabled = false;
        btn.textContent = '🚀 Programı E-Posta Olarak Gönder';
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
