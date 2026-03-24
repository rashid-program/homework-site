# ⚡ Быстрый старт (2 минуты)

## 🚀 Запуск

```bash
cd server
npm start
```

Сайт откроется на **http://localhost:3000**

## 📖 Основные команды

```bash
# Запуск
npm start               # Продакшен
npm run dev             # Разработка

# БД
npm run db:seed         # Заполнить примерами
npm run db:studio       # Управление БД (http://localhost:5555)

# PDF
curl -X POST http://localhost:3000/api/export/pdf \
  -H "Content-Type: application/json" \
  -d '{"config":"1:1","includeTasks":true}' \
  --output variant.pdf
```

## 🔧 Первая установка

```bash
cd server
npm install
npm run db:push
npm run db:seed
npm start
```

## 🆘 Проблемы

| Проблема | Решение |
|----------|---------|
| Chrome не найден | `npx puppeteer browsers install chrome` |
| Порт 3000 занят | Измените `PORT` в `server/.env` |
| БД повреждена | `npm run db:reset` |

## 📚 Документация

- **README.md** — проект
- **SETUP_GUIDE.md** — полная установка
- **server/README.md** — API
- **MIGRATION.md** — интеграция с фронтендом

## ✨ Готово!

Проект полностью настроен и работает 🎉
