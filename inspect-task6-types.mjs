import puppeteer from 'puppeteer';

const browser = await puppeteer.connect({
  browserURL: 'http://localhost:9222',
  defaultViewport: null,
});

const pages = await browser.pages();
let page = pages.find(p => p.url().includes('shkolkovo'));
if (!page) page = await browser.newPage();

const SUBTYPES = [
  { name: 'Тип 1', url: 'https://3.shkolkovo.online/catalog/7132?SubTheme=9436' },
  { name: 'Тип 2', url: 'https://3.shkolkovo.online/catalog/7132?SubTheme=9437' },
  { name: 'Тип 3', url: 'https://3.shkolkovo.online/catalog/7132?SubTheme=9438' },
  { name: 'Тип 4', url: 'https://3.shkolkovo.online/catalog/7132?SubTheme=9439' },
  { name: 'Тип 5', url: 'https://3.shkolkovo.online/catalog/7132?SubTheme=9440' },
  { name: 'Тип 6', url: 'https://3.shkolkovo.online/catalog/7132?SubTheme=9441' },
  { name: 'Тип 7', url: 'https://3.shkolkovo.online/catalog/7132?SubTheme=9442' },
  { name: 'Тип 8', url: 'https://3.shkolkovo.online/catalog/7132?SubTheme=9443' },
  { name: 'Тип 9', url: 'https://3.shkolkovo.online/catalog/7132?SubTheme=9444' },
];

for (const subtype of SUBTYPES) {
  await page.goto(subtype.url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 800));

  const sample = await page.evaluate(() => {
    const ex = document.querySelector('[class*="ExerciseStyles_exercise__k79gf"]');
    if (!ex) return null;
    const textContainer = ex.querySelector('[class*="ExerciseStyles_exercise__text"]');
    const imgs = Array.from(ex.querySelectorAll('img.math'));
    return {
      plainText: textContainer?.innerText?.trim().slice(0, 120),
      imgCount: imgs.length,
      imgAlts: imgs.map(i => i.alt?.slice(0, 60)),
      imgSrcs: imgs.map(i => i.src?.slice(0, 80)),
    };
  });

  console.log(`\n── ${subtype.name} ──`);
  if (sample) {
    console.log('  Text:', sample.plainText);
    console.log('  imgs:', sample.imgCount, sample.imgAlts);
  }
}

await browser.disconnect();
