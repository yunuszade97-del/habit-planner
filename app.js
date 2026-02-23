/**
 * @fileoverview Контроллер и Состояние приложения.
 */

// --- MODEL (Состояние) ---
const AppState = {
    tasks: [],
    dates: [], // Последние 5 дней
    editingTaskId: null
};

// --- CONTROLLER / МЕТОДЫ ---
const PlannerController = {
    init() {
        this.loadData();
        this.generateDates();
        this.cacheDOM();
        this.bindEvents();
        this.render();
    },

    loadData() {
        const saved = localStorage.getItem('planner_tasks');
        if (saved) {
            try {
                AppState.tasks = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse tasks from localStorage');
                AppState.tasks = [];
            }
        } else {
            // Dummy data для старта
            AppState.tasks = [
                { id: 1, title: 'Поиск работы', description: 'Откликнуться на 5 вакансий', history: {} }
            ];
        }
    },

    saveData() {
        localStorage.setItem('planner_tasks', JSON.stringify(AppState.tasks));
    },

    cacheDOM() {
        this.calendarHeader = document.getElementById('calendar-header');
        this.tasksList = document.getElementById('tasks-list');
        this.modal = document.getElementById('modal-add-task');
        this.formAdd = document.getElementById('form-add-task');
        this.btnAdd = document.getElementById('btn-add-task');
        this.btnCancel = document.getElementById('btn-cancel');
        this.btnDelete = document.getElementById('btn-delete');
    },

    bindEvents() {
        this.btnAdd.addEventListener('click', () => {
            AppState.editingTaskId = null;
            this.modal.querySelector('h2').textContent = 'Новая привычка';
            this.btnDelete.style.display = 'none';
            this.formAdd.reset();
            this.modal.showModal();
        });

        this.btnCancel.addEventListener('click', () => {
            this.modal.close();
            this.formAdd.reset();
        });

        // Закрытие по клику вне модалки
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.modal.close();
                this.formAdd.reset();
            }
        });

        this.formAdd.addEventListener('submit', (e) => this.handleAddTask(e));

        this.btnDelete.addEventListener('click', () => {
            if (AppState.editingTaskId) {
                if (confirm('Точно удалить эту привычку?')) {
                    AppState.tasks = AppState.tasks.filter(t => t.id !== AppState.editingTaskId);
                    this.saveData();
                    this.renderTasks();
                    this.modal.close();
                    this.formAdd.reset();
                }
            }
        });

        // Делегирование событий для кликов по истории и кнопке редактирования
        this.tasksList.addEventListener('click', (e) => {
            const historyIcon = e.target.closest('.history-icon');
            if (historyIcon) {
                const taskId = parseInt(historyIcon.dataset.taskId, 10);
                const dateStr = historyIcon.dataset.date;
                this.toggleTaskHistory(taskId, dateStr);
                return;
            }

            const editBtn = e.target.closest('.edit-btn');
            if (editBtn) {
                const taskId = parseInt(editBtn.dataset.taskId, 10);
                this.openEditModal(taskId);
            }
        });
    },

    openEditModal(taskId) {
        const task = AppState.tasks.find(t => t.id === taskId);
        if (task) {
            AppState.editingTaskId = taskId;
            this.modal.querySelector('h2').textContent = 'Редактировать привычку';
            this.btnDelete.style.display = 'block';

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = task.title;
            this.formAdd.elements['title'].value = tempDiv.textContent || tempDiv.innerText || '';

            tempDiv.innerHTML = task.description || '';
            this.formAdd.elements['description'].value = tempDiv.textContent || tempDiv.innerText || '';

            this.modal.showModal();
        }
    },

    generateDates() {
        const today = new Date();
        const daysRaw = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

        AppState.dates = [];
        for (let i = 0; i <= 4; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);

            // Format YYYY-MM-DD safely
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            AppState.dates.push({
                dateString: dateStr,
                num: d.getDate(),
                name: daysRaw[d.getDay()],
                isToday: i === 0 // Поскольку генерируем до i=0 (текущий день)
            });
        }
    },

    handleAddTask(e) {
        // Форма закроется сама благодаря method="dialog", но перехватываем данные
        const formData = new FormData(this.formAdd);
        const rawTitle = formData.get('title').trim();
        const rawDesc = formData.get('description').trim();

        if (!rawTitle) return;

        // SECURITY FIRST: Санитизация данных
        const safeTitle = SecurityService.sanitizeHTML(rawTitle);
        const safeDesc = SecurityService.sanitizeHTML(rawDesc);

        if (AppState.editingTaskId) {
            const task = AppState.tasks.find(t => t.id === AppState.editingTaskId);
            if (task) {
                task.title = safeTitle;
                task.description = safeDesc;
            }
            AppState.editingTaskId = null;
        } else {
            const newTask = {
                id: Date.now(),
                title: safeTitle,
                description: safeDesc,
                history: {}
            };
            AppState.tasks.push(newTask);
        }

        this.saveData();
        this.formAdd.reset();

        this.renderTasks();
    },

    toggleTaskHistory(taskId, dateStr) {
        const task = AppState.tasks.find(t => t.id === taskId);
        if (task) {
            if (!task.history) task.history = {};
            // Переключаем статус выполнения для конкретной даты
            task.history[dateStr] = !task.history[dateStr];
            this.saveData();
            this.renderTasks(); // Перерисовываем для обновления UI
        }
    },

    // --- VIEW (Отображение) ---
    render() {
        this.renderCalendarHeader();
        this.renderTasks();
    },

    renderCalendarHeader() {
        this.calendarHeader.innerHTML = AppState.dates.map(date => `
            <div class="calendar-day ${date.isToday ? 'current-day' : ''}">
                <span class="day-num">${date.num}</span>
                <span class="day-name">${date.name}</span>
            </div>
        `).join('');
    },

    renderTasks() {
        const svgCross = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        const svgCheck = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        const svgEdit = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

        if (AppState.tasks.length === 0) {
            this.tasksList.innerHTML = `<div style="text-align:center; padding: 40px; color: #8A92A0;">Нет привычек. Нажмите "+" для создания.</div>`;
            return;
        }

        const tasksHTML = AppState.tasks.map(task => {
            const historyObj = task.history || {};
            // Статус основного кружочка зависит от выполнения привычки сегодня (которое теперь всегда по индексу 0)
            const todayStr = AppState.dates[0].dateString;
            const isCompletedToday = historyObj[todayStr];

            return `
            <div class="task-item ${task.description ? 'has-desc' : ''}">
                <div class="task-info">
                    <div class="task-status-circle ${isCompletedToday ? 'completed' : ''}"></div>
                    <div class="task-text-content">
                        <div class="task-title-wrap">
                            <div class="task-title">${task.title}</div>
                            <button class="edit-btn" data-task-id="${task.id}" aria-label="Редактировать">${svgEdit}</button>
                        </div>
                        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                    </div>
                </div>
                <div class="task-history">
                    ${AppState.dates.map(date => {
                const isCompleted = historyObj[date.dateString];
                return `
                        <div class="history-icon ${isCompleted ? 'checked' : ''}" 
                             data-task-id="${task.id}" 
                             data-date="${date.dateString}"
                             title="${date.num} ${date.name}">
                            ${isCompleted ? svgCheck : svgCross}
                        </div>
                        `;
            }).join('')}
                </div>
            </div>
            `;
        }).join('');

        this.tasksList.innerHTML = tasksHTML;
    }
};

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    PlannerController.init();
});
