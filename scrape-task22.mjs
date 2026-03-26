/**
 * scrape-task22.mjs
 * Парсит задания №22 (Графики функций) с shkolkovo.online через подключение к открытому браузеру.
 *
 * Особенности задания 22:
 * - Задания содержат формулы (img.math)
 * - Ответ — SVG-изображение (img.math после "Ответ:")
 * - Ответ сохраняется как SVG-файл: {taskId}_answer.svg
 *
 * Usage: node scrape-task22.mjs
 * Output: C:\Users\Rashid\OneDrive\Desktop\homework-site\подготовка к базе\Задание 22\tasks.json
 *         C:\Users\Rashid\OneDrive\Desktop\homework-site\server\public\formulas\task22\*.svg
 */

import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const SUBTYPES = [
  { name: 'Тип 1',  url: 'https://3.shkolkovo.online/catalog/7120?SubTheme=9361' },
  { name: 'Тип 2',  url: 'https://3.shkolkovo.online/catalog/7120?SubTheme=9363' },
  { name: 'Тип 3',  url: 'https://3.shkolkovo.online/catalog/7120?SubTheme=9365' },
  { name: 'Тип 4',  url: 'https://3.shkolkovo.online/catalog/7120?SubTheme=9367' },
  { name: 'Тип 5',  url: 'https://3.shkolkovo.online/catalog/7120?SubTheme=9369' },
  { name: 'Тип 6',  url: 'https://3.shkolkovo.online/catalog/7120?SubTheme=9371' },
  { name: 'Тип 7',  url: 'https://3.shkolkovo.online/catalog/7120?SubTheme=9372' },
  { name: 'Тип 8',  url: 'https://3.shkolkovo.online/catalog/7120?SubTheme=9373' },
  { name: 'Тип 9',  url: 'https://3.shkolkovo.online/catalog/7120?SubTheme=9374' },
  { name: 'Тип 10', url: 'https://3.shkolkovo.online/catalog/7120?SubTheme=9375' },
  { name: 'Тип 11', url: 'https://3.shkolkovo.online/catalog/7120?SubTheme=9376' },
  { name: 'Тип 12', url: 'https://3.shkolkovo.online/catalog/7120?SubTheme=9377' },
  { name: 'Тип 13', url: 'https://3.shkolkovo.online/catalog/7120?SubTheme=9378' },
  { name: 'Тип 14', url: 'https://3.shkolkovo.online/catalog/7120?SubTheme=9379' },
  { name: 'Тип 15', url: 'https://3.shkolkovo.online/catalog/7120?SubTheme=9380' },
  { name: 'Тип 16', url: 'https://3.shkolkovo.online/catalog/7120?SubTheme=9381' },
  { name: 'Тип 17', url: 'https://3.shkolkovo.online/catalog/7120?SubTheme=9382' },
  { name: 'Тип 18', url: 'https://3.shkolkovo.online/catalog/7120?SubTheme=9383' },
];

const OUTPUT_DIR = 'C:\\Users\\Rashid\\OneDrive\\Desktop\\homework-site\\подготовка к базе\\Задание 22';
const SVG_DIR    = 'C:\\Users\\Rashid\\OneDrive\\Desktop\\homework-site\\server\\public\\formulas\\task22';
mkdirSync(OUTPUT_DIR, { recursive: true });
mkdirSync(SVG_DIR,    { recursive: true });

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
  browserURL: 'http://localhost:9223',
  defaultViewport: null,
});

const page = await browser.newPage();

const allTasks = [];

for (const subtype of SUBTYPES) {
  console.log(`\n── ${subtype.name} ──`);

  try {
    await page.goto(subtype.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  } catch (e) {
    console.warn(`  Ошибка загрузки: ${e.message}`);
    continue;
  }
  await new Promise(r => setTimeout(r, 3000));

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
          } else if (child.nodeType === 1 && child.tagName === 'DIV' && child.classList.contains('center')) {
            const drawingImg = child.querySelector('img:not(.math)');
            if (drawingImg && drawingImg.src) {
              parts.push({ type: 'drawing', src: drawingImg.src });
              formulaSrcs.push(drawingImg.src);
              hasFormulas = true;
            }
          }
        }
      }

      // Ответ — берём img.math из блока ответа, если есть
      const answerEl = ex.querySelector('[class*="AnswerOldBlock_answerWrapper"]');
      const answerMathImg = answerEl?.querySelector('img.math');
      const answerSrc = answerMathImg?.src || null;

      // Если нет SVG-ответа — берём текст
      const answerText = answerSrc
        ? null
        : (answerEl?.innerText?.trim().replace(/^Ответ:\s*/i, '').trim() || '');

      if (taskId) {
        result.push({
          id: taskId,
          title: taskTitle,
          prototype: subtypeName,
          parts,
          formulaSrcs,
          hasFormulas,
          answerSrc,
          answer: answerText || '',
        });
      }
    }
    return result;
  }, subtype.name);

  console.log(`  Заданий собрано: ${tasks.length}`);

  // Скачиваем SVG через браузер
  for (const task of tasks) {
    task.svgFiles = [];

    // Скачиваем формулы/чертежи из текста задания
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
        const relPath = `formulas/task22/${svgFilename}`;

        try {
          const ok = await downloadSvgViaBrowser(page, part.src, svgPath);
          if (ok) {
            task.svgFiles.push(relPath);
            part.file = relPath;
            process.stdout.write(`    -> ${svgFilename}\n`);
          } else {
            console.warn(`    ! Пустой SVG для #${task.id} [${svgFilename}]`);
          }
        } catch (e) {
          console.warn(`    ! Ошибка SVG #${task.id} [${svgFilename}]: ${e.message}`);
        }
        delete part.src;
      }
    }

    // Скачиваем SVG-ответ
    if (task.answerSrc) {
      const answerFilename = `${task.id}_answer.svg`;
      const answerSvgPath = join(SVG_DIR, answerFilename);
      const answerRelPath = `formulas/task22/${answerFilename}`;

      try {
        const ok = await downloadSvgViaBrowser(page, task.answerSrc, answerSvgPath);
        if (ok) {
          task.answer = answerRelPath;
          task.svgFiles.push(answerRelPath);
          process.stdout.write(`    -> ${answerFilename} [ответ]\n`);
        } else {
          console.warn(`    ! Пустой SVG ответа для #${task.id}`);
          task.answer = '';
        }
      } catch (e) {
        console.warn(`    ! Ошибка SVG ответа #${task.id}: ${e.message}`);
        task.answer = '';
      }
    }

    delete task.formulaSrcs;
    delete task.hasFormulas;
    delete task.answerSrc;

    const drawingCount = task.parts.filter(p => p.type === 'drawing').length;
    const formulaCount = task.svgFiles.filter(f => !f.includes('_answer') && !f.includes('_drawing')).length;
    const hasAnswerSvg = task.svgFiles.some(f => f.includes('_answer'));
    console.log(`    ${task.title} #${task.id} -> ответ: ${hasAnswerSvg ? '[SVG]' : '"' + task.answer + '"'} (${formulaCount} форм., ${drawingCount} черт.)`);
  }

  allTasks.push(...tasks);
}

await page.close();

// Сохраняем tasks.json
const outputPath = join(OUTPUT_DIR, 'tasks.json');
writeFileSync(outputPath, JSON.stringify(allTasks, null, 2), 'utf-8');

console.log(`\nГотово! Всего заданий: ${allTasks.length}`);
console.log(`  JSON: ${outputPath}`);
console.log(`  SVG:  ${SVG_DIR}`);

await browser.disconnect();
