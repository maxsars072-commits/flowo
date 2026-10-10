const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');

const app = express();
const server = http.createServer(app);
const PORT = 3000;

const messages = [];
const chats = new Map();
const clients = new Set();
let waSock = null;

// WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected');
  ws.send(JSON.stringify({ 
    type: 'init', 
    messages: messages.slice(-50), 
    chats: Array.from(chats.values()) 
  }));
  
  ws.on('close', () => clients.delete(ws));
});

function broadcastAll() {
  const data = JSON.stringify({ 
    type: 'update', 
    messages: messages.slice(-50), 
    chats: Array.from(chats.values()) 
  });
  clients.forEach(client => { 
    if (client.readyState === 1) client.send(data); 
  });
}

// WhatsApp Logic with Pairing Code
async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./whatsapp_auth');
  
  waSock = makeWASocket({
    auth: state,
    browser: ['Flowo App', 'Chrome', '115.0'],
    printQRInTerminal: false // Отключаем QR
  });

  waSock.ev.on('creds.update', saveCreds);
  
  waSock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('WA disconnected:', lastDisconnect?.error?.output?.statusCode);
      if (shouldReconnect) startWhatsApp();
    } else if (connection === 'open') {
      console.log('✅ WhatsApp подключен!');
    }
  });

  // Генерируем Pairing Code вместо QR
  waSock.ev.on('creds.update', async () => {
    if (!waSock.authState.creds.registered) {
      const phoneNumber = '+79991234567'; // ЗАМЕНИ НА СВОЙ НОМЕР ТЕЛЕФОНА
      const code = await waSock.requestPairingCode(phoneNumber);
      console.log('\n📱 ВАШ КОД ДЛЯ WHATSAPP:');
      console.log('╔══════════════════════╗');
      console.log(`║   ${code}   ║`);
      console.log('╚══════════════════════╝');
      console.log('Введите этот код в WhatsApp:');
      console.log('Настройки → Связанные устройства → Привязка по номеру\n');
    }
  });

  waSock.ev.on('messages.upsert', async ({ messages: msgs }) => {
    for (const msg of msgs) {
      if (!msg.message || msg.key.fromMe) continue;
      
      const chatId = msg.key.remoteJid;
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '[Media]';
      const sender = msg.pushName || chatId.split('@')[0];
      
      const newMsg = {
        id: Date.now(),
        source: 'whatsapp',
        chatId: chatId,
        chatName: sender,
        from: sender,
        text: text,
        timestamp: new Date().toISOString(),
        isOutgoing: false
      };
      
      messages.push(newMsg);
      
      if (!chats.has(chatId)) {
        chats.set(chatId, {
          id: chatId, name: sender, source: 'whatsapp',
          lastMessage: text, timestamp: newMsg.timestamp
        });
      } else {
        const c = chats.get(chatId);
        c.lastMessage = text; c.timestamp = newMsg.timestamp;
      }
      
      broadcastAll();
    }
  });
}

app.use(express.static('public'));

startWhatsApp().catch(console.error);

server.listen(PORT, () => {
  console.log(`🚀 Flowo server running on http://localhost:${PORT}`);
});
