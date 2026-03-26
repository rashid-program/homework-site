import puppeteer from 'puppeteer';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

const screenshotDir = join(__dirname, 'temporary screenshots');
if (!existsSync(screenshotDir)) mkdirSync(screenshotDir);

// Find next screenshot number
const files = existsSync(screenshotDir) ? readdirSync(screenshotDir) : [];
const numbers = files
  .map(f => f.match(/screenshot-(\d+)/))
  .filter(Boolean)
  .map(m => parseInt(m[1]));
const nextNum = numbers.length ? Math.max(...numbers) + 1 : 1;

const filename = label
  ? `screenshot-${nextNum}-${label}.png`
  : `screenshot-${nextNum}.png`;

// Find Chrome executable
let executablePath;
const cacheBase = 'C:/Users/nateh/.cache/puppeteer/chrome';
if (existsSync(cacheBase)) {
  const dirs = readdirSync(cacheBase);
  for (const dir of dirs) {
    const chromePath = join(cacheBase, dir, 'chrome-win64', 'chrome.exe');
    if (existsSync(chromePath)) {
      executablePath = chromePath;
      break;
    }
  }
}

const launchOptions = { headless: 'new' };
if (executablePath) launchOptions.executablePath = executablePath;

const browser = await puppeteer.launch(launchOptions);
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
await new Promise(r => setTimeout(r, 3000));
await page.screenshot({ path: join(screenshotDir, filename), fullPage: true });

console.log(`Screenshot saved: temporary screenshots/${filename}`);
await browser.close();