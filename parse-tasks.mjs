/**
 * parse-tasks.mjs
 * Извлекает задания из PDF, скриншотит каждое, сохраняет структуру.
 * Usage: node parse-tasks.mjs "база заданий/Задание 6.pdf"
 */
import { readFileSync, mkdirSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import puppeteer from 'puppeteer';
import katex from 'katex';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// Читаем KaTeX CSS один раз для встраивания в HTML
const katexCSS = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'node_modules/katex/dist/katex.min.css'), 'utf-8');

const __dirname = dirname(fileURLToPath(import.meta.url));

// ════════════════════════════════════════════════════
// Config
// ════════════════════════════════════════════════════
const pdfArg = process.argv[2] || 'база заданий/Задание 6.pdf';
const pdfPath = resolve(__dirname, pdfArg);
const taskNumberMatch = pdfPath.match(/Задание\s*(\d+)/i);
if (!taskNumberMatch) { console.error('Не могу определить номер задания из имени файла'); process.exit(1); }
const taskNumber = taskNumberMatch[1];

console.log(`\n── Обработка: Задание ${taskNumber} ──\n`);

// ════════════════════════════════════════════════════
// 1. Чтение и парсинг PDF
// ════════════════════════════════════════════════════
const buf = readFileSync(pdfPath);
const { text } = await pdfParse(buf);

const lines = text.split('\n')
  .map(l => l.trim().replace(/[\uFE00-\uFE0F\u200B-\u200D\uFEFF]/g, ''))  // убираем variation selectors и zero-width chars
  .filter(l => l.length > 0);

// ════════════════════════════════════════════════════
// 2. Разбор структуры
// ════════════════════════════════════════════════════
const STANDALONE_OPS = new Set(['+', '-', '−', '·', '×', ':', '÷', '=']);

/** Однозначно это номер страницы (число ≤ 100 без точки) */
const isPageNum = s => /^\d{1,3}$/.test(s) && parseInt(s) <= 100;

/** Строка начинает задание: "1. " или "12. " */
const isTaskStart = s => /^\d+\.\s+\S/.test(s);

/** Настоящий заголовок прототипа — "Задача N", за которым идёт задание */
function isRealHeader(lines, idx) {
  if (!/^Задача \d+$/.test(lines[idx])) return false;
  for (let j = idx + 1; j < Math.min(idx + 6, lines.length); j++) {
    const l = lines[j];
    if (isPageNum(l)) continue;
    if (isTaskStart(l)) return true;       // нашли задание → настоящий заголовок
    if (/^Задача/.test(l) || l === 'Ответы') return false; // другой заголовок раньше
  }
  return false;
}

const prototypes = [];
const answers     = {};
let inAnswers        = false;
let currentProto     = null;
let currentAnsProto  = null;

let i = 0;
while (i < lines.length) {
  const line = lines[i];

  // ── Пропуск номеров страниц в главном цикле
  if (isPageNum(line)) { i++; continue; }

  // ── Раздел ответов
  if (line === 'Ответы') { inAnswers = true; i++; continue; }

  if (inAnswers) {
    const pm = line.match(/^Задача (\d+)$/);
    if (pm) {
      currentAnsProto = parseInt(pm[1]);
      answers[currentAnsProto] = {};
    } else {
      const am = line.match(/^(\d+)\.\s*(.+)$/);
      if (am && currentAnsProto !== null) {
        answers[currentAnsProto][parseInt(am[1])] = am[2].trim();
      }
    }
    i++; continue;
  }

  // ── Заголовок прототипа
  if (isRealHeader(lines, i)) {
    const num = parseInt(line.match(/\d+/)[0]);
    currentProto = { num, tasks: [] };
    prototypes.push(currentProto);
    i++; continue;
  }

  // ── Начало задания
  if (isTaskStart(line) && currentProto) {
    const m = line.match(/^(\d+)\.\s+(.+)/);
    const taskNum  = parseInt(m[1]);
    const taskText = m[2];

    if (taskText.endsWith('.')) {
      // Выражение вписано в строку задания
      currentProto.tasks.push({ num: taskNum, text: taskText.slice(0, -1).trim(), exprLines: [] });
      i++;
    } else {
      // Выражение на следующих строках
      i++;
      const exprLines = [];
      while (i < lines.length) {
        const cur = lines[i];
        if (cur === '.')         { i++; break; }   // конец задания — точка отдельной строкой
        if (isTaskStart(cur))    { break; }         // началось следующее задание
        if (/^Задача/.test(cur)) { break; }         // новый прототип

        // Точка может быть склеена с последним токеном: "·6." или "3."
        if (cur.endsWith('.') && cur.length > 1) {
          const content = cur.slice(0, -1).trim();
          if (content) exprLines.push(...splitExprToken(content));
          i++; break;
        }

        exprLines.push(...splitExprToken(cur));
        i++;
      }
      currentProto.tasks.push({ num: taskNum, text: taskText.trim(), exprLines });
    }
    continue;
  }

  i++;
}

// ── Отчёт
console.log(`Прототипов: ${prototypes.length}`);
console.log(`Групп ответов: ${Object.keys(answers).length}`);
prototypes.forEach(p => console.log(`  Задача ${p.num}: ${p.tasks.length} заданий`));

// ════════════════════════════════════════════════════
// 3. Построение LaTeX-выражения
// ════════════════════════════════════════════════════

/**
 * Разбивает токен вида "·6" на ["·", "6"] если начинается с оператора.
 * Скобки "(" и ")" остаются как отдельные токены.
 */
function splitExprToken(token) {
  if (!token) return [];
  if (STANDALONE_OPS.has(token[0]) && token.length > 1) {
    const rest = token.slice(1).trim();
    return rest ? [token[0], rest] : [token[0]];
  }
  return [token];
}
function toLatex(exprLines) {
  if (!exprLines || exprLines.length === 0) return '';

  let latex = '';
  let idx = 0;
  const PARENS = new Set(['(', ')']);

  while (idx < exprLines.length) {
    const cur = exprLines[idx];
    // Нормализуем токен: убираем variation selectors и unicode-переменные
    const normCur = cur.replace(/[\uFE00-\uFE0F]/g, '')
                       .replace(/푥/g, 'x').replace(/푦/g, 'y')
                       .replace(/푎/g, 'a').replace(/푏/g, 'b');

    // ── Знак корня √ (возможно с variation selector, уже снят в normCur)
    if (normCur === '√') {
      const next1 = exprLines[idx + 1];
      const next2 = exprLines[idx + 2];
      const n1norm = next1 ? next1.replace(/[\uFE00-\uFE0F]/g, '').replace(/푥/g, 'x').replace(/푦/g, 'y').replace(/푎/g, 'a').replace(/푏/g, 'b') : '';
      const n2norm = next2 ? next2.replace(/[\uFE00-\uFE0F]/g, '').replace(/푥/g, 'x').replace(/푦/g, 'y').replace(/푎/g, 'a').replace(/푏/g, 'b') : '';

      // Дробь под корнем: следующие два токена — чистые числа
      if (n1norm && n2norm && /^[\d.,]+$/.test(n1norm) && /^[\d.,]+$/.test(n2norm)) {
        latex += `\\sqrt{\\dfrac{${escLaTeX(next1)}}{${escLaTeX(next2)}}}`;
        idx += 3;
      } else if (n1norm) {
        // Корень от одного выражения — собираем до оператора или конца
        latex += `\\sqrt{${escLaTeX(next1)}}`;
        idx += 2;
      } else {
        latex += '\\sqrt{}';
        idx++;
      }
      continue;
    }

    if (STANDALONE_OPS.has(normCur)) {
      // Оператор-разделитель
      if      (normCur === '·' || normCur === '×') latex += ' \\cdot ';
      else if (normCur === '−')                    latex += ' - ';
      else                                          latex += ` ${normCur} `;
      idx++;
    } else if (PARENS.has(normCur)) {
      // Скобки — выводим как есть, они не числитель дроби
      latex += normCur;
      idx++;
    } else {
      // Проверяем следующий токен
      const next = idx + 1 < exprLines.length ? exprLines[idx + 1] : null;
      const nextNorm = next ? next.replace(/[\uFE00-\uFE0F]/g, '').replace(/푥/g, 'x').replace(/푦/g, 'y').replace(/푎/g, 'a').replace(/푏/g, 'b') : null;

      if (!nextNorm) {
        // Последний токен
        latex += escLaTeX(normCur);
        idx++;
      } else if (STANDALONE_OPS.has(nextNorm) || PARENS.has(nextNorm) || nextNorm === '√') {
        // Следующий — оператор/скобка/корень → текущий одиночный
        latex += escLaTeX(normCur);
        idx++;
      } else if (/[a-zA-Z]/.test(normCur) && /^\d+$/.test(nextNorm)) {
        // Переменная/выражение с переменной + число → СТЕПЕНЬ: x^{4}
        latex += escLaTeX(normCur) + `^{${nextNorm}}`;
        idx += 2;
      } else if (/^\d+$/.test(nextNorm) && /^[\d.,a-zA-Z]+$/.test(normCur)) {
        // Число + следующее число → ДРОБЬ (для случая типа "13,2" / "1,2")
        // Только если оба токена — числа (нет переменных в nextNorm)
        latex += `\\dfrac{${escLaTeX(normCur)}}{${escLaTeX(nextNorm)}}`;
        idx += 2;
      } else {
        // Одиночное выражение
        latex += escLaTeX(normCur);
        idx++;
      }
    }
  }

  return latex.trim();
}

function escLaTeX(s) {
  return s
    .replace(/[\uFE00-\uFE0F]/g, '')   // strip variation selectors
    .replace(/\u221A/g, '')             // убрать √ если случайно попал (обрабатывается в toLatex)
    .replace(/푥/g, 'x').replace(/푦/g, 'y')  // unicode-переменные из PDF
    .replace(/푎/g, 'a').replace(/푏/g, 'b')
    .replace(/·/g, '\\cdot ')
    .replace(/−/g, '-')
    .replace(/×/g, '\\times ')
    .replace(/(\d),(\d)/g, '$1{,}$2');  // десятичная запятая → {,} чтобы KaTeX не добавлял пробелы
}

// ════════════════════════════════════════════════════
// 4. Генерация HTML для скриншота (server-side KaTeX, без CDN)
// ════════════════════════════════════════════════════
function buildHTML(taskNum, taskText, exprLines) {
  const latex = toLatex(exprLines);

  // Server-side рендеринг: KaTeX генерирует HTML прямо в Node.js
  const mathHTML = latex
    ? katex.renderToString(latex, { throwOnError: false, displayMode: false })
    : '';

  // Гарантируем пробел между "выражения" и выражением (PDF иногда склеивает)
  const safeText = taskText
    ? taskText.replace(/выражения(\S)/, 'выражения $1')
    : '';

  const body = safeText
    ? `<span class="text">${safeText}</span> ${mathHTML}`
    : mathHTML;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<style>${katexCSS}</style>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 17px;
    line-height: 1.8;
    padding: 12px 20px;
    background: #fff;
    color: #111;
    display: inline-block;
    min-width: 460px;
    max-width: 720px;
    white-space: nowrap;
  }
  .katex { font-size: 1.05em; }
</style>
</head>
<body>${body}</body>
</html>`;
}

// ════════════════════════════════════════════════════
// 5. Puppeteer — скриншоты
// ════════════════════════════════════════════════════
const outputBase = join(__dirname, 'подготовка к базе', `Задание ${taskNumber}`);
mkdirSync(outputBase, { recursive: true });

// Поиск Chrome
function findChrome() {
  const bases = [
    'C:/Users/Rashid/.cache/puppeteer/chrome',
    'C:/Users/nateh/.cache/puppeteer/chrome',
  ];
  for (const base of bases) {
    if (!existsSync(base)) continue;
    for (const dir of readdirSync(base)) {
      const p = join(base, dir, 'chrome-win64', 'chrome.exe');
      if (existsSync(p)) return p;
    }
  }
  return undefined;
}

const launchOpts = { headless: 'new' };
const chromePath = findChrome();
if (chromePath) launchOpts.executablePath = chromePath;

const browser = await puppeteer.launch(launchOpts);
let totalShots = 0;

for (const proto of prototypes) {
  const protoDir = join(outputBase, String(proto.num));
  mkdirSync(protoDir, { recursive: true });

  for (const task of proto.tasks) {
    const html  = buildHTML(task.num, task.text, task.exprLines);
    const page  = await browser.newPage();

    await page.setViewport({ width: 800, height: 200 });
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Подгоняем размер под контент
    const { w, h } = await page.evaluate(() => ({
      w: document.body.scrollWidth + 40,
      h: document.body.scrollHeight + 24
    }));
    await page.setViewport({ width: Math.max(w, 480), height: Math.max(h, 60) });

    const outPath = join(protoDir, `${task.num}.png`);
    await page.screenshot({ path: outPath });
    await page.close();
    totalShots++;
  }

  console.log(`  ✓ Задача ${proto.num} — ${proto.tasks.length} скриншотов`);
}

await browser.close();

// ════════════════════════════════════════════════════
// 6. Сохранение ответов
// ════════════════════════════════════════════════════
const answersPath = join(outputBase, 'answers.json');
writeFileSync(answersPath, JSON.stringify(answers, null, 2), 'utf-8');

console.log(`\nГотово!`);
console.log(`  Скриншотов: ${totalShots}`);
console.log(`  Ответы: подготовка к базе/Задание ${taskNumber}/answers.json`);
