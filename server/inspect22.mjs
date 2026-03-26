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

console.log('Tab:', tab.url);

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
  // Navigate to a specific task 22
  await send('Page.navigate', { url: 'https://3.shkolkovo.online/catalog/7120?SubTheme=9361' });
  await new Promise(r => setTimeout(r, 4000));
  
  const result = await send('Runtime.evaluate', { expression: `
    const tasks = document.querySelectorAll('.task');
    const first = tasks[0];
    if(!first) { JSON.stringify({error: 'no task found', bodyHTML: document.body.innerHTML.slice(0,500)}); }
    else {
      const taskText = first.querySelector('.taskText, .task-text, [class*="text"]');
      const imgs = [...first.querySelectorAll('img')].map(i => ({src:i.src, class:i.className, alt:i.alt}));
      JSON.stringify({
        taskHTML: first.innerHTML.slice(0, 2000),
        imgs,
        url: window.location.href
      });
    }
  `, returnByValue: true });
  
  console.log(result.result.value);
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
