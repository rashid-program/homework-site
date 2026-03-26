import puppeteer from 'puppeteer';

const browser = await puppeteer.connect({
  browserURL: 'http://localhost:9222',
  defaultViewport: null,
});

const pages = await browser.pages();
let page = pages.find(p => p.url().includes('shkolkovo.online/catalog/7132'));
if (!page) {
  page = await browser.newPage();
  await page.goto('https://3.shkolkovo.online/catalog/7132', { waitUntil: 'networkidle2', timeout: 30000 });
}

console.log('URL:', page.url());

// Найдём все SubTheme ссылки
const subtypes = await page.evaluate(() => {
  const links = Array.from(document.querySelectorAll('a[href*="SubTheme="]'));
  return links.map(a => ({ 
    text: a.textContent.trim(), 
    href: a.href,
    subtheme: new URL(a.href).searchParams.get('SubTheme')
  }));
});

console.log('\nSubTheme ссылки:');
subtypes.forEach(s => console.log(`  ${s.text} → SubTheme=${s.subtheme}`));

// Посмотрим структуру страницы
const pageTitle = await page.title();
console.log('\nЗаголовок страницы:', pageTitle);

// Найдём основные элементы навигации/фильтрации
const navItems = await page.evaluate(() => {
  const items = [];
  document.querySelectorAll('[class*="filter"], [class*="Filter"], [class*="tab"], [class*="Tag"], [class*="tag"]').forEach(el => {
    const text = el.textContent?.trim();
    if (text && text.length < 100) {
      items.push({ tag: el.tagName, class: el.className?.slice(0,50), text });
    }
  });
  return items.slice(0, 30);
});
console.log('\nЭлементы фильтрации:');
navItems.forEach(i => console.log(`  ${i.tag} [${i.class}]: ${i.text}`));

await browser.disconnect();
