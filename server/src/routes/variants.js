import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const parseTask = (task) => ({ ...task, images: JSON.parse(task.images) });

/**
 * POST /api/variants
 * Создать вариант: получает config, делает случайную выборку заданий,
 * сохраняет конкретные ID в БД. Возвращает { id } нового варианта.
 *
 * Body: { config: "6:1:2,8:3:1,9:2", note?: "Вася Иванов 7-А" }
 *
 * Формат config для заданий 1-5:
 *   set15:protoId:count — выбирает count целых комплектов (по 5 заданий)
 *   set15:count         — случайный прототип
 */
router.post('/', async (req, res, next) => {
  try {
    const { config, note } = req.body;
    if (!config) return res.status(400).json({ success: false, error: 'config обязателен' });

    // Разделяем set15-части и обычные
    const rawParts = config.split(',');
    const set15Parts = [];
    const regularParts = [];

    for (const p of rawParts) {
      if (p.startsWith('set15:')) {
        const segs = p.replace('set15:', '').split(':');
        if (segs.length === 2) {
          set15Parts.push({ protoId: parseInt(segs[0]), count: parseInt(segs[1]) });
        } else if (segs.length === 1) {
          set15Parts.push({ protoId: null, count: parseInt(segs[0]) });
        }
      } else {
        regularParts.push(p);
      }
    }

    // Парсим обычные config-части
    const pairs = regularParts.map(p => {
      const parts = p.split(':');
      if (parts.length === 3) {
        return { typeId: parseInt(parts[0]), protoId: parseInt(parts[1]), count: parseInt(parts[2]) };
      }
      return { typeId: parseInt(parts[0]), protoId: null, count: parseInt(parts[1]) };
    }).filter(p => !isNaN(p.typeId) && !isNaN(p.count) && p.count > 0);

    const selectedTaskIds = [];

    // ── Обработка set15: выбираем целые комплекты заданий 1-5 ──
    for (const { protoId, count } of set15Parts) {
      if (isNaN(count) || count <= 0) continue;

      const where = { typeId: 1, setIndex: { not: null } };
      if (protoId !== null && !isNaN(protoId)) where.prototype = protoId;

      // Находим доступные setIndex
      const available = await prisma.task.findMany({
        where,
        select: { setIndex: true, prototype: true },
        distinct: ['setIndex', 'prototype'],
      });

      if (available.length === 0) continue;

      // Перемешиваем и берём count комплектов
      const shuffled = available.sort(() => Math.random() - 0.5);
      const chosen = shuffled.slice(0, Math.min(count, shuffled.length));

      for (const { setIndex, prototype } of chosen) {
        // Берём все 5 заданий комплекта, в порядке typeId
        const setTasks = await prisma.task.findMany({
          where: { typeId: { in: [1, 2, 3, 4, 5] }, prototype, setIndex },
          orderBy: { typeId: 'asc' },
        });
        for (const t of setTasks) {
          selectedTaskIds.push({ taskId: t.id, typeId: t.typeId, protoId: t.prototype });
        }
      }
    }

    // ── Обычные задания ──
    for (const { typeId, protoId, count } of pairs) {
      const where = { typeId };
      if (protoId !== null) where.prototype = protoId;

      const total = await prisma.task.count({ where });

      if (total === 0) {
        for (let i = 0; i < count; i++) {
          selectedTaskIds.push({ taskId: null, typeId, protoId });
        }
        continue;
      }

      const take    = Math.min(count, total);
      const maxSkip = Math.max(0, total - take);
      const skip    = Math.floor(Math.random() * (maxSkip + 1));

      const tasks = await prisma.task.findMany({ where, skip, take });
      for (const t of tasks) {
        selectedTaskIds.push({ taskId: t.id, typeId, protoId });
      }
    }

    // Создаём вариант
    const variant = await prisma.variant.create({
      data: {
        config,
        note: note || null,
        tasks: {
          create: selectedTaskIds
            .filter(t => t.taskId !== null)
            .map((t, i) => ({
              position: i + 1,
              taskId: t.taskId,
            })),
        },
      },
    });

    res.status(201).json({ success: true, id: variant.id });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/variants/:id
 * Получить сохранённый вариант со всеми заданиями в порядке позиций.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const variant = await prisma.variant.findUnique({
      where: { id: req.params.id },
      include: {
        tasks: {
          orderBy: { position: 'asc' },
          include: {
            task: {
              include: { type: true },
            },
          },
        },
      },
    });

    if (!variant) return res.status(404).json({ success: false, error: 'Вариант не найден' });

    // Формат ответа: { id, config, note, createdAt, tasks: [Task...] }
    const tasks = variant.tasks.map(vt => parseTask(vt.task));

    res.json({
      success: true,
      data: {
        id:        variant.id,
        config:    variant.config,
        note:      variant.note,
        createdAt: variant.createdAt,
        tasks,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
