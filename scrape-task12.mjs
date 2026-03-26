/**
 * scrape-task12.mjs
 * Парсит задания №12 с shkolkovo.online через подключение к открытому браузеру.
 *
 * Предварительно запусти Chrome с remote debugging:
 * "C:\Users\Rashid\.cache\puppeteer\chrome\win64-146.0.7680.153\chrome-win64\chrome.exe"
 *   --remote-debugging-port=9222 --user-data-dir="C:\chrome-debug"
 *
 * Usage: node scrape-task12.mjs
 * Output: подготовка к базе/Задание 12/tasks.json
 */

import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 11 типов заданий №12 — Тема: Расчеты по формулам
const SUBTYPES = [
  { name: 'Тип 1',  url: 'https://3.shkolkovo.online/catalog/7151?SubTheme=9522' },
  { name: 'Тип 2',  url: 'https://3.shkolkovo.online/catalog/7151?SubTheme=9523' },
  { name: 'Тип 3',  url: 'https://3.shkolkovo.online/catalog/7151?SubTheme=9524' },
  { name: 'Тип 4',  url: 'https://3.shkolkovo.online/catalog/7151?SubTheme=9525' },
  { name: 'Тип 5',  url: 'https://3.shkolkovo.online/catalog/7151?SubTheme=9526' },
  { name: 'Тип 6',  url: 'https://3.shkolkovo.online/catalog/7151?SubTheme=9527' },
  { name: 'Тип 7',  url: 'https://3.shkolkovo.online/catalog/7151?SubTheme=9528' },
  { name: 'Тип 8',  url: 'https://3.shkolkovo.online/catalog/7151?SubTheme=9529' },
  { name: 'Тип 9',  url: 'https://3.shkolkovo.online/catalog/7151?SubTheme=9530' },
  { name: 'Тип 10', url: 'https://3.shkolkovo.online/catalog/7151?SubTheme=9531' },
  { name: 'Тип 11', url: 'https://3.shkolkovo.online/catalog/7151?SubTheme=9532' },
];

const OUTPUT_DIR = join(__dirname, 'подготовка к базе', 'Задание 12');
mkdirSync(OUTPUT_DIR, { recursive: true });

const browser = await puppeteer.connect({
  browserURL: 'http://localhost:9222',
  defaultViewport: null,
});

const pages = await browser.pages();
let page = pages.find(p => p.url().includes('shkolkovo'));
if (!page) {
  page = await browser.newPage();
}

const allTasks = [];

for (const subtype of SUBTYPES) {
  console.log(`\n── ${subtype.name} ──`);
  await page.goto(subtype.url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));

  // Кликаем все кнопки "Ответ и решение" (которые ещё не открыты)
  const expanded = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    let count = 0;
    for (const el of all) {
      if (el.children.length === 0 && el.textContent?.trim() === 'Ответ и решение') {
        el.click();
        count++;
      }
    }
    return count;
  });
  console.log(`  Раскрыто кнопок: ${expanded}`);

  // Ждём появления блока с ответом в DOM (подгружается через API)
  try {
    await page.waitForSelector('[class*="AnswerOldBlock_answerWrapper"]', { timeout: 6000 });
  } catch {}
  // Дополнительная пауза чтобы все ответы успели загрузиться
  await new Promise(r => setTimeout(r, 2000));

  // Собираем все задания
  const tasks = await page.evaluate((subtypeName) => {
    const exercises = document.querySelectorAll('[class*="ExerciseStyles_exercise__k79gf"]');
    const result = [];

    for (const ex of exercises) {
      // ID задания
      const articleEl = ex.querySelector('[class*="ExerciseStyles_articul"]');
      const taskId = articleEl?.textContent?.trim().replace('#', '') || '';

      // Номер задачи
      const titleEl = ex.querySelector('[class*="ExerciseStyles_title"]');
      const taskTitle = titleEl?.textContent?.trim() || '';

      // Текст задания — только из <p> тегов внутри .exercise__text (без <style>)
      const textContainer = ex.querySelector('[class*="ExerciseStyles_exercise__text"]');

      let text = '';
      if (textContainer) {
        const pTags = Array.from(textContainer.querySelectorAll('p'));
        const parts = pTags.map(p => {
          const clone = p.cloneNode(true);
          // Заменяем img.math на alt-текст формулы
          clone.querySelectorAll('img.math').forEach(img => {
            const span = document.createElement('span');
            span.textContent = ` $${img.alt}$ `;
            img.parentNode.replaceChild(span, img);
          });
          return clone.innerText?.trim();
        }).filter(Boolean);
        text = parts.join(' ').replace(/\s*Источники:.*$/i, '').trim();
      }

      // Alt-тексты формул (сырой LaTeX)
      const formulas = Array.from(ex.querySelectorAll('img.math')).map(img => img.alt?.trim());

      // Ответ
      const answerEl = ex.querySelector('[class*="AnswerOldBlock_answerWrapper"]');
      const answerText = answerEl?.innerText?.trim() || '';
      const answer = answerText.replace(/^Ответ:\s*/i, '').trim();

      // Решение
      const solutionEl = ex.querySelector('.exercise__solution-text, [class*="AnswerOldBlock_answerWrap"]');
      const solution = solutionEl?.innerText?.trim()
        .replace(/^Решение:\s*/i, '')
        .replace(/\nОтвет:.*$/s, '')
        .trim() || '';

      if (taskId) {
        result.push({
          id: taskId,
          title: taskTitle,
          prototype: subtypeName,
          text,
          formulas,
          answer,
          solution,
        });
      }
    }
    return result;
  }, subtype.name);

  console.log(`  Заданий собрано: ${tasks.length}`);
  tasks.forEach(t => console.log(`    ${t.title} #${t.id} → ответ: "${t.answer}"`));
  allTasks.push(...tasks);
}

// Сохраняем
const outputPath = join(OUTPUT_DIR, 'tasks.json');
writeFileSync(outputPath, JSON.stringify(allTasks, null, 2), 'utf-8');

console.log(`\n✓ Готово! Всего заданий: ${allTasks.length}`);
console.log(`  Сохранено в: ${outputPath}`);

await browser.disconnect();
