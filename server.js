const PORT = 80;
const { WebSocketServer } = require('ws');
const http = require('http');
const telegram = require('./telegram-connector'); // <-- ВАЖНО: подключаем телеграм

const app = express();
const server = http.createServer(app);

const messages = [];
const chats = new Map();
const clients = new Set();

// WebSocket
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected');
  ws.send(JSON.stringify({ type: 'init', messages: messages.slice(-50), chats: Array.from(chats.values()) }));
  ws.on('close', () => clients.delete(ws));
});

function broadcastAll() {
  const data = JSON.stringify({ type: 'update', messages: messages.slice(-50), chats: Array.from(chats.values()) });
  clients.forEach(client => { if (client.readyState === 1) client.send(data); });
}

// Инициализация TELEGRAM
telegram.initTelegram((msg) => {
  console.log('📨 Получено сообщение от Telegram:', msg.from);
  messages.push(msg);
  
  if (!chats.has(msg.chatId)) {
    chats.set(msg.chatId, { 
      id: msg.chatId, name: msg.chatName, source: 'telegram', 
      lastMessage: msg.text, timestamp: msg.timestamp 
    });
  } else {
    const c = chats.get(msg.chatId);
    c.lastMessage = msg.text; c.timestamp = msg.timestamp;
  }
  broadcastAll();
});

app.use(express.static('public'));

server.listen(PORT, '0.0.0.0', () => {
  console.log('✅ Flowo Telegram Server running on :' + PORT);
});
