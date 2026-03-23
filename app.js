/**
 * @fileoverview Контроллер и Состояние приложения.
 */

// --- BACKGROUNDS (Темы оформления) ---
const BACKGROUNDS = [
    { id: 'default', name: 'Стандартный', colors: { '--bg-color': '#F4F6F9', '--surface-color': '#FFFFFF', '--text-main': '#1A1D20', '--text-muted': '#8A92A0', '--border-color': '#E2E6EA' }, premium: false },
    { id: 'dark', name: 'Тёмный', colors: { '--bg-color': '#1A1D20', '--surface-color': '#2C2F33', '--text-main': '#E4E6EB', '--text-muted': '#8A92A0', '--border-color': '#3A3D42' }, premium: false },
    { id: 'ocean', name: 'Океан', colors: { '--bg-color': '#E3F2FD', '--surface-color': '#FFFFFF', '--text-main': '#0D47A1', '--text-muted': '#5C6BC0', '--border-color': '#BBDEFB' }, premium: true },
    { id: 'forest', name: 'Лес', colors: { '--bg-color': '#E8F5E9', '--surface-color': '#FFFFFF', '--text-main': '#1B5E20', '--text-muted': '#4CAF50', '--border-color': '#C8E6C9' }, premium: true },
    { id: 'sunset', name: 'Закат', colors: { '--bg-color': '#FBE9E7', '--surface-color': '#FFFFFF', '--text-main': '#BF360C', '--text-muted': '#FF7043', '--border-color': '#FFCCBC' }, premium: true },
    { id: 'midnight', name: 'Полночь', colors: { '--bg-color': '#0D1B2A', '--surface-color': '#1B2838', '--text-main': '#E0E1DD', '--text-muted': '#778DA9', '--border-color': '#2A3A4A' }, premium: true }
];

// --- MODEL (Состояние) ---
const AppState = {
    tasks: [],
    goals: [],
    dates: [], // Последние 5 дней
    activeTab: 'daily', // 'daily' | 'goals'
    editingTaskId: null,
    editingGoalId: null,
    isPremiumExpired: false, // Подтягивается из базы
    notes: '',
    backgroundId: 'default'
};

// --- CONTROLLER / МЕТОДЫ ---
const PlannerController = {
    // В старой логике вызывалось просто init(), теперь ждем загрузки данных из Firebase
    initFromDB(tasks, goals, isPremiumExpired = false, notes = '', backgroundId = 'default') {
        // Санитизация данных из Firestore (защита от Stored XSS)
        AppState.tasks = (tasks || []).map(t => ({
            ...t,
            title: SecurityService.sanitizeHTML(t.title || ''),
            description: SecurityService.sanitizeHTML(t.description || '')
        }));
        AppState.goals = (goals || []).map(g => ({
            ...g,
            title: SecurityService.sanitizeHTML(g.title || ''),
            description: SecurityService.sanitizeHTML(g.description || '')
        }));
        AppState.isPremiumExpired = isPremiumExpired;
        AppState.notes = notes || '';

        this.generateDates();
        this.cacheDOM();
        this.bindEvents();
        this.applyBackground(backgroundId);
        this.render();
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

        // Modal Stats
        this.modalStats = document.getElementById('modal-statistics');
        this.statsTitle = document.getElementById('stats-title');
        this.statsContent = document.getElementById('stats-content');

        // Modal Paywall
        this.modalPaywall = document.getElementById('modal-paywall');
        this.btnPaywallBuy = this.modalPaywall.querySelector('.btn-paywall-buy');
        this.btnPaywallLater = this.modalPaywall.querySelector('.btn-paywall-later');

        // Modal Notes
        this.modalNotes = document.getElementById('modal-notes');
        this.notesTextarea = document.getElementById('notes-textarea');
        this.btnNotes = document.getElementById('btn-notes');

        // Modal Backgrounds
        this.modalBackgrounds = document.getElementById('modal-backgrounds');
        this.btnBackgrounds = document.getElementById('btn-backgrounds');

        // Modal Profile
        this.modalProfile = document.getElementById('modal-profile');
        this.btnProfile = document.getElementById('btn-profile');
        this.modalDeleteConfirm = document.getElementById('modal-delete-confirm');

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

        // Закрытие модалки статистики по клику на backdrop
        this.modalStats.addEventListener('click', (e) => {
            if (e.target === this.modalStats) {
                this.modalStats.close();
            }
        });

        // Paywall modal handlers
        this.btnPaywallBuy.addEventListener('click', () => {
            alert('Функция оплаты будет доступна в следующем обновлении');
        });
        this.btnPaywallLater.addEventListener('click', () => {
            this.modalPaywall.close();
        });
        this.modalPaywall.addEventListener('click', (e) => {
            if (e.target === this.modalPaywall) {
                this.modalPaywall.close();
            }
        });

        // Notes modal handlers
        this.btnNotes.addEventListener('click', () => this.openNotesModal());
        document.getElementById('btn-notes-save').addEventListener('click', () => this.saveNotes());
        document.getElementById('btn-notes-close').addEventListener('click', () => this.modalNotes.close());
        this.modalNotes.addEventListener('click', (e) => {
            if (e.target === this.modalNotes) {
                this.modalNotes.close();
            }
        });

        // Profile modal handlers
        this.btnProfile.addEventListener('click', () => this.openProfileModal());
        document.getElementById('btn-profile-close').addEventListener('click', () => this.modalProfile.close());
        document.getElementById('btn-profile-logout').addEventListener('click', () => {
            this.modalProfile.close();
            if (window.AuthService) window.AuthService.logout();
        });
        document.getElementById('btn-reset-password').addEventListener('click', () => this.handleResetPassword());
        document.getElementById('btn-delete-account').addEventListener('click', () => {
            this.modalDeleteConfirm.showModal();
        });
        document.getElementById('btn-delete-cancel').addEventListener('click', () => {
            this.modalDeleteConfirm.close();
        });
        document.getElementById('btn-delete-confirm').addEventListener('click', () => this.handleDeleteAccount());
        this.modalProfile.addEventListener('click', (e) => {
            if (e.target === this.modalProfile) this.modalProfile.close();
        });
        this.modalDeleteConfirm.addEventListener('click', (e) => {
            if (e.target === this.modalDeleteConfirm) this.modalDeleteConfirm.close();
        });

        // Backgrounds modal handlers
        this.btnBackgrounds.addEventListener('click', () => this.openBackgroundsModal());
        document.getElementById('btn-backgrounds-close').addEventListener('click', () => this.modalBackgrounds.close());
        this.modalBackgrounds.addEventListener('click', (e) => {
            if (e.target === this.modalBackgrounds) {
                this.modalBackgrounds.close();
            }
        });

        // Делегирование событий (история, редактирование)
        const handleItemsClick = (e) => {
            const historyIcon = e.target.closest('.history-icon');
            if (historyIcon) {
                const taskId = historyIcon.dataset.taskId;
                const dateStr = historyIcon.dataset.date;
                this.toggleTaskHistory(taskId, dateStr, historyIcon);
                return;
            }

            const editBtn = e.target.closest('.edit-btn');
            if (editBtn) {
                const taskId = editBtn.dataset.taskId;
                this.openTaskModal(taskId);
                return;
            }

            const editGoalBtn = e.target.closest('.edit-goal-btn');
            if (editGoalBtn) {
                const goalId = editGoalBtn.dataset.goalId;
                this.openGoalModal(goalId);
                return;
            }

            const addTaskToGoalBtn = e.target.closest('.add-task-to-goal-btn');
            if (addTaskToGoalBtn) {
                const goalId = addTaskToGoalBtn.dataset.goalId;
                this.openTaskModal(null, goalId);
                return;
            }

            const taskTitle = e.target.closest('.task-title');
            if (taskTitle) {
                const taskItem = taskTitle.closest('.task-item');
                const editBtn = taskItem.querySelector('.edit-btn');
                const taskId = editBtn.dataset.taskId;
                this.openStatisticsModal('task', taskId);
                return;
            }

            const goalInfo = e.target.closest('.goal-header-info');
            if (goalInfo) {
                const goalCard = goalInfo.closest('.goal-card');
                const editGoal = goalCard.querySelector('.edit-goal-btn');
                const goalId = editGoal.dataset.goalId;
                this.openStatisticsModal('goal', goalId);
                return;
            }
        };

        this.tasksList.addEventListener('click', handleItemsClick);
        this.goalsList.addEventListener('click', handleItemsClick);
    },

    showPaywall() {
        this.modalPaywall.showModal();
        this.trackEvent('paywall_shown');
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
            const task = AppState.tasks.find(t => String(t.id) === String(taskId));
            if (task) {
                AppState.editingTaskId = task.id;
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
            const goal = AppState.goals.find(g => String(g.id) === String(goalId));
            if (goal) {
                AppState.editingGoalId = goal.id;
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

        // Проверка Premium
        if (AppState.isPremiumExpired) {
            this.showPaywall();
            return;
        }

        const formData = new FormData(this.formTask);
        const rawTitle = formData.get('title').trim();
        const rawDesc = formData.get('description').trim();
        const targetGoalId = formData.get('targetGoalId');

        if (!rawTitle) return;

        const safeTitle = SecurityService.sanitizeHTML(rawTitle);
        const safeDesc = SecurityService.sanitizeHTML(rawDesc);

        let taskConfig;

        if (AppState.editingTaskId) {
            const task = AppState.tasks.find(t => String(t.id) === String(AppState.editingTaskId));
            if (task) {
                task.title = safeTitle;
                task.description = safeDesc;
                taskConfig = task;
            }
            AppState.editingTaskId = null;
        } else {
            taskConfig = {
                id: String(Date.now()),
                title: safeTitle,
                description: safeDesc,
                history: {},
                goalId: targetGoalId || null
            };
            AppState.tasks.push(taskConfig);
            this.trackEvent('habit_created');
        }

        // Сохранение в Firebase
        if (window.DB && taskConfig) {
            window.DB.saveTask(taskConfig);
        }

        this.modalTask.close();
        this.renderAll();
    },

    handleAddGoal(e) {
        e.preventDefault(); // Предотвращаем перезагрузку страницы

        // Проверка Premium
        if (AppState.isPremiumExpired) {
            this.showPaywall();
            return;
        }

        const formData = new FormData(this.formGoal);
        const rawTitle = formData.get('title').trim();
        const rawDesc = formData.get('description').trim();

        if (!rawTitle) return;

        const safeTitle = SecurityService.sanitizeHTML(rawTitle);
        const safeDesc = SecurityService.sanitizeHTML(rawDesc);

        let goalConfig;
        if (AppState.editingGoalId) {
            const goal = AppState.goals.find(g => String(g.id) === String(AppState.editingGoalId));
            if (goal) {
                goal.title = safeTitle;
                goal.description = safeDesc;
                goalConfig = goal;
            }
            AppState.editingGoalId = null;
        } else {
            goalConfig = {
                id: String(Date.now()),
                title: safeTitle,
                description: safeDesc
            };
            AppState.goals.push(goalConfig);
            this.trackEvent('goal_created');
        }

        // Сохранение в Firebase
        if (window.DB && goalConfig) {
            window.DB.saveGoal(goalConfig);
        }

        this.modalGoal.close();
        this.renderAll();
    },

    handleDeleteTask() {
        if (AppState.isPremiumExpired) {
            this.showPaywall();
            return;
        }

        if (AppState.editingTaskId && confirm('Точно удалить эту привычку?')) {
            AppState.tasks = AppState.tasks.filter(t => String(t.id) !== String(AppState.editingTaskId));

            if (window.DB) {
                window.DB.deleteTask(AppState.editingTaskId);
            }

            this.modalTask.close();
            this.renderAll();
        }
    },

    handleDeleteGoal() {
        if (AppState.isPremiumExpired) {
            this.showPaywall();
            return;
        }

        if (AppState.editingGoalId && confirm('Точно удалить эту цель и все её привычки?')) {
            // Сначала удаляем все связанные привычки в Firebase
            const tasksToDelete = AppState.tasks.filter(t => String(t.goalId) === String(AppState.editingGoalId));
            if (window.DB) {
                window.DB.deleteGoal(AppState.editingGoalId);
                tasksToDelete.forEach(t => window.DB.deleteTask(t.id));
            }

            AppState.tasks = AppState.tasks.filter(t => String(t.goalId) !== String(AppState.editingGoalId));
            AppState.goals = AppState.goals.filter(g => String(g.id) !== String(AppState.editingGoalId));

            this.modalGoal.close();
            this.renderAll();
        }
    },

    toggleTaskHistory(taskId, dateStr, element = null) {
        if (AppState.isPremiumExpired) {
            this.showPaywall();
            return;
        }

        const task = AppState.tasks.find(t => String(t.id) === String(taskId));
        if (task) {
            if (!task.history) task.history = {};
            const isNowCompleted = !task.history[dateStr];
            task.history[dateStr] = isNowCompleted;

            if (isNowCompleted) {
                this.trackEvent('habit_completed');
            }

            // Обновляем в Firebase
            if (window.DB) {
                window.DB.saveTask(task);
            }

            if (element) {
                const svgCross = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
                const svgCheck = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

                element.innerHTML = isNowCompleted ? svgCheck : svgCross;
                element.classList.toggle('checked', isNowCompleted);
            } else {
                this.renderAll(); // Fallback если элемент не передан
            }
        }
    },

    getTaskStats(history) {
        history = history || {};
        const dates = Object.keys(history).filter(d => history[d]);
        const total = dates.length;

        const today = new Date();
        const yearStr = today.getFullYear();
        const monthStr = String(today.getMonth() + 1).padStart(2, '0');
        const currentMonthPrefix = `${yearStr}-${monthStr}`;

        let monthCount = 0;
        dates.forEach(d => {
            if (d.startsWith(currentMonthPrefix)) monthCount++;
        });

        // Calculate streak (сегодняшний день не ломает стрик — день ещё не закончен)
        let streak = 0;
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // Если сегодня отмечен — считаем его
        if (history[todayStr]) {
            streak = 1;
        }

        // Считаем назад начиная со вчера
        for (let i = 1; i < 365; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            if (history[dateStr]) {
                streak++;
            } else {
                break;
            }
        }

        return { total, monthCount, streak };
    },

    openStatisticsModal(type, id) {
        let title = '';
        let statsHTML = '';

        const renderRing = (percent) => `
            <div class="progress-ring-container">
                <svg class="progress-ring" viewBox="0 0 100 100">
                    <circle class="progress-ring-circle-bg" cx="50" cy="50" r="40"></circle>
                    <circle class="progress-ring-circle" cx="50" cy="50" r="40" stroke-dasharray="251.2" stroke-dashoffset="${251.2 - (percent / 100 * 251.2)}"></circle>
                </svg>
                <div class="progress-ring-text">${Math.round(percent)}%</div>
            </div>`;

        if (type === 'task') {
            const task = AppState.tasks.find(t => String(t.id) === String(id));
            if (!task) return;
            title = task.title;
            const stats = this.getTaskStats(task.history);

            // Assume month has ~30 days for visual progress
            const monthPercent = Math.min(100, (stats.monthCount / 30) * 100);

            statsHTML = `
                <div class="stats-grid">
                    <div class="stat-card full-width">
                        ${renderRing(monthPercent)}
                        <div>
                            <div class="stat-value">${stats.monthCount}</div>
                            <div class="stat-label">Выполнено в этом месяце</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.total}</div>
                        <div class="stat-label">Всего раз</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.streak}</div>
                        <div class="stat-label">Дней подряд</div>
                    </div>
                </div>
            `;
        } else if (type === 'goal') {
            const goal = AppState.goals.find(g => String(g.id) === String(id));
            if (!goal) return;
            title = goal.title;

            const goalTasks = AppState.tasks.filter(t => String(t.goalId) === String(id));
            let totalMonthCount = 0;
            let overallTotal = 0;
            let currentStrks = 0;

            goalTasks.forEach(t => {
                const s = this.getTaskStats(t.history);
                totalMonthCount += s.monthCount;
                overallTotal += s.total;
                currentStrks = Math.max(currentStrks, s.streak);
            });

            const tasksCount = goalTasks.length;
            const expectedMonthTotal = tasksCount * 30 || 1; // Default to 1 to avoid div by zero
            const monthPercent = Math.min(100, (totalMonthCount / expectedMonthTotal) * 100);

            statsHTML = `
                <div class="stats-grid">
                    <div class="stat-card full-width">
                        ${renderRing(monthPercent)}
                        <div>
                            <div class="stat-value">${totalMonthCount}</div>
                            <div class="stat-label">Действий за месяц</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${overallTotal}</div>
                        <div class="stat-label">Всего действий</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${tasksCount}</div>
                        <div class="stat-label">Привычек в цели</div>
                    </div>
                </div>
            `;
        }

        this.statsTitle.textContent = title;
        this.statsContent.innerHTML = statsHTML;
        this.modalStats.showModal();
    },

    // --- VIEW (Отображение) ---
    render() {
        this.renderCalendarHeader();
        this.renderAll();
    },

    renderAll() {
        this.renderDailyTasks();
        this.renderGoals();

        // Premium lock — toggle CSS class
        const appContainer = document.querySelector('.app-container');
        if (AppState.isPremiumExpired) {
            appContainer.classList.add('premium-locked');
        } else {
            appContainer.classList.remove('premium-locked');
        }

        // Premium banner
        let banner = document.getElementById('premium-banner');
        if (AppState.isPremiumExpired) {
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'premium-banner';
                banner.className = 'premium-banner';
                banner.innerHTML = 'Пробный период истёк. <button class="btn-text" id="btn-banner-upgrade">Перейти на Premium</button>';
                document.querySelector('.app-container').insertBefore(banner, document.querySelector('.header').nextSibling);
                document.getElementById('btn-banner-upgrade').addEventListener('click', () => this.showPaywall());
            }
        } else if (banner) {
            banner.remove();
        }
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

            const stats = PlannerController.getTaskStats(historyObj);

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
            const goalTasks = AppState.tasks.filter(t => String(t.goalId) === String(goal.id));
            const tasksHTML = goalTasks.length > 0
                ? this.generateTasksHTML(goalTasks)
                : `<div style="padding: 16px 24px; color: var(--text-muted); font-size: 13px;">В этой цели пока нет привычек.</div>`;

            return `
            <div class="goal-card">
                <div class="goal-header">
                    <div class="goal-header-info" style="cursor: pointer;" title="Показать статистику по цели">
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
    },

    openBackgroundsModal() {
        const grid = document.getElementById('backgrounds-grid');
        const currentBgId = AppState.backgroundId || 'default';

        grid.innerHTML = BACKGROUNDS.map(bg => {
            const isActive = bg.id === currentBgId;
            const lockIcon = bg.premium ? '<span class="bg-lock">🔒</span>' : '';
            return `
                <div class="bg-card ${isActive ? 'active' : ''}" data-bg-id="${bg.id}">
                    <div class="bg-preview" style="background-color: ${bg.colors['--bg-color']};">
                        <div class="bg-preview-surface" style="background-color: ${bg.colors['--surface-color']}; color: ${bg.colors['--text-main']};">Aa</div>
                    </div>
                    <div class="bg-name">${bg.name} ${lockIcon}</div>
                </div>
            `;
        }).join('');

        // Delegate click
        grid.onclick = (e) => {
            const card = e.target.closest('.bg-card');
            if (card) this.selectBackground(card.dataset.bgId);
        };

        this.modalBackgrounds.showModal();
    },

    selectBackground(bgId) {
        const bg = BACKGROUNDS.find(b => b.id === bgId);
        if (!bg) return;

        if (bg.premium && AppState.isPremiumExpired) {
            this.showPaywall();
            return;
        }

        // Apply colors
        const root = document.documentElement;
        Object.entries(bg.colors).forEach(([prop, value]) => {
            root.style.setProperty(prop, value);
        });

        // Update color-scheme for dark themes
        const isDark = bg.id === 'dark' || bg.id === 'midnight';
        root.style.setProperty('color-scheme', isDark ? 'dark' : 'light');

        // Update theme-color meta tag
        document.querySelector('meta[name="theme-color"]').setAttribute('content', bg.colors['--bg-color']);

        AppState.backgroundId = bgId;

        // Save to DB
        if (window.DB) {
            window.DB.saveBackground(bgId);
        }
        this.trackEvent('background_changed', { background: bgId });

        // Update active state in modal
        this.openBackgroundsModal();
    },

    applyBackground(bgId) {
        const bg = BACKGROUNDS.find(b => b.id === bgId);
        if (!bg) return;

        const root = document.documentElement;
        Object.entries(bg.colors).forEach(([prop, value]) => {
            root.style.setProperty(prop, value);
        });

        // Update color-scheme for dark themes
        const isDark = bg.id === 'dark' || bg.id === 'midnight';
        root.style.setProperty('color-scheme', isDark ? 'dark' : 'light');

        document.querySelector('meta[name="theme-color"]').setAttribute('content', bg.colors['--bg-color']);
        AppState.backgroundId = bgId;
    },

    openNotesModal() {
        this.notesTextarea.value = AppState.notes || '';
        this.modalNotes.showModal();
    },

    saveNotes() {
        const text = this.notesTextarea.value;
        AppState.notes = text;
        if (window.DB) {
            window.DB.saveNotes(text);
        }
        this.modalNotes.close();
        this.trackEvent('notes_saved');
    },

    // --- Профиль ---

    openProfileModal() {
        const user = window.AuthService?.getCurrentUser();
        document.getElementById('profile-email').textContent = user?.email || '—';
        document.getElementById('profile-provider').textContent = window.AuthService?.getProviderName() || '—';

        const btnReset = document.getElementById('btn-reset-password');
        btnReset.style.display = window.AuthService?.isEmailProvider() ? 'flex' : 'none';

        document.getElementById('profile-status-msg').style.display = 'none';
        this.modalProfile.showModal();
    },

    async handleResetPassword() {
        const statusMsg = document.getElementById('profile-status-msg');
        try {
            await window.AuthService.resetPassword();
            statusMsg.textContent = 'Письмо для сброса пароля отправлено на вашу почту';
            statusMsg.className = 'profile-status-msg profile-status-success';
            statusMsg.style.display = 'block';
        } catch (e) {
            statusMsg.textContent = 'Ошибка: ' + e.message;
            statusMsg.className = 'profile-status-msg profile-status-error';
            statusMsg.style.display = 'block';
        }
    },

    async handleDeleteAccount() {
        const statusMsg = document.getElementById('profile-status-msg');
        try {
            this.modalDeleteConfirm.close();
            await window.AuthService.deleteAccount();
            this.modalProfile.close();
        } catch (e) {
            this.modalDeleteConfirm.close();
            if (e.code === 'auth/requires-recent-login') {
                statusMsg.textContent = 'Для удаления аккаунта нужно перелогиниться. Выйдите и войдите снова.';
            } else {
                statusMsg.textContent = 'Ошибка удаления аккаунта. Попробуйте позже.';
            }
            statusMsg.className = 'profile-status-msg profile-status-error';
            statusMsg.style.display = 'block';
        }
    },

    // --- Analytics helper ---

    trackEvent(eventName, params = {}) {
        if (window.AuthService?.trackEvent) {
            window.AuthService.trackEvent(eventName, params);
        }
    },

    // Метод для очистки данных интерфейса (при выходе из аккаунта)
    clearUI() {
        AppState.tasks = [];
        AppState.goals = [];
        AppState.isPremiumExpired = false;
        AppState.notes = '';
        AppState.backgroundId = 'default';
        this.applyBackground('default');
        this.renderAll();
    }
};

// Экспортируем в window для вызова из auth.js
// Приложение теперь не стартует само, а ждет команды от модуля аутентификации
window.PlannerController = PlannerController;
