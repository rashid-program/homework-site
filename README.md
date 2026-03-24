# 📚 Конструктор вариантов ОГЭ

Полнофункциональное веб-приложение для создания и экспорта вариантов заданий ОГЭ в PDF.

## 🎯 Возможности

✨ **Core Features:**
- ✅ Создание и управление задачами
- ✅ Организация по типам задач
- ✅ Загрузка изображений для задач
- ✅ **Экспорт вариантов в PDF** (A4 формат)
- ✅ REST API для всех операций
- ✅ SQLite БД с Prisma ORM

## 🚀 Быстрый старт

### Требования
- Node.js 18+
- npm или yarn

### Установка (5 минут)

```bash
# 1. Перейти в папку сервера
cd server

# 2. Установить зависимости (загружает Chrome автоматически)
npm install

# 3. Запустить сервер
npm start
```

Готово! Сайт откроется на **http://localhost:3000**

### Первый запуск

При первом запуске система:
- Создаст БД (SQLite)
- Загрузит Chrome для PDF экспорта
- Заполнит БД тестовыми данными

## 📖 Документация

| Файл | Описание |
|------|---------|
| **SETUP_GUIDE.md** | 📋 Полное руководство по установке |
| **MIGRATION.md** | 🔄 Как интегрировать с фронтендом |
| **server/README.md** | 🔧 Документация API и БД |
| **CLAUDE.md** | 🎨 Правила для Claude Code |

## 🔌 API Endpoints

| Метод | Endpoint | Описание |
|-------|----------|---------|
| GET | `/api/health` | Проверка здоровья |
| GET | `/api/task-types` | Получить все типы задач |
| GET | `/api/tasks` | Получить все задачи |
| POST | `/api/tasks` | Создать задачу |
| DELETE | `/api/tasks/{id}` | Удалить задачу |
| POST | `/api/upload` | Загрузить изображение |
| POST | `/api/export/pdf` | Экспортировать в PDF |

## 💻 Примеры использования

### Экспортировать вариант в PDF

```bash
curl -X POST http://localhost:3000/api/export/pdf \
  -H "Content-Type: application/json" \
  -d '{
    "config": "1:2,3:1",
    "includeTasks": true,
    "includeAnswers": false
  }' \
  --output variant.pdf
```

### Создать задачу

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "taskTypeId": 1,
    "number": 5,
    "content": "Найдите x",
    "answer": "x = 5"
  }'
```

### Загрузить изображение

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@image.png"
```

## 🛠️ Команды разработки

```bash
cd server

# Запуск
npm start               # Продакшен
npm run dev             # Разработка (с автоперезагрузкой)

# БД
npm run db:push         # Синхронизировать схему
npm run db:seed         # Заполнить тестовыми данными
npm run db:studio       # Открыть UI для БД
npm run db:reset        # Сбросить и пересоздать

# Инициализация
npm run setup           # Проверить все зависимости
```

## 📁 Структура проекта

```
homework-site/
├── README.md                    # ← Вы здесь
├── SETUP_GUIDE.md              # Полная установка
├── MIGRATION.md                # Интеграция с фронтендом
├── CLAUDE.md                   # Правила для Claude Code
├── index.html                  # Главная страница
├── variant.html                # Шаблон варианта
├── pdf-template.html           # Шаблон для PDF
└── server/                      # Node.js сервер
    ├── README.md               # Документация API
    ├── server.js               # Express приложение
    ├── setup.js                # Скрипт инициализации
    ├── package.json
    ├── .env                    # Переменные окружения
    ├── prisma/
    │   ├── schema.prisma       # Схема БД
    │   ├── seed.js             # Тестовые данные
    │   └── dev.db              # SQLite БД
    ├── src/
    │   ├── routes/             # API маршруты
    │   │   ├── tasks.js
    │   │   ├── taskTypes.js
    │   │   ├── export.js       # PDF экспорт
    │   │   └── upload.js
    │   └── middleware/
    │       └── errorHandler.js
    └── uploads/                # Загруженные файлы
```

## ⚙️ Переменные окружения

Создайте `server/.env`:

```env
# База данных
DATABASE_URL="file:./dev.db"

# Сервер
PORT=3000
```

## 🆘 Решение проблем

### Chrome не найден
```bash
npx puppeteer browsers install chrome
```

### Порт 3000 занят
```bash
# Измените PORT в server/.env на другой
PORT=3001
```

### БД повреждена
```bash
npm run db:reset
```

## 📚 Технологический стек

**Backend:**
- Node.js + Express — сервер
- SQLite + Prisma — база данных
- Puppeteer + Chrome — PDF экспорт
- Multer — загрузка файлов

**Frontend:**
- HTML5
- CSS3
- JavaScript

## ✅ Статус проекта

🟢 **ГОТОВО К ИСПОЛЬЗОВАНИЮ**

Все компоненты установлены и протестированы:
- ✅ Сервер работает
- ✅ БД настроена
- ✅ API функционирует
- ✅ **PDF экспорт работает** (исправлено)
- ✅ Фронтенд раздаётся

## 🎓 Дополнительные ресурсы

- [Express.js документация](https://expressjs.com/)
- [Prisma ORM](https://www.prisma.io/)
- [Puppeteer](https://pptr.dev/)
- [SQLite](https://www.sqlite.org/)

## 📝 Лицензия

MIT

---

**Автор:** Классный конструктор для создания вариантов ОГЭ

**Версия:** 1.0.0

**Статус:** ✨ Production Ready
