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

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./whatsapp_auth');
  
  waSock = makeWASocket({
    auth: state,
    browser: ['Flowo App', 'Chrome', '115.0'],
    printQRInTerminal: false
  });

  waSock.ev.on('creds.update', saveCreds);
  
  waSock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startWhatsApp();
    } else if (connection === 'open') {
      console.log('✅ WhatsApp CONNECTED!');
    }
  });

  // ВАЖНО: Запрос кода происходит здесь
  waSock.ev.on('creds.update', async () => {
    if (!waSock.authState.creds.registered) {
      console.log('⏳ Waiting for pairing code request...');
      setTimeout(async () => {
        try {
          const phoneNumber = '+79122487771';
          console.log(`📞 Requesting code for ${phoneNumber}...`);
          const code = await waSock.requestPairingCode(phoneNumber);
          console.log('\n========================================');
          console.log(`   YOUR WHATSAPP CODE: ${code}`);
          console.log('========================================\n');
        } catch (err) {
          console.error(' Pairing code error:', err.message);
        }
      }, 2000);
    }
  });

  waSock.ev.on('messages.upsert', async ({ messages: msgs }) => {
    for (const msg of msgs) {
      if (!msg.message || msg.key.fromMe) continue;
      const chatId = msg.key.remoteJid;
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '[Media]';
      const sender = msg.pushName || chatId.split('@')[0];
      
      messages.push({ id: Date.now(), source: 'whatsapp', chatId, chatName: sender, from: sender, text, timestamp: new Date().toISOString(), isOutgoing: false });
      if (!chats.has(chatId)) chats.set(chatId, { id: chatId, name: sender, source: 'whatsapp', lastMessage: text, timestamp: new Date().toISOString() });
      else { const c = chats.get(chatId); c.lastMessage = text; c.timestamp = new Date().toISOString(); }
      broadcastAll();
    }
  });
}

app.use(express.static('public'));
startWhatsApp().catch(console.error);
server.listen(PORT, () => console.log(`🚀 Flowo running on :${PORT}`));
