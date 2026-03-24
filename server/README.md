# Сервер конструктора вариантов ОГЭ

## Требования

- Node.js 18+
- npm или yarn

## Установка и запуск

### 1. Установка зависимостей (включает загрузку Chrome)

```bash
npm install
```

Автоматически загружается Chrome для Puppeteer при `npm install` (скрипт `postinstall`).

### 2. Запуск сервера

```bash
# Режим разработки (с автоперезагрузкой)
npm run dev

# Режим продакшена
npm start
```

Сервер будет доступен на `http://localhost:3000`

## API endpoints

- `GET /api/health` — проверка здоровья сервера
- `POST /api/export/pdf` — экспорт варианта в PDF
- `GET /api/task-types` — получить типы задач
- `GET /api/tasks` — получить все задачи
- `POST /api/tasks` — создать задачу
- `POST /api/upload` — загрузить изображение

## Работа с БД (SQLite)

```bash
# Синхронизировать схему с БД
npm run db:push

# Заполнить БД тестовыми данными
npm run db:seed

# Открыть Prisma Studio (UI для БД)
npm run db:studio

# Сбросить БД и заполнить тестовыми данными
npm run db:reset
```

## Экспорт в PDF

### Требования
- Chrome/Chromium установлен локально (автоматически при `npm install`)

### Использование API

```bash
curl -X POST http://localhost:3000/api/export/pdf \
  -H "Content-Type: application/json" \
  -d '{
    "config": "1:2,5:1",
    "includeTasks": true,
    "includeAnswers": false
  }' \
  --output variant.pdf
```

### Параметры

- `config` (обязателен) — конфигурация вариантов в формате `задача:количество`
  - Пример: `"1:2,5:1"` означает 2 задачи типа 1 и 1 задача типа 5
- `includeTasks` (булево, по умолчанию true) — включить задачи в PDF
- `includeAnswers` (булево, по умолчанию false) — включить ответы в PDF

## Структура проекта

```
server/
├── server.js              # Главный файл сервера (Express)
├── package.json
├── prisma/
│   ├── schema.prisma     # Схема БД
│   ├── seed.js           # Скрипт заполнения БД
│   └── dev.db            # SQLite БД
├── src/
│   ├── routes/           # API маршруты
│   │   ├── tasks.js
│   │   ├── taskTypes.js
│   │   ├── export.js     # PDF экспорт
│   │   └── upload.js
│   └── middleware/       # Middleware
│       └── errorHandler.js
└── uploads/              # Загруженные файлы (изображения)
```

## Решение проблем

### Chrome не найден при запуске
Установите Chrome вручную:
```bash
npx puppeteer browsers install chrome
```

### Ошибка EADDRINUSE (порт занят)
Измените PORT в `.env`:
```
PORT=3001
```

### БД повреждена
Сбросьте и пересоздайте:
```bash
npm run db:reset
```

##环境переменные

Создайте файл `.env` в папке `server/`:

```env
DATABASE_URL="file:./dev.db"
PORT=3000
```

## Разработка

Для разработки используйте `npm run dev` (требует nodemon):
```bash
npm run dev
```

Сервер автоматически перезагружается при изменении файлов.
