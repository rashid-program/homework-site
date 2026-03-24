---
name: Полный анализ проекта конструктора заданий ОГЭ
description: Исчерпывающее описание архитектуры, стека, всех страниц, API, БД и как запускать
type: project
---

# Конструктор заданий ОГЭ — Математика

## Суть проекта

Веб-приложение для учителей/учеников. Позволяет:
1. Составить вариант ОГЭ по математике — выбрать количество заданий каждого из 25 типов
2. Решить вариант онлайн прямо в браузере
3. Скачать вариант (с заданиями и/или ключом ответов) в PDF
4. Добавлять новые задания через панель администратора (с загрузкой изображений)

---

## Технологический стек

| Слой | Технология |
|------|-----------|
| Frontend | HTML5 + Vanilla JS (ES6+) |
| Стили | Tailwind CSS via CDN |
| Шрифт | Montserrat (Google Fonts) |
| Backend | Node.js + Express (ES modules) |
| ORM | Prisma |
| БД | SQLite (`server/prisma/dev.db`) |
| Загрузка файлов | Multer (до 15 МБ) |
| PDF генерация | Puppeteer (headless Chrome) |
| Скриншоты | Puppeteer (`screenshot.mjs`) |

---

## Структура файлов

```
Сайт для ДЗ/
├── index.html           ← Главная: конструктор вариантов
├── admin.html           ← Добавление заданий + загрузка фото
├── variant.html         ← Просмотр/решение варианта + скачать PDF
├── pdf-template.html    ← Шаблон для генерации PDF (Puppeteer открывает его)
├── serve.mjs            ← Простой HTTP сервер (только статика, без API)
├── screenshot.mjs       ← Скриншот через Puppeteer → ./temporary screenshots/
├── CLAUDE.md
├── .gitignore
│
└── server/
    ├── server.js                        ← Express точка входа (порт 3000)
    ├── package.json
    ├── .env                             ← DATABASE_URL и др.
    ├── uploads/                         ← Сохранённые изображения заданий
    ├── prisma/
    │   ├── schema.prisma                ← Схема БД (2 модели)
    │   ├── dev.db                       ← SQLite база данных
    │   └── seed.js                      ← Заполнение 25 типов заданий
    └── src/
        ├── middleware/
        │   └── errorHandler.js          ← Централизованная обработка ошибок
        └── routes/
            ├── taskTypes.js             ← GET /api/task-types
            ├── tasks.js                 ← CRUD /api/tasks
            ├── upload.js                ← POST /api/upload
            └── export.js                ← POST /api/export/pdf
```

---

## Запуск

### Основной способ (с API и БД)
```bash
cd server
node server.js         # или: npm run dev (с nodemon)
```
Сервер поднимается на `http://localhost:3000` и раздаёт и фронт, и API.

### Только статика (без API)
```bash
node serve.mjs         # только index.html и co., без /api
```

### Проверка доступности
```bash
curl http://localhost:3000/api/health
# → {"success":true,"message":"OK"}
```

---

## Страницы

### `index.html` — Конструктор
- Отображает все 25 типов заданий (19 в части 1, 6 в части 2)
- Счётчики +/− для каждого типа
- Загружает типы из `/api/task-types`, если API недоступен — fallback на FALLBACK_TASKS
- Кнопка «Сгенерировать вариант» → `variant.html?config=1:2,5:1,20:3`

### `admin.html` — Добавление заданий
- Форма: выбор типа (1–25), текст условия, ответ, изображения, сложность, источник
- Drag-and-drop загрузка фото через `POST /api/upload`
- После загрузки фото — отправка `POST /api/tasks`
- **Важно:** работает только когда запущен `server/server.js`

### `variant.html` — Вариант
- Принимает `?config=1:2,5:1` в URL
- Два режима через `?mode=`:
  - **Без mode** → страница выбора (начать решение / скачать PDF)
  - **mode=solve** → страница с карточками заданий + поле ввода ответа
- Загружает случайные задания из API `/api/tasks/random?config=...`
- Если задания типа нет в БД → показывает placeholder "Задание будет добавлено позже"
- Поддержка KaTeX (LaTeX-формулы через `$...$` и `$$...$$`)
- Кнопка «Проверить ответы» (проверка пока заглушка — будет позже)

### `pdf-template.html` — PDF шаблон
- Puppeteer открывает эту страницу и снимает PDF
- Принимает `?config=...&tasks=1&answers=0`
- Сигнализирует о готовности через `document.body.dataset.ready = 'true'`

---

## API эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/health` | Проверка доступности |
| GET | `/api/task-types` | Все 25 типов + количество заданий в каждом |
| GET | `/api/task-types/:id` | Один тип по номеру |
| GET | `/api/tasks` | Список заданий (фильтры: typeId, difficulty, page, limit) |
| GET | `/api/tasks/random?config=1:2,5:1` | Случайные задания по конфигурации варианта |
| GET | `/api/tasks/:id` | Одно задание по UUID |
| POST | `/api/tasks` | Создать задание |
| PUT | `/api/tasks/:id` | Обновить задание |
| DELETE | `/api/tasks/:id` | Удалить задание |
| POST | `/api/upload` | Загрузить изображение → `/uploads/filename.jpg` |
| POST | `/api/export/pdf` | Сгенерировать PDF через Puppeteer |

---

## БД (Prisma + SQLite)

### Модель TaskType
```
id          Int      // номер 1-25
name        String   // "Задание 1"
topic       String   // "Вычисления"
part        Int      // 1 или 2
description String?  // опционально
tasks       Task[]
```

### Модель Task
```
id          String   @id @default(uuid())
typeId      Int      // ссылка на TaskType
prototype   Int      // порядковый номер в типе
text        String?  // условие (поддерживает LaTeX $\frac{1}{2}$)
answer      String?  // ответ для автопроверки
images      String   // JSON: ["uploads/img1.jpg"]
difficulty  Int      // 1=базовый 2=средний 3=сложный
source      String?  // "ФИПИ 2024" и т.д.
sourceUrl   String?
createdAt   DateTime
createdBy   String?  // null = парсер, будущее: userId
```

### Команды БД
```bash
npm run db:push     # синхронизировать схему
npm run db:seed     # заполнить 25 типов заданий
npm run db:reset    # очистить и пересоздать всё
npm run db:studio   # Prisma Studio (UI для просмотра БД)
npm run db:generate # перегенерировать Prisma Client
```

---

## Дизайн-система

**Цвета (кастомные, не дефолтный Tailwind):**
- `brand-blue: #0399E9` — главный акцент
- `brand-blue-hover: #027BBF`
- `header-bg: #181E2B` — тёмная шапка
- `ink-dark: #001B29` — основной текст
- `ink-body: #445371`, `ink-muted: #8D96AF`
- `surface-page: #DFE2EA`, `surface-card: #FFFFFF`

**Типографика:** Montserrat (400/500/600/700/800)

**Тени:** кастомные `shadow-card`, `shadow-btn` с цветным tint

---

## Известные проблемы и их решения

### Порт 3000 занят
**Решение:** `taskkill /F /IM node.exe` (убивает все node процессы), затем запускай снова

---


