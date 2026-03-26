/**
 * scout-condition-detail.mjs
 * Детальная разведка: что внутри Задачи 1 — ищем условие (общий текст).
 * Проверяем 3 разных прототипа.
 *
 * Usage: node scout-condition-detail.mjs
 */

import puppeteer from 'puppeteer';

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

  // Детально разбираем первый Exercise блок
  const detail = await page.evaluate(() => {
    const ex = document.querySelector('[class*="ExerciseStyles_exercise__k79gf"]');
    if (!ex) return ['Нет блоков задач'];

    const result = [];

    // Заголовок задачи
    const titleEl = ex.querySelector('[class*="ExerciseStyles_title"]');
    result.push(`Title: "${titleEl?.textContent?.trim() || 'N/A'}"`);

    // Текстовый контейнер
    const textContainer = ex.querySelector('[class*="ExerciseStyles_exercise__text"]');
    if (!textContainer) {
      result.push('НЕТ текстового контейнера!');
      return result;
    }

    result.push(`\nTextContainer className: ${textContainer.className?.slice(0, 100)}`);
    result.push(`TextContainer children: ${textContainer.children.length}`);

    // TexRender
    const texRender = textContainer.querySelector('[class*="TexRender_texRender"]') || textContainer;
    result.push(`TexRender: ${texRender.className?.slice(0, 100)}`);
    result.push(`TexRender childNodes: ${texRender.childNodes.length}`);

    // Полный innerText
    const fullText = texRender.innerText?.slice(0, 2000) || '';
    result.push(`\n=== Полный текст Задачи 1 (первые 2000 символов) ===`);
    result.push(fullText);

    // Разбираем каждый дочерний элемент TexRender
    result.push(`\n=== DOM-дерево TexRender ===`);
    let nodeIdx = 0;
    for (const child of texRender.childNodes) {
      if (child.nodeType === 8) continue; // комментарии

      const tag = child.tagName || '#text';
      const text = (child.textContent || '').slice(0, 200).replace(/\n/g, ' ↵ ');
      const cls = child.className ? ` class="${child.className.slice(0, 60)}"` : '';

      // Проверяем наличие img
      let imgs = '';
      if (child.nodeType === 1) {
        const images = child.querySelectorAll?.('img') || [];
        if (images.length > 0) {
          imgs = ` [${images.length} img: ${[...images].map(i => i.className?.includes('math') ? 'math' : (i.src?.includes('svg') ? 'svg' : 'other')).join(', ')}]`;
        }
      }

      result.push(`  [${nodeIdx}] <${tag}${cls}>${imgs}`);
      result.push(`    text: "${text}"`);
      nodeIdx++;
    }

    return result;
  });

  for (const line of detail) {
    console.log(line);
  }
}

await page.close();
await browser.disconnect();
