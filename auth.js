import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    OAuthProvider,
    signOut,
    sendPasswordResetEmail,
    deleteUser
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import {
    getAnalytics,
    logEvent
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-analytics.js";

// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC0Q6S9X9QxxdEn-kE2nPbK2hgu8n3W8l0",
    authDomain: "habbitplaner.firebaseapp.com",
    projectId: "habbitplaner",
    storageBucket: "habbitplaner.firebasestorage.app",
    messagingSenderId: "387122876340",
    appId: "1:387122876340:web:6e5e23bc0b7e72d8002ce1",
    measurementId: "G-NLY18X613V"
};

// Инициализируем только если конфиг был изменен (предотвращаем падение на дефолтном коде)
let app, auth;
// Убрана проверка, так как мы точно прописали ключи
const isConfigured = true;

if (isConfigured) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
}

// UI Elements
const authScreen = document.getElementById('auth-screen');
const authEmailForm = document.getElementById('auth-email-form');
const inpEmail = document.getElementById('auth-email');
const inpPwd = document.getElementById('auth-pwd');
const errorMsg = document.getElementById('auth-error-msg');
const btnGoogle = document.getElementById('btn-google-login');
const btnApple = document.getElementById('btn-apple-login');
const btnProfile = document.getElementById('btn-profile');

const AUTH_ERROR_MAP = {
    'auth/user-not-found': 'Пользователь не найден',
    'auth/wrong-password': 'Неверный пароль',
    'auth/invalid-credential': 'Неверный email или пароль',
    'auth/email-already-in-use': 'Этот email уже зарегистрирован',
    'auth/weak-password': 'Пароль слишком короткий (минимум 6 символов)',
    'auth/invalid-email': 'Некорректный email',
    'auth/too-many-requests': 'Слишком много попыток. Подождите и попробуйте снова',
    'auth/network-request-failed': 'Ошибка сети. Проверьте подключение к интернету',
    'auth/popup-closed-by-user': 'Окно авторизации было закрыто',
    'auth/cancelled-popup-request': 'Авторизация отменена'
};

function getSafeErrorMessage(error) {
    return AUTH_ERROR_MAP[error.code] || 'Произошла ошибка. Попробуйте снова';
}

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
}

function hideAuth() {
    authScreen.classList.add('hidden');
}

function showAuth() {
    authScreen.classList.remove('hidden');
    btnProfile.style.display = 'none';
    document.getElementById('btn-backgrounds').style.display = 'none';
    if (window.PlannerController && window.appInitialized) {
        window.PlannerController.clearUI();
    }
}

// --- Слушатели ---

// Email & Pass
authEmailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isConfigured) {
        showError("Firebase не настроен! Замените firebaseConfig в auth.js");
        return;
    }

    const email = inpEmail.value.trim();
    const pwd = inpPwd.value.trim();

    try {
        // Пробуем войти
        await signInWithEmailAndPassword(auth, email, pwd);
    } catch (error) {
        // Если пользователя нет, пробуем зарегистрировать
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            try {
                await createUserWithEmailAndPassword(auth, email, pwd);
                trackEvent('sign_up', { method: 'email' });
            } catch (regError) {
                showError(getSafeErrorMessage(regError));
            }
        } else {
            showError(getSafeErrorMessage(error));
        }
    }
});

// Google
btnGoogle.addEventListener('click', async () => {
    if (!isConfigured) return showError("Firebase не настроен!");
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        showError(getSafeErrorMessage(error));
    }
});

// Apple
btnApple.addEventListener('click', async () => {
    if (!isConfigured) return showError("Firebase не настроен!");
    const provider = new OAuthProvider('apple.com');
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        showError(getSafeErrorMessage(error));
    }
});

// --- Analytics ---
let analytics = null;
if (isConfigured) {
    try {
        analytics = getAnalytics(app);
    } catch (e) {
        console.warn("Analytics not available:", e.message);
    }
}

function trackEvent(eventName, params = {}) {
    if (analytics) {
        try { logEvent(analytics, eventName, params); } catch (e) { /* ignore */ }
    }
}

// --- AuthService (доступен из app.js через window.AuthService) ---
window.AuthService = {
    getCurrentUser() {
        return auth ? auth.currentUser : null;
    },

    getProviderName() {
        const user = auth?.currentUser;
        if (!user) return '—';
        const providerId = user.providerData[0]?.providerId;
        if (providerId === 'password') return 'Email';
        if (providerId === 'google.com') return 'Google';
        if (providerId === 'apple.com') return 'Apple';
        return providerId || '—';
    },

    isEmailProvider() {
        const user = auth?.currentUser;
        return user?.providerData[0]?.providerId === 'password';
    },

    async resetPassword() {
        const user = auth?.currentUser;
        if (!user || !user.email) throw new Error('Нет email для сброса');
        await sendPasswordResetEmail(auth, user.email);
        trackEvent('password_reset_sent');
    },

    async deleteAccount() {
        const user = auth?.currentUser;
        if (!user) throw new Error('Пользователь не авторизован');
        await window.DB.deleteAllUserData();
        await deleteUser(user);
        trackEvent('account_deleted');
    },

    async logout() {
        if (auth) {
            trackEvent('logout');
            await signOut(auth);
        }
        showAuth();
    },

    trackEvent
};

// Firebase Auth State Observer
if (isConfigured) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Успешный вход
            console.log("Logged in as:", user.email || user.uid);

            // Инициализация базы данных
            if (window.DB) {
                window.DB.init(app, user);

                // --- Логика Премиума (7 дней триал) ---
                const creationTime = new Date(user.metadata.creationTime);
                const now = new Date();
                const diffTime = Math.abs(now - creationTime);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Если прошло больше 7 дней, триал окончен
                const isPremiumExpired = diffDays > 7;

                // Загружаем данные из БД
                const tasks = await window.DB.getTasks();
                const goals = await window.DB.getGoals();
                const notes = await window.DB.getNotes();
                const backgroundId = await window.DB.getBackground();

                // Передаем в контроллер
                if (window.PlannerController) {
                    window.PlannerController.initFromDB(tasks, goals, isPremiumExpired, notes, backgroundId);
                }
            }

            hideAuth();
            btnProfile.style.display = 'flex';
            document.getElementById('btn-backgrounds').style.display = 'flex';
            trackEvent('login', { method: user.providerData[0]?.providerId || 'unknown' });
        } else {
            // Не залогинен
            showAuth();
        }
    });
} else {
    // Ждем, пока пользователь настроит Firebase
    console.warn("Firebase is not configured yet. Application is locked.");
}
