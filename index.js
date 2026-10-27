// ─────────────────────────────────────────────────────────────
//  AHMAD-MD  •  clean index.js
//  - lib/*            : helper modules (already in repo)
//  - plugins/**/*.js  : har plugin alag file / alag folder me, auto-load hota hai
//  - session/         : WhatsApp login (auto-created)
// ─────────────────────────────────────────────────────────────
import * as Baileys from '@whiskeysockets/baileys';
import pino from 'pino';
import axios from 'axios';
import AdmZip from 'adm-zip';
import qrcode from 'qrcode-terminal';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import config from './config.js';
import { commands } from './command.js';
import store from './lib/store.js';
import { loadMessage, saveGroupMetadata } from './lib/store.js';
import { sms } from './lib/handler.js';
import { addConnectionFunctions } from './lib/connection.js';
import { getGroupAdmins, lidToPhone, sleep } from './lib/functions.js';
import { AntiDelete } from './lib/antidel.js';
import AntiEdit from './lib/antiedit.js';
import GroupEvents from './lib/groupevents.js';
import { getWarning, addWarning, clearWarning } from './lib/warning.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

// ── baileys helpers (works with named or default exports) ───
const B = (n) => Baileys[n] ?? Baileys.default?.[n];
const makeWASocket = Baileys.makeWASocket ?? Baileys.default?.makeWASocket ?? Baileys.default;
const useMultiFileAuthState = B('useMultiFileAuthState');
const fetchLatestBaileysVersion = B('fetchLatestBaileysVersion');
const makeCacheableSignalKeyStore = B('makeCacheableSignalKeyStore');
const DisconnectReason = B('DisconnectReason');
const Browsers = B('Browsers');
const jidNormalizedUser = B('jidNormalizedUser');

// ── paths / env ─────────────────────────────────────────────
const SESSION_DIR = path.join(__dirname, process.env.SESSION_DIR || 'session');
const PLUGINS_DIR = path.join(__dirname, 'plugins');
const PORT = process.env.PORT || 5000;
const PAIRING_NUMBER = (process.env.PAIRING_NUMBER || '').replace(/\D/g, '');
const logger = pino({ level: 'silent' });

// ── live settings (plugins can change conn.userConfig at runtime) ──
const userConfig = { ...config.DEFAULT_SETTINGS };
for (const k of Object.keys(userConfig)) {
    if (process.env[k] !== undefined && typeof userConfig[k] === 'string') userConfig[k] = process.env[k];
}
const on = (key) => String(userConfig[key]) === 'true';
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── owner / sudo ────────────────────────────────────────────
const ownerSet = new Set();
for (const v of [config.OWNER_NUMBER, config.DEV, ...(userConfig.SUDO || [])]) {
    if (!v) continue;
    ownerSet.add(String(v));
    ownerSet.add(String(v).split('@')[0]);
}

// ═════════════ 1. PLUGINS ═══════════════════════════════════

// Optional: GitHub repo se plugins/ folder download karo.
// .env me:  PLUGINS_REPO=AHMADHASSAN-43/ahmpulgin   (PLUGINS_BRANCH=main, GITHUB_TOKEN=... private repo ke liye)
async function syncRemotePlugins() {
    const repo = process.env.PLUGINS_REPO;
    if (!repo) return;
    const branch = process.env.PLUGINS_BRANCH || 'main';
    try {
        const headers = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
        const { data } = await axios.get(`https://codeload.github.com/${repo}/zip/refs/heads/${branch}`, {
            responseType: 'arraybuffer', headers, timeout: 60000,
        });
        const zip = new AdmZip(Buffer.from(data));
        let count = 0;
        for (const entry of zip.getEntries()) {
            if (entry.isDirectory) continue;
            const rel = entry.entryName.split('/').slice(1).join('/'); // root folder hata do
            if (!rel.startsWith('plugins/')) continue;
            const target = path.resolve(__dirname, rel);
            if (!target.startsWith(PLUGINS_DIR + path.sep)) continue; // path-traversal guard
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, entry.getData());
            count++;
        }
        console.log(`[PLUGINS] ${count} file(s) synced from ${repo}@${branch}`);
    } catch (e) {
        console.error(`[PLUGINS] Remote sync failed (local plugins use honge): ${e.message}`);
    }
}

function walk(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
        const p = path.join(dir, d.name);
        if (d.isDirectory()) return d.name === 'node_modules' ? [] : walk(p);
        return /\.(m?js)$/.test(d.name) ? [p] : [];
    });
}

async function loadPlugins() {
    fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    await syncRemotePlugins();
    let ok = 0, bad = 0;
    for (const file of walk(PLUGINS_DIR).sort()) {
        const before = commands.length;
        try {
            await import(pathToFileURL(file).href);
            const rel = path.relative(PLUGINS_DIR, file);
            for (let i = before; i < commands.length; i++) {
                if (!commands[i].filename || commands[i].filename === 'Not Provided') commands[i].filename = rel;
            }
            ok++;
        } catch (e) {
            bad++;
            console.error(`[PLUGINS] ❌ ${path.relative(__dirname, file)} → ${e.message}`);
        }
    }
    console.log(`[PLUGINS] ✅ ${ok} file(s) loaded, ${bad} failed, ${commands.length} command(s) total`);
}

// ═════════════ 2. MESSAGE HANDLER ═══════════════════════════

const metaCache = new Map(); // group metadata cache (rate-limit se bachne ke liye)
async function getGroupMeta(conn, jid) {
    const hit = metaCache.get(jid);
    if (hit && Date.now() - hit.t < 60_000) return hit.data;
    try {
        const data = await conn.groupMetadata(jid);
        metaCache.set(jid, { t: Date.now(), data });
        return data;
    } catch {
        return hit?.data || null;
    }
}

async function handleStatus(conn, mek) {
    if (mek.key.fromMe) return;
    if (on('AUTO_VIEW_STATUS') || on('AUTO_STATUS_SEEN')) await conn.readMessages([mek.key]).catch(() => {});
    if (on('AUTO_LIKE_STATUS') && mek.key.participant) {
        const botJid = jidNormalizedUser(conn.user.id);
        await conn.sendMessage(
            'status@broadcast',
            { react: { text: pickRandom(userConfig.AUTO_LIKE_EMOJI || ['❤️']), key: mek.key } },
            { statusJidList: [mek.key.participant, botJid] }
        ).catch(() => {});
    }
}

async function handleMessage(conn, mek) {
    if (!mek?.message || !mek.key) return;

    // ephemeral wrapper hatao
    if (mek.message.ephemeralMessage) mek.message = mek.message.ephemeralMessage.message;

    // edited message → anti-edit
    if (mek.message.protocolMessage?.editedMessage) {
        await AntiEdit(conn, mek).catch(() => {});
        return;
    }
    if (mek.message.protocolMessage) return; // delete/revoke wagaira messages.update handle karta hai

    const from = mek.key.remoteJid;
    if (from === 'status@broadcast') return handleStatus(conn, mek);

    const m = sms(conn, mek, store);
    if (!m) return;
    store.saveMessage(m).catch?.(() => {});

    // ── context ──
    const sender = m.sender || '';
    const isGroup = from.endsWith('@g.us');
    const body = (m.body || m.text || '').toString();
    const prefix = userConfig.PREFIX || '.';
    const isCmd = body.startsWith(prefix);
    const argsAll = body.trim().split(/ +/);
    const command = isCmd ? body.slice(prefix.length).trim().split(/ +/)[0].toLowerCase() : '';
    const args = argsAll.slice(1);
    const q = args.join(' ');

    const botJid = jidNormalizedUser(conn.user.id);
    const botLid = conn.user.lid ? jidNormalizedUser(conn.user.lid) : '';
    const botNumber = botJid.split('@')[0];
    ownerSet.add(botNumber);

    let senderNumber = sender.split('@')[0];
    if (sender.endsWith('@lid')) {
        try { senderNumber = (await lidToPhone(conn, sender)) || senderNumber; } catch {}
    }
    const isOwner = !!m.fromMe || ownerSet.has(senderNumber) || ownerSet.has(sender);

    // ── mode ──
    const mode = userConfig.MODE || 'public';
    if (!isOwner) {
        if (mode === 'private') return;
        if (mode === 'inbox' && isGroup) return;
        if (mode === 'groups' && !isGroup) return;
    }

    // ── group info ──
    let groupMetadata = null, groupName = '', participants = [], groupAdmins = [], isAdmins = false, isBotAdmins = false;
    if (isGroup) {
        groupMetadata = await getGroupMeta(conn, from);
        if (groupMetadata) {
            groupName = groupMetadata.subject;
            participants = groupMetadata.participants || [];
            const adminIds = new Set();
            for (const p of participants) {
                if (p.admin) [p.id, p.jid, p.phoneNumber, p.lid].filter(Boolean).forEach((x) => adminIds.add(x));
            }
            groupAdmins = [...adminIds];
            isAdmins = adminIds.has(sender);
            isBotAdmins = adminIds.has(botJid) || (botLid && adminIds.has(botLid));
        }
    }

    const reply = (text, opts = {}) => conn.sendMessage(from, { text, ...opts }, { quoted: mek });

    // ── auto features ──
    if (on('READ_MESSAGE') && !m.fromMe) conn.readMessages([mek.key]).catch(() => {});
    if (!m.fromMe && on('AUTO_TYPING')) conn.sendPresenceUpdate('composing', from).catch(() => {});
    if (!m.fromMe && on('AUTO_RECORDING')) conn.sendPresenceUpdate('recording', from).catch(() => {});
    if (!m.fromMe && !isCmd && on('AUTO_REACT')) {
        conn.sendMessage(from, { react: { text: pickRandom(userConfig.REACT_EMOJIS), key: mek.key } }).catch(() => {});
    }
    if (isOwner && !m.fromMe && on('OWNER_REACT')) {
        conn.sendMessage(from, { react: { text: pickRandom(userConfig.REACT_EMOJIS), key: mek.key } }).catch(() => {});
    }

    // ── anti-link (sirf WhatsApp group invite links) ──
    if (isGroup && on('ANTI_LINK') && isBotAdmins && !isAdmins && !isOwner && !m.fromMe &&
        /chat\.whatsapp\.com\/[A-Za-z0-9]{10,}/i.test(body)) {
        await conn.sendMessage(from, { delete: mek.key }).catch(() => {});
        addWarning(sender);
        const count = getWarning(sender);
        if (count >= 3) {
            clearWarning(sender);
            await conn.groupParticipantsUpdate(from, [sender], 'remove').catch(() => {});
            await conn.sendMessage(from, { text: `🚫 @${sender.split('@')[0]} removed (link spam).`, mentions: [sender] });
        } else {
            await conn.sendMessage(from, {
                text: `⚠️ @${sender.split('@')[0]} links allowed nahi hain. Warning ${count}/3`,
                mentions: [sender],
            });
        }
        return;
    }

    const ctx = {
        from, sender, senderNumber, botNumber, botJid, pushname: mek.pushName || 'User',
        body, prefix, isCmd, command, args, q, text: q,
        isGroup, groupMetadata, groupName, participants, groupAdmins, isAdmins, isBotAdmins,
        isOwner, isMe: !!m.fromMe, isCreator: isOwner, quoted: m.quoted, reply, store,
        config: userConfig, l: console.log,
    };

    // ── "on" listeners (on: 'body' | 'text' | 'image' | 'video' | 'audio' | 'sticker') ──
    for (const c of commands) {
        if (!c.on) continue;
        const t = m.mtype || '';
        const hit =
            c.on === 'body' || (c.on === 'text' && body) ||
            (c.on === 'image' && t === 'imageMessage') || (c.on === 'video' && t === 'videoMessage') ||
            (c.on === 'audio' && t === 'audioMessage') || (c.on === 'sticker' && t === 'stickerMessage');
        if (!hit) continue;
        try { await c.function(conn, mek, m, ctx); }
        catch (e) { console.error(`[ON:${c.on}] ${c.filename}:`, e.message); }
    }

    // ── commands ──
    if (!isCmd || !command) return;
    const cmdObj = commands.find((c) => c.pattern && (c.pattern === command || (c.alias || []).includes(command)));
    if (!cmdObj) return;

    if (cmdObj.fromMe && !isOwner) return reply('❌ Ye command sirf owner ke liye hai.');
    if (cmdObj.react) conn.sendMessage(from, { react: { text: cmdObj.react, key: mek.key } }).catch(() => {});

    try {
        await cmdObj.function(conn, mek, m, ctx);
    } catch (e) {
        console.error(`[CMD:${command}] ${cmdObj.filename}:`, e);
        reply(`❌ Error in *${command}*: ${e.message}`).catch(() => {});
    }
}

// ═════════════ 3. CONNECTION ════════════════════════════════

let pluginsLoaded = false;
let onlineTimer = null;

async function startBot() {
    if (!pluginsLoaded) { await loadPlugins(); pluginsLoaded = true; }

    fs.mkdirSync(SESSION_DIR, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        version,
        logger,
        browser: Browsers.macOS('Safari'),
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
        markOnlineOnConnect: on('ALWAYS_ONLINE'),
        syncFullHistory: false,
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => (await loadMessage(key.id))?.message?.message || undefined,
    });

    await addConnectionFunctions(conn);
    conn.userConfig = userConfig;
    conn.commands = commands;

    // pairing code (PAIRING_NUMBER=923xxxxxxxxx) ya QR
    if (!conn.authState.creds.registered && PAIRING_NUMBER) {
        await sleep(3000);
        try {
            const code = await conn.requestPairingCode(PAIRING_NUMBER);
            console.log(`\n🔗 PAIRING CODE: ${code?.match(/.{1,4}/g)?.join('-') || code}\n`);
        } catch (e) { console.error('Pairing code error:', e.message); }
    }

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
        if (qr && !PAIRING_NUMBER) qrcode.generate(qr, { small: true });

        if (connection === 'open') {
            console.log(`✅ ${userConfig.BOT_NAME} connected as ${conn.user.id.split(':')[0]}`);
            clearInterval(onlineTimer);
            if (on('ALWAYS_ONLINE')) onlineTimer = setInterval(() => conn.sendPresenceUpdate('available').catch(() => {}), 60_000);
            try {
                await conn.sendMessage(jidNormalizedUser(conn.user.id), {
                    text: `*${userConfig.BOT_NAME} connected ✅*\nPrefix: ${userConfig.PREFIX}\nMode: ${userConfig.MODE}\nCommands: ${commands.length}`,
                });
            } catch {}
        }

        if (connection === 'close') {
            clearInterval(onlineTimer);
            const code = lastDisconnect?.error?.output?.statusCode;
            if (code === DisconnectReason.loggedOut) {
                console.log(`❌ Logged out. "${path.basename(SESSION_DIR)}" folder delete karke dobara pair karo.`);
                process.exit(1);
            }
            console.log(`⚠️ Connection closed (${code ?? 'unknown'}), reconnecting...`);
            setTimeout(() => startBot().catch((e) => console.error('Restart failed:', e)), 3000);
        }
    });

    conn.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const mek of messages) {
            handleMessage(conn, mek).catch((e) => console.error('[HANDLER]', e.message));
        }
    });

    conn.ev.on('messages.update', (updates) => {
        if (on('ANTI_DELETE')) AntiDelete(conn, updates).catch(() => {});
    });

    conn.ev.on('group-participants.update', (update) => {
        metaCache.delete(update.id);
        GroupEvents(conn, update).catch(() => {});
    });

    conn.ev.on('groups.update', (updates) => {
        for (const u of updates) { if (u.id) metaCache.delete(u.id); }
    });

    conn.ev.on('call', async (calls) => {
        if (!on('ANTI_CALL')) return;
        for (const call of calls) {
            if (call.status !== 'offer') continue;
            try {
                await conn.rejectCall(call.id, call.from);
                await conn.sendMessage(call.from, { text: userConfig.REJECT_MSG });
            } catch {}
        }
    });

    return conn;
}

// ═════════════ 4. WEB SERVER + SAFETY ═══════════════════════

http.createServer((req, res) => {
    const page = path.join(__dirname, 'lib', 'main.html');
    if (fs.existsSync(page)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(fs.readFileSync(page));
    }
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`${userConfig.BOT_NAME} is running ✅`);
}).listen(PORT, () => console.log(`🌐 Server on port ${PORT}`));

process.on('uncaughtException', (e) => console.error('[uncaughtException]', e));
process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));
if (global.gc) setInterval(() => global.gc(), 120_000);

startBot().catch((e) => { console.error('Fatal start error:', e); process.exit(1); });
