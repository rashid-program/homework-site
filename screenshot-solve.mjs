import puppeteer from 'puppeteer';
import { mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotDir = join(__dirname, 'temporary screenshots');
mkdirSync(screenshotDir, { recursive: true });

const existing = readdirSync(screenshotDir).filter(f => f.endsWith('.png'));
const nextNum = existing.length + 1;

const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: { width: 1400, height: 900 } });
const page = await browser.newPage();
await page.goto('http://localhost:3000/variant.html?config=6:3', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 1000));

// Нажать "Начать решение"
const btn = await page.$('button');
if (btn) await btn.click();
await new Promise(r => setTimeout(r, 2000));

const outPath = join(screenshotDir, `screenshot-${nextNum}-task6-solve.png`);
await page.screenshot({ path: outPath, fullPage: true });
console.log('Saved:', outPath);
await browser.disconnect();
