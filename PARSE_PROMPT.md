# Промпт для парсинга заданий

Продолжаем наполнение базы заданий для учебной платформы ОГЭ.

**Задача:** отпарсить задание №**[N]** с сайта **[ССЫЛКА]** и загрузить в БД.

**Что нужно сделать:**
1. Запустить Chrome с remote debugging если ещё не запущен:
   `"C:\Users\Rashid\.cache\puppeteer\chrome\win64-146.0.7680.153\chrome-win64\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\chrome-debug"`
2. Подключиться к Chrome через CDP (`http://localhost:9222`), открыть ссылку и найти все SubTheme ID (через атрибут `href` у фильтров с `?SubTheme=`)
3. Открыть по несколько заданий разных типов, проверить структуру:
   - сколько `<p>` в контейнере задания (каждый `<p>` = отдельный параграф-блок)
   - есть ли `img.math` в `<p>` (формулы), сколько их на задание
   - есть ли `<img>` без класса `math` в `<div class="center">` (чертёж/рисунок)
   - есть ли варианты ответов (1) 2) 3) 4)) — текстом или как `img.math`
   - **есть ли `img.math` в блоке ответа** (`[class*="AnswerOldBlock_answerWrapper"]`) — если да, ответ SVG (см. ниже)
4. Создать `scrape-taskN.mjs` по образцу `scrape-task20.mjs` (**актуальный шаблон для заданий второй части**) или `scrape-task18.mjs` (первая часть)
5. Запустить парсер — результат в `подготовка к базе/Задание N/tasks.json` + SVG в `server/public/formulas/taskN/`
6. Запустить `node import-tasks.mjs N` для загрузки в БД
7. Обновить таблицу статуса в CLAUDE.md

---

## Структура данных — `parts`

Все задания хранятся как массив `parts` — точная последовательность текста, формул и чертежей:

```json
[
  { "type": "text",    "value": "Одно из чисел", "newParagraph": true },
  { "type": "img",     "file": "formulas/task7/45452_1.svg" },
  { "type": "img",     "file": "formulas/task7/45452_2.svg" },
  { "type": "drawing", "file": "formulas/task7/45452_drawing.svg" },
  { "type": "text",    "value": "Одна из них соответствует числу", "newParagraph": true },
  { "type": "img",     "file": "formulas/task7/45452_5.svg" },
  { "type": "text",    "value": "Какая это точка?" },
  { "type": "img",     "file": "formulas/task7/45452_6.svg", "newParagraph": true },
  { "type": "img",     "file": "formulas/task7/45452_7.svg", "newParagraph": true },
  { "type": "img",     "file": "formulas/task7/45452_8.svg", "newParagraph": true },
  { "type": "img",     "file": "formulas/task7/45452_9.svg", "newParagraph": true }
]
```

### Четыре типа элементов в `parts`:

| type | что это | откуда берём | как именуем файл |
|------|---------|-------------|-----------------|
| `text` | фрагмент текста | текстовые узлы в `<p>` | — |
| `img` | формула (LaTeX → SVG) | `<img class="math">` внутри `<p>` | `{taskId}.svg` (1 форм.) / `{taskId}_1.svg`, `{taskId}_2.svg`, ... (несколько) |
| `drawing` | чертёж/рисунок | `<img>` без класса `math` в `<div class="center">` | `{taskId}_drawing.svg` |

**Правило:** используем `parts` всегда когда есть хоть один `img.math` или чертёж.
Чисто текстовые задания (без единой картинки) → обычная строка в `text`, `images: []`.

---

## Флаг `newParagraph` — ключевое правило

Каждый `<p>` оригинального HTML — отдельный блок. Флаг `newParagraph: true` ставится на **первый элемент** каждого `<p>`.

**Зачем:** рендерер использует `newParagraph` чтобы понять где начинается новая строка. Без него невозможно отличить:
- `A, B, C, D` в одной строке условия (один `<p>`, 4 img подряд без `newParagraph`)
- варианты `1)A`, `2)B`, `3)C`, `4)D` — каждый в отдельной строке (каждый в своём `<p>`, у каждого `newParagraph: true`)

**Правило рендеринга** (уже реализовано во всех файлах):
- `newParagraph: true` → начать новую строку (`<div>`)
- `type: "drawing"` → всегда центрированный блок, независимо от флага
- элементы без `newParagraph` → добавляются inline к текущей строке

---

## Задания с вариантами ответов (важно!)

Задания №7, №13, №19 содержат варианты ответов `1) 2) 3) 4)` прямо в тексте задания.
Варианты могут быть:
- **текстом**: `{ "type": "text", "value": "1) 8 и 9", "newParagraph": true }` — если в `<p>` только текстовый узел
- **формулой-SVG**: `{ "type": "img", ..., "newParagraph": true }` — если вариант содержит дробь или математику

В обоих случаях каждый вариант должен быть в отдельном `<p>` → `newParagraph: true` → отображается с новой строки. Парсер автоматически это обеспечивает, если правильно итерирует все `<p>`.

---

## Ответы в виде SVG (задания второй части — №20+)

Начиная с задания №20, ответы на большинство заданий содержат `img.math` — формулу SVG, а не числовой текст. Пользователь сверяет свой ответ визуально, числовая проверка не производится.

### Как определить тип ответа при анализе

```js
const answerEl = ex.querySelector('[class*="AnswerOldBlock_answerWrapper"]');
const answerMathImg = answerEl?.querySelector('img.math');
// Если answerMathImg есть → ответ SVG, скачать как {taskId}_answer.svg
// Если нет → ответ текстовый, взять answerEl.innerText
```

### Именование файла ответа

`{taskId}_answer.svg` — в папку `server/public/formulas/taskN/`

В БД в поле `answer` кладётся относительный путь: `formulas/taskN/{taskId}_answer.svg`

### Код скачивания SVG-ответа (добавить после скачивания формул задания)

```js
if (task.answerSrc) {
  const answerFilename = `${task.id}_answer.svg`;
  const answerSvgPath = join(SVG_DIR, answerFilename);
  const answerRelPath = `formulas/taskN/${answerFilename}`;  // ← заменить N

  const ok = await downloadSvgViaBrowser(page, task.answerSrc, answerSvgPath);
  if (ok) {
    task.answer = answerRelPath;   // путь к SVG — в поле answer
    task.svgFiles.push(answerRelPath);
  } else {
    task.answer = '';
  }
}
delete task.answerSrc;
```

### Сбор `answerSrc` в `page.evaluate`

```js
const answerEl = ex.querySelector('[class*="AnswerOldBlock_answerWrapper"]');
const answerMathImg = answerEl?.querySelector('img.math');
const answerSrc = answerMathImg?.src || null;

// Если нет SVG — берём текст
const answerText = answerSrc
  ? null
  : (answerEl?.innerText?.trim().replace(/^Ответ:\s*/i, '').trim() || '');

result.push({ ..., answerSrc, answer: answerText || '' });
```

### Отображение SVG-ответа на фронте

Поле `answer` содержит путь к файлу (`formulas/task20/12345_answer.svg`).
Фронт должен проверить: если `answer` начинается с `formulas/` — рендерить как `<img>`, иначе как текст.

> **Важно:** `_answer.svg` включается в массив `svgFiles` → попадает в `images` в БД.
> При рендеринге **не** нужно добавлять его в `parts` — он отображается отдельно в блоке ответа.

---

## Актуальный код сборки `parts` в `page.evaluate`

```js
const parts = [];
const formulaSrcs = [];
let hasFormulas = false;

if (textContainer) {
  // Итерируем все дочерние узлы контейнера по порядку (p + div.center)
  const texRender = textContainer.querySelector('[class*="TexRender_texRender"]') || textContainer;
  for (const child of texRender.childNodes) {
    if (child.nodeType === 8) continue; // HTML-комментарии пропускаем

    if (child.nodeType === 1 && child.tagName === 'P') {
      const p = child;
      // Пропускаем пустые абзацы (только пробелы/nbsp)
      const hasContent = [...p.childNodes].some(n =>
        (n.nodeType === 3 && n.textContent.trim()) ||
        (n.nodeType === 1 && n.tagName === 'IMG')
      );
      if (!hasContent) continue;

      let firstInP = true; // первый элемент параграфа получает newParagraph: true
      for (const node of p.childNodes) {
        if (node.nodeType === 3) {
          const val = node.textContent.trim();
          if (val) {
            const item = { type: 'text', value: val };
            if (firstInP) { item.newParagraph = true; firstInP = false; }
            parts.push(item);
          }
        } else if (node.nodeType === 1 && node.tagName === 'IMG' && node.classList.contains('math')) {
          const item = { type: 'img', src: node.src };
          if (firstInP) { item.newParagraph = true; firstInP = false; }
          parts.push(item);
          formulaSrcs.push(node.src);
          hasFormulas = true;
        }
      }
    } else if (child.nodeType === 1 && child.tagName === 'DIV' && child.classList.contains('center')) {
      // Чертёж — img без класса math в блоке div.center
      const drawingImg = child.querySelector('img:not(.math)');
      if (drawingImg && drawingImg.src) {
        parts.push({ type: 'drawing', src: drawingImg.src });
        formulaSrcs.push(drawingImg.src);
        hasFormulas = true;
      }
    }
  }
}
```

> **Отличие от старого кода:** старый вариант брал только первый `<p>` через `querySelector('p')`.
> Актуальный итерирует **все дочерние узлы** `TexRender`-контейнера, обходя и `<p>` и `<div class="center">` в правильном порядке, и ставит `newParagraph: true` на первый элемент каждого `<p>`.

---

## Скачивание SVG (через браузер, авторизация сохранена)

```js
async function downloadSvgViaBrowser(page, url, destPath) {
  const svgContent = await page.evaluate(async (svgUrl) => {
    try {
      const response = await fetch(svgUrl, { credentials: 'include' });
      if (!response.ok) return null;
      return await response.text();
    } catch (e) { return null; }
  }, url);
  if (svgContent) { writeFileSync(destPath, svgContent, 'utf-8'); return true; }
  return false;
}
```

**Логика именования при скачивании** (все формулы нумеруются глобально по заданию):

```js
const formulaParts = task.parts.filter(p => p.type === 'img');
const multiFormula = formulaParts.length > 1;
let formulaIdx = 0;

for (const part of task.parts) {
  if (part.type !== 'img' && part.type !== 'drawing') continue;

  let svgFilename;
  if (part.type === 'drawing') {
    svgFilename = `${task.id}_drawing.svg`;
  } else {
    const suffix = multiFormula ? `_${formulaIdx + 1}` : '';
    svgFilename = `${task.id}${suffix}.svg`;
    formulaIdx++;
  }

  const svgPath = join(SVG_DIR, svgFilename);
  const relPath = `formulas/taskN/${svgFilename}`;  // ← заменить N на номер задания

  const ok = await downloadSvgViaBrowser(page, part.src, svgPath);
  if (ok) {
    task.svgFiles.push(relPath);
    part.file = relPath;
  }
  delete part.src;
}
```

---

## Удаление старых заданий перед повторным импортом

```js
// Запускать из директории server/ через node -e "..."
const { PrismaClient } = require('./node_modules/.prisma/client');
const prisma = new PrismaClient();
const tasks = await prisma.task.findMany({ where: { typeId: N }, select: { id: true } });
await prisma.variantTask.deleteMany({ where: { taskId: { in: tasks.map(t => t.id) } } });
await prisma.task.deleteMany({ where: { typeId: N } });
await prisma.$disconnect();
```

---

## Импорт в БД

```bash
node import-tasks.mjs N          # импорт
node import-tasks.mjs N --dry    # dry run — показать без записи
```

- `import-tasks.mjs` сам определяет формат (tasks.json или PNG-папки)
- Если `parts` есть → `text` в БД = `JSON.stringify(parts)`
- Если чисто текстовое → `text` = строка, `images = '[]'`
- `images` = JSON-массив всех путей из `svgFiles` (формулы + чертёж)
- **Не менять логику `import-tasks.mjs` без необходимости**

---

## Рендеринг на фронте

Логика рендеринга реализована в **4 файлах** — при любых изменениях менять все сразу:

| Файл | Функция |
|------|---------|
| `variant.html` | `renderParts()` |
| `index.html` | `buildProtoPreviewHTML()` |
| `admin-task-type.html` | блок `if (isParts)` |
| `pdf-template.html` | `renderParts()` |

**Текущая логика:**
- `newParagraph: true` → начать новый `<div>` (новая строка)
- `type: "text"` / `type: "img"` → добавляются inline в текущую строку
- `type: "drawing"` → всегда отдельный центрированный блок

---

## Контекст проекта

- Рабочая директория: `c:\Users\Rashid\Desktop\ВАЙБКОДИНГ\Сайт для ДЗ`
- Актуальный шаблон парсера (первая часть): `scrape-task18.mjs`
- Актуальный шаблон парсера (вторая часть, SVG-ответы): `scrape-task20.mjs`
- Все SubTheme ID находим сами через CDP, пользователя не спрашиваем
- После анализа сайта сразу создаём скрипт и запускаем без лишних вопросов
- SVG раздаётся сервером: `/formulas/` → `server/public/formulas/`
- Источник всегда: `'Банк ФИПИ'`
