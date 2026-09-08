/**
 * Istanbul 29 Mayis Universitesi - Ders Programi
 * Excel Benzeri Izgara (Grid), Coklu Hucre Secimi ve Birlestirme Motoru
 */

class ScheduleGrid {
    constructor(tableContainerId) {
        this.container = document.getElementById(tableContainerId);
        this.currentSlots = [];
        this.isMouseDown = false;
        this.selectionDay = null;
        this.selectionStartHour = null;
        this.selectionEndHour = null;
        this.onSelectionChange = null;
        this.onSlotClick = null;
        this.onSlotDelete = null;
        this.onCellDoubleClick = null;

        this.initGlobalListeners();
    }

    initGlobalListeners() {
        document.addEventListener('mouseup', () => {
            if (this.isMouseDown) {
                this.isMouseDown = false;
                this.finalizeSelection();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearSelection();
            }
        });
    }

    /**
     * Izgarayi ve mevcut dersleri render eder
     */
    render(slots = []) {
        this.currentSlots = slots;
        if (!this.container) return;

        // Hizli erisim icin slotlari haritalandir: { "Pazartesi-1": slotObj }
        const slotMap = {};
        const coveredCells = {}; // Birlestirilmis hucrelerin kapladigi alt satirlar

        slots.forEach(slot => {
            const key = `${slot.day_name}-${slot.start_hour_index}`;
            slotMap[key] = slot;

            for (let h = slot.start_hour_index + 1; h <= slot.end_hour_index; h++) {
                coveredCells[`${slot.day_name}-${h}`] = true;
            }
        });

        let html = `
            <div class="table-scroll-container">
                <table class="excel-schedule-table" id="scheduleExcelTable">
                    <thead>
                        <tr>
                            <th class="time-col-header">Saat / Gün</th>
                            ${DAYS_OF_WEEK.map(day => `<th>${day}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;

        TIME_SLOTS.forEach(timeSlot => {
            html += `<tr>`;
            // Saat Sutunu
            html += `
                <td class="time-cell">
                    <span class="time-period">${timeSlot.index + 1}. Ders</span>
                    <span class="time-range">${timeSlot.start} - ${timeSlot.end}</span>
                </td>
            `;

            // Gun Sutunlari
            DAYS_OF_WEEK.forEach(day => {
                const cellKey = `${day}-${timeSlot.index}`;

                // Eger bu hucre ustteki birlestirilmis bir ders tarafindan kaplaniyorsa atla
                if (coveredCells[cellKey]) {
                    return;
                }

                // Eger bu hucrede baslayan bir ders varsa (Birlestirilmis Hucre)
                if (slotMap[cellKey]) {
                    const slot = slotMap[cellKey];
                    const rowSpan = (slot.end_hour_index - slot.start_hour_index) + 1;
                    const color = slot.color_tag || '#7B1123';

                    html += `
                        <td class="grid-cell merged-slot" 
                            rowspan="${rowSpan}" 
                            data-slot-id="${slot.id}"
                            data-day="${day}"
                            data-start="${slot.start_hour_index}"
                            data-end="${slot.end_hour_index}"
                            style="height: ${rowSpan * 72}px;">
                            <div class="course-card" style="border-left-color: ${color};">
                                <div class="course-card-top">
                                    <span class="course-code">${this.escapeHtml(slot.course_code || 'DERS')}</span>
                                    <span class="grade-badge">${slot.grade_level}. Sınıf</span>
                                </div>
                                <div class="course-title" title="${this.escapeHtml(slot.course_name)}">
                                    ${this.escapeHtml(slot.course_name)}
                                </div>
                                <div class="instructor-info" title="${this.escapeHtml(slot.instructor_name)}">
                                    👨‍🏫 ${this.escapeHtml(slot.instructor_name || 'Öğretim Görevlisi')}
                                </div>
                                <div class="card-footer-info">
                                    <span class="room-badge">
                                        📍 <strong>${this.escapeHtml(slot.classroom_code || 'Derslik')}</strong>
                                    </span>
                                    <span class="time-badge">
                                        ⏱️ ${slot.start_time} - ${slot.end_time}
                                    </span>
                                </div>
                                <div class="card-actions">
                                    <button type="button" class="card-btn btn-delete-slot" data-id="${slot.id}" title="Dersi Programdan Kaldır">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </td>
                    `;
                } else {
                    // Bos Standart Excel Hucresi
                    html += `
                        <td class="grid-cell empty-grid-cell"
                            data-day="${day}"
                            data-hour-index="${timeSlot.index}">
                            <div class="empty-cell-hint">+</div>
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

        this.container.innerHTML = html;
        this.attachCellEvents();
    }

    /**
     * Hucre fare olaylarini baglar
     */
    attachCellEvents() {
        const table = document.getElementById('scheduleExcelTable');
        if (!table) return;

        // Bos hucre secim olaylari
        const emptyCells = table.querySelectorAll('.empty-grid-cell');
        emptyCells.forEach(cell => {
            cell.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return; // Sadece sol tik
                this.isMouseDown = true;
                const day = cell.getAttribute('data-day');
                const hour = parseInt(cell.getAttribute('data-hour-index'));
                this.startSelection(day, hour);
            });

            cell.addEventListener('mouseenter', () => {
                if (this.isMouseDown) {
                    const day = cell.getAttribute('data-day');
                    const hour = parseInt(cell.getAttribute('data-hour-index'));
                    // Yalnizca ayni gun icinde secime izin ver
                    if (day === this.selectionDay) {
                        this.updateSelection(hour);
                    }
                }
            });

            cell.addEventListener('dblclick', () => {
                const day = cell.getAttribute('data-day');
                const hour = parseInt(cell.getAttribute('data-hour-index'));
                this.startSelection(day, hour);
                this.finalizeSelection();
                if (this.onCellDoubleClick) {
                    this.onCellDoubleClick(this.getSelectedRange());
                }
            });
        });

        // Birlestirilmis ders karti silme butonu olayi
        const deleteButtons = table.querySelectorAll('.btn-delete-slot');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const slotId = btn.getAttribute('data-id');
                if (this.onSlotDelete) {
                    this.onSlotDelete(slotId);
                }
            });
        });
    }

    startSelection(day, hourIndex) {
        this.clearSelectionVisuals();
        this.selectionDay = day;
        this.selectionStartHour = hourIndex;
        this.selectionEndHour = hourIndex;
        this.highlightSelection();
    }

    updateSelection(currentHourIndex) {
        this.selectionEndHour = currentHourIndex;
        this.highlightSelection();
    }

    finalizeSelection() {
        const range = this.getSelectedRange();
        if (range && this.onSelectionChange) {
            this.onSelectionChange(range);
        }
    }

    getSelectedRange() {
        if (!this.selectionDay || this.selectionStartHour === null) return null;
        const minHour = Math.min(this.selectionStartHour, this.selectionEndHour);
        const maxHour = Math.max(this.selectionStartHour, this.selectionEndHour);

        const startTime = TIME_SLOTS[minHour] ? TIME_SLOTS[minHour].start : '';
        const endTime = TIME_SLOTS[maxHour] ? TIME_SLOTS[maxHour].end : '';
        const count = (maxHour - minHour) + 1;

        return {
            day: this.selectionDay,
            startHour: minHour,
            endHour: maxHour,
            startTime: startTime,
            endTime: endTime,
            hourCount: count
        };
    }

    highlightSelection() {
        this.clearSelectionVisuals();
        if (!this.selectionDay || this.selectionStartHour === null) return;

        const minHour = Math.min(this.selectionStartHour, this.selectionEndHour);
        const maxHour = Math.max(this.selectionStartHour, this.selectionEndHour);

        for (let h = minHour; h <= maxHour; h++) {
            const cell = this.container.querySelector(`.empty-grid-cell[data-day="${this.selectionDay}"][data-hour-index="${h}"]`);
            if (cell) {
                cell.classList.add('cell-selected');
                if (h === minHour) cell.classList.add('range-top');
                if (h === maxHour) cell.classList.add('range-bottom');
                cell.classList.add('range-left', 'range-right');
            }
        }
    }

    clearSelectionVisuals() {
        const selected = this.container.querySelectorAll('.cell-selected');
        selected.forEach(c => {
            c.classList.remove('cell-selected', 'range-top', 'range-bottom', 'range-left', 'range-right');
        });
    }

    clearSelection() {
        this.clearSelectionVisuals();
        this.selectionDay = null;
        this.selectionStartHour = null;
        this.selectionEndHour = null;
        if (this.onSelectionChange) {
            this.onSelectionChange(null);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }
}

window.ScheduleGrid = ScheduleGrid;
