const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs');
const path = require('path');

// Читаем ключи из .env вручную для надежности
const envPath = path.join(__dirname, '.env');
let TG_API_ID, TG_API_HASH;
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
        const [key, val] = line.split('=');
        if (key && key.trim() === 'TG_API_ID') TG_API_ID = parseInt(val.trim());
        if (key && key.trim() === 'TG_API_HASH') TG_API_HASH = val.trim();
    });
}

const SESSION_FILE = path.join(__dirname, 'tg.session');
let sessionString = fs.existsSync(SESSION_FILE) ? fs.readFileSync(SESSION_FILE, 'utf8') : '';

const client = new TelegramClient(
    new StringSession(sessionString),
    TG_API_ID,
    TG_API_HASH,
    {
        connectionRetries: 5,
        useWSS: false, // Попробуем без WebSocket Secure
        // Если есть прокси, раскомментируй и заполни эти строки:
        // proxy: { ip: '127.0.0.1', port: 1080, socksType: 5 }, 
    }
);

async function initTelegram() {
    try {
        await client.connect();
        if (!client.session.authKey) {
            console.log('[TG] No active session. Run auth script first.');
        } else {
            const me = await client.getMe();
            console.log(`[TG] Connected as ${me.firstName} (${me.id})`);
        }
    } catch (err) {
        console.error('[TG] Init error:', err.message);
    }
}

module.exports = { client, initTelegram };