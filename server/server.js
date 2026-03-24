import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import taskTypeRoutes from './src/routes/taskTypes.js';
import taskRoutes     from './src/routes/tasks.js';
import uploadRoutes   from './src/routes/upload.js';
import exportRoutes   from './src/routes/export.js';
import { errorHandler } from './src/middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Загрузки (изображения задач)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API-маршруты ──────────────────────────────────────────────────────────────
app.use('/api/task-types', taskTypeRoutes);
app.use('/api/tasks',      taskRoutes);
app.use('/api/upload',     uploadRoutes);
app.use('/api/export',     exportRoutes);

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'OK', timestamp: new Date().toISOString() });
});

// ── Статический фронтенд ──────────────────────────────────────────────────────
// Сервер раздаёт корень проекта (index.html, variant.html и т.д.)
const frontendPath = path.join(__dirname, '..');
app.use(express.static(frontendPath));

// Все остальные GET-запросы отдают index.html (для будущего SPA/роутинга)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ── Обработчик ошибок (всегда последний) ─────────────────────────────────────
app.use(errorHandler);

// ── Запуск ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  Сервер запущен: http://localhost:${PORT}`);
  console.log(`  API:           http://localhost:${PORT}/api`);
  console.log(`  Health:        http://localhost:${PORT}/api/health\n`);
});
