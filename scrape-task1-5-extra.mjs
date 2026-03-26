/**
 * scrape-task1-5-extra.mjs
 * Парсит 6 пропущенных SubTheme (где больше 5 заданий) и разбивает на прототипы.
 *
 * План разбивки:
 * - Квартиры-1 (6): А=1,2,3,4,5 Б=1,2,3,4,6
 * - Квартиры-2 (9): А=1,2,4,6,8 Б=1,3,5,7,9
 * - Квартиры-5 (6): А=1,2,3,4,5 Б=1,2,3,4,6
 * - Участки-3 (6):  А=1,2,3,4,6 Б=1,5,3,4,6
 * - Бумага-4 (6):   А=1,2,4,5,6 Б=1,3,4,5,6
 * - Шины-3 (8):     удалить 8; А=1,2,3,4,6 Б=1,2,5,4,7
 *
 * Usage: node scrape-task1-5-extra.mjs
 * Output: подготовка к базе/Задание 1-5/tasks-extra.json + SVG
 */

import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// SubTheme для парсинга и правила разбивки на прототипы
const SUBTHEMES = [
  {
    name: 'Квартиры-1',
    url: 'https://3.shkolkovo.online/catalog/3581?SubTheme=9010',
    baseProtoId: 2, // Квартиры
    // Задачи по порядку на странице: 1,2,3,4,5,6
    // А: задачи 1,2,3,4,5 → taskNum=1,2,3,4,5
    // Б: задачи 1,2,3,4,6 → taskNum=1,2,3,4,5 (6-я становится задачей 5)
    sets: [
      { indices: [1, 2, 3, 4, 5] },  // А — берём задачи с номерами 1,2,3,4,5
      { indices: [1, 2, 3, 4, 6] },  // Б — берём 1,2,3,4,6 (6 как задача 5)
    ],
  },
  {
    name: 'Квартиры-2',
    url: 'https://3.shkolkovo.online/catalog/3581?SubTheme=9011',
    baseProtoId: 2,
    // Задачи: 1,2,3,4,5,6,7,8,9
    // А: 1,2,4,6,8
    // Б: 1,3,5,7,9
    sets: [
      { indices: [1, 2, 4, 6, 8] },
      { indices: [1, 3, 5, 7, 9] },
    ],
  },
  {
    name: 'Квартиры-5',
    url: 'https://3.shkolkovo.online/catalog/3581?SubTheme=4128',
    baseProtoId: 2,
    // Задачи: 1,2,3,4,5,6
    // А: 1,2,3,4,5
    // Б: 1,2,3,4,6
    sets: [
      { indices: [1, 2, 3, 4, 5] },
      { indices: [1, 2, 3, 4, 6] },
    ],
  },
  {
    name: 'Участки-3',
    url: 'https://3.shkolkovo.online/catalog/5321?SubTheme=4515',
    baseProtoId: 3,
    // Задачи: 1,2,3,4,5,6 (задачи 2 и 5 — тип 2)
    // А: 1,2,3,4,6
    // Б: 1,5,3,4,6
    sets: [
      { indices: [1, 2, 3, 4, 6] },
      { indices: [1, 5, 3, 4, 6] },
    ],
  },
  {
    name: 'Бумага-4',
    url: 'https://3.shkolkovo.online/catalog/3580?SubTheme=3598',
    baseProtoId: 5,
    // Задачи: 1,2,3,4,5,6 (задачи 2 и 3 — тип 2)
    // А: 1,2,4,5,6
    // Б: 1,3,4,5,6
    sets: [
      { indices: [1, 2, 4, 5, 6] },
      { indices: [1, 3, 4, 5, 6] },
    ],
  },
  {
    name: 'Шины-3',
    url: 'https://3.shkolkovo.online/catalog/3578?SubTheme=4090',
    baseProtoId: 6,
    // Задачи: 1,2,3,4,5,6,7,8; удалить 8
    // задачи 3,5 — тип 3; задачи 6,7 — тип 5
    // А: 1,2,3,4,6
    // Б: 1,2,5,4,7
    sets: [
      { indices: [1, 2, 3, 4, 6] },
      { indices: [1, 2, 5, 4, 7] },
    ],
  },
];

const OUTPUT_DIR = join(__dirname, 'подготовка к базе', 'Задание 1-5');
const SVG_DIR = join(__dirname, 'server', 'public', 'formulas', 'task1-5');
mkdirSync(OUTPUT_DIR, { recursive: true });
mkdirSync(SVG_DIR, { recursive: true });

async function downloadSvgViaBrowser(page, url, destPath) {
  const svgContent = await page.evaluate(async (svgUrl) => {
    try {
      const response = await fetch(svgUrl, { credentials: 'include' });
      if (!response.ok) return null;
      return await response.text();
    } catch (e) { return null; }
  }, url);
  if (svgContent) { writeFileSync(destPath, svgContent, 'utf-8'); return true; }
  return false;
}

const browser = await puppeteer.connect({
  browserURL: 'http://localhost:9222',
  defaultViewport: null,
});

const page = await browser.newPage();
const allExtraTasks = [];

for (const st of SUBTHEMES) {
  console.log(`\n══════ ${st.name} ══════`);

  try {
    // Навигация с retry
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.goto(st.url, { waitUntil: 'networkidle2', timeout: 30000 });
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

    // Собираем ВСЕ задания (без ограничения)
    const rawTasks = await page.evaluate(() => {
      const exercises = document.querySelectorAll('[class*="ExerciseStyles_exercise__k79gf"]');
      const result = [];

      for (const ex of exercises) {
        const articleEl = ex.querySelector('[class*="ExerciseStyles_articul"]');
        const taskId = articleEl?.textContent?.trim().replace('#', '') || '';

        const titleEl = ex.querySelector('[class*="ExerciseStyles_title"]');
        const taskTitle = titleEl?.textContent?.trim() || '';

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
              const drawingImg = child.querySelector('img');
              if (drawingImg && drawingImg.src) {
                parts.push({ type: 'drawing', src: drawingImg.src });
                formulaSrcs.push(drawingImg.src);
                hasFormulas = true;
              }
            }
          }
        }

        const answerEl = ex.querySelector('[class*="AnswerOldBlock_answerWrapper"]');
        const answer = answerEl?.innerText?.trim().replace(/^Ответ:\s*/i, '').trim() || '';

        if (taskId) {
          result.push({
            id: taskId,
            title: taskTitle,
            taskNum,
            parts,
            formulaSrcs,
            hasFormulas,
            answer,
          });
        }
      }
      return result;
    });

    console.log(`  Найдено заданий: ${rawTasks.length}`);
    for (const t of rawTasks) {
      console.log(`    #${t.id} — ${t.title} (taskNum=${t.taskNum})`);
    }

    // Скачиваем SVG для ВСЕХ заданий (даже тех, которые пойдут в несколько прототипов)
    const taskById = {};
    for (const task of rawTasks) {
      task.svgFiles = [];
      task.prototype = st.baseProtoId;

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
              console.warn(`    ⚠ Пустой SVG для #${task.id}`);
            }
          } catch (e) {
            console.warn(`    ⚠ Ошибка SVG #${task.id}: ${e.message}`);
          }
          delete part.src;
        }
      }

      delete task.formulaSrcs;
      delete task.hasFormulas;

      taskById[task.taskNum] = task;
    }

    // Разбиваем на прототипы
    for (let setIdx = 0; setIdx < st.sets.length; setIdx++) {
      const set = st.sets[setIdx];
      const setLabel = setIdx === 0 ? 'А' : 'Б';
      console.log(`\n  Прототип ${setLabel}: задачи [${set.indices.join(',')}]`);

      const setTasks = [];
      for (let i = 0; i < set.indices.length; i++) {
        const srcTaskNum = set.indices[i]; // номер задачи на странице
        const targetTaskNum = i + 1;       // номер задачи в комплекте (1-5)
        const srcTask = rawTasks.find(t => t.taskNum === srcTaskNum);

        if (!srcTask) {
          console.log(`    ⚠ Задача ${srcTaskNum} не найдена!`);
          continue;
        }

        // Клонируем задание с новым taskNum
        const cloned = JSON.parse(JSON.stringify(srcTask));
        cloned.taskNum = targetTaskNum;
        cloned.prototype = st.baseProtoId;
        setTasks.push(cloned);

        console.log(`    Задача ${targetTaskNum} ← #${srcTask.id} (было: Задача ${srcTaskNum}), ответ: "${srcTask.answer}"`);
      }

      if (setTasks.length === 5) {
        allExtraTasks.push(...setTasks);
        console.log(`    ✓ Комплект ${setLabel} добавлен`);
      } else {
        console.log(`    ⛔ Неполный комплект (${setTasks.length}/5)!`);
      }
    }

  } catch (e) {
    console.log(`  ⚠ ОШИБКА на ${st.name}: ${e.message}`);
  }
}

// Сохраняем
const outputPath = join(OUTPUT_DIR, 'tasks-extra.json');
writeFileSync(outputPath, JSON.stringify(allExtraTasks, null, 2), 'utf-8');

console.log(`\n✓ Готово! Дополнительных заданий: ${allExtraTasks.length} (комплектов: ${allExtraTasks.length / 5})`);
console.log(`  JSON: ${outputPath}`);

// Статистика
const byProto = {};
for (const t of allExtraTasks) {
  const key = t.prototype;
  byProto[key] = (byProto[key] || 0) + 1;
}
const protoNames = { 2: 'Квартиры', 3: 'Участки', 5: 'Бумага', 6: 'Шины' };
for (const [p, count] of Object.entries(byProto)) {
  console.log(`  ${protoNames[p] || p}: ${count} заданий (${count / 5} комплектов)`);
}

await page.close();
await browser.disconnect();
