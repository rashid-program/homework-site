/**
 * Находит SubTheme ID для задания 23 через нативный CDP (без puppeteer)
 */
import { createRequire } from 'module';

const CDP_URL = 'http://localhost:9222';

// Простой CDP клиент через встроенный WebSocket (Node.js 22+)
async function cdpConnect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let msgId = 0;
  const pending = new Map();
  const listeners = new Map();

  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', rej);
  });

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
    if (msg.method) {
      const cb = listeners.get(msg.method);
      if (cb) cb(msg.params);
    }
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

  const on = (method, cb) => listeners.set(method, cb);
  const close = () => ws.close();

  return { send, on, close };
}

async function getOrCreateTab(targetUrl) {
  const res = await fetch(`${CDP_URL}/json`);
  const tabs = await res.json();

  // Ищем уже открытую вкладку shkolkovo
  let tab = tabs.find(t => t.type === 'page' && t.url.includes('shkolkovo'));

  // Если нет — создаём новую
  if (!tab) {
    const newTab = await fetch(`${CDP_URL}/json/new?${targetUrl}`);
    tab = await newTab.json();
    await new Promise(r => setTimeout(r, 500));
    const res2 = await fetch(`${CDP_URL}/json`);
    const tabs2 = await res2.json();
    tab = tabs2.find(t => t.type === 'page' && t.id === tab.id) || tabs2[0];
  }

  return tab;
}

async function navigate(cdp, url) {
  await cdp.send('Page.enable');

  const navigated = new Promise((resolve) => {
    cdp.on('Page.loadEventFired', resolve);
  });

  await cdp.send('Page.navigate', { url });
  await Promise.race([
    navigated,
    new Promise(r => setTimeout(r, 15000))
  ]);
  await new Promise(r => setTimeout(r, 2000));
}

async function evaluate(cdp, fn, ...args) {
  const expression = `(${fn.toString()})(${args.map(a => JSON.stringify(a)).join(',')})`;
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || 'Eval error');
  }
  return result.result.value;
}

// --- Main ---
const tab = await getOrCreateTab('https://3.shkolkovo.online/catalog/7111');
const cdp = await cdpConnect(tab.webSocketDebuggerUrl);

await navigate(cdp, 'https://3.shkolkovo.online/catalog/7111');

const subtypes = await evaluate(cdp, () => {
  const links = [...document.querySelectorAll('a[href*="SubTheme="]')];
  return links.map(a => ({ href: a.href, text: a.textContent.trim() }));
});

console.log('SubThemes найдено:', subtypes.length);
subtypes.forEach(s => console.log(s.text, '->', s.href));

cdp.close();
