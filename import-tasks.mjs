/**
 * import-tasks.mjs
 * Импортирует задания из подготовка к базе/Задание N/tasks.json в БД через Prisma.
 *
 * Usage:
 *   node import-tasks.mjs 9          ← импорт из tasks.json (scraped с сайта)
 *   node import-tasks.mjs 6          ← импорт из PNG-скриншотов (parse-tasks.mjs)
 *   node import-tasks.mjs 9 --dry    ← показать что будет импортировано, без записи
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));

const taskNumArg = parseInt(process.argv[2]);
if (!taskNumArg || isNaN(taskNumArg)) {
  console.error('Укажи номер задания: node import-tasks.mjs <N>');
  process.exit(1);
}
const DRY_RUN = process.argv.includes('--dry');

// Динамический импорт Prisma из server/
const { PrismaClient } = await import('./server/node_modules/@prisma/client/index.js').catch(() =>
  import('./server/node_modules/.prisma/client/index.js')
);
const prisma = new PrismaClient({
  datasources: { db: { url: `file:${join(__dirname, 'server/prisma/dev.db')}` } }
});

const baseDir = join(__dirname, 'подготовка к базе', `Задание ${taskNumArg}`);

if (!existsSync(baseDir)) {
  console.error(`Папка не найдена: ${baseDir}`);
  process.exit(1);
}

// ── Определяем тип источника: tasks.json или PNG-скриншоты ────────────────
const tasksJsonPath = join(baseDir, 'tasks.json');
const hasTasksJson = existsSync(tasksJsonPath);

console.log(`\n── Импорт Задания ${taskNumArg} ──`);
console.log(`Источник: ${hasTasksJson ? 'tasks.json (сайт)' : 'PNG-скриншоты (парсер)'}`);
if (DRY_RUN) console.log('⚠ DRY RUN — запись в БД отключена\n');

// ── Проверяем что typeId существует ───────────────────────────────────────
const taskType = await prisma.taskType.findUnique({ where: { id: taskNumArg } });
if (!taskType) {
  console.error(`TaskType с id=${taskNumArg} не найден в БД!`);
  await prisma.$disconnect();
  process.exit(1);
}
console.log(`TaskType: ${taskType.name} — ${taskType.topic}\n`);

// ── Собираем записи для вставки ───────────────────────────────────────────
const records = [];

if (hasTasksJson) {
  // Источник: scrape-task9.mjs → tasks.json
  const rawTasks = JSON.parse(readFileSync(tasksJsonPath, 'utf-8'));

  // prototype = номер типа (1–10), задания внутри каждого прототипа
  // Группируем по прототипам чтобы назначить порядковый номер
  const byProto = {};
  for (const t of rawTasks) {
    const protoKey = t.prototype; // "Тип 1", "Тип 2", ...
    if (!byProto[protoKey]) byProto[protoKey] = [];
    byProto[protoKey].push(t);
  }

  const protoNames = Object.keys(byProto).sort((a, b) => {
    const na = parseInt(a.match(/\d+/)?.[0] || 0);
    const nb = parseInt(b.match(/\d+/)?.[0] || 0);
    return na - nb;
  });

  for (const protoName of protoNames) {
    const protoNum = parseInt(protoName.match(/\d+/)?.[0] || 0);
    const tasks = byProto[protoName];

    console.log(`Прототип ${protoNum} (${protoName}): ${tasks.length} заданий`);

    for (const t of tasks) {
      // Поддержка одиночного svgFile (задание 6) и массива svgFiles (задание 8+)
      let images = '[]';
      if (t.svgFiles && t.svgFiles.length > 0) {
        images = JSON.stringify(t.svgFiles);
      } else if (t.svgFile) {
        images = JSON.stringify([t.svgFile]);
      }

      // Если есть parts (inline-структура текст+SVG) — хранить как JSON в поле text
      // Иначе хранить как обычную строку
      let textField = t.text || null;
      if (t.parts && t.parts.length > 0) {
        textField = JSON.stringify(t.parts);
      }

      const record = {
        typeId:    taskNumArg,
        prototype: protoNum,
        text:      textField,
        answer:    t.answer || null,
        images,
        difficulty: 1,
        source:    'Банк ФИПИ',
        sourceUrl: `https://3.shkolkovo.online/catalog/${t.id}`,
      };
      records.push(record);
      if (DRY_RUN) console.log(`  → #${t.id} ответ="${t.answer}" текст="${t.text?.slice(0, 60)}..."`);
    }
  }

} else {
  // Источник: parse-tasks.mjs → папки с PNG + answers.json
  const answersPath = join(baseDir, 'answers.json');
  const answers = existsSync(answersPath)
    ? JSON.parse(readFileSync(answersPath, 'utf-8'))
    : {};

  const protoDirs = readdirSync(baseDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => parseInt(d.name))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b);

  for (const protoNum of protoDirs) {
    const protoDir = join(baseDir, String(protoNum));
    const pngFiles = readdirSync(protoDir)
      .filter(f => f.endsWith('.png'))
      .map(f => parseInt(f.replace('.png', '')))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);

    const protoAnswers = answers[protoNum] || {};
    console.log(`Прототип ${protoNum}: ${pngFiles.length} заданий`);

    for (const taskNum of pngFiles) {
      // Копируем PNG в server/uploads/
      const srcPng = join(protoDir, `${taskNum}.png`);
      const destName = `task${taskNumArg}_proto${protoNum}_${taskNum}.png`;
      const destPath = join(__dirname, 'server', 'uploads', destName);

      if (!DRY_RUN) {
        const { copyFileSync, mkdirSync } = await import('fs');
        mkdirSync(join(__dirname, 'server', 'uploads'), { recursive: true });
        copyFileSync(srcPng, destPath);
      }

      const record = {
        typeId:    taskNumArg,
        prototype: protoNum,
        text:      null,
        answer:    protoAnswers[taskNum] ?? null,
        images:    JSON.stringify([`uploads/${destName}`]),
        difficulty: 1,
        source:    'PDF сборник',
        sourceUrl: null,
      };
      records.push(record);
      if (DRY_RUN) console.log(`  → задание ${taskNum}, ответ="${record.answer}", img="${destName}"`);
    }
  }
}

console.log(`\nВсего записей для вставки: ${records.length}`);

if (!DRY_RUN) {
  // Проверяем нет ли уже заданий этого типа в БД
  const existing = await prisma.task.count({ where: { typeId: taskNumArg } });
  if (existing > 0) {
    console.log(`⚠ В БД уже есть ${existing} заданий типа ${taskNumArg}.`);
    console.log('  Добавляем поверх (дубликаты не удаляются).');
  }

  // Вставляем батчами по 50
  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    await prisma.task.createMany({ data: batch });
    inserted += batch.length;
    process.stdout.write(`  Вставлено: ${inserted}/${records.length}\r`);
  }
  console.log(`\n✓ Готово! Вставлено ${inserted} заданий в БД.`);
} else {
  console.log('\n(dry run завершён, БД не изменена)');
}

await prisma.$disconnect();
