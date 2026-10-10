const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = 3000;

const server = http.createServer((req, res) => {
  let fp = req.url === '/' ? '/public/index.html' : req.url;
  fp = path.join(__dirname, fp);
  fs.readFile(fp, (err, content) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(fp);
    const ct = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'text/plain';
    res.writeHead(200, { 'Content-Type': ct });
    res.end(content);
  });
});

const wss = new WebSocket.Server({ server });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('[WS] client connected, total:', clients.size);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      // Пересылаем ВСЕМ КРОМЕ отправителя
      for (const client of clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(msg));
        }
      }
    } catch (e) {
      console.error('[WS] parse error:', e.message);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('[WS] client disconnected, total:', clients.size);
  });
});

server.listen(PORT, () => {
  console.log(`Flowo pipe running on http://localhost:${PORT}`);
  console.log('Mode: LOCAL-FIRST (server stores NOTHING)');
});
