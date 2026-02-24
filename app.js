/**
 * @fileoverview Контроллер и Состояние приложения.
 */

// --- MODEL (Состояние) ---
const AppState = {
    tasks: [],
    goals: [],
    dates: [], // Последние 5 дней
    activeTab: 'daily', // 'daily' | 'goals'
    editingTaskId: null,
    editingGoalId: null
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
        const savedTasks = localStorage.getItem('planner_tasks');
        const savedGoals = localStorage.getItem('planner_goals');

        if (savedTasks) {
            try {
                AppState.tasks = JSON.parse(savedTasks);
            } catch (e) {
                console.error('Failed to parse tasks from localStorage');
                AppState.tasks = [];
            }
        } else {
            AppState.tasks = [
                { id: 1, title: 'Поиск работы', description: 'Откликнуться на 5 вакансий', history: {}, goalId: null }
            ];
        }

        if (savedGoals) {
            try {
                AppState.goals = JSON.parse(savedGoals);
            } catch (e) {
                console.error('Failed to parse goals from localStorage');
                AppState.goals = [];
            }
        }
    },

    saveData() {
        localStorage.setItem('planner_tasks', JSON.stringify(AppState.tasks));
        localStorage.setItem('planner_goals', JSON.stringify(AppState.goals));
    },

    cacheDOM() {
        this.calendarHeader = document.getElementById('calendar-header');
        this.tasksList = document.getElementById('view-daily');
        this.goalsList = document.getElementById('view-goals');

        // Modal Task
        this.modalTask = document.getElementById('modal-add-task');
        this.formTask = document.getElementById('form-add-task');
        this.btnDeleteTask = document.getElementById('btn-delete');

        // Modal Goal
        this.modalGoal = document.getElementById('modal-add-goal');
        this.formGoal = document.getElementById('form-add-goal');
        this.btnDeleteGoal = document.getElementById('btn-delete-goal');

        this.btnAddMain = document.getElementById('btn-add-task');
        this.tabBtns = document.querySelectorAll('.tab-btn');
    },

    bindEvents() {
        // Табы
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Главная кнопка Добавить
        this.btnAddMain.addEventListener('click', () => {
            if (AppState.activeTab === 'daily') {
                this.openTaskModal();
            } else {
                this.openGoalModal();
            }
        });

        // Модалка Задач
        document.getElementById('btn-cancel').addEventListener('click', () => {
            this.modalTask.close();
            this.formTask.reset();
        });
        this.formTask.addEventListener('submit', (e) => this.handleAddTask(e));
        this.btnDeleteTask.addEventListener('click', () => this.handleDeleteTask());

        // Модалка Целей
        this.formGoal.addEventListener('submit', (e) => this.handleAddGoal(e));
        this.btnDeleteGoal.addEventListener('click', () => this.handleDeleteGoal());

        // Закрытие по клику вне
        [this.modalTask, this.modalGoal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.close();
                    modal.querySelector('form').reset();
                }
            });
        });

        // Делегирование событий (история, редактирование)
        const handleItemsClick = (e) => {
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
                this.openTaskModal(taskId);
                return;
            }

            const editGoalBtn = e.target.closest('.edit-goal-btn');
            if (editGoalBtn) {
                const goalId = parseInt(editGoalBtn.dataset.goalId, 10);
                this.openGoalModal(goalId);
                return;
            }

            const addTaskToGoalBtn = e.target.closest('.add-task-to-goal-btn');
            if (addTaskToGoalBtn) {
                const goalId = parseInt(addTaskToGoalBtn.dataset.goalId, 10);
                this.openTaskModal(null, goalId);
                return;
            }
        };

        this.tasksList.addEventListener('click', handleItemsClick);
        this.goalsList.addEventListener('click', handleItemsClick);
    },

    switchTab(tabId) {
        AppState.activeTab = tabId;
        this.tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));

        document.getElementById('view-daily').classList.toggle('active', tabId === 'daily');
        document.getElementById('view-goals').classList.toggle('active', tabId === 'goals');
    },

    openTaskModal(taskId = null, goalId = null) {
        this.formTask.reset();
        const h2 = this.modalTask.querySelector('h2');

        // Сохраняем скрытый input для targetGoalId
        let hiddenInput = this.formTask.querySelector('input[name="targetGoalId"]');
        if (!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 'targetGoalId';
            this.formTask.appendChild(hiddenInput);
        }
        hiddenInput.value = goalId || '';

        if (taskId) {
            const task = AppState.tasks.find(t => t.id === taskId);
            if (task) {
                AppState.editingTaskId = taskId;
                h2.textContent = 'Редактировать привычку';
                this.btnDeleteTask.style.display = 'block';

                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = task.title;
                this.formTask.elements['title'].value = tempDiv.textContent || '';
                tempDiv.innerHTML = task.description || '';
                this.formTask.elements['description'].value = tempDiv.textContent || '';

                hiddenInput.value = task.goalId || '';
            }
        } else {
            AppState.editingTaskId = null;
            h2.textContent = goalId ? 'Новая привычка для цели' : 'Новая привычка';
            this.btnDeleteTask.style.display = 'none';
        }

        this.modalTask.showModal();
    },

    openGoalModal(goalId = null) {
        this.formGoal.reset();
        const h2 = this.modalGoal.querySelector('h2');

        if (goalId) {
            const goal = AppState.goals.find(g => g.id === goalId);
            if (goal) {
                AppState.editingGoalId = goalId;
                h2.textContent = 'Редактировать цель';
                this.btnDeleteGoal.style.display = 'block';

                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = goal.title;
                this.formGoal.elements['title'].value = tempDiv.textContent || '';
                tempDiv.innerHTML = goal.description || '';
                this.formGoal.elements['description'].value = tempDiv.textContent || '';
            }
        } else {
            AppState.editingGoalId = null;
            h2.textContent = 'Новая цель на год';
            this.btnDeleteGoal.style.display = 'none';
        }

        this.modalGoal.showModal();
    },

    generateDates() {
        const today = new Date();
        const daysRaw = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

        AppState.dates = [];
        for (let i = 0; i <= 4; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);

            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');

            AppState.dates.push({
                dateString: `${year}-${month}-${day}`,
                num: d.getDate(),
                name: daysRaw[d.getDay()],
                isToday: i === 0
            });
        }
    },

    handleAddTask(e) {
        e.preventDefault(); // Предотвращаем перезагрузку страницы ("вырубается")

        const formData = new FormData(this.formTask);
        const rawTitle = formData.get('title').trim();
        const rawDesc = formData.get('description').trim();
        const targetGoalId = formData.get('targetGoalId');

        if (!rawTitle) return;

        const safeTitle = SecurityService.sanitizeHTML(rawTitle);
        const safeDesc = SecurityService.sanitizeHTML(rawDesc);

        if (AppState.editingTaskId) {
            const task = AppState.tasks.find(t => t.id === AppState.editingTaskId);
            if (task) {
                task.title = safeTitle;
                task.description = safeDesc;
                // Не меняем goalId при редактировании
            }
            AppState.editingTaskId = null;
        } else {
            AppState.tasks.push({
                id: Date.now(),
                title: safeTitle,
                description: safeDesc,
                history: {},
                goalId: targetGoalId ? parseInt(targetGoalId, 10) : null
            });
        }

        this.saveData();
        this.modalTask.close();
        this.renderAll();
    },

    handleAddGoal(e) {
        e.preventDefault(); // Предотвращаем перезагрузку страницы

        const formData = new FormData(this.formGoal);
        const rawTitle = formData.get('title').trim();
        const rawDesc = formData.get('description').trim();

        if (!rawTitle) return;

        const safeTitle = SecurityService.sanitizeHTML(rawTitle);
        const safeDesc = SecurityService.sanitizeHTML(rawDesc);

        if (AppState.editingGoalId) {
            const goal = AppState.goals.find(g => g.id === AppState.editingGoalId);
            if (goal) {
                goal.title = safeTitle;
                goal.description = safeDesc;
            }
            AppState.editingGoalId = null;
        } else {
            AppState.goals.push({
                id: Date.now(),
                title: safeTitle,
                description: safeDesc
            });
        }

        this.saveData();
        this.modalGoal.close();
        this.renderAll();
    },

    handleDeleteTask() {
        if (AppState.editingTaskId && confirm('Точно удалить эту привычку?')) {
            AppState.tasks = AppState.tasks.filter(t => t.id !== AppState.editingTaskId);
            this.saveData();
            this.modalTask.close();
            this.renderAll();
        }
    },

    handleDeleteGoal() {
        if (AppState.editingGoalId && confirm('Точно удалить эту цель и все её привычки?')) {
            AppState.tasks = AppState.tasks.filter(t => t.goalId !== AppState.editingGoalId);
            AppState.goals = AppState.goals.filter(g => g.id !== AppState.editingGoalId);
            this.saveData();
            this.modalGoal.close();
            this.renderAll();
        }
    },

    toggleTaskHistory(taskId, dateStr) {
        const task = AppState.tasks.find(t => t.id === taskId);
        if (task) {
            if (!task.history) task.history = {};
            // Переключаем статус выполнения для конкретной даты
            task.history[dateStr] = !task.history[dateStr];
            this.saveData();
            this.renderAll(); // Перерисовываем для обновления UI
        }
    },

    // --- VIEW (Отображение) ---
    render() {
        this.renderCalendarHeader();
        this.renderAll();
    },

    renderAll() {
        this.renderDailyTasks();
        this.renderGoals();
    },

    renderCalendarHeader() {
        this.calendarHeader.innerHTML = AppState.dates.map(date => `
            <div class="calendar-day ${date.isToday ? 'current-day' : ''}">
                <span class="day-num">${date.num}</span>
                <span class="day-name">${date.name}</span>
            </div>
        `).join('');
    },

    generateTasksHTML(tasksList) {
        const svgCross = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        const svgCheck = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        const svgEdit = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

        if (tasksList.length === 0) return '';

        return tasksList.map(task => {
            const historyObj = task.history || {};
            const todayStr = AppState.dates[0].dateString;
            const isCompletedToday = historyObj[todayStr];

            return `
            <div class="task-item ${task.description ? 'has-desc' : ''}">
                <div class="task-info">
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
    },

    renderDailyTasks() {
        const dailyTasks = AppState.tasks.filter(t => !t.goalId);

        if (dailyTasks.length === 0) {
            this.tasksList.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted); font-size: 14px;">Нет ежедневных привычек.<br>Нажмите "+" для создания.</div>`;
        } else {
            this.tasksList.innerHTML = this.generateTasksHTML(dailyTasks);
        }
    },

    renderGoals() {
        const svgEdit = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

        if (AppState.goals.length === 0) {
            this.goalsList.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted); font-size: 14px;">Нет целей на год.<br>Нажмите "+" в правом верхнем углу для создания.</div>`;
            return;
        }

        this.goalsList.innerHTML = AppState.goals.map(goal => {
            const goalTasks = AppState.tasks.filter(t => t.goalId === goal.id);
            const tasksHTML = goalTasks.length > 0
                ? this.generateTasksHTML(goalTasks)
                : `<div style="padding: 16px 24px; color: var(--text-muted); font-size: 13px;">В этой цели пока нет привычек.</div>`;

            return `
            <div class="goal-card">
                <div class="goal-header">
                    <div class="goal-header-info">
                        <div class="goal-title">${goal.title}</div>
                        ${goal.description ? `<div class="goal-desc">${goal.description}</div>` : ''}
                    </div>
                    <div class="goal-actions">
                        <button class="btn btn-secondary btn-small add-task-to-goal-btn" data-goal-id="${goal.id}">+ Привычка</button>
                        <button class="icon-btn edit-goal-btn" style="width:32px; height:32px; box-shadow:none;" data-goal-id="${goal.id}">${svgEdit}</button>
                    </div>
                </div>
                <div class="goal-tasks-list">
                    ${tasksHTML}
                </div>
            </div>
            `;
        }).join('');
    }
};

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    PlannerController.init();
});
