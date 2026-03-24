import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Хелпер: парсить images из JSON-строки в массив
const parseTask = (task) => ({ ...task, images: JSON.parse(task.images) });

/**
 * GET /api/tasks?typeId=1&difficulty=1&page=1&limit=20
 * Список заданий с фильтрами и пагинацией
 */
router.get('/', async (req, res, next) => {
  try {
    const { typeId, difficulty, page = 1, limit = 20 } = req.query;

    const where = {};
    if (typeId)     where.typeId     = parseInt(typeId);
    if (difficulty) where.difficulty = parseInt(difficulty);

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const take  = parseInt(limit);

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take,
        orderBy: [{ typeId: 'asc' }, { prototype: 'asc' }],
        include: { type: true },
      }),
      prisma.task.count({ where }),
    ]);

    res.json({
      success: true,
      data: tasks.map(parseTask),
      pagination: {
        total,
        page:  parseInt(page),
        limit: take,
        pages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tasks/random?config=1:2,5:1,20:3
 * Случайные задания по конфигурации варианта.
 * config — пары typeId:count через запятую.
 * Если задач в БД нет — возвращает placeholder-объект для этого типа.
 */
router.get('/random', async (req, res, next) => {
  try {
    const { config } = req.query;
    if (!config) return res.status(400).json({ success: false, error: 'Параметр config обязателен' });

    const pairs = config.split(',').map(p => {
      const [id, cnt] = p.split(':');
      return { typeId: parseInt(id), count: parseInt(cnt) };
    }).filter(p => !isNaN(p.typeId) && !isNaN(p.count) && p.count > 0);

    const result = [];

    for (const { typeId, count } of pairs) {
      const total = await prisma.task.count({ where: { typeId } });

      if (total === 0) {
        // Задач этого типа ещё нет — добавляем placeholder
        const type = await prisma.taskType.findUnique({ where: { id: typeId } });
        for (let i = 0; i < count; i++) {
          result.push({ id: null, typeId, type, placeholder: true, images: [] });
        }
        continue;
      }

      // Случайная выборка: берём срез из случайной позиции
      const take   = Math.min(count, total);
      const maxSkip = Math.max(0, total - take);
      const skip   = Math.floor(Math.random() * (maxSkip + 1));

      const tasks = await prisma.task.findMany({
        where: { typeId },
        skip,
        take,
        include: { type: true },
      });

      result.push(...tasks.map(parseTask));
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tasks/:id
 * Одно задание по UUID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { type: true },
    });

    if (!task) return res.status(404).json({ success: false, error: 'Задание не найдено' });

    res.json({ success: true, data: parseTask(task) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tasks
 * Создать задание (будущее: только для авторизованных)
 */
router.post('/', async (req, res, next) => {
  try {
    const { typeId, prototype, text, answer, images = [], difficulty = 1, source, sourceUrl } = req.body;

    if (!typeId || !prototype) {
      return res.status(400).json({ success: false, error: 'Обязательны: typeId, prototype' });
    }
    if (!text && (!images || images.length === 0)) {
      return res.status(400).json({ success: false, error: 'Укажите текст задания или добавьте изображение' });
    }

    const task = await prisma.task.create({
      data: {
        typeId:     parseInt(typeId),
        prototype:  parseInt(prototype),
        text:       text || null,
        answer:     answer || null,
        images:     JSON.stringify(images),
        difficulty: parseInt(difficulty),
        source:     source || null,
        sourceUrl:  sourceUrl || null,
      },
      include: { type: true },
    });

    res.status(201).json({ success: true, data: parseTask(task) });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/tasks/:id
 * Обновить задание
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { text, answer, images, difficulty, source, sourceUrl } = req.body;

    const data = {};
    if (text       !== undefined) data.text       = text;
    if (answer     !== undefined) data.answer     = answer;
    if (images     !== undefined) data.images     = JSON.stringify(images);
    if (difficulty !== undefined) data.difficulty = parseInt(difficulty);
    if (source     !== undefined) data.source     = source;
    if (sourceUrl  !== undefined) data.sourceUrl  = sourceUrl;

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
      include: { type: true },
    });

    res.json({ success: true, data: parseTask(task) });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/tasks/:id
 * Удалить задание
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Задание удалено' });
  } catch (err) {
    next(err);
  }
});

export default router;
