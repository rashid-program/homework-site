/**
 * scout-task1-5.mjs
 * Разведка структуры заданий 1-5 на shkolkovo.online.
 */

import puppeteer from 'puppeteer';

const CATALOG_URLS = [
  { name: 'Дороги',    url: 'https://3.shkolkovo.online/catalog/3574' },
  { name: 'Квартиры',  url: 'https://3.shkolkovo.online/catalog/3581' },
  { name: 'Участки',   url: 'https://3.shkolkovo.online/catalog/5321' },
  { name: 'Печи',      url: 'https://3.shkolkovo.online/catalog/3577' },
  { name: 'Бумага',    url: 'https://3.shkolkovo.online/catalog/3580' },
  { name: 'Шины',      url: 'https://3.shkolkovo.online/catalog/3578' },
  { name: 'Тарифы',    url: 'https://3.shkolkovo.online/catalog/8360' },
];

const browser = await puppeteer.connect({
  browserURL: 'http://localhost:9222',
  defaultViewport: null,
});

const page = await browser.newPage();

for (const cat of CATALOG_URLS) {
  console.log(`\n══════ ${cat.name} (${cat.url}) ══════`);

  try {
    await page.goto(cat.url, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    console.log(`  Ошибка навигации: ${e.message}`);
    continue;
  }
  await new Promise(r => setTimeout(r, 2000));

  // Ищем SubTheme фильтры
  const subthemes = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="SubTheme="]');
    return [...links].map(a => ({
      text: a.textContent.trim(),
      href: a.href,
      subthemeId: new URL(a.href).searchParams.get('SubTheme'),
    }));
  });

  if (subthemes.length > 0) {
    console.log(`  SubTheme фильтры (${subthemes.length}):`);
    for (const st of subthemes) {
      console.log(`    ${st.text} → SubTheme=${st.subthemeId}`);
    }
  } else {
    console.log('  Нет SubTheme фильтров');
  }

  // Считаем задания на странице
  const taskCount = await page.evaluate(() => {
    return document.querySelectorAll('[class*="ExerciseStyles_exercise__k79gf"]').length;
  });
  console.log(`  Заданий на странице: ${taskCount}`);

  // Раскрываем ответы и смотрим первое задание
  if (taskCount > 0) {
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('*')) {
        if (el.children.length === 0 && el.textContent?.trim() === 'Ответ и решение') {
          el.click();
        }
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    const firstTaskInfo = await page.evaluate(() => {
      const ex = document.querySelector('[class*="ExerciseStyles_exercise__k79gf"]');
      if (!ex) return null;

      const articleEl = ex.querySelector('[class*="ExerciseStyles_articul"]');
      const id = articleEl?.textContent?.trim() || '';

      const titleEl = ex.querySelector('[class*="ExerciseStyles_title"]');
      const title = titleEl?.textContent?.trim() || '';

      const textContainer = ex.querySelector('[class*="ExerciseStyles_exercise__text"]');
      const texRender = textContainer?.querySelector('[class*="TexRender_texRender"]') || textContainer;

      const children = [];
      if (texRender) {
        for (const child of texRender.childNodes) {
          if (child.nodeType === 1) {
            const tag = child.tagName;
            const cls = child.className?.toString()?.slice(0, 80) || '';
            const text = child.textContent?.slice(0, 120) || '';
            const imgs = child.querySelectorAll('img').length;
            const mathImgs = child.querySelectorAll('img.math').length;
            children.push({ tag, cls, text: text.replace(/\n/g, ' '), imgs, mathImgs });
          }
        }
      }

      const answerEl = ex.querySelector('[class*="AnswerOldBlock_answerWrapper"]');
      const answer = answerEl?.innerText?.trim().replace(/^Ответ:\s*/i, '').trim() || '';

      const html = texRender?.innerHTML?.slice(0, 2500) || '';

      return { id, title, childCount: children.length, children, answer, html };
    });

    if (firstTaskInfo) {
      console.log(`\n  Первое задание: ${firstTaskInfo.id} — ${firstTaskInfo.title}`);
      console.log(`  Ответ: "${firstTaskInfo.answer}"`);
      console.log(`  Дочерних элементов: ${firstTaskInfo.childCount}`);
      for (const c of firstTaskInfo.children) {
        console.log(`    <${c.tag}> cls="${c.cls}" imgs=${c.imgs} math=${c.mathImgs} text="${c.text.slice(0, 80)}"`);
      }
      console.log(`\n  HTML:\n${firstTaskInfo.html.slice(0, 2000)}`);
    }
  }
}

await page.close();
await browser.disconnect();
console.log('\n\nРазведка завершена!');
