/**
 * scout-condition-full.mjs
 * Полная разведка: ВСЕ дочерние элементы первого Exercise
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

  const detail = await page.evaluate(() => {
    const ex = document.querySelector('[class*="ExerciseStyles_exercise__k79gf"]');
    if (!ex) return ['Нет блоков задач'];

    const result = [];

    // Полный innerHTML первого Exercise (первые 3000 символов)
    result.push(`=== innerHTML Exercise (первые 5000 символов) ===`);
    result.push(ex.innerHTML.slice(0, 5000));

    result.push(`\n=== ПОЛНЫЙ innerText Exercise ===`);
    result.push(ex.innerText.slice(0, 3000));

    // Все прямые дочерние элементы Exercise
    result.push(`\n=== Прямые дети Exercise ===`);
    for (let i = 0; i < ex.children.length; i++) {
      const child = ex.children[i];
      const cls = (child.className || '').slice(0, 80);
      const tag = child.tagName;
      const text = (child.innerText || '').slice(0, 300).replace(/\n/g, ' ↵ ');
      result.push(`[${i}] <${tag} class="${cls}">`);
      result.push(`  innerText: "${text}"`);

      // Для каждого ребёнка — его дети
      for (let j = 0; j < child.children.length; j++) {
        const sub = child.children[j];
        const subCls = (sub.className || '').slice(0, 60);
        const subText = (sub.innerText || '').slice(0, 200).replace(/\n/g, ' ↵ ');
        result.push(`  [${i}.${j}] <${sub.tagName} class="${subCls}"> "${subText}"`);
      }
    }

    return result;
  });

  for (const line of detail) {
    console.log(line);
  }
}

await page.close();
await browser.disconnect();
