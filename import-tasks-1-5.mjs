/**
 * import-tasks-1-5.mjs
 * Импортирует задания №1–5 из tasks-all.json в БД.
 *
 * Особенность: каждое задание имеет taskNum (1-5) → typeId и prototype (1-6).
 *
 * Usage:
 *   node import-tasks-1-5.mjs          ← импорт
 *   node import-tasks-1-5.mjs --dry    ← показать без записи
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DRY_RUN = process.argv.includes('--dry');

const { PrismaClient } = await import('./server/node_modules/@prisma/client/index.js').catch(() =>
  import('./server/node_modules/.prisma/client/index.js')
);
const prisma = new PrismaClient({
  datasources: { db: { url: `file:${join(__dirname, 'server/prisma/dev.db')}` } }
});

const tasksPath = join(__dirname, 'подготовка к базе', 'Задание 1-5', 'tasks-all.json');
const allTasks = JSON.parse(readFileSync(tasksPath, 'utf-8'));

console.log(`\n── Импорт Заданий 1-5 ──`);
console.log(`Источник: ${tasksPath}`);
console.log(`Заданий: ${allTasks.length} (комплектов: ${allTasks.length / 5})`);
if (DRY_RUN) console.log('⚠ DRY RUN — запись в БД отключена\n');

// Проверяем TaskType 1-5
for (let i = 1; i <= 5; i++) {
  const tt = await prisma.taskType.findUnique({ where: { id: i } });
  if (!tt) {
    console.error(`TaskType с id=${i} не найден! Нужно создать записи для заданий 1-5.`);
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log(`  TaskType ${i}: ${tt.name} — ${tt.topic}`);
}

const PROTO_NAMES = { 1: 'Дороги', 2: 'Квартиры', 3: 'Участки', 4: 'Печи', 5: 'Бумага', 6: 'Шины' };

// Собираем записи
const records = [];
const stats = {};

for (const t of allTasks) {
  const typeId = t.taskNum;      // 1-5
  const prototype = t.prototype; // 1-6

  let images = '[]';
  if (t.svgFiles && t.svgFiles.length > 0) {
    images = JSON.stringify(t.svgFiles);
  }

  let textField = null;
  if (t.parts && t.parts.length > 0) {
    textField = JSON.stringify(t.parts);
  }

  const record = {
    typeId,
    prototype,
    text:       textField,
    answer:     t.answer || null,
    images,
    difficulty: 1,
    source:     'Банк ФИПИ',
    sourceUrl:  `https://3.shkolkovo.online/catalog/${t.id}`,
  };
  records.push(record);

  const key = `${PROTO_NAMES[prototype] || prototype} (typeId=${typeId})`;
  stats[key] = (stats[key] || 0) + 1;
}

console.log('\nСтатистика:');
// Group by prototype
const byProto = {};
for (const t of allTasks) {
  const p = t.prototype;
  if (!byProto[p]) byProto[p] = { total: 0, byTask: {} };
  byProto[p].total++;
  byProto[p].byTask[t.taskNum] = (byProto[p].byTask[t.taskNum] || 0) + 1;
}
for (const [p, info] of Object.entries(byProto).sort((a, b) => a[0] - b[0])) {
  console.log(`  ${PROTO_NAMES[p]}: ${info.total} заданий (${info.total / 5} комплектов), задачи: ${JSON.stringify(info.byTask)}`);
}

console.log(`\nВсего записей: ${records.length}`);

if (DRY_RUN) {
  // Показать первые несколько
  for (const r of records.slice(0, 10)) {
    const textPreview = r.text ? (r.text.length > 60 ? r.text.slice(0, 60) + '...' : r.text) : '(null)';
    console.log(`  typeId=${r.typeId} proto=${r.prototype} answer="${r.answer}" text="${textPreview}"`);
  }
  if (records.length > 10) console.log(`  ... и ещё ${records.length - 10}`);
  console.log('\n(dry run, БД не изменена)');
} else {
  // Проверяем существующие
  for (let i = 1; i <= 5; i++) {
    const existing = await prisma.task.count({ where: { typeId: i } });
    if (existing > 0) {
      console.log(`⚠ typeId=${i}: уже ${existing} заданий в БД. Добавляем поверх.`);
    }
  }

  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    await prisma.task.createMany({ data: batch });
    inserted += batch.length;
    process.stdout.write(`  Вставлено: ${inserted}/${records.length}\r`);
  }
  console.log(`\n✓ Готово! Вставлено ${inserted} заданий в БД.`);
}

await prisma.$disconnect();
