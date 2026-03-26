import WebSocket from 'ws';
import http from 'http';

const PORT = 9222;

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => { let d=''; res.on('data',x=>d+=x); res.on('end',()=>resolve(JSON.parse(d))); }).on('error', reject);
  });
}

const tabs = await fetchJson(`http://localhost:${PORT}/json`);
let tab = tabs.find(t => t.url.includes('shkolkovo'));
console.log('Tab:', tab?.url);

const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 1;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve) => {
    const msgId = id++;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

ws.on('open', async () => {
  await send('Page.navigate', { url: 'https://3.shkolkovo.online/catalog/7120?SubTheme=9361' });
  await new Promise(r => setTimeout(r, 5000));
  
  const r1 = await send('Runtime.evaluate', { expression: `window.location.href`, returnByValue: true });
  console.log('Current URL:', r1.result.value);
  
  const r2 = await send('Runtime.evaluate', { expression: `document.querySelectorAll('img.math').length`, returnByValue: true });
  console.log('img.math count:', r2.result.value);
  
  const r3 = await send('Runtime.evaluate', { expression: `
    [...document.querySelectorAll('img.math')].slice(0,5).map(i=>({src:i.src,w:i.width,h:i.height}))
  `, returnByValue: true });
  console.log('img.math samples:', JSON.stringify(r3.result.value));
  
  const r4 = await send('Runtime.evaluate', { expression: `
    [...document.querySelectorAll('p')].slice(0,10).map(p=>p.textContent.trim().slice(0,80))
  `, returnByValue: true });
  console.log('p texts:', JSON.stringify(r4.result.value));
  
  ws.close();
  process.exit(0);
});

ws.on('message', (msg) => {
  const m = JSON.parse(msg);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
});
