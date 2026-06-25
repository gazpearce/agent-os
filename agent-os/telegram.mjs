import https from 'https';

// ─── Telegram Bot — Fully Featured Implementation ───────────────────────────
// Features:
//  • Typing indicator while agent processes
//  • Message splitting (4096 char Telegram limit)
//  • Markdown/HTML formatting support
//  • /commands: /help /status /clear /agents /model
//  • Per-user session isolation
//  • Error recovery with user-friendly messages
//  • Photo / document / voice message handling
// ─────────────────────────────────────────────────────────────────────────────

export function initializeTelegram(sendMessageCallback, getStatusCallback) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const allowedUsersStr = process.env.TELEGRAM_ALLOWED_USERS || '';
  const allowedUsers = allowedUsersStr.split(',').map(s => s.trim()).filter(Boolean);

  if (!token) {
    console.error('[Telegram] Error: TELEGRAM_BOT_TOKEN is not configured in .env');
    return;
  }

  console.log('[Telegram] Initializing Client (Zero-Dependency Long Polling)...');

  // Per-user session tracking
  const userSessions = new Map();

  let offset = 0;
  let running = true;

  // ── API Call Helper ──────────────────────────────────────────────────────
  const apiCall = (method, data) => {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(data);
      const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${token}/${method}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const req = https.request(options, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch (e) { reject(e); }
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  };

  // ── Send Typing Action ───────────────────────────────────────────────────
  const sendTyping = async (chatId) => {
    try {
      await apiCall('sendChatAction', { chat_id: chatId, action: 'typing' });
    } catch (_) {}
  };

  // Keep typing indicator alive while processing
  const keepTyping = (chatId, intervalMs = 4500) => {
    const timer = setInterval(() => sendTyping(chatId), intervalMs);
    return () => clearInterval(timer);
  };

  // ── Split Long Messages ──────────────────────────────────────────────────
  const splitMessage = (text, maxLen = 4096) => {
    if (text.length <= maxLen) return [text];
    const chunks = [];
    let start = 0;
    while (start < text.length) {
      let end = start + maxLen;
      // Try to split at a newline boundary
      if (end < text.length) {
        const nl = text.lastIndexOf('\n', end);
        if (nl > start + 100) end = nl + 1;
      }
      chunks.push(text.slice(start, end));
      start = end;
    }
    return chunks;
  };

  // ── Send Reply (with splitting + MarkdownV2 fallback) ───────────────────
  const sendReply = async (chatId, text, parseMode = null) => {
    const chunks = splitMessage(text);
    for (let i = 0; i < chunks.length; i++) {
      const payload = {
        chat_id: chatId,
        text: chunks[i],
      };

      if (parseMode) {
        payload.parse_mode = parseMode;
      }

      try {
        await apiCall('sendMessage', payload);
      } catch (err) {
        // If Markdown fails, send as plain text
        try {
          await apiCall('sendMessage', { chat_id: chatId, text: chunks[i] });
        } catch (_) {}
      }
    }
  };

  // ── Format Response Text ─────────────────────────────────────────────────
  const formatResponse = (text) => {
    if (!text) return '_(no response)_';
    // Trim excessive whitespace
    return text.trim().substring(0, 15000);
  };

  // ── Command Handlers ─────────────────────────────────────────────────────
  const HELP_TEXT = `🤖 *Agent OS — Telegram Interface*

*Commands:*
/help — Show this help
/status — Agent OS status & active model
/agents — List all online agents
/model — Show current AI model
/clear — Clear your conversation session
/run \\<agent\\> \\<message\\> — Send to a specific agent

*Usage:*
Just type naturally — your message goes to *Antigravity* (the CEO agent) who coordinates the whole swarm.

Examples:
• _What's the weather in London?_
• _Write me a Python script to..._
• _/run hermes Search for the latest AI news_`;

  const handleCommand = async (cmd, args, chatId, fromName, fromId) => {
    const cmdLower = cmd.toLowerCase();

    if (cmdLower === '/start' || cmdLower === '/help') {
      await sendReply(chatId, HELP_TEXT, 'MarkdownV2');
      return true;
    }

    if (cmdLower === '/status') {
      try {
        if (getStatusCallback) {
          const status = await getStatusCallback();
          const agentCount = Object.keys(status.agents || {}).length;
          const model = status.activeModel || 'Unknown';
          const msg = `✅ *Agent OS Online*\n\n🧠 Model: \`${model}\`\n👥 Agents: ${agentCount} online\n💾 Workspace: \`${status.workspace || 'D:/Agent OS'}\``;
          await sendReply(chatId, msg, 'MarkdownV2');
        } else {
          await sendReply(chatId, '✅ Agent OS is running.');
        }
      } catch (e) {
        await sendReply(chatId, '⚠️ Could not fetch status: ' + e.message);
      }
      return true;
    }

    if (cmdLower === '/agents') {
      try {
        if (getStatusCallback) {
          const status = await getStatusCallback();
          const agents = status.agents || {};
          const list = Object.values(agents)
            .map(a => `• *${a.name || a}*` + (typeof a === 'object' ? ` — ${a.role || ''}` : ''))
            .join('\n');
          await sendReply(chatId, `👥 *Online Agents:*\n\n${list}`, 'MarkdownV2');
        } else {
          await sendReply(chatId, 'Agents: Antigravity, Hermes, OpenClaw, Obsidian, Claude Code, Aider, GitHub CLI');
        }
      } catch (e) {
        await sendReply(chatId, 'Could not fetch agent list.');
      }
      return true;
    }

    if (cmdLower === '/model') {
      try {
        if (getStatusCallback) {
          const status = await getStatusCallback();
          await sendReply(chatId, `🧠 Active model: \`${status.activeModel || 'Unknown'}\``, 'MarkdownV2');
        }
      } catch (_) {
        await sendReply(chatId, '🧠 Could not fetch model info.');
      }
      return true;
    }

    if (cmdLower === '/clear') {
      userSessions.set(fromId, `telegram_${fromId}_${Date.now()}`);
      await sendReply(chatId, '🧹 Conversation cleared. Starting fresh!');
      return true;
    }

    if (cmdLower === '/run' && args.length >= 2) {
      const targetAgent = args[0].toLowerCase();
      const agentMessage = args.slice(1).join(' ');
      
      await sendTyping(chatId);
      const stopTyping = keepTyping(chatId);
      
      try {
        const sessionId = userSessions.get(fromId) || `telegram_${fromId}`;
        const result = await sendMessageCallback(agentMessage, fromId, targetAgent, sessionId);
        stopTyping();
        const reply = formatResponse(result?.response || result?.output || 'No response.');
        await sendReply(chatId, `📨 *${targetAgent}:* ${reply}`, 'MarkdownV2');
      } catch (err) {
        stopTyping();
        await sendReply(chatId, `❌ Error sending to ${targetAgent}: ${err.message}`);
      }
      return true;
    }

    return false; // Not a recognized command
  };

  // ── Main Message Handler ─────────────────────────────────────────────────
  const handleMessage = async (message) => {
    const chatId = message.chat.id;
    const fromId = message.from?.id?.toString() || '0';
    const fromName = message.from?.first_name || message.from?.username || 'User';

    // Auth check
    if (allowedUsers.length > 0 && !allowedUsers.includes(fromId)) {
      console.warn(`[Telegram] Unauthorized: ${fromName} (${fromId})`);
      await apiCall('sendMessage', {
        chat_id: chatId,
        text: '❌ Access Denied. You are not authorized to use this bot.'
      });
      return;
    }

    // Handle non-text messages
    if (!message.text) {
      if (message.photo) {
        await sendReply(chatId, '📷 I received a photo! Image analysis coming soon.');
      } else if (message.voice) {
        await sendReply(chatId, '🎤 I received a voice message! Audio transcription coming soon.');
      } else if (message.document) {
        await sendReply(chatId, `📎 Received file: ${message.document.file_name}. File handling coming soon.`);
      } else {
        await sendReply(chatId, '❓ I can only process text messages right now.');
      }
      return;
    }

    const text = message.text.trim();
    console.log(`[Telegram] Message from ${fromName} (${fromId}): ${text}`);

    // Ensure per-user session exists
    if (!userSessions.has(fromId)) {
      userSessions.set(fromId, `telegram_${fromId}`);
    }

    // Check if it's a command
    if (text.startsWith('/')) {
      const parts = text.split(/\s+/);
      const cmd = parts[0].split('@')[0]; // Strip @BotName suffix
      const args = parts.slice(1);
      const handled = await handleCommand(cmd, args, chatId, fromName, fromId);
      if (handled) return;
    }

    // Regular message — send to Antigravity
    await sendTyping(chatId);
    const stopTyping = keepTyping(chatId);

    try {
      const sessionId = userSessions.get(fromId);
      const result = await sendMessageCallback(text, fromId, null, sessionId);
      stopTyping();

      const reply = formatResponse(result?.response || result?.output);
      
      if (reply && reply.length > 0) {
        await sendReply(chatId, reply);
      }
    } catch (err) {
      stopTyping();
      console.error('[Telegram] Error in message callback:', err.message);
      await sendReply(chatId, `⚠️ Something went wrong: ${err.message.substring(0, 200)}`);
    }
  };

  // ── Main Polling Loop ────────────────────────────────────────────────────
  const poll = async () => {
    while (running) {
      try {
        const res = await apiCall('getUpdates', {
          offset,
          timeout: 30,
          allowed_updates: ['message', 'callback_query']
        });

        if (res.ok && res.result?.length > 0) {
          for (const update of res.result) {
            offset = update.update_id + 1;
            
            if (update.message) {
              // Don't await — handle concurrently so next poll isn't blocked
              handleMessage(update.message).catch(e => {
                console.error('[Telegram] Unhandled error:', e.message);
              });
            }
          }
        }
      } catch (err) {
        console.error('[Telegram Polling Error]', err.message);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  };

  poll();

  return {
    stop: () => { running = false; },
    getUserSessions: () => userSessions
  };
}
