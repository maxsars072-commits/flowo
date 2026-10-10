// MOCK TELEGRAM CONNECTOR FOR MVP TESTING
let messageCallback = null;
let mockInterval = null;

function initTelegram(callback) {
  messageCallback = callback;
  console.log('✅ Telegram Connector initialized in MOCK mode');
  
  const mockMessages = [
    'Привет! Как дела?',
    'Отправь документы, пожалуйста',
    'Когда встреча?',
    'Flowo работает отлично!',
    'Тестовое сообщение из Telegram'
  ];

  let index = 0;
  mockInterval = setInterval(() => {
    if (!messageCallback) return;
    
    messageCallback({
      id: Date.now(),
      source: 'telegram',
      chatId: 'tg_mock_1',
      chatName: 'Test User (Mock)',
      from: 'Test User',
      text: mockMessages[index % mockMessages.length],
      timestamp: new Date().toISOString(),
      isOutgoing: false
    });
    index++;
  }, 30000); // Каждые 30 секунд
}

async function sendTelegram(chatId, text) {
  console.log(`[MOCK TG] Отправка в ${chatId}: ${text}`);
}

module.exports = { initTelegram, sendTelegram };
