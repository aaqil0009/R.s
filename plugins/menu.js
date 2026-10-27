import { cmd, commands } from '../command.js';

cmd({ pattern: 'menu', alias: ['help', 'list'], desc: 'Saari commands', category: 'main' },
async (conn, mek, m, { reply, prefix, config }) => {
    const groups = {};
    for (const c of commands) {
        if (!c.pattern || c.dontAddCommandList) continue;
        (groups[c.category || 'misc'] ||= []).push(c);
    }
    let out = `*${config.BOT_NAME}*\nPrefix: ${prefix}\n`;
    for (const [cat, list] of Object.entries(groups)) {
        out += `\n*━ ${cat.toUpperCase()} ━*\n` + list.map((c) => `• ${prefix}${c.pattern}${c.desc ? ' — ' + c.desc : ''}`).join('\n') + '\n';
    }
    reply(out.trim());
});
