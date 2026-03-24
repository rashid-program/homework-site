# 🚀 Полная установка и запуск проекта

## ✅ Что установлено

- ✅ **Node.js сервер** (Express) на порту 3000
- ✅ **SQLite БД** с Prisma ORM
- ✅ **Chrome/Puppeteer** для экспорта в PDF
- ✅ **API** для всех операций
- ✅ **Фронтенд** (HTML, CSS, JS)

## 🎯 Быстрый старт

### Первая установка

```bash
cd server
npm install
npm run setup
```

Это установит все зависимости и загрузит Chrome.

### Запуск

```bash
# Из папки server/:
npm start              # продакшен
npm run dev            # разработка (с автоперезагрузкой)
```

Сайт будет доступен на **http://localhost:3000**

## 📋 Основные функции

### 1. **Экспорт в PDF** ✅

Конвертирует вариант ОГЭ в PDF (A4):

```bash
curl -X POST http://localhost:3000/api/export/pdf \
  -H "Content-Type: application/json" \
  -d '{
    "config": "1:2,3:1",        # 2 задачи типа 1, 1 задача типа 3
    "includeTasks": true,
    "includeAnswers": false
  }' \
  --output variant.pdf
```

### 2. **Работа с БД** ✅

```bash
npm run db:push        # синхронизировать схему
npm run db:seed        # заполнить тестовыми данными
npm run db:studio      # открыть Prisma Studio (UI)
npm run db:reset       # сбросить + заполнить заново
```

### 3. **API**

| Метод | Endpoint | Описание |
|-------|----------|---------|
| GET | `/api/health` | Проверка здоровья |
| GET | `/api/task-types` | Все типы задач |
| GET | `/api/tasks` | Все задачи |
| POST | `/api/tasks` | Создать задачу |
| POST | `/api/upload` | Загрузить изображение |
| POST | `/api/export/pdf` | Экспортировать в PDF |

## 🔧 Решение проблем

### Chrome не найден
```bash
npx puppeteer browsers install chrome
```

### Порт 3000 занят
Измените в `server/.env`:
```
PORT=3001
```

### БД повреждена
```bash
npm run db:reset
```

## 📁 Структура проекта

```
homework-site/
├── index.html              # Главная страница
├── variant.html            # Шаблон варианта
├── pdf-template.html       # Шаблон для PDF
├── serve.mjs               # Старый сервер (не используется)
└── server/
    ├── server.js           # Express сервер
    ├── setup.js            # Скрипт инициализации
    ├── package.json
    ├── .env                # Переменные окружения
    ├── prisma/
    │   ├── schema.prisma   # Схема БД
    │   ├── seed.js         # Тестовые данные
    │   └── dev.db          # SQLite БД
    ├── src/
    │   ├── routes/         # API маршруты
    │   └── middleware/     # Middleware
    └── uploads/            # Загруженные файлы
```

## 🎓 Примеры использования

### Создать задачу

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "taskTypeId": 1,
    "number": 1,
    "content": "Найдите x",
    "answer": "x = 5"
  }'
```

### Получить все задачи

```bash
curl http://localhost:3000/api/tasks
```

### Загрузить изображение

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@image.png"
```

## 💡 Полезные команды

```bash
# Разработка
npm run dev                 # сервер + автоперезагрузка

# БД
npm run db:push             # миграции
npm run db:seed             # заполнить тестовыми данными
npm run db:studio           # UI для БД (http://localhost:5555)

# Генерация
npm run db:generate         # пересоздать Prisma клиент
```

## ✨ Готово!

Все необходимые утилиты установлены и работают:
- ✅ Node.js сервер
- ✅ SQLite БД
- ✅ Chrome для PDF
- ✅ API
- ✅ Фронтенд

Запустите `npm start` и начните использовать! 🎉
