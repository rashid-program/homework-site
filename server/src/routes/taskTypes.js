import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/task-types
 * Все 25 типов заданий с количеством задач в каждом
 */
router.get('/', async (req, res, next) => {
  try {
    const taskTypes = await prisma.taskType.findMany({
      orderBy: { id: 'asc' },
      include: { _count: { select: { tasks: true } } },
    });

    res.json({ success: true, data: taskTypes });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/task-types/:id
 * Один тип задания по номеру (1–25)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'id должен быть числом' });

    const taskType = await prisma.taskType.findUnique({
      where: { id },
      include: { _count: { select: { tasks: true } } },
    });

    if (!taskType) return res.status(404).json({ success: false, error: 'Тип задания не найден' });

    res.json({ success: true, data: taskType });
  } catch (err) {
    next(err);
  }
});

export default router;