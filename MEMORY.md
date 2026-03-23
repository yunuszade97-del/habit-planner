# Project Memory

## Текущее состояние
- Фазы 1-3 завершены. Приложение полностью функционально с аутентификацией, облачной синхронизацией, премиум-системой, заметками и темами оформления.
- Следующий шаг — Фаза 4 (Биллинг).

## Архитектура
- **Поток:** `auth.js` (логин) → `db.js` (Firestore) → `app.js` (`initFromDB(tasks, goals, isPremiumExpired, notes, backgroundId)`)
- **Все ID — строки.** Сравнения через `String(a) === String(b)`.
- **Модули:** `db.js`, `auth.js` — ES modules; `app.js`, `security.js` — обычные скрипты.

## Реализованные фичи
- **Фаза 1:** MVP — привычки, цели, календарь 5 дней, стрики, статистика с кольцевыми диаграммами
- **Фаза 2:** Firebase Auth (Email/Google/Apple), Cloud Firestore, изоляция данных по uid
- **Фаза 3:**
  - Paywall UI — модалка с короной, списком преимуществ, кнопкой покупки (заглушка)
  - Заметки — кнопка 📝, модалка с textarea, сохранение в `users/{uid}`
  - Premium Lock — CSS `.premium-locked` + JS-проверки + баннер
  - Фоны — 6 тем (2 free, 4 premium), модалка выбора, сохранение в Firestore

## Firestore структура
- `tasks/{taskId}` — привычки (с `userId`, `history`, `goalId`)
- `goals/{goalId}` — цели (с `userId`)
- `users/{userId}` — `notes`, `backgroundId`

## Исправления (Март 2026)
- Дубликат CSS, вызов несуществующего `init()`, типы ID (число→строка), `clearUI()`, стрик-логика, backdrop модалки, `method="dialog"`
