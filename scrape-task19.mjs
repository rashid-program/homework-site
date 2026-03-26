/**
 * scrape-task19.mjs
 * Парсит задания №19 с shkolkovo.online через подключение к открытому браузеру.
 *
 * Задание 19 — "Анализ геометрических высказываний".
 * Нет подтем (SubTheme) — каждое задание = отдельный прототип.
 * Все задания чисто текстовые (без img.math и чертежей).
 *
 * Два формата вариантов ответов в HTML:
 *   1. <dl class="enumerate-enumitem"><dt>1.</dt><dd>текст</dd>...</dl>
 *   2. <p class="indent">   1) текст</p> (обычные параграфы)
 *
 * Ответ может быть одно число ("2") или несколько вариантов ("Варианты правильных ответов:\n23\n32").
 *
 * Usage: node scrape-task19.mjs
 * Output: подготовка к базе/Задание 19/tasks.json
 */

import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PAGES = [
  'https://3.shkolkovo.online/catalog/2541',
  'https://3.shkolkovo.online/catalog/2541?Page=2',
];

const OUTPUT_DIR = join(__dirname, 'подготовка к базе', 'Задание 19');
mkdirSync(OUTPUT_DIR, { recursive: true });

const browser = await puppeteer.connect({
  browserURL: 'http://localhost:9222',
  defaultViewport: null,
});

const pages = await browser.pages();
// Ищем именно вкладку с catalog/2541, или открываем новую
let page = pages.find(p => p.url().includes('catalog/2541')) || pages.find(p => p.url().includes('shkolkovo')) || await browser.newPage();

const allTasks = [];

for (const url of PAGES) {
  console.log(`\n── ${url} ──`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

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

  const tasks = await page.evaluate(() => {
    const exercises = document.querySelectorAll('[class*="ExerciseStyles_exercise__k79gf"]');
    const result = [];

    for (const ex of exercises) {
      const articleEl = ex.querySelector('[class*="ExerciseStyles_articul"]');
      const taskId = articleEl?.textContent?.trim().replace('#', '') || '';

      const titleEl = ex.querySelector('[class*="ExerciseStyles_title"]');
      const taskTitle = titleEl?.textContent?.trim() || '';

      const textContainer = ex.querySelector('[class*="ExerciseStyles_exercise__text"]');
      const texRender = textContainer?.querySelector('[class*="TexRender_texRender"]') || textContainer;

      // Собираем parts: итерируем дочерние узлы TexRender
      const parts = [];

      if (texRender) {
        for (const child of texRender.childNodes) {
          if (child.nodeType === 8) continue; // HTML-комментарии

          if (child.nodeType === 1 && child.tagName === 'P') {
            const p = child;
            // Проверяем есть ли контент
            const text = p.textContent.trim();
            if (!text) continue;

            // Текстовый параграф
            const item = { type: 'text', value: text, newParagraph: true };
            parts.push(item);

          } else if (child.nodeType === 1 && child.tagName === 'DL' && child.classList.contains('enumerate-enumitem')) {
            // Варианты ответов в формате DL: <dt>1.</dt><dd>текст</dd>
            const dts = [...child.querySelectorAll('dt.enumerate-enumitem')];
            const dds = [...child.querySelectorAll('dd.enumerate-enumitem')];

            for (let i = 0; i < dds.length; i++) {
              const num = dts[i]?.textContent?.trim() || `${i + 1}.`;
              const ddText = dds[i].textContent.replace(/\s+/g, ' ').trim();
              const combined = `${num} ${ddText}`;
              parts.push({ type: 'text', value: combined, newParagraph: true });
            }
          }
        }
      }

      // Ответ: нормализуем "Варианты правильных ответов:\n23\n32" → "23"
      const answerEl = ex.querySelector('[class*="AnswerOldBlock_answerWrapper"]');
      let rawAnswer = answerEl?.innerText?.trim().replace(/^Ответ:\s*/i, '').trim() || '';
      let answer = rawAnswer;
      if (rawAnswer.toLowerCase().includes('варианты правильных ответов')) {
        // Берём первую строку после заголовка
        const lines = rawAnswer.split('\n').map(l => l.trim()).filter(l => l && !l.toLowerCase().includes('варианты'));
        answer = lines[0] || rawAnswer;
      }

      if (taskId) {
        // Каждое задание 19 = свой прототип (нет разделения на SubTheme)
        result.push({
          id: taskId,
          title: taskTitle,
          prototype: `Задание 19 — #${taskId}`,
          parts,
          svgFiles: [],
          answer,
        });
      }
    }

    return result;
  });

  console.log(`  Заданий: ${tasks.length}`);
  for (const task of tasks) {
    console.log(`    #${task.id} → "${task.answer}" (${task.parts.length} частей)`);
  }

  allTasks.push(...tasks);
}

// Сохраняем tasks.json
const outputPath = join(OUTPUT_DIR, 'tasks.json');
writeFileSync(outputPath, JSON.stringify(allTasks, null, 2), 'utf-8');

console.log(`\n✓ Готово! Всего заданий: ${allTasks.length}`);
console.log(`  JSON: ${outputPath}`);

await browser.disconnect();
