/**
 * scrape-task17.mjs
 * Парсит задания №17 с shkolkovo.online через подключение к открытому браузеру.
 *
 * Задания содержат текст с 0–1 img.math + чертёж в div.center.
 * Задания с img.math или чертежом → parts. Без картинок → plain text.
 *
 * Usage: node scrape-task17.mjs
 * Output: подготовка к базе/Задание 17/tasks.json
 *         server/public/formulas/task17/*.svg
 */

import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUBTYPES = [
  { name: 'Тип 1',  url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9618' },
  { name: 'Тип 2',  url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9619' },
  { name: 'Тип 3',  url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9620' },
  { name: 'Тип 4',  url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9621' },
  { name: 'Тип 5',  url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9622' },
  { name: 'Тип 6',  url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9623' },
  { name: 'Тип 7',  url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9624' },
  { name: 'Тип 8',  url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9625' },
  { name: 'Тип 9',  url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9626' },
  { name: 'Тип 10', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9627' },
  { name: 'Тип 11', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9628' },
  { name: 'Тип 12', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9629' },
  { name: 'Тип 13', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9630' },
  { name: 'Тип 14', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9631' },
  { name: 'Тип 15', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9632' },
  { name: 'Тип 16', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9633' },
  { name: 'Тип 17', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9634' },
  { name: 'Тип 18', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9635' },
  { name: 'Тип 19', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9636' },
  { name: 'Тип 20', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9637' },
  { name: 'Тип 21', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9638' },
  { name: 'Тип 22', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9639' },
  { name: 'Тип 23', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9640' },
  { name: 'Тип 24', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9641' },
  { name: 'Тип 25', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9642' },
  { name: 'Тип 26', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9643' },
  { name: 'Тип 27', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9644' },
  { name: 'Тип 28', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9645' },
  { name: 'Тип 29', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9646' },
  { name: 'Тип 30', url: 'https://3.shkolkovo.online/catalog/7156?SubTheme=9647' },
];

const OUTPUT_DIR = join(__dirname, 'подготовка к базе', 'Задание 17');
const SVG_DIR = join(__dirname, 'server', 'public', 'formulas', 'task17');
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

      const parts = [];
      const formulaSrcs = [];
      let hasFormulas = false;

      if (textContainer) {
        const texRender = textContainer.querySelector('[class*="TexRender_texRender"]') || textContainer;

        for (const child of texRender.childNodes) {
          if (child.nodeType === 8) continue; // HTML-комментарии пропускаем

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
          } else if (child.nodeType === 1 && child.tagName === 'DIV' && child.classList.contains('center')) {
            // Чертёж — img без класса math в блоке div.center
            const drawingImg = child.querySelector('img:not(.math)');
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
        const relPath = `formulas/task17/${svgFilename}`;

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
