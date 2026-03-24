/**
 * Централизованный обработчик ошибок Express
 * Возвращает единообразный JSON-ответ при любой ошибке
 */
export function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] ${err.stack || err.message}`);

  // Prisma: запись не найдена
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, error: 'Запись не найдена' });
  }

  // Prisma: нарушение уникальности
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, error: 'Такая запись уже существует' });
  }

  // Prisma: нарушение внешнего ключа
  if (err.code === 'P2003') {
    return res.status(400).json({ success: false, error: 'Указанный тип задания не существует' });
  }

  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Внутренняя ошибка сервера';

  res.status(status).json({ success: false, error: message });
}