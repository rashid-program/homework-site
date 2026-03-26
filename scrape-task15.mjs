/**
 * scrape-task15.mjs
 * Парсит задания №15 с shkolkovo.online через подключение к открытому браузеру.
 *
 * Задания могут содержать 0–4+ img.math (углы, длины, переменные).
 * Задания с img.math → parts. Без img.math → plain text.
 *
 * Usage: node scrape-task15.mjs
 * Output: подготовка к базе/Задание 15/tasks.json
 *         server/public/formulas/task15/*.svg
 */

import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUBTYPES = [
  { name: 'Тип 1',  url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9557' },
  { name: 'Тип 2',  url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9558' },
  { name: 'Тип 3',  url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9559' },
  { name: 'Тип 4',  url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9560' },
  { name: 'Тип 5',  url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9561' },
  { name: 'Тип 6',  url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9562' },
  { name: 'Тип 7',  url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9563' },
  { name: 'Тип 8',  url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9564' },
  { name: 'Тип 9',  url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9565' },
  { name: 'Тип 10', url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9566' },
  { name: 'Тип 11', url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9567' },
  { name: 'Тип 12', url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9568' },
  { name: 'Тип 13', url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9569' },
  { name: 'Тип 14', url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9570' },
  { name: 'Тип 15', url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9571' },
  { name: 'Тип 16', url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9572' },
  { name: 'Тип 17', url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9573' },
  { name: 'Тип 18', url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9574' },
  { name: 'Тип 19', url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9575' },
  { name: 'Тип 20', url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9576' },
  { name: 'Тип 21', url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9577' },
  { name: 'Тип 22', url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9578' },
  { name: 'Тип 23', url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9579' },
  { name: 'Тип 24', url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9580' },
  { name: 'Тип 25', url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9581' },
  { name: 'Тип 26', url: 'https://3.shkolkovo.online/catalog/7154?SubTheme=9582' },
];

const OUTPUT_DIR = join(__dirname, 'подготовка к базе', 'Задание 15');
const SVG_DIR = join(__dirname, 'server', 'public', 'formulas', 'task15');
mkdirSync(OUTPUT_DIR, { recursive: true });
mkdirSync(SVG_DIR, { recursive: true });

// Скачать SVG изнутри браузера (уже авторизован)
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

const pages = await browser.pages();
let page = pages.find(p => p.url().includes('shkolkovo'));
if (!page) page = await browser.newPage();

const allTasks = [];

for (const subtype of SUBTYPES) {
  console.log(`\n── ${subtype.name} ──`);
  await page.goto(subtype.url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));

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
  const tasks = await page.evaluate((subtypeName) => {
    const exercises = document.querySelectorAll('[class*="ExerciseStyles_exercise__k79gf"]');
    const result = [];

    for (const ex of exercises) {
      const articleEl = ex.querySelector('[class*="ExerciseStyles_articul"]');
      const taskId = articleEl?.textContent?.trim().replace('#', '') || '';

      const titleEl = ex.querySelector('[class*="ExerciseStyles_title"]');
      const taskTitle = titleEl?.textContent?.trim() || '';

      const textContainer = ex.querySelector('[class*="ExerciseStyles_exercise__text"]');

      // parts — массив { type: 'text'|'img', value?: string, src?: string }
      const parts = [];
      const formulaSrcs = [];
      let hasFormulas = false;

      if (textContainer) {
        const p = textContainer.querySelector('p');
        if (p) {
          for (const node of p.childNodes) {
            if (node.nodeType === 3) { // Text node
              const val = node.textContent.trim();
              if (val) parts.push({ type: 'text', value: val });
            } else if (node.nodeType === 1 && node.tagName === 'IMG' && node.classList.contains('math')) {
              parts.push({ type: 'img', src: node.src });
              formulaSrcs.push(node.src);
              hasFormulas = true;
            }
          }
        }
        // Чертёж — img без класса math в блоке div.center
        const centerDiv = textContainer.querySelector('div.center');
        if (centerDiv) {
          const drawingImg = centerDiv.querySelector('img:not(.math)');
          if (drawingImg && drawingImg.src) {
            parts.push({ type: 'drawing', src: drawingImg.src });
            formulaSrcs.push(drawingImg.src);
            hasFormulas = true;
          }
        }
      }

      // Ответ
      const answerEl = ex.querySelector('[class*="AnswerOldBlock_answerWrapper"]');
      const answer = answerEl?.innerText?.trim().replace(/^Ответ:\s*/i, '').trim() || '';

      if (taskId) {
        result.push({ id: taskId, title: taskTitle, prototype: subtypeName, parts, formulaSrcs, hasFormulas, answer });
      }
    }
    return result;
  }, subtype.name);

  console.log(`  Заданий собрано: ${tasks.length}`);

  // Скачиваем SVG через браузер (авторизация сохранена)
  for (const task of tasks) {
    task.svgFiles = [];

    if (task.hasFormulas) {
      // Считаем формулы отдельно от чертежей для нумерации
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
        const relPath = `formulas/task15/${svgFilename}`;

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
    console.log(`    ${task.title} #${task.id} → ответ: "${task.answer}" (${formulaCount} форм., ${drawingCount} черт.)`);
  }

  allTasks.push(...tasks);
}

// Сохраняем tasks.json
const outputPath = join(OUTPUT_DIR, 'tasks.json');
writeFileSync(outputPath, JSON.stringify(allTasks, null, 2), 'utf-8');

console.log(`\n✓ Готово! Всего заданий: ${allTasks.length}`);
console.log(`  JSON: ${outputPath}`);
console.log(`  SVG:  ${SVG_DIR}`);

await browser.disconnect();
