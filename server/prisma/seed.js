/**
 * Сид — заполняет таблицу TaskType 25 стандартными типами заданий ОГЭ по математике.
 * Запуск: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TASK_TYPES = [
  // ── Первая часть (задания 1–19) ──────────────────────────────────────────
  { id: 1,  name: 'Задание 1',  topic: 'Вычисления',                                        part: 1 },
  { id: 2,  name: 'Задание 2',  topic: 'Числовые неравенства, координатная прямая',          part: 1 },
  { id: 3,  name: 'Задание 3',  topic: 'Числа и вычисления',                                part: 1 },
  { id: 4,  name: 'Задание 4',  topic: 'Алгебраические выражения',                          part: 1 },
  { id: 5,  name: 'Задание 5',  topic: 'Уравнения и неравенства',                           part: 1 },
  { id: 6,  name: 'Задание 6',  topic: 'Графики функций',                                   part: 1 },
  { id: 7,  name: 'Задание 7',  topic: 'Арифметические и геометрические прогрессии',        part: 1 },
  { id: 8,  name: 'Задание 8',  topic: 'Неравенства и системы неравенств',                  part: 1 },
  { id: 9,  name: 'Задание 9',  topic: 'Задачи по теории вероятностей',                     part: 1 },
  { id: 10, name: 'Задание 10', topic: 'Статистика, графики и диаграммы',                   part: 1 },
  { id: 11, name: 'Задание 11', topic: 'Числовые последовательности',                       part: 1 },
  { id: 12, name: 'Задание 12', topic: 'Преобразование выражений',                          part: 1 },
  { id: 13, name: 'Задание 13', topic: 'Алгебраические выражения и их преобразования',      part: 1 },
  { id: 14, name: 'Задание 14', topic: 'Практико-ориентированные задачи',                   part: 1 },
  { id: 15, name: 'Задание 15', topic: 'Треугольники и их элементы',                        part: 1 },
  { id: 16, name: 'Задание 16', topic: 'Окружность, вписанные и центральные углы',          part: 1 },
  { id: 17, name: 'Задание 17', topic: 'Четырёхугольники и их свойства',                    part: 1 },
  { id: 18, name: 'Задание 18', topic: 'Площади фигур',                                     part: 1 },
  { id: 19, name: 'Задание 19', topic: 'Анализ геометрических высказываний',                part: 1 },

  // ── Вторая часть (задания 20–25) ─────────────────────────────────────────
  { id: 20, name: 'Задание 20', topic: 'Уравнения и системы уравнений',                     part: 2 },
  { id: 21, name: 'Задание 21', topic: 'Текстовые задачи',                                  part: 2 },
  { id: 22, name: 'Задание 22', topic: 'Функции и их свойства',                             part: 2 },
  { id: 23, name: 'Задание 23', topic: 'Геометрическая задача (вычисление)',                part: 2 },
  { id: 24, name: 'Задание 24', topic: 'Геометрическая задача (доказательство)',            part: 2 },
  { id: 25, name: 'Задание 25', topic: 'Геометрическая задача повышенной сложности',        part: 2 },
];

async function main() {
  console.log('Заполнение таблицы TaskType...');

  for (const taskType of TASK_TYPES) {
    await prisma.taskType.upsert({
      where:  { id: taskType.id },
      update: { name: taskType.name, topic: taskType.topic, part: taskType.part },
      create: taskType,
    });
  }

  console.log(`✓ Добавлено/обновлено ${TASK_TYPES.length} типов заданий`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
