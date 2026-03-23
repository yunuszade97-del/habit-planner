# CLAUDE.md — Инструкции для ИИ-агентов

## Проект
Habit Planner — mobile-first веб-приложение для трекинга привычек и целей на год.

## Стек
- **Frontend:** Vanilla JS (ES6+), HTML5, CSS3 — без фреймворков
- **Backend:** Firebase Authentication + Cloud Firestore
- **SDK:** Firebase v11.4.0 (CDN)

## Структура файлов
| Файл | Тип | Назначение |
|------|-----|------------|
| `index.html` | HTML | Разметка, подключение скриптов |
| `app.js` | Обычный скрипт | Контроллер, AppState, рендер, бизнес-логика |
| `auth.js` | ES module | Firebase Auth, управление экраном входа |
| `db.js` | ES module | CRUD операции с Firestore |
| `security.js` | Обычный скрипт | XSS-санитизация |
| `styles.css` | CSS | Все стили (mobile-first, max-width: 480px) |

## Порядок загрузки скриптов
`security.js` → `db.js` → `auth.js` → `app.js` (все с `defer`)

## Поток данных
`auth.js` (логин) → `db.js` (загрузка) → `app.js` (`initFromDB(tasks, goals, isPremiumExpired, notes, backgroundId)`)

## Критичные правила

### ID — всегда строки
- Создание: `String(Date.now())`
- Сравнения: `String(a) === String(b)`
- Firestore `doc.id` возвращает строку — никогда не использовать `parseInt` для ID

### XSS-защита
- Все пользовательские данные проходят через `SecurityService.sanitizeHTML()` перед вставкой в DOM
- Никогда не вставлять `innerHTML` с непроверенными данными

### Firestore
- Коллекции: `tasks/{taskId}`, `goals/{goalId}`, `users/{userId}` (notes, backgroundId)
- Все документы содержат `userId` для изоляции данных
- **Security Rules** — файл `firestore.rules` создан, нужно применить в Firebase Console

### Модули
- `db.js` и `auth.js` — ES modules (`import`/`export`)
- `app.js` и `security.js` — обычные скрипты (глобальные объекты через `window.*`)
- Взаимодействие через `window.PlannerController`, `window.DB`, `window.SecurityService`, `window.AuthService`

## Архитектура UI
- Глобальное состояние: объект `AppState` в `app.js`
- Рендер: `innerHTML` с template literals
- Модалки: `<dialog>` элементы, `.showModal()` / `.close()`
- События: делегирование через `closest()` + `data-*` атрибуты

## Текущий статус
- Фазы 1-3: завершены (MVP, Auth, Firestore, Premium Lock, Paywall, Notes, Backgrounds)
- Firestore Security Rules: создан файл `firestore.rules` (нужно применить в Firebase Console)
- Фаза 4 (Биллинг): отложена
- Фаза 5.1 (Профиль): завершено — модалка, сброс пароля, удаление аккаунта (GDPR), `window.AuthService`
- Фаза 5.2 (Аналитика): завершено — Firebase Analytics, трекинг событий
- Фаза 5.3 (Онбординг): запланировано
- Фаза 5.4 (PWA): запланировано
- Подробности: см. `ROADMAP.md`
