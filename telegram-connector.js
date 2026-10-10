const TelegramBot = require('node-telegram-bot-api');
const HttpsProxyAgent = require('https-proxy-agent');

// Публичный прокси для обхода блокировок
const PROXY_URL = process.env.TG_PROXY || 'http://51.15.234.100:3128'; 

const TOKEN = '8987132682:AAERPROK47PxhbhBIMbsEtX0XoHWpEtklY8';
let bot;
let messageCallback = null;

function initTelegram(callback) {
  messageCallback = callback;
  
  try {
    const agent = new HttpsProxyAgent(PROXY_URL);
    bot = new TelegramBot(TOKEN, { 
      polling: true,
      request: { agent }
    });
    
    console.log('Telegram Bot initialized via PROXY');

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
    console.error('Failed to init Telegram:', err.message);
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
