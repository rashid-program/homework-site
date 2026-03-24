import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

// Кликаем кнопку
await page.click('#select-all-part1');
await new Promise(r => setTimeout(r, 300));

const after = await page.evaluate(() => ({
  total: document.getElementById('total-count').textContent,
  task1: document.querySelector('input[data-count="1"]')?.value,
  task19: document.querySelector('input[data-count="19"]')?.value,
  btnState: document.getElementById('select-all-part1')?.dataset.selected,
}));
console.log('После клика "Выбрать всё" часть 1:', after);

// Кликаем снова — снимаем
await page.click('#select-all-part1');
await new Promise(r => setTimeout(r, 300));
const after2 = await page.evaluate(() => ({
  total: document.getElementById('total-count').textContent,
  task1: document.querySelector('input[data-count="1"]')?.value,
}));
console.log('После повторного клика (снять):', after2);
await browser.close();
