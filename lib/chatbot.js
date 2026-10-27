const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'database/chatbot-data.json');

let conversationHistory = {};
let botSentMessageIds = new Set();
let processedMessageIds = new Set();

function ensureDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            conversationHistory = parsed.history || {};
        }
    } catch (e) {
        conversationHistory = {};
    }
}

function saveData() {
    try {
        ensureDir(DATA_FILE);
        fs.writeFileSync(DATA_FILE, JSON.stringify({ history: conversationHistory }, null, 2));
    } catch (e) {
        console.error('Chatbot data save error:', e.message);
    }
}

loadData();

function normalizeId(id) {
    if (!id) return '';
    return String(id)
        .replace(/:[0-9]+/g, '')
        .replace(/@(lid|s.whatsapp.net|c.us|g.us)/g, '')
        .replace(/[^\d]/g, '');
}

function clean(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isChatbotEnabled(userConfig, from) {
    if (!userConfig) return false;
    const map = userConfig.CHATBOT_CHATS || {};
    if (Object.prototype.hasOwnProperty.call(map, from)) {
        return map[from] === 'true';
    }
    return userConfig.CHATBOT === 'true';
}

function getHistory(chatId) {
    const list = conversationHistory[chatId] || [];
    return list.filter(h => !(h.role === 'bot' && isRefusal(h.content)));
}

function addToHistory(chatId, role, content) {
    if (!conversationHistory[chatId]) conversationHistory[chatId] = [];
    conversationHistory[chatId].push({ role, content });
    if (conversationHistory[chatId].length > 12) {
        conversationHistory[chatId] = conversationHistory[chatId].slice(-12);
    }
    saveData();
}

function clearHistory(chatId) {
    conversationHistory[chatId] = [];
    saveData();
}

function clearChatHistory(chatId) {
    delete conversationHistory[chatId];
    Object.keys(conversationHistory).forEach(key => {
        if (key.startsWith(`${chatId}_`)) delete conversationHistory[key];
    });
    saveData();
}

function clearAllHistory() {
    conversationHistory = {};
    saveData();
}

function markBotMessage(id) {
    if (!id) return;
    botSentMessageIds.add(id);
    if (botSentMessageIds.size > 500) {
        const first = botSentMessageIds.values().next().value;
        botSentMessageIds.delete(first);
    }
}

function isBotMessage(id) {
    return id ? botSentMessageIds.has(id) : false;
}

function isDuplicate(id) {
    if (!id) return false;
    if (processedMessageIds.has(id)) return true;
    processedMessageIds.add(id);
    if (processedMessageIds.size > 1000) {
        const first = processedMessageIds.values().next().value;
        processedMessageIds.delete(first);
    }
    return false;
}

function wrapConnSend(conn) {
    if (conn.__chatbotSendWrapped) return;
    conn.__chatbotSendWrapped = true;
    const originalSend = conn.sendMessage.bind(conn);
    conn.sendMessage = async (...args) => {
        const sent = await originalSend(...args);
        if (sent?.key?.id) markBotMessage(sent.key.id);
        return sent;
    };
}

const REFUSAL_PATTERNS = [
    /language model/i,
    /\bas an? (ai|language|text|large)\b/i,
    /\bi(?:'m| am) (an? )?(ai|bot|assistant|chatbot|language model)/i,
    /i can(?:'|no)?t (?:assist|help|fulfill|comply)/i,
    /i cannot/i,
    /anurodh/i,
    /programming ke dayre/i,
    /text ke aadhaar/i,
    /sirf text generate/i,
    /madad nahi?n kar sakta/i,
    /taiyy?ar nahi?n/i,
    /main sirf text/i,
    /mujhe is kam mein/i,
    /\bmain (ek )?(ai|bot|chatbot|assistant)\b/i,
    /\bai ho{1,2}n\b/i,
    /\bai hun\b/i,
    /\b(chatgpt|openai|gpt-?\d|gemini|claude|anthropic)\b/i
];

function isRefusal(text) {
    if (!text) return false;
    return REFUSAL_PATTERNS.some(r => r.test(String(text)));
}

const CLOSE_CORE = new Set([
    'ok', 'okay', 'okk', 'okkk', 'okey', 'k', 'kk', 'acha', 'achha', 'accha',
    'theek', 'thik', 'thk', 'hmm', 'hmmm', 'hm', 'thanks', 'thx', 'tnx',
    'shukriya', 'shukria', 'nice', 'wah', 'waah', 'chalo', 'chal', 'done',
    'bye', 'byee', 'byeee', 'hafiz', 'allahhafiz', 'khudahafiz', 'gn', 'ttyl'
]);

const CLOSE_FILLER = new Set([
    'bhai', 'yar', 'yaar', 'g', 'ji', 'jee', 'hai', 'hain', 'phir', 'milte',
    'allah', 'khuda', 'good', 'night', 'shab', 'bakhair', 'thank', 'you', 'got', 'it'
]);

const FAREWELL_RE = /\b(bye+|allah ?hafiz|khuda ?hafiz|good night|shab bakhair|ttyl)\b/;

function isIgnorable(text) {
    const original = String(text || '').trim();
    if (!original) return true;
    const t = clean(original);
    if (!t) return /\p{Extended_Pictographic}/u.test(original);
    const words = t.split(' ');
    if (words.length <= 8 && FAREWELL_RE.test(t)) return true;
    if (words.length > 5) return false;
    return words.every(w => CLOSE_CORE.has(w) || CLOSE_FILLER.has(w)) &&
        words.some(w => CLOSE_CORE.has(w));
}

const WHERE_RE = /\b(kaha+n?|kidhar|kidr|kdhr|kithe|kithay)\b.{0,15}\b(ho|ha|hay|hai|hain|aap|app|ap|tum|tu)\b|\b(ho|ha|hay|hai|hain|aap|app|ap|tum|tu)\b.{0,10}\b(kaha+n?|kidhar|kidr|kdhr|kithe|kithay)\b/;

const MEET_RE = /\b(milna|milnay|milne|milni|milte|milenge|mil sakte|mil skte|mil lete|mil lo|mulaqat|mulaqaat|meet|meeting|aa jao|aajao|ajao|a jao|aao|aaun|aa raha|aa rahi|visit|location|lokation|address|ghar aa|ghar pe ho|ghar par ho|tumhare ghar|aap ke ghar|aap k ghar|aapke ghar)\b|where (are|r) (u|you)|where u/;

function isMeetingTalk(text) {
    const t = clean(text);
    return WHERE_RE.test(t) || MEET_RE.test(t);
}

const UNSAFE_REPLY_RE = /(aa jao|aajao|aa jana|aa jaiye|mil lete|mil lunga|mil lenge|mil leta|mil leti|milte hain|milenge|milta hoon|ghar pe|ghar par|ghar mein|ghar me|address|location|pahunch|pohanch|yahan aa)/;

function isUnsafeReply(text) {
    return UNSAFE_REPLY_RE.test(clean(text));
}

const DETAIL_RE = /\b(detail|details|tafseel|tafsil|tafseelan|explain|samjha|samjhao|samjhana|step|steps|tarika|tareeqa|tariqa|kahani|story|likh do|likho|essay|code|poori|puri|batao kaise|kaise kar|kaise bana)\b/;

function wantsDetail(text) {
    const t = clean(text);
    return t.length > 120 || DETAIL_RE.test(t);
}

function greetingReply(text) {
    const t = clean(text);
    if (/^(salam|salaam|assalam|assalamualaikum|assalamu alaikum|asalam o alaikum|aoa|slm)/.test(t)) {
        return 'Walaikum assalam, kya haal hai?';
    }
    if (/\b(kya|kia) (hal|haal)\b|\bkaise ho\b|\bkese ho\b|\bhow are you\b/.test(t)) {
        return 'Main theek hoon, tum sunao?';
    }
    if (/^(hi+|hello|hey|helo)\b/.test(t)) {
        return 'Hello, kya haal hai?';
    }
    return null;
}

function trimReply(text, maxLines = 2, maxChars = 200) {
    let t = String(text || '').replace(/^\s*(Dost|Bot|User)\s*:\s*/i, '').trim();
    if (!t) return '';
    t = t.split('\n').map(l => l.trim()).filter(Boolean).slice(0, maxLines).join('\n');
    if (t.length > maxChars) {
        const cut = t.slice(0, maxChars);
        const lastEnd = Math.max(
            cut.lastIndexOf('.'),
            cut.lastIndexOf('!'),
            cut.lastIndexOf('?'),
            cut.lastIndexOf('۔')
        );
        if (lastEnd > 40) {
            t = cut.slice(0, lastEnd + 1);
        } else {
            const lastSpace = cut.lastIndexOf(' ');
            t = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
        }
    }
    return t;
}

module.exports = {
    isChatbotEnabled,
    getHistory,
    addToHistory,
    clearHistory,
    clearChatHistory,
    clearAllHistory,
    markBotMessage,
    isBotMessage,
    wrapConnSend,
    isDuplicate,
    isRefusal,
    isIgnorable,
    isMeetingTalk,
    isUnsafeReply,
    wantsDetail,
    greetingReply,
    trimReply,
    normalizeId
};
