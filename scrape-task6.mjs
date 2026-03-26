/**
 * scrape-task6.mjs
 * Парсит задания №6 с shkolkovo.online через подключение к открытому браузеру.
 *
 * Стратегия по типам:
 *   Типы 1–5 (дроби)        → скачивает SVG формулы, хранит в server/public/formulas/task6/
 *   Типы 6–9 (десятичные)   → сохраняет plain-текст, images = []
 *
 * Usage: node scrape-task6.mjs
 * Output: подготовка к базе/Задание 6/tasks.json
 *         server/public/formulas/task6/*.svg
 */

import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync, createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUBTYPES = [
  { name: 'Тип 1', url: 'https://3.shkolkovo.online/catalog/7132?SubTheme=9436', hasSvg: true },
  { name: 'Тип 2', url: 'https://3.shkolkovo.online/catalog/7132?SubTheme=9437', hasSvg: true },
  { name: 'Тип 3', url: 'https://3.shkolkovo.online/catalog/7132?SubTheme=9438', hasSvg: true },
  { name: 'Тип 4', url: 'https://3.shkolkovo.online/catalog/7132?SubTheme=9439', hasSvg: true },
  { name: 'Тип 5', url: 'https://3.shkolkovo.online/catalog/7132?SubTheme=9440', hasSvg: true },
  { name: 'Тип 6', url: 'https://3.shkolkovo.online/catalog/7132?SubTheme=9441', hasSvg: false },
  { name: 'Тип 7', url: 'https://3.shkolkovo.online/catalog/7132?SubTheme=9442', hasSvg: false },
  { name: 'Тип 8', url: 'https://3.shkolkovo.online/catalog/7132?SubTheme=9443', hasSvg: false },
  { name: 'Тип 9', url: 'https://3.shkolkovo.online/catalog/7132?SubTheme=9444', hasSvg: true },
];

const OUTPUT_DIR = join(__dirname, 'подготовка к базе', 'Задание 6');
const SVG_DIR = join(__dirname, 'server', 'public', 'formulas', 'task6');
mkdirSync(OUTPUT_DIR, { recursive: true });
mkdirSync(SVG_DIR, { recursive: true });

// Скачать файл по URL → локальный путь
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = createWriteStream(destPath);
    proto.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => {
      file.close();
      reject(err);
    });
  });
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
  console.log(`\n── ${subtype.name} (${subtype.hasSvg ? 'SVG' : 'текст'}) ──`);
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
  const tasks = await page.evaluate((subtypeName, hasSvg) => {
    const exercises = document.querySelectorAll('[class*="ExerciseStyles_exercise__k79gf"]');
    const result = [];

    for (const ex of exercises) {
      const articleEl = ex.querySelector('[class*="ExerciseStyles_articul"]');
      const taskId = articleEl?.textContent?.trim().replace('#', '') || '';

      const titleEl = ex.querySelector('[class*="ExerciseStyles_title"]');
      const taskTitle = titleEl?.textContent?.trim() || '';

      const textContainer = ex.querySelector('[class*="ExerciseStyles_exercise__text"]');

      // Для SVG-типов: текст без формулы + src картинки
      // Для текстовых типов: полный текст с символами операций
      let text = '';
      let formulaSrc = null;

      if (textContainer) {
        if (hasSvg) {
          // Берём только текст из <p>, формулу (img.math) исключаем
          const pTags = Array.from(textContainer.querySelectorAll('p'));
          const parts = pTags.map(p => {
            const clone = p.cloneNode(true);
            clone.querySelectorAll('img.math').forEach(img => img.remove());
            return clone.innerText?.trim();
          }).filter(Boolean);
          text = parts.join(' ').replace(/\s*Источники:.*$/i, '').trim();

          // Берём src первой img.math
          const img = textContainer.querySelector('img.math');
          formulaSrc = img?.src || null;
        } else {
          // Десятичные — берём весь текст, заменяем img на alt
          const pTags = Array.from(textContainer.querySelectorAll('p'));
          const parts = pTags.map(p => {
            const clone = p.cloneNode(true);
            clone.querySelectorAll('img.math').forEach(img => {
              const span = document.createElement('span');
              span.textContent = ` ${img.alt} `;
              img.parentNode.replaceChild(span, img);
            });
            return clone.innerText?.trim();
          }).filter(Boolean);
          text = parts.join(' ').replace(/\s*Источники:.*$/i, '').trim();
        }
      }

      // Ответ
      const answerEl = ex.querySelector('[class*="AnswerOldBlock_answerWrapper"]');
      const answer = answerEl?.innerText?.trim().replace(/^Ответ:\s*/i, '').trim() || '';

      if (taskId) {
        result.push({ id: taskId, title: taskTitle, prototype: subtypeName, text, formulaSrc, answer });
      }
    }
    return result;
  }, subtype.name, subtype.hasSvg);

  console.log(`  Заданий собрано: ${tasks.length}`);

  // Скачиваем SVG для типов с дробями
  for (const task of tasks) {
    if (subtype.hasSvg && task.formulaSrc) {
      const svgPath = join(SVG_DIR, `${task.id}.svg`);
      try {
        await downloadFile(task.formulaSrc, svgPath);
        task.svgFile = `formulas/task6/${task.id}.svg`;
        process.stdout.write(`    ↓ ${task.id}.svg\n`);
      } catch (e) {
        console.warn(`    ⚠ Не удалось скачать SVG для #${task.id}: ${e.message}`);
        task.svgFile = null;
      }
    } else {
      task.svgFile = null;
    }

    console.log(`    ${task.title} #${task.id} → ответ: "${task.answer}"`);
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
