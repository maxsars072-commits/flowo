const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Читаем ключи из .env вручную
const envPath = path.join(__dirname, '.env');
let API_ID, API_HASH;
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
        const [key, val] = line.split('=');
        if (key && key.trim() === 'TG_API_ID') API_ID = parseInt(val.trim());
        if (key && key.trim() === 'TG_API_HASH') API_HASH = val.trim();
    });
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

async function auth() {
    console.log('=== Telegram Authorization ===');
    const phone = await ask('Enter phone number (+7...): ');
    
    const client = new TelegramClient(new StringSession(), API_ID, API_HASH, {});
    await client.connect();
    console.log('Sending code...');
    
    const sent = await client.sendCode({ phoneNumber: phone });
    const code = await ask('Enter SMS code: ');
    
    try {
        await client.signIn({ phoneNumber: phone }, { phoneCode: code });
        console.log('Sign in successful!');
    } catch (err) {
        if (err.message.includes('PASSWORD')) {
            const pass = await ask('Enter 2FA password: ');
            await client.signIn({ phoneNumber: phone }, { phoneCode: await ask('Re-enter SMS code: '), password: pass });
        } else { throw err; }
    }
    
    const session = client.session.save();
    fs.writeFileSync('tg.session', session);
    console.log('SUCCESS! Session saved to tg.session');
    rl.close();
    process.exit(0);
}

auth().catch(e => { console.error('Auth failed:', e); rl.close(); process.exit(1); });