const express = require('express');
const { WebSocketServer } = require('ws');
const TelegramBot = require('node-telegram-bot-api');
const { VK } = require('vk-io');
require('dotenv').config();

const app = express();
const PORT = 3000;
const messages = [];
const chats = new Map();
const clients = new Set();

// 1. TELEGRAM BOT
let tgBot = null;
if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'ваш_токен_от_BotFather') {
    tgBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    
    tgBot.on('message', async (msg) => {
        const chatId = msg.chat.id.toString();
        const fromName = msg.from.first_name || 'Пользователь';
        const text = msg.text || '[Медиа]';
        
        const newMsg = {
            id: Date.now(), source: 'telegram', chatId: chatId,
            from: fromName, text: text,
            timestamp: new Date().toISOString(), isOutgoing: false
        };
        
        messages.push(newMsg);
        chats.set(chatId, { id: chatId, name: `✈️ TG: ${fromName}`, lastMessage: text, timestamp: newMsg.timestamp, source: 'telegram' });
        broadcastAll();
        
        await tgBot.sendMessage(msg.chat.id, `✅ Flowo получил: ${text}`);
    });
    console.log('✅ Telegram Bot инициализирован');
} else {
    console.log('⚠️ Telegram пропущен (нет токена в .env)');
}

// 2. MAX (VK)
let vk = null;
if (process.env.VK_TOKEN && process.env.VK_TOKEN !== 'пока_пусто') {
    vk = new VK({ token: process.env.VK_TOKEN });
    vk.updates.on('message_new', async (context) => {
        if (context.isOutbox) return;
        const chatId = context.peerId.toString();
        const fromName = `🔵 MAX: ${context.senderId || 'Пользователь'}`;
        const text = context.text || '[Медиа]';
        
        const newMsg = {
            id: Date.now(), source: 'max', chatId: chatId,
            from: fromName, text: text,
            timestamp: new Date().toISOString(), isOutgoing: false
        };
        
        messages.push(newMsg);
        chats.set(chatId, { id: chatId, name: fromName, lastMessage: text, timestamp: newMsg.timestamp, source: 'max' });
        broadcastAll();
        
        await context.send(`✅ Flowo получил: ${text}`);
    });
    vk.updates.start().catch(err => console.log('⚠️ MAX не запущен:', err.message));
    console.log('✅ MAX (VK) инициализирован');
} else {
    console.log('⚠️ MAX (VK) пропущен (нет токена в .env)');
}

// 3. WEBSOCKET
const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: 'init', messages: messages.slice(-50), chats: Array.from(chats.values()) }));
    ws.on('close', () => clients.delete(ws));
    
    ws.on('message', async (data) => {
        try {
            const msg = JSON.parse(data);
            if (msg.type === 'send') {
                if (msg.source === 'telegram' && tgBot) {
                    await tgBot.sendMessage(msg.chatId, msg.text);
                } else if (msg.source === 'max' && vk) {
                    await vk.api.messages.send({ peer_id: msg.chatId, message: msg.text, random_id: Date.now() });
                }
                
                const outgoingMsg = {
                    id: Date.now(), source: msg.source, chatId: msg.chatId, from: 'Вы',
                    text: msg.text, timestamp: new Date().toISOString(), isOutgoing: true
                };
                messages.push(outgoingMsg);
                const chat = chats.get(msg.chatId);
                if (chat) { chat.lastMessage = msg.text; chat.timestamp = outgoingMsg.timestamp; }
                broadcastAll();
            }
        } catch (err) { console.error('Ошибка отправки:', err); }
    });
});

function broadcastAll() {
    const data = JSON.stringify({ type: 'update', messages: messages.slice(-50), chats: Array.from(chats.values()) });
    clients.forEach(client => { if (client.readyState === 1) client.send(data); });
}

app.use(express.static('public'));
app.listen(PORT, () => {
    console.log(`\n🚀 Flowo сервер запущен!`);
    console.log(`📡 HTTP: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket: ws://localhost:8080\n`);
});
