# 🔄 Миграция со старого serve.mjs на новый Express сервер

## 🎯 Что изменилось

### Раньше
- Статический сервер `serve.mjs` на порту 3000
- Только раздавал HTML/CSS/JS файлы
- Нет БД, нет API, нет PDF экспорта

### Теперь
- Express сервер в папке `server/`
- **Полный API** для работы с БД
- **SQLite БД** с Prisma ORM
- **PDF экспорт** через Puppeteer + Chrome
- **Загрузка изображений**
- Фронтенд всё ещё раздаётся на `http://localhost:3000`

## 🚀 Как переместиться на новый сервер

### 1. Установка

```bash
# Перейти в папку сервера
cd server

# Установить зависимости + Chrome
npm install

# Инициализировать БД
npm run db:push
npm run db:seed
```

### 2. Запуск

```bash
# Вместо: node serve.mjs
# Используйте:
npm start

# Сервер запустится на http://localhost:3000
```

### 3. Разработка

```bash
# С автоперезагрузкой:
npm run dev

# Это перезагружает сервер при изменении файлов src/
```

## 🔌 Основные API endpoints

Старый сервер не имел API. Новый сервер предоставляет:

### Задачи

```javascript
// Получить все задачи
GET /api/tasks

// Создать задачу
POST /api/tasks
Body: { taskTypeId: 1, number: 1, content: "...", answer: "..." }

// Удалить задачу
DELETE /api/tasks/{id}
```

### Типы задач

```javascript
// Получить типы
GET /api/task-types

// Создать тип
POST /api/task-types
Body: { name: "Задача 1", description: "..." }
```

### Загрузка файлов

```javascript
// Загрузить изображение
POST /api/upload
Content-Type: multipart/form-data
File: image.png

// Ответ: { filename: "uploads/1234567.png" }
```

### Экспорт в PDF

```javascript
// Экспортировать вариант в PDF
POST /api/export/pdf
Body: {
  config: "1:2,3:1",
  includeTasks: true,
  includeAnswers: false
}

// Ответ: PDF файл
```

## 📝 Примеры интеграции с фронтендом

### Загрузить изображение

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});

const { filename } = await response.json();
// Используйте: <img src="/uploads/1234567.png">
```

### Создать задачу

```javascript
const response = await fetch('/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    taskTypeId: 1,
    number: 5,
    content: 'Найдите x',
    answer: 'x = 5',
    imageUrl: '/uploads/1234567.png'
  })
});

const task = await response.json();
```

### Экспортировать в PDF

```javascript
const response = await fetch('/api/export/pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    config: '1:2,3:1',
    includeTasks: true,
    includeAnswers: false
  })
});

const blob = await response.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'variant.pdf';
a.click();
```

## 🗂️ Новая структура проекта

```
homework-site/
├── index.html              # Главная страница (раздаётся сервером)
├── variant.html            # Шаблон варианта (раздаётся сервером)
├── pdf-template.html       # Шаблон для PDF (используется API)
├── CLAUDE.md               # ← ОБНОВЛЁН
├── SETUP_GUIDE.md          # ← НОВЫЙ
├── MIGRATION.md            # ← НОВЫЙ (этот файл)
├── serve.mjs               # ← СТАРЫЙ (больше не используется)
└── server/
    ├── server.js           # ← ГЛАВНЫЙ файл
    ├── setup.js            # ← Скрипт инициализации
    ├── package.json        # ← ОБНОВЛЁН
    ├── README.md           # ← НОВЫЙ
    ├── .env                # ← ОБНОВЛЁН
    ├── prisma/
    │   ├── schema.prisma   # ← НОВЫЙ
    │   ├── seed.js         # ← НОВЫЙ
    │   └── dev.db          # ← НОВЫЙ
    ├── src/
    │   ├── routes/         # ← НОВЫЙ
    │   │   ├── tasks.js
    │   │   ├── taskTypes.js
    │   │   ├── export.js   # ← PDF экспорт
    │   │   └── upload.js
    │   └── middleware/
    │       └── errorHandler.js
    └── uploads/            # ← Директория для загруженных файлов
```

## ✅ Что работает

- ✅ Сервер на `http://localhost:3000`
- ✅ БД (SQLite + Prisma)
- ✅ API для CRUD операций
- ✅ **PDF экспорт** (исправлено!)
- ✅ Загрузка файлов
- ✅ Фронтенд (HTML, CSS, JS)

## ❌ Что больше не работает

- ❌ `serve.mjs` (используйте `npm start` в папке `server/`)
- ❌ Локальная работа с файлами (используйте API)

## 🆘 Проблемы и решения

### PDF не экспортируется
```bash
# Убедитесь, что Chrome установлен
npx puppeteer browsers install chrome
```

### Сервер не запускается
```bash
# Проверьте, что используется правильная папка
cd server
npm install
npm start
```

### БД пуста
```bash
# Заполните тестовыми данными
npm run db:seed
```

## 📚 Полезные ресурсы

- [Express docs](https://expressjs.com/)
- [Prisma docs](https://www.prisma.io/docs/)
- [Puppeteer docs](https://pptr.dev/)
- `server/README.md` — детальная документация сервера
- `SETUP_GUIDE.md` — полное руководство по установке

## 🎉 Готово!

Теперь у вас есть полнофункциональный сервер с:
- REST API
- БД
- PDF экспортом
- Загрузкой файлов
- Фронтендом

Запустите `cd server && npm start` и работайте! 🚀
