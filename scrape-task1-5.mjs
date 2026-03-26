/**
 * scrape-task1-5.mjs
 * Парсит задания №1–5 с shkolkovo.online через подключение к открытому браузеру.
 *
 * Задания 1–5 — единый комплект. Каждый SubTheme = один комплект из 5 задач.
 * Прототипы (1=Дороги, 2=Квартиры, 3=Участки, 4=Печи, 5=Бумага, 6=Шины, 7=Тарифы).
 *
 * Каждое задание записывается отдельно: typeId=1..5, prototype=1..7
 *
 * Usage: node scrape-task1-5.mjs
 * Output: подготовка к базе/Задание 1-5/tasks.json
 *         server/public/formulas/task1-5/*.svg
 */

import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Прототипы и их SubTheme
// ВАЖНО: Тарифы (7) пока не включены — требуют ручной разбивки
const PROTOTYPES = [
  {
    protoId: 1,
    name: 'Дороги',
    subtypes: [
      { name: 'Дороги-1',  url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=3582' },
      { name: 'Дороги-2',  url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=13155' },
      { name: 'Дороги-3',  url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=3583' },
      { name: 'Дороги-4',  url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=4091' },
      { name: 'Дороги-5',  url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=7839' },
      { name: 'Дороги-6',  url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=4262' },
      { name: 'Дороги-7',  url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=12747' },
      { name: 'Дороги-9',  url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=7909' },
      { name: 'Дороги-10', url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=3830' },
      { name: 'Дороги-11', url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=4182' },
      { name: 'Дороги-12', url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=4703' },
    ],
  },
  {
    protoId: 2,
    name: 'Квартиры',
    subtypes: [
      { name: 'Квартиры-1', url: 'https://3.shkolkovo.online/catalog/3581?SubTheme=9010' },
      { name: 'Квартиры-2', url: 'https://3.shkolkovo.online/catalog/3581?SubTheme=9011' },
      { name: 'Квартиры-3', url: 'https://3.shkolkovo.online/catalog/3581?SubTheme=3603' },
      { name: 'Квартиры-4', url: 'https://3.shkolkovo.online/catalog/3581?SubTheme=4089' },
      { name: 'Квартиры-5', url: 'https://3.shkolkovo.online/catalog/3581?SubTheme=4128' },
      { name: 'Квартиры-6', url: 'https://3.shkolkovo.online/catalog/3581?SubTheme=3601' },
      { name: 'Квартиры-7', url: 'https://3.shkolkovo.online/catalog/3581?SubTheme=3602' },
    ],
  },
  {
    protoId: 3,
    name: 'Участки',
    subtypes: [
      { name: 'Участки-1', url: 'https://3.shkolkovo.online/catalog/5321?SubTheme=4514' },
      { name: 'Участки-2', url: 'https://3.shkolkovo.online/catalog/5321?SubTheme=7048' },
      { name: 'Участки-3', url: 'https://3.shkolkovo.online/catalog/5321?SubTheme=4515' },
      { name: 'Участки-4', url: 'https://3.shkolkovo.online/catalog/5321?SubTheme=9019' },
    ],
  },
  {
    protoId: 4,
    name: 'Печи',
    subtypes: [
      { name: 'Печи-1', url: 'https://3.shkolkovo.online/catalog/3577?SubTheme=7022' },
      { name: 'Печи-2', url: 'https://3.shkolkovo.online/catalog/3577?SubTheme=8373' },
      { name: 'Печи-3', url: 'https://3.shkolkovo.online/catalog/3577?SubTheme=4181' },
      { name: 'Печи-4', url: 'https://3.shkolkovo.online/catalog/3577?SubTheme=7858' },
      { name: 'Печи-5', url: 'https://3.shkolkovo.online/catalog/3577?SubTheme=3589' },
    ],
  },
  {
    protoId: 5,
    name: 'Бумага',
    subtypes: [
      { name: 'Бумага-3', url: 'https://3.shkolkovo.online/catalog/3580?SubTheme=4147' },
      { name: 'Бумага-4', url: 'https://3.shkolkovo.online/catalog/3580?SubTheme=3598' },
      { name: 'Бумага-5', url: 'https://3.shkolkovo.online/catalog/3580?SubTheme=3599' },
    ],
  },
  {
    protoId: 6,
    name: 'Шины',
    subtypes: [
      { name: 'Шины-1', url: 'https://3.shkolkovo.online/catalog/3578?SubTheme=11706' },
      { name: 'Шины-3', url: 'https://3.shkolkovo.online/catalog/3578?SubTheme=4090' },
      { name: 'Шины-4', url: 'https://3.shkolkovo.online/catalog/3578?SubTheme=4145' },
      { name: 'Шины-9', url: 'https://3.shkolkovo.online/catalog/3578?SubTheme=3592' },
    ],
  },
];

const OUTPUT_DIR = join(__dirname, 'подготовка к базе', 'Задание 1-5');
const SVG_DIR = join(__dirname, 'server', 'public', 'formulas', 'task1-5');
mkdirSync(OUTPUT_DIR, { recursive: true });
mkdirSync(SVG_DIR, { recursive: true });

// Скачать SVG изнутри браузера
async function downloadSvgViaBrowser(page, url, destPath) {
  const svgContent = await page.evaluate(async (svgUrl) => {
    try {
      const response = await fetch(svgUrl, { credentials: 'include' });
      if (!response.ok) return null;
      return await response.text();
    } catch (e) {
      return null;
    }
  }, url);

  if (svgContent) {
    writeFileSync(destPath, svgContent, 'utf-8');
    return true;
  }
  return false;
}

const browser = await puppeteer.connect({
  browserURL: 'http://localhost:9222',
  defaultViewport: null,
});

const page = await browser.newPage();

const allTasks = [];
const skippedSubtypes = []; // SubTheme с != 5 заданиями — для отчёта

for (const proto of PROTOTYPES) {
  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║ Прототип ${proto.protoId}: ${proto.name} (${proto.subtypes.length} комплектов) ║`);
  console.log(`╚════════════════════════════════════════╝`);

  for (const subtype of proto.subtypes) {
    console.log(`\n── ${subtype.name} ──`);

    try {
      // Навигация с retry
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await page.goto(subtype.url, { waitUntil: 'networkidle2', timeout: 30000 });
          break;
        } catch (e) {
          if (attempt === 2) throw e;
          console.log(`  Retry ${attempt + 1}...`);
          await new Promise(r => setTimeout(r, 3000));
        }
      }
      await new Promise(r => setTimeout(r, 2000));

      // Раскрываем ответы
      const expanded = await page.evaluate(() => {
        let count = 0;
        for (const el of document.querySelectorAll('*')) {
          if (el.children.length === 0 && el.textContent?.trim() === 'Ответ и решение') {
            el.click();
            count++;
          }
        }
        return count;
      });
      console.log(`  Раскрыто кнопок: ${expanded}`);

      try {
        await page.waitForSelector('[class*="AnswerOldBlock_answerWrapper"]', { timeout: 6000 });
      } catch {}
      await new Promise(r => setTimeout(r, 2000));

      // Собираем задания со страницы
      const tasks = await page.evaluate((protoId) => {
        const exercises = document.querySelectorAll('[class*="ExerciseStyles_exercise__k79gf"]');
        const result = [];

        for (const ex of exercises) {
          const articleEl = ex.querySelector('[class*="ExerciseStyles_articul"]');
          const taskId = articleEl?.textContent?.trim().replace('#', '') || '';

          const titleEl = ex.querySelector('[class*="ExerciseStyles_title"]');
          const taskTitle = titleEl?.textContent?.trim() || '';

          // Определяем номер задачи из заголовка (Задача 1 → 1)
          const taskNumMatch = taskTitle.match(/Задача\s+(\d+)/i);
          const taskNum = taskNumMatch ? parseInt(taskNumMatch[1]) : 0;

          const textContainer = ex.querySelector('[class*="ExerciseStyles_exercise__text"]');

          const parts = [];
          const formulaSrcs = [];
          let hasFormulas = false;

          if (textContainer) {
            const texRender = textContainer.querySelector('[class*="TexRender_texRender"]') || textContainer;
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
                    hasFormulas = true;
                  }
                }
              } else if (child.nodeType === 1 && child.tagName === 'DIV') {
                // Чертёж/таблица — img в div (math-display или center)
                const drawingImg = child.querySelector('img');
                if (drawingImg && drawingImg.src) {
                  parts.push({ type: 'drawing', src: drawingImg.src });
                  formulaSrcs.push(drawingImg.src);
                  hasFormulas = true;
                }
              }
            }
          }

          // Ответ
          const answerEl = ex.querySelector('[class*="AnswerOldBlock_answerWrapper"]');
          const answer = answerEl?.innerText?.trim().replace(/^Ответ:\s*/i, '').trim() || '';

          if (taskId) {
            result.push({
              id: taskId,
              title: taskTitle,
              taskNum,
              prototype: protoId,
              parts,
              formulaSrcs,
              hasFormulas,
              answer,
            });
          }
        }
        return result;
      }, proto.protoId);

      // ── ПРОВЕРКА: в комплекте должно быть ровно 5 заданий ──
      if (tasks.length !== 5) {
        console.log(`  ⛔ НЕ 5 заданий (${tasks.length})! ПРОПУСКАЮ — требуется ручная проверка.`);
        skippedSubtypes.push({ name: subtype.name, url: subtype.url, count: tasks.length,
          titles: tasks.map(t => `${t.title} #${t.id}`).join(', ') });
        continue;
      }

      // Проверяем что задачи 1-5
      const taskNums = tasks.map(t => t.taskNum).sort((a, b) => a - b);
      const expected = [1, 2, 3, 4, 5];
      if (JSON.stringify(taskNums) !== JSON.stringify(expected)) {
        console.log(`  ⛔ Номера задач не 1-5 (${taskNums.join(',')})! ПРОПУСКАЮ.`);
        skippedSubtypes.push({ name: subtype.name, url: subtype.url, count: tasks.length,
          titles: tasks.map(t => `Задача ${t.taskNum} #${t.id}`).join(', ') });
        continue;
      }

      console.log(`  ✓ Комплект из 5 заданий`);

      // Скачиваем SVG
      for (const task of tasks) {
        task.svgFiles = [];

        if (task.hasFormulas) {
          const formulaParts = task.parts.filter(p => p.type === 'img');
          const multiFormula = formulaParts.length > 1;

          let formulaIdx = 0;
          for (const part of task.parts) {
            if (part.type !== 'img' && part.type !== 'drawing') continue;

            let svgFilename;
            if (part.type === 'drawing') {
              svgFilename = `${task.id}_drawing.svg`;
            } else {
              const suffix = multiFormula ? `_${formulaIdx + 1}` : '';
              svgFilename = `${task.id}${suffix}.svg`;
              formulaIdx++;
            }

            const svgPath = join(SVG_DIR, svgFilename);
            const relPath = `formulas/task1-5/${svgFilename}`;

            try {
              const ok = await downloadSvgViaBrowser(page, part.src, svgPath);
              if (ok) {
                task.svgFiles.push(relPath);
                part.file = relPath;
                process.stdout.write(`    ↓ ${svgFilename}\n`);
              } else {
                console.warn(`    ⚠ Пустой SVG для #${task.id} [${svgFilename}]`);
              }
            } catch (e) {
              console.warn(`    ⚠ Ошибка SVG #${task.id} [${svgFilename}]: ${e.message}`);
            }
            delete part.src;
          }
        }

        // Удаляем временные поля
        delete task.formulaSrcs;
        delete task.hasFormulas;

        const drawingCount = task.parts.filter(p => p.type === 'drawing').length;
        const formulaCount = task.svgFiles.length - drawingCount;
        console.log(`    Задача ${task.taskNum} #${task.id} → ответ: "${task.answer}" (${formulaCount} форм., ${drawingCount} черт.)`);
      }

      allTasks.push(...tasks);

    } catch (e) {
      console.log(`  ⚠ ОШИБКА на ${subtype.name}: ${e.message}`);
      skippedSubtypes.push({ name: subtype.name, url: subtype.url, count: -1, titles: e.message });
    }
  }
}

// Сохраняем tasks.json
const outputPath = join(OUTPUT_DIR, 'tasks.json');
writeFileSync(outputPath, JSON.stringify(allTasks, null, 2), 'utf-8');

console.log(`\n✓ Готово! Всего заданий: ${allTasks.length} (комплектов: ${allTasks.length / 5})`);
console.log(`  JSON: ${outputPath}`);
console.log(`  SVG:  ${SVG_DIR}`);

// Статистика по прототипам
const byProto = {};
for (const t of allTasks) {
  const key = `${t.prototype}`;
  if (!byProto[key]) byProto[key] = { count: 0, tasks: {} };
  byProto[key].count++;
  byProto[key].tasks[t.taskNum] = (byProto[key].tasks[t.taskNum] || 0) + 1;
}
console.log('\nСтатистика:');
for (const [proto, info] of Object.entries(byProto)) {
  const protoName = PROTOTYPES.find(p => p.protoId === parseInt(proto))?.name || proto;
  console.log(`  ${protoName}: ${info.count} заданий, комплектов: ${info.count / 5} (${JSON.stringify(info.tasks)})`);
}

// Пропущенные SubTheme
if (skippedSubtypes.length > 0) {
  console.log(`\n⚠ Пропущенные SubTheme (${skippedSubtypes.length}):`);
  for (const s of skippedSubtypes) {
    console.log(`  ${s.name}: ${s.count} заданий — ${s.titles}`);
    console.log(`    URL: ${s.url}`);
  }
}

await page.close();
await browser.disconnect();
