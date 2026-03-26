import WebSocket from 'ws';
import http from 'http';

const PORT = 9222;

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = '';
      res.on('data', x => d += x);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

const tabs = await fetchJson(`http://localhost:${PORT}/json`);
let tab = tabs.find(t => t.url.includes('shkolkovo'));
if (!tab) { console.log('No shkolkovo tab'); process.exit(1); }

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
  
  const result = await send('Runtime.evaluate', { expression: `
    (() => {
      const url = window.location.href;
      // Find task containers
      const selectors = ['.catalog-task', '.task-item', '[class*="task"]', '.catalog__task'];
      let found = null;
      for(const s of selectors) {
        const el = document.querySelector(s);
        if(el) { found = {selector: s, html: el.innerHTML.slice(0,3000)}; break; }
      }
      return JSON.stringify({url, found, bodySnippet: document.body.innerHTML.slice(0,1000)});
    })()
  `, returnByValue: true });
  
  const data = JSON.parse(result.result.value);
  console.log('URL:', data.url);
  console.log('Found:', data.found?.selector);
  if(data.found) console.log('HTML:', data.found.html.slice(0,1500));
  else console.log('Body:', data.bodySnippet);
  ws.close();
  process.exit(0);
});

ws.on('message', (msg) => {
  const m = JSON.parse(msg);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result);
    pending.delete(m.id);
  }
});
