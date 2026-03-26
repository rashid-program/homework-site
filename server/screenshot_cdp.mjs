import WebSocket from 'ws';
import { writeFileSync } from 'fs';
import https from 'https';
import http from 'http';

const PORT = process.argv[2] || 9222;
const URL_TO_VISIT = process.argv[3] || 'http://localhost:3000';
const OUT = process.argv[4] || 'C:/Users/Rashid/screenshot_out.png';

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
// find existing tab or use first
let tab = tabs.find(t => !t.url.startsWith('chrome') && !t.url.startsWith('blob') && !t.url.startsWith('devtools'));
if (!tab) tab = tabs[0];

const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 1;
const pending = new Map();

ws.on('open', async () => {
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      pending.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await send('Page.navigate', { url: URL_TO_VISIT });
  await new Promise(r => setTimeout(r, 3000));
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(OUT, Buffer.from(data, 'base64'));
  console.log('Saved:', OUT);
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
