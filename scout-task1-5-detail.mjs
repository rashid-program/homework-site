/**
 * scout-task1-5-detail.mjs
 * Детальный разбор структуры: какие задания на каждом SubTheme Дорог
 */

import puppeteer from 'puppeteer';

const SUBTHEMES = [
  { name: 'Дороги-1', url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=3582' },
  { name: 'Дороги-2', url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=13155' },
  { name: 'Дороги-3', url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=3583' },
  { name: 'Дороги-4', url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=4091' },
  { name: 'Дороги-5', url: 'https://3.shkolkovo.online/catalog/3574?SubTheme=7839' },
];

const browser = await puppeteer.connect({
  browserURL: 'http://localhost:9222',
  defaultViewport: null,
});

const page = await browser.newPage();

for (const st of SUBTHEMES) {
  console.log(`\n══════ ${st.name} ══════`);
  await page.goto(st.url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const info = await page.evaluate(() => {
    const exercises = document.querySelectorAll('[class*="ExerciseStyles_exercise__k79gf"]');
    return [...exercises].map(ex => {
      const articleEl = ex.querySelector('[class*="ExerciseStyles_articul"]');
      const id = articleEl?.textContent?.trim() || '';
      const titleEl = ex.querySelector('[class*="ExerciseStyles_title"]');
      const title = titleEl?.textContent?.trim() || '';
      return { id, title };
    });
  });

  console.log(`  Заданий: ${info.length}`);
  for (const t of info) {
    console.log(`    ${t.id} — ${t.title}`);
  }
}

await page.close();
await browser.disconnect();
