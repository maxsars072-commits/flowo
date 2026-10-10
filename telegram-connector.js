const TelegramBot = require('node-telegram-bot-api');
let HttpsProxyAgent;

// Пытаемся загрузить прокси максимально безопасно
try {
  const agentModule = require('https-proxy-agent');
  // Пробуем все возможные варианты экспорта
  HttpsProxyAgent = agentModule.default || agentModule.HttpsProxyAgent || agentModule;
} catch (e) {
  console.log('HttpsProxyAgent module not found or broken');
}

const TOKEN = '8987132682:AAERPROK47PxhbhBIMbsEtX0XoHWpEtklY8';
const PROXY_URL = 'http://51.15.234.100:3128'; 

let bot;
let messageCallback = null;

function initTelegram(callback) {
  messageCallback = callback;
  
  const options = { polling: true };
  
  // Если агент загрузился корректно - используем прокси
  if (HttpsProxyAgent && typeof HttpsProxyAgent === 'function') {
    try {
      options.request = { agent: new HttpsProxyAgent(PROXY_URL) };
      console.log('Using proxy:', PROXY_URL);
    } catch (err) {
      console.error('Proxy creation failed:', err.message);
    }
  } else {
    console.log('Proxy unavailable, trying DIRECT connection...');
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
        id: Date.now(),
        source: 'telegram',
        chatId: 'tg_' + chatId,
        chatName: fromName,
        from: fromName,
        text: text,
        timestamp: new Date().toISOString(),
        isOutgoing: false
      });
    });

    bot.on('polling_error', (error) => {
      console.error('Telegram polling error:', error.code);
    });
  } catch (err) {
    console.error(' Failed to init Telegram:', err.message);
  }
}

async function sendTelegram(chatId, text) {
  if (!bot) return;
  const realChatId = chatId.replace('tg_', '');
  try {
    await bot.sendMessage(realChatId, text);
  } catch (err) {
    console.error('Send TG error:', err.message);
  }
}

module.exports = { initTelegram, sendTelegram };
