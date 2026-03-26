/**
 * rescrape-task1-condition.mjs
 * Перепарсивает ТОЛЬКО задачу №1 из каждого SubTheme заданий 1-5.
 * Берёт оба TexRender блока: [0]=условие, [1]=вопрос.
 * Обновляет text в БД для всех typeId=1 записей.
 *
 * Запуск: node rescrape-task1-condition.mjs
 * Chrome должен быть запущен с --remote-debugging-port=9222
 */

import puppeteer from 'puppeteer';
import { PrismaClient } from './server/node_modules/@prisma/client/index.js';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SVG_DIR = join(__dirname, 'server', 'public', 'formulas', 'task1-5');
mkdirSync(SVG_DIR, { recursive: true });

const DB_PATH = join(__dirname, 'server', 'prisma', 'dev.db').replace(/\\/g, '/');
const prisma = new PrismaClient({
  datasources: { db: { url: `file:${DB_PATH}` } }
});

// Все SubTheme — из основного парсера и extra
const ALL_SUBTYPES = [
  // Дороги (protoId=1)
  { name: 'Дороги-1',   protoId: 1, url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=3582' },
  { name: 'Дороги-2',   protoId: 1, url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=13155' },
  { name: 'Дороги-3',   protoId: 1, url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=3583' },
  { name: 'Дороги-4',   protoId: 1, url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=4091' },
  { name: 'Дороги-5',   protoId: 1, url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=7839' },
  { name: 'Дороги-6',   protoId: 1, url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=4262' },
  { name: 'Дороги-7',   protoId: 1, url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=12747' },
  { name: 'Дороги-9',   protoId: 1, url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=7909' },
  { name: 'Дороги-10',  protoId: 1, url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=3830' },
  { name: 'Дороги-11',  protoId: 1, url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=4182' },
  { name: 'Дороги-12',  protoId: 1, url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=4703' },
  // Квартиры (protoId=2) — включая extra (9010, 9011, 4128)
  { name: 'Квартиры-1', protoId: 2, url: 'https://3.shkolkovo.online/catalog/3581?SubTheme=9010' },
  { name: 'Квартиры-2', protoId: 2, url: 'https://3.shkolkovo.online/catalog/3581?SubTheme=9011' },
  { name: 'Квартиры-3', protoId: 2, url: 'https://3.shkolkovo.online/catalog/3581?SubTheme=3603' },
  { name: 'Квартиры-4', protoId: 2, url: 'https://3.shkolkovo.online/catalog/3581?SubTheme=4089' },
  { name: 'Квартиры-5', protoId: 2, url: 'https://3.shkolkovo.online/catalog/3581?SubTheme=4128' },
  { name: 'Квартиры-6', protoId: 2, url: 'https://3.shkolkovo.online/catalog/3581?SubTheme=3601' },
  { name: 'Квартиры-7', protoId: 2, url: 'https://3.shkolkovo.online/catalog/3581?SubTheme=3602' },
  // Участки (protoId=3) — включая extra (4515)
  { name: 'Участки-1',  protoId: 3, url: 'https://3.shkolkovo.online/catalog/5321?SubTheme=4514' },
  { name: 'Участки-2',  protoId: 3, url: 'https://3.shkolkovo.online/catalog/5321?SubTheme=7048' },
  { name: 'Участки-3',  protoId: 3, url: 'https://3.shkolkovo.online/catalog/5321?SubTheme=4515' },
  { name: 'Участки-4',  protoId: 3, url: 'https://3.shkolkovo.online/catalog/5321?SubTheme=9019' },
  // Печи (protoId=4)
  { name: 'Печи-1',     protoId: 4, url: 'https://3.shkolkovo.online/catalog/3577?SubTheme=7022' },
  { name: 'Печи-2',     protoId: 4, url: 'https://3.shkolkovo.online/catalog/3577?SubTheme=8373' },
  { name: 'Печи-3',     protoId: 4, url: 'https://3.shkolkovo.online/catalog/3577?SubTheme=4181' },
  { name: 'Печи-4',     protoId: 4, url: 'https://3.shkolkovo.online/catalog/3577?SubTheme=7858' },
  { name: 'Печи-5',     protoId: 4, url: 'https://3.shkolkovo.online/catalog/3577?SubTheme=3589' },
  // Бумага (protoId=5) — включая extra (3598)
  { name: 'Бумага-3',   protoId: 5, url: 'https://3.shkolkovo.online/catalog/3580?SubTheme=4147' },
  { name: 'Бумага-4',   protoId: 5, url: 'https://3.shkolkovo.online/catalog/3580?SubTheme=3598' },
  { name: 'Бумага-5',   protoId: 5, url: 'https://3.shkolkovo.online/catalog/3580?SubTheme=3599' },
  // Шины (protoId=6) — включая extra (4090)
  { name: 'Шины-1',     protoId: 6, url: 'https://3.shkolkovo.online/catalog/3578?SubTheme=11706' },
  { name: 'Шины-3',     protoId: 6, url: 'https://3.shkolkovo.online/catalog/3578?SubTheme=4090' },
  { name: 'Шины-4',     protoId: 6, url: 'https://3.shkolkovo.online/catalog/3578?SubTheme=4145' },
  { name: 'Шины-9',     protoId: 6, url: 'https://3.shkolkovo.online/catalog/3578?SubTheme=3592' },
];

async function downloadSvgViaBrowser(page, url, destPath) {
  const svgContent = await page.evaluate(async (svgUrl) => {
    try {
      const r = await fetch(svgUrl, { credentials: 'include' });
      if (!r.ok) return null;
      return await r.text();
    } catch { return null; }
  }, url);
  if (svgContent) { writeFileSync(destPath, svgContent, 'utf-8'); return true; }
  return false;
}

function parseTexRender(texRender) {
  const parts = [];
  const formulaSrcs = [];

  for (const child of texRender.childNodes) {
    if (child.nodeType === 8) continue;
    if (child.nodeType === 1 && child.tagName === 'P') {
      const p = child;
      const hasContent = [...p.childNodes].some(n =>
        (n.nodeType === 3 && n.textContent.trim()) ||
        (n.nodeType === 1 && n.tagName === 'IMG')
      );
      if (!hasContent) continue;
      let firstInP = true;
      for (const node of p.childNodes) {
        if (node.nodeType === 3) {
          const val = node.textContent.trim();
          if (val) {
            const item = { type: 'text', value: val };
            if (firstInP) { item.newParagraph = true; firstInP = false; }
            parts.push(item);
          }
        } else if (node.nodeType === 1 && node.tagName === 'IMG' && node.classList.contains('math')) {
          const item = { type: 'img', src: node.src };
          if (firstInP) { item.newParagraph = true; firstInP = false; }
          parts.push(item);
          formulaSrcs.push(node.src);
        }
      }
    } else if (child.nodeType === 1 && child.tagName === 'DIV') {
      const img = child.querySelector('img');
      if (img?.src) {
        parts.push({ type: 'drawing', src: img.src });
        formulaSrcs.push(img.src);
      }
    }
  }
  return { parts, formulaSrcs };
}

const browser = await puppeteer.connect({
  browserURL: 'http://localhost:9222',
  defaultViewport: null,
});
// Переиспользуем существующую вкладку shkolkovo (там есть авторизация)
const allPages = await browser.pages();
const page = allPages.find(p => p.url().includes('shkolkovo.online')) || allPages[0];

let updatedTotal = 0;
let skipped = 0;

for (const subtype of ALL_SUBTYPES) {
  console.log(`\n── ${subtype.name} (protoId=${subtype.protoId}) ──`);

  try {
    await page.goto(subtype.url, { waitUntil: 'networkidle2', timeout: 30000 });
    // Ждём пока задача 1 получит 2 TexRender контейнера
    try {
      await page.waitForFunction(() => {
        const exercises = document.querySelectorAll('[class*="ExerciseStyles_exercise__k79gf"]');
        const task1 = [...exercises].find(ex =>
          /Задача\s+1/i.test(ex.querySelector('[class*="ExerciseStyles_title"]')?.textContent?.trim() || '')
        );
        if (!task1) return false;
        const tc = task1.querySelectorAll('[class*="TexRender_texContainer"]');
        return tc.length >= 2;
      }, { timeout: 20000 });
      console.log('  → 2 контейнера появились');
    } catch (e) {
      console.log('  → таймаут ожидания контейнеров:', e.message.substring(0,60));
    }
    await new Promise(r => setTimeout(r, 1000));

    // Парсим задачу 1: условие (первый TexRender) + вопрос (второй TexRender)
    const parsed = await page.evaluate(() => {
      const exercises = document.querySelectorAll('[class*="ExerciseStyles_exercise__k79gf"]');
      const task1 = [...exercises].find(ex =>
        /Задача\s+1/i.test(ex.querySelector('[class*="ExerciseStyles_title"]')?.textContent?.trim() || '')
      );
      if (!task1) return null;

      // Ищем TexRender контейнеры от task1 напрямую (не через textContainer)
      const texContainers = task1.querySelectorAll('[class*="TexRender_texContainer"]');
      if (texContainers.length < 2) return { error: `texContainers=${texContainers.length} (от task1)`, taskId: task1.querySelector('[class*="ExerciseStyles_articul"]')?.textContent?.trim().replace('#','') };

      const articleEl = task1.querySelector('[class*="ExerciseStyles_articul"]');
      const taskId = articleEl?.textContent?.trim().replace('#', '') || '';

      function parseRender(render) {
        const parts = [];
        const srcs = [];
        for (const child of render.childNodes) {
          if (child.nodeType === 8) continue;
          if (child.nodeType === 1 && child.tagName === 'P') {
            const hasContent = [...child.childNodes].some(n =>
              (n.nodeType === 3 && n.textContent.trim()) ||
              (n.nodeType === 1 && n.tagName === 'IMG')
            );
            if (!hasContent) continue;
            let first = true;
            for (const node of child.childNodes) {
              if (node.nodeType === 3) {
                const val = node.textContent.trim();
                if (val) {
                  const item = { type: 'text', value: val };
                  if (first) { item.newParagraph = true; first = false; }
                  parts.push(item);
                }
              } else if (node.nodeType === 1 && node.tagName === 'IMG' && node.classList.contains('math')) {
                const item = { type: 'img', src: node.src };
                if (first) { item.newParagraph = true; first = false; }
                parts.push(item);
                srcs.push(node.src);
              }
            }
          } else if (child.nodeType === 1 && child.tagName === 'DIV') {
            const img = child.querySelector('img');
            if (img?.src) { parts.push({ type: 'drawing', src: img.src }); srcs.push(img.src); }
          }
        }
        return { parts, srcs };
      }

      const condRender = texContainers[0].querySelector('[class*="TexRender_texRender"]');
      const qRender    = texContainers[1].querySelector('[class*="TexRender_texRender"]');

      const cond = condRender ? parseRender(condRender) : { parts: [], srcs: [] };
      const q    = qRender    ? parseRender(qRender)    : { parts: [], srcs: [] };

      return { taskId, condParts: cond.parts, condSrcs: cond.srcs, qParts: q.parts, qSrcs: q.srcs };
    });

    if (!parsed) { console.log('  ⚠ Не удалось распарсить (null)'); skipped++; continue; }
    if (parsed.error) { console.log('  ⚠', parsed.error, '(taskId=' + parsed.taskId + ')'); skipped++; continue; }
    if (!parsed.taskId) { console.log('  ⚠ Нет taskId'); skipped++; continue; }

    console.log(`  taskId=${parsed.taskId}, условие: ${parsed.condParts.length} частей, вопрос: ${parsed.qParts.length} частей`);

    // Объединяем: сначала условие, потом вопрос
    const allParts = [...parsed.condParts, ...parsed.qParts];
    const allSrcs  = [...parsed.condSrcs, ...parsed.qSrcs];

    // Скачиваем SVG
    const svgFiles = [];
    const formulaParts = allParts.filter(p => p.type === 'img');
    const multiFormula = formulaParts.length > 1;
    let formulaIdx = 0;

    for (const part of allParts) {
      if (part.type !== 'img' && part.type !== 'drawing') continue;
      const src = part.src;
      if (!src) continue;

      let svgFilename;
      if (part.type === 'drawing') {
        svgFilename = `${parsed.taskId}_drawing.svg`;
      } else {
        const suffix = multiFormula ? `_${formulaIdx + 1}` : '';
        svgFilename = `${parsed.taskId}${suffix}.svg`;
        formulaIdx++;
      }

      const svgPath = join(SVG_DIR, svgFilename);
      const relPath = `formulas/task1-5/${svgFilename}`;

      try {
        const ok = await downloadSvgViaBrowser(page, src, svgPath);
        if (ok) { svgFiles.push(relPath); part.file = relPath; process.stdout.write(`    ↓ ${svgFilename}\n`); }
        else console.warn(`    ⚠ Пустой SVG [${svgFilename}]`);
      } catch (e) { console.warn(`    ⚠ Ошибка SVG: ${e.message}`); }
      delete part.src;
    }

    // Находим все typeId=1 записи для этого прототипа с данным taskId школьково.
    // Для extra-SubTheme (А и Б) один taskId может давать несколько записей — обновляем все.
    let dbTasks = await prisma.task.findMany({
      where: {
        typeId: 1,
        prototype: subtype.protoId,
        OR: [
          { sourceUrl: { contains: parsed.taskId } },
          { source: { contains: parsed.taskId } },
        ]
      }
    });

    if (dbTasks.length === 0) {
      // Запасной вариант: ищем по первым словам вопроса
      const qText = parsed.qParts.find(p => p.type === 'text')?.value || '';
      if (qText) {
        dbTasks = await prisma.task.findMany({
          where: { typeId: 1, prototype: subtype.protoId, text: { contains: qText.substring(0, 30) } }
        });
      }
    }

    if (dbTasks.length === 0) {
      console.log(`  ⚠ Не найдено в БД (taskId=${parsed.taskId}, protoId=${subtype.protoId})`);
      skipped++;
      continue;
    }

    for (const dbTask of dbTasks) {
      await prisma.task.update({
        where: { id: dbTask.id },
        data: { text: JSON.stringify(allParts), images: JSON.stringify(svgFiles) }
      });
      console.log(`  ✓ Обновлено: ${dbTask.id} (setIndex=${dbTask.setIndex})`);
      updatedTotal++;
    }

  } catch (e) {
    console.log(`  ⛔ ОШИБКА: ${e.message}`);
    skipped++;
  }
}

await browser.disconnect();
await prisma.$disconnect();

console.log(`\n${'═'.repeat(50)}`);
console.log(`Обновлено: ${updatedTotal} / ${ALL_SUBTYPES.length}`);
console.log(`Пропущено: ${skipped}`);
