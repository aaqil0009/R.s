import { cmd } from '../command.js';

cmd({ pattern: 'ping', alias: ['p'], desc: 'Bot speed check', category: 'main', react: '🏓' },
async (conn, mek, m, { from, reply }) => {
    const t = Date.now();
    const sent = await reply('🏓 Pinging...');
    await conn.sendMessage(from, { text: `🏓 Pong! *${Date.now() - t} ms*`, edit: sent.key });
});
