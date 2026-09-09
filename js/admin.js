/**
 * Istanbul 29 Mayis Universitesi - Yonetim Paneli (Admin Suite)
 * Kullanici, Derslik Yonetimi ve Kampus Geneli Doluluk Matrisi
 */

class AdminPanel {
    constructor() {
        this.users = [];
        this.classrooms = [];
        this.faculties = [];
        this.departments = [];
        this.occupancySlots = [];
        this.activeTab = 'users';

        this.init();
    }

    async init() {
        if (!this.checkAdminAuth()) return;
        await this.loadInitialData();
        this.initTabs();
        this.initForms();
        await this.loadUsers();
        await this.loadClassrooms();
    }

    checkAdminAuth() {
        const stored = sessionStorage.getItem('29m_user');
        let user = null;
        try {
            user = stored ? JSON.parse(stored) : null;
        } catch (e) {
            user = null;
        }

        if (!user) {
            window.location.href = 'login.html';
            return false;
        }

        if (user.role !== 'admin') {
            alert('Bu sayfaya sadece Sistem Yöneticileri erişebilir. Lütfen Yönetici hesabı ile giriş yapınız.');
            window.location.href = 'login.html';
            return false;
        }

        const nameEl = document.getElementById('adminName');
        if (nameEl) nameEl.textContent = user.full_name || 'Admin';
        return true;
    }

    async loadInitialData() {
        const res = await apiRequest('get_initial_data');
        if (res && res.success && res.data) {
            this.faculties = res.data.faculties || [];
            this.departments = res.data.departments || [];
            this.populateDropdowns();
        }
    }

    populateDropdowns() {
        const facSelect = document.getElementById('userFaculty');
        const deptSelect = document.getElementById('userDepartment');

        if (facSelect) {
            facSelect.innerHTML = '<option value="">-- Fakülte Seçiniz --</option>';
            this.faculties.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.id;
                opt.textContent = f.name;
                facSelect.appendChild(opt);
            });

            facSelect.addEventListener('change', () => {
                const fId = facSelect.value;
                deptSelect.innerHTML = '<option value="">-- Bölüm Seçiniz --</option>';
                const filteredDepts = this.departments.filter(d => d.faculty_id == fId);
                filteredDepts.forEach(d => {
                    const opt = document.createElement('option');
                    opt.value = d.id;
                    opt.textContent = d.name;
                    deptSelect.appendChild(opt);
                });
            });
        }

        // Admin Ders ve Hoca Havuzu Bölüm Seçimleri
        const courseDeptFilter = document.getElementById('adminCourseDeptFilter');
        const instDeptFilter = document.getElementById('adminInstDeptFilter');
        const modalCourseDept = document.getElementById('adminCourseDept');
        const modalInstDept = document.getElementById('adminInstDept');

        [courseDeptFilter, instDeptFilter].forEach(el => {
            if (el) {
                el.innerHTML = '<option value="">Tüm Bölümler</option>';
                this.departments.forEach(d => {
                    const opt = document.createElement('option');
                    opt.value = d.id;
                    opt.textContent = `${d.name} (${d.faculty_name || ''})`;
                    el.appendChild(opt);
                });
            }
        });

        [modalCourseDept, modalInstDept].forEach(el => {
            if (el) {
                el.innerHTML = '<option value="">-- Bölüm Seçiniz --</option>';
                this.departments.forEach(d => {
                    const opt = document.createElement('option');
                    opt.value = d.id;
                    opt.textContent = `${d.name} (${d.faculty_name || ''})`;
                    el.appendChild(opt);
                });
            }
        });
    }

    initTabs() {
        const tabBtns = document.querySelectorAll('.admin-nav-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const target = btn.getAttribute('data-tab');
                this.switchTab(target);
            });
        });
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        document.querySelectorAll('.admin-tab-section').forEach(sec => {
            sec.style.display = 'none';
        });

        const activeSec = document.getElementById(`tabSection_${tabName}`);
        if (activeSec) {
            activeSec.style.display = 'block';
        }

        if (tabName === 'occupancy') {
            this.loadOccupancyMatrix();
        } else if (tabName === 'admin_courses') {
            this.loadAdminCourses();
        } else if (tabName === 'admin_instructors') {
            this.loadAdminInstructors();
        }
    }

    // ==========================================
    // 1. KULLANICI YÖNETİMİ & ŞİFRELER
    // ==========================================
    async loadUsers() {
        const res = await apiRequest('get_users');
        if (res && res.success && res.data) {
            this.users = res.data.users;
            this.renderUsersTable();
        }
    }

    togglePassword(userId, rawPass) {
        const span = document.getElementById(`pass_${userId}`);
        if (!span) return;
        if (span.textContent === '••••••') {
            span.textContent = rawPass;
            span.style.color = '#7B1123';
            span.style.fontWeight = '700';
        } else {
            span.textContent = '••••••';
            span.style.color = 'inherit';
            span.style.fontWeight = 'normal';
        }
    }

    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (this.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 2rem;">Kayıtlı kullanıcı bulunamadı.</td></tr>';
            return;
        }

        tbody.innerHTML = this.users.map(u => `
            <tr>
                <td><strong>${this.escape(u.username)}</strong></td>
                <td>${this.escape(u.full_name)}</td>
                <td><span style="color: var(--navy); font-weight: 600; font-size: 0.85rem;">${this.escape(u.email)}</span></td>
                <td>
                    <span id="pass_${u.id}" style="font-family: var(--font-mono); background: #F1F5F9; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.82rem;">••••••</span>
                    <button type="button" class="btn btn-outline btn-sm" style="padding: 0.15rem 0.45rem; font-size: 0.75rem;" onclick="window.adminPanel.togglePassword(${u.id}, '${this.escape(u.password_plain || '123456')}')" title="Şifreyi Göster">
                        👁️
                    </button>
                </td>
                <td>
                    <span class="user-role-badge ${u.role === 'admin' ? 'badge-admin' : 'badge-coord'}">
                        ${u.role === 'admin' ? '🛡️ Yönetici' : '🎓 Bölüm Yetkilisi'}
                    </span>
                </td>
                <td>
                    ${u.department_name ? `<strong>${this.escape(u.department_name)}</strong><br><small style="color:var(--text-muted);">${this.escape(u.faculty_name || '')}</small>` : '<span style="color:var(--text-light);">-</span>'}
                </td>
                <td style="text-align: right;">
                    ${u.id === 1 ? '<span style="color:var(--text-light);font-size:0.8rem;">Ana Yönetici</span>' : `
                        <button class="btn btn-danger btn-sm" onclick="window.adminPanel.deleteUser(${u.id})">
                            🗑️ Sil
                        </button>
                    `}
                </td>
            </tr>
        `).join('');
    }

    async deleteUser(userId) {
        if (confirm('Bu kullanıcıyı sistemden silmek istediğinizden emin misiniz?')) {
            const res = await apiRequest('delete_user', 'POST', { id: userId });
            if (res && res.success) {
                this.showToast('Kullanıcı silindi.', 'success');
                await this.loadUsers();
            } else {
                this.showToast(res ? res.message : 'Silme hatası', 'danger');
            }
        }
    }

    // ==========================================
    // 2. DERSLİK YÖNETİMİ
    // ==========================================
    async loadClassrooms() {
        const res = await apiRequest('get_initial_data');
        if (res && res.success && res.data) {
            this.classrooms = res.data.classrooms || [];
            this.renderClassroomsTable();
        }
    }

    renderClassroomsTable() {
        const tbody = document.getElementById('classroomsTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.classrooms.map(c => `
            <tr>
                <td><strong style="color: var(--navy); font-family: var(--font-mono);">${this.escape(c.code)}</strong></td>
                <td>${this.escape(c.name)}</td>
                <td><span class="faculty-pill" style="font-size: 0.78rem;">${this.escape(c.building)}</span></td>
                <td>${this.getRoomTypeBadge(c.room_type)}</td>
                <td><strong>${c.capacity}</strong> Kişilik</td>
                <td style="font-size: 0.8rem; color: var(--text-muted);">${this.escape(c.features || '-')}</td>
                <td style="text-align: right;">
                    <button class="btn btn-danger btn-sm" onclick="window.adminPanel.deleteClassroom(${c.id})">
                        🗑️ Sil
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getRoomTypeBadge(type) {
        switch (type) {
            case 'amfi': return '<span style="background:#FEF3C7;color:#92400E;padding:0.2rem 0.5rem;border-radius:12px;font-size:0.75rem;font-weight:700;">Amfi</span>';
            case 'lab': return '<span style="background:#E0E7FF;color:#3730A3;padding:0.2rem 0.5rem;border-radius:12px;font-size:0.75rem;font-weight:700;">Bilgisayar Lab</span>';
            case 'seminar': return '<span style="background:#FCE7F3;color:#9D174D;padding:0.2rem 0.5rem;border-radius:12px;font-size:0.75rem;font-weight:700;">Seminer Salonu</span>';
            default: return '<span style="background:#F1F5F9;color:#475569;padding:0.2rem 0.5rem;border-radius:12px;font-size:0.75rem;font-weight:700;">Standart Sınıf</span>';
        }
    }

    async deleteClassroom(classroomId) {
        if (confirm('Bu dersliği sistemden silmek istediğinizden emin misiniz?')) {
            const res = await apiRequest('delete_classroom', 'POST', { id: classroomId });
            if (res && res.success) {
                this.showToast('Derslik silindi.', 'success');
                await this.loadClassrooms();
            } else {
                this.showToast(res ? res.message : 'Silme hatası', 'danger');
            }
        }
    }

    // ==========================================
    // 3. KAMPÜS GENELİ DOLULUK MATRİSİ
    // ==========================================
    async loadOccupancyMatrix() {
        const matrixContainer = document.getElementById('occupancyMatrixContainer');
        if (!matrixContainer) return;

        matrixContainer.innerHTML = '<div style="padding: 2rem; text-align:center;">Derslik doluluk matrisi yükleniyor...</div>';

        const res = await apiRequest('get_all_occupancy');
        if (res && res.success && res.data) {
            this.occupancySlots = res.data.slots || [];
            this.renderOccupancyMatrix();
        }
    }

    renderOccupancyMatrix() {
        const matrixContainer = document.getElementById('occupancyMatrixContainer');
        const dayFilter = document.getElementById('matrixDayFilter').value;
        const buildingFilter = document.getElementById('matrixBuildingFilter').value;

        // Derslikleri filtrele
        let filteredRooms = this.classrooms;
        if (buildingFilter) {
            filteredRooms = filteredRooms.filter(r => r.building === buildingFilter);
        }

        let html = `
            <div class="table-scroll-container">
                <table class="excel-schedule-table">
                    <thead>
                        <tr>
                            <th style="width: 140px; position: sticky; left:0; z-index: 25; background: #071520;">Derslik / Saat</th>
                            ${TIME_SLOTS.map(t => `<th style="font-size: 0.8rem;">${t.start}<br><small style="color:var(--gold);">${t.end}</small></th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;

        filteredRooms.forEach(room => {
            html += `<tr>`;
            html += `
                <td class="time-cell" style="text-align: left; padding: 0.5rem 0.75rem;">
                    <strong>${this.escape(room.code)}</strong>
                    <div style="font-size: 0.7rem; color: var(--text-muted);">${this.escape(room.building)} (${room.capacity} Kişi)</div>
                </td>
            `;

            TIME_SLOTS.forEach(time => {
                // Bu derslikte bu saatte ders var mi?
                const match = this.occupancySlots.find(s => 
                    s.classroom_id == room.id && 
                    s.day_name === dayFilter && 
                    s.start_hour_index <= time.index && 
                    s.end_hour_index >= time.index
                );

                if (match) {
                    html += `
                        <td style="background: rgba(123, 17, 35, 0.08); border: 1px solid var(--surface-border); padding: 0.35rem; vertical-align: top;">
                            <div style="border-left: 3px solid #7B1123; padding-left: 0.35rem; font-size: 0.75rem;">
                                <strong style="color: #7B1123; display:block;">${this.escape(match.course_code || match.course_name)}</strong>
                                <span style="font-size: 0.7rem; color: var(--navy); display:block;">${this.escape(match.department_name)}</span>
                                <span style="font-size: 0.68rem; color: var(--text-muted); display:block;">👨‍🏫 ${this.escape(match.instructor_name)}</span>
                            </div>
                        </td>
                    `;
                } else {
                    html += `
                        <td style="background: #F0FDF4; border: 1px solid var(--surface-border); text-align: center; color: #15803D; font-size: 0.75rem; font-weight: 600;">
                            BOŞ
                        </td>
                    `;
                }
            });

            html += `</tr>`;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        matrixContainer.innerHTML = html;
    }

    // ==========================================
    // DERS HAVUZU YÖNETİMİ (ADMIN)
    // ==========================================
    async loadAdminCourses() {
        const res = await apiRequest('get_initial_data');
        if (res && res.success && res.data) {
            this.adminCourses = res.data.courses || [];
            this.renderAdminCourses();
        }
    }

    renderAdminCourses() {
        const tbody = document.getElementById('adminCoursesTableBody');
        const deptFilter = document.getElementById('adminCourseDeptFilter').value;
        if (!tbody) return;

        let filtered = this.adminCourses || [];
        if (deptFilter) {
            filtered = filtered.filter(c => c.department_id == deptFilter);
        }

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">Kayıtlı ders bulunamadı.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(c => {
            const dept = this.departments.find(d => d.id == c.department_id);
            return `
                <tr>
                    <td><strong style="color: var(--primary); font-family: var(--font-mono);">${this.escape(c.code)}</strong></td>
                    <td>${this.escape(c.name)}</td>
                    <td>${dept ? this.escape(dept.name) : '-'}</td>
                    <td><span class="grade-badge">${c.grade_level}. Sınıf</span></td>
                    <td>${c.weekly_hours || 3} Saat</td>
                    <td style="text-align: right;">
                        <button class="btn btn-danger btn-sm" onclick="window.adminPanel.deleteAdminCourse(${c.id})">🗑️ Sil</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async deleteAdminCourse(id) {
        if (confirm('Bu dersi sistemden silmek istediğinizden emin misiniz?')) {
            const res = await apiRequest('delete_course', 'POST', { id: id });
            if (res && res.success) {
                this.showToast('Ders silindi.', 'success');
                await this.loadAdminCourses();
            }
        }
    }

    // ==========================================
    // HOCA HAVUZU YÖNETİMİ (ADMIN)
    // ==========================================
    async loadAdminInstructors() {
        const res = await apiRequest('get_initial_data');
        if (res && res.success && res.data) {
            this.adminInstructors = res.data.instructors || [];
            this.renderAdminInstructors();
        }
    }

    renderAdminInstructors() {
        const tbody = document.getElementById('adminInstructorsTableBody');
        const deptFilter = document.getElementById('adminInstDeptFilter').value;
        if (!tbody) return;

        let filtered = this.adminInstructors || [];
        if (deptFilter) {
            filtered = filtered.filter(i => i.department_id == deptFilter);
        }

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);">Kayıtlı öğretim elemanı bulunamadı.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(i => {
            const dept = this.departments.find(d => d.id == i.department_id);
            return `
                <tr>
                    <td><strong>${this.escape(i.title || 'Dr. Öğr. Üyesi')}</strong></td>
                    <td>${this.escape(i.name)}</td>
                    <td>${dept ? this.escape(dept.name) : '-'}</td>
                    <td style="color: var(--navy); font-weight: 500;">${this.escape(i.email || '-')}</td>
                    <td style="text-align: right;">
                        <button class="btn btn-danger btn-sm" onclick="window.adminPanel.deleteAdminInstructor(${i.id})">🗑️ Sil</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async deleteAdminInstructor(id) {
        if (confirm('Bu öğretim görevlisini silmek istediğinizden emin misiniz?')) {
            const res = await apiRequest('delete_instructor', 'POST', { id: id });
            if (res && res.success) {
                this.showToast('Öğretim görevlisi silindi.', 'success');
                await this.loadAdminInstructors();
            }
        }
    }

    initForms() {
        // Ders Filtreleri
        const courseDeptFilter = document.getElementById('adminCourseDeptFilter');
        if (courseDeptFilter) courseDeptFilter.addEventListener('change', () => this.renderAdminCourses());

        const instDeptFilter = document.getElementById('adminInstDeptFilter');
        if (instDeptFilter) instDeptFilter.addEventListener('change', () => this.renderAdminInstructors());

        // Admin Ders Ekle Formu
        const addCourseForm = document.getElementById('addAdminCourseForm');
        if (addCourseForm) {
            addCourseForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const payload = {
                    department_id: parseInt(document.getElementById('adminCourseDept').value),
                    code: document.getElementById('adminCourseCode').value.trim(),
                    name: document.getElementById('adminCourseName').value.trim(),
                    grade_level: parseInt(document.getElementById('adminCourseGrade').value),
                    weekly_hours: parseInt(document.getElementById('adminCourseHours').value || 3)
                };

                const res = await apiRequest('save_course', 'POST', payload);
                if (res && res.success) {
                    this.showToast('Ders başarıyla eklendi.', 'success');
                    document.getElementById('addAdminCourseModal').classList.remove('active');
                    addCourseForm.reset();
                    await this.loadAdminCourses();
                } else {
                    this.showToast(res ? res.message : 'Ders eklenemedi.', 'danger');
                }
            });
        }

        // Admin Hoca Ekle Formu
        const addInstForm = document.getElementById('addAdminInstForm');
        if (addInstForm) {
            addInstForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const payload = {
                    department_id: parseInt(document.getElementById('adminInstDept').value),
                    title: document.getElementById('adminInstTitle').value,
                    name: document.getElementById('adminInstName').value.trim(),
                    email: document.getElementById('adminInstEmail').value.trim()
                };

                const res = await apiRequest('save_instructor', 'POST', payload);
                if (res && res.success) {
                    this.showToast('Öğretim görevlisi başarıyla eklendi.', 'success');
                    document.getElementById('addAdminInstModal').classList.remove('active');
                    addInstForm.reset();
                    await this.loadAdminInstructors();
                } else {
                    this.showToast(res ? res.message : 'Hoca eklenemedi.', 'danger');
                }
            });
        }

        // Kullanici Ekle Formu
        const userForm = document.getElementById('addUserForm');
        if (userForm) {
            userForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const payload = {
                    username: document.getElementById('newUsername').value.trim(),
                    password: document.getElementById('newPassword').value.trim(),
                    full_name: document.getElementById('newFullName').value.trim(),
                    email: document.getElementById('newEmail').value.trim(),
                    role: document.getElementById('userRole').value,
                    faculty_id: document.getElementById('userFaculty').value || null,
                    department_id: document.getElementById('userDepartment').value || null
                };

                const res = await apiRequest('save_user', 'POST', payload);
                if (res && res.success) {
                    this.showToast('Yeni kullanıcı başarıyla eklendi.', 'success');
                    document.getElementById('addUserModal').classList.remove('active');
                    userForm.reset();
                    await this.loadUsers();
                } else {
                    this.showToast(res ? res.message : 'Kullanıcı eklenemedi.', 'danger');
                }
            });
        }

        // Derslik Ekle Formu
        const roomForm = document.getElementById('addClassroomForm');
        if (roomForm) {
            roomForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const payload = {
                    code: document.getElementById('roomCode').value.trim(),
                    name: document.getElementById('roomName').value.trim(),
                    building: document.getElementById('roomBuilding').value,
                    capacity: parseInt(document.getElementById('roomCapacity').value || 40),
                    room_type: document.getElementById('roomType').value,
                    features: document.getElementById('roomFeatures').value.trim()
                };

                const res = await apiRequest('save_classroom', 'POST', payload);
                if (res && res.success) {
                    this.showToast('Derslik başarıyla sisteme kaydedildi.', 'success');
                    document.getElementById('addClassroomModal').classList.remove('active');
                    roomForm.reset();
                    await this.loadClassrooms();
                } else {
                    this.showToast(res ? res.message : 'Derslik eklenemedi.', 'danger');
                }
            });
        }

        // Matris Filtreleri
        const dayFilter = document.getElementById('matrixDayFilter');
        const buildingFilter = document.getElementById('matrixBuildingFilter');
        if (dayFilter) dayFilter.addEventListener('change', () => this.renderOccupancyMatrix());
        if (buildingFilter) buildingFilter.addEventListener('change', () => this.renderOccupancyMatrix());
    }

    escape(text) {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
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

window.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});
