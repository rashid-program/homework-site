/**
 * scrape-task8.mjs
 * Парсит задания №8 с shkolkovo.online через подключение к открытому браузеру.
 *
 * Все типы содержат формулы img.math → скачиваем все SVG на задание.
 * Задания могут иметь 1–3 img.math (выражение + значения переменных).
 *
 * Usage: node scrape-task8.mjs
 * Output: подготовка к базе/Задание 8/tasks.json
 *         server/public/formulas/task8/*.svg
 */

import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync, createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUBTYPES = [
  { name: 'Тип 1',  url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9461' },
  { name: 'Тип 2',  url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9462' },
  { name: 'Тип 3',  url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9463' },
  { name: 'Тип 4',  url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9464' },
  { name: 'Тип 5',  url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9465' },
  { name: 'Тип 6',  url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9466' },
  { name: 'Тип 7',  url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9467' },
  { name: 'Тип 8',  url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9468' },
  { name: 'Тип 9',  url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9469' },
  { name: 'Тип 10', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9470' },
  { name: 'Тип 11', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9471' },
  { name: 'Тип 12', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9472' },
  { name: 'Тип 13', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9473' },
  { name: 'Тип 14', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9474' },
  { name: 'Тип 15', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9475' },
  { name: 'Тип 16', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9476' },
  { name: 'Тип 17', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9477' },
  { name: 'Тип 18', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9478' },
  { name: 'Тип 19', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9479' },
  { name: 'Тип 20', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9480' },
  { name: 'Тип 21', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9481' },
  { name: 'Тип 22', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9482' },
  { name: 'Тип 23', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9483' },
  { name: 'Тип 24', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9484' },
  { name: 'Тип 25', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9485' },
  { name: 'Тип 26', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9486' },
  { name: 'Тип 27', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9487' },
  { name: 'Тип 28', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9488' },
  { name: 'Тип 29', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9489' },
  { name: 'Тип 30', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9490' },
  { name: 'Тип 31', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9491' },
  { name: 'Тип 32', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9492' },
  { name: 'Тип 33', url: 'https://3.shkolkovo.online/catalog/7147?SubTheme=9493' },
];

const OUTPUT_DIR = join(__dirname, 'подготовка к базе', 'Задание 8');
const SVG_DIR = join(__dirname, 'server', 'public', 'formulas', 'task8');
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
      // в порядке как на сайте (текст между SVG сохраняется)
      const parts = [];
      const formulaSrcs = [];

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
            }
          }
        }
      }

      // Ответ
      const answerEl = ex.querySelector('[class*="AnswerOldBlock_answerWrapper"]');
      const answer = answerEl?.innerText?.trim().replace(/^Ответ:\s*/i, '').trim() || '';

      if (taskId) {
        result.push({ id: taskId, title: taskTitle, prototype: subtypeName, parts, formulaSrcs, answer });
      }
    }
    return result;
  }, subtype.name);

  console.log(`  Заданий собрано: ${tasks.length}`);

  // Скачиваем SVG через браузер (авторизация сохранена)
  for (const task of tasks) {
    task.svgFiles = [];

    // Нумеруем img-parts отдельно
    let imgIdx = 0;
    for (const part of task.parts) {
      if (part.type !== 'img') continue;

      const suffix = task.formulaSrcs.length > 1 ? `_${imgIdx + 1}` : '';
      const svgFilename = `${task.id}${suffix}.svg`;
      const svgPath = join(SVG_DIR, svgFilename);
      const relPath = `formulas/task8/${svgFilename}`;

      try {
        const ok = await downloadSvgViaBrowser(page, part.src, svgPath);
        if (ok) {
          task.svgFiles.push(relPath);
          part.file = relPath; // заменяем src на локальный путь
          process.stdout.write(`    ↓ ${svgFilename}\n`);
        } else {
          console.warn(`    ⚠ Пустой SVG для #${task.id}[${imgIdx}]`);
        }
      } catch (e) {
        console.warn(`    ⚠ Ошибка SVG #${task.id}[${imgIdx}]: ${e.message}`);
      }
      delete part.src; // убираем абсолютный URL
      imgIdx++;
    }

    // Удаляем временное поле formulaSrcs
    delete task.formulaSrcs;

    console.log(`    ${task.title} #${task.id} → ответ: "${task.answer}" (${task.svgFiles.length} SVG)`);
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
