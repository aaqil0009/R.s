// lib/index.js - ESM Version for JAWAD-MD
import { 
    saveContact,
    loadMessage,
    getName,
    getChatSummary,
    saveGroupMetadata,
    getGroupMetadata,
    saveMessageCount,
    getInactiveGroupMembers,
    getGroupMembersMessageCount,
    saveMessage
} from './store.js';

// Import other functions from lib/functions.js
import {
    getBuffer,
    getGroupAdmins,
    getRandom,
    h2k,
    isUrl,
    Json,
    runtime,
    sleep,
    fetchJson,
    lidToPhone,
    cleanPN,
    delay
} from './functions.js';

// Import msg functions from lib/handler.js
import { sms, downloadMediaMessage } from './handler.js';

// Import antidelete functions from lib/antidel.js
import { 
    DeletedText,
    DeletedMedia,
    AntiDelete 
} from './antidel.js';

// Import warning functions from lib/warning.js
import { 
    getWarning,
    addWarning,
    clearWarning
} from './warning.js';

// Import anti-edit functions from lib/antiedit.js
import AntiEdit from './antiedit.js';

// Import group events from lib/groupevents.js
import GroupEvents from './groupevents.js';

// Import connection functions
import { addConnectionFunctions } from './connection.js';

// Export everything
export {
    // Store functions
    saveContact,
    loadMessage,
    getName,
    getChatSummary,
    saveGroupMetadata,
    getGroupMetadata,
    saveMessageCount,
    getInactiveGroupMembers,
    getGroupMembersMessageCount,
    saveMessage,
    
    // Functions
    getBuffer,
    getGroupAdmins,
    getRandom,
    h2k,
    isUrl,
    Json,
    runtime,
    sleep,
    fetchJson,
    lidToPhone,
    cleanPN,
    delay,
    
    // Msg functions
    sms,
    downloadMediaMessage,
    
    // Antidelete functions
    DeletedText,
    DeletedMedia,
    AntiDelete,
    
    // Warning functions
    getWarning,
    addWarning,
    clearWarning,
    
    // Anti-edit functions
    AntiEdit,
    
    // Group events
    GroupEvents,
    
    // Connection functions
    addConnectionFunctions
};

export default {
    saveContact,
    loadMessage,
    getName,
    getChatSummary,
    saveGroupMetadata,
    getGroupMetadata,
    saveMessageCount,
    getInactiveGroupMembers,
    getGroupMembersMessageCount,
    saveMessage,
    getBuffer,
    getGroupAdmins,
    getRandom,
    h2k,
    isUrl,
    Json,
    runtime,
    sleep,
    fetchJson,
    lidToPhone,
    cleanPN,
    delay,
    sms,
    downloadMediaMessage,
    DeletedText,
    DeletedMedia,
    AntiDelete,
    getWarning,
    addWarning,
    clearWarning,
    AntiEdit,
    GroupEvents,
    addConnectionFunctions
};
