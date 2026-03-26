# CLAUDE.md — Frontend Website Rules
speak with me only in russian language
## Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.
- cheak CONTEX.md for understand what project is this
## Reference Images
- If a reference image is provided: match layout, spacing, typography, and color exactly. Swap in placeholder content (images via `https://placehold.co/`, generic copy). Do not improve or add to the design.
- If no reference image: design from scratch with high craft (see guardrails below).
- Screenshot your output, compare against reference, fix mismatches, re-screenshot. Do at least 2 comparison rounds. Stop only when no visible differences remain or user says so.

## Local Server
- **Always serve on localhost** — never screenshot a `file:///` URL.
- Start the dev server: `cd server && npm start` (serves project on `http://localhost:3000`)
- Сервер автоматически раздаёт фронтенд (index.html, variant.html) и API
- Если сервер уже запущен, не запускайте новый.

## Screenshot Workflow
- Chrome установлен в `C:\Users\Rashid\.cache\puppeteer\chrome\` (автоматически через npm)
- **Всегда скриншотируйте localhost:** `node screenshot.mjs http://localhost:3000`
- Скриншоты сохраняются в `./temporary screenshots/screenshot-N.png` (нумеруются автоматически)
- Пример: `node screenshot.mjs http://localhost:3000 home` → `screenshot-N-home.png`
- После скриншота читайте PNG с инструментом Read — я вижу изображение напрямую
- При сравнении будьте точны: "heading 32px, но в дизайне ~24px", "gap 16px, должен быть 24px"
- Проверяйте: отступы, размеры шрифтов, цвета (hex), выравнивание, border-radius, тени, размеры изображений

## Output Defaults
- Single `index.html` file, all styles inline, unless user says otherwise
- Tailwind CSS via CDN: `<script src="https://cdn.tailwindcss.com"></script>`
- Placeholder images: `https://placehold.co/WIDTHxHEIGHT`
- Mobile-first responsive

## Brand Assets
- Always check the `brand_assets/` folder before designing. It may contain logos, color guides, style guides, or images.
- If assets exist there, use them. Do not use placeholders where real assets are available.
- If a logo is present, use it. If a color palette is defined, use those exact values — do not invent brand colors.

## Anti-Generic Guardrails
- **Colors:** Never use default Tailwind palette (indigo-500, blue-600, etc.). Pick a custom brand color and derive from it.
- **Shadows:** Never use flat `shadow-md`. Use layered, color-tinted shadows with low opacity.
- **Typography:** Never use the same font for headings and body. Pair a display/serif with a clean sans. Apply tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
- **Gradients:** Layer multiple radial gradients. Add grain/texture via SVG noise filter for depth.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Use spring-style easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states. No exceptions.
- **Images:** Add a gradient overlay (`bg-gradient-to-t from-black/60`) and a color treatment layer with `mix-blend-multiply`.
- **Spacing:** Use intentional, consistent spacing tokens — not random Tailwind steps.
- **Depth:** Surfaces should have a layering system (base → elevated → floating), not all sit at the same z-plane.

## Парсинг и наполнение базы заданий

### Два способа получения заданий

**1. Парсинг сайта Школково (рекомендуется для заданий с сайта)**
```bash
# Шаг 1 — открыть Chrome с remote debugging (один раз):
"C:\Users\Rashid\.cache\puppeteer\chrome\win64-146.0.7680.153\chrome-win64\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\chrome-debug"

# Шаг 2 — перейти на нужную страницу в открывшемся браузере

# Шаг 3 — запустить парсер:
node scrape-task9.mjs    # → подготовка к базе/Задание 9/tasks.json
node scrape-task10.mjs   # → подготовка к базе/Задание 10/tasks.json
```

**2. Парсинг PDF-сборников (для заданий из PDF)**
```bash
node parse-tasks.mjs "база заданий/Задание N.pdf"
# → подготовка к базе/Задание N/{прототип}/{задание}.png + answers.json
```

### Импорт в БД
```bash
node import-tasks.mjs 9          # импорт tasks.json (сайт)
node import-tasks.mjs 6          # импорт PNG + answers.json (PDF)
node import-tasks.mjs 9 --dry    # dry run — показать без записи
```
- Скрипт автоматически определяет тип источника (tasks.json или PNG-папки)
- `typeId` = номер задания (9 = Задание 9)
- Если задания уже есть — добавляет поверх (дубликаты не проверяются)

### Путь Puppeteer Chrome
```
C:\Users\Rashid\.cache\puppeteer\chrome\win64-146.0.7680.153\chrome-win64\chrome.exe
```

### Статус наполнения БД
| Задание | Источник | Статус | Кол-во |
|---------|----------|--------|--------|
| 6 | Школково | ✅ В БД (SVG для дробей, текст для десятичных) | 81 |
| 7 | Школково | ✅ В БД (все SVG, 1–7 формул + чертежи числовых прямых) | 172 |
| 8 | Школково | ✅ В БД (все SVG, 1–3 формулы на задание) | 320 |
| 9 | Школково | ✅ В БД | 71 |
| 10 | Школково | ✅ В БД | 121 |
| 11 | Школково | ✅ В БД (SVG для формул + чертежи, 9 типов) | 102 |
| 12 | Школково | ✅ В БД | 171 |
| 14 | Школково | ✅ В БД | 111 |
| 15 | Школково | ✅ В БД (SVG для формул, текст для чисто текстовых) | 232 |
| 16 | Школково | ✅ В БД (SVG для формул + чертежи, 31 тип) | 291 |
| 17 | Школково | ✅ В БД (SVG для формул + чертежи, 30 типов) | 210 |
| 19 | Школково | ✅ В БД (чисто текст, каждое задание = отдельный прототип) | 34 |
| 18 | Школково | ✅ В БД (SVG для формул + чертежи, 15 типов) | 154 |
| 20 | Школково | ✅ В БД (SVG ответы, 25 типов) | 200 |
| 21 | Школково | ✅ В БД (чисто текст, 1 задание с SVG-формулами, 20 типов) | 191 |

### Ошибки парсера PDF — см. PARSER_PATTERNS.md

## Рендеринг заданий — правило единообразия

Логика рендеринга `parts` (text/img/drawing) продублирована в **4 файлах**. При любом изменении отображения заданий — исправлять **все сразу**:

| Файл | Где искать |
|------|-----------|
| `variant.html` | функция `renderParts()` |
| `index.html` | функция `buildProtoPreviewHTML()` |
| `admin-task-type.html` | блок `if (isParts)` в рендере карточки задания |
| `pdf-template.html` | функция `renderParts()` |

**Текущая логика рендеринга:**
- `newParagraph: true` на элементе → начать новую строку (флаг ставится парсером на первый элемент каждого `<p>` оригинала)
- `type: "text"` / `type: "img"` → добавляются inline в текущую строку
- `type: "drawing"` → сбросить строку, отдельный центрированный блок (`text-align:center`)

**Важно для парсеров:** каждый `scrape-taskN.mjs` должен ставить `newParagraph: true` на **первый** элемент каждого `<p>` оригинала — это единственный способ отличить "A, B, C, D в одной строке" от "1)A, 2)B — каждый на своей".

## Hard Rules
- Do not add sections, features, or content not in the reference
- Do not "improve" a reference design — match it
- Do not stop after one screenshot pass
- Do not use `transition-all`
- Do not use default Tailwind blue/indigo as primary color


