import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    writeBatch
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

class DatabaseService {
    constructor() {
        this.db = null;
        this.userId = null;
    }

    // Инициализация базы данных (вызывается из auth.js после успешного логина)
    init(app, user) {
        this.db = getFirestore(app);
        this.userId = user.uid;
        console.log("DB initialized for user:", this.userId);
    }

    // Проверка инициализации
    checkInit() {
        if (!this.db || !this.userId) {
            console.error("Database is not initialized or user is not logged in!");
            return false;
        }
        return true;
    }

    // --- Привычки (Tasks) ---

    // Скачать все привычки пользователя
    async getTasks() {
        if (!this.checkInit()) return [];
        try {
            const q = query(collection(this.db, "tasks"), where("userId", "==", this.userId));
            const querySnapshot = await getDocs(q);
            const tasks = [];
            querySnapshot.forEach((doc) => {
                tasks.push({ id: doc.id, ...doc.data() });
            });
            return tasks;
        } catch (e) {
            console.error("Error getting tasks: ", e);
            return [];
        }
    }

    // Сохранить или обновить привычку
    // Обратите внимание: id привычки используется как ID документа в Firestore (для удобства апдейтов)
    async saveTask(taskConfig) {
        if (!this.checkInit()) return;
        try {
            // Добавляем userId к данным задачи
            const taskData = { ...taskConfig, userId: this.userId };
            // Используем id как ключ документа (преобразуем в строку)
            const docRef = doc(this.db, "tasks", String(taskConfig.id));
            await setDoc(docRef, taskData);
        } catch (e) {
            console.error("Error saving task: ", e);
        }
    }

    // Удалить привычку
    async deleteTask(taskId) {
        if (!this.checkInit()) return;
        try {
            await deleteDoc(doc(this.db, "tasks", String(taskId)));
        } catch (e) {
            console.error("Error deleting task: ", e);
        }
    }

    // --- Цели (Goals) ---

    // Скачать все цели пользователя
    async getGoals() {
        if (!this.checkInit()) return [];
        try {
            const q = query(collection(this.db, "goals"), where("userId", "==", this.userId));
            const querySnapshot = await getDocs(q);
            const goals = [];
            querySnapshot.forEach((doc) => {
                goals.push({ id: doc.id, ...doc.data() });
            });
            return goals;
        } catch (e) {
            console.error("Error getting goals: ", e);
            return [];
        }
    }

    // Сохранить или обновить цель
    async saveGoal(goalConfig) {
        if (!this.checkInit()) return;
        try {
            const goalData = { ...goalConfig, userId: this.userId };
            const docRef = doc(this.db, "goals", String(goalConfig.id));
            await setDoc(docRef, goalData);
        } catch (e) {
            console.error("Error saving goal: ", e);
        }
    }

    // Удалить цель
    async deleteGoal(goalId) {
        if (!this.checkInit()) return;
        try {
            await deleteDoc(doc(this.db, "goals", String(goalId)));
        } catch (e) {
            console.error("Error deleting goal: ", e);
        }
    }

    // --- Заметки (Notes) ---

    // Сохранить заметки пользователя
    async saveNotes(text) {
        if (!this.checkInit()) return;
        try {
            const docRef = doc(this.db, "users", this.userId);
            await setDoc(docRef, { notes: text }, { merge: true });
        } catch (e) {
            console.error("Error saving notes: ", e);
        }
    }

    // Получить заметки пользователя
    async getNotes() {
        if (!this.checkInit()) return '';
        try {
            const docRef = doc(this.db, "users", this.userId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data().notes || '';
            }
            return '';
        } catch (e) {
            console.error("Error getting notes: ", e);
            return '';
        }
    }

    // --- Фон (Background) ---

    // Сохранить выбранный фон
    async saveBackground(bgId) {
        if (!this.checkInit()) return;
        try {
            const docRef = doc(this.db, "users", this.userId);
            await setDoc(docRef, { backgroundId: bgId }, { merge: true });
        } catch (e) {
            console.error("Error saving background: ", e);
        }
    }

    // --- Удаление всех данных пользователя (GDPR) ---

    async deleteAllUserData() {
        if (!this.checkInit()) return;
        try {
            const tasks = await this.getTasks();
            const goals = await this.getGoals();
            const batch = writeBatch(this.db);
            for (const t of tasks) {
                batch.delete(doc(this.db, "tasks", String(t.id)));
            }
            for (const g of goals) {
                batch.delete(doc(this.db, "goals", String(g.id)));
            }
            batch.delete(doc(this.db, "users", this.userId));
            await batch.commit();
            console.log("All user data deleted for:", this.userId);
        } catch (e) {
            console.error("Error deleting all user data: ", e);
            throw e;
        }
    }

    // Получить выбранный фон
    async getBackground() {
        if (!this.checkInit()) return 'default';
        try {
            const docRef = doc(this.db, "users", this.userId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data().backgroundId || 'default';
            }
            return 'default';
        } catch (e) {
            console.error("Error getting background: ", e);
            return 'default';
        }
    }
}

// Экспортируем глобальный экземпляр
window.DB = new DatabaseService();
