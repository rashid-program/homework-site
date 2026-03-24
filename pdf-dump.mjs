// Тестовый дамп PDF текста — для проверки структуры
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const __dirname = dirname(fileURLToPath(import.meta.url));
const pdfPath = process.argv[2] || 'база заданий/Задание 6.pdf';
const absolutePath = resolve(__dirname, pdfPath);

const buffer = readFileSync(absolutePath);
const parser = new PDFParse();
const { text } = await parser.parse(buffer);

console.log('=== RAW TEXT ===\n');
console.log(text);
console.log('\n=== LINES WITH NUMBERS ===\n');
const lines = text.split('\n').map((l, i) => `${i + 1}: ${l}`);
for (const line of lines.slice(0, 100)) {
  console.log(line);
}
