/**
 * Istanbul 29 Mayis Universitesi - Ders Programi
 * Gercek Zamanli Cakisma Denetleyicisi (Conflict Checker)
 */

class ConflictChecker {
    constructor() {
        this.conflictBox = document.getElementById('conflictAlertBox');
        this.conflictDesc = document.getElementById('conflictAlertDesc');
        this.conflictDetails = document.getElementById('conflictAlertDetails');
        this.freeRoomsBox = document.getElementById('freeRoomsBox');
        this.freeRoomsList = document.getElementById('freeRoomsPills');
        this.saveButton = document.getElementById('btnSaveSlot');
    }

    /**
     * Secilen sinif ve hoca icin cakisma kontrolu yapar
     */
    async check({ classroomId, instructorId, dayName, startHourIndex, endHourIndex, excludeSlotId = 0 }) {
        if (!classroomId || !dayName) {
            this.clearAlert();
            return { hasConflict: false };
        }

        try {
            const response = await apiRequest('check_conflict', 'POST', {
                classroom_id: parseInt(classroomId),
                instructor_id: parseInt(instructorId || 0),
                day_name: dayName,
                start_hour_index: parseInt(startHourIndex),
                end_hour_index: parseInt(endHourIndex),
                exclude_slot_id: parseInt(excludeSlotId || 0)
            });

            if (response && response.success) {
                const data = response.data;
                if (data.has_conflict) {
                    this.showAlert(data);
                    return { hasConflict: true, data: data };
                } else {
                    this.clearAlert();
                    return { hasConflict: false };
                }
            }
        } catch (e) {
            console.error("Cakisma sorgusu hatasi:", e);
        }

        this.clearAlert();
        return { hasConflict: false };
    }

    /**
     * Cakisma uyarisi panelini doldurur ve acar
     */
    showAlert(data) {
        if (!this.conflictBox) return;

        let messages = [];
        let detailsHtml = '';

        if (data.room_conflict) {
            const rc = data.room_conflict;
            messages.push(`<strong>DERSLİK DOLU:</strong> Bu derslik belirtilen saatlerde başka bir ders tarafından kullanılmaktadır.`);
            detailsHtml += `
                <div style="margin-bottom: 0.4rem;">
                    <strong>Çakışan Ders:</strong> ${rc.course_code ? rc.course_code + ' - ' : ''}${rc.course_name}
                </div>
                <div style="margin-bottom: 0.4rem;">
                    <strong>Fakülte / Bölüm:</strong> ${rc.faculty_name || ''} &bull; ${rc.department_name}
                </div>
                <div style="margin-bottom: 0.4rem;">
                    <strong>Öğretim Görevlisi:</strong> ${rc.instructor_name}
                </div>
                <div>
                    <strong>Dolu Saat Aralığı:</strong> ${rc.day_name} ${rc.start_time} - ${rc.end_time}
                </div>
            `;
        }

        if (data.instructor_conflict) {
            const ic = data.instructor_conflict;
            messages.push(`<strong>HOCA ÇAKIŞMASI:</strong> Seçilen öğretim görevlisinin bu saat aralığında başka bir bölümde (${ic.department_name}) dersi vardır!`);
        }

        this.conflictDesc.innerHTML = messages.join('<br>');
        this.conflictDetails.innerHTML = detailsHtml;
        this.conflictBox.classList.add('active');

        // Alternatif bos derslikleri listele
        if (data.free_classrooms && data.free_classrooms.length > 0) {
            this.freeRoomsList.innerHTML = '';
            data.free_classrooms.forEach(room => {
                const pill = document.createElement('button');
                pill.type = 'button';
                pill.className = 'room-suggest-pill';
                pill.innerHTML = `🏢 ${room.code} (${room.building}, Kapasite: ${room.capacity})`;
                pill.onclick = () => {
                    const roomSelect = document.getElementById('slotClassroom');
                    if (roomSelect) {
                        roomSelect.value = room.id;
                        // Degisiklik olayini tetikle ve tekrar kontrol et
                        roomSelect.dispatchEvent(new Event('change'));
                    }
                };
                this.freeRoomsList.appendChild(pill);
            });
            this.freeRoomsBox.classList.add('active');
        } else {
            if (this.freeRoomsBox) this.freeRoomsBox.classList.remove('active');
        }

        if (this.saveButton) {
            this.saveButton.disabled = true;
            this.saveButton.classList.add('btn-disabled');
            this.saveButton.title = "Derslik veya hoca çakışması varken kayıt yapılamaz.";
        }
    }

    /**
     * Cakisma uyarisi panelini temizler ve kapatir
     */
    clearAlert() {
        if (this.conflictBox) {
            this.conflictBox.classList.remove('active');
        }
        if (this.freeRoomsBox) {
            this.freeRoomsBox.classList.remove('active');
        }
        if (this.saveButton) {
            this.saveButton.disabled = false;
            this.saveButton.classList.remove('btn-disabled');
            this.saveButton.title = "";
        }
    }
}

window.conflictChecker = new ConflictChecker();
