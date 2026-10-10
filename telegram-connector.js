const TelegramBot = require('node-telegram-bot-api');
let ProxyAgent;

try {
  // Пытаемся получить класс агента любым способом
  const mod = require('https-proxy-agent');
  ProxyAgent = mod.default || mod.HttpsProxyAgent || mod;
} catch (e) {
  console.log('Proxy module load failed');
}

const TOKEN = '8987132682:AAERPROK47PxhbhBIMbsEtX0XoHWpEtklY8';
const PROXY_URL = 'http://51.15.234.100:3128'; 

let bot;
let messageCallback = null;

function initTelegram(callback) {
  messageCallback = callback;
  const options = { polling: true };
  
  if (ProxyAgent && typeof ProxyAgent === 'function') {
    try {
      options.request = { agent: new ProxyAgent(PROXY_URL) };
      console.log('Using proxy:', PROXY_URL);
    } catch (err) {
      console.error('Proxy agent creation failed:', err.message);
    }
  } else {
    console.log('No proxy agent, using direct connection');
  }

  try {
    bot = new TelegramBot(TOKEN, options);
    console.log('✅ Telegram Bot initialized');

    bot.on('message', (msg) => {
      if (!messageCallback) return;
      const chatId = msg.chat.id.toString();
      const text = msg.text || '[Media/File]';
      const fromName = msg.from ? (msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '')) : 'Unknown';
      
      messageCallback({
        id: Date.now(), source: 'telegram', chatId: 'tg_' + chatId,
        chatName: fromName, from: fromName, text: text,
        timestamp: new Date().toISOString(), isOutgoing: false
      });
    });

    bot.on('polling_error', (error) => {
      console.error('Polling error:', error.code);
    });
  } catch (err) {
    console.error('Init failed:', err.message);
  }
}

async function sendTelegram(chatId, text) {
  if (!bot) return;
  try { await bot.sendMessage(chatId.replace('tg_', ''), text); } 
  catch (err) { console.error('Send error:', err.message); }
}

module.exports = { initTelegram, sendTelegram };
