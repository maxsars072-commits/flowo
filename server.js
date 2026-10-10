const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const telegram = require('./telegram-connector');

const app = express();
const server = http.createServer(app);
const PORT = 3000;

const messages = [];
const chats = new Map();
const clients = new Set();

if (chats.size === 0) {
  chats.set('tg1', { id: 'tg1', name: 'Alexey Petrov', source: 'telegram', lastMessage: 'Hello!', timestamp: new Date().toISOString() });
  chats.set('tg2', { id: 'tg2', name: 'Anna Kuznetsova', source: 'telegram', lastMessage: 'How are you?', timestamp: new Date().toISOString() });
  chats.set('wa1', { id: 'wa1', name: 'Marina Ivanova', source: 'whatsapp', lastMessage: 'OK', timestamp: new Date().toISOString() });
  chats.set('wa2', { id: 'wa2', name: 'Flowo Team', source: 'whatsapp', lastMessage: 'Welcome!', timestamp: new Date().toISOString() });
}

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected');
  ws.send(JSON.stringify({ type: 'init', messages: messages.slice(-50), chats: Array.from(chats.values()) }));
  
  ws.on('close', () => { clients.delete(ws); });
  
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'send') {
        const outgoingMsg = { 
          id: Date.now(), source: msg.source, chatId: msg.chatId, 
          from: 'You', text: msg.text, timestamp: new Date().toISOString(), isOutgoing: true 
        };
        messages.push(outgoingMsg);
        
        const chat = chats.get(msg.chatId);
        if (chat) { chat.lastMessage = msg.text; chat.timestamp = outgoingMsg.timestamp; }
        
        if (msg.source === 'telegram') telegram.sendTelegram(msg.chatId, msg.text);
        
        broadcastAll();
      }
    } catch (err) { console.error('WS Error:', err); }
  });
});

telegram.initTelegram((msg) => {
  messages.push(msg);
  if (!chats.has(msg.chatId)) {
    chats.set(msg.chatId, { 
      id: msg.chatId, name: msg.chatName || msg.chatId, 
      source: 'telegram', lastMessage: msg.text, timestamp: msg.timestamp 
    });
  } else {
    const c = chats.get(msg.chatId);
    c.lastMessage = msg.text; c.timestamp = msg.timestamp;
  }
  broadcastAll();
});

function broadcastAll() {
  const data = JSON.stringify({ type: 'update', messages: messages.slice(-50), chats: Array.from(chats.values()) });
  clients.forEach(client => { if (client.readyState === 1) client.send(data); });
}

app.use(express.static('public'));

server.listen(PORT, () => {
  console.log('Flowo server running on http://localhost:' + PORT);
});
