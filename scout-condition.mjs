/**
 * scout-condition.mjs
 * Разведка: какие элементы находятся ПЕРЕД блоками задач на странице.
 * Ищем "условие" — общий текст описания ситуации.
 *
 * Usage: node scout-condition.mjs
 * (Chrome должен быть запущен с --remote-debugging-port=9222)
 */

import puppeteer from 'puppeteer';

// Проверяем 3 разных прототипа для сравнения
const PAGES = [
  { name: 'Дороги-1',   url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=3582' },
  { name: 'Квартиры-3',  url: 'https://3.shkolkovo.online/catalog/3581?SubTheme=3603' },
  { name: 'Печи-1',     url: 'https://3.shkolkovo.online/catalog/3577?SubTheme=7022' },
];

const browser = await puppeteer.connect({
  browserURL: 'http://localhost:9222',
  defaultViewport: null,
});

const page = await browser.newPage();

for (const p of PAGES) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${p.name}`);
  console.log(`${'═'.repeat(60)}`);

  await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // 1. Найдём ВСЕ элементы от начала контента до первого Exercise
  const structure = await page.evaluate(() => {
    const result = [];

    // Ищем все ExerciseStyles_exercise блоки
    const exercises = document.querySelectorAll('[class*="ExerciseStyles_exercise__k79gf"]');
    if (exercises.length === 0) {
      result.push('НЕТ БЛОКОВ ЗАДАЧ');
      return result;
    }

    // Найдём родительский контейнер задач
    const firstExercise = exercises[0];
    const parent = firstExercise.parentElement;

    result.push(`Parent tag: ${parent.tagName}, class: ${parent.className?.slice(0, 100)}`);
    result.push(`Parent children: ${parent.children.length}`);
    result.push('');

    // Перечислим ВСЕ дочерние элементы parent ДО и ВКЛЮЧАЯ первую задачу
    for (const child of parent.children) {
      const isExercise = child.className?.includes('ExerciseStyles_exercise');
      const tag = child.tagName;
      const cls = (child.className || '').slice(0, 80);
      const text = (child.innerText || '').slice(0, 200).replace(/\n/g, ' ↵ ');

      result.push(`<${tag} class="${cls}">`);
      result.push(`  text: "${text}"`);

      if (isExercise) {
        result.push('  [EXERCISE — первый блок задачи]');
        break; // после первого Exercise останавливаемся
      }
    }

    // Также проверяем, нет ли чего-то выше parent
    result.push('');
    result.push('=== Siblings ПЕРЕД parent ===');
    const grandParent = parent.parentElement;
    if (grandParent) {
      result.push(`GrandParent tag: ${grandParent.tagName}, class: ${grandParent.className?.slice(0, 100)}`);
      for (const sibling of grandParent.children) {
        if (sibling === parent) {
          result.push('[PARENT — здесь начинаются задачи]');
          break;
        }
        const tag = sibling.tagName;
        const cls = (sibling.className || '').slice(0, 80);
        const text = (sibling.innerText || '').slice(0, 300).replace(/\n/g, ' ↵ ');
        result.push(`<${tag} class="${cls}">`);
        result.push(`  text: "${text}"`);
      }
    }

    // Проверим также блоки с class содержащим "condition", "description", "header", "info"
    result.push('');
    result.push('=== Поиск по ключевым классам ===');
    const keywords = ['condition', 'description', 'header', 'info', 'context', 'text', 'intro', 'task-text', 'TaskHeader', 'SubTheme'];
    for (const kw of keywords) {
      const els = document.querySelectorAll(`[class*="${kw}"]`);
      if (els.length > 0) {
        for (const el of els) {
          const txt = (el.innerText || '').slice(0, 150).replace(/\n/g, ' ↵ ');
          if (txt.length > 10) {
            result.push(`  [${kw}] <${el.tagName} class="${(el.className || '').slice(0, 60)}"> → "${txt}"`);
          }
        }
      }
    }

    return result;
  });

  for (const line of structure) {
    console.log(line);
  }
}

await page.close();
await browser.disconnect();
