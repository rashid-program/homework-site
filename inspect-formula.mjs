import puppeteer from 'puppeteer';

const browser = await puppeteer.connect({
  browserURL: 'http://localhost:9222',
  defaultViewport: null,
});

const pages = await browser.pages();
let page = pages.find(p => p.url().includes('shkolkovo'));

// Проверяем первые 3 задания на Тип 1
const info = await page.evaluate(() => {
  const exercises = document.querySelectorAll('[class*="ExerciseStyles_exercise__k79gf"]');
  const result = [];
  
  for (const ex of Array.from(exercises).slice(0, 3)) {
    const textContainer = ex.querySelector('[class*="ExerciseStyles_exercise__text"]');
    const imgs = Array.from(ex.querySelectorAll('img.math'));
    result.push({
      // Весь innerHTML текстового блока
      html: textContainer?.innerHTML?.slice(0, 500),
      // Атрибуты img.math
      images: imgs.map(img => ({ 
        alt: img.alt, 
        src: img.src?.slice(0,80),
        title: img.title
      }))
    });
  }
  return result;
});

info.forEach((item, i) => {
  console.log(`\n=== Задача ${i+1} ===`);
  console.log('HTML:', item.html);
  console.log('Images:', JSON.stringify(item.images, null, 2));
});

await browser.disconnect();
