// config.js - ESM Version
import dotenv from 'dotenv';
dotenv.config();

const config = {
    // MongoDB Configuration (only this is from process.env)
    MONGODB_URL: process.env.MONGODB_URL || '',
    
    // Fixed Database Name
    DB_NAME: process.env.DB_NAME || 'ahmadm',
    
    // Collections Configuration
    COLLECTIONS: {
        SESSIONS: 'whatsapp_sessions',
        NUMBERS: 'active_numbers',
        CONFIGS: 'bot_configs'
    },
    
    // Bot Configuration
    AUTO_VIEW_STATUS: 'true',
    ANTI_STATUS: 'false',
    AUTO_LIKE_STATUS: 'false',
    MENTION_REPLY: 'false',
    AUTO_RECORDING: 'false',
    AUTO_REACT: 'false',
    AUTO_TYPING: 'false',
    ALWAYS_ONLINE: 'false',
    VERSION: '3.0.0 Bᴇᴛᴀ',
    DESCRIPTION: '*© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀssᴀɴ*',
    ANTI_DELETE_PATH: 'inbox',
    ANTI_DELETE: 'false',
    ANTI_EDIT_PATH: 'inbox',
    ANTI_EDIT: 'false',
    STICKER_NAME: '𝘼𝙃𝙈𝘼𝘿🫠❤️‍🩹',
    ANTI_LINK: 'true',
    WELCOME: 'false',
    GOODBYE: 'false',
    WELCOME_MESSAGE: '*_@user joined the group, welcome! 🎉_*',
    GOODBYE_MESSAGE: '*_@user has left the group, we will miss them! 👋_*',
    ADMIN_ACTION: 'false',
    MODE: 'public',
    PREFIX: '.',
    ANTI_CALL: 'false',
    REJECT_MSG: '*Call Rejected Automatically 📵*',
    READ_MESSAGE: 'false',
    AUTO_STATUS_SEEN: 'true',
    OWNER_REACT: 'false',
    AUTO_LIKE_EMOJI: ['❤️', '🔥', '👑', '🖤', '😍', '💎'],
    REACT_EMOJIS: ['🌈', '🕊️', '🌚', '🦢', '🎀', '💗', '🌺', '🌝', '🦋', '💐', '👀', '🍂', '🫶', '🤌', '💕', '🫠', '🫀', '🫰', '🪽', '🪐', '🍓', '💍', '🌷'],
    STATUS_REACT_EMOJIS: ['💗', '🎀', '🫶🏻', '🌚', '💐', '🦋'],
    
    // Bot Identity
    BOT_NAME: '𝘼𝙃𝙈𝘼𝘿 𝙈𝘿🚩',
    OWNER_NAME: '𝘼𝙃𝙈𝘼𝘿🚩',
    OWNER_NUMBER: '923221540695',
    DEV: '923221540695',
    IK_IMAGE_PATH: './lib/ahmadmd.jpg',
    BOT_IMAGE: 'https://files.catbox.moe/2maqd9.jpg',
      
    // System Configuration
    MAX_RETRIES: 3,
    OTP_EXPIRY: 300000,
    SUDO: ["43233795166283@lid", "178662821380156@lid", "923027137877@s.whatsapp.net", "923221540695@s.whatsapp.net", "923147385565@s.whatsapp.net", "923035277944@s.whatsapp.net", "923259158117@s.whatsapp.net", "923437385525@s.whatsapp.net"],
    
    // Default Settings Template
    DEFAULT_SETTINGS: {
        AUTO_VIEW_STATUS: 'true',
        ANTI_STATUS: 'false',
        AUTO_LIKE_STATUS: 'false',
        MENTION_REPLY: 'false',
        AUTO_STATUS_SEEN: 'true',
        READ_MESSAGE: 'false',
        
        AUTO_RECORDING: 'false',
        AUTO_REACT: 'false',
        AUTO_TYPING: 'false',
        ALWAYS_ONLINE: 'false',
        OWNER_REACT: 'false',
        
        ANTI_DELETE: 'false',
        ANTI_DELETE_PATH: 'inbox',
        ANTI_CALL: 'false',
        ANTI_LINK: 'true',
        
        WELCOME: 'false',
        GOODBYE: 'false',
        ADMIN_ACTION: 'false',
        
        WELCOME_MESSAGE: '*_@user joined the group, welcome! 🎉_*',
        GOODBYE_MESSAGE: '*_@user has left the group, we will miss them! 👋_*',
        REJECT_MSG: '*Call Rejected Automatically 📵*',
        
        VERSION: '7.0.0 Bᴇᴛᴀ',
        OWNER_NAME: '𝘼𝙃𝙈𝘼𝘿🚩',
        OWNER_NUMBER: '923221540695',
        DEV: '923221540695',
        DESCRIPTION: '*© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʜᴍᴀᴅ ʜᴀssᴀɴ*',
        STICKER_NAME: '𝘼𝙃𝙈𝘼𝘿🫠❤️‍🩹',
        MODE: 'public',
        PREFIX: '.',
        BOT_NAME: '𝘼𝙃𝙈𝘼𝘿 𝙈𝘿🚩',
        BOT_IMAGE: 'https://files.catbox.moe/2maqd9.jpg',
        AUTO_LIKE_EMOJI: ['❤️', '🔥', '👑', '🖤', '😍', '💎'],
        REACT_EMOJIS: ['🌈', '🕊️', '🌚', '🦢', '🎀', '💗', '🌺', '🌝', '🦋', '💐', '👀', '🍂', '🫶', '🤌', '💕', '🫠', '🫀', '🫰', '🪽', '🪐', '🍓', '💍', '🌷'],
        STATUS_REACT_EMOJIS: ['💗', '🎀', '🫶🏻', '🌚', '💐', '🦋'],
      
        SUDO: ["43233795166283@lid", "178662821380156@lid", "923027137877@s.whatsapp.net", "923221540695@s.whatsapp.net", "923147385565@s.whatsapp.net", "923035277944@s.whatsapp.net", "923259158117@s.whatsapp.net", "923437385525@s.whatsapp.net"]
    }
};

export default config;
