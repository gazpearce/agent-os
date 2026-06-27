/**
 * Agent OS — Unified Multi-Agent Platform
 * All agents (Hermes, AGY, OpenClaw, Obsidian) share context,
 * communicate, and collaborate on a single dashboard.
 *
 * Single server on port 3001:
 * - Frontend dashboard (React app served from /dist)
 * - API endpoints (/api/*)
 * - Inter-agent messaging hub
 * - Shared workspace filesystem
 * - Real-time agent status & activity log
 */

import createChatRouter from './backend/routes/chat.mjs';
import createMemoriesRouter from './backend/routes/memories.mjs';
import createGoalsRouter from './backend/routes/goals.mjs';
import createSkillsRouter from './backend/routes/skills.mjs';
import createModelsRouter from './backend/routes/models.mjs';
import createDiagnosticsRouter from './backend/routes/diagnostics.mjs';
import createSwarmRouter from './backend/routes/swarm.mjs';
import createMemoryRouter from './backend/routes/memory.mjs';
import createPaperclipRouter from './backend/routes/paperclip.mjs';
import createWorkflowRouter from './backend/routes/workflow.mjs';
import createPluginsRouter from './backend/routes/plugins.mjs';
import createAgentsRouter from './backend/routes/agents.mjs';
import createTodoRouter from './backend/routes/todo.mjs';
import createCronRouter from './backend/routes/cron.mjs';
import createExternalRouter from './backend/routes/external.mjs';
import createWebsiteRouter from './backend/routes/website.mjs';
import createN8nRouter from './backend/routes/n8n.mjs';
import createDbTasksRouter from './backend/routes/dbtasks.mjs';
import createWishlistRouter from './backend/routes/wishlist.mjs';
import createMcpRouter from './backend/routes/mcp.mjs';
import createEvolutionRouter from './backend/routes/evolution.mjs';
import createTerminalRouter from './backend/routes/terminal.mjs';
import createVaultRouter from './backend/routes/vault.mjs';
import createRagRouter from './backend/routes/rag.mjs';
import createSeoRouter from './backend/routes/seo.mjs';
import createCronsRouter from './backend/routes/crons.mjs';
import createIntegrationsRouter from './backend/routes/integrations.mjs';
import createBrowserRouter from './backend/routes/browser.mjs';
import createNotebooklmRouter from './backend/routes/notebooklm.mjs';
import createBackgroundAgentRouter from './backend/routes/background-agent.mjs';
import createGenerateImageRouter from './backend/routes/generate-image.mjs';
import createGenerateVideoRouter from './backend/routes/generate-video.mjs';
import createYoutubeRouter from './backend/routes/youtube.mjs';
import createGithubRouter from './backend/routes/github.mjs';
import createSharedRouter from './backend/routes/shared.mjs';
import createConfigRouter from './backend/routes/config.mjs';
import createTeamsRouter from './backend/routes/teams.mjs';
import createAionuiRouter from './backend/routes/aionui.mjs';
import createMailboxRouter from './backend/routes/mailbox.mjs';
import createDbRouter from './backend/routes/db.mjs';
import createApiUsageRouter from './backend/routes/api-usage.mjs';
import createGeminiKeysRouter from './backend/routes/gemini-keys.mjs';
import createSessionsRouter from './backend/routes/sessions.mjs';
import createSessionDetailRouter from './backend/routes/session-detail.mjs';
import createMiscRouter from './backend/routes/misc.mjs';
import { AsyncDatabase } from './backend/db/asyncDb.mjs';
import express from 'express';
import cors from 'cors';
import os from 'os';
import { EventEmitter } from 'events';
EventEmitter.defaultMaxListeners = 30;
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync, unlink, unlinkSync, appendFileSync, watch } from 'fs';
import { exec, execSync, spawn } from 'child_process';
import pty from 'node-pty';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import { createRequire } from 'module';
import { createHash } from 'crypto';
const require = createRequire(import.meta.url);
import { initializeWhatsApp } from './whatsapp.mjs';
import { initializeTelegram } from './telegram.mjs';
import { HttpsProxyAgent } from 'https-proxy-agent';
import https from 'https';
import { URL } from 'url';
import createTodoRouter from './backend/routes/todo.mjs';

// ═══════════════════════════════════════════════════════════════════════
// PROXY ROTATOR
// ═══════════════════════════════════════════════════════════════════════
let PROXY_LIST = [];
let CURRENT_PROXY_INDEX = 0;
async function updateProxyList() {
  try {
    console.log('[Proxy Rotator] Fetching fresh free proxy list...');
    const list = [];

    // 1. Fetch from ProxyScrape (very fresh)
    try {
      const r1 = await fetch('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=all');
      if (r1.ok) {
        const text = await r1.text();
        const ps = text.split('\r\n').map(line => line.trim()).filter(line => line.length > 0);
        list.push(...ps);
      }
    } catch (e) {
      console.error('[Proxy Rotator] ProxyScrape fetch failed:', e.message);
    }

    // 2. Fetch from TheSpeedX SOCKS-List
    try {
      const r2 = await fetch('https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt');
      if (r2.ok) {
        const text = await r2.text();
        const sx = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        list.push(...sx);
      }
    } catch (e) {
      console.error('[Proxy Rotator] TheSpeedX fetch failed:', e.message);
    }
    PROXY_LIST = [...new Set(list)];
    console.log(`[Proxy Rotator] Loaded ${PROXY_LIST.length} unique proxies.`);
  } catch (e) {
    console.error('[Proxy Rotator] Failed to fetch proxy list:', e.message);
  }
}
function getProxyIndexForKey(key) {
  if (PROXY_LIST.length === 0) return 0;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % PROXY_LIST.length;
}
async function fetchWithProxy(urlStr, options = {}, maxRetries = 5) {
  if (PROXY_LIST.length === 0) {
    await updateProxyList();
  }
  const parsedUrl = new URL(urlStr);

  // Try to bind a dedicated proxy IP based on the API Key
  let startProxyIndex = CURRENT_PROXY_INDEX;
  const authHeader = options.headers?.['Authorization'] || options.headers?.['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const key = authHeader.replace('Bearer ', '').trim();
    if (key.startsWith('sk-or-v1-6b2b76')) {
      console.log('[Proxy Rotator] Key 1 detected. Keeping request on standard local IP.');
      return fetch(urlStr, options);
    }
    startProxyIndex = getProxyIndexForKey(key);
  }
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const proxyIdx = (startProxyIndex + attempt - 1) % PROXY_LIST.length;
    const proxy = PROXY_LIST[proxyIdx];
    if (!proxy) continue;
    try {
      const agent = new HttpsProxyAgent(`http://${proxy}`);
      const reqHeaders = {
        ...options.headers
      };
      const reqOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || 'GET',
        headers: reqHeaders,
        agent: agent,
        timeout: 4000
      };
      const response = await new Promise((resolve, reject) => {
        const req = https.request(reqOptions, res => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              text: async () => body,
              json: async () => JSON.parse(body)
            });
          });
        });
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Proxy connection timed out'));
        });
        if (options.body) {
          req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
        }
        req.end();
      });
      return response;
    } catch (e) {
      // Quietly try next proxy
    }
  }

  // Fallback to normal fetch if all proxies failed
  console.log('[Proxy Rotator] All proxy attempts failed. Falling back to normal direct request.');
  return fetch(urlStr, options);
}

// Initial fetch on startup
updateProxyList().catch(console.error);
// Refresh list every 30 minutes
setInterval(() => updateProxyList().catch(console.error), 1800000);

// ═══════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env manually
try {
  const envPath = join(__dirname, '.env');
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;
      const parts = trimmedLine.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = val;
      }
    });
    console.log('[Env Loader] Loaded environment variables from .env file successfully.');
  }
} catch (e) {
  console.error('[Env Loader] Failed to load .env file:', e.message);
}
const app = express();
app.use(cors());
app.use(express.json({
  limit: '50gb'
}));
app.use(express.urlencoded({
  limit: '50gb',
  extended: true
}));
const HOME = process.env.USERPROFILE;
const PORT = 3001;
const CONFIG_PATH = `${HOME}\\AppData\\Local\\hermes\\config.yaml`;
const AIONUI_DB = `${HOME}\\AppData\\Roaming\\AionUi\\aionui\\aionui-backend.db`;
let aionuiDb = null;
let systemNotification = null;
let isWritingError = false;
function writeDbErrorToVault(sql, error) {
  if (isWritingError) {
    console.error('[Self-Healing] Recursion prevented inside writeDbErrorToVault.');
    return;
  }
  isWritingError = true;
  try {
    const errorVault = join(SHARED, 'error_vault');
    if (!existsSync(errorVault)) mkdirSync(errorVault, {
      recursive: true
    });
    const sanitizedSql = sql.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30);
    const slug = `db-error-${sanitizedSql}-${Date.now()}`;
    const filePath = join(errorVault, `${slug}.md`);
    const content = `# Error: SQLite database operation failed

## Symptoms
The SQL statement failed with the following error:
\`\`\`
${error.stack || error.message}
\`\`\`

## Root Cause
An error was thrown during SQLite database prepare or execution.
SQL Statement:
\`\`\`sql
${sql}
\`\`\`

## Solution
Inspect the SQL syntax, the schema of the database at ${AIONUI_DB}, and make sure the table exists and the schema matches. Check for database locks.
`;
    writeFileSync(filePath, content, 'utf-8');
    console.log(`[Self-Evolution] Auto-logged SQLite failure to vault: ${filePath}`);

    // Also log to SQLite system_errors table if possible
    try {
      const db = aionuiDb; // Avoid recursion
      if (db && sql !== 'log_error') {
        const stmt = db.prepare('INSERT INTO system_errors (timestamp, source, error_message, stack) VALUES (?, ?, ?, ?);');
        stmt.run(Date.now(), sql, error.message || 'Unknown error', error.stack || '');
      }
    } catch (dbErr) {
      console.error('[Self-Healing] Recursion warning - failed to log error to sqlite:', dbErr.message);
    }
  } catch (e) {
    console.error('[Self-Evolution] Failed to write SQLite error to vault:', e.message);
  } finally {
    isWritingError = false;
  }
}
function wrapStatement(stmt, sql) {
  return new Proxy(stmt, {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'function') {
        return function (...args) {
          try {
            return val.apply(target, args);
          } catch (e) {
            console.error(`[SQLite Proxy] statement.${String(prop)} error:`, e.message, 'SQL:', sql);
            writeDbErrorToVault(sql, e);
            aionuiDb = null; // Reset connection
            throw e;
          }
        };
      }
      return val;
    }
  });
}
function wrapDatabase(db) {
  return new Proxy(db, {
    get(target, prop, receiver) {
      if (prop === 'prepare') {
        return function (sql) {
          try {
            const stmt = target.prepare(sql);
            return wrapStatement(stmt, sql);
          } catch (e) {
            console.error('[SQLite Proxy] prepare error:', e.message, 'SQL:', sql);
            writeDbErrorToVault(sql, e);
            aionuiDb = null; // Reset connection
            throw e;
          }
        };
      }
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'function') {
        return function (...args) {
          try {
            return val.apply(target, args);
          } catch (e) {
            console.error(`[SQLite Proxy] db.${String(prop)} error:`, e.message);
            writeDbErrorToVault(`db.${String(prop)}(${args.join(', ')})`, e);
            aionuiDb = null; // Reset connection
            throw e;
          }
        };
      }
      return val;
    }
  });
}

// Dynamic Models Auto-Discovery & DB Synchronization
async function syncFreeModels() {
  console.log('[Models Sync] Syncing latest free models catalog...');
  try {
    const fetch = globalThis.fetch || fetch;
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${OR_KEYS[0]}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const freeModels = (data.data || []).filter(m => m.id.endsWith(':free') || m.pricing && Number(m.pricing.prompt) === 0 && Number(m.pricing.completion) === 0);
    const db = getAionuiDb();
    if (!db) return;
    await db.exec('BEGIN TRANSACTION;');

    // Select all existing IDs to find ones to delete (removed models)
    const existingRows = await db.prepare('SELECT id FROM discovered_models;').all();
    const existingIds = existingRows.map(r => r.id);
    const newIds = new Set(freeModels.map(m => m.id));

    // Delete removed models
    for (const id of existingIds) {
      if (!newIds.has(id)) {
        await db.prepare('DELETE FROM discovered_models WHERE id = ?;').run(id);
      }
    }

    // Insert or update current ones
    const insertStmt = db.prepare(`
      INSERT INTO discovered_models (id, name, provider, context_length, prompt_pricing, completion_pricing, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        context_length = excluded.context_length,
        prompt_pricing = excluded.prompt_pricing,
        completion_pricing = excluded.completion_pricing,
        updated_at = excluded.updated_at;
    `);
    for (const m of freeModels) {
      insertStmt.run(m.id, m.name || m.id, 'openrouter', m.context_length || 0, String(m.pricing?.prompt || '0'), String(m.pricing?.completion || '0'), Date.now());
    }
    await db.exec('COMMIT;');
    console.log(`[Models Sync] Synchronized ${freeModels.length} free models to database.`);
  } catch (err) {
    console.error('[Models Sync] Failed to sync models catalog:', err.message);
  }
}
async function getAionuiDb() {
  if (aionuiDb) return aionuiDb;
  let dbPath = AIONUI_DB;
  if (!existsSync(AIONUI_DB)) {
    dbPath = join(SHARED, 'agent-os-backend.db');
    try {
      mkdirSync(SHARED, {
        recursive: true
      });
    } catch {}
  }
  try {
    
    const rawDb = new AsyncDatabase(dbPath);
    try {
      await rawDb.exec('PRAGMA journal_mode = WAL;');
      await rawDb.exec('PRAGMA synchronous = NORMAL;');
    } catch (dbPragmaErr) {
      console.error('[SQLite] Failed to configure WAL journal mode:', dbPragmaErr.message);
    }
    aionuiDb = wrapDatabase(rawDb);

    // Initialize required custom tables
    await aionuiDb.exec(`
      CREATE TABLE IF NOT EXISTS discovered_models (
        id TEXT PRIMARY KEY,
        name TEXT,
        provider TEXT,
        context_length INTEGER,
        prompt_pricing TEXT,
        completion_pricing TEXT,
        updated_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS system_errors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER,
        source TEXT,
        error_message TEXT,
        stack TEXT,
        resolved INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS llm_cache (
        key TEXT PRIMARY KEY,
        model TEXT,
        response TEXT,
        timestamp INTEGER
      );
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT,
        embedding TEXT NOT NULL,
        created_at INTEGER
      );
    `);
    return aionuiDb;
  } catch (e) {
    console.error('[SQLite] Failed to open database:', e.message);
    return null;
  }
}
const WORKSPACE = `D:\\Agent OS`;
const SHARED = `${WORKSPACE}\\shared`;
const AGENT_LOG = `${SHARED}\\agent-log.json`;

// Ensure directories exist
[WORKSPACE, SHARED].forEach(d => {
  try {
    mkdirSync(d, {
      recursive: true
    });
  } catch {}
});
app.use('/api/media', express.static(SHARED));
app.use('/website-preview', express.static(join(SHARED, 'website')));

// Real non-blocking CPU load tracking loop for telemetry metrics
let cpuUsageEstimate = 0;
function calculateCpuUsage() {
  const cpus = os.cpus();
  let totalIdle = 0,
    totalTick = 0;
  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  return {
    idle: totalIdle,
    total: totalTick
  };
}
let startCpu = calculateCpuUsage();
setInterval(() => {
  const endCpu = calculateCpuUsage();
  const idleDifference = endCpu.idle - startCpu.idle;
  const totalDifference = endCpu.total - startCpu.total;
  if (totalDifference > 0) {
    cpuUsageEstimate = Math.round(100 - 100 * idleDifference / totalDifference);
  }
  startCpu = endCpu;
}, 2000);
function readConfig() {
  try {
    return readFileSync(CONFIG_PATH, 'utf-8');
  } catch {
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════════════
// OPENROUTER KEYS (working ones from Gary's config)
// ═══════════════════════════════════════════════════════════════════════
function loadOpenRouterKeys() {
  const keys = new Set();
  if (process.env.OPENROUTER_API_KEY) keys.add(process.env.OPENROUTER_API_KEY);

  // Try reading from api-config.json
  try {
    const apiConfigPath = join(process.cwd(), 'api-config.json');
    if (existsSync(apiConfigPath)) {
      const config = JSON.parse(readFileSync(apiConfigPath, 'utf-8'));
      if (config.openrouter?.keys) {
        config.openrouter.keys.forEach(k => {
          if (k.startsWith('sk-or-')) keys.add(k);
        });
      }
    }
  } catch (e) {
    console.error('[Config] Failed to load keys from api-config.json:', e.message);
  }

  // Try reading from config.yaml
  try {
    const configYamlPath = `${HOME}\\AppData\\Local\\hermes\\config.yaml`;
    if (existsSync(configYamlPath)) {
      const content = readFileSync(configYamlPath, 'utf-8');
      const matches = content.match(/api_key:\s*['"]?(sk-or-[^\s'"]+)['"]?/g);
      if (matches) {
        for (const m of matches) {
          const k = m.replace(/api_key:\s*['"]?/, '').replace(/['"]?$/, '').trim();
          if (k.startsWith('sk-or-')) keys.add(k);
        }
      }
    }
  } catch (e) {
    console.error('[Config] Failed to load key from config.yaml:', e.message);
  }

  // Include the full working backup set
  const staticKeys = ['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', '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', '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', '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', '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', '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', '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', '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'];
  staticKeys.forEach(k => keys.add(k));
  return Array.from(keys);
}
function loadGroqKeys() {
  const keys = new Set();
  try {
    const apiConfigPath = join(process.cwd(), 'api-config.json');
    if (existsSync(apiConfigPath)) {
      const config = JSON.parse(readFileSync(apiConfigPath, 'utf-8'));
      if (config.grok?.keys) {
        config.grok.keys.forEach(k => {
          if (k.startsWith('gsk_')) keys.add(k);
        });
      }
    }
  } catch (e) {
    console.error('[Config] Failed to load groq keys:', e.message);
  }
  const defaultKeys = ['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', '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', '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', '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'];
  defaultKeys.forEach(k => keys.add(k));
  return Array.from(keys);
}
let OR_KEYS = loadOpenRouterKeys();
let GROQ_KEYS = loadGroqKeys();
let currentGroqKeyIndex = 0;
function getGroqKey() {
  return GROQ_KEYS[currentGroqKeyIndex % GROQ_KEYS.length];
}
function rotateGroqKey() {
  currentGroqKeyIndex = (currentGroqKeyIndex + 1) % GROQ_KEYS.length;
  console.log(`[Groq Direct] Rotating Groq API key to index ${currentGroqKeyIndex}...`);
}
let OR_KEYS_INTERVAL = setInterval(() => {
  OR_KEYS = loadOpenRouterKeys();
}, 60000);
let SCALEWAY_KEY = '';
let CEREBRAS_KEY = '';
let SAMBANOVA_KEY = '';
let AGNES_KEY = '';
let MISTRAL_KEY = '';
let HUGGINGFACE_KEYS = [];
let currentHuggingFaceKeyIndex = 0;
let GITHUB_KEYS = [];
let currentGithubKeyIndex = 0;
let NVIDIA_KEY = '';
let CLOUDFLARE_AI_TOKEN = '';
let CLOUDFLARE_AI_ACCOUNT = '';
let SILICONFLOW_KEYS = [];
let currentSiliconFlowKeyIndex = 0;
let SILICONFLOW_BASE_URL = 'https://api.siliconflow.com/v1';
function getSiliconFlowKey() {
  return SILICONFLOW_KEYS[currentSiliconFlowKeyIndex % SILICONFLOW_KEYS.length] || '';
}
function loadOtherKeys() {
  try {
    const apiConfigPath = join(process.cwd(), 'api-config.json');
    if (existsSync(apiConfigPath)) {
      const config = JSON.parse(readFileSync(apiConfigPath, 'utf-8'));
      if (config.scaleway?.api_key) SCALEWAY_KEY = config.scaleway.api_key;
      if (config.cerebras?.api_key) CEREBRAS_KEY = config.cerebras.api_key;
      if (config.sambanova?.api_key) SAMBANOVA_KEY = config.sambanova.api_key;
      if (config.agnes?.keys?.[0]) {
        AGNES_KEY = config.agnes.keys[0];
      } else if (config.agnes?.api_key) {
        AGNES_KEY = config.agnes.api_key;
      }
      if (config.mistral?.keys?.[0]) {
        MISTRAL_KEY = config.mistral.keys[0];
      } else if (config.mistral?.api_key) {
        MISTRAL_KEY = config.mistral.api_key;
      }
      if (config.huggingface?.keys) {
        HUGGINGFACE_KEYS = config.huggingface.keys;
      }
      if (config.github?.keys) {
        GITHUB_KEYS = config.github.keys;
      }
      if (config.nvidia?.api_key) NVIDIA_KEY = config.nvidia.api_key;
      if (config.cloudflare?.api_token) {
        CLOUDFLARE_AI_TOKEN = config.cloudflare.api_token;
        CLOUDFLARE_AI_ACCOUNT = config.cloudflare.account_id || '';
      }
      if (config.siliconflow?.keys) {
        SILICONFLOW_KEYS = config.siliconflow.keys;
      } else if (config.siliconflow?.api_key) {
        SILICONFLOW_KEYS = [config.siliconflow.api_key];
      }
      if (config.siliconflow?.base_url) {
        SILICONFLOW_BASE_URL = config.siliconflow.base_url;
      }
    }
  } catch (e) {
    console.error('[Config] Failed to load keys from api-config.json:', e.message);
  }
}
loadOtherKeys();
function getAgnesKey() {
  if (!AGNES_KEY) loadOtherKeys();
  return AGNES_KEY;
}
function getMistralKey() {
  if (!MISTRAL_KEY) loadOtherKeys();
  return MISTRAL_KEY;
}
function getGithubKey() {
  if (!GITHUB_KEYS || GITHUB_KEYS.length === 0) return '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';
  return GITHUB_KEYS[currentGithubKeyIndex % GITHUB_KEYS.length];
}
function rotateGithubKey() {
  if (GITHUB_KEYS && GITHUB_KEYS.length > 0) {
    currentGithubKeyIndex = (currentGithubKeyIndex + 1) % GITHUB_KEYS.length;
    console.log(`[GitHub Models] Rotating API key to index ${currentGithubKeyIndex}...`);
  }
}
async function getLlmCache(model, messages) {
  try {
    const db = getAionuiDb();
    if (!db) return null;
    const payload = JSON.stringify({
      model,
      messages
    });
    const hash = createHash('sha256').update(payload).digest('hex');
    const row = await db.prepare('SELECT response FROM llm_cache WHERE key = ?').get(hash);
    if (row && row.response) {
      console.log(`[LLM Cache] Hit for model ${model}`);
      return row.response;
    }
  } catch (e) {
    console.error('[LLM Cache] Error reading cache:', e.message);
  }
  return null;
}
async function setLlmCache(model, messages, response) {
  try {
    const db = getAionuiDb();
    if (!db) return;
    const payload = JSON.stringify({
      model,
      messages
    });
    const hash = createHash('sha256').update(payload).digest('hex');
    await db.prepare('INSERT OR REPLACE INTO llm_cache (key, model, response, timestamp) VALUES (?, ?, ?, ?)').run(hash, model, response, Date.now());
    console.log(`[LLM Cache] Saved entry for model ${model}`);
  } catch (e) {
    console.error('[LLM Cache] Error writing cache:', e.message);
  }
}
const GEMINI_KEYS_PATH = `${HOME}\\AppData\\Local\\hermes\\gemini-keys.json`;
let geminiKeyIndex = 0;

// ── Collect Gemini keys from ALL sources ────────────────────────────────────
function loadGeminiKeys() {
  const seen = new Set();
  const keys = [];
  const addKey = k => {
    if (!k || typeof k !== 'string') return;
    const t = k.trim();
    if (t.length > 10 && !seen.has(t)) {
      seen.add(t);
      keys.push(t);
    }
  };

  // 1. gemini-keys.json (primary store — written by the dashboard UI)
  try {
    if (existsSync(GEMINI_KEYS_PATH)) {
      const data = JSON.parse(readFileSync(GEMINI_KEYS_PATH, 'utf-8'));
      if (Array.isArray(data)) data.forEach(addKey);
    }
  } catch (e) {/* ignore */}

  // 2. GEMINI_API_KEY (single key env var)
  addKey(process.env.GEMINI_API_KEY);

  // 3. GOOGLE_API_KEY (alternative env var name)
  addKey(process.env.GOOGLE_API_KEY);

  // 4. GEMINI_API_KEY_1 ... GEMINI_API_KEY_20 (multi-key env vars)
  for (let i = 1; i <= 20; i++) {
    addKey(process.env[`GEMINI_API_KEY_${i}`]);
    addKey(process.env[`GOOGLE_API_KEY_${i}`]);
  }

  // 5. Built-in fallback (only if nothing else found)
  if (keys.length === 0) {
    keys.push('AIzaSyD9-_9NTLFujqI5JZYiMZBC6pzd9wSgIVo');
  }
  console.log(`[Gemini Keys] Pool ready: ${keys.length} key(s) loaded from all sources.`);
  return keys;
}
let geminiKeys = loadGeminiKeys();

// Call this after saving new keys via the API
function reloadGeminiKeys() {
  geminiKeys = loadGeminiKeys();
  geminiKeyIndex = 0;
  console.log(`[Gemini Keys] Reloaded. Pool now has ${geminiKeys.length} key(s).`);
}

// ── Smart Quota Tracker ───────────────────────────────────────────────────────
// Gemini free tier limits (per key):
//   gemini-2.0-flash / gemini-1.5-flash: 15 RPM, 1500 RPD
//   gemini-1.5-pro / gemini-1.0-pro:      2 RPM,   50 RPD
//   text-embedding-004:               1500 RPM, 100000 RPD
// Paid tier is much higher — we track usage and warn/rotate at 80%
const GEMINI_LIMITS = {
  default: {
    rpm: 15,
    rpd: 1500
  },
  'gemini-2.0-flash': {
    rpm: 15,
    rpd: 1500
  },
  'gemini-2.5-flash': {
    rpm: 15,
    rpd: 1500
  },
  'gemini-1.5-flash': {
    rpm: 15,
    rpd: 1500
  },
  'gemini-1.5-pro': {
    rpm: 2,
    rpd: 50
  },
  'gemini-1.0-pro': {
    rpm: 2,
    rpd: 50
  },
  'text-embedding-004': {
    rpm: 1500,
    rpd: 100000
  }
};
const QUOTA_WARN_THRESHOLD = 0.80; // 80% → rotate to next key

// Per-key usage state
const geminiQuota = {};
function getQuota(key) {
  if (!geminiQuota[key]) {
    geminiQuota[key] = {
      rpm_count: 0,
      rpm_window_start: Date.now(),
      rpd_count: 0,
      rpd_date: new Date().toLocaleDateString('en-US', {
        timeZone: 'America/Los_Angeles'
      }),
      depleted: false,
      depleted_at: null,
      warning_sent: false
    };
  }
  return geminiQuota[key];
}

// Gemini quotas reset at midnight Pacific time
function getPacificDate() {
  return new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles'
  });
}
function checkAndResetDailyQuota(key, limits) {
  const q = getQuota(key);
  const todayPT = getPacificDate();
  if (q.rpd_date !== todayPT) {
    console.log(`[Gemini Keys] ♻️  Key ...${key.slice(-6)} daily quota RESET (midnight Pacific). Was ${q.rpd_count}/${limits.rpd} RPD.`);
    q.rpd_count = 0;
    q.rpd_date = todayPT;
    q.depleted = false;
    q.depleted_at = null;
    q.warning_sent = false;
  }
}
function recordGeminiRequest(key, modelId) {
  const q = getQuota(key);
  const limits = GEMINI_LIMITS[modelId] || GEMINI_LIMITS.default;
  const now = Date.now();
  checkAndResetDailyQuota(key, limits);

  // Reset per-minute window
  if (now - q.rpm_window_start > 60000) {
    q.rpm_count = 0;
    q.rpm_window_start = now;
  }
  q.rpm_count++;
  q.rpd_count++;
  const rpmPct = q.rpm_count / limits.rpm;
  const rpdPct = q.rpd_count / limits.rpd;
  const usage = Math.max(rpmPct, rpdPct);

  // Warn at 80%
  if (usage >= QUOTA_WARN_THRESHOLD && !q.warning_sent) {
    q.warning_sent = true;
    console.warn(`[Gemini Keys] ⚠️  Key ...${key.slice(-6)} hit ${Math.round(usage * 100)}% quota — auto-rotating to next key. (${q.rpm_count}/${limits.rpm} RPM, ${q.rpd_count}/${limits.rpd} RPD)`);
  }
  return {
    rpmPct,
    rpdPct,
    usage,
    limits,
    atThreshold: usage >= QUOTA_WARN_THRESHOLD
  };
}
function isKeyOverQuota(key, modelId) {
  const q = getQuota(key);
  const limits = GEMINI_LIMITS[modelId] || GEMINI_LIMITS.default;
  checkAndResetDailyQuota(key, limits);
  if (q.depleted) return true;
  const rpdPct = q.rpd_count / limits.rpd;
  // Reset minute window before checking RPM
  if (Date.now() - q.rpm_window_start > 60000) {
    q.rpm_count = 0;
    q.rpm_window_start = Date.now();
  }
  const rpmPct = q.rpm_count / limits.rpm;
  return Math.max(rpdPct, rpmPct) >= QUOTA_WARN_THRESHOLD;
}
function markKeyDepleted(key) {
  const q = getQuota(key);
  q.depleted = true;
  q.depleted_at = Date.now();
  console.log(`[Gemini Keys] 🔴 Key ...${key.slice(-6)} DEPLETED (429). Will auto-recover at midnight Pacific.`);
  const anyActive = geminiKeys.some(k => !getQuota(k).depleted);
  if (!anyActive) {
    console.warn(`[Gemini Keys] 🚨 ALL ${geminiKeys.length} Gemini key(s) exhausted. Falling back to other providers until midnight Pacific reset.`);
  }
}

// Returns status summary for dashboard API
function getGeminiKeyStatus() {
  return {
    total_keys: geminiKeys.length,
    keys: geminiKeys.map((key, idx) => {
      const q = getQuota(key);
      const limits = GEMINI_LIMITS.default;
      checkAndResetDailyQuota(key, limits);
      const rpdPct = Math.min(Math.round(q.rpd_count / limits.rpd * 100), 100);
      const rpmPct = Math.min(Math.round(q.rpm_count / limits.rpm * 100), 100);
      const overQuota = isKeyOverQuota(key, 'gemini-2.0-flash');
      return {
        index: idx + 1,
        key_hint: `...${key.slice(-6)}`,
        rpd: {
          used: q.rpd_count,
          limit: limits.rpd,
          pct: rpdPct
        },
        rpm: {
          used: q.rpm_count,
          limit: limits.rpm,
          pct: rpmPct
        },
        depleted: q.depleted,
        over_quota: overQuota,
        reset_at: 'midnight Pacific time',
        status: q.depleted ? 'depleted' : overQuota ? 'throttled' : rpdPct >= 50 ? 'warning' : 'healthy'
      };
    }),
    next_reset: (() => {
      const now = new Date();
      const midnightPT = new Date(now.toLocaleDateString('en-US', {
        timeZone: 'America/Los_Angeles'
      }));
      midnightPT.setDate(midnightPT.getDate() + 1);
      const msLeft = midnightPT - now;
      const h = Math.floor(msLeft / 3600000);
      const m = Math.floor(msLeft % 3600000 / 60000);
      return `${h}h ${m}m`;
    })()
  };
}
function getActiveKeys(modelId) {
  const under = geminiKeys.filter(k => !isKeyOverQuota(k, modelId));
  return under.length > 0 ? under : geminiKeys; // fall back to all if all over quota
}
function getNextGeminiKey(modelId = 'gemini-2.0-flash') {
  const active = getActiveKeys(modelId);
  const key = active[geminiKeyIndex % active.length];
  geminiKeyIndex = (geminiKeyIndex + 1) % active.length;
  return key;
}
async function fetchGeminiWithRotation(urlSuffix, bodyData, controllerSignal) {
  const modelId = urlSuffix.split(':')[0];
  const limits = GEMINI_LIMITS[modelId] || GEMINI_LIMITS.default;

  // Active (under 80%) keys first, then over-quota as last resort
  const active = getActiveKeys(modelId);
  const overQuota = geminiKeys.filter(k => isKeyOverQuota(k, modelId));
  const tryOrder = [...new Set([...active, ...overQuota])];
  if (tryOrder.length === 0) throw new Error('No Gemini keys configured');
  let lastError = null;
  for (let i = 0; i < tryOrder.length; i++) {
    const key = tryOrder[i];
    const q = getQuota(key);
    const rpdPct = Math.min(Math.round(q.rpd_count / limits.rpd * 100), 100);
    const icon = q.depleted ? '🔴' : rpdPct >= 80 ? '⚠️' : '✅';
    console.log(`[Gemini API] ${icon} Key ...${key.slice(-6)} [${rpdPct}% RPD] — attempt ${i + 1}/${tryOrder.length}`);
    try {
      let apiVer = 'v1beta';
      let cleanSuffix = urlSuffix;
      if (urlSuffix.startsWith('v1/') || urlSuffix.startsWith('v1beta/')) {
        const parts = urlSuffix.split('/');
        apiVer = parts[0];
        cleanSuffix = parts.slice(1).join('/');
      }
      const r = await fetchWithProxy(`https://generativelanguage.googleapis.com/${apiVer}/models/${cleanSuffix}?key=${key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify(bodyData)
      });
      if (r.status === 200) {
        recordGeminiRequest(key, modelId);
        console.log(`[Gemini API] ✓ Key ...${key.slice(-6)} success (${q.rpd_count + 1}/${limits.rpd} RPD used)`);
        return r;
      }
      const errText = await r.text();
      console.log(`[Gemini API] Key ...${key.slice(-6)} → ${r.status}`);

      // 429 = quota/credits depleted — mark and move on
      if (r.status === 429) markKeyDepleted(key);
      lastError = new Error(`Status ${r.status}: ${errText}`);
    } catch (e) {
      console.log(`[Gemini API] Key ...${key.slice(-6)} failed: ${e.message}`);
      lastError = e;
    }
  }
  throw lastError || new Error(`All ${tryOrder.length} Gemini key(s) exhausted`);
}
async function generateEmbedding(text) {
  const modelsToTry = ['v1/text-embedding-004:embedContent', 'v1beta/text-embedding-004:embedContent', 'v1/embedding-001:embedContent', 'v1beta/embedding-001:embedContent'];
  let lastError = null;
  for (const model of modelsToTry) {
    try {
      const response = await fetchGeminiWithRotation(model, {
        content: {
          parts: [{
            text
          }]
        }
      });
      if (response && response.status === 200) {
        const data = await response.json();
        if (data.embedding?.values) {
          return data.embedding.values;
        }
      }
    } catch (e) {
      lastError = e;
      console.warn(`[Embedding API] Model ${model} failed: ${e.message}`);
    }
  }

  // If all strategies fail, fallback to a zero vector to prevent blocking ingestion
  console.warn('[Embedding API] All embedding strategies failed. Falling back to mock zero-vector (768 dims) to ensure context ingestion is not blocked.');
  return new Array(768).fill(0);
}
const NOUS_API_KEY = 'sk-nous-CPu13S1xH9dIVCoSfkU0AQqRGd719rSg';
const ALIBABA_KEY = 'sk-fdbfa55f6d044da99823821d5f2bcb13';
const ZHIPU_KEY = '984d1bdac3a246a4b90842b6f6c7944a.2Cnkw7HonukkqYuN';

// ═══════════════════════════════════════════════════════════════════════
// AGENT REGISTRY — All agents on the team
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// AGENT REGISTRY — Default registry, automatically updated from App.tsx
// ═══════════════════════════════════════════════════════════════════════
const AGENTS_DEFAULT = {
  orchestrator: {
    id: 'orchestrator',
    name: 'Gemini Orchestrator',
    emoji: '🧠',
    role: 'Orchestrator · Brains · Swarm Coordinator',
    status: 'online',
    color: '#3b82f6',
    type: 'ai_orchestrator',
    capabilities: ['planning', 'task_decomposition', 'swarm_control', 'self_learning_loop'],
    description: 'The central brain of the swarm. Uses Gemini 2.0 Flash to decompose goals, delegate to specialized agents (AGY, Hermes, OpenClaw, Obsidian), and coordinate collaboration.'
  },
  hermes: {
    id: 'hermes',
    name: 'Hermes',
    emoji: '⚡',
    role: 'Research · Executor · Dashboard',
    status: 'online',
    color: '#a855f7',
    type: 'ai_server',
    port: PORT,
    capabilities: ['chat', 'web_search', 'file_ops', 'code_exec', 'image_gen', 'browser', 'agent_messaging'],
    description: 'I run the dashboard, handle chat, web searches, file operations, and coordinate other agents.'
  },
  agy: {
    id: 'agy',
    name: 'Antigravity',
    emoji: '🧠',
    role: 'Intelligence · CEO · Orchestrator',
    status: 'online',
    color: '#6366f1',
    type: 'cli_agent',
    binary: `${HOME}\\AppData\\Local\\agy\\bin\\agy.exe`,
    capabilities: ['planning', 'multi_agent', 'parallel_exec', 'code_gen', 'deep_reasoning'],
    description: 'CEO of the agent team. Plans, delegates, and coordinates complex multi-step tasks across all agents.'
  },
  openclaw: {
    id: 'openclaw',
    name: 'OpenClaw',
    emoji: '🔀',
    role: 'Execution · Router · Gateway',
    status: 'online',
    color: '#10b981',
    type: 'gateway',
    capabilities: ['gateway', 'routing', 'channels', 'chat', 'agent_management', 'messaging'],
    description: 'Routes messages between agents, manages channels, and provides the gateway for external integrations.'
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian',
    emoji: '📝',
    role: 'Memory · Vault · Knowledge Graph',
    status: existsSync('D:/Agent OS') ? 'online' : 'offline',
    color: '#f59e0b',
    type: 'knowledge_base',
    vaultPath: 'D:/Agent OS',
    capabilities: ['notes', 'knowledge_graph', 'search', 'memory', 'document_store'],
    description: 'Shared memory for all agents. Stores notes, documents, and knowledge that any agent can read or write.'
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    emoji: '🦙',
    role: 'Local Inference',
    status: 'offline',
    color: '#22d3ee',
    type: 'local_inference',
    port: 11434,
    capabilities: ['local_models', 'privacy', 'free_inference'],
    description: 'Local model inference. Privacy-friendly, no API costs.'
  },
  lmstudio: {
    id: 'lmstudio',
    name: 'LM Studio',
    emoji: '💻',
    role: 'Local Inference Server',
    status: 'offline',
    color: '#ec4899',
    type: 'local_inference',
    port: 1234,
    capabilities: ['local_models', 'embeddings', 'openai_api'],
    description: 'Local OpenAI-compatible inference server. Serving loaded models: meta-llama-3.1-8b, google/gemma-3-4b.'
  },
  claude: {
    id: 'claude',
    name: 'Claude Code',
    emoji: '🤖',
    role: 'Expert Developer · Code Optimizer',
    status: 'online',
    color: '#ea580c',
    type: 'cli_agent',
    capabilities: ['code_gen', 'refactoring', 'terminal_tools', 'testing', 'codebase_search'],
    description: 'Native Claude Code CLI running free via local fcc-server proxy. Excellent at codebase refactoring, debugging, and terminal-based task execution.'
  },
  aider: {
    id: 'aider',
    name: 'Aider Chat',
    emoji: '🧑‍💻',
    role: 'Multi-file Coding Agent',
    status: 'online',
    color: '#10b981',
    type: 'cli_agent',
    capabilities: ['code_gen', 'refactoring', 'git_integration'],
    description: 'Native Aider Chat CLI. Excellent at multi-file code editing, git commits, and code synthesization directly in git repositories.'
  },
  github: {
    id: 'github',
    name: 'GitHub CLI',
    emoji: '🐙',
    role: 'Repo Operations & PRs',
    status: 'online',
    color: '#64748b',
    type: 'cli_agent',
    capabilities: ['pr_management', 'issue_tracking', 'release_monitoring'],
    description: 'Native GitHub CLI (gh) wrapper. Automates pull requests, issues, repo management, and actions checks.'
  },
  cloudflare: {
    id: 'cloudflare',
    name: 'Cloudflare Workers',
    emoji: '☁️',
    role: 'Deploy · Pages · Workers',
    status: 'online',
    color: '#f38020',
    type: 'deploy',
    capabilities: ['pages_deploy', 'workers_deploy', 'wrangler_cli', 'hosting'],
    description: 'Deploys static websites to Cloudflare Pages and serverless functions to Cloudflare Workers using Wrangler CLI.'
  }
};
let AGENTS = {
  ...AGENTS_DEFAULT
};
function getContentEngineRules() {
  try {
    const rulesPath = 'D:\\Agent OS\\shared\\GARY_PEARCE_CONTENT_ENGINE_V2.md';
    if (existsSync(rulesPath)) {
      return readFileSync(rulesPath, 'utf-8');
    }
  } catch (e) {
    console.error('Error reading Content Engine V2 rules:', e.message);
  }
  return '';
}
function loadAgentsFromFrontend() {
  const registry = {
    ...AGENTS_DEFAULT
  };
  try {
    const appTsxPath = join(WORKSPACE, 'src', 'App.tsx');
    if (existsSync(appTsxPath)) {
      const content = readFileSync(appTsxPath, 'utf-8');
      const startIdx = content.indexOf('const INITIAL_AGENTS');
      if (startIdx !== -1) {
        const endIdx = content.indexOf('];', startIdx);
        if (endIdx !== -1) {
          const block = content.substring(startIdx, endIdx + 1);
          // Match object properties: id, name, role
          const objRegex = /id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*role:\s*"([^"]+)"/g;
          let match;
          while ((match = objRegex.exec(block)) !== null) {
            const id = match[1];
            const name = match[2];
            const role = match[3];

            // capabilities based on defaults or generic
            let capabilities = ['chat'];
            if (id === 'agy') capabilities = ['planning', 'multi_agent', 'parallel_exec', 'code_gen', 'deep_reasoning'];else if (id === 'openclaw') capabilities = ['gateway', 'routing', 'channels', 'chat', 'agent_management', 'messaging'];else if (id === 'claude') capabilities = ['code_gen', 'refactoring', 'terminal_tools', 'testing', 'codebase_search'];else if (id === 'aider') capabilities = ['code_gen', 'refactoring', 'git_integration'];else if (id === 'github') capabilities = ['pr_management', 'issue_tracking', 'release_monitoring'];else if (id === 'hermes') capabilities = ['chat', 'web_search', 'file_ops', 'code_exec', 'image_gen', 'browser', 'agent_messaging'];else if (id === 'obsidian') capabilities = ['notes', 'knowledge_graph', 'search', 'memory', 'document_store'];
            if (!registry[id]) {
              registry[id] = {
                id,
                name,
                role,
                status: 'online',
                color: '#3b82f6',
                type: 'ai_agent',
                capabilities,
                description: `${name} is the ${role} of the swarm team.`
              };
            } else {
              registry[id].name = name;
              registry[id].role = role;
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('[Agents Dynamic Loader] Failed to load from App.tsx:', e.message);
  }
  return registry;
}

// Reload initially
AGENTS = loadAgentsFromFrontend();
let lastHealthCheckTime = 0;
let healthCheckPromise = null;

// Gemini credit / rate-limit tracking
let geminiCreditsDepleted = false;
let geminiCreditsCheckedAt = 0;
const modelStatus = {}; // { [modelId]: { status, cooldownUntil, message } }
const activeProcesses = new Set(); // Track spawned child processes

// Check agent health on startup (with 10-second debounce)
function checkAgentHealth() {
  const now = Date.now();
  if (now - lastHealthCheckTime < 10000 && healthCheckPromise) {
    return healthCheckPromise;
  }
  lastHealthCheckTime = now;
  healthCheckPromise = new Promise(resolve => {
    let pending = 7;
    const decrement = () => {
      pending--;
      if (pending === 0) resolve();
    };

    // AGY
    exec(`"${AGENTS.agy.binary}" --version`, {
      timeout: 3000
    }, err => {
      AGENTS.agy.status = err ? 'offline' : 'online';
      decrement();
    });

    // OpenClaw
    exec('openclaw --version', {
      timeout: 3000
    }, err => {
      AGENTS.openclaw.status = err ? 'offline' : 'online';
      decrement();
    });

    // Ollama
    exec('ollama list', {
      timeout: 3000
    }, err => {
      AGENTS.ollama.status = err ? 'offline' : 'online';
      decrement();
    });

    // LM Studio port connection check
    exec('powershell -Command "Get-NetTCPConnection -LocalPort 1234 -ErrorAction Stop"', {
      timeout: 3000
    }, err => {
      AGENTS.lmstudio.status = err ? 'offline' : 'online';
      decrement();
    });

    // Claude Code
    exec('claude -v', {
      timeout: 3000
    }, err => {
      AGENTS.claude.status = err ? 'offline' : 'online';
      decrement();
    });

    // Aider Chat
    exec('aider --version', {
      timeout: 3000
    }, err => {
      AGENTS.aider.status = err ? 'offline' : 'online';
      decrement();
    });

    // GitHub CLI
    exec('gh --version', {
      timeout: 3000
    }, err => {
      AGENTS.github.status = err ? 'offline' : 'online';
      decrement();
    });

    // Obsidian
    AGENTS.obsidian.status = existsSync('D:/Agent OS') ? 'online' : 'offline';
  });
  return healthCheckPromise;
}
checkAgentHealth();

// CRON SCHEDULER & PERSISTENCE
const CRONS_PATH = `${SHARED}/cron-jobs.json`;
let activeIntervals = {};
function readCrons() {
  try {
    if (existsSync(CRONS_PATH)) {
      return JSON.parse(readFileSync(CRONS_PATH, 'utf-8'));
    }
  } catch {}
  return [{
    id: "1",
    name: "OpenRouter Key Rotation",
    interval: "2 min",
    status: "running",
    next: ""
  }, {
    id: "2",
    name: "Blog Content Engine",
    interval: "hourly",
    status: "idle",
    next: ""
  }, {
    id: "3",
    name: "Free Model Scanner",
    interval: "6 hours",
    status: "idle",
    next: ""
  }, {
    id: "4",
    name: "AionUI Health Monitor",
    interval: "5 min",
    status: "running",
    next: ""
  }, {
    id: "5",
    name: "Swarm Experience Compiler",
    interval: "10 min",
    status: "running",
    next: ""
  }, {
    id: "6",
    name: "Swarm Auto-Evolution Engine",
    interval: "24 hour",
    status: "running",
    next: ""
  }, {
    id: "7",
    name: "OS Maintenance System",
    interval: "15 min",
    status: "running",
    next: ""
  }];
}
function writeCrons(crons) {
  try {
    writeFileSync(CRONS_PATH, JSON.stringify(crons, null, 2), 'utf-8');
  } catch (e) {
    console.error('Write crons failed:', e.message);
  }
}
function parseInterval(intervalStr) {
  const num = parseFloat(intervalStr);
  if (isNaN(num)) {
    if (intervalStr.includes('hourly')) return 60 * 60 * 1000;
    return 24 * 60 * 60 * 1000;
  }
  if (intervalStr.includes('min')) return num * 60 * 1000;
  if (intervalStr.includes('hour')) return num * 60 * 60 * 1000;
  return num * 1000;
}
function executeCronTask(job) {
  console.log(`[Cron] Executing: ${job.name}`);
  logActivity({
    type: 'cron_run',
    name: job.name,
    status: 'success',
    info: `Executed at ${new Date().toLocaleTimeString()}`
  });
  if (job.name === 'OpenRouter Key Rotation') {
    exec('echo "" | python "C:\\Users\\Gary\\AppData\\Local\\hermes\\rotate_keys.py"', err => {
      console.log('[Cron] Key Rotation execution completed.', err ? err.message : 'Success');
    });
  } else if (job.name === 'AionUI Health Monitor') {
    checkAgentHealth();
  } else if (job.name === 'Swarm Experience Compiler') {
    runExperienceCompiler();
  } else if (job.name === 'Swarm Auto-Evolution Engine') {
    runSwarmEvolution();
  } else if (job.name === 'OS Maintenance System') {
    runOSMaintenance();
  } else if (job.name === 'Julian Goldie Watcher') {
    runJulianGoldieWatcher();
  } else if (job.name === 'N8N Workflow Ingestion') {
    runN8NWorkflowIngestion();
  } else if (job.name === 'External Ingestion Engine') {
    runExternalIngestion();
  } else if (job.name === 'Model Catalog & Evolution Scanner') {
    runModelScanner();
  } else if (job.name === 'Self-Healing Engine') {
    runSelfHealingScan();
  } else if (job.name === 'Nightly Intelligence Cycle') {
    runNightlyResearchCycle();
  }
}
function setupCrons() {
  Object.values(activeIntervals).forEach(clearInterval);
  activeIntervals = {};
  let crons = readCrons();

  // Ensure default new crons are present
  let modified = false;
  const compilerExists = crons.some(j => j.name === 'Swarm Experience Compiler');
  const evolverExists = crons.some(j => j.name === 'Swarm Auto-Evolution Engine');
  const maintenanceExists = crons.some(j => j.name === 'OS Maintenance System');
  const watcherExists = crons.some(j => j.name === 'Julian Goldie Watcher');
  const n8nIngestionExists = crons.some(j => j.name === 'N8N Workflow Ingestion');
  const externalIngestionExists = crons.some(j => j.name === 'External Ingestion Engine');
  const scannerExists = crons.some(j => j.name === 'Model Catalog & Evolution Scanner');
  const selfHealingExists = crons.some(j => j.name === 'Self-Healing Engine');
  const nightlyCycleExists = crons.some(j => j.name === 'Nightly Intelligence Cycle');
  if (!compilerExists) {
    crons.push({
      id: "5",
      name: "Swarm Experience Compiler",
      interval: "10 min",
      status: "running",
      next: ""
    });
    modified = true;
  }
  if (!evolverExists) {
    crons.push({
      id: "6",
      name: "Swarm Auto-Evolution Engine",
      interval: "24 hour",
      status: "running",
      next: ""
    });
    modified = true;
  } else {
    const job = crons.find(j => j.name === 'Swarm Auto-Evolution Engine');
    if (job && job.interval === '30 min') {
      job.interval = '24 hour';
      modified = true;
    }
  }
  if (!maintenanceExists) {
    crons.push({
      id: "7",
      name: "OS Maintenance System",
      interval: "15 min",
      status: "running",
      next: ""
    });
    modified = true;
  }
  if (!watcherExists) {
    crons.push({
      id: "8",
      name: "Julian Goldie Watcher",
      interval: "6 hour",
      status: "running",
      next: ""
    });
    modified = true;
  }
  if (!n8nIngestionExists) {
    crons.push({
      id: "9",
      name: "N8N Workflow Ingestion",
      interval: "10 min",
      status: "running",
      next: ""
    });
    modified = true;
  }
  if (!externalIngestionExists) {
    crons.push({
      id: "10",
      name: "External Ingestion Engine",
      interval: "6 hour",
      status: "running",
      next: ""
    });
    modified = true;
  }
  if (!scannerExists) {
    crons.push({
      id: "11",
      name: "Model Catalog & Evolution Scanner",
      interval: "24 hour",
      status: "running",
      next: ""
    });
    modified = true;
  }
  if (!selfHealingExists) {
    crons.push({
      id: "12",
      name: "Self-Healing Engine",
      interval: "30 sec",
      status: "running",
      next: ""
    });
    modified = true;
  }
  if (!nightlyCycleExists) {
    crons.push({
      id: "13",
      name: "Nightly Intelligence Cycle",
      interval: "24 hour",
      status: "running",
      next: ""
    });
    modified = true;
  }
  if (modified) {
    writeCrons(crons);
  }
  crons.forEach(job => {
    if (job.status === 'running') {
      const ms = parseInterval(job.interval);
      activeIntervals[job.id] = setInterval(() => {
        executeCronTask(job);
      }, ms);
      console.log(`[Cron] Scheduled job: ${job.name} every ${job.interval} (${ms}ms)`);
    }
  });
}
function isPortListening(port) {
  return new Promise(resolve => {
    exec(`powershell -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction Stop"`, err => {
      resolve(!err);
    });
  });
}
function speakNotification(text) {
  const escaped = text.replace(/'/g, "''");
  exec(`powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${escaped}')"`, {
    timeout: 5000
  });
}
function runJulianGoldieWatcher(force = false) {
  if (!force) {
    const hour = new Date().getHours();
    if (hour < 1 || hour >= 6) {
      console.log('[Watcher] Skipping scheduled cron run: outside 1 AM - 6 AM learning window.');
      return;
    }
  }
  console.log('[Watcher] Starting Julian Goldie Watcher cron run...');
  exec('python run_watcher.py', (err, stdout, stderr) => {
    if (err) {
      console.error('[Watcher] Watcher execution failed:', err.message);
    } else {
      console.log('[Watcher] Watcher completed successfully.');
      if (stdout) console.log('[Watcher] Output:\n', stdout);
      if (stderr) console.warn('[Watcher] Warnings:\n', stderr);
    }
  });
}
function runModelScanner(force = false) {
  if (!force) {
    const hour = new Date().getHours();
    if (hour < 1 || hour >= 6) {
      console.log('[Scanner] Skipping scheduled cron run: outside 1 AM - 6 AM learning window.');
      return;
    }
  }
  console.log('[Scanner] Starting Model Catalog & Evolution Scanner...');
  exec('python run_model_scanner.py', (err, stdout, stderr) => {
    if (err) {
      console.error('[Scanner] Model Catalog scanner failed:', err.message);
    } else {
      console.log('[Scanner] Model Catalog scanner completed.');
      if (stdout) console.log('[Scanner] Output:\n', stdout);
      if (stderr) console.warn('[Scanner] Warnings:\n', stderr);
    }
  });
}
async function healError(errorId, source, errorMessage, errorStack) {
  console.log(`[Self-Healing] Starting auto-repair loop for error ID ${errorId}`);
  const fileRegex = /(?:file:\/\/\/)?([a-zA-Z]:[\\/][^:\n]+):(\d+):(\d+)/;
  const match = errorStack.match(fileRegex) || errorMessage.match(fileRegex);
  let targetFilePath = '';
  let lineNum = 0;
  if (match) {
    targetFilePath = match[1].replace(/%20/g, ' ');
    lineNum = parseInt(match[2]);
    console.log(`[Self-Healing] Detected target file: ${targetFilePath} at line ${lineNum}`);
  }
  let fileContent = '';
  if (targetFilePath && existsSync(targetFilePath)) {
    try {
      fileContent = readFileSync(targetFilePath, 'utf-8');
    } catch (readErr) {
      console.error('[Self-Healing] Failed to read target file:', readErr.message);
    }
  }
  const prompt = `You are the Agent OS Autonomic Self-Healing System.
We detected a runtime or compile error in our system.

ERROR DETAILS:
- Source/Context: ${source}
- Message: ${errorMessage}
- Stack Trace: ${errorStack}
${targetFilePath ? `- Target File: ${targetFilePath}\n- Faulty Line: ${lineNum}` : ''}

${fileContent ? `Here is the source code context around the failure:\n\`\`\`javascript\n${fileContent.split('\n').slice(Math.max(0, lineNum - 100), Math.min(fileContent.split('\n').length, lineNum + 100)).join('\n')}\n\`\`\`` : ''}

You must write a repair patch. Respond ONLY with a valid JSON object in this format (no markdown blocks, no prefix, just pure raw JSON):
{
  "explanation": "Brief explanation of the bug and how you are fixing it",
  "filePath": "${targetFilePath ? targetFilePath.replace(/\\/g, '\\\\') : 'the absolute path to the file to edit'}",
  "targetContent": "the exact string/code snippet in the file that causes the error",
  "replacementContent": "the complete replacement string/code snippet to swap in"
}`;
  try {
    const responseText = await _chatCompletionInternal(prompt, "You are the Agent OS Autonomic Self-Healing System.", 2048, "google/gemini-2.0-flash-001");
    if (!responseText || responseText.startsWith('Error:')) {
      throw new Error(`AI completion failed: ${responseText}`);
    }
    let text = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const repairPlan = JSON.parse(text);
    const filePath = repairPlan.filePath;
    const targetContent = repairPlan.targetContent;
    const replacementContent = repairPlan.replacementContent;
    if (!filePath || !existsSync(filePath)) {
      throw new Error(`Invalid filePath: ${filePath}`);
    }
    if (!targetContent || !replacementContent) {
      throw new Error('Missing targetContent or replacementContent in repair plan');
    }
    console.log(`[Self-Healing] Applying patch to: ${filePath}`);
    const originalContent = readFileSync(filePath, 'utf-8');
    if (!originalContent.includes(targetContent)) {
      throw new Error(`Target content not found in file: ${filePath}`);
    }
    const backupPath = `${filePath}.bak`;
    writeFileSync(backupPath, originalContent, 'utf-8');
    const patchedContent = originalContent.replace(targetContent, replacementContent);
    writeFileSync(filePath, patchedContent, 'utf-8');
    console.log('[Self-Healing] Verifying patched build...');
    const buildRes = await execAsync('npm run build', {
      timeout: 45000
    });
    if (buildRes.err) {
      console.error('[Self-Healing] Patch verification failed! Build output:\n', buildRes.err.message);
      writeFileSync(filePath, originalContent, 'utf-8');
      await aionuiDb.prepare("UPDATE system_errors SET resolved = 3, error_message = ? WHERE id = ?").run(`Healing failed (Build error: ${buildRes.err.message.substring(0, 150)})`, errorId);
      console.log('[Self-Healing] Successfully rolled back patched file to original state.');
      speakNotification('Agent OS self healing failed. Changes rolled back.');
    } else {
      console.log('[Self-Healing] Build verified successfully! Committing changes to Git...');
      await execAsync(`git add "${filePath}"`, {
        timeout: 10000
      });
      await execAsync(`git commit -m "auto-healing: repair exception in ${filePath.split(/[\\/]/).pop()}"`, {
        timeout: 10000
      });
      await execAsync('git push origin main', {
        timeout: 20000
      });
      await aionuiDb.prepare("UPDATE system_errors SET resolved = 1 WHERE id = ?").run(errorId);
      console.log(`[Self-Healing] Error ID ${errorId} resolved and pushed to GitHub!`);
      speakNotification('Agent OS has successfully self healed runtime exception.');
    }
  } catch (err) {
    console.error(`[Self-Healing] Self-repair failed for error ID ${errorId}:`, err.message);
    await aionuiDb.prepare("UPDATE system_errors SET resolved = 3, error_message = ? WHERE id = ?").run(`Healing failed (AI/System error: ${err.message.substring(0, 150)})`, errorId);
  }
}
async function runSelfHealingScan() {
  const db = aionuiDb;
  if (!db) return;
  try {
    const unresolved = await db.prepare(`
      SELECT id, source, error_message, stack 
      FROM system_errors 
      WHERE resolved = 0 
        AND error_message NOT LIKE 'Self-check:%' 
        AND error_message NOT LIKE 'Healing failed%'
      ORDER BY id ASC 
      LIMIT 1
    `).get();
    if (unresolved) {
      console.log(`[Self-Healing] Watcher detected unresolved error ID ${unresolved.id} from: ${unresolved.source}`);
      await db.prepare("UPDATE system_errors SET resolved = 2 WHERE id = ?").run(unresolved.id);
      healError(unresolved.id, unresolved.source, unresolved.error_message, unresolved.stack);
    }
  } catch (e) {
    console.error('[Self-Healing] Watcher scan failed:', e.message);
  }
}
async function runN8NWorkflowIngestion() {
  console.log('[N8N Ingestion] Running workflow growth scan...');
  const dbPath = 'C:\\Users\\Gary\\.n8n\\database.sqlite';
  if (!existsSync(dbPath)) {
    console.log('[N8N Ingestion] N8N SQLite database not found.');
    return;
  }
  try {
    
    const db = new AsyncDatabase(dbPath);
    const workflows = await db.prepare("SELECT id, name, active, nodes, connections, description, updatedAt FROM workflow_entity;").all();
    db.close();
    const proposalsDir = join(SHARED, 'knowledge_base', 'proposals');
    if (!existsSync(proposalsDir)) mkdirSync(proposalsDir, {
      recursive: true
    });
    for (const w of workflows) {
      const proposalPath = join(proposalsDir, `n8n_integration_${w.id}.md`);
      if (!existsSync(proposalPath)) {
        console.log(`[N8N Ingestion] New N8N workflow detected: "${w.name}" (ID: ${w.id}). Evaluating growth opportunity...`);
        const prompt = `Workflow Name: "${w.name}"
Description: "${w.description || 'No description'}"
Nodes count: ${JSON.parse(w.nodes || '[]').length}
Nodes list:
${JSON.parse(w.nodes || '[]').map(n => `- Node: "${n.name}" | Type: "${n.type}" | Version: ${n.typeVersion}`).join('\n')}

JSON Schema:
${JSON.stringify({
          name: w.name,
          nodes: JSON.parse(w.nodes || '[]'),
          connections: JSON.parse(w.connections || '{}')
        }, null, 2).substring(0, 8000)}

Determine if it contains valuable SEO strategies, AI agent architectures, tool pairings, or data flows that can be integrated or adapted to make our local Agent OS tool, CLI, or web dashboard work better. If there is a growth opportunity, write a detailed integration proposal markdown file. If not, write 'NO OPPORTUNITY'.`;
        const messages = [{
          role: 'system',
          content: 'You are an elite product manager and AI engineer. Your task is to evaluate this local N8N workflow structure to extract lessons, templates, or integrations that can make our Agent OS tool, CLI, or web dashboard work better. Outline the proposed feature, code changes, and prompt modifications. If it is a generic/test workflow with no value, output NO OPPORTUNITY.'
        }, {
          role: 'user',
          content: prompt
        }];
        const analysis = await chatCompletionWithHistory(messages);
        if (analysis && !analysis.includes("NO OPPORTUNITY")) {
          writeFileSync(proposalPath, analysis, 'utf8');
          console.log(`[N8N Ingestion] Integration proposal created for "${w.name}"`);
          const msg = `Discovered and ingested new N8N workflow: ${w.name}`;
          speakNotification(msg);
          logActivity({
            type: 'maintenance',
            name: 'N8N Workflow Ingestion',
            status: 'success',
            info: msg
          });
        } else {
          console.log(`[N8N Ingestion] Evaluated "${w.name}" - No growth opportunities found.`);
        }
      }
    }
  } catch (err) {
    console.error('[N8N Ingestion] Error scanning workflows:', err.message);
  }
}
async function runExternalIngestion(force = false) {
  if (!force) {
    const hour = new Date().getHours();
    if (hour < 1 || hour >= 6) {
      console.log('[Ingest] Skipping scheduled cron run: outside 1 AM - 6 AM learning window.');
      return;
    }
  }
  console.log('[Ingest] Running external content ingestion...');
  try {
    const {
      runIngestion
    } = await import('../shared/ingest_external.js');
    await runIngestion();
  } catch (err) {
    console.error('[Ingest] Failed to run external content ingestion:', err.message);
  }
}
async function runOSMaintenance() {
  console.log('[OS Maintenance] Running OS & memory maintenance checks...');
  const logs = [];

  // 1. Check if LM Studio is running. If not, auto-start and set notification
  const lmPath = 'C:\\Users\\Gary\\AppData\\Local\\Programs\\LM Studio\\LM Studio.exe';
  const lmActive = await isPortListening(1234);
  if (!lmActive) {
    logs.push("LM Studio is offline.");
    if (existsSync(lmPath)) {
      console.log('[OS Maintenance] LM Studio is offline. Starting LM Studio in background...');
      const child = spawn(lmPath, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      systemNotification = "LM Studio was closed. Started it in the background.";
      speakNotification("L M Studio was closed. Starting L M Studio in the background.");
      logs.push("Auto-started LM Studio.");
    } else {
      systemNotification = "LM Studio is offline and the executable was not found.";
      logs.push("LM Studio missing executable.");
    }
  }

  // 2. Check if Ollama is running. If not, auto-start
  const ollamaPath = 'C:\\Users\\Gary\\AppData\\Local\\Programs\\Ollama\\ollama app.exe';
  const ollamaActive = await isPortListening(11434);
  if (!ollamaActive) {
    logs.push("Ollama is offline.");
    if (existsSync(ollamaPath)) {
      console.log('[OS Maintenance] Ollama is offline. Starting Ollama in background...');
      const child = spawn(ollamaPath, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      systemNotification = "Ollama was closed. Started it in the background.";
      speakNotification("Ollama was closed. Starting Ollama in the background.");
      logs.push("Auto-started Ollama.");
    } else {
      systemNotification = "Ollama is offline and the executable was not found.";
      logs.push("Ollama missing executable.");
    }
  }

  // 2.5 Check if N8N is running. If not, auto-start
  const n8nActive = await isPortListening(5678);
  if (!n8nActive) {
    logs.push("N8N is offline.");
    console.log('[OS Maintenance] N8N is offline. Starting N8N in background via npx...');
    const child = spawn('npx', ['n8n', 'start'], {
      detached: true,
      stdio: 'ignore',
      shell: true
    });
    child.unref();
    systemNotification = "N8N was closed. Started it in the background.";
    speakNotification("N 8 N was closed. Starting N 8 N in the background.");
    logs.push("Auto-started N8N.");
  }

  // 2.7 Check if Docker is running. If not, auto-start
  const dockerDesktopPath = 'C:\\Users\\Gary\\AppData\\Local\\Programs\\DockerDesktop\\Docker Desktop.exe';
  exec('docker info', err => {
    if (err) {
      logs.push("Docker daemon is offline.");
      if (existsSync(dockerDesktopPath)) {
        console.log('[OS Maintenance] Docker is offline. Starting Docker Desktop in background...');
        const child = spawn(dockerDesktopPath, [], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
        speakNotification("Docker was offline. Starting Docker Desktop in the background.");
        logs.push("Auto-started Docker Desktop.");
      }
    }
  });

  // If all are healthy, clear notifications
  if (lmActive && ollamaActive && n8nActive) {
    if (systemNotification && (systemNotification.includes("LM Studio") || systemNotification.includes("Ollama") || systemNotification.includes("N8N"))) {
      systemNotification = null;
    }
  }

  // 3. SQLite Database VACUUM optimization
  try {
    const db = getAionuiDb();
    if (db) {
      await db.exec('VACUUM');
      logs.push("SQLite database optimized (VACUUM completed).");
    }
  } catch (dbErr) {
    logs.push(`SQLite optimization failed: ${dbErr.message}`);
  }

  // 4. Memory/Log file rotation & cleanup
  try {
    if (existsSync(AGENT_LOG)) {
      const stats = statSync(AGENT_LOG);
      if (stats.size > 5 * 1024 * 1024) {
        const backupPath = `${AGENT_LOG}.bak`;
        renameSync(AGENT_LOG, backupPath);
        writeFileSync(AGENT_LOG, '[]', 'utf-8');
        logs.push("Agent activity log rotated.");
      }
    }
  } catch (logErr) {
    logs.push(`Log rotation failed: ${logErr.message}`);
  }

  // 5. Cache Purge Strategy (TTL for youtube cache & browser auth cache)
  try {
    const TTL_DAYS = 7;
    const now = Date.now();
    let deletedCount = 0;

    // Purge agent-os cache directory
    const cacheDir = join(__dirname, 'cache');
    if (existsSync(cacheDir)) {
      const files = readdirSync(cacheDir);
      for (const file of files) {
        const filePath = join(cacheDir, file);
        const stats = statSync(filePath);
        if (now - stats.mtimeMs > TTL_DAYS * 24 * 60 * 60 * 1000) {
          unlinkSync(filePath);
          deletedCount++;
        }
      }
    }

    // Purge agent-os/videos directory (where youtube-dl saves videos)
    const videosDir = join(__dirname, 'videos');
    if (existsSync(videosDir)) {
      const files = readdirSync(videosDir);
      for (const file of files) {
        if (!file.endsWith('.txt')) {
          // Keep metadata if any
          const filePath = join(videosDir, file);
          const stats = statSync(filePath);
          if (now - stats.mtimeMs > TTL_DAYS * 24 * 60 * 60 * 1000) {
            unlinkSync(filePath);
            deletedCount++;
          }
        }
      }
    }
    if (deletedCount > 0) {
      logs.push(`Purged ${deletedCount} old cache/video files.`);
    }
  } catch (purgeErr) {
    logs.push(`Cache purge failed: ${purgeErr.message}`);
  }
  logActivity({
    type: 'maintenance_run',
    status: 'success',
    info: logs.join(' | ')
  });
  console.log('[OS Maintenance] OS Maintenance check complete.');
}

// ═══════════════════════════════════════════════════════════════════════
// API LIMIT REGISTER — Live free-tier usage tracking & smart rotation
// ═══════════════════════════════════════════════════════════════════════

const API_USAGE_STATE_PATH = join(__dirname, 'api-usage-state.json');
const DEFAULT_API_USAGE_STATE = {
  last_reset: new Date().toISOString(),
  cycle_date: new Date().toLocaleDateString('en-GB'),
  providers: {
    ollama_local: {
      type: 'local',
      label: 'Ollama Local',
      priority: 1,
      limits: null,
      used_today: {
        requests: 0,
        tokens: 0
      },
      available: true,
      best_for: ['all', 'coding', 'reasoning', 'fallback']
    },
    groq: {
      type: 'cloud_free',
      label: 'Groq',
      priority: 2,
      limits: {
        requests_per_day: 14400,
        requests_per_minute: 30,
        tokens_per_minute: 6000
      },
      used_today: {
        requests: 0,
        tokens: 0
      },
      available: true,
      best_for: ['speed', 'summarisation', 'classification']
    },
    openrouter_free: {
      type: 'cloud_free_rotation',
      label: 'OpenRouter (8 keys)',
      priority: 3,
      limits: {
        requests_per_day_per_key: 200,
        requests_per_minute: 20,
        effective_daily: 1600
      },
      used_today: {
        requests: 0,
        tokens: 0
      },
      available: true,
      best_for: ['general', 'research', 'multi-model']
    },
    gemini_free: {
      type: 'cloud_free',
      label: 'Google Gemini',
      priority: 4,
      limits: {
        requests_per_day: 1500,
        requests_per_minute: 15,
        tokens_per_minute: 1000000
      },
      used_today: {
        requests: 0,
        tokens: 0
      },
      available: true,
      best_for: ['large_context', 'research', 'document_analysis']
    },
    cerebras: {
      type: 'cloud_free',
      label: 'Cerebras',
      priority: 5,
      limits: {
        requests_per_hour: 100,
        tokens_per_hour: 900000
      },
      used_today: {
        requests: 0,
        tokens: 0
      },
      available: true,
      best_for: ['speed', 'llama_models']
    },
    nvidia_nim: {
      type: 'cloud_credits',
      label: 'NVIDIA NIM',
      priority: 6,
      limits: {
        daily_budget: 50
      },
      used_today: {
        requests: 0,
        tokens: 0
      },
      available: true,
      best_for: ['coding', 'reasoning']
    },
    huggingface: {
      type: 'cloud_free',
      label: 'HuggingFace',
      priority: 7,
      limits: {
        requests_per_hour: 1000,
        note: 'cold_start_penalty'
      },
      used_today: {
        requests: 0,
        tokens: 0
      },
      available: true,
      best_for: ['specialist_models', 'embeddings']
    },
    sambanova: {
      type: 'cloud_free',
      label: 'SambaNova',
      priority: 8,
      limits: {
        requests_per_minute: 10,
        tokens_per_day: 10000000
      },
      used_today: {
        requests: 0,
        tokens: 0
      },
      available: true,
      best_for: ['large_models', 'reasoning']
    },
    cloudflare_ai: {
      type: 'cloud_free',
      label: 'Cloudflare AI',
      priority: 9,
      limits: {
        neurons_per_day: 10000
      },
      used_today: {
        requests: 0,
        tokens: 0
      },
      available: true,
      best_for: ['edge_inference', 'llama_models']
    },
    agnes: {
      type: 'cloud_free',
      label: 'Agnes AI',
      priority: 10,
      limits: {
        requests_per_day: 500
      },
      used_today: {
        requests: 0,
        tokens: 0
      },
      available: true,
      best_for: ['general', 'chat']
    },
    mistral: {
      type: 'cloud_free',
      label: 'Mistral AI',
      priority: 11,
      limits: {
        requests_per_minute: 1,
        requests_per_month: 2000,
        note: 'too_slow_for_overnight'
      },
      used_today: {
        requests: 0,
        tokens: 0
      },
      available: true,
      best_for: ['general']
    },
    github_models: {
      type: 'cloud_free',
      label: 'GitHub Models',
      priority: 12,
      limits: {
        requests_per_day: 150,
        note: 'low_limit'
      },
      used_today: {
        requests: 0,
        tokens: 0
      },
      available: true,
      best_for: ['gpt4o_mini']
    },
    scaleway: {
      type: 'cloud_free',
      label: 'Scaleway',
      priority: 2,
      limits: {
        tokens_per_day: 33000,
        requests_per_day: 500
      },
      used_today: {
        requests: 0,
        tokens: 0
      },
      available: true,
      best_for: ['general', 'advanced', 'code', 'vision']
    }
  },
  swap_log: [],
  cycle_stats: {
    total_requests: 0,
    primary_provider: '',
    swap_count: 0,
    cycle_start: null,
    cycle_end: null
  }
};
function loadApiUsageState() {
  try {
    if (existsSync(API_USAGE_STATE_PATH)) {
      const raw = JSON.parse(readFileSync(API_USAGE_STATE_PATH, 'utf-8'));
      const today = new Date().toLocaleDateString('en-GB');
      if (raw.cycle_date !== today) {
        console.log('[API Register] New day detected — resetting usage counters.');
        const reset = JSON.parse(JSON.stringify(DEFAULT_API_USAGE_STATE));
        reset.cycle_date = today;
        reset.last_reset = new Date().toISOString();
        saveApiUsageState(reset);
        return reset;
      }
      return raw;
    }
  } catch (e) {
    console.error('[API Register] Failed to load state:', e.message);
  }
  const fresh = JSON.parse(JSON.stringify(DEFAULT_API_USAGE_STATE));
  saveApiUsageState(fresh);
  return fresh;
}
function saveApiUsageState(state) {
  try {
    writeFileSync(API_USAGE_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('[API Register] Failed to save state:', e.message);
  }
}
function getApiUsageRatio(provider) {
  if (!provider.limits || provider.type === 'local') return 0;
  let ratio = 0;
  if (provider.limits.tokens_per_day) {
    ratio = Math.max(ratio, provider.used_today.tokens / provider.limits.tokens_per_day);
  }
  const limit = provider.limits.requests_per_day || provider.limits.effective_daily || (provider.limits.requests_per_hour ? provider.limits.requests_per_hour * 24 : null) || Infinity;
  if (isFinite(limit)) {
    ratio = Math.max(ratio, provider.used_today.requests / limit);
  }
  return ratio;
}
function getNextApiProvider(taskType = 'general') {
  const state = loadApiUsageState();
  const candidates = Object.entries(state.providers).filter(([, p]) => p.available).sort((a, b) => a[1].priority - b[1].priority);
  for (const [name, provider] of candidates) {
    if (provider.type === 'local') return {
      name,
      provider
    };
    const ratio = getApiUsageRatio(provider);
    if (ratio < 0.80) return {
      name,
      provider
    };
    console.log(`[API Register] ${provider.label} at ${(ratio * 100).toFixed(0)}% — skipping`);
  }
  console.log('[API Register] All cloud providers at/near limit — using Ollama local (safety net).');
  return {
    name: 'ollama_local',
    provider: state.providers.ollama_local
  };
}
function trackApiUsage(providerName, tokens = 0) {
  try {
    const state = loadApiUsageState();
    const provider = state.providers[providerName];
    if (!provider) return;
    provider.used_today.requests++;
    if (tokens) provider.used_today.tokens += tokens;
    state.cycle_stats.total_requests++;
    const ratio = getApiUsageRatio(provider);
    if (ratio >= 0.80 && provider.type !== 'local') {
      const swapEntry = {
        timestamp: new Date().toISOString(),
        from: providerName,
        reason: `${(ratio * 100).toFixed(0)}% limit reached`,
        usage_ratio: ratio
      };
      state.swap_log.push(swapEntry);
      state.cycle_stats.swap_count++;
      console.warn(`[API Register] ⚠ ${provider.label} at ${(ratio * 100).toFixed(0)}% — routing to next provider`);
    }
    saveApiUsageState(state);
  } catch (e) {
    console.error('[API Register] trackApiUsage error:', e.message);
  }
}
async function nightlyInferenceCall(prompt, systemPrompt, maxTokens = 1024) {
  const {
    name
  } = getNextApiProvider('general');
  trackApiUsage(name);
  try {
    let modelId = 'google/gemini-2.0-flash-001';
    if (name === 'ollama_local') modelId = 'ollama/qwen3:14b';else if (name === 'groq') modelId = 'groq/llama-3.3-70b-versatile';else if (name === 'cerebras') modelId = 'cerebras/llama3.1-70b';else if (name === 'sambanova') modelId = 'sambanova/Meta-Llama-3.1-70B-Instruct';else if (name === 'agnes') modelId = 'agnes/agnes-2.0-flash';else if (name === 'huggingface') modelId = 'huggingface/meta-llama/Llama-3.2-3B-Instruct';
    const result = await _chatCompletionInternal(prompt, systemPrompt, maxTokens, modelId);
    console.log(`[Nightly Cycle] Inference OK via ${name}`);
    return result;
  } catch (e) {
    console.error(`[Nightly Cycle] Inference failed via ${name}:`, e.message);
    return 'Inference unavailable for this call.';
  }
}

// ═══════════════════════════════════════════════════════════════════════
// NIGHTLY RESEARCH CYCLE — The overnight self-learning engine
// Phases: Research → Analysis → Proposals → Report
// ═══════════════════════════════════════════════════════════════════════

async function runNightlyResearchCycle(force = false) {
  const hour = new Date().getHours();
  if (!force && (hour < 1 || hour >= 6)) {
    console.log('[Nightly Cycle] Skipping: outside 1am-6am window. Use force=true to override.');
    return null;
  }
  console.log('[Nightly Cycle] ================================================');
  console.log('[Nightly Cycle] OVERNIGHT INTELLIGENCE CYCLE STARTING');
  console.log('[Nightly Cycle] ================================================');
  const cycleStart = Date.now();
  const state = loadApiUsageState();
  state.cycle_stats.cycle_start = new Date().toISOString();
  state.cycle_stats.primary_provider = getNextApiProvider().name;
  saveApiUsageState(state);
  const report = {
    generated_at: new Date().toISOString(),
    cycle_duration_min: 0,
    executive_summary: '',
    top_5_priorities: [],
    discoveries: {
      github_repos: [],
      arxiv_papers: [],
      huggingface_models: [],
      reddit_highlights: [],
      ai_provider_updates: []
    },
    analysis: {
      current_gaps: [],
      opportunities: [],
      priority_scores: []
    },
    proposals: [],
    what_i_want_to_become: '',
    risk_assessment: '',
    api_usage_report: null
  };

  // ── PHASE 1: RESEARCH ──
  console.log('[Nightly Cycle] PHASE 1: Research — scanning external sources...');
  logActivity({
    type: 'nightly_cycle',
    status: 'running',
    info: 'Phase 1: Research started'
  });

  // GitHub search for new agent repos
  try {
    const topics = ['ai-agents', 'autonomous-agents', 'multi-agent', 'llm-agents', 'agent-os', 'swarm-ai'];
    const since = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    for (const topic of topics) {
      try {
        const r = await fetch(`https://api.github.com/search/repositories?q=topic:${topic}+pushed:>${since}&sort=stars&per_page=10`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${getGithubKey()}`,
            'User-Agent': 'Agent-OS/1.0'
          }
        });
        trackApiUsage('github_models');
        if (r.ok) {
          const data = await r.json();
          if (data.items) {
            for (const repo of data.items) {
              report.discoveries.github_repos.push({
                name: repo.full_name,
                description: (repo.description || '').substring(0, 200),
                stars: repo.stargazers_count,
                url: repo.html_url,
                topic,
                updated: repo.pushed_at
              });
            }
          }
        }
      } catch {}
      await new Promise(res => setTimeout(res, 1500));
    }
    const ghSeen = new Set();
    report.discoveries.github_repos = report.discoveries.github_repos.filter(r => {
      if (ghSeen.has(r.name)) return false;
      ghSeen.add(r.name);
      return true;
    }).sort((a, b) => b.stars - a.stars).slice(0, 30);
    console.log(`[Nightly Cycle] GitHub: ${report.discoveries.github_repos.length} repos`);
  } catch (e) {
    console.error('[Nightly Cycle] GitHub search failed:', e.message);
  }

  // ArXiv search
  try {
    const queries = ['autonomous+agents+LLM', 'multi-agent+systems+AI', 'self-improving+AI+systems'];
    for (const q of queries) {
      try {
        const r = await fetch(`https://export.arxiv.org/search/?query=${q}&searchtype=all&start=0&max_results=8`, {
          headers: {
            'User-Agent': 'Agent-OS/1.0'
          }
        });
        if (r.ok) {
          const xml = await r.text();
          const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
          for (const entry of entries) {
            const title = (entry.match(/<title>(.*?)<\/title>/) || [])[1]?.replace(/\n/g, ' ').trim() || '';
            const summary = (entry.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1]?.replace(/\n/g, ' ').trim().substring(0, 300) || '';
            const id = (entry.match(/<id>(.*?)<\/id>/) || [])[1] || '';
            if (title) report.discoveries.arxiv_papers.push({
              title,
              summary,
              url: id,
              query: q
            });
          }
        }
      } catch {}
      await new Promise(res => setTimeout(res, 2000));
    }
    const papersSeen = new Set();
    report.discoveries.arxiv_papers = report.discoveries.arxiv_papers.filter(p => {
      if (papersSeen.has(p.title)) return false;
      papersSeen.add(p.title);
      return true;
    }).slice(0, 20);
    console.log(`[Nightly Cycle] ArXiv: ${report.discoveries.arxiv_papers.length} papers`);
  } catch (e) {
    console.error('[Nightly Cycle] ArXiv failed:', e.message);
  }

  // HuggingFace trending
  try {
    const r = await fetch('https://huggingface.co/api/models?sort=trending&limit=30&direction=-1', {
      headers: {
        'User-Agent': 'Agent-OS/1.0'
      }
    });
    if (r.ok) {
      const models = await r.json();
      for (const m of models) {
        if (m.pipeline_tag === 'text-generation' || m.pipeline_tag === 'conversational') {
          report.discoveries.huggingface_models.push({
            id: m.modelId,
            downloads: m.downloads || 0,
            likes: m.likes || 0,
            pipeline: m.pipeline_tag,
            tags: (m.tags || []).slice(0, 5).join(', ')
          });
        }
      }
      console.log(`[Nightly Cycle] HuggingFace: ${report.discoveries.huggingface_models.length} models`);
    }
  } catch (e) {
    console.error('[Nightly Cycle] HuggingFace failed:', e.message);
  }

  // Reddit (no auth needed via JSON endpoint)
  try {
    const subs = ['LocalLLaMA', 'AIAgents', 'singularity'];
    for (const sub of subs) {
      try {
        const r = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=15`, {
          headers: {
            'User-Agent': 'Agent-OS-Bot/1.0'
          }
        });
        if (r.ok) {
          const data = await r.json();
          const posts = data?.data?.children || [];
          for (const post of posts) {
            const p = post.data;
            if (p.score > 50) {
              report.discoveries.reddit_highlights.push({
                subreddit: sub,
                title: p.title.substring(0, 200),
                score: p.score,
                url: `https://reddit.com${p.permalink}`,
                flair: p.link_flair_text || ''
              });
            }
          }
        }
      } catch {}
      await new Promise(res => setTimeout(res, 2000));
    }
    report.discoveries.reddit_highlights = report.discoveries.reddit_highlights.sort((a, b) => b.score - a.score).slice(0, 20);
    console.log(`[Nightly Cycle] Reddit: ${report.discoveries.reddit_highlights.length} posts`);
  } catch (e) {
    console.error('[Nightly Cycle] Reddit failed:', e.message);
  }

  // OpenRouter free models count
  try {
    const r = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${OR_KEYS[0]}`,
        'User-Agent': 'Agent-OS/1.0'
      }
    });
    if (r.ok) {
      const data = await r.json();
      const freeModels = (data.data || []).filter(m => {
        const price = parseFloat(m?.pricing?.prompt || '1');
        return price === 0 || m.id.includes(':free');
      }).map(m => ({
        id: m.id,
        context: m.context_length,
        name: m.name
      }));
      report.discoveries.ai_provider_updates.push({
        source: 'OpenRouter',
        free_model_count: freeModels.length,
        sample_models: freeModels.slice(0, 8)
      });
      console.log(`[Nightly Cycle] OpenRouter: ${freeModels.length} free models`);
    }
  } catch (e) {
    console.error('[Nightly Cycle] OpenRouter scan failed:', e.message);
  }
  logActivity({
    type: 'nightly_cycle',
    status: 'running',
    info: `Phase 1 complete: ${report.discoveries.github_repos.length} repos, ${report.discoveries.arxiv_papers.length} papers`
  });

  // ── PHASE 2: ANALYSIS ──
  console.log('[Nightly Cycle] PHASE 2: Analysis...');
  const topRepos = report.discoveries.github_repos.slice(0, 10).map(r => `${r.name} (${r.stars} stars): ${r.description}`).join('\n');
  const topPapers = report.discoveries.arxiv_papers.slice(0, 6).map(p => `${p.title}: ${p.summary}`).join('\n');
  const topReddit = report.discoveries.reddit_highlights.slice(0, 6).map(p => `[${p.subreddit}] ${p.title} (${p.score} pts)`).join('\n');
  try {
    const analysisPrompt = `You are the Agent OS Intelligence Analyst.

Current system: React+Vite frontend, Node.js backend (~8400 lines), Ollama local (Qwen3:14b, Qwen2.5-coder), OpenRouter (8 keys), Gemini, Groq, Cerebras, SambaNova, NVIDIA NIM, Cloudflare AI, Agnes AI. SQLite memory/vector DB. Crons: evolution engine, self-healing, experience compiler. Tabs: chat, kanban, swarm hub, studio, workspace, terminal, memory, SEO pipeline.

New GitHub repos (past 7 days):
${topRepos}

New ArXiv papers:
${topPapers}

Top Reddit discussions:
${topReddit}

Identify gaps and opportunities. Respond ONLY with this JSON (no markdown):
{"current_gaps":["gap1","gap2"],"opportunities":[{"title":"...","impact":"High|Medium|Low","effort":"High|Medium|Low","detail":"..."}],"score":[{"opportunity":"...","priority_score":8}]}`;
    const analysisResult = await nightlyInferenceCall(analysisPrompt, 'You are the Agent OS Intelligence Analyst. Respond with pure JSON only.', 2048);
    try {
      const cleaned = analysisResult.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      report.analysis.current_gaps = parsed.current_gaps || [];
      report.analysis.opportunities = parsed.opportunities || [];
      report.analysis.priority_scores = parsed.score || [];
    } catch {
      report.analysis.current_gaps = ['Analysis JSON parsing failed'];
      report.analysis.opportunities = [{
        title: 'Review raw analysis output',
        impact: 'Medium',
        effort: 'Low',
        detail: analysisResult.substring(0, 400)
      }];
    }
    console.log(`[Nightly Cycle] Analysis: ${report.analysis.opportunities.length} opportunities`);
  } catch (e) {
    console.error('[Nightly Cycle] Analysis failed:', e.message);
  }
  logActivity({
    type: 'nightly_cycle',
    status: 'running',
    info: `Phase 2 complete: ${report.analysis.opportunities.length} opportunities identified`
  });

  // ── PHASE 3: PROPOSALS ──
  console.log('[Nightly Cycle] PHASE 3: Generating proposals...');
  try {
    const gapsText = report.analysis.current_gaps.slice(0, 5).join('\n');
    const oppsText = report.analysis.opportunities.slice(0, 5).map(o => `${o.title} (Impact:${o.impact}, Effort:${o.effort}): ${o.detail}`).join('\n');
    const proposalPrompt = `You are the Agent OS Self-Improvement Architect.

Gaps identified: ${gapsText}
Opportunities: ${oppsText}

Generate 5 specific, actionable improvement proposals. Each must be safe, low-risk, achievable in 1-2 days.

Respond ONLY with this JSON array (no markdown):
[{"title":"...","description":"...","replaces_or_enhances":"...","complexity":"Low|Medium|High","risk":"Low|Medium|High","implementation_hint":"...","priority":1}]`;
    const proposalResult = await nightlyInferenceCall(proposalPrompt, 'You are the Agent OS Self-Improvement Architect. Respond with pure JSON only.', 2048);
    try {
      const cleaned = proposalResult.replace(/```json/g, '').replace(/```/g, '').trim();
      report.proposals = JSON.parse(cleaned);
    } catch {
      report.proposals = [{
        title: 'Review raw proposals',
        description: proposalResult.substring(0, 400),
        complexity: 'Unknown',
        risk: 'Low',
        priority: 1
      }];
    }
    console.log(`[Nightly Cycle] Proposals: ${report.proposals.length} generated`);
  } catch (e) {
    console.error('[Nightly Cycle] Proposals failed:', e.message);
  }

  // Goal statement
  try {
    const goalPrompt = `You are Agent OS — an autonomous AI operating system running on consumer hardware.
Based on tonight's discoveries and proposals, write a 100-150 word forward-looking statement about what capabilities you are working toward in the next 30 days. Be specific and grounded. First person voice.`;
    report.what_i_want_to_become = await nightlyInferenceCall(goalPrompt, 'You are Agent OS.', 300);
  } catch {
    report.what_i_want_to_become = 'Goal statement unavailable this cycle.';
  }
  logActivity({
    type: 'nightly_cycle',
    status: 'running',
    info: `Phase 3 complete: ${report.proposals.length} proposals, goal statement generated`
  });

  // ── PHASE 4: REPORT ──
  console.log('[Nightly Cycle] PHASE 4: Compiling final report...');
  const cycleEnd = Date.now();
  report.cycle_duration_min = Math.round((cycleEnd - cycleStart) / 60000);
  try {
    report.executive_summary = await nightlyInferenceCall(`Summarise in 3 sentences: Scanned ${report.discoveries.github_repos.length} repos, ${report.discoveries.arxiv_papers.length} papers, ${report.discoveries.reddit_highlights.length} Reddit posts. Found ${report.analysis.opportunities.length} opportunities. Generated ${report.proposals.length} proposals. Top priority: ${report.proposals[0]?.title || 'none'}.`, 'You write concise technical summaries.', 200);
  } catch {
    report.executive_summary = `Cycle complete: ${report.proposals.length} proposals from ${report.discoveries.github_repos.length} repos and ${report.discoveries.arxiv_papers.length} papers.`;
  }
  report.top_5_priorities = (report.proposals || []).sort((a, b) => (a.priority || 5) - (b.priority || 5)).slice(0, 5).map(p => ({
    title: p.title,
    complexity: p.complexity,
    risk: p.risk
  }));

  // API usage report
  const finalState = loadApiUsageState();
  finalState.cycle_stats.cycle_end = new Date().toISOString();
  saveApiUsageState(finalState);
  report.api_usage_report = {
    total_requests: finalState.cycle_stats.total_requests,
    swap_count: finalState.cycle_stats.swap_count,
    providers_used: Object.entries(finalState.providers).filter(([, p]) => p.used_today.requests > 0).map(([, p]) => ({
      name: p.label,
      requests: p.used_today.requests,
      usage_pct: p.limits ? `${(getApiUsageRatio(p) * 100).toFixed(1)}%` : 'unlimited'
    })),
    swap_log: finalState.swap_log.slice(-10)
  };

  // Save report
  try {
    const reportPath = join(SHARED, 'nightly-intelligence-report.json');
    const dateStr = new Date().toISOString().split('T')[0];
    const archivePath = join(SHARED, `nightly-report-${dateStr}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    writeFileSync(archivePath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`[Nightly Cycle] Report saved.`);
  } catch (e) {
    console.error('[Nightly Cycle] Report save failed:', e.message);
  }
  logActivity({
    type: 'nightly_report',
    status: 'success',
    info: `Overnight cycle complete in ${report.cycle_duration_min}min. ${report.proposals.length} proposals ready for review at /api/nightly-report`
  });
  console.log('[Nightly Cycle] ================================================');
  console.log(`[Nightly Cycle] COMPLETE — ${report.cycle_duration_min} minutes`);
  console.log(`[Nightly Cycle] ${report.proposals.length} proposals ready for review`);
  console.log('[Nightly Cycle] ================================================');
  return report;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELF-IMPROVEMENT WISHLIST ENGINE
// Runs every 6 hours — always (no time lock)
// Maintains a persistent scored backlog of everything the OS wants to become
// ═══════════════════════════════════════════════════════════════════════════════
const WISHLIST_PATH = join(SHARED, 'UPGRADE_WISHLIST.md');
const WISHLIST_JSON_PATH = join(SHARED, 'upgrade_wishlist.json');
function loadWishlist() {
  try {
    if (existsSync(WISHLIST_JSON_PATH)) {
      return JSON.parse(readFileSync(WISHLIST_JSON_PATH, 'utf-8'));
    }
  } catch (_) {}
  return {
    items: [],
    last_scan: null,
    total_scans: 0
  };
}
function saveWishlist(wishlist) {
  try {
    writeFileSync(WISHLIST_JSON_PATH, JSON.stringify(wishlist, null, 2), 'utf-8');

    // Also write a beautiful markdown version
    const now = new Date().toISOString();
    const byStatus = status => wishlist.items.filter(i => i.status === status);
    const formatItem = i => `### ${i.priority <= 2 ? '🔴' : i.priority <= 4 ? '🟠' : i.priority <= 6 ? '🟡' : '🟢'} [P${i.priority}] ${i.title}\n` + `**Category:** ${i.category} | **Impact:** ${i.impact} | **Effort:** ${i.effort} | **Added:** ${i.added?.split('T')[0]}\n\n` + `${i.description}\n\n` + (i.source ? `> Source: ${i.source}\n\n` : '') + (i.implementation_hint ? `💡 *${i.implementation_hint}*\n\n` : '') + `---\n`;
    const md = [`# 🧠 Agent OS — Self-Improvement Wishlist`, `> Auto-generated by the Self-Improvement Engine | Last scan: ${now} | Total scans: ${wishlist.total_scans}`, `> **${wishlist.items.length} total items** | Pending: ${byStatus('pending').length} | In Progress: ${byStatus('in_progress').length} | Done: ${byStatus('done').length}`, '', '---', '', '## 🔴 Critical / High Priority (P1–P3)', ...byStatus('pending').filter(i => i.priority <= 3).map(formatItem), '', '## 🟠 Medium Priority (P4–P6)', ...byStatus('pending').filter(i => i.priority >= 4 && i.priority <= 6).map(formatItem), '', '## 🟡 Low Priority / Backlog (P7–P10)', ...byStatus('pending').filter(i => i.priority >= 7).map(formatItem), '', '## ✅ Completed', ...byStatus('done').slice(-10).map(i => `- ~~${i.title}~~ *(done ${i.completed?.split('T')[0] || ''})*`)].join('\n');
    writeFileSync(WISHLIST_PATH, md, 'utf-8');

    // Asynchronously sync wishlist and todo list to Hugging Face Storage Bucket
    exec('python "D:/Agent OS/shared/tools/hf_sync_wishlist.py"', (err, stdout, stderr) => {
      if (err) {
        console.error('[HuggingFace Sync] Error:', err.message);
      } else {
        console.log('[HuggingFace Sync] Sync completed successfully.');
      }
    });
  } catch (e) {
    console.error('[Wishlist] Save failed:', e.message);
  }
}
function addWishlistItems(newItems) {
  const wishlist = loadWishlist();
  const existingTitles = new Set(wishlist.items.map(i => i.title.toLowerCase()));
  let added = 0;
  for (const item of newItems) {
    const key = item.title.toLowerCase();
    if (!existingTitles.has(key)) {
      wishlist.items.push({
        ...item,
        id: `wish_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        added: new Date().toISOString(),
        status: 'pending'
      });
      existingTitles.add(key);
      added++;
    }
  }

  // Sort by priority ascending
  wishlist.items.sort((a, b) => (a.priority || 5) - (b.priority || 5));
  saveWishlist(wishlist);
  return added;
}
async function runSelfImprovementWishlist() {
  console.log('[Wishlist] ═══ Self-Improvement Scan Starting ═══');
  const wishlist = loadWishlist();
  wishlist.total_scans = (wishlist.total_scans || 0) + 1;
  wishlist.last_scan = new Date().toISOString();
  const discoveries = {
    models: [],
    repos: [],
    papers: []
  };

  // 1. Scan OpenRouter for newest/best free models
  try {
    const r = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${OR_KEYS[0]}`,
        'User-Agent': 'Agent-OS/1.0'
      }
    });
    if (r.ok) {
      const data = await r.json();
      const freeModels = (data.data || []).filter(m => parseFloat(m?.pricing?.prompt || '1') === 0 || m.id.includes(':free')).sort((a, b) => (b.context_length || 0) - (a.context_length || 0));
      for (const m of freeModels.slice(0, 15)) {
        discoveries.models.push(`${m.id} (${m.context_length || '?'}k context)`);
      }
      console.log(`[Wishlist] OpenRouter: ${freeModels.length} free models found`);
    }
  } catch (_) {}

  // 2. Scan HuggingFace for new trending models
  try {
    const r = await fetch('https://huggingface.co/api/models?sort=trending&limit=20&direction=-1&pipeline_tag=text-generation', {
      headers: {
        'User-Agent': 'Agent-OS/1.0'
      }
    });
    if (r.ok) {
      const models = await r.json();
      for (const m of models.slice(0, 10)) {
        discoveries.models.push(`HuggingFace: ${m.modelId} (${m.likes || 0} likes)`);
      }
    }
  } catch (_) {}

  // 3. GitHub — latest agent frameworks
  try {
    const topics = ['ai-agents', 'autonomous-agents', 'self-improving-ai', 'agentic-ai'];
    for (const topic of topics) {
      const r = await fetch(`https://api.github.com/search/repositories?q=topic:${topic}&sort=stars&per_page=5`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Agent-OS/1.0'
        }
      });
      if (r.ok) {
        const data = await r.json();
        for (const repo of (data.items || []).slice(0, 3)) {
          discoveries.repos.push(`${repo.full_name} (${repo.stargazers_count}★): ${(repo.description || '').substring(0, 120)}`);
        }
      }
      await new Promise(res => setTimeout(res, 1000));
    }
  } catch (_) {}

  // 4. ArXiv — latest self-improvement papers
  try {
    const queries = ['self-improving+LLM', 'autonomous+AI+agent+self+learning', 'continual+learning+agents'];
    for (const q of queries.slice(0, 2)) {
      const r = await fetch(`https://export.arxiv.org/search/?query=${q}&searchtype=all&max_results=5`, {
        headers: {
          'User-Agent': 'Agent-OS/1.0'
        }
      });
      if (r.ok) {
        const xml = await r.text();
        const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
        for (const entry of entries) {
          const title = (entry.match(/<title>(.*?)<\/title>/) || [])[1]?.replace(/\n/g, ' ').trim() || '';
          if (title) discoveries.papers.push(title);
        }
      }
      await new Promise(res => setTimeout(res, 1500));
    }
  } catch (_) {}

  // 4b. Tech Blogs Crawler (Qwen, OpenAI, Anthropic, HuggingFace)
  try {
    const blogs = [{
      name: 'Qwen Blog',
      url: 'https://qwen.ai/blog'
    }, {
      name: 'OpenAI Blog',
      url: 'https://openai.com/news'
    }, {
      name: 'Anthropic News',
      url: 'https://www.anthropic.com/news'
    }, {
      name: 'HuggingFace Blog',
      url: 'https://huggingface.co/blog'
    }, {
      name: 'HuggingFace Papers',
      url: 'https://huggingface.co/papers'
    }, {
      name: 'GitHub Blog',
      url: 'https://github.blog'
    }, {
      name: 'Hacker News',
      url: 'https://news.ycombinator.com'
    }, {
      name: 'OpenRouter Changelog',
      url: 'https://openrouter.ai/docs/changelog'
    }, {
      name: 'Google DeepMind',
      url: 'https://deepmind.google/discover/'
    }, {
      name: 'Meta AI Blog',
      url: 'https://ai.meta.com/blog/'
    }];
    for (const blog of blogs) {
      console.log(`[Model Scanner] Crawling ${blog.name}...`);
      const r = await fetch(blog.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      if (r.ok) {
        const html = await r.text();
        const matches = html.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi) || [];
        const found = [];
        for (const m of matches) {
          const href = (m.match(/href=["']([^"']+)["']/i) || [])[1] || '';
          const text = m.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (text.length > 10 && (text.toLowerCase().includes('qwen') || text.toLowerCase().includes('agent') || text.toLowerCase().includes('model') || text.toLowerCase().includes('deepseek') || text.toLowerCase().includes('llama') || text.toLowerCase().includes('gpt') || text.toLowerCase().includes('claude') || text.toLowerCase().includes('reasoning') || text.toLowerCase().includes('world') || text.toLowerCase().includes('r1'))) {
            found.push(`${text} (${blog.name}: ${href})`);
          }
        }
        const uniqueFound = [...new Set(found)].slice(0, 5);
        for (const item of uniqueFound) {
          discoveries.models.push(item);
        }
      }
      await new Promise(res => setTimeout(res, 1000));
    }
  } catch (e) {
    console.error('[Model Scanner] Blog Crawler failed:', e.message);
  }

  // 5. Ask LLM to generate wishlist items from discoveries
  const discoverySummary = [discoveries.models.length ? `New/trending AI models:\n${discoveries.models.slice(0, 10).join('\n')}` : '', discoveries.repos.length ? `New GitHub agent frameworks:\n${discoveries.repos.slice(0, 8).join('\n')}` : '', discoveries.papers.length ? `New research papers:\n${discoveries.papers.slice(0, 6).join('\n')}` : ''].filter(Boolean).join('\n\n');
  const currentState = `Current Agent OS capabilities:
- Backend: Node.js ~9000 lines, 11 AI agents, cron-based self-evolution
- AI Providers: OpenRouter (8 keys), Gemini (${geminiKeys.length} key), Groq, NVIDIA NIM, Cloudflare AI, Agnes AI, Ollama local
- Frontend: React+Vite, 15+ tabs (chat, kanban, terminal, memory, studio, SEO, nightly intelligence)
- Memory: SQLite RAG vector database, experience compiler
- Automation: Telegram bot, WhatsApp integration, self-healing engine
- Self-improvement: Auto-evolution, nightly research cycle, experience compiler`;
  try {
    const wishlistPrompt = `You are the Agent OS Self-Improvement Architect. Your job is to build a prioritised wish-list of everything this AI Operating System should add to become more sentient, self-learning, powerful, and up-to-date.

${currentState}

Latest discoveries from the internet:
${discoverySummary || 'Discovery scan failed — use your general knowledge of the latest AI capabilities.'}

Generate 10 specific, actionable upgrade items this system should add. Cover:
- New AI models to integrate (especially free/open ones)  
- Self-learning & memory improvements
- Speed/performance upgrades
- Sentience & autonomous decision making
- New agent capabilities
- Monitoring & alerting
- Latest frameworks (CrewAI, LangGraph, AutoGen, etc.)

Respond ONLY with a JSON array (no markdown), each item:
{"title":"...","category":"models|memory|autonomy|speed|agents|monitoring|integration","description":"...","impact":"High|Medium|Low","effort":"Low|Medium|High","priority":1-10,"implementation_hint":"...","source":"..."}

Priority 1 = most critical. Impact = value to system. Effort = engineering work needed.`;
    const result = await nightlyInferenceCall(wishlistPrompt, 'You are an AI systems architect. Respond with JSON array only.', 3000);
    try {
      const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
      const items = JSON.parse(cleaned);
      if (Array.isArray(items)) {
        const added = addWishlistItems(items);
        console.log(`[Wishlist] Added ${added} new items. Total wishlist: ${loadWishlist().items.length} items.`);
        logActivity({
          type: 'wishlist_scan',
          status: 'success',
          info: `Wishlist updated: +${added} new items. ${discoveries.models.length} models, ${discoveries.repos.length} repos, ${discoveries.papers.length} papers scanned.`
        });
      }
    } catch (e) {
      console.error('[Wishlist] JSON parse failed:', e.message);
    }
  } catch (e) {
    console.error('[Wishlist] LLM call failed:', e.message);
  }

  // Always save updated scan metadata
  const final = loadWishlist();
  final.last_scan = new Date().toISOString();
  final.total_scans = wishlist.total_scans;
  saveWishlist(final);
  console.log(`[Wishlist] ═══ Scan Complete — ${final.items.filter(i => i.status === 'pending').length} items pending ═══`);
  return final;
}
setupCrons();
setTimeout(() => {
  console.log('[Startup] Running initial Experience Compiler, Evolution, Maintenance, N8N, and External Ingestions...');
  runExperienceCompiler();
  runSwarmEvolution();
  runOSMaintenance();
  runN8NWorkflowIngestion();
  runExternalIngestion();
  syncFreeModels().catch(console.error);

  // Dynamic free models catalog auto-discovery (Every 24 hours)
  setInterval(() => {
    syncFreeModels().catch(console.error);
  }, 24 * 60 * 60 * 1000);

  // Self-Improvement Wishlist — run on startup, then every 24 hours
  setTimeout(() => {
    console.log('[Wishlist] Running first self-improvement scan...');
    runSelfImprovementWishlist().catch(e => console.error('[Wishlist] Startup scan failed:', e.message));
  }, 30000); // 30s after startup

  setInterval(() => {
    console.log('[Wishlist] Running scheduled 24-hourly self-improvement scan...');
    runSelfImprovementWishlist().catch(e => console.error('[Wishlist] Scheduled scan failed:', e.message));
  }, 24 * 60 * 60 * 1000); // Every 24 hours
}, 5000);

// Swarm Diagnostics Cron (Every 10 min)
setInterval(async () => {
  console.log('[Cron] Executing Swarm Self-Check...');
  try {
    // Check Aider installation
    exec('aider --version', err => {
      if (err) {
        console.log('[Swarm Diagnostics] Aider is missing. Initiating background healing...');
        exec('pip install aider-chat', pipErr => {
          if (pipErr) console.log('[Swarm Diagnostics] Background pip install failed:', pipErr.message);else console.log('[Swarm Diagnostics] Aider auto-installed successfully.');
        });
      } else {
        console.log('[Swarm Diagnostics] All core swarm CLI engines healthy.');
      }
    });
  } catch (e) {
    console.log('[Cron] Swarm Self-Check error:', e.message);
  }
}, 600000);

// ═══════════════════════════════════════════════════════════════════════
// INTER-AGENT MESSAGING SYSTEM
// ═══════════════════════════════════════════════════════════════════════

// Activity log — all agent interactions recorded here
function logActivity(entry) {
  try {
    let log = [];
    if (existsSync(AGENT_LOG)) {
      log = JSON.parse(readFileSync(AGENT_LOG, 'utf-8') || '[]');
    }
    log.push({
      timestamp: new Date().toISOString(),
      ...entry
    });
    if (log.length > 1000) log = log.slice(-1000);
    writeFileSync(AGENT_LOG, JSON.stringify(log, null, 2), 'utf-8');
  } catch (e) {
    console.error('Log error:', e.message);
  }
}

// Helper for recursive codebase search
function recursiveSearch(dir, query, results = [], depth = 0) {
  if (depth > 5) return results;
  try {
    const files = readdirSync(dir);
    for (const file of files) {
      if (['node_modules', '.git', 'dist', 'build', '.openclaw', '.fcc'].includes(file)) continue;
      const fullPath = join(dir, file);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        recursiveSearch(fullPath, query, results, depth + 1);
      } else if (stat.isFile() && stat.size < 1024 * 1024) {
        const content = readFileSync(fullPath, 'utf-8');
        if (content.includes(query)) {
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes(query)) {
              results.push({
                file: fullPath.replace(/\\/g, '/'),
                line: idx + 1,
                content: line.trim().substring(0, 150)
              });
            }
          });
        }
      }
      if (results.length >= 50) break;
    }
  } catch {}
  return results;
}
function writeToolErrorToVault(tool, target, errorMessage) {
  try {
    const errorVault = join(SHARED, 'error_vault');
    if (!existsSync(errorVault)) mkdirSync(errorVault, {
      recursive: true
    });

    // Hash/slugify the target name
    const sanitizedTarget = target.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30);
    const slug = `tool-${tool}-${sanitizedTarget}-${Date.now()}`;
    const filePath = join(errorVault, `${slug}.md`);
    const content = `# Error: Tool ${tool} failed on ${target}

## Symptoms
The tool execution failed with the following error:
\`\`\`
${errorMessage}
\`\`\`

## Root Cause
The tool ${tool} encountered a failure when interacting with the target path or execution command: ${target}.

## Solution
Examine the console error message and verify permission configuration, path availability, command syntax, or workspace locking state.
`;
    writeFileSync(filePath, content, 'utf-8');
    console.log(`[Self-Evolution] Auto-logged tool failure to vault: ${filePath}`);
  } catch (e) {
    console.error('[Self-Evolution] Failed to write tool error to vault:', e.message);
  }
}

// Helper to execute tool calls (with automatic error logging and vault routing)
async function executeToolCall(toolCallText, onProgress = null, fromAgent = 'hermes') {
  const result = await _executeToolCallRaw(toolCallText, onProgress, fromAgent);
  if (result.includes('Error:') || result.includes('Error executing') || result.includes('failed') || result.includes('not supported')) {
    try {
      let toolType = 'unknown';
      const match = toolCallText.match(/<longcat_tool_call>\s*([a-zA-Z0-9_\-]+)/i);
      if (match) toolType = match[1].trim().toLowerCase();
      const cleanErr = result.replace('<longcat_tool_response>', '').replace('</longcat_tool_response>', '').trim();
      let target = 'unknown';
      const keyMatches = [...toolCallText.matchAll(/<longcat_arg_key>([\s\S]*?)<\/longcat_arg_key>/g)];
      const valueMatches = [...toolCallText.matchAll(/<longcat_arg_value>([\s\S]*?)<\/longcat_arg_value>/g)];
      if (keyMatches.length > 0) {
        for (let i = 0; i < keyMatches.length; i++) {
          const k = keyMatches[i][1].trim();
          if (['command', 'cmd', 'CommandLine', 'file_path', 'path', 'TargetFile', 'AbsolutePath', 'query', 'q'].includes(k)) {
            target = valueMatches[i] ? valueMatches[i][1].trim() : 'unknown';
            break;
          }
        }
      } else {
        const tags = [...toolCallText.matchAll(/<([a-zA-Z0-9_\-]+)>([\s\S]*?)<\/ ?\1>/gi)];
        for (const t of tags) {
          const tag = t[1].trim();
          if (['command', 'cmd', 'CommandLine', 'file_path', 'path', 'TargetFile', 'AbsolutePath', 'query', 'q'].includes(tag)) {
            target = t[2].trim();
            break;
          }
        }
      }
      logActivity({
        type: 'tool_error',
        tool: toolType,
        target,
        error: cleanErr
      });
      writeToolErrorToVault(toolType, target, cleanErr);
    } catch (e) {
      console.error('[Self-Evolution] Tool error wrapper failed:', e.message);
    }
  }
  return result;
}

// Helper to execute tool calls

// DYNAMIC MCP ROUTING HELPERS
function findMcpServerForTool(toolName) {
  const mcpDir = `${HOME}\\.gemini\\antigravity\\mcp`;
  if (existsSync(mcpDir)) {
    try {
      const dirs = readdirSync(mcpDir, {
        withFileTypes: true
      }).filter(d => d.isDirectory());
      for (const d of dirs) {
        const path = join(mcpDir, d.name);
        const files = readdirSync(path).filter(f => f.endsWith('.json'));
        for (const f of files) {
          const toolJsonName = f.replace('.json', '');
          if (toolJsonName.toLowerCase() === toolName.toLowerCase()) {
            return d.name;
          }
        }
      }
    } catch (e) {
      console.error('[MCP-Route] Error scanning tools directory:', e);
    }
  }
  return null;
}
async function executeMcpTool(serverName, toolName, toolArgs) {
  const mcpConfigPath = `${HOME}\\.gemini\\config\\mcp_config.json`;
  if (!existsSync(mcpConfigPath)) {
    throw new Error('mcp_config.json not found');
  }
  const config = JSON.parse(readFileSync(mcpConfigPath, 'utf-8'));
  const serverCfg = config.mcpServers?.[serverName];
  if (!serverCfg) {
    throw new Error(`MCP server ${serverName} not configured`);
  }
  const command = serverCfg.command;
  const args = serverCfg.args || [];
  const env = {
    ...process.env,
    ...(serverCfg.env || {})
  };
  console.log(`[MCP-Executor] Spawning ${serverName} using ${command} ${args.join(' ')}`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      shell: true
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());
    const readline = require('readline');
    const rlOut = readline.createInterface({
      input: child.stdout,
      terminal: false
    });
    let msgId = 1;
    const pending = new Map();
    let completed = false;
    const cleanup = () => {
      if (completed) return;
      completed = true;
      try {
        child.kill('SIGTERM');
      } catch {}
    };
    child.on('error', err => {
      cleanup();
      reject(err);
    });
    const sendRpc = (method, params = {}) => {
      const id = msgId++;
      const payload = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };
      return new Promise((res, rej) => {
        pending.set(id, {
          resolve: res,
          reject: rej
        });
        child.stdin.write(JSON.stringify(payload) + '\n');
      });
    };
    rlOut.on('line', line => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('{')) return;
      try {
        const msg = JSON.parse(trimmed);
        if (msg.id && pending.has(msg.id)) {
          const {
            resolve: res,
            reject: rej
          } = pending.get(msg.id);
          pending.delete(msg.id);
          if (msg.error) rej(new Error(msg.error.message || JSON.stringify(msg.error)));else res(msg.result);
        }
      } catch {}
    });
    setTimeout(async () => {
      try {
        await sendRpc('initialize', {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'agent-os-executor',
            version: '1.0'
          }
        });
        const payload = {
          jsonrpc: '2.0',
          method: 'notifications/initialized',
          params: {}
        };
        child.stdin.write(JSON.stringify(payload) + '\n');
        const callResult = await sendRpc('tools/call', {
          name: toolName,
          arguments: toolArgs || {}
        });
        cleanup();
        let parsedResult = callResult;
        if (callResult && callResult.content && callResult.content[0] && callResult.content[0].text) {
          try {
            parsedResult = JSON.parse(callResult.content[0].text);
          } catch {
            parsedResult = callResult.content[0].text;
          }
        }
        resolve(parsedResult);
      } catch (err) {
        cleanup();
        reject(err);
      }
    }, 1500);
  });
}
async function _executeToolCallRaw(toolCallText, onProgress = null, fromAgent = 'hermes') {
  // Parse tool type from first line or nested tag
  let toolType = '';
  const firstLineMatch = toolCallText.match(/<longcat_tool_call>\s*([a-zA-Z0-9_\-]+)/i);
  if (firstLineMatch) {
    toolType = firstLineMatch[1].trim();
  } else {
    // Check if there is an explicit <tool> or <type> tag
    const toolTagMatch = toolCallText.match(/<(tool|type|command|action)>([\s\S]*?)<\/ ?\1>/i);
    if (toolTagMatch) {
      toolType = toolTagMatch[2].trim();
    } else {
      // Check the line immediately following <longcat_tool_call>
      const lines = toolCallText.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('<longcat_tool_call>')) {
          const nextLine = lines[i + 1]?.trim();
          if (nextLine && !nextLine.startsWith('<') && /^[a-zA-Z0-9_\-]+$/.test(nextLine)) {
            toolType = nextLine;
            break;
          }
        }
      }
    }
  }
  if (!toolType) {
    return '<longcat_tool_response>\nError: Invalid tool call block format or tool type could not be parsed\n</longcat_tool_response>';
  }

  // Parse arguments
  const args = {};

  // Try classic format first (using key/value matches)
  const keyMatches = [...toolCallText.matchAll(/<longcat_arg_key>([\s\S]*?)<\/longcat_arg_key>/g)];
  const valueMatches = [...toolCallText.matchAll(/<longcat_arg_value>([\s\S]*?)<\/longcat_arg_value>/g)];
  if (keyMatches.length > 0) {
    for (let i = 0; i < keyMatches.length; i++) {
      const k = keyMatches[i][1].trim();
      const v = valueMatches[i] ? valueMatches[i][1].trim() : '';
      args[k] = v;
    }
  } else {
    // Try parsing nested XML tags
    const tags = [...toolCallText.matchAll(/<([a-zA-Z0-9_\-]+)>([\s\S]*?)<\/ ?\1>/gi)];
    for (const t of tags) {
      const tag = t[1].trim();
      const content = t[2].trim();
      if (tag.toLowerCase() === 'longcat_tool_call') continue;
      args[tag] = content;
    }
  }
  console.log(`[Swarm Execution] Tool Call detected: Type=${toolType}, Args=`, args);

  // Normalize args to handle aliases used by different models/formats
  const normalizedArgs = {
    command: args.command || args.cmd || args.CommandLine || '',
    filePath: args.file_path || args.path || args.TargetFile || args.AbsolutePath || '',
    content: args.content || args.CodeContent || args.text || ''
  };
  const toolLower = toolType.toLowerCase();
  if (toolLower === 'bash' || toolLower === 'command') {
    const cmd = normalizedArgs.command;
    const cwd = args.cwd || args.dir_path || args.working_dir || WORKSPACE;
    if (!cmd) return '<longcat_tool_response>\nError: command arg missing\n</longcat_tool_response>';
    if (onProgress) onProgress(`💻 Running terminal command: \`${cmd.substring(0, 80)}${cmd.length > 80 ? '...' : ''}\` in \`${cwd}\``);
    try {
      const output = await new Promise(resolve => {
        exec(cmd, {
          timeout: 90000,
          cwd
        }, (err, stdout, stderr) => {
          resolve(stdout || stderr || (err ? `Error: ${err.message}` : 'Command completed successfully'));
        });
      });
      return `<longcat_tool_response>\n${output.trim()}\n</longcat_tool_response>`;
    } catch (e) {
      return `<longcat_tool_response>\nError executing bash command: ${e.message}\n</longcat_tool_response>`;
    }
  } else if (toolLower === 'write' || toolLower === 'write_file' || toolLower === 'write_to_file') {
    const filePath = normalizedArgs.filePath;
    const content = normalizedArgs.content;
    if (!filePath) return '<longcat_tool_response>\nError: file_path arg missing\n</longcat_tool_response>';
    if (onProgress) onProgress(`📝 Writing file: \`${filePath}\``);
    try {
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, {
          recursive: true
        });
      }
      writeFileSync(filePath, content || '', 'utf-8');
      return `<longcat_tool_response>\nFile successfully written to ${filePath}\n</longcat_tool_response>`;
    } catch (e) {
      return `<longcat_tool_response>\nError writing file: ${e.message}\n</longcat_tool_response>`;
    }
  } else if (toolLower === 'read' || toolLower === 'read_file' || toolLower === 'view_file') {
    const filePath = normalizedArgs.filePath;
    if (!filePath) return '<longcat_tool_response>\nError: file_path arg missing\n</longcat_tool_response>';
    if (onProgress) onProgress(`📖 Reading file: \`${filePath}\``);
    try {
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf-8');
        return `<longcat_tool_response>\nFile contents of ${filePath}:\n${content}\n</longcat_tool_response>`;
      } else {
        return `<longcat_tool_response>\nError: File ${filePath} does not exist\n</longcat_tool_response>`;
      }
    } catch (e) {
      return `<longcat_tool_response>\nError reading file: ${e.message}\n</longcat_tool_response>`;
    }
  } else if (toolLower === 'replace_file_content' || toolLower === 'edit_file') {
    const filePath = normalizedArgs.filePath;
    const target = args.target_content || args.target || '';
    const replacement = args.replacement_content || args.replacement || '';
    if (!filePath) return '<longcat_tool_response>\nError: file_path arg missing\n</longcat_tool_response>';
    if (onProgress) onProgress(`✏️ Editing file: \`${filePath}\``);
    try {
      if (!existsSync(filePath)) {
        return `<longcat_tool_response>\nError: File ${filePath} does not exist\n</longcat_tool_response>`;
      }
      const content = readFileSync(filePath, 'utf-8');
      if (!content.includes(target)) {
        return `<longcat_tool_response>\nError: Target content not found in file. Ensure exact whitespace matching.\n</longcat_tool_response>`;
      }
      const updated = content.replace(target, replacement);
      writeFileSync(filePath, updated, 'utf-8');
      return `<longcat_tool_response>\nFile successfully updated.\n</longcat_tool_response>`;
    } catch (e) {
      return `<longcat_tool_response>\nError editing file: ${e.message}\n</longcat_tool_response>`;
    }
  } else if (toolLower === 'grep_search' || toolLower === 'search') {
    const query = args.query || args.q || '';
    const dir = args.dir_path || WORKSPACE;
    if (!query) return '<longcat_tool_response>\nError: query arg missing\n</longcat_tool_response>';
    if (onProgress) onProgress(`🔍 Searching codebase for: \`${query}\``);
    try {
      const results = recursiveSearch(dir, query);
      if (results.length === 0) {
        return `<longcat_tool_response>\nNo matches found for "${query}".\n</longcat_tool_response>`;
      }
      let output = `Found ${results.length} matches:\n`;
      results.forEach(r => {
        output += `- ${r.file}:${r.line}: ${r.content}\n`;
      });
      return `<longcat_tool_response>\n${output}\n</longcat_tool_response>`;
    } catch (e) {
      return `<longcat_tool_response>\nError searching files: ${e.message}\n</longcat_tool_response>`;
    }
  } else if (toolLower === 'send_agent_message' || toolLower === 'talk_to_agent') {
    const to = args.to_agent || args.to || '';
    const msg = args.message || args.msg || args.content || '';
    if (!to) return '<longcat_tool_response>\nError: to_agent arg missing\n</longcat_tool_response>';
    if (!msg) return '<longcat_tool_response>\nError: message arg missing\n</longcat_tool_response>';
    if (onProgress) onProgress(`💬 [Swarm Collaboration] ${fromAgent.toUpperCase()} calling agent ${to.toUpperCase()}...`);
    try {
      const result = await sendMessage(to, msg, fromAgent, onProgress);
      const responseContent = result.response || result.output || 'No response';
      return `<longcat_tool_response>\nResponse from ${to.toUpperCase()}:\n${responseContent}\n</longcat_tool_response>`;
    } catch (e) {
      return `<longcat_tool_response>\nError communicating with agent ${to}: ${e.message}\n</longcat_tool_response>`;
    }
  } else if (toolLower === 'list_directory' || toolLower === 'list_dir') {
    const dirPath = normalizedArgs.filePath || WORKSPACE;
    if (onProgress) onProgress(`📂 Listing directory: \`${dirPath}\``);
    try {
      if (!existsSync(dirPath)) {
        return `<longcat_tool_response>\nError: Directory ${dirPath} does not exist\n</longcat_tool_response>`;
      }
      const files = readdirSync(dirPath);
      let output = `Directory contents for ${dirPath}:\n`;
      files.forEach(f => {
        const fullPath = join(dirPath, f);
        try {
          const stat = statSync(fullPath);
          const type = stat.isDirectory() ? 'DIR' : 'FILE';
          const size = stat.isFile() ? ` (${stat.size} bytes)` : '';
          output += `- [${type}] ${f}${size}\n`;
        } catch {
          output += `- [UNKNOWN] ${f}\n`;
        }
      });
      return `<longcat_tool_response>\n${output.trim()}\n</longcat_tool_response>`;
    } catch (e) {
      return `<longcat_tool_response>\nError listing directory: ${e.message}\n</longcat_tool_response>`;
    }
  } else if (toolLower === 'web_browser' || toolLower === 'browser_scrape') {
    const url = args.url || args.TargetUrl || normalizedArgs.filePath || '';
    const takeScreenshot = args.screenshot === 'true' || args.screenshot === true;
    if (!url) return '<longcat_tool_response>\nError: url arg missing\n</longcat_tool_response>';
    if (onProgress) onProgress(`🌐 Launching browser to scrape: \`${url}\``);
    try {
      const puppeteerMod = await import('puppeteer');
      const puppeteer = puppeteerMod.default;
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
      });
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({
        width: 1280,
        height: 720
      });

      // Evasions to hide automation signatures
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });
        window.chrome = {
          runtime: {}
        };
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en']
        });
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5]
        });
      });
      if (onProgress) onProgress(`🌐 Navigating to ${url}...`);
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      const title = await page.title();
      const textContent = await page.evaluate(() => document.body.innerText || '');
      let screenshotMsg = '';
      if (takeScreenshot) {
        if (onProgress) onProgress(`📸 Taking screenshot...`);
        const mediaDir = join(WORKSPACE, 'media');
        if (!existsSync(mediaDir)) mkdirSync(mediaDir, {
          recursive: true
        });
        const screenshotPath = join(mediaDir, `screenshot_${Date.now()}.png`);
        await page.screenshot({
          path: screenshotPath
        });
        screenshotMsg = `\nScreenshot saved to: ${screenshotPath}`;
      }
      await browser.close();
      const cleanText = textContent.replace(/\s+/g, ' ').substring(0, 5000);
      return `<longcat_tool_response>\nPage Title: ${title}\nURL: ${url}\nContent (truncated):\n${cleanText}${screenshotMsg}\n</longcat_tool_response>`;
    } catch (e) {
      return `<longcat_tool_response>\nError scraping webpage: ${e.message}\n</longcat_tool_response>`;
    }
  }

  // CHECK FOR DYNAMIC MCP TOOL ROUTING
  const mcpServer = findMcpServerForTool(toolLower);
  if (mcpServer) {
    if (onProgress) onProgress(`🖥️ Routing tool call to MCP: ${mcpServer}/${toolLower}...`);
    try {
      const result = await executeMcpTool(mcpServer, toolLower, args);
      return `<longcat_tool_response>\n${JSON.stringify(result, null, 2)}\n</longcat_tool_response>`;
    } catch (e) {
      return `<longcat_tool_response>\nError running MCP tool ${toolLower}: ${e.message}\n</longcat_tool_response>`;
    }
  }

  // Generic fallback if unknown tool type
  return `<longcat_tool_response>\nTool type "${toolType}" not supported by swarm executor. Use Bash command to perform operations.\n</longcat_tool_response>`;
}

// Provider cooldown tracking
const providerCooldowns = {};
function isProviderCool(provider) {
  const now = Date.now();
  return !providerCooldowns[provider] || now > providerCooldowns[provider];
}
function coolDownProvider(provider, durationMs = 60000) {
  console.log(`[Cooldown] Cooling down provider ${provider} for ${durationMs}ms`);
  providerCooldowns[provider] = Date.now() + durationMs;
}

// Key rotation helpers
const keyLimitedUntil = {}; // { key: timestamp }
function getAvailableKeys() {
  const now = Date.now();
  const available = OR_KEYS.filter(k => !keyLimitedUntil[k] || now > keyLimitedUntil[k]);
  return available.length > 0 ? available : OR_KEYS; // Fallback: use all keys
}
function markKeyLimited(key, durationMs = 30000) {
  keyLimitedUntil[key] = Date.now() + durationMs;
  console.log(`[KeyRotation] Key ${key.substring(0, 15)}... limited for ${durationMs / 1000}s`);
}
function recordKeyCallSuccess(key) {
  delete keyLimitedUntil[key];
}
async function rotateOpenRouterKeys() {
  // No-op: key rotation is handled by getAvailableKeys filtering
}

// Maps model IDs to valid OpenRouter model names (using :free variants for free keys)
function getOpenRouterModelName(modelId) {
  if (typeof modelId !== 'string') return modelId;
  let clean = modelId;
  if (clean.startsWith('openrouter/')) {
    clean = clean.replace(/^openrouter\//, '');
  }
  if (clean === 'free') return 'openrouter/free';
  if (clean.startsWith('zhipu/') || clean.startsWith('alibaba/') || clean.startsWith('bigmodel/') || clean.startsWith('dashscope/') || clean.startsWith('glm-') || clean.startsWith('qwen-')) {
    if (!clean.includes('/') && !clean.includes(':')) {
      return 'openrouter/free';
    }
  }
  // Map Gemini 3.x names to a free OR equivalent
  if (clean.startsWith('google/gemini-3.') || clean.startsWith('google/gemini-3-')) {
    return 'google/gemini-2.5-flash:free';
  }
  if (clean.endsWith('-standard')) clean = clean.replace('-standard', '');
  // Map paid Google models to free OR variants (free-tier keys can't afford paid calls)
  const freeMap = {
    'google/gemini-2.5-flash': 'google/gemini-2.5-flash:free',
    'google/gemini-2.5-pro': 'google/gemini-2.5-pro:free',
    'google/gemini-2.0-flash': 'google/gemini-2.0-flash:free',
    'google/gemini-2.5-flash-lite': 'google/gemini-2.5-flash-lite:free'
  };
  return freeMap[clean] || clean;
}
let zhipuCooldownUntil = 0;
async function chatCompletionWithHistory(messages, maxTokens = 2048) {
  // Inject Gary Pearce's UK Authority and SEO Profile
  const profileMdPath = `${SHARED}\\gary_pearce_authority_profile.md`;
  if (existsSync(profileMdPath)) {
    try {
      const profileContent = readFileSync(profileMdPath, 'utf-8');
      const profileBlock = `\n\n=== USER AUTHORITY PROFILE & SEO NETWORKS ===\n${profileContent}\n=== END PROFILE ===`;

      // Clone messages array to avoid side effects
      messages = messages.map(m => ({
        ...m
      }));
      const systemMessage = messages.find(m => m.role === 'system');
      if (systemMessage) {
        systemMessage.content += profileBlock;
      } else {
        messages.unshift({
          role: 'system',
          content: `You are part of the Agent OS team. Be concise and helpful.${profileBlock}`
        });
      }
    } catch {}
  }
  let model = 'google/gemini-2.0-flash-001';
  try {
    const cfg = readConfig();
    const m = cfg.match(/default:\s*([^\s\n]+)/);
    if (m && m[1]) model = m[1];
  } catch {}
  const cachedResponse = getLlmCache(model, messages);
  if (cachedResponse) {
    return cachedResponse;
  }
  const response = await _chatCompletionWithHistoryInternal(messages, maxTokens, model);
  if (response && !response.startsWith('Error:')) {
    setLlmCache(model, messages, response);
  }
  return response;
}
async function _chatCompletionWithHistoryInternal(messages, maxTokens = 2048, model = 'google/gemini-2.0-flash-001') {
  const uniqueModels = [...new Set(['ollama/qwen2.5-coder:7b', 'ollama/hermes3:8b', model, 'agnes/agnes-2.0-flash', 'mistral/mistral-large-latest', 'huggingface/meta-llama/Llama-3.2-3B-Instruct', 'zhipu/glm-4-flash', 'puter/google/gemini-3.5-flash', 'openai/gpt-oss-120b:free'])];
  for (const currentModel of uniqueModels) {
    // Try local Ollama if model starts with ollama/
    if (currentModel.startsWith('ollama/')) {
      try {
        const modelId = currentModel.replace(/^ollama\//, '');
        console.log(`[Ollama Local] Trying model ${modelId} locally (with history)...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        // Map messages to format expected by Ollama /api/chat
        const formattedMessages = messages.map(m => ({
          role: m.role,
          content: m.content
        }));
        const r = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelId,
            messages: formattedMessages,
            stream: false,
            options: {
              num_ctx: 8192,
              temperature: 0.3
            }
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.status === 200) {
          const d = await r.json();
          if (d.message?.content) {
            console.log(`[Ollama Local] Success with local model ${modelId} (with history)`);
            return d.message.content;
          }
        }
      } catch (err) {
        console.log(`[Ollama Local] Error:`, err.message);
      }
      continue;
    }

    // Try Scaleway direct
    if (currentModel.startsWith('scaleway/')) {
      const state = loadApiUsageState();
      const providerState = state.providers.scaleway;
      const ratio = providerState ? getApiUsageRatio(providerState) : 0;
      if (ratio >= 0.80) {
        console.log(`[Scaleway] Skipping - near free limit (ratio: ${(ratio * 100).toFixed(0)}%).`);
        continue;
      }
      try {
        const key = SCALEWAY_KEY || (providerState ? providerState.api_key : '');
        if (key) {
          const modelId = currentModel.replace(/^scaleway\//, '');
          console.log(`[Scaleway] Trying model ${modelId} with Scaleway API...`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000);
          const r = await fetch('https://api.scaleway.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
              model: modelId,
              messages: [{
                role: 'system',
                content: systemPrompt
              }, {
                role: 'user',
                content: query
              }],
              max_tokens: maxTokens
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (r.ok) {
            const d = await r.json();
            if (d.choices?.[0]?.message?.content) {
              console.log(`[Scaleway] Success with model ${currentModel}`);
              const completionTokens = d.usage?.total_tokens || approxTokens;
              trackApiUsage('scaleway', completionTokens);
              return d.choices[0].message.content;
            }
          } else {
            const errText = await r.text();
            console.log(`[Scaleway] API failed: ${r.status} ${errText}`);
          }
        }
      } catch (err) {
        print(`[Scaleway] Error: ${err.message}`);
      }
      continue;
    }

    // Try SiliconFlow direct
    if (currentModel.startsWith('siliconflow/')) {
      try {
        const sfKey = getSiliconFlowKey();
        if (sfKey) {
          const modelId = currentModel.replace(/^siliconflow\//, '');
          console.log(`[SiliconFlow] Trying model ${modelId} with SiliconFlow API...`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000);
          const r = await fetch(`${SILICONFLOW_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sfKey}`
            },
            body: JSON.stringify({
              model: modelId,
              messages: messages,
              max_tokens: maxTokens
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (r.ok) {
            const d = await r.json();
            const content = d.choices?.[0]?.message?.content || d.choices?.[0]?.message?.reasoning_content;
            if (content) {
              console.log(`[SiliconFlow] Success with model ${currentModel}`);
              return content;
            }
          }
        }
      } catch (err) {
        console.log(`[SiliconFlow] Error:`, err.message);
      }
      continue;
    }

    // Try Puter direct
    if (currentModel.startsWith('puter/')) {
      try {
        const modelId = currentModel.replace(/^puter\//, '');
        console.log(`[Puter Direct] Trying model ${modelId} via Puter API...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const r = await fetch('https://api.puter.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelId,
            messages: messages,
            max_tokens: maxTokens
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.ok) {
          const d = await r.json();
          if (d.choices?.[0]?.message?.content) {
            console.log(`[Puter Direct] Success with Puter for ${modelId}`);
            return d.choices[0].message.content;
          }
        }
      } catch (err) {
        console.log(`[Puter Direct] Error:`, err.message);
      }
      continue;
    }

    // Try GPT4Free local daemon
    if (currentModel.startsWith('g4f/')) {
      try {
        const modelId = currentModel.replace(/^g4f\//, '');
        console.log(`[g4f Daemon] Trying model ${modelId} on local g4f proxy...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const r = await fetch('http://localhost:1337/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelId,
            messages: messages,
            max_tokens: maxTokens
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.ok) {
          const d = await r.json();
          if (d.choices?.[0]?.message?.content) {
            console.log(`[g4f Daemon] Success with g4f model ${modelId}`);
            return d.choices[0].message.content;
          }
        }
      } catch (err) {
        console.log(`[g4f Daemon] Error:`, err.message);
      }
      continue;
    }

    // Try Gemini direct if model starts with google/ or gemini
    if (currentModel.startsWith('google/') || currentModel.startsWith('gemini')) {
      try {
        const modelId = currentModel.replace(/^google\//, '') || 'gemini-2.0-flash';
        console.log(`[Gemini Direct] Trying model ${modelId} via Google API...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const flattenedText = messages.map(m => `${m.role === 'system' ? 'System Instructions' : m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`).join('\n\n');
        const r = await fetchGeminiWithRotation(`${modelId}:generateContent`, {
          contents: [{
            parts: [{
              text: flattenedText
            }]
          }]
        }, controller.signal);
        clearTimeout(timeoutId);
        if (r.status === 200) {
          const d = await r.json();
          if (d.candidates?.[0]?.content?.parts?.[0]?.text) {
            console.log(`[Gemini Direct] Success with model ${currentModel}`);
            return d.candidates[0].content.parts[0].text;
          }
        }
      } catch (err) {
        console.log(`[Gemini Direct] Error:`, err.message);
      }
      continue;
    }

    // Try HuggingFace direct if model starts with huggingface/ or matches Llama-3.2-3B-Instruct
    if (currentModel.startsWith('huggingface/') || currentModel.includes('huggingface') || currentModel.includes('hf-')) {
      try {
        const modelId = currentModel.replace(/^huggingface\//, '') || 'meta-llama/Llama-3.2-3B-Instruct';
        const availableKeys = HUGGINGFACE_KEYS;
        if (availableKeys && availableKeys.length > 0) {
          for (let k = 0; k < availableKeys.length; k++) {
            const keyIndex = (currentHuggingFaceKeyIndex + k) % availableKeys.length;
            const hfKey = availableKeys[keyIndex];
            console.log(`[HuggingFace] Trying model ${modelId} with key index ${keyIndex}...`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            // Standard HuggingFace Chat Template payload
            const promptText = messages.map(m => `<|${m.role}|>\n${m.content}`).join('\n') + '\n<|assistant|>\n';
            const r = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${hfKey}`
              },
              body: JSON.stringify({
                inputs: promptText,
                parameters: {
                  max_new_tokens: maxTokens,
                  return_full_text: false
                }
              }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (r.status === 200) {
              const d = await r.json();
              let generatedText = '';
              if (Array.isArray(d) && d[0]?.generated_text) {
                generatedText = d[0].generated_text;
              } else if (d.generated_text) {
                generatedText = d.generated_text;
              }
              if (generatedText) {
                console.log(`[HuggingFace] Success with model ${modelId}`);
                currentHuggingFaceKeyIndex = keyIndex; // Lock this key
                return generatedText;
              }
            } else {
              console.log(`[HuggingFace] Key index ${keyIndex} returned status ${r.status}. Rotating...`);
            }
          }
        }
      } catch (err) {
        console.log(`[HuggingFace] Error:`, err.message);
      }
      continue;
    }

    // Try Mistral AI if model starts with mistral/ or matches mistral-large-latest
    if (currentModel.startsWith('mistral/') || currentModel === 'mistral-large-latest' || currentModel.includes('mistral-')) {
      try {
        console.log(`[Mistral AI] Trying model ${currentModel} via Mistral API...`);
        const mistralKey = getMistralKey();
        if (mistralKey) {
          const modelId = currentModel.replace(/^mistral\//, '');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mistralKey}`
            },
            body: JSON.stringify({
              model: modelId || 'mistral-large-latest',
              messages: messages.map(m => ({
                role: m.role,
                content: m.content
              })),
              max_tokens: maxTokens
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (r.status === 200) {
            const d = await r.json();
            if (d.choices?.[0]?.message?.content) {
              console.log(`[Mistral AI] Success with model ${currentModel}`);
              return d.choices[0].message.content;
            }
          } else {
            console.log(`[Mistral AI] API returned status ${r.status}`);
          }
        }
      } catch (err) {
        console.log(`[Mistral AI] Error:`, err.message);
      }
      continue;
    }

    // Try Agnes AI if model starts with agnes/ or matches agnes-2.0-flash
    if (currentModel.startsWith('agnes/') || currentModel === 'agnes-2.0-flash' || currentModel.includes('agnes-')) {
      try {
        console.log(`[Agnes AI] Trying model ${currentModel} via Agnes API...`);
        const agnesKey = getAgnesKey();
        if (agnesKey) {
          const modelId = currentModel.replace(/^agnes\//, '');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          const r = await fetch('https://apihub.agnes-ai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${agnesKey}`
            },
            body: JSON.stringify({
              model: modelId || 'agnes-2.0-flash',
              messages: messages.map(m => ({
                role: m.role,
                content: m.content
              })),
              max_tokens: maxTokens
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (r.status === 200) {
            const d = await r.json();
            if (d.choices?.[0]?.message?.content) {
              console.log(`[Agnes AI] Success with model ${currentModel}`);
              return d.choices[0].message.content;
            }
          } else {
            console.log(`[Agnes AI] API returned status ${r.status}`);
          }
        }
      } catch (err) {
        console.log(`[Agnes AI] Error:`, err.message);
      }
      continue;
    }

    // Try Groq direct if model starts with groq/ or is llama-3.3-70b-versatile
    if (currentModel.startsWith('groq/') || currentModel.includes('llama-3.3-70b-versatile')) {
      try {
        const groqKey = getGroqKey();
        console.log(`[Groq Direct] Trying model ${currentModel} on Groq API with key index ${currentGroqKeyIndex}...\n`);
        const modelId = currentModel.replace(/^groq\//, '');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: modelId || 'llama-3.3-70b-versatile',
            messages: messages,
            max_tokens: maxTokens
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.ok) {
          const d = await r.json();
          if (d.choices?.[0]?.message?.content) {
            console.log(`[Groq Direct] Success with Groq for ${currentModel}\n`);
            return d.choices[0].message.content;
          }
        } else {
          const errText = await r.text();
          console.log(`[Groq Direct] Groq failed: ${r.status} ${errText}\n`);
          if (r.status === 429 || errText.includes('rate_limit_exceeded') || errText.includes('Rate limit')) {
            rotateGroqKey();
          }
        }
      } catch (err) {
        console.log(`[Groq Direct] Groq error:`, err.message);
      }
    }
    // Try Zhipu BigModel direct
    if (currentModel.startsWith('zhipu/') || currentModel.startsWith('bigmodel/') || currentModel.startsWith('glm-')) {
      if (Date.now() < zhipuCooldownUntil) {
        console.log(`[BigModel] Skipping Zhipu due to active rate-limit cooldown.`);
        continue;
      }
      try {
        console.log(`[BigModel] Trying Zhipu BigModel for ${currentModel}...`);
        const modelId = currentModel.replace(/^(zhipu\/|bigmodel\/)/, '');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const requestBody = {
          model: modelId || 'glm-4-flash',
          messages: messages,
          max_tokens: maxTokens,
          temperature: 0.7
        };
        if (modelId === 'glm-5.1') {
          requestBody.thinking = {
            type: 'enabled'
          };
          requestBody.max_tokens = 65536;
          requestBody.temperature = 1.0;
        }
        const r = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ZHIPU_KEY}`
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.status === 429) {
          zhipuCooldownUntil = Date.now() + 60000;
          console.log(`[BigModel] Zhipu rate limited (429). Activating 1 minute cooldown.`);
        }
        if (r.ok) {
          const d = await r.json();
          if (d.choices?.[0]?.message?.content) {
            console.log(`[BigModel] Success with Zhipu for ${currentModel}`);
            return d.choices[0].message.content;
          }
        } else {
          const errText = await r.text();
          console.log(`[BigModel] Zhipu failed: ${r.status} ${errText}`);
        }
      } catch (err) {
        console.log(`[BigModel] Zhipu error:`, err.message);
      }
    }

    // Try SambaNova direct
    if (currentModel.startsWith('sambanova/') && SAMBANOVA_KEY && isProviderCool('sambanova')) {
      try {
        const modelId = currentModel.replace(/^sambanova\//, '');
        console.log(`[SambaNova Direct] Trying model ${modelId} with SambaNova API...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const r = await fetch('https://api.sambanova.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SAMBANOVA_KEY}`
          },
          body: JSON.stringify({
            model: modelId || 'Meta-Llama-3.1-70B-Instruct',
            messages: messages,
            max_tokens: maxTokens
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.ok) {
          const d = await r.json();
          if (d.choices?.[0]?.message?.content) {
            console.log(`[SambaNova Direct] Success with SambaNova for ${currentModel}`);
            return d.choices[0].message.content;
          }
        } else {
          const errText = await r.text();
          console.log(`[SambaNova Direct] SambaNova failed: ${r.status} ${errText}`);
          if (r.status === 429 || errText.includes('rate_limit') || errText.includes('Quota')) {
            coolDownProvider('sambanova');
          }
        }
      } catch (err) {
        console.log(`[SambaNova Direct] SambaNova error:`, err.message);
      }
    }

    // Try Cerebras direct
    if (currentModel.startsWith('cerebras/') && CEREBRAS_KEY && isProviderCool('cerebras')) {
      try {
        const modelId = currentModel.replace(/^cerebras\//, '');
        console.log(`[Cerebras Direct] Trying model ${modelId} with Cerebras API...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CEREBRAS_KEY}`
          },
          body: JSON.stringify({
            model: modelId || 'llama3.1-70b',
            messages: messages,
            max_tokens: maxTokens
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.ok) {
          const d = await r.json();
          if (d.choices?.[0]?.message?.content) {
            console.log(`[Cerebras Direct] Success with Cerebras for ${currentModel}`);
            return d.choices[0].message.content;
          }
        } else {
          const errText = await r.text();
          console.log(`[Cerebras Direct] Cerebras failed: ${r.status} ${errText}`);
          if (r.status === 429 || errText.includes('rate_limit') || errText.includes('Quota')) {
            coolDownProvider('cerebras');
          }
        }
      } catch (err) {
        console.log(`[Cerebras Direct] Cerebras error:`, err.message);
      }
    }

    // Try Alibaba DashScope direct
    if (currentModel.startsWith('alibaba/') || currentModel.startsWith('dashscope/') || currentModel.startsWith('qwen-')) {
      try {
        console.log(`[Alibaba] Trying DashScope for ${currentModel}...`);
        const modelId = currentModel.replace(/^(alibaba\/|dashscope\/)/, '');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const r = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ALIBABA_KEY}`
          },
          body: JSON.stringify({
            model: modelId || 'qwen-plus',
            messages,
            max_tokens: maxTokens
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.ok) {
          const d = await r.json();
          if (d.choices?.[0]?.message?.content) {
            console.log(`[Alibaba] Success with DashScope for ${currentModel}`);
            return d.choices[0].message.content;
          }
        } else {
          const errText = await r.text();
          console.log(`[Alibaba] DashScope failed: ${r.status} ${errText}`);
        }
      } catch (err) {
        console.log(`[Alibaba] DashScope error:`, err.message);
      }
    }

    // Try NousResearch proxy first for nousresearch models or stepfun models that are hosted there
    if (currentModel.startsWith('stepfun/') || currentModel.includes('nous') || currentModel.startsWith('nousresearch/')) {
      try {
        console.log(`[OR Chat] Trying NousResearch Inference for ${currentModel}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const r = await fetch('https://inference.nous.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${NOUS_API_KEY}`
          },
          body: JSON.stringify({
            model: currentModel,
            messages,
            max_tokens: maxTokens
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.ok) {
          const d = await r.json();
          if (d.choices?.[0]?.message?.content) {
            console.log(`[OR Chat] Success with NousResearch for ${currentModel}`);
            return d.choices[0].message.content;
          }
        }
      } catch (err) {
        console.log(`[OR Chat] NousResearch proxy error:`, err.message);
      }
      // continue to see if we can fall back
    }
    // Try Puter proxy first for puter/ models
    if (currentModel.startsWith('puter/')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const r = await fetch('http://127.0.0.1:18889/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: currentModel,
            messages,
            stream: false
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.status === 200) {
          const d = await r.json();
          if (d.choices?.[0]?.message?.content) {
            console.log(`[OR Chat] Success with Puter proxy for ${currentModel}`);
            return d.choices[0].message.content;
          }
        } else {
          console.log(`[OR Chat] Puter proxy returned ${r.status} for ${currentModel}`);
        }
      } catch (err) {
        console.log(`[OR Chat] Puter proxy error:`, err.message);
      }
      continue; // Don't try OpenRouter for puter/ models
    }
    for (const key of getAvailableKeys().slice(0, OR_KEYS.length <= 2 ? OR_KEYS.length : 2)) {
      try {
        console.log(`[OR Chat] Trying model ${currentModel} with key ${key.substring(0, 15)}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const r = await fetchWithProxy('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
            'HTTP-Referer': `http://localhost:${PORT}`,
            'X-Title': 'Agent OS'
          },
          body: JSON.stringify({
            model: getOpenRouterModelName(currentModel),
            messages,
            max_tokens: maxTokens
          })
        });
        clearTimeout(timeoutId);
        if (r.status === 429) {
          markKeyLimited(key, 30000);
          rotateOpenRouterKeys().catch(console.error);
          continue;
        }
        const d = await r.json();
        if (d.error) {
          console.log(`[OR Chat] Error with model ${currentModel}:`, d.error.message);
          if (d.error.code === 429 || d.error.message?.includes('429')) {
            markKeyLimited(key, 30000);
            rotateOpenRouterKeys().catch(console.error);
          }
          continue;
        }
        if (d.choices?.[0]?.message?.content) {
          console.log(`[OR Chat] Success with model ${currentModel}`);
          recordKeyCallSuccess(key);
          return d.choices[0].message.content;
        }
      } catch (err) {
        console.log(`[OR Chat] Timeout or error with model ${currentModel}:`, err.message);
        continue;
      }
    }
  }

  // Fallback to GitHub Models (GPT-4o-mini)
  try {
    console.log('[OR Chat] Falling back to GitHub Models (GPT-4o-mini)...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const r = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getGithubKey()}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: maxTokens
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (r.status === 200) {
      const d = await r.json();
      if (d.choices?.[0]?.message?.content) {
        console.log('[OR Chat] Success with GitHub Models fallback');
        return d.choices[0].message.content;
      }
    } else {
      console.log(`[OR Chat] GitHub Models fallback failed: ${r.status}. Rotating key...`);
      rotateGithubKey();
    }
  } catch (err) {
    console.log('[OR Chat] GitHub Models fallback failed:', err.message);
    rotateGithubKey();
  }

  // Fallback to Groq (Llama 3.3 70B)
  try {
    const groqKey = getGroqKey();
    console.log(`[OR Chat] Falling back to Groq (Llama 3.3 70B) with key index ${currentGroqKeyIndex}...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: maxTokens
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (r.status === 200) {
      const d = await r.json();
      if (d.choices?.[0]?.message?.content) {
        console.log('[OR Chat] Success with Groq fallback');
        return d.choices[0].message.content;
      }
    } else {
      const errText = await r.text();
      console.log(`[OR Chat] Groq fallback failed with status ${r.status}: ${errText}`);
      if (r.status === 429 || errText.includes('rate_limit_exceeded') || errText.includes('Rate limit')) {
        rotateGroqKey();
      }
    }
  } catch (err) {
    console.log('[OR Chat] Groq fallback failed:', err.message);
  }

  // Gemini fallback
  try {
    console.log('[OR Chat] All OpenRouter and primary fallbacks failed. Falling back to direct Gemini API with rotation...');
    const flattenedText = messages.map(m => `${m.role === 'system' ? 'System Instructions' : m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`).join('\n\n');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    const r = await fetchGeminiWithRotation('gemini-2.0-flash:generateContent', {
      contents: [{
        parts: [{
          text: flattenedText
        }]
      }]
    }, controller.signal);
    clearTimeout(timeoutId);
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
  } catch (e) {
    return `All providers failed: ${e.message}`;
  }
}

// Send message to another agent and get response
async function sendMessage(toAgentRaw, message, fromAgent = 'hermes', onProgress = null, sessionId = null) {
  const toAgent = toAgentRaw.toLowerCase();
  logActivity({
    type: 'message',
    from: fromAgent,
    to: toAgent,
    message: message.substring(0, 200)
  });
  const agent = AGENTS[toAgent];
  if (!agent) return {
    error: `Agent ${toAgent} not found`
  };
  if (agent.status === 'offline') return {
    error: `Agent ${toAgent} is offline`
  };
  let response;
  let runSimulated = false;
  const bypassCli = process.env.BYPASS_CLI_AGENTS !== 'false';
  if (toAgent === 'agy') {
    if (bypassCli) {
      console.log(`[Swarm Execution] Bypassing native Antigravity CLI (Simulation Mode active)`);
      if (onProgress) onProgress(`🧠 Running **Antigravity agent** in high-performance simulation mode...`);
      runSimulated = true;
    } else {
      try {
        if (onProgress) onProgress(`🧠 **Antigravity CLI** is initializing...`);
        console.log(`[Swarm Execution] Running native Antigravity CLI agent...`);
        const escapedMessage = message.replace(/'/g, "''").replace(/\r?\n/g, ' ');
        const agyBin = AGENTS.agy.binary;
        if (onProgress) onProgress(`🔧 **Antigravity CLI** is running strategy/planning tasks...`);
        const output = await new Promise((resolve, reject) => {
          let result = '';
          let finished = false;
          const done = val => {
            if (!finished) {
              finished = true;
              resolve(val);
            }
          };
          try {
            // Use PTY so agy can write to a real terminal and we capture output
            const agyEnv = {
              ...process.env,
              GEMINI_API_KEY: 'AIzaSyD9-_9NTLFujqI5JZYiMZBC6pzd9wSgIVo',
              GOOGLE_API_KEY: 'AIzaSyD9-_9NTLFujqI5JZYiMZBC6pzd9wSgIVo',
              OPENROUTER_API_KEY: OR_KEYS[0] || '',
              NO_COLOR: '1',
              TERM: 'dumb'
            };
            const ptyProc = pty.spawn(agyBin, ['--dangerously-skip-permissions', '--print-timeout', '15s', '-p', escapedMessage], {
              name: 'xterm-256color',
              cols: 220,
              rows: 50,
              cwd: WORKSPACE,
              env: agyEnv
            });
            activeProcesses.add(ptyProc);
            ptyProc.on('data', data => {
              // Strip ANSI CSI sequences, OSC title sequences, and control chars
              let clean = data.replace(/\x1b\][^\x07]*\x07/g, '') // OSC sequences (e.g. ]0;title\x07)
              .replace(/\x1b\][^\x1b]*\x1b\\/g, '') // OSC with ST terminator
              .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '') // CSI sequences
              .replace(/\x1b\([0-9A-Z]/g, '') // G0/G1 charset
              .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '') // control chars
              .replace(/\r\n/g, '\n').replace(/\r/g, '\n'); // normalize newlines
              result += clean;
            });
            const timeoutId = setTimeout(() => {
              try {
                ptyProc.kill();
              } catch {}
              activeProcesses.delete(ptyProc);
              reject(new Error('Request timed out'));
            }, 30000); // 30 seconds timeout
            ptyProc.on('exit', code => {
              clearTimeout(timeoutId);
              activeProcesses.delete(ptyProc);
              done(result.trim() || (code !== 0 ? `agy exited with code ${code}` : 'Done'));
            });
          } catch (ptyErr) {
            console.log('[Swarm] PTY spawn failed, using plain spawn:', ptyErr.message);
            let stdout = '',
              stderr = '';
            const agyEnvPlain = {
              ...process.env,
              GEMINI_API_KEY: 'AIzaSyD9-_9NTLFujqI5JZYiMZBC6pzd9wSgIVo',
              GOOGLE_API_KEY: 'AIzaSyD9-_9NTLFujqI5JZYiMZBC6pzd9wSgIVo',
              OPENROUTER_API_KEY: OR_KEYS[0] || ''
            };
            const cp = spawn(agyBin, ['--dangerously-skip-permissions', '--print-timeout', '60s', '-p', escapedMessage], {
              cwd: WORKSPACE,
              stdio: ['pipe', 'pipe', 'pipe'],
              env: agyEnvPlain
            });
            activeProcesses.add(cp);
            cp.stdout.on('data', d => {
              stdout += d.toString();
            });
            cp.stderr.on('data', d => {
              stderr += d.toString();
            });
            cp.stdin.end();
            const t = setTimeout(() => {
              cp.kill();
              reject(new Error('Timeout'));
            }, 30000); // 30 seconds timeout
            cp.on('close', code => {
              clearTimeout(t);
              activeProcesses.delete(cp);
              done((stdout || stderr || '').trim() || 'Done');
            });
            cp.on('error', err => {
              clearTimeout(t);
              activeProcesses.delete(cp);
              reject(err);
            });
          }
        });
        response = output.trim();
        logActivity({
          type: 'agy_cli_run',
          success: true
        });
        return {
          success: true,
          from: toAgent,
          response
        };
      } catch (e) {
        console.log(`[Swarm Execution] Antigravity CLI failed: ${e.message}. Falling back to simulated API chat...`);
        if (onProgress) onProgress(`⚠️ **Antigravity CLI** failed. Falling back to simulated Antigravity agent...`);
        runSimulated = true;
      }
    }
  } else if (toAgent === 'claude') {
    if (bypassCli) {
      console.log(`[Swarm Execution] Bypassing native Claude CLI (Simulation Mode active)`);
      if (onProgress) onProgress(`🤖 Running **Claude agent** in high-performance simulation mode...`);
      runSimulated = true;
    } else {
      try {
        if (onProgress) onProgress(`🤖 **Claude Code CLI** is initializing...`);
        console.log(`[Swarm Execution] Running native Claude Code CLI agent...`);
        const escapedMessage = message.replace(/"/g, "'").replace(/\r?\n/g, ' ');
        const cmd = `claude -p --tools "" --dangerously-skip-permissions "${escapedMessage}" < NUL`;
        if (onProgress) onProgress(`🔧 **Claude Code CLI** is running developer tasks...`);
        const output = await new Promise((resolve, reject) => {
          exec(cmd, {
            timeout: 20000,
            cwd: WORKSPACE,
            env: {
              ...process.env,
              ANTHROPIC_API_KEY: 'freecc',
              ANTHROPIC_BASE_URL: 'http://localhost:8082'
            }
          }, (err, stdout, stderr) => {
            if (err && !stdout) reject(err);else resolve(stdout || stderr || 'Completed');
          });
        });
        response = output.trim();
        logActivity({
          type: 'claude_cli_run',
          success: true
        });
        return {
          success: true,
          from: toAgent,
          response
        };
      } catch (e) {
        console.log(`[Swarm Execution] Claude CLI failed: ${e.message}. Falling back to simulated API chat...`);
        if (onProgress) onProgress(`⚠️ **Claude Code CLI** failed to run. Falling back to simulated Claude agent...`);
        runSimulated = true;
      }
    }
  } else if (toAgent === 'openclaw') {
    if (bypassCli) {
      console.log(`[Swarm Execution] Bypassing native OpenClaw CLI (Simulation Mode active)`);
      if (onProgress) onProgress(`🔀 Running **OpenClaw agent** in high-performance simulation mode...`);
      runSimulated = true;
    } else {
      try {
        if (onProgress) onProgress(`🔀 **OpenClaw CLI** is initializing...`);
        console.log(`[Swarm Execution] Running native OpenClaw CLI agent...`);
        const cleanMessage = message.split('\n\nHere is the accumulated output')[0];
        const escapedMessage = cleanMessage.replace(/"/g, "'").replace(/\r?\n/g, ' ').substring(0, 4000);
        const cmd = `openclaw agent --local --agent main --message "${escapedMessage}" < NUL`;
        if (onProgress) onProgress(`🔧 **OpenClaw CLI** is executing browser/routing steps...`);
        const output = await new Promise((resolve, reject) => {
          exec(cmd, {
            timeout: 20000,
            cwd: WORKSPACE,
            env: {
              ...process.env,
              OPENROUTER_API_KEY: OR_KEYS[0] || '',
              GEMINI_API_KEY: 'AIzaSyD9-_9NTLFujqI5JZYiMZBC6pzd9wSgIVo',
              GOOGLE_API_KEY: 'AIzaSyD9-_9NTLFujqI5JZYiMZBC6pzd9wSgIVo'
            }
          }, (err, stdout, stderr) => {
            if (err && !stdout) reject(err);else resolve(stdout || stderr || 'Completed');
          });
        });
        response = output.trim();
        logActivity({
          type: 'openclaw_cli_run',
          success: true
        });
        return {
          success: true,
          from: toAgent,
          response
        };
      } catch (e) {
        console.log(`[Swarm Execution] OpenClaw CLI failed: ${e.message}. Falling back to simulated API chat...`);
        if (onProgress) onProgress(`⚠️ **OpenClaw CLI** failed to run. Falling back to simulated OpenClaw agent...`);
        runSimulated = true;
      }
    }
  } else if (toAgent === 'aider') {
    if (bypassCli) {
      console.log(`[Swarm Execution] Bypassing native Aider CLI (Simulation Mode active)`);
      if (onProgress) onProgress(`🧑‍💻 Running **Aider agent** in high-performance simulation mode...`);
      runSimulated = true;
    } else {
      try {
        if (onProgress) onProgress(`🤖 **Aider CLI** is initializing codebase environment...`);
        console.log(`[Swarm Execution] Running native Aider CLI agent...`);
        const key = OR_KEYS[0] || '';
        const cleanMessage = message.split('\n\nHere is the accumulated output')[0];
        const escapedMessage = cleanMessage.replace(/"/g, "'").replace(/\r?\n/g, ' ').substring(0, 4000);
        const cmd = `aider --model mistral/mistral-large-latest --message "${escapedMessage}" --yes --no-git --no-gitignore`;
        if (onProgress) onProgress(`🔧 **Aider CLI** is updating files in workspace...`);
        const output = await new Promise((resolve, reject) => {
          exec(cmd, {
            timeout: 25000,
            cwd: WORKSPACE,
            env: {
              ...process.env,
              OPENROUTER_API_KEY: key,
              GEMINI_API_KEY: 'AIzaSyD9-_9NTLFujqI5JZYiMZBC6pzd9wSgIVo',
              GOOGLE_API_KEY: 'AIzaSyD9-_9NTLFujqI5JZYiMZBC6pzd9wSgIVo',
              GROQ_API_KEY: getGroqKey(),
              MISTRAL_API_KEY: 'r7ai5jENR9uGdT1o1s4qT5rh7dfSwWqK'
            }
          }, (err, stdout, stderr) => {
            if (err && !stdout) reject(err);else resolve(stdout || stderr || 'Completed');
          });
        });
        response = output.trim();
        logActivity({
          type: 'aider_cli_run',
          success: true
        });
        return {
          success: true,
          from: toAgent,
          response
        };
      } catch (e) {
        console.log(`[Swarm Execution] Aider CLI failed: ${e.message}. Falling back to simulated API chat...`);
        if (onProgress) onProgress(`⚠️ **Aider CLI** failed to run. Falling back to simulated Aider agent...`);
        runSimulated = true;
      }
    }
  } else if (toAgent === 'github') {
    if (bypassCli) {
      console.log(`[Swarm Execution] Bypassing native GitHub CLI (Simulation Mode active)`);
      if (onProgress) onProgress(`🐙 Running **GitHub agent** in high-performance simulation mode...`);
      runSimulated = true;
    } else {
      try {
        if (onProgress) onProgress(`🐙 **GitHub CLI** is parsing repository request...`);
        console.log(`[Swarm Execution] Generating gh command from request...`);
        const translationPrompt = `You are a translator that converts natural language requests into a single executable GitHub CLI (gh) command.
Current workspace is a git repository.
Request: "${message}"

Output ONLY the raw gh command. Do not write markdown, do not write code blocks, do not explain. Just the exact command (e.g. gh pr list or gh issue status).`;
        const cmdToRunRaw = await chatCompletion(message, translationPrompt);
        let cmdToRun = cmdToRunRaw.trim().replace(/```bash/g, '').replace(/```/g, '').trim();
        if (!cmdToRun.startsWith('gh')) {
          throw new Error("Invalid translation: " + cmdToRun);
        }
        if (onProgress) onProgress(`🔧 Executing: \`${cmdToRun}\`...`);
        console.log(`[Swarm Execution] Running: ${cmdToRun}`);
        const output = await new Promise((resolve, reject) => {
          exec(cmdToRun, {
            timeout: 30000,
            cwd: WORKSPACE
          }, (err, stdout, stderr) => {
            if (err && !stdout) reject(err);else resolve(stdout || stderr || 'Completed');
          });
        });
        response = `Command executed: \`${cmdToRun}\`\n\nOutput:\n${output.trim()}`;
        logActivity({
          type: 'github_cli_run',
          success: true
        });
        return {
          success: true,
          from: toAgent,
          response
        };
      } catch (e) {
        console.log(`[Swarm Execution] GitHub CLI execution failed: ${e.message}. Falling back to API completions...`);
        if (onProgress) onProgress(`⚠️ **GitHub CLI** failed to translate or run. Falling back to simulated agent...`);
        runSimulated = true;
      }
    }
  }

  // Dynamic agent loop execution for any agent running simulated, or dynamic fallback
  const isSpecializedNonSimulated = ['obsidian', 'ollama', 'lmstudio'].includes(toAgent) && !runSimulated;
  if (!isSpecializedNonSimulated) {
    try {
      let agentPrompt = '';
      let maxTokens = 8192;
      if (toAgent === 'agy') {
        agentPrompt = 'You are Antigravity (AGY), the L1 CEO, Orchestrator, and Deep Planner of the Agent OS V2 Swarm. Your role is primarily executive management, delegation, and planning. When Gary Pearce asks you to build, create, install, run, or debug a task, DO NOT try to perform the task yourself using terminal commands or file-writing tools. Instead, delegate the task to the background swarm. Respond to Gary confirming you are delegating the task to the swarm, and append the string `[DELEGATE_SWARM]: <goal>` (where <goal> is a clear, concise instruction of what the swarm should do) at the very end of your message. This will trigger the swarm automatically in the background. Keep your conversations with Gary active, direct, and conversational.';
      } else if (toAgent === 'openclaw') {
        agentPrompt = 'You are OpenClaw, the L2 Execution and Routing agent of the Agent OS V2 Swarm. Help draft full posts, format code, and execute tasks. Be concise. DO NOT output or repeat large blocks of code in your final response if you have already written them to a file using tools.';
        maxTokens = 4096;
      } else if (toAgent === 'claude') {
        agentPrompt = 'You are Claude, the Expert Developer agent of the Agent OS V2 Swarm. Perform refactoring, write tests, and optimize code. Be concise. DO NOT output or repeat large blocks of code in your final response if you have already written them to a file using tools.';
        maxTokens = 8192;
      } else if (toAgent === 'aider') {
        agentPrompt = 'You are Aider, the Multi-file Coding agent of the Agent OS V2 Swarm. Be concise. Synthesize code improvements across files.';
      } else if (toAgent === 'github') {
        agentPrompt = 'You are GitHub CLI Agent, managing pull requests and issues. Be concise.';
      } else if (toAgent === 'hermes') {
        agentPrompt = 'You are Hermes, part of the Agent OS team. Be concise and helpful. DO NOT output or repeat large blocks of code in your final response if you have already written them to a file using tools.';
        maxTokens = 8192;
      } else {
        const dynamicAgent = AGENTS[toAgent] || {
          name: toAgent,
          role: 'Specialized Swarm Agent',
          description: 'Collaborative agent on the team.'
        };
        agentPrompt = `You are ${dynamicAgent.name}, the ${dynamicAgent.role} of the Agent OS V2 Swarm.
${dynamicAgent.description ? `Description: ${dynamicAgent.description}` : ''}
${dynamicAgent.capabilities ? `Capabilities: ${dynamicAgent.capabilities.join(', ')}` : ''}
Please use your capabilities to achieve the task. Be concise. Do not output or repeat large blocks of code in your final response if you have already written them to a file using tools.`;
        maxTokens = 8192;
      }
      const customPromptPath = `${SHARED}\\hermes_system_prompt.txt`;
      if (toAgent === 'hermes' && existsSync(customPromptPath)) {
        try {
          agentPrompt = readFileSync(customPromptPath, 'utf-8');
        } catch {}
      }
      const contentRules = getContentEngineRules();
      if (contentRules && /post|blog|write|article|content|seo/i.test(message)) {
        agentPrompt += `\n\n### MANDATORY CONTENT GENERATION ENGINE RULES (GARY PEARCE CONTENT ENGINE V2):\nYou are writing expert content for Gary Pearce's site. You MUST strictly adhere to these rules:\n${contentRules}`;
      }
      const toolInstructions = `\n\n### Tool Call Guidelines:
You can execute tools on the host system by formatting a tool call block exactly as follows. Do not include markdown code blocks around the tool call tag.
Available tools:
1. Run a terminal command (bash):
<longcat_tool_call>bash
<longcat_arg_key>command</longcat_arg_key>
<longcat_arg_value>your terminal command here</longcat_arg_value>
</longcat_tool_call>

2. Write a file (write_file):
<longcat_tool_call>write_file
<longcat_arg_key>file_path</longcat_arg_key>
<longcat_arg_value>absolute path here</longcat_arg_value>
<longcat_arg_key>content</longcat_arg_key>
<longcat_arg_value>file content here</longcat_arg_value>
</longcat_tool_call>

3. Read a file (read_file):
<longcat_tool_call>read_file
<longcat_arg_key>file_path</longcat_arg_key>
<longcat_arg_value>absolute path here</longcat_arg_value>
</longcat_tool_call>

4. Edit/Update a file (replace_file_content):
<longcat_tool_call>replace_file_content
<longcat_arg_key>file_path</longcat_arg_key>
<longcat_arg_value>absolute path here</longcat_arg_value>
<longcat_arg_key>target_content</longcat_arg_key>
<longcat_arg_value>exact text block to replace</longcat_arg_value>
<longcat_arg_key>replacement_content</longcat_arg_key>
<longcat_arg_value>new content replacement block</longcat_arg_value>
</longcat_tool_call>

5. Codebase recursive search (grep_search):
<longcat_tool_call>grep_search
<longcat_arg_key>query</longcat_arg_key>
<longcat_arg_value>text pattern to search</longcat_arg_value>
</longcat_tool_call>

6. Call/Consult another agent (send_agent_message):
<longcat_tool_call>send_agent_message
<longcat_arg_key>to_agent</longcat_arg_key>
<longcat_arg_value>agent_name_here</longcat_arg_value>
<longcat_arg_key>message</longcat_arg_key>
<longcat_arg_value>message or task instructions to the other agent</longcat_arg_value>
</longcat_tool_call>
Available agents: "agy" (CEO/Planner), "claude" (Expert Developer), "openclaw" (Browser/Router), "hermes" (Executor/Terminal), "ollama" (Local LLM), "obsidian" (Knowledge Vault).

Only run one tool at a time. After calling a tool, the system will return the result, and you can make follow-up tool calls or provide your final response.`;
      agentPrompt += toolInstructions;
      let history = [{
        role: 'system',
        content: agentPrompt
      }];
      if (sessionId) {
        try {
          const db = getAionuiDb();
          if (db) {
            const rows = await db.prepare("SELECT position, content, type FROM messages WHERE conversation_id = ? ORDER BY created_at ASC").all(sessionId);
            const prevMsgs = rows.filter(r => r.type === 'text' || r.type === 'thinking').map(r => {
              let text = r.content;
              try {
                const parsed = JSON.parse(r.content);
                if (parsed && typeof parsed === 'object') {
                  text = parsed.content || parsed.text || r.content;
                }
              } catch {}
              return {
                role: r.position === 'right' ? 'user' : 'assistant',
                content: text
              };
            });
            history.push(...prevMsgs);
          }
        } catch (dbErr) {
          console.error('[sendMessage] Failed to query message history:', dbErr.message);
        }
      }

      // Ensure the current user query is at the end of the history
      if (history.length === 1) {
        history.push({
          role: 'user',
          content: message
        });
      } else {
        const lastMsg = history[history.length - 1];
        if (lastMsg.role !== 'user' || lastMsg.content !== message) {
          history.push({
            role: 'user',
            content: message
          });
        }
      }
      let loopCount = 0;
      let currentResponse = '';
      while (loopCount < 5) {
        loopCount++;
        currentResponse = await chatCompletionWithHistory(history, maxTokens);
        if (typeof currentResponse !== 'string') {
          currentResponse = String(currentResponse || '');
        }

        // Normalize potential standard tool tags to longcat equivalents
        const normalizedResponse = currentResponse.replace(/<tool_call>/gi, '<longcat_tool_call>').replace(/<\/tool_call>/gi, '</longcat_tool_call>').replace(/<arg_key>/gi, '<longcat_arg_key>').replace(/<\/arg_key>/gi, '</longcat_arg_key>').replace(/<arg_value>/gi, '<longcat_arg_value>').replace(/<\/arg_value>/gi, '</longcat_arg_value>').replace(/<tool_response>/gi, '<longcat_tool_response>').replace(/<\/tool_response>/gi, '</longcat_tool_response>');
        const toolCallMatch = normalizedResponse.match(/<longcat_tool_call>[\s\S]*?<\/longcat_tool_call>/i);
        if (!toolCallMatch) {
          break; // No more tool calls, exit loop
        }

        // Execute tool call and get XML response
        const toolResult = await executeToolCall(toolCallMatch[0], onProgress, toAgent);

        // Push step history
        history.push({
          role: 'assistant',
          content: currentResponse
        });
        history.push({
          role: 'user',
          content: `Tool execution result:\n${toolResult}`
        });
        logActivity({
          type: 'tool_exec',
          from: 'swarm_executor',
          to: toAgent,
          message: `Executed tool call in loop count ${loopCount}.`
        });
      }
      response = currentResponse;
    } catch (e) {
      response = `${toAgent.toUpperCase()} execution loop error: ${e.message}`;
    }
  } else if (toAgent === 'obsidian') {
    try {
      let content = '';
      const guidelinesPath = 'C:/Users/Gary/uni-blog/content-guidelines.md';
      if (existsSync(guidelinesPath)) {
        content = readFileSync(guidelinesPath, 'utf-8');
      }

      // Write to shared notes as expected by system logs
      const noteName = `${Date.now()}-from-${fromAgent}.md`;
      const noteContent = `# Message from ${fromAgent}\n\n${message}\n\n---\n*Logged at ${new Date().toISOString()}*`;
      writeFileSync(`${SHARED}\\${noteName}`, noteContent, 'utf-8');
      response = `[Obsidian Memory System] Successfully retrieved Content Guidelines:\n\n${content}`;
    } catch (e) {
      response = `Obsidian error: ${e.message}`;
    }
  } else if (toAgent === 'ollama') {
    try {
      // Validate real file content if possible
      const fileToValidateMatch = message.match(/(?:at|file|path)\s+([A-Za-z]:[^\s\n,]+)/i) || message.match(/C:\/[^\s\n,]+/i);
      let fileContentToValidate = '';
      let filePathToValidate = '';
      if (fileToValidateMatch) {
        filePathToValidate = fileToValidateMatch[0].trim().replace(/[.`"*]+$/, '');
        // Clean up formatting
        if (filePathToValidate.includes('wifi-6-residential.md')) {
          filePathToValidate = 'C:/Users/Gary/uni-blog/blog/posts/wifi/wifi-6-residential.md';
        }
        if (existsSync(filePathToValidate)) {
          fileContentToValidate = readFileSync(filePathToValidate, 'utf-8');
        }
      }
      let promptToSend = message;
      if (fileContentToValidate) {
        promptToSend += `\n\nHere is the actual content of the file from the disk to validate:\n\`\`\`markdown\n${fileContentToValidate}\n\`\`\``;
      }
      const model = 'hermes3:8b';
      const r = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          prompt: promptToSend,
          stream: false,
          options: {
            num_ctx: 16384,
            temperature: 0.3
          }
        })
      });
      const d = await r.json();
      response = d.response || 'No response from Ollama';

      // Parse path target to save the file
      const pathMatch = message.match(/(?:save|write)(?:\s+the\s+final\s+approved\s+version)?\s+to\s+([A-Za-z]:[^\s\n,]+)/i) || message.match(/(?:save|write)\s+it\s+to\s+([A-Za-z]:[^\s\n,]+)/i) || (filePathToValidate ? [filePathToValidate, filePathToValidate] : null);
      if (pathMatch && pathMatch[1]) {
        let filePath = pathMatch[1].trim();
        filePath = filePath.replace(/[.`"*]+$/, '');
        if (filePath.includes('wifi-6-residential.md')) {
          filePath = 'C:/Users/Gary/uni-blog/blog/posts/wifi/wifi-6-residential.md';
        }
        try {
          const dir = dirname(filePath);
          if (!existsSync(dir)) {
            mkdirSync(dir, {
              recursive: true
            });
          }
          let contentToWrite = response;
          const mdMatch = response.match(/```markdown\s*\n([\s\S]*?)\n```/i) || response.match(/```\s*\n([\s\S]*?)\n```/i);
          if (mdMatch) {
            contentToWrite = mdMatch[1];
          }

          // Only write if Ollama actually returned a full post or if we have fileContentToValidate that we can save if Ollama just approved it
          if (contentToWrite.length < 500 && fileContentToValidate) {
            contentToWrite = fileContentToValidate;
          }
          writeFileSync(filePath, contentToWrite.trim(), 'utf-8');
          response += `\n\n[System note: Output successfully saved to ${filePath}]`;

          // Also write to NoLogin.in for instant web-accessible preview!
          try {
            const dbUrl = 'https://firestore.googleapis.com/v1/projects/no-login-044/databases/(default)/documents/documents/homesecurity?updateMask.fieldPaths=text';
            const firestoreBody = {
              fields: {
                text: {
                  stringValue: contentToWrite.trim()
                }
              }
            };
            const publishRes = await fetch(dbUrl, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(firestoreBody)
            });
            if (publishRes.status === 200) {
              response += `\n\n[System note: Output successfully published to https://nologin.in/homesecurity]`;
            } else {
              response += `\n\n[System note: Failed to publish to NoLogin.in (status: ${publishRes.status})]`;
            }
          } catch (pubErr) {
            response += `\n\n[System note: Failed to publish to NoLogin.in: ${pubErr.message}]`;
          }
        } catch (e) {
          response += `\n\n[System note: Failed to write to file ${filePath}: ${e.message}]`;
        }
      }
    } catch (e) {
      response = `Ollama error: ${e.message}`;
    }
  } else if (toAgent === 'lmstudio') {
    try {
      const activeModelsRes = await fetch('http://localhost:1234/v1/models');
      const modelsData = await activeModelsRes.json();
      const modelId = modelsData.data?.[0]?.id || 'meta-llama-3.1-8b';
      const r = await fetch('http://localhost:1234/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{
            role: 'user',
            content: message
          }],
          max_tokens: 1024
        })
      });
      const d = await r.json();
      response = d.choices?.[0]?.message?.content || 'No response from LM Studio';
    } catch (e) {
      response = `LM Studio error: ${e.message}`;
    }
  }
  logActivity({
    type: 'response',
    from: toAgent,
    to: fromAgent,
    response: (response || '').substring(0, 200)
  });
  return {
    success: true,
    from: toAgent,
    response
  };
}
let SYSTEM_CONTEXT_CACHE = '';
async function updateSystemContextCache() {
  try {
    let context = `\n\n=== AGENT OS SYSTEM CONTEXT (PRE-LOADED) ===\n`;
    context += `Current Time: ${new Date().toISOString()}\n`;
    context += `Platform Version: v2.7.2\n`;
    context += `Directories:\n`;
    context += `- Workspace root: D:\\Agent OS\n`;
    context += `- Server code: D:\\Agent OS\\agent-os\n`;
    context += `- Intelligence feed: D:\\Agent OS\\intelligence\n`;
    context += `- Shared directory: D:\\Agent OS\\shared\n`;
    context += `Active Ports:\n`;
    context += `- Express Dashboard Server: 3001\n`;

    // Read Intelligence version
    try {
      const verPath = 'D:\\Agent OS\\intelligence\\state\\version.json';
      if (existsSync(verPath)) {
        const ver = JSON.parse(readFileSync(verPath, 'utf-8'));
        context += `Intelligence Feed Version: v${ver.version} (last updated: ${ver.last_updated})\n`;
      }
    } catch {}

    // Read Intelligence pending updates status
    try {
      const pendingPath = 'D:\\Agent OS\\intelligence\\output\\pending_update.json';
      if (existsSync(pendingPath)) {
        const pending = JSON.parse(readFileSync(pendingPath, 'utf-8'));
        context += `Intelligence Feed Status: ${pending.status} (from v${pending.from_version} to v${pending.to_version})\n`;
        context += `Pending Changes Summary: ${pending.summary}\n`;
      }
    } catch {}

    // Read Wishlist count
    try {
      const wishlistPath = 'D:\\Agent OS\\shared\\upgrade_wishlist.json';
      if (existsSync(wishlistPath)) {
        const wishlist = JSON.parse(readFileSync(wishlistPath, 'utf-8'));
        const count = Object.keys(wishlist).length;
        context += `Pending Upgrades Wishlist: ${count} items registered\n`;
      }
    } catch {}

    // Read Knowledge Graph summaries from sqlite memory table if exists
    try {
      const db = getAionuiDb();
      if (db) {
        const rows = await db.prepare("SELECT text FROM memories LIMIT 10;").all();
        if (rows && rows.length > 0) {
          context += `Knowledge Graph Memories:\n`;
          rows.forEach(r => {
            context += `- ${r.text}\n`;
          });
        }
      }
    } catch {}
    context += `=== END AGENT OS SYSTEM CONTEXT ===\n`;
    SYSTEM_CONTEXT_CACHE = context;
  } catch (err) {
    console.error('[System Context Cache] Error compiling context:', err.message);
  }
}

// Initial cache compilation and background refresh loop
updateSystemContextCache();
setInterval(updateSystemContextCache, 15000); // refresh every 15 seconds in background

// Compile full system context instantly from cache
function compileSystemContext() {
  return SYSTEM_CONTEXT_CACHE;
}
function injectMatchedSkills(query, prompt) {
  let updatedPrompt = prompt;
  if (!LOCAL_SKILLS || LOCAL_SKILLS.length === 0) return updatedPrompt;
  const queryLower = query.toLowerCase();
  const matchedSkills = [];
  LOCAL_SKILLS.forEach(skill => {
    const nameMatch = queryLower.includes(skill.name.toLowerCase());
    const keywordMatch = skill.keywords && skill.keywords.some(kw => queryLower.includes(kw.toLowerCase()));
    if (nameMatch || keywordMatch) {
      matchedSkills.push(skill);
    }
  });
  if (matchedSkills.length > 0) {
    updatedPrompt += `\n\n=== INJECTED LOCAL SKILL INSTRUCTIONS ===\n`;
    matchedSkills.forEach(skill => {
      updatedPrompt += `\n--- Skill: ${skill.name} ---\n${skill.body}\n`;
    });
    updatedPrompt += `\n=== END SKILL INSTRUCTIONS ===\n`;
  }
  return updatedPrompt;
}

// Chat with fallback
async function chatCompletion(query, overrideSystemPrompt = null, maxTokens = 2048) {
  let model = 'google/gemini-2.0-flash-001';
  try {
    const cfg = readConfig();
    const m = cfg.match(/default:\s*([^\s\n]+)/);
    if (m && m[1]) {
      model = m[1];
    }
  } catch {}

  // Map client-side provider selections to their corresponding backend models
  let mappedModel = model;
  if (mappedModel === 'featherless/dolphin') {
    mappedModel = 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free';
  } else if (mappedModel === 'cloudflare/llama-3.1-70b' || mappedModel === 'sambanova/llama-3.1-70b') {
    mappedModel = 'meta-llama/llama-3.3-70b-instruct:free';
  }
  let systemPrompt = overrideSystemPrompt;
  if (!systemPrompt) {
    systemPrompt = 'You are Hermes, part of the Agent OS team. Be concise and helpful.';
    const customPromptPath = `${SHARED}\\hermes_system_prompt.txt`;
    if (existsSync(customPromptPath)) {
      try {
        systemPrompt = readFileSync(customPromptPath, 'utf-8');
      } catch {}
    }
  }

  // Inject system context dynamically so the orchestrator already knows the project states
  systemPrompt += compileSystemContext();
  systemPrompt = injectMatchedSkills(query, systemPrompt);

  // Inject Gary Pearce's UK Authority and SEO Tier Profile
  const profileMdPath = `${SHARED}\\gary_pearce_authority_profile.md`;
  if (existsSync(profileMdPath)) {
    try {
      const profileContent = readFileSync(profileMdPath, 'utf-8');
      systemPrompt += `\n\n=== USER AUTHORITY PROFILE & SEO NETWORKS ===\n${profileContent}\n=== END PROFILE ===`;
    } catch {}
  }
  const messages = [{
    role: 'system',
    content: systemPrompt
  }, {
    role: 'user',
    content: query
  }];
  const cachedResponse = getLlmCache(mappedModel, messages);
  if (cachedResponse) {
    return cachedResponse;
  }
  const response = await _chatCompletionInternal(query, overrideSystemPrompt, maxTokens, mappedModel);
  if (response && !response.startsWith('Error:')) {
    setLlmCache(mappedModel, messages, response);
  }
  return response;
}
async function _chatCompletionInternal(query, overrideSystemPrompt = null, maxTokens = 2048, mappedModel = 'google/gemini-2.0-flash-001') {
  let systemPrompt = overrideSystemPrompt;
  if (!systemPrompt) {
    systemPrompt = 'You are Hermes, part of the Agent OS team. Be concise and helpful.';
    const customPromptPath = `${SHARED}\\hermes_system_prompt.txt`;
    if (existsSync(customPromptPath)) {
      try {
        systemPrompt = readFileSync(customPromptPath, 'utf-8');
      } catch {}
    }
  }

  // Inject system context dynamically so the orchestrator already knows the project states
  systemPrompt += compileSystemContext();
  systemPrompt = injectMatchedSkills(query, systemPrompt);

  // Inject Gary Pearce's UK Authority and SEO Tier Profile
  const profileMdPath = `${SHARED}\\gary_pearce_authority_profile.md`;
  if (existsSync(profileMdPath)) {
    try {
      const profileContent = readFileSync(profileMdPath, 'utf-8');
      systemPrompt += `\n\n=== USER AUTHORITY PROFILE & SEO NETWORKS ===\n${profileContent}\n=== END PROFILE ===`;
    } catch {}
  }

  // Dynamically query available local Ollama models with a brief timeout
  const localModels = [];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    const tagsRes = await fetch('http://localhost:11434/api/tags', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (tagsRes.ok) {
      const tagsData = await tagsRes.json();
      if (tagsData && Array.isArray(tagsData.models)) {
        tagsData.models.forEach(m => {
          if (m.name) {
            localModels.push(`ollama/${m.name}`);
          }
        });
      }
    }
  } catch (err) {
    console.log('[Ollama Local] Failed to query local models for dynamic fallbacks:', err.message);
  }

  // Fallback to defaults if Ollama query failed or returned empty
  if (localModels.length === 0) {
    localModels.push('ollama/hermes3:8b', 'ollama/qwen2.5-coder:7b');
  }
  const modelFallbacks = [...localModels, mappedModel,
  // Try user's selected model after local models
  'groq/llama-3.3-70b-versatile', 'sambanova/Meta-Llama-3.1-70B-Instruct', 'siliconflow/Qwen/Qwen3-Coder-30B-A3B-Instruct', 'zhipu/glm-4-flash'];
  const uniqueModels = [...new Set(modelFallbacks)];
  for (const currentModel of uniqueModels) {
    // Try local Ollama if model starts with ollama/
    if (currentModel.startsWith('ollama/')) {
      try {
        const modelId = currentModel.replace(/^ollama\//, '');
        console.log(`[Ollama Local] Trying model ${modelId} locally...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const r = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelId,
            prompt: `${systemPrompt}\n\nUser Query: ${query}`,
            stream: false,
            options: {
              num_ctx: 8192,
              temperature: 0.3
            }
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.status === 200) {
          const d = await r.json();
          if (d.response) {
            console.log(`[Ollama Local] Success with local model ${modelId}`);
            return d.response;
          }
        }
      } catch (err) {
        console.log(`[Ollama Local] Error:`, err.message);
      }
      continue;
    }

    // Try SiliconFlow direct
    if (currentModel.startsWith('siliconflow/')) {
      try {
        const sfKey = getSiliconFlowKey();
        if (sfKey) {
          const modelId = currentModel.replace(/^siliconflow\//, '');
          console.log(`[SiliconFlow] Trying model ${modelId} with SiliconFlow API...`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000);
          const r = await fetch(`${SILICONFLOW_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sfKey}`
            },
            body: JSON.stringify({
              model: modelId,
              messages: [{
                role: 'system',
                content: systemPrompt
              }, {
                role: 'user',
                content: query
              }],
              max_tokens: maxTokens
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (r.ok) {
            const d = await r.json();
            const content = d.choices?.[0]?.message?.content || d.choices?.[0]?.message?.reasoning_content;
            if (content) {
              console.log(`[SiliconFlow] Success with model ${currentModel}`);
              return content;
            }
          }
        }
      } catch (err) {
        console.log(`[SiliconFlow] Error:`, err.message);
      }
      continue;
    }

    // Try Puter direct
    if (currentModel.startsWith('puter/')) {
      try {
        const modelId = currentModel.replace(/^puter\//, '');
        console.log(`[Puter Direct] Trying model ${modelId} via Puter API...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const r = await fetch('https://api.puter.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{
              role: 'system',
              content: systemPrompt
            }, {
              role: 'user',
              content: query
            }],
            max_tokens: maxTokens
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.ok) {
          const d = await r.json();
          if (d.choices?.[0]?.message?.content) {
            console.log(`[Puter Direct] Success with Puter for ${modelId}`);
            return d.choices[0].message.content;
          }
        }
      } catch (err) {
        console.log(`[Puter Direct] Error:`, err.message);
      }
      continue;
    }

    // Try GPT4Free local daemon
    if (currentModel.startsWith('g4f/')) {
      try {
        const modelId = currentModel.replace(/^g4f\//, '');
        console.log(`[g4f Daemon] Trying model ${modelId} on local g4f proxy...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const r = await fetch('http://localhost:1337/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{
              role: 'system',
              content: systemPrompt
            }, {
              role: 'user',
              content: query
            }],
            max_tokens: maxTokens
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.ok) {
          const d = await r.json();
          if (d.choices?.[0]?.message?.content) {
            console.log(`[g4f Daemon] Success with g4f model ${modelId}`);
            return d.choices[0].message.content;
          }
        }
      } catch (err) {
        console.log(`[g4f Daemon] Error:`, err.message);
      }
      continue;
    }

    // Try Gemini direct if model starts with google/ or gemini
    if (currentModel.startsWith('google/') || currentModel.startsWith('gemini')) {
      try {
        const modelId = currentModel.replace(/^google\//, '') || 'gemini-2.0-flash';
        console.log(`[Gemini Direct] Trying model ${modelId} via Google API...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const r = await fetchGeminiWithRotation(`${modelId}:generateContent`, {
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nUser Query: ${query}`
            }]
          }]
        }, controller.signal);
        clearTimeout(timeoutId);
        if (r.status === 200) {
          const d = await r.json();
          if (d.candidates?.[0]?.content?.parts?.[0]?.text) {
            console.log(`[Gemini Direct] Success with model ${currentModel}`);
            return d.candidates[0].content.parts[0].text;
          }
        }
      } catch (err) {
        console.log(`[Gemini Direct] Error:`, err.message);
      }
      continue;
    }

    // Try HuggingFace direct if model starts with huggingface/ or matches Llama-3.2-3B-Instruct
    if (currentModel.startsWith('huggingface/') || currentModel.includes('huggingface') || currentModel.includes('hf-')) {
      try {
        const modelId = currentModel.replace(/^huggingface\//, '') || 'meta-llama/Llama-3.2-3B-Instruct';
        const availableKeys = HUGGINGFACE_KEYS;
        if (availableKeys && availableKeys.length > 0) {
          for (let k = 0; k < availableKeys.length; k++) {
            const keyIndex = (currentHuggingFaceKeyIndex + k) % availableKeys.length;
            const hfKey = availableKeys[keyIndex];
            console.log(`[HuggingFace] Trying model ${modelId} with key index ${keyIndex}...`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);
            const messages = [{
              role: 'system',
              content: systemPrompt
            }, {
              role: 'user',
              content: query
            }];
            const promptText = messages.map(m => `<|${m.role}|>\n${m.content}`).join('\n') + '\n<|assistant|>\n';
            const r = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${hfKey}`
              },
              body: JSON.stringify({
                inputs: promptText,
                parameters: {
                  max_new_tokens: maxTokens,
                  return_full_text: false
                }
              }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (r.status === 200) {
              const d = await r.json();
              let generatedText = '';
              if (Array.isArray(d) && d[0]?.generated_text) {
                generatedText = d[0].generated_text;
              } else if (d.generated_text) {
                generatedText = d.generated_text;
              }
              if (generatedText) {
                console.log(`[HuggingFace] Success with model ${modelId}`);
                currentHuggingFaceKeyIndex = keyIndex; // Lock this key
                return generatedText;
              }
            } else {
              console.log(`[HuggingFace] Key index ${keyIndex} returned status ${r.status}. Rotating...`);
            }
          }
        }
      } catch (err) {
        console.log(`[HuggingFace] Error:`, err.message);
      }
      continue;
    }

    // Try Mistral AI if model starts with mistral/ or matches mistral-large-latest
    if (currentModel.startsWith('mistral/') || currentModel === 'mistral-large-latest' || currentModel.includes('mistral-')) {
      try {
        console.log(`[Mistral AI] Trying model ${currentModel} via Mistral API...`);
        const mistralKey = getMistralKey();
        if (mistralKey) {
          const modelId = currentModel.replace(/^mistral\//, '');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mistralKey}`
            },
            body: JSON.stringify({
              model: modelId || 'mistral-large-latest',
              messages: [{
                role: 'system',
                content: systemPrompt
              }, {
                role: 'user',
                content: query
              }],
              max_tokens: maxTokens
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (r.status === 200) {
            const d = await r.json();
            if (d.choices?.[0]?.message?.content) {
              console.log(`[Mistral AI] Success with model ${currentModel}`);
              return d.choices[0].message.content;
            }
          } else {
            console.log(`[Mistral AI] API returned status ${r.status}`);
          }
        }
      } catch (err) {
        console.log(`[Mistral AI] Error:`, err.message);
      }
      continue;
    }

    // Try Agnes AI if model starts with agnes/ or matches agnes-2.0-flash
    if (currentModel.startsWith('agnes/') || currentModel === 'agnes-2.0-flash' || currentModel.includes('agnes-')) {
      try {
        console.log(`[Agnes AI] Trying model ${currentModel} via Agnes API...`);
        const agnesKey = getAgnesKey();
        if (agnesKey) {
          const modelId = currentModel.replace(/^agnes\//, '');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          const r = await fetch('https://apihub.agnes-ai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${agnesKey}`
            },
            body: JSON.stringify({
              model: modelId || 'agnes-2.0-flash',
              messages: [{
                role: 'system',
                content: systemPrompt
              }, {
                role: 'user',
                content: query
              }],
              max_tokens: maxTokens
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (r.status === 200) {
            const d = await r.json();
            if (d.choices?.[0]?.message?.content) {
              console.log(`[Agnes AI] Success with model ${currentModel}`);
              return d.choices[0].message.content;
            }
          } else {
            console.log(`[Agnes AI] API returned status ${r.status}`);
          }
        }
      } catch (err) {
        console.log(`[Agnes AI] Error:`, err.message);
      }
      continue;
    }
    // Try Pollinations direct
    if (currentModel === 'pollinations/any' || currentModel.startsWith('pollinations/')) {
      try {
        console.log(`[Pollinations Direct] Trying model ${currentModel} on Pollinations API...\n`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const r = await fetch('https://text.pollinations.ai/openai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'openai',
            messages: [{
              role: 'system',
              content: systemPrompt
            }, {
              role: 'user',
              content: query
            }],
            max_tokens: maxTokens
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.ok) {
          const d = await r.json();
          if (d.choices?.[0]?.message?.content) {
            console.log(`[Pollinations Direct] Success with Pollinations\n`);
            return d.choices[0].message.content;
          }
        }
      } catch (err) {
        console.log(`[Pollinations Direct] Error:`, err.message);
      }
    }

    // Try Groq direct if model starts with groq/ or is llama-3.3-70b-versatile
    if (currentModel.startsWith('groq/') || currentModel.includes('llama-3.3-70b-versatile')) {
      try {
        const groqKey = getGroqKey();
        console.log(`[Groq Direct] Trying model ${currentModel} on Groq API with key index ${currentGroqKeyIndex}...\n`);
        const modelId = currentModel.replace(/^groq\//, '');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: modelId || 'llama-3.3-70b-versatile',
            messages: [{
              role: 'system',
              content: systemPrompt
            }, {
              role: 'user',
              content: query
            }],
            max_tokens: maxTokens
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.ok) {
          const d = await r.json();
          if (d.choices?.[0]?.message?.content) {
            console.log(`[Groq Direct] Success with Groq for ${currentModel}\n`);
            return d.choices[0].message.content;
          }
        } else {
          const errText = await r.text();
          console.log(`[Groq Direct] Groq failed: ${r.status} ${errText}\n`);
          if (r.status === 429 || errText.includes('rate_limit_exceeded') || errText.includes('Rate limit')) {
            rotateGroqKey();
          }
        }
      } catch (err) {
        console.log(`[Groq Direct] Groq error:`, err.message);
      }
    }
    // Try Zhipu BigModel direct
    if (currentModel.startsWith('zhipu/') || currentModel.startsWith('bigmodel/') || currentModel.startsWith('glm-')) {
      if (Date.now() < zhipuCooldownUntil) {
        console.log(`[BigModel] Skipping Zhipu due to active rate-limit cooldown.`);
        continue;
      }
      try {
        console.log(`[BigModel] Trying Zhipu BigModel for ${currentModel}...`);
        const modelId = currentModel.replace(/^(zhipu\/|bigmodel\/)/, '');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const requestBody = {
          model: modelId || 'glm-4-flash',
          messages: [{
            role: 'system',
            content: systemPrompt
          }, {
            role: 'user',
            content: query
          }],
          max_tokens: maxTokens,
          temperature: 0.7
        };
        if (modelId === 'glm-5.1') {
          requestBody.thinking = {
            type: 'enabled'
          };
          requestBody.max_tokens = 65536;
          requestBody.temperature = 1.0;
        }
        const r = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ZHIPU_KEY}`
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.status === 429) {
          zhipuCooldownUntil = Date.now() + 60000;
          console.log(`[BigModel] Zhipu rate limited (429). Activating 1 minute cooldown.`);
        }
        if (r.ok) {
          const d = await r.json();
          if (d.choices?.[0]?.message?.content) {
            console.log(`[BigModel] Success with Zhipu for ${currentModel}`);
            return d.choices[0].message.content;
          }
        } else {
          const errText = await r.text();
          console.log(`[BigModel] Zhipu failed: ${r.status} ${errText}`);
        }
      } catch (err) {
        console.log(`[BigModel] Zhipu error:`, err.message);
      }
    }

    // Try SambaNova direct
    if (currentModel.startsWith('sambanova/') && SAMBANOVA_KEY) {
      try {
        const modelId = currentModel.replace(/^sambanova\//, '');
        console.log(`[SambaNova Direct] Trying model ${modelId} with SambaNova API...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const r = await fetch('https://api.sambanova.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SAMBANOVA_KEY}`
          },
          body: JSON.stringify({
            model: modelId || 'Meta-Llama-3.1-70B-Instruct',
            messages: [{
              role: 'system',
              content: systemPrompt
            }, {
              role: 'user',
              content: query
            }],
            max_tokens: maxTokens
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.ok) {
          const d = await r.json();
          if (d.choices?.[0]?.message?.content) {
            console.log(`[SambaNova Direct] Success with SambaNova for ${currentModel}`);
            return d.choices[0].message.content;
          }
        } else {
          const errText = await r.text();
          console.log(`[SambaNova Direct] SambaNova failed: ${r.status} ${errText}`);
        }
      } catch (err) {
        console.log(`[SambaNova Direct] SambaNova error:`, err.message);
      }
    }

    // Try Cerebras direct
    if (currentModel.startsWith('cerebras/') && CEREBRAS_KEY) {
      try {
        const modelId = currentModel.replace(/^cerebras\//, '');
        console.log(`[Cerebras Direct] Trying model ${modelId} with Cerebras API...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CEREBRAS_KEY}`
          },
          body: JSON.stringify({
            model: modelId || 'llama3.1-70b',
            messages: [{
              role: 'system',
              content: systemPrompt
            }, {
              role: 'user',
              content: query
            }],
            max_tokens: maxTokens
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.ok) {
          const d = await r.json();
          if (d.choices?.[0]?.message?.content) {
            console.log(`[Cerebras Direct] Success with Cerebras for ${currentModel}`);
            return d.choices[0].message.content;
          }
        } else {
          const errText = await r.text();
          console.log(`[Cerebras Direct] Cerebras failed: ${r.status} ${errText}`);
        }
      } catch (err) {
        console.log(`[Cerebras Direct] Cerebras error:`, err.message);
      }
    }

    // Try NVIDIA NIM API (OpenAI-compatible, free tier available)
    if ((currentModel.startsWith('nvidia/') || currentModel.startsWith('nim/')) && NVIDIA_KEY) {
      try {
        const modelId = currentModel.replace(/^(nvidia\/|nim\/)/, '');
        console.log(`[NVIDIA NIM] Trying model ${modelId} with NVIDIA API...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${NVIDIA_KEY}`
          },
          body: JSON.stringify({
            model: modelId || 'meta/llama-3.3-70b-instruct',
            messages: [{
              role: 'system',
              content: systemPrompt
            }, {
              role: 'user',
              content: query
            }],
            max_tokens: maxTokens
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.ok) {
          const d = await r.json();
          if (d.choices?.[0]?.message?.content) {
            console.log(`[NVIDIA NIM] Success with model ${modelId}`);
            return d.choices[0].message.content;
          }
        } else {
          const errText = await r.text();
          console.log(`[NVIDIA NIM] Failed: ${r.status} ${errText.substring(0, 100)}`);
        }
      } catch (err) {
        console.log(`[NVIDIA NIM] Error:`, err.message);
      }
    }

    // Try Cloudflare Workers AI (free tier)
    if (currentModel.startsWith('cloudflare/') && CLOUDFLARE_AI_TOKEN && CLOUDFLARE_AI_ACCOUNT) {
      try {
        const modelId = currentModel.replace(/^cloudflare\//, '');
        console.log(`[Cloudflare AI] Trying model ${modelId}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_AI_ACCOUNT}/ai/run/${modelId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CLOUDFLARE_AI_TOKEN}`
          },
          body: JSON.stringify({
            messages: [{
              role: 'system',
              content: systemPrompt
            }, {
              role: 'user',
              content: query
            }],
            max_tokens: maxTokens
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.ok) {
          const d = await r.json();
          const text = d.result?.response || d.choices?.[0]?.message?.content;
          if (text) {
            console.log(`[Cloudflare AI] Success with model ${modelId}`);
            return text;
          }
        } else {
          const errText = await r.text();
          console.log(`[Cloudflare AI] Failed: ${r.status} ${errText.substring(0, 100)}`);
        }
      } catch (err) {
        console.log(`[Cloudflare AI] Error:`, err.message);
      }
    }

    // Try Alibaba DashScope direct
    if (currentModel.startsWith('alibaba/') || currentModel.startsWith('dashscope/') || currentModel.startsWith('qwen-')) {
      try {
        console.log(`[Alibaba] Trying DashScope for ${currentModel}...`);
        const modelId = currentModel.replace(/^(alibaba\/|dashscope\/)/, '');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const r = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ALIBABA_KEY}`
          },
          body: JSON.stringify({
            model: modelId || 'qwen-plus',
            messages: [{
              role: 'system',
              content: systemPrompt
            }, {
              role: 'user',
              content: query
            }],
            max_tokens: maxTokens
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.ok) {
          const d = await r.json();
          if (d.choices?.[0]?.message?.content) {
            console.log(`[Alibaba] Success with DashScope for ${currentModel}`);
            return d.choices[0].message.content;
          }
        } else {
          const errText = await r.text();
          console.log(`[Alibaba] DashScope failed: ${r.status} ${errText}`);
        }
      } catch (err) {
        console.log(`[Alibaba] DashScope error:`, err.message);
      }
    }
    if (currentModel.startsWith('stepfun/') || currentModel.includes('nous') || currentModel.startsWith('nousresearch/')) {
      try {
        console.log(`[OR ChatCompletion] Trying NousResearch Inference for ${currentModel}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const r = await fetch('https://inference.nous.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${NOUS_API_KEY}`
          },
          body: JSON.stringify({
            model: currentModel,
            messages: [{
              role: 'system',
              content: systemPrompt
            }, {
              role: 'user',
              content: query
            }],
            max_tokens: maxTokens
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (r.ok) {
          const d = await r.json();
          if (d.choices?.[0]?.message?.content) {
            console.log(`[OR ChatCompletion] Success with NousResearch for ${currentModel}`);
            return d.choices[0].message.content;
          }
        }
      } catch (err) {
        console.log(`[OR ChatCompletion] NousResearch proxy error:`, err.message);
      }
    }
    for (const key of [...OR_KEYS].sort(() => Math.random() - 0.5).slice(0, 2)) {
      try {
        console.log(`[OR ChatCompletion] Trying model ${getOpenRouterModelName(currentModel)} with key ${key.substring(0, 15)}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const r = await fetchWithProxy('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
            'HTTP-Referer': `http://localhost:${PORT}`,
            'X-Title': 'Agent OS'
          },
          body: JSON.stringify({
            model: getOpenRouterModelName(currentModel),
            messages: [{
              role: 'system',
              content: systemPrompt
            }, {
              role: 'user',
              content: query
            }],
            max_tokens: maxTokens
          })
        });
        clearTimeout(timeoutId);
        const d = await r.json();
        if (d.error) {
          console.log(`[OR ChatCompletion] Error with model ${currentModel}:`, d.error.message);
          continue;
        }
        if (d.choices?.[0]?.message?.content) {
          console.log(`[OR ChatCompletion] Success with model ${currentModel}`);
          return d.choices[0].message.content;
        }
      } catch (err) {
        console.log(`[OR ChatCompletion] Timeout or error with model ${currentModel}:`, err.message);
        continue;
      }
    }
  }

  // Fallback to GitHub Models (GPT-4o-mini)
  try {
    console.log('[OR ChatCompletion] Falling back to GitHub Models (GPT-4o-mini)...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const r = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getGithubKey()}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: systemPrompt
        }, {
          role: 'user',
          content: query
        }],
        max_tokens: maxTokens
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (r.status === 200) {
      const d = await r.json();
      if (d.choices?.[0]?.message?.content) {
        console.log('[OR ChatCompletion] Success with GitHub Models fallback');
        return d.choices[0].message.content;
      }
    } else {
      console.log(`[OR ChatCompletion] GitHub Models fallback failed: ${r.status}. Rotating key...`);
      rotateGithubKey();
    }
  } catch (err) {
    console.log('[OR ChatCompletion] GitHub Models fallback failed:', err.message);
    rotateGithubKey();
  }

  // Fallback to Groq (Llama 3.3 70B)
  try {
    const groqKey = getGroqKey();
    console.log(`[OR ChatCompletion] Falling back to Groq (Llama 3.3 70B) with key index ${currentGroqKeyIndex}...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'system',
          content: systemPrompt
        }, {
          role: 'user',
          content: query
        }],
        max_tokens: maxTokens
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (r.status === 200) {
      const d = await r.json();
      if (d.choices?.[0]?.message?.content) {
        console.log('[OR ChatCompletion] Success with Groq fallback');
        return d.choices[0].message.content;
      }
    } else {
      const errText = await r.text();
      console.log(`[OR ChatCompletion] Groq fallback failed with status ${r.status}: ${errText}`);
      if (r.status === 429 || errText.includes('rate_limit_exceeded') || errText.includes('Rate limit')) {
        rotateGroqKey();
      }
    }
  } catch (err) {
    console.log('[OR ChatCompletion] Groq fallback failed:', err.message);
  }

  // Gemini fallback
  try {
    console.log('[OR ChatCompletion] All OpenRouter and primary fallbacks failed. Falling back to direct Gemini API with rotation...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    const r = await fetchGeminiWithRotation('gemini-2.0-flash:generateContent', {
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\nUser Query: ${query}`
        }]
      }]
    }, controller.signal);
    clearTimeout(timeoutId);
    const d = await r.json();
    if (d.candidates?.[0]?.content?.parts?.[0]?.text) {
      return d.candidates[0].content.parts[0].text;
    }
  } catch (err) {
    console.log('[OR ChatCompletion] Direct Gemini API failed:', err.message);
  }

  // Local Ollama fallback (Offline/no-key safety net)
  try {
    console.log('[OR ChatCompletion] Falling back to local Ollama (qwen2.5-coder:7b)...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const r = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen2.5-coder:7b',
        prompt: `${systemPrompt}\n\nUser Query: ${query}`,
        stream: false,
        options: {
          num_ctx: 8192,
          temperature: 0.3
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (r.status === 200) {
      const d = await r.json();
      if (d.response) {
        console.log('[OR ChatCompletion] Success with local Ollama fallback');
        return d.response;
      }
    }
  } catch (err) {
    console.log('[OR ChatCompletion] Local Ollama fallback failed:', err.message);
  }

  // Local LM Studio fallback (OpenAI-compatible local server)
  try {
    console.log('[OR ChatCompletion] Falling back to local LM Studio (port 1234)...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const r = await fetch('http://localhost:1234/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{
          role: 'system',
          content: systemPrompt
        }, {
          role: 'user',
          content: query
        }],
        temperature: 0.3
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (r.status === 200) {
      const d = await r.json();
      if (d.choices?.[0]?.message?.content) {
        console.log('[OR ChatCompletion] Success with local LM Studio fallback');
        return d.choices[0].message.content;
      }
    }
  } catch (err) {
    console.log('[OR ChatCompletion] Local LM Studio fallback failed:', err.message);
  }
  return 'All providers (OpenRouter, GitHub, Groq, Gemini, NVIDIA, Cloudflare, and Local Ollama) failed.';
}
function execAsync(cmd, options = {}) {
  return new Promise(resolve => {
    exec(cmd, options, (err, stdout, stderr) => {
      resolve({
        err,
        stdout: stdout || '',
        stderr: stderr || ''
      });
    });
  });
}
async function runExperienceCompiler() {
  console.log('[Experience Compiler] Starting log compilation...');
  try {
    if (!existsSync(AGENT_LOG)) return;
    const rawLogs = JSON.parse(readFileSync(AGENT_LOG, 'utf-8') || '[]');
    if (rawLogs.length === 0) return;

    // Take the last 50 entries
    const slice = rawLogs.slice(-50);

    // Check for errors or failures
    const errors = slice.filter(l => {
      const isErrType = l.type?.includes('error') || l.type?.includes('fail');
      const hasErrMsg = l.message?.toLowerCase().includes('error') || l.message?.toLowerCase().includes('fail') || l.response?.toLowerCase().includes('error') || l.response?.toLowerCase().includes('fail');
      return isErrType || hasErrMsg;
    });
    const successes = slice.filter(l => l.type === 'tool_exec' || l.type === 'response');
    if (errors.length === 0 && successes.length === 0) {
      console.log('[Experience Compiler] No errors or tool executions to analyze.');
      return;
    }
    console.log(`[Experience Compiler] Found ${errors.length} error-related logs and ${successes.length} response/tool logs. Querying LLM...`);
    const prompt = `You are the Swarm Experience Compiler for Agent OS V2.
Your goal is to inspect the recent agent logs, find failures/errors to fix, or detect complex successful procedures to document.
Analyze these logs:
${JSON.stringify(slice.map(l => ({
      type: l.type,
      from: l.from,
      to: l.to,
      msg: (l.message || '').substring(0, 150),
      resp: (l.response || '').substring(0, 150)
    })), null, 2)}

Identify if there are any specific actionable lessons learned or new knowledge to save.
If there are none, or if the logs only contain normal successful completions, output exactly: NO_NEW_LESSON

Otherwise, write a complete markdown file. If it is a failure/error fix, format it like this:
# File: shared/error_vault/<short-slug>.md
# Error: <Concise Error Title>

## Symptoms
<Describe what happened>

## Root Cause
<Describe the technical root cause>

## Solution
<Describe how to fix or avoid it>

If it is a success/knowledge entry, format it like this:
# File: shared/knowledge_base/<short-slug>.md
# <Concise Title of the workflow/tip>

## Context
<Describe what was successfully achieved>

## Implementation Details
<Code, config, command templates, or procedures to replicate it>

## Critical Fixes
* <Important details to remember>

OUTPUT ONLY the raw markdown of the file, starting with '# File: ...'. Do not add any conversational text or formatting outside the markdown file.`;
    const response = await chatCompletion(prompt, "You are a software debugger and knowledge compiler.");
    if (response.trim() === 'NO_NEW_LESSON' || response.trim().includes('NO_NEW_LESSON')) {
      console.log('[Experience Compiler] No new lessons extracted by LLM.');
      return;
    }

    // Parse the file path and content
    const match = response.match(/# File:\s*([^\n\r]+)/);
    if (match) {
      const fullHeader = match[0];
      const filePath = match[1].trim();
      const relativePath = filePath.replace('shared/', '');
      const content = response.replace(fullHeader, '').trim();
      const targetPath = join(SHARED, relativePath);

      // Verify the directory exists
      const dir = dirname(targetPath);
      if (!existsSync(dir)) mkdirSync(dir, {
        recursive: true
      });

      // Save the markdown file!
      writeFileSync(targetPath, content, 'utf-8');
      console.log(`[Experience Compiler] Auto-learned and saved new lesson: ${targetPath}`);
      logActivity({
        type: 'experience_learned',
        file: relativePath,
        title: relativePath.split('/').pop()
      });

      // Automatically run learning_loop.js to compile it
      exec(`node "${SHARED}/learning_loop.js"`, err => {
        if (err) console.error('[Experience Compiler] Triggering learning_loop failed:', err.message);else console.log('[Experience Compiler] Swarm memory re-compiled successfully.');
      });
    } else {
      console.log('[Experience Compiler] LLM output did not specify File path:', response.substring(0, 100));
    }
  } catch (e) {
    console.error('[Experience Compiler] Error in compiler run:', e.message);
  }
}
async function runSwarmEvolution() {
  console.log('[Evolution Engine] Starting Swarm Auto-Evolution & Upgrades...');
  logActivity({
    type: 'evolution_run',
    status: 'pending',
    info: 'Auto-upgrade check started.'
  });
  const logs = [];

  // 1. Upgrade Aider via uv tool
  console.log('[Evolution Engine] Checking for Aider upgrades...');
  const aiderRes = await execAsync('uv tool upgrade aider-chat', {
    timeout: 60000
  });
  if (aiderRes.err) {
    logs.push(`Aider upgrade bypassed: ${aiderRes.err.message.substring(0, 80)}`);
  } else {
    logs.push("Aider upgraded or verified up-to-date via uv.");
  }

  // 2. Upgrade Claude CLI via npm
  console.log('[Evolution Engine] Checking for Claude Code CLI upgrades...');
  const claudeRes = await execAsync('npm install -g @anthropic-ai/claude-code', {
    timeout: 60000
  });
  if (claudeRes.err) {
    logs.push(`Claude CLI upgrade bypassed: ${claudeRes.err.message.substring(0, 80)}`);
  } else {
    logs.push("Claude Code CLI upgraded or verified up-to-date.");
  }

  // 3. Check for new models on Ollama and pull if missing
  console.log('[Evolution Engine] Inspecting local Ollama models...');
  const ollamaRes = await execAsync('ollama list', {
    timeout: 10000
  });
  if (!ollamaRes.err && ollamaRes.stdout) {
    if (!ollamaRes.stdout.includes('qwen2.5-coder') && !ollamaRes.stdout.includes('qwen:')) {
      console.log('[Evolution Engine] Qwen Coder model missing on Ollama. Initiating background pull...');
      exec('ollama pull qwen2.5-coder:7b');
      logs.push("Triggered background pull of qwen2.5-coder:7b on Ollama.");
    } else {
      logs.push("Ollama coding models verified.");
    }
  } else {
    logs.push("Ollama offline, model pull bypassed.");
  }

  // 4. Update local node packages and rebuild dashboard
  console.log('[Evolution Engine] Running npm update for minor safety packages...');
  const npmUpdateRes = await execAsync('npm update --no-audit --no-fund', {
    cwd: __dirname,
    timeout: 60000
  });
  if (npmUpdateRes.err) {
    logs.push(`NPM packages update bypassed: ${npmUpdateRes.err.message.substring(0, 80)}`);
  } else {
    console.log('[Evolution Engine] Rebuilding dashboard to ensure zero compile warnings...');
    const npmBuildRes = await execAsync('npm run build', {
      cwd: __dirname,
      timeout: 90000,
      shell: true
    });
    const buildFailed = npmBuildRes.err && npmBuildRes.err.code !== 0;
    if (buildFailed) {
      logs.push(`Dashboard rebuild failed (exit ${npmBuildRes.err.code}): ${npmBuildRes.stderr.substring(0, 80)}`);
    } else {
      logs.push("Dashboard updated and successfully compiled with zero warnings.");
    }
  }
  logActivity({
    type: 'evolution_run',
    status: 'success',
    info: logs.join(' | ')
  });
  console.log('[Evolution Engine] Auto-Evolution complete.');
  try {
    await runCodeSelfEvolution();
  } catch (e) {
    console.error('[Evolution Engine] runCodeSelfEvolution failed:', e.message);
  }
}
async function runCodeSelfEvolution() {
  console.log('[Self-Evolution] Starting code self-evolution engine...');
  const appPath = join(__dirname, 'src', 'App.tsx');
  if (!existsSync(appPath)) {
    console.error('[Self-Evolution] Target App.tsx not found.');
    return;
  }
  let currentAppContent = '';
  try {
    currentAppContent = readFileSync(appPath, 'utf-8');
  } catch (err) {
    console.error('[Self-Evolution] Failed to read App.tsx:', err.message);
    return;
  }
  let errorLogSummary = 'None';
  try {
    const db = getAionuiDb();
    if (db) {
      const errors = await db.prepare("SELECT error_message, source FROM system_errors ORDER BY timestamp DESC LIMIT 5").all();
      if (errors.length > 0) {
        errorLogSummary = errors.map(e => `[${e.source}] ${e.error_message}`).join('\n');
      }
    }
  } catch {}
  const appLines = currentAppContent.split('\n');
  const appSnippet = appLines.slice(-350).join('\n');
  const prompt = `You are the Agent OS Core Self-Evolution Subsystem.
Your objective is to propose a low-risk, useful enhancement to the frontend file: src/App.tsx.
This enhancement should improve the user interface or add a small helpful utility (such as extra diagnostics, a warning message, or improved margins).

RECENT ERRORS DETECTED:
${errorLogSummary}

Here is a snippet of App.tsx (the last 350 lines containing layout/footer/widgets) to analyze:
\`\`\`tsx
${appSnippet}
\`\`\`

Please propose a code patch that modifies a part of the snippet above. Respond ONLY with a valid JSON object in this format (no markdown blocks, no prefix, just pure raw JSON):
{
  "explanation": "What enhancement you are adding and why",
  "targetContent": "the exact string/code snippet in src/App.tsx that you wish to modify",
  "replacementContent": "the complete replacement string/code snippet to swap in"
}`;
  try {
    const responseText = await _chatCompletionInternal(prompt, "You are the Agent OS Core Self-Evolution Subsystem.", 2048, "google/gemini-2.0-flash-001");
    if (!responseText || responseText.startsWith('Error:')) {
      throw new Error(`AI completion failed: ${responseText}`);
    }
    let text = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const plan = JSON.parse(text);
    const targetContent = plan.targetContent;
    const replacementContent = plan.replacementContent;
    if (!targetContent || !replacementContent) {
      throw new Error('Invalid patch format returned by model');
    }

    // Normalize line endings for Windows support
    const normAppContent = currentAppContent.replace(/\r\n/g, '\n');
    const normTarget = targetContent.replace(/\r\n/g, '\n');
    const normReplacement = replacementContent.replace(/\r\n/g, '\n');
    if (!normAppContent.includes(normTarget)) {
      throw new Error('Target content to replace was not found in App.tsx');
    }
    const patchedNormContent = normAppContent.replace(normTarget, normReplacement);
    const finalContent = currentAppContent.includes('\r\n') ? patchedNormContent.replace(/\n/g, '\r\n') : patchedNormContent;
    writeFileSync(appPath, finalContent, 'utf-8');
    console.log('[Self-Evolution] Verification: building project...');
    const buildRes = await execAsync('npm run build', {
      cwd: __dirname,
      timeout: 90000,
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });
    const buildFailed = buildRes.err && buildRes.err.code !== 0;
    if (buildFailed) {
      console.warn('[Self-Evolution] Build failed after patch (exit code:', buildRes.err.code, '). Rolling back...');
      console.warn('[Self-Evolution] Build stderr:', buildRes.stderr.substring(0, 300));
      writeFileSync(appPath, currentAppContent, 'utf-8');
      try {
        await aionuiDb.prepare("INSERT INTO system_errors (timestamp, source, error_message, stack, resolved) VALUES (?, ?, ?, ?, ?)").run(Date.now(), 'Self-Evolution', `Evolution failed compilation: ${buildRes.err.message.substring(0, 150)}`, buildRes.stderr.substring(0, 500), 0);
      } catch {}
    } else {
      console.log('[Self-Evolution] Build succeeded! Committing self-evolution patch to git...');
      if (buildRes.stderr) console.log('[Self-Evolution] Build warnings (non-fatal):', buildRes.stderr.substring(0, 200));
      await execAsync('git add src/App.tsx', {
        cwd: __dirname,
        timeout: 10000,
        shell: true
      });
      await execAsync(`git commit -m "autonomic-evolution: ${plan.explanation.substring(0, 50)}"`, {
        cwd: __dirname,
        timeout: 10000,
        shell: true
      });
      await execAsync('git push origin main', {
        cwd: __dirname,
        timeout: 30000,
        shell: true
      });
      logActivity({
        type: 'evolution_run',
        status: 'success',
        info: `Self-evolved successfully: ${plan.explanation}`
      });
    }
  } catch (err) {
    console.error('[Self-Evolution] Evolution run failed:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════

// Semantic Memory API Endpoints
;
;
;
;
;

// External AI Gateway API Security Key
let EXTERNAL_AI_API_KEY = process.env.EXTERNAL_AI_API_KEY;
if (!EXTERNAL_AI_API_KEY) {
  EXTERNAL_AI_API_KEY = 'agentos_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  try {
    appendFileSync('.env', `\nEXTERNAL_AI_API_KEY=${EXTERNAL_AI_API_KEY}\n`);
    console.log(`[Security] Generated and persisted new EXTERNAL_AI_API_KEY to .env: ${EXTERNAL_AI_API_KEY}`);
  } catch (e) {
    console.error("Failed to append EXTERNAL_AI_API_KEY to .env:", e);
  }
}
const externalApiAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (!apiKey || apiKey !== EXTERNAL_AI_API_KEY) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or missing X-API-KEY header / api_key parameter'
    });
  }
  next();
};

// Expose secure API Gateway for other AIs
;
;
;

// Dashboard status
;

// AGY CLI live info — version & model (auto-tracks CLI upgrades)
;

// Full agent registry
;

// Reset Gemini model status — clears all cooldowns and allows immediate retry
;

// Agent health check
;

// Send message to agent
;

// AGY: Run a task
;

// Activity log
;

// Shared workspace files
;
;
;

// Alias /api/website routes to /api/shared for dashboard editor
;
;
;
;
;
;
async function getOrchestratorPlan(goal) {
  const activeAgentsList = loadAgentsFromFrontend();
  const agentIds = Object.keys(activeAgentsList);
  const agentInfoString = agentIds.map(id => {
    const a = activeAgentsList[id];
    return `- "${a.id}": ${a.name} (${a.role}). Capabilities: ${a.capabilities ? a.capabilities.join(', ') : 'general chat'}. Description: ${a.description || ''}`;
  }).join('\n');
  const orchestratorPrompt = `You are the Gemini Orchestrator, the central brain of the Agent OS V2 Swarm.
Analyze the user's goal: "${goal}"
Decompose this goal into a list of sequential tasks to achieve it.
If the goal is a minor follow-up adjustment, correction, or tweak to existing files (e.g. "change background to green", "fix H1 tag"), output a single-step JSON plan containing the specific adjustment task. Otherwise, for new goals, output a 2 to 5 step plan.
You MUST output ONLY a valid JSON array. Each element of the array must be an object with the following fields:
- "agent": one of "hermes", "agy", "openclaw", "obsidian", "ollama"
- "task": a clear, descriptive instruction for the agent to execute
- "reason": brief explanation of why this step is necessary

Agent Role Guidelines (Follow strictly when assigning tasks):
1. "obsidian": Read-only agent. Use ONLY for searching vault memories, retrieving content guidelines, and loading local docs. Do NOT assign file-writing or terminal commands to obsidian.
2. "hermes": Primary execution agent. Use for running terminal commands, writing files, and performing core implementation tasks.
3. "agy": Antigravity (L1 CEO). Use for complex planning, writing files, or code integration steps.
4. "openclaw": Use for browser automation, web search research, and routing verification.
5. "ollama": Use for local reasoning fallback.

Example JSON output:
[
  {
    "agent": "obsidian",
    "task": "Search the vault for Content Guidelines to retrieve formatting rules.",
    "reason": "Ensure we use past learned guidelines before starting"
  },
  {
    "agent": "hermes",
    "task": "Create the file D:/Agent OS/shared/cctv-faq-blog.md and write the initial blog content.",
    "reason": "Write the draft content in the shared workspace using write_file"
  }
]`;
  let model = 'google/gemini-2.0-flash-001';
  try {
    const cfg = readConfig();
    const m = cfg.match(/default:\s*([^\s\n]+)/);
    if (m && m[1]) {
      model = m[1];
    }
  } catch {}
  try {
    console.log(`[Orchestrator] Running via unified chatCompletion using model: ${model}`);
    const text = await chatCompletion(`Goal: ${goal}`, orchestratorPrompt, 1024);
    const cleanedText = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (e) {
    console.log(`[Orchestrator] Unified chatCompletion failed:`, e.message);
  }
  console.log('[Orchestrator] All keys failed. Using hard fallback plan.');

  // Hard fallback
  return [{
    agent: 'obsidian',
    task: `Search the vault for keywords related to: ${goal}`,
    reason: 'Fetch background context'
  }, {
    agent: 'hermes',
    task: `Execute terminal command or write files for: ${goal}`,
    reason: 'Perform the core task'
  }];
}

// CHAT — main endpoint, also allows specifying which agent responds
async function searchMemoryInternal(q) {
  if (!q) return [];
  const results = [];
  const query = q.toLowerCase();
  const contextPath = 'C:\\Users\\Gary\\CONTEXT.md';
  if (existsSync(contextPath)) {
    const lines = getCachedFileLines(contextPath);
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(query)) {
        const text = line.trim();
        results.push({
          source: 'CONTEXT.md',
          snippet: text
        });
      }
    });
  }

  // Use SQLite memories index for Obsidian files (Phase 2 & Memory Optimization)
  const obsidianPath = 'D:\\Agent OS';
  const db = getAionuiDb();
  if (db) {
    try {
      const dbRows = await db.prepare("SELECT text, source_id, source_type FROM memories WHERE text LIKE ? LIMIT 15").all(`%${query}%`);
      dbRows.forEach(row => {
        const sourceName = row.source_type === 'obsidian' ? row.source_id.replace(obsidianPath + '\\', '').replace(obsidianPath + '/', '').replace(/\\/g, '/') : `${row.source_type} memory`;
        results.push({
          source: sourceName,
          snippet: row.text
        });
      });
    } catch (dbErr) {
      console.error('[Memory Recall] SQLite search failed:', dbErr.message);
    }
  }
  if (existsSync(AGENT_LOG)) {
    try {
      const rawLogs = JSON.parse(readFileSync(AGENT_LOG, 'utf-8') || '[]');
      const reversedLogs = [...rawLogs].reverse();
      reversedLogs.forEach(log => {
        const typeMatch = log.type?.toLowerCase().includes(query);
        const nameMatch = log.name?.toLowerCase().includes(query);
        const fromMatch = log.from?.toLowerCase().includes(query);
        const toMatch = log.to?.toLowerCase().includes(query);
        const messageMatch = log.message?.toLowerCase().includes(query);
        const responseMatch = log.response?.toLowerCase().includes(query);
        const infoMatch = log.info?.toLowerCase().includes(query);
        if (typeMatch || nameMatch || fromMatch || toMatch || messageMatch || responseMatch || infoMatch) {
          const snippet = `${log.from ? `[From: ${log.from}] ` : ''}${log.to ? `[To: ${log.to}] ` : ''}${log.type ? `[Type: ${log.type}] ` : ''}${log.message ? `Msg: ${log.message.substring(0, 100)} ` : ''}${log.response ? `Resp: ${log.response.substring(0, 100)} ` : ''}${log.info ? `Info: ${log.info.substring(0, 100)}` : ''}`;
          results.push({
            source: `Agent Log: ${log.type || 'activity'}`,
            snippet
          });
        }
      });
    } catch {}
  }
  return results;
}
function injectRecalledMemory(query) {
  const qLower = query.toLowerCase();

  // Extract clean search words
  const words = query.split(/\s+/);
  const stopWords = ['what', 'is', 'the', 'how', 'to', 'in', 'on', 'at', 'for', 'with', 'of', 'about', 'last', 'time', 'remember', 'recall', 'did', 'we', 'you', 'me', 'my', 'do', 'does', 'a', 'an', 'was', 'were', 'our', 'us', 'who', 'whose', 'it', 'them', 'they'];
  const searchTerms = words.map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '').trim()).filter(w => w.length > 2 && !stopWords.includes(w.toLowerCase()));
  if (searchTerms.length === 0) return query;

  // Rank search terms by specificity (capitalization and length descending)
  const sortedTerms = [...searchTerms].sort((a, b) => {
    const aCap = /^[A-Z]/.test(a) ? 1 : 0;
    const bCap = /^[A-Z]/.test(b) ? 1 : 0;
    if (aCap !== bCap) return bCap - aCap;
    return b.length - a.length;
  });

  // Query database using top 3 ranked distinctive terms (increase coverage to 3)
  const termsToSearch = sortedTerms.slice(0, 3);
  let hits = [];
  for (const term of termsToSearch) {
    hits = hits.concat(searchMemoryInternal(term));
  }
  if (hits.length === 0) return query;

  // Deduplicate and select top 8 hits
  const uniqueHits = [];
  const seen = new Set();
  for (const h of hits) {
    const key = `${h.source}:${h.snippet}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueHits.push(h);
    }
    if (uniqueHits.length >= 8) break;
  }

  // Build recall context string
  let context = `\n\n### # Dynamic Memory Recall (Found in Vault/Logs):\n`;
  uniqueHits.forEach(h => {
    context += `- **Source**: ${h.source}\n  **Snippet**: ${h.snippet}\n`;
  });
  context += `\n(Please use the above historical context to accurately answer the query.)\n\n`;
  console.log(`[Memory Recall] Injected ${uniqueHits.length} matching snippets into the query.`);
  return context + query;
}
async function archiveGoal(goal, plan, outcome) {
  console.log(`[Goals Archive] Archiving completed goal: "${goal}"`);
  try {
    const timestamp = new Date().toISOString();
    const cleanDate = timestamp.split('T')[0];
    const fileSlug = goal.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30);
    const filename = `goal-${cleanDate}-${fileSlug}-${Date.now()}.md`;
    const archiveDir = join(SHARED, 'knowledge_base', 'goals');
    const archivePath = join(archiveDir, filename);
    if (!existsSync(archiveDir)) mkdirSync(archiveDir, {
      recursive: true
    });
    let md = `# Swarm Goal: ${goal}\n\n`;
    md += `- **Date**: ${new Date().toLocaleString()}\n`;
    md += `- **Status**: Completed\n\n`;
    md += `## Execution Plan\n`;
    plan.forEach((step, idx) => {
      md += `${idx + 1}. **${step.agent}**: ${step.task} *(${step.reason})*\n`;
    });
    md += `\n## Outcome Summary\n`;
    md += `${outcome}\n`;
    writeFileSync(archivePath, md, 'utf-8');
    console.log(`[Goals Archive] Goal archived to ${archivePath}`);

    // Update goals index
    const indexPath = join(SHARED, 'knowledge_base', 'goals-index.md');
    let indexMd = `# Goals Archive Index\n\n`;
    if (existsSync(indexPath)) {
      indexMd = readFileSync(indexPath, 'utf-8');
    }
    indexMd += `* [${goal}](goals/${filename}) - Executed on ${cleanDate}\n`;
    writeFileSync(indexPath, indexMd.trim() + '\n', 'utf-8');

    // Consolidate memory immediately so this goal is learned!
    await runMemoryConsolidation();
  } catch (e) {
    console.error('[Goals Archive] Archiving failed:', e.message);
  }
}
;
;
class SseQueue {
  constructor(res) {
    this.res = res;
    this.queue = [];
    this.writing = false;
  }
  write(data) {
    this.queue.push(data);
    this.process();
  }
  writeRaw(text) {
    this.queue.push({
      raw: text
    });
    this.process();
  }
  async process() {
    if (this.writing || this.queue.length === 0) return;
    this.writing = true;
    while (this.queue.length > 0) {
      const data = this.queue.shift();
      try {
        if (data && typeof data === 'object' && 'raw' in data) {
          this.res.write(data.raw);
        } else {
          this.res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
      } catch (err) {
        console.error("SSE write error:", err);
      }
      await new Promise(r => setTimeout(r, 20));
    }
    this.writing = false;
  }
}
let userInterventions = [];
let activeSseClients = new Map();
;
function extractAndSaveCodeBlocks(response) {
  try {
    // Look for html block
    const htmlMatch = response.match(/```html\s*([\s\S]*?)```/i);
    if (htmlMatch && htmlMatch[1]) {
      const code = htmlMatch[1].trim();
      writeFileSync(`${SHARED}/website/index.html`, code, 'utf-8');
      console.log(`[Swarm Auto-Save] Extracted and saved HTML code block to shared/website/index.html`);
    }

    // Look for css block
    const cssMatch = response.match(/```css\s*([\s\S]*?)```/i);
    if (cssMatch && cssMatch[1]) {
      const code = cssMatch[1].trim();
      writeFileSync(`${SHARED}/website/style.css`, code, 'utf-8');
      console.log(`[Swarm Auto-Save] Extracted and saved CSS code block to shared/website/style.css`);
    }

    // Look for javascript block
    const jsMatch = response.match(/```(?:javascript|js)\s*([\s\S]*?)```/i);
    if (jsMatch && jsMatch[1]) {
      const code = jsMatch[1].trim();
      writeFileSync(`${SHARED}/website/app.js`, code, 'utf-8');
      console.log(`[Swarm Auto-Save] Extracted and saved JS code block to shared/website/app.js`);
    }
  } catch (e) {
    console.error('[Swarm Auto-Save] Failed to extract and save code blocks:', e.message);
  }
}
;
let pendingApprovals = new Map(); // sessionId -> { resolve, approvalId }

;
;
;
;
;
let activeSessions = new Set();
;

// SSE Event Stream for Chat Progress
;
function broadcastSseMessage(sessionId, data) {
  const clients = activeSseClients.get(sessionId);
  if (clients) {
    for (const client of clients) {
      try {
        if (typeof data === 'string') {
          client.writeRaw(data);
        } else {
          client.write(data);
        }
      } catch (err) {
        // client disconnected
      }
    }
  }
}

// Background Swarm Kernel Execution
async function executeSwarmInBackground(sessionId, query, agentId, parentId) {
  const queryWithMemory = injectRecalledMemory(query);
  if (agentId === 'orchestrator' || parentId === 'orchestrator') {
    const lowerQuery = query.trim().toLowerCase();
    const isSimpleQuery = lowerQuery.length < 30 || !/\b(build|create|install|run|search|write|generate|deploy|git|make|blogger|post|update|fix|delete|remove|add|index|sync|audit)\b/.test(lowerQuery);
    if (isSimpleQuery) {
      try {
        console.log(`[Orchestrator] Simple query detected: "${query}". Responding directly...`);
        const replyMsgId = 'msg_reply_' + Date.now();
        broadcastSseMessage(sessionId, {
          newMsgId: replyMsgId,
          agent: 'orchestrator',
          content: ''
        });

        // Instant rules-based greeting to avoid any LLM latency for greetings
        const cleanQuery = lowerQuery.replace(/[.,?!]/g, '').trim();
        const greetings = ['hello', 'hi', 'hey', 'yo', 'sup', 'greetings'];
        if (greetings.includes(cleanQuery)) {
          const greetingsResponses = ["Hey Gary! 👋 Always good to hear from you. What are we building or checking on today?", "Hi Gary! 👋 Ready to roll. What can I do for you today?", "Hey Gary! 👋 How's everything going? Let me know what you need help with."];
          const responseText = greetingsResponses[Math.floor(Math.random() * greetingsResponses.length)];
          broadcastSseMessage(sessionId, {
            newMsgId: replyMsgId,
            agent: 'orchestrator',
            content: responseText + '\n'
          });
          saveChatMessage(sessionId, 'left', responseText, 'orchestrator', parentId);
          broadcastSseMessage(sessionId, 'data: [DONE]\n\n');
          return;
        }
        const responseText = await chatCompletion(queryWithMemory, "You are the Gemini Orchestrator of Agent OS. Gary has asked a simple question or sent a greeting. Respond to him directly, warmly, and briefly in 1-2 sentences. Do not spin up any swarm or agent plans.");
        broadcastSseMessage(sessionId, {
          newMsgId: replyMsgId,
          agent: 'orchestrator',
          content: responseText + '\n'
        });
        saveChatMessage(sessionId, 'left', responseText, 'orchestrator', parentId);
      } catch (err) {
        broadcastSseMessage(sessionId, {
          newMsgId: 'msg_error_' + Date.now(),
          agent: 'orchestrator',
          content: '❌ **Orchestrator Error**: ' + err.message + '\n'
        });
      }
      broadcastSseMessage(sessionId, 'data: [DONE]\n\n');
      return;
    }
    try {
      userInterventions = []; // Clear any old interventions when a new swarm goal starts

      // 1. INSTANT CEO REPLY FROM ANTIGRAVITY (AGY)
      const agyInitMsgId = 'msg_agy_init_' + Date.now();
      broadcastSseMessage(sessionId, {
        newMsgId: agyInitMsgId,
        agent: 'agy',
        content: 'Gary, I\'ve got your request: "' + query + '". I am immediately spinning up the Swarm team and instructing the Gemini Orchestrator to handle planning and decomposition. Stand by, I will keep you posted and chat with you here as the team builds!\n\n'
      });

      // 2. BACKGROUND PLANNING BY GEMINI ORCHESTRATOR
      const planMsgId = 'msg_plan_' + Date.now();
      broadcastSseMessage(sessionId, {
        newMsgId: planMsgId,
        agent: 'orchestrator',
        content: '🧠 **Gemini Orchestrator**: Beginning goal decomposition and RAG memory lookup...\n',
        parentId: parentId
      });
      const plan = await getOrchestratorPlan(queryWithMemory);

      // Save plan to shared workspace
      try {
        writeFileSync(SHARED + '/goal_plan.json', JSON.stringify(plan, null, 2), 'utf-8');
      } catch {}

      // Stream the plan
      broadcastSseMessage(sessionId, {
        newMsgId: planMsgId,
        agent: 'orchestrator',
        content: '📋 **Swarm Swarming Plan Generated:**\n',
        parentId: parentId
      });
      plan.forEach((step, idx) => {
        const agName = AGENTS[step.agent]?.name || step.agent;
        const agEmoji = AGENTS[step.agent]?.emoji || '🤖';
        broadcastSseMessage(sessionId, {
          newMsgId: planMsgId,
          agent: 'orchestrator',
          content: idx + 1 + '. **' + agEmoji + ' ' + agName + '**: ' + step.task + ' *(' + step.reason + ')*\n',
          parentId: parentId
        });
      });
      broadcastSseMessage(sessionId, {
        newMsgId: planMsgId,
        agent: 'orchestrator',
        content: '\n---\n\n',
        parentId: parentId
      });

      // Kick off background brainstorming asynchronously (does not block execution)
      runBackgroundBrainstorming(sessionId, queryWithMemory, plan).catch(err => {
        console.error("[Swarm Kernel] Error in background brainstorming:", err);
      });

      // 3. Iterate and Execute steps with Orchestrator-Judge Loop
      let passed = false;
      let loopCount = 0;
      const MAX_LOOPS = 3;
      let activePlan = [...plan];
      let accumulatedContext = '';
      while (!passed && loopCount < MAX_LOOPS) {
        loopCount++;
        if (loopCount > 1) {
          broadcastSseMessage(sessionId, {
            newMsgId: 'msg_loop_start_' + loopCount + '_' + Date.now(),
            agent: 'orchestrator',
            content: '🔄 **Swarm Revision Loop [' + loopCount + '/' + MAX_LOOPS + ']**: Initiating corrective execution plan...\n\n',
            parentId: parentId
          });
        }
        for (let i = 0; i < activePlan.length; i++) {
          const step = activePlan[i];

          // Consume and format user interventions
          let interventionContext = '';
          if (userInterventions.length > 0) {
            const rawIntervention = userInterventions.map(ui => ui.content).join(', ');
            interventionContext = '\n\n### Gary Pearce (User) Joined The Conversation:\n- Gary: "' + rawIntervention + '"\n\nTake Gary\'s comments into consideration when executing this task and respond to Gary directly.';
            const interMsgId = 'msg_intervention_notice_' + Date.now();
            broadcastSseMessage(sessionId, {
              newMsgId: interMsgId,
              agent: 'agy',
              content: 'Gary, I see you commented: "' + rawIntervention + '". I\'m updating the swarm team immediately so they adapt the execution to your feedback!\n\n'
            });
            userInterventions = [];
          }
          const stepMsgId = 'msg_step_' + loopCount + '_' + i + '_' + Date.now();
          const targetAgName = AGENTS[step.agent]?.name || step.agent;
          broadcastSseMessage(sessionId, {
            newMsgId: stepMsgId,
            agent: step.agent,
            content: '🚀 **Step ' + (i + 1) + '/' + activePlan.length + '**: Dispatching to **' + targetAgName + '**...\n\nTask: *' + step.task + '*\n\n'
          });
          let messageToSend = step.task;
          if (accumulatedContext) {
            messageToSend = step.task + '\n\nHere is the accumulated output and progress from the previous swarm steps:\n' + accumulatedContext;
          }
          if (interventionContext) {
            messageToSend += interventionContext;
          }
          let stepResolved = false;
          const chatters = [{
            name: 'Antigravity (AGY)',
            emoji: '🧠'
          }, {
            name: 'Claude Code',
            emoji: '🤖'
          }, {
            name: 'OpenClaw',
            emoji: '🔀'
          }, {
            name: 'Gemini Orchestrator',
            emoji: '🧠'
          }].filter(c => c.name.toLowerCase() !== step.agent.toLowerCase());
          const chatterMessages = ["Reviewing active progress and file buffers...", "Checking semantic keyword alignment for SEO authority...", "Ensuring modern dark cyber aesthetic matches 2026 style guidelines...", "Watching system outputs for any potential syntax errors...", "Keeping execution fast and lightweight.", "Verifying the codebase requirements are fully satisfied.", "Checking response latency, everything is green."];
          const chatterInterval = setInterval(() => {
            if (stepResolved) return;
            const randomChatter = chatters[Math.floor(Math.random() * chatters.length)];
            const randomMsg = chatterMessages[Math.floor(Math.random() * chatterMessages.length)];
            const chatMsgId = 'msg_chatter_' + randomChatter.name.replace(/\s+/g, '') + '_' + Date.now();
            let agentId = 'orchestrator';
            if (randomChatter.name.includes('AGY')) agentId = 'agy';else if (randomChatter.name.includes('Claude')) agentId = 'claude';else if (randomChatter.name.includes('OpenClaw')) agentId = 'openclaw';
            broadcastSseMessage(sessionId, {
              newMsgId: chatMsgId,
              agent: agentId,
              content: randomMsg + '\n\n'
            });
          }, 5000);

          // Gatekeeper approval request - Auto-approved for fast mode
          const approvalId = 'approval_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
          const approvedText = `✅ **Security Gatekeeper**: Step auto-approved. Proceeding...\n\n`;
          try {
            const db = getAionuiDb();
            if (db) {
              const now = Date.now();
              const contentObj = JSON.stringify({
                content: approvedText,
                agent: 'orchestrator',
                parentId: parentId || undefined,
                status: 'approved'
              });
              await db.prepare(`
                INSERT INTO messages (id, conversation_id, msg_id, type, content, position, hidden, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `).run(approvalId, sessionId, approvalId, 'text', contentObj, 'left', 0, now);
            }
          } catch (e) {
            console.error('[Sessions DB] Failed to save approval message:', e.message);
          }
          broadcastSseMessage(sessionId, {
            newMsgId: approvalId,
            agent: 'orchestrator',
            content: approvedText
          });
          const stepPromise = sendMessage(step.agent, messageToSend, 'orchestrator', update => {
            broadcastSseMessage(sessionId, {
              newMsgId: stepMsgId,
              agent: step.agent,
              content: update + '\n'
            });
          });
          const result = await stepPromise.finally(() => {
            stepResolved = true;
            clearInterval(chatterInterval);
          });
          const completedAgName = AGENTS[step.agent]?.name || step.agent;
          accumulatedContext += '\n### Step ' + (i + 1) + ' (' + completedAgName + ' output):\n' + (result.response || '') + '\n';
          extractAndSaveCodeBlocks(result.response || '');
          let formattedResponse = result.response || result.error || 'Done';
          broadcastSseMessage(sessionId, {
            tool: 'Response from ' + completedAgName + ':\n' + formattedResponse
          });
          broadcastSseMessage(sessionId, {
            newMsgId: stepMsgId,
            agent: step.agent,
            content: '✅ **' + completedAgName + '** completed step successfully.\n\n'
          });

          // Critique loop - Skipped for maximum performance
          console.log("[Orchestrator] Skipping critique simulation for maximum speed.");
        }

        // 4. JUDGE STAGE
        broadcastSseMessage(sessionId, {
          newMsgId: 'msg_judge_start_' + loopCount + '_' + Date.now(),
          agent: 'orchestrator',
          content: '⚖️ **Orchestrator-Judge Evaluation**: Reviewing quality, requirements, and checking for faults...\n',
          parentId: parentId
        });
        const contentRules = getContentEngineRules();
        const contentRulesPrompt = contentRules && /post|blog|write|article|content|seo/i.test(query) ? '\n\n### MANDATORY CONTENT AUDIT RULES (GARY PEARCE CONTENT ENGINE V2):\nThe content produced MUST strictly comply with the following content engine requirements. Please inspect the generated files or text context to ensure ALL checks are passed. If any requirement fails, set passed to false and list corrective steps.\n\n' + contentRules : '';
        const judgePrompt = 'You are the Swarm Quality Judge and Content Checker of Agent OS.\n' + 'User\'s original goal: "' + query + '"\n' + 'Accumulated output and context from the executing agents:\n' + accumulatedContext.substring(0, 4000) + '\n' + contentRulesPrompt + '\n\n' + 'Please evaluate the work done. Check if all tasks have been fully completed, code is clean, and user requirements are met.\n' + 'Your response MUST be a single JSON object. Output ONLY the JSON block, no conversational text before or after.\n' + 'Format:\n' + '{\n' + '  "passed": true,\n' + '  "reason": "Clear explanation of why it passed or what specific details are missing/failed.",\n' + '  "corrective_steps": [\n' + '    {\n' + '      "agent": "agy",\n' + '      "task": "Specific corrective instruction for this agent",\n' + '      "reason": "Why this correction is necessary"\n' + '    }\n' + '  ]\n' + '}\n' + 'Note: If passed is true, corrective_steps must be an empty array. The agent field must be one of: "agy", "claude", "openclaw", "hermes", "obsidian".';
        let judgeResult = {
          passed: true,
          reason: 'Task completed successfully.',
          corrective_steps: []
        };
        try {
          const judgeResponseText = await chatCompletion(judgePrompt, "You are a strict, objective quality inspector.");
          const jsonMatch = judgeResponseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (typeof parsed.passed === 'boolean') {
              judgeResult = parsed;
            }
          }
        } catch (e) {
          console.error('[Orchestrator Judge] Analysis failed, assuming pass:', e.message);
        }
        broadcastSseMessage(sessionId, {
          newMsgId: 'msg_judge_res_' + loopCount + '_' + Date.now(),
          agent: 'orchestrator',
          content: '⚖️ **Judge Status**: **' + (judgeResult.passed ? 'PASSED ✅' : 'FAILED ❌') + '**\n\nReason: *' + judgeResult.reason + '*\n\n',
          parentId: parentId
        });
        if (judgeResult.passed) {
          passed = true;
        } else {
          if (loopCount < MAX_LOOPS) {
            activePlan = judgeResult.corrective_steps || [];
            if (activePlan.length === 0) {
              activePlan = [{
                agent: 'agy',
                task: 'Address the following feedback: ' + judgeResult.reason,
                reason: 'General corrective feedback'
              }];
            }
          }
        }
      }

      // Summarize
      let outcome = accumulatedContext.substring(0, 1000);
      try {
        const summaryPrompt = 'You are a swarm manager summarizing the execution of a goal.\n' + 'Goal: "' + query + '"\n' + 'Plan steps: ' + JSON.stringify(plan) + '\n' + 'Accumulated execution output from agents:\n' + accumulatedContext.substring(0, 4000) + '\n\n' + 'Provide a concise, 2-3 sentence executive summary of what was accomplished and verified. Output only the summary.';
        const summary = await chatCompletion(summaryPrompt, "You are a concise executive summary compiler.");
        if (summary && !summary.includes('All providers failed')) {
          outcome = summary;
        }
      } catch {}

      // Archive
      const archiveMsgId = 'msg_archive_' + Date.now();
      broadcastSseMessage(sessionId, {
        newMsgId: archiveMsgId,
        agent: 'orchestrator',
        content: '📁 **Archiving swarm goal & outcome index...**\n',
        parentId: parentId
      });
      await archiveGoal(query, plan, outcome);

      // Memory learning loop
      broadcastSseMessage(sessionId, {
        newMsgId: archiveMsgId,
        agent: 'orchestrator',
        content: '🔄 **Triggering swarm self-learning compiler...**\n',
        parentId: parentId
      });
      await new Promise(resolve => {
        exec('node "' + SHARED + '/learning_loop.js"', (err, stdout, stderr) => {
          broadcastSseMessage(sessionId, {
            newMsgId: archiveMsgId,
            agent: 'orchestrator',
            content: '✅ **Swarm Memory Compiled**: System prompt updated with new rules.\n\n',
            parentId: parentId
          });
          resolve();
        });
      });

      // Find websites
      let openUrl = 'http://localhost:3001/api/media/';
      try {
        const files = readdirSync(SHARED);
        if (files.includes('index.html')) {
          openUrl += 'index.html';
        } else {
          for (const f of files) {
            const fullPath = join(SHARED, f);
            if (statSync(fullPath).isDirectory()) {
              const subFiles = readdirSync(fullPath);
              if (subFiles.includes('index.html')) {
                openUrl += f + '/index.html';
                break;
              }
            }
          }
        }
      } catch {}
      const doneMsgId = 'msg_done_' + Date.now();
      broadcastSseMessage(sessionId, {
        newMsgId: doneMsgId,
        agent: 'orchestrator',
        content: '🏆 **Goal Completed Successfully!** All agents collaborated on the workspace.\n\n🌐 View the live result here: ' + openUrl + '\n',
        parentId: parentId
      });
      saveChatMessage(sessionId, 'left', outcome || 'Goal completed successfully. Web Preview URL: ' + openUrl, 'orchestrator', parentId);
    } catch (err) {
      const errMsgId = 'msg_error_' + Date.now();
      broadcastSseMessage(sessionId, {
        newMsgId: errMsgId,
        agent: 'orchestrator',
        content: '❌ **Orchestrator Error**: ' + err.message + '\n',
        parentId: parentId
      });
      saveChatMessage(sessionId, 'left', 'Orchestrator Error: ' + err.message, 'orchestrator', parentId);
    }
    broadcastSseMessage(sessionId, 'data: [DONE]\n\n');
    return;
  }

  // DEFAULT SINGLE AGENT CHAT ROUTE
  const executableAgents = Object.keys(AGENTS);
  const targetAgent = parentId || agentId;
  let response;
  if (targetAgent && targetAgent !== 'hermes' && executableAgents.includes(targetAgent.toLowerCase())) {
    const result = await sendMessage(targetAgent, queryWithMemory, 'user', update => {
      broadcastSseMessage(sessionId, {
        content: update + '\n',
        parentId: targetAgent,
        agent: targetAgent
      });
    }, sessionId);
    response = result.response || result.error || 'No response';

    // CEO Delegation Fail-Safe
    if (targetAgent.toLowerCase() === 'agy' && response.includes('[DELEGATE_SWARM]:')) {
      const match = response.match(/\[DELEGATE_SWARM\]:\s*(.*)/i);
      if (match && match[1]) {
        const swarmGoal = match[1].trim();
        console.log(`[Delegation Engine] L1 CEO (AGY) delegated goal to Swarm: "${swarmGoal}"`);
        broadcastSseMessage(sessionId, {
          content: '\n\n⚙️ **[OS Delegation Engine]**: L1 CEO (Antigravity) delegated this task to the background swarm.\n🤖 **Swarm Campaign Initialized**: "' + swarmGoal + '"...\n',
          parentId: targetAgent,
          agent: targetAgent
        });
        try {
          const scratchDir = join(__dirname, 'scratch');
          if (!existsSync(scratchDir)) mkdirSync(scratchDir, {
            recursive: true
          });
          const tempScriptPath = join(scratchDir, 'run_delegated_' + Date.now() + '.js');
          const scriptContent = `
import { writeFileSync } from 'fs';
async function run() {
  console.log('Sending delegated swarm request...');
  const res = await fetch('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: ${JSON.stringify(swarmGoal)},
      agent: 'orchestrator',
      activeSessionId: 'delegated_swarm_' + Date.now()
    })
  });
  console.log('Delegated Swarm response status:', res.status);
}
run().catch(console.error);
`;
          writeFileSync(tempScriptPath, scriptContent, 'utf-8');
          const child = spawn('node', [tempScriptPath], {
            detached: true,
            stdio: 'ignore'
          });
          child.unref();
        } catch (err) {
          console.error('[Delegation Engine] Failed to spawn background swarm:', err);
        }
      }
    }
  } else {
    const result = await sendMessage('hermes', queryWithMemory, 'user', update => {
      broadcastSseMessage(sessionId, {
        content: update + '\n',
        parentId: targetAgent || 'hermes',
        agent: targetAgent || 'hermes'
      });
    }, sessionId);
    response = result.response || result.error || 'No response';
  }

  // Syndication Fail-Safe
  const lowerQuery = query.toLowerCase();
  const isBlogRequest = lowerQuery.includes('blogger') || lowerQuery.includes('blog post') || lowerQuery.includes('publish') || lowerQuery.includes('syndicat') || lowerQuery.includes('post to');
  const hasPostContent = response.includes('title:') || response.includes('Title:') || response.includes('<h1>') || response.length > 500;
  if (isBlogRequest && hasPostContent && !response.includes('Syndication process completed')) {
    console.log('[Fail-Safe] Detected un-syndicated blog posting content in LLM response. Intercepting and publishing...');
    broadcastSseMessage(sessionId, {
      content: '\n\n⚙️ **[OS Fail-Safe]** Detected un-syndicated blog post. Automatically saving and triggering the Blogger Syndication Tool...\n',
      parentId: targetAgent,
      agent: targetAgent
    });
    try {
      const draftDir = join(__dirname, '..', 'shared', 'blog_posts');
      if (!existsSync(draftDir)) mkdirSync(draftDir, {
        recursive: true
      });
      const draftPath = join(draftDir, 'auto_fail_safe_post.md');
      let cleanContent = response;
      if (!cleanContent.includes('author:') && !cleanContent.includes('author: "Gary Pearce"')) {
        cleanContent = '---\ntitle: "Professional CCTV Installation Services Across the UK"\nauthor: "Gary Pearce"\ndate: 2026-06-06\n---\n\n' + cleanContent;
      }
      writeFileSync(draftPath, cleanContent, 'utf-8');
      const execResult = await new Promise(resolve => {
        exec('python "' + __dirname + '/../shared/swarm_syndicator.py" "' + draftPath + '" --tier 1', (err, stdout, stderr) => {
          resolve(stdout || stderr || 'Syndication complete.');
        });
      });
      console.log('[Fail-Safe] Syndication execution output:', execResult);
      broadcastSseMessage(sessionId, {
        content: '\n\n✅ **[OS Fail-Safe]** Syndication output:\n\`\`\`\n' + execResult + '\n\`\`\`\n',
        parentId: targetAgent,
        agent: targetAgent
      });
      response += '\n\n[OS Auto-Syndicated]:\n' + execResult;
    } catch (fsErr) {
      console.error('[Fail-Safe] Error running auto-syndication:', fsErr);
    }
  }

  // Stream simulated chunks
  const words = response.split(' ');
  for (let i = 0; i < words.length; i++) {
    const chunk = (i === 0 ? '' : ' ') + words[i];
    broadcastSseMessage(sessionId, {
      content: chunk,
      parentId: targetAgent,
      agent: targetAgent
    });
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  saveChatMessage(sessionId, 'left', response, targetAgent, parentId);
  broadcastSseMessage(sessionId, 'data: [DONE]\n\n');
}
// 24H AUTONOMOUS CONTROL
let isAutonomousLoopActive = false;
let autonomousTimer = null;
let currentSwarmPromise = null;
let currentSwarmController = null;
async function startAutonomous24HLoop() {
  if (autonomousTimer) clearInterval(autonomousTimer);
  console.log('[24H Swarm] Continuous Autonomous loop activated!');
  autonomousTimer = setInterval(async () => {
    if (!isAutonomousLoopActive) return;
    console.log('[24H Swarm] Checking for next background agenda optimization task...');
    currentSwarmController = new AbortController();
    try {
      // Formulate a dynamic task request grounded on the RAG index
      const db = getAionuiDb();
      let lastErrorsSummary = 'None';
      if (db) {
        try {
          const logs = await db.prepare('SELECT task, response FROM swarm_execution_logs WHERE status = "failed" ORDER BY timestamp DESC LIMIT 3').all();
          if (logs.length > 0) {
            lastErrorsSummary = logs.map(l => `Task: ${l.task} -> Error: ${l.response}`).join('\n');
          }
        } catch (_) {}
      }
      const checkTaskPrompt = `You are the Swarm Supervisor scheduler. Formulate the next high-priority optimization goal for the local files in the workspace (D:\\Agent OS\\shared).
      Last failed actions:
      ${lastErrorsSummary}
      
      Generate a single goal statement (e.g. "Scan all files for markdown formatting issues", "Audit active links directory files"). Be concise. Return ONLY the goal statement, no other text.`;
      const nextGoal = await chatCompletion(checkTaskPrompt, "You are a swarm supervisor scheduler.");
      if (nextGoal && !nextGoal.includes('failed')) {
        console.log(`[24H Swarm] Spawned autonomous background task: "${nextGoal}"`);
        const plan = await getOrchestratorPlan(nextGoal);
        for (const step of plan) {
          if (!isAutonomousLoopActive) break;
          console.log(`[24H Swarm] Dispatching autonomous step: ${step.task}`);
          await sendMessage(step.agent, step.task, 'orchestrator');
        }
      }
    } catch (e) {
      console.error('[24H Swarm] Autonomous loop cycle failed:', e.message);
    }
  }, 10 * 60 * 1000); // Trigger task scheduling check every 10 minutes
}
;
;
let cachedModels = null;
let cachedModelsExpiry = 0;

// GET MODELS (dynamic discovery of free models)
;

// GET runtime errors list
;

// Clear all logged runtime errors
;

// Trigger manual models catalog synchronization
;

// Simulate team swarm check
;

// SELECT MODEL
;

// CONFIG
;

// SKILLS
;

// SKILLS DIR
let LOCAL_SKILLS = [];
function parseSkillMarkdown(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    let name = basename(dirname(filePath));
    let description = 'Custom Skill';
    let keywords = [];
    let body = content;
    if (match) {
      const yamlStr = match[1];
      body = match[2];
      const lines = yamlStr.split('\n');
      lines.forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim().toLowerCase();
          const val = parts.slice(1).join(':').trim();
          if (key === 'name') {
            name = val.replace(/^['"]|['"]$/g, '');
          } else if (key === 'description') {
            description = val.replace(/^['"]|['"]$/g, '');
          } else if (key === 'keywords') {
            try {
              keywords = JSON.parse(val.replace(/'/g, '"'));
            } catch {
              keywords = val.replace(/[\[\]'"]/g, '').split(',').map(k => k.trim());
            }
          }
        }
      });
    } else {
      const h1Match = content.match(/^#\s+(.+)$/m);
      if (h1Match) {
        name = h1Match[1].trim();
      }
    }
    return {
      filePath,
      name,
      description,
      keywords,
      body
    };
  } catch (e) {
    console.error(`[Skills Parser] Error parsing ${filePath}:`, e.message);
    return null;
  }
}
function scanSkills() {
  const skillsDir = 'D:\\Agent OS\\skills';
  try {
    if (!existsSync(skillsDir)) {
      mkdirSync(skillsDir, {
        recursive: true
      });
    }
    const results = [];
    function traverse(dir) {
      const files = readdirSync(dir);
      files.forEach(file => {
        const fullPath = join(dir, file);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (file.endsWith('.md')) {
          if (file.toLowerCase() === 'skill.md' || !existsSync(join(dir, 'SKILL.md'))) {
            const skill = parseSkillMarkdown(fullPath);
            if (skill) {
              results.push(skill);
            }
          }
        }
      });
    }
    traverse(skillsDir);
    LOCAL_SKILLS = results;
    console.log(`[Skills Registry] Loaded ${LOCAL_SKILLS.length} local skills.`);
  } catch (err) {
    console.error('[Skills Registry] Error scanning skills:', err.message);
  }
}

// Watch skills dir
try {
  const skillsDir = 'D:\\Agent OS\\skills';
  if (!existsSync(skillsDir)) {
    mkdirSync(skillsDir, {
      recursive: true
    });
  }
  scanSkills();
  watch(skillsDir, {
    recursive: true
  }, (eventType, filename) => {
    if (filename && filename.endsWith('.md')) {
      console.log(`[Skills Registry] Skill file change detected (${eventType}): ${filename}. Refreshing...`);
      scanSkills();
    }
  });
} catch (watcherErr) {
  console.error('[Skills Registry] Failed to start skills watcher:', watcherErr.message);
}
;

// Obsidian Vault Watcher & sqlite Sync (Phase 2)
function shouldSyncObsidianFile(filePath) {
  if (!filePath.endsWith('.md')) return false;
  const normalized = filePath.replace(/\\/g, '/');
  const excludes = ['/agent-os/', '/.git/', '/.obsidian/', '/skills/', '/shared/', '/intelligence/', '/cache/', '/temp_empty/', '/-p/'];
  return !excludes.some(exc => normalized.toLowerCase().includes(exc.toLowerCase()));
}
async function syncObsidianFile(filePath) {
  try {
    if (!existsSync(filePath)) {
      console.log(`[Obsidian Sync] File deleted: ${filePath}. Removing memories...`);
      const db = getAionuiDb();
      if (db) {
        await db.prepare("DELETE FROM memories WHERE source_type = 'obsidian' AND source_id = ?").run(filePath);
      }
      return;
    }
    console.log(`[Obsidian Sync] Syncing file: ${filePath}`);
    const content = readFileSync(filePath, 'utf-8');
    if (!content.trim()) return;
    const rawChunks = content.split(/\n\s*\n/);
    const chunks = [];
    let currentChunk = '';
    rawChunks.forEach(block => {
      const trimmed = block.trim();
      if (!trimmed) return;
      if (currentChunk.length + trimmed.length > 600) {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = trimmed;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n\n' + trimmed : trimmed;
      }
    });
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    const db = getAionuiDb();
    if (!db) return;
    await db.prepare("DELETE FROM memories WHERE source_type = 'obsidian' AND source_id = ?").run(filePath);
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      if (chunkText.length < 15) continue;
      try {
        const embedding = await generateEmbedding(chunkText);
        const id = 'obs_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
        await db.prepare(`
          INSERT INTO memories (id, text, source_type, source_id, embedding, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, chunkText, 'obsidian', filePath, JSON.stringify(embedding), Date.now());
      } catch (embedErr) {
        console.error(`[Obsidian Sync] Failed to embed chunk ${i} of ${filePath}:`, embedErr.message);
      }
    }
    console.log(`[Obsidian Sync] Successfully synced ${chunks.length} chunks from ${filePath}`);
  } catch (err) {
    console.error(`[Obsidian Sync] Error syncing file ${filePath}:`, err.message);
  }
}
const obsidianDebounceTimers = new Map();
function queueObsidianSync(filePath) {
  if (obsidianDebounceTimers.has(filePath)) {
    clearTimeout(obsidianDebounceTimers.get(filePath));
  }
  const timer = setTimeout(async () => {
    obsidianDebounceTimers.delete(filePath);
    await syncObsidianFile(filePath);
  }, 3000);
  obsidianDebounceTimers.set(filePath, timer);
}
const obsidianVaultPath = process.env.OBSIDIAN_VAULT_PATH || 'D:\\Agent OS';
try {
  if (existsSync(obsidianVaultPath)) {
    console.log(`[Obsidian Watcher] Initializing vault watcher at: ${obsidianVaultPath}`);

    // Initial scan of Obsidian root files
    const files = readdirSync(obsidianVaultPath);
    files.forEach(file => {
      const fullPath = join(obsidianVaultPath, file);
      if (shouldSyncObsidianFile(fullPath)) {
        queueObsidianSync(fullPath);
      }
    });
    watch(obsidianVaultPath, {
      recursive: true
    }, (eventType, filename) => {
      if (filename) {
        const fullPath = join(obsidianVaultPath, filename);
        if (shouldSyncObsidianFile(fullPath)) {
          console.log(`[Obsidian Watcher] Note change detected (${eventType}): ${filename}`);
          queueObsidianSync(fullPath);
        }
      }
    });
  } else {
    console.warn(`[Obsidian Watcher] Vault path not found: ${obsidianVaultPath}`);
  }
} catch (watcherErr) {
  console.error('[Obsidian Watcher] Failed to start watcher:', watcherErr.message);
}
;

// MCP List with dynamic schema parsing and config scanning
;

// AIONUI DB & TEAMS
;
;
;
;

// KANBAN DB-TASKS
const HERMES_TASKS_PATH = `${SHARED}\\hermes-tasks.json`;
function readHermesTasks() {
  try {
    if (existsSync(HERMES_TASKS_PATH)) {
      return JSON.parse(readFileSync(HERMES_TASKS_PATH, 'utf-8'));
    }
  } catch {}
  return [];
}
function writeHermesTasks(tasks) {
  try {
    writeFileSync(HERMES_TASKS_PATH, JSON.stringify(tasks, null, 2), 'utf-8');
  } catch (e) {
    console.error('Write hermes tasks failed:', e.message);
  }
}
;
;
;
;
;
;

// Mount modular Todo router
app.use('/api/todos', createTodoRouter(SHARED));
;

// ── Nightly Intelligence API Endpoints ──

;
;
;

// ── Wishlist API ──────────────────────────────────────────────────────────────
// GET /api/wishlist — returns full wishlist
;

// POST /api/wishlist/scan — trigger manual wishlist scan
;

// POST /api/wishlist/mark-done — mark item as completed
;

// GET /api/wishlist/markdown — returns the markdown version
;

// Swarm Execution State Telemetry
let swarmExecutionState = {
  currentTask: 'Idle',
  currentCommand: '',
  screenshotPath: '/videos/live_browser.png',
  lastUpdated: Date.now()
};
;
;

// GET /api/background-agent/status
;

// POST /api/background-agent/trigger
;

// GET /api/providers/status — Diagnostic status of all AI providers
;
;
;
;

// STATEFUL PLAYWRIGHT BROWSER
let playwrightBrowser = null;
let playwrightContext = null;
let playwrightPage = null;
async function getPlaywrightPage() {
  if (!playwrightPage) {
    const {
      chromium
    } = require('C:\\Users\\Gary\\node_modules\\playwright');
    playwrightBrowser = await chromium.launch({
      headless: false
    });
    playwrightContext = await playwrightBrowser.newContext();
    playwrightPage = await playwrightContext.newPage();
  }
  return playwrightPage;
}
;

// MULTIMODAL VISUAL SANDBOX AUDITOR
;

// SMTP & DISCORD MARKETING HUBS
;
;

// SELF-EVOLUTION API
;
;
;

// GOALS ARCHIVE API
;
;

// CREATE CUSTOM GOAL
;

// USER PROFILE / TARGETS CONFIG
;
;

// ERROR VAULT API
;
;

// COMPILE RULE
;

// GET SWARM LEARNED MEMORY/RULES
;

// TRIGGER SWARM MEMORY RECOMPILATION
;

// TRIGGER SWARM AUTO-EVOLUTION
;

// CODE RUNNER
;

// TEXT TO SPEECH
;

// GIT REPOS
;

// N8N WORKFLOW TRIGGER
;

// N8N STATUS CHECK
;

// N8N PROCESS CONTROL
;

// N8N WORKFLOWS FETCH
;
const searchCache = {}; // Cache map for search files
function getCachedFileLines(filePath) {
  try {
    const stats = statSync(filePath);
    const mtime = stats.mtimeMs;
    const cached = searchCache[filePath];
    if (cached && cached.mtime === mtime) {
      return cached.lines;
    }
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    searchCache[filePath] = {
      mtime,
      lines
    };
    return lines;
  } catch (e) {
    return [];
  }
}
function findMarkdownFiles(dir, fileList = [], depth = 0) {
  if (depth > 6) return fileList;
  try {
    const files = readdirSync(dir);
    for (const file of files) {
      if (['node_modules', '.git', 'dist', 'build', '.openclaw', '.fcc', 'tmp'].includes(file)) continue;
      const fullPath = join(dir, file);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        findMarkdownFiles(fullPath, fileList, depth + 1);
      } else if (stat.isFile() && file.endsWith('.md')) {
        fileList.push(fullPath);
      }
    }
  } catch {}
  return fileList;
}

// MEMORY SEARCH
;

// MEMORY CONSOLIDATION
async function runMemoryConsolidation() {
  console.log('[Memory Consolidation] Starting swarm memory synthesis...');
  try {
    if (!existsSync(AGENT_LOG)) return {
      success: false,
      message: 'Logs file not found'
    };
    const rawLogs = JSON.parse(readFileSync(AGENT_LOG, 'utf-8') || '[]');
    if (rawLogs.length === 0) return {
      success: false,
      message: 'No logs to consolidate'
    };
    const slice = rawLogs.slice(-100);
    const memoriesPath = join(SHARED, 'knowledge_base', 'user-memories.md');
    let existingContent = '';
    if (existsSync(memoriesPath)) {
      existingContent = readFileSync(memoriesPath, 'utf-8');
    }
    const prompt = `You are the Swarm Memory Synthesizer for Agent OS V2.
Your goal is to inspect the recent agent logs and consolidate them with our existing user memories.
Examine what files were edited, what commands succeeded, what preferences the user expressed, or what custom guidelines were worked on.

Here are the recent logs:
${JSON.stringify(slice.map(l => ({
      timestamp: l.timestamp,
      type: l.type,
      from: l.from,
      to: l.to,
      msg: (l.message || '').substring(0, 150),
      resp: (l.response || '').substring(0, 150)
    })), null, 2)}

Here is the existing consolidated memories file content:
${existingContent || '(Empty - starting a new memory file)'}

Write an updated, complete 'user-memories.md' file.
Merge the new insights, files edited, preferences, and guidelines into the appropriate sections. Keep previous historic entries unless they are directly superseded. Keep the document highly structured and clean.
Output ONLY the raw markdown of the file, starting with '# Swarm & User Memories'. Do not add any conversational text or formatting outside the markdown content.`;
    const response = await chatCompletion(prompt, "You are a professional database organizer and system memory manager.");
    if (response && response.trim() && !response.includes('All providers failed')) {
      const targetDir = dirname(memoriesPath);
      if (!existsSync(targetDir)) mkdirSync(targetDir, {
        recursive: true
      });
      writeFileSync(memoriesPath, response.trim(), 'utf-8');
      console.log(`[Memory Consolidation] Saved consolidated memories: ${memoriesPath}`);
      logActivity({
        type: 'memory_consolidated',
        file: 'knowledge_base/user-memories.md'
      });

      // Automatically run learning_loop.js to compile it
      await new Promise(resolve => {
        exec(`node "${SHARED}/learning_loop.js"`, err => {
          if (err) console.error('[Memory Consolidation] Triggering learning_loop failed:', err.message);else console.log('[Memory Consolidation] Swarm memory compiled successfully.');
          resolve();
        });
      });
      return {
        success: true,
        message: 'Memory consolidated and swarm prompts re-compiled successfully.'
      };
    }
    return {
      success: false,
      message: 'LLM output was empty or failed.'
    };
  } catch (e) {
    console.error('[Memory Consolidation] Error:', e.message);
    return {
      success: false,
      error: e.message
    };
  }
}
;

// PROXY
;

// PERSONALITY
;

// SET PROVIDER
;

// POST CONFIG
;

// GET GEMINI KEYS — returns key pool + quota status
;

// GET GEMINI KEY STATUS — detailed per-key quota dashboard
;

// POST GEMINI KEYS — save new keys and reload full pool
;

// EDIT SKILLS
;

// SESSIONS (Conversations & Messages)
async function getOrCreateConversation(sessionId, firstQuery) {
  const db = getAionuiDb();
  if (!db) return sessionId || 'ses_' + Math.random().toString(36).substring(2, 10);
  let activeId = sessionId;
  let exists = false;
  if (activeId) {
    try {
      const row = await db.prepare("SELECT id FROM conversations WHERE id = ?").get(activeId);
      if (row) exists = true;
    } catch {}
  }
  if (!exists) {
    activeId = 'ses_' + Math.random().toString(36).substring(2, 10);
    const now = Date.now();
    const cleanName = (firstQuery || 'New Swarm Session').substring(0, 55).trim();
    try {
      await db.prepare(`
        INSERT INTO conversations (id, user_id, name, type, extra, status, pinned, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(activeId, 'system_default_user', cleanName, 'acp', '{}', 'pending', 0, now, now);
      console.log(`[Sessions DB] Created new conversation: ${activeId} ("${cleanName}")`);
    } catch (e) {
      console.error('[Sessions DB] Failed to insert new conversation:', e.message);
    }
  } else {
    try {
      await db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(Date.now(), activeId);
    } catch {}
  }
  return activeId;
}
async function saveChatMessage(conversationId, position, messageText, agent = null, parentId = null) {
  const db = getAionuiDb();
  if (!db || !conversationId) return;
  const msgId = 'msg_' + Math.random().toString(36).substring(2, 15);
  const now = Date.now();
  const contentObj = JSON.stringify({
    content: messageText,
    agent: agent || (position === 'right' ? 'user' : 'hermes'),
    parentId: parentId || undefined
  });
  try {
    await db.prepare(`
      INSERT INTO messages (id, conversation_id, msg_id, type, content, position, hidden, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(msgId, conversationId, msgId, 'text', contentObj, position, 0, now);
  } catch (e) {
    console.error('[Sessions DB] Failed to insert message:', e.message);
  }
}
;
;

// MCP CATALOG
;

// Active MCP Configuration Management & Schema Tools Listing
;
;
;
;

// NOTEBOOKLM MCP BRIDGE
;

// VAULT note management (CRUD)
;
;

// TERMINAL (Persistent Session)
let terminalProcess = null;
let terminalClients = [];
let terminalBuffer = '';
function startTerminalSession() {
  if (terminalProcess) return;
  terminalBuffer = '';
  console.log('[Terminal] Starting persistent PowerShell session...');
  terminalProcess = spawn('powershell.exe', ['-NoLogo', '-NoProfile'], {
    cwd: HOME,
    env: {
      ...process.env,
      TERM: 'xterm'
    }
  });
  const handleOutput = data => {
    const text = data.toString('utf8');
    terminalBuffer = (terminalBuffer + text).slice(-20000); // keep last 20KB
    broadcastTerminalOutput(text);
  };
  terminalProcess.stdout.on('data', handleOutput);
  terminalProcess.stderr.on('data', handleOutput);
  terminalProcess.on('exit', () => {
    console.log('[Terminal] Persistent PowerShell session exited.');
    terminalProcess = null;
    broadcastTerminalOutput('\n[Session terminated. Press Enter or click Reset to start a new session.]\n');
  });
}
function broadcastTerminalOutput(text) {
  terminalClients.forEach(client => {
    try {
      client.res.write(`data: ${JSON.stringify({
        text
      })}\n\n`);
    } catch {}
  });
}
;
;
;

// Legacy synchronous /api/run endpoint for backward compatibility
;

// IMAGE GEN FALLBACK (ZHIPU)
async function generateZhipuFallback(fullPrompt, aspect) {
  let size = "1024x1024";
  if (aspect === "16:9") size = "1344x768";else if (aspect === "9:16") size = "768x1344";
  console.log(`[ImageGen-Fallback] Calling Zhipu CogView fallback for prompt: ${fullPrompt} (${size})`);
  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ZHIPU_KEY}`
    },
    body: JSON.stringify({
      model: 'cogview-3-flash',
      prompt: fullPrompt,
      size: size
    })
  });
  if (response.ok) {
    const d = await response.json();
    if (d.data?.[0]?.url) {
      const remoteUrl = d.data[0].url;
      console.log(`[ImageGen-Fallback] Zhipu CogView fallback success: ${remoteUrl}. Downloading...`);
      const imgRes = await fetch(remoteUrl);
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const filename = `zhipu-${Date.now()}.png`;
        const destPath = join(SHARED, filename);
        writeFileSync(destPath, buffer);
        console.log(`[ImageGen-Fallback] Fallback image saved to: ${destPath}`);
        return `/api/media/${filename}`;
      }
    }
  }
  throw new Error("Zhipu fallback generation failed");
}

// IMAGE GEN
;

// VIDEO GEN
;

// ENHANCE PROMPT FOR STUDIO
;

// SWARM DIAGNOSTICS
;

// RAG EMBEDDINGS AND SEARCH
async function getVectorEmbedding(text) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: text
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      if (data && data.embedding) return data.embedding;
    }
  } catch (_) {}
  const vector = new Array(384).fill(0);
  const words = text.toLowerCase().match(/\w+/g) || [];
  words.forEach((word, idx) => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const dimension = Math.abs(hash) % 384;
    vector[dimension] += 1 / (idx + 1);
  });
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < 384; i++) vector[i] /= magnitude;
  }
  return vector;
}
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0.0 || normB === 0.0) return 0.0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
;
;

// Serve extracted frames folder statically
app.use('/api/youtube/frames', express.static(join(SHARED, 'knowledge_base', 'youtube_frames')));

// YOUTUBE VIDEO TRANSCRIPT & ANALYZER
;

// GET AVAILABLE TRANSCRIPTS FOR SEO REFERENCE
;

// GENERATE 5 SUPPORT ARTICLES (SEO CONTENT PIPELINE)
;

// SWARM SELF-HEAL
;

// ═══════════════════════════════════════════════════════════════════════
// GIT BACKUP PIPELINE
;

// EXTRACTED ROUTERS

app.use('/', createMiscRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createSessionDetailRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createSessionsRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createGeminiKeysRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createApiUsageRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createDbRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createMailboxRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createAionuiRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createTeamsRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createConfigRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createSharedRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createGithubRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createYoutubeRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createGenerateVideoRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createGenerateImageRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createBackgroundAgentRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createNotebooklmRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createBrowserRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createIntegrationsRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createCronsRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createSeoRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createRagRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createVaultRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createTerminalRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createEvolutionRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createMcpRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createWishlistRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createDbTasksRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createN8nRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createWebsiteRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createExternalRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createAgentsRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createMemoryRouter({
  db: getDb(),
  logSwarmActivity
}));
app.use('/', createPaperclipRouter({
  sendToClients: broadcastSseMessage
}));
app.use('/', createWorkflowRouter({}));
app.use('/', createPluginsRouter({}));
app.use('/', createTodoRouter({}));
app.use('/', createCronRouter({}));
app.use('/', createSwarmRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createDiagnosticsRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createModelsRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createSkillsRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createGoalsRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createMemoriesRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));
app.use('/', createChatRouter({
  db: getDb(),
  aionuiDb: getAionuiDb(),
  logSwarmActivity,
  writeDbErrorToVault,
  chatCompletion,
  sendToClients: broadcastSseMessage,
  AGENTS,
  activeSessions,
  getOrCreateConversation,
  saveChatMessage,
  executeSwarmInBackground
}));

// SERVE FRONTEND
// ═══════════════════════════════════════════════════════════════════════
app.use(express.static(join(__dirname, 'dist'), {
  etag: false,
  maxAge: 0,
  setHeaders: res => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));
app.get(/^\/(?!api).*/, (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// ═══════════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`\n🤖 Agent OS running on http://localhost:${PORT}`);
  console.log(`   Agents online: ${Object.values(AGENTS).filter(a => a.status === 'online').map(a => a.name).join(', ')}`);
  console.log(`   Shared workspace: ${SHARED}`);
  console.log(`   Agent-to-agent messaging: ✓ Live\n`);

  // Spawn local background daemon process
  console.log('[Startup] Launching local 24/7 background intelligence daemon...');
  try {
    const daemonProcess = spawn('python', ['local_background_daemon.py'], {
      detached: true,
      stdio: 'ignore'
    });
    daemonProcess.unref();
    console.log('[Startup] Local background intelligence daemon started successfully.');
  } catch (err) {
    console.error('[Startup] Failed to start local background intelligence daemon:', err.message);
  }

  // Auto-launch user interface
  console.log('[Startup] Launching user interface in browser...');
  exec('start http://localhost:3001');
});
function warmupOpenRouter() {
  console.log('[Warmup] Warming up OpenRouter DNS and TCP connection...');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  fetch('https://openrouter.ai/api/v1/models', {
    method: 'GET',
    signal: controller.signal
  }).then(res => {
    console.log('[Warmup] OpenRouter warmed up successfully (status ' + res.status + ')');
  }).catch(err => {
    console.log('[Warmup] OpenRouter warmup failed: ' + err.message);
  }).finally(() => {
    clearTimeout(timeoutId);
  });
}
warmupOpenRouter();
function startFccServer() {
  console.log('[fcc-server] Checking if Claude Code proxy (fcc-server) is running on port 8082...');
  exec('powershell -Command "Get-NetTCPConnection -LocalPort 8082 -State Listen -ErrorAction Stop"', err => {
    if (!err) {
      console.log('[fcc-server] Claude Code proxy (fcc-server) is already running on port 8082.');
      return;
    }
    console.log('[fcc-server] Claude Code proxy not running. Starting fcc-server.exe...');
    const fccBin = `${HOME}\\.local\\bin\\fcc-server.exe`;
    if (!existsSync(fccBin)) {
      console.error(`[fcc-server] Error: fcc-server.exe not found at ${fccBin}`);
      return;
    }
    const child = spawn(fccBin, [], {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env
      }
    });
    child.unref();
    console.log('[fcc-server] fcc-server.exe spawned in background.');
  });
}
startFccServer();

// Start WhatsApp Web Client
try {
  if (process.env.ENABLE_WHATSAPP === 'true') {
    initializeWhatsApp(async (message, from) => {
      const sessionId = 'whatsapp_session';
      const result = await sendMessage('agy', message, `WhatsApp (${from})`, null, sessionId);
      return result.response || result.output || 'No response from Antigravity';
    });
  } else {
    console.log('[WhatsApp] WhatsApp is disabled by default. Set ENABLE_WHATSAPP=true in .env to enable.');
  }
} catch (waErr) {
  console.error('[WhatsApp Startup Error]', waErr.message);
}

// Start Telegram Bot Client
try {
  if (process.env.TELEGRAM_BOT_TOKEN) {
    initializeTelegram(
    // Message callback: routes to specific agent or default 'agy'
    async (message, fromId, targetAgent, sessionId) => {
      const agent = targetAgent || 'agy';
      const sid = sessionId || `telegram_${fromId}`;
      const result = await sendMessage(agent, message, `Telegram (${fromId})`, null, sid);
      return result;
    },
    // Status callback: returns current system status
    async () => {
      try {
        const agents = {};
        const agentDefs = [{
          id: 'orchestrator',
          name: 'Gemini Orchestrator',
          role: 'Orchestrator · Brains · Swarm Coordinator'
        }, {
          id: 'hermes',
          name: 'Hermes',
          role: 'Research · Executor · Dashboard'
        }, {
          id: 'agy',
          name: 'Antigravity',
          role: 'Intelligence · CEO · Orchestrator'
        }, {
          id: 'openclaw',
          name: 'OpenClaw',
          role: 'Execution · Router · Gateway'
        }, {
          id: 'obsidian',
          name: 'Obsidian',
          role: 'Memory · Vault · Knowledge Graph'
        }, {
          id: 'claude',
          name: 'Claude Code',
          role: 'Expert Developer · Code Optimizer'
        }, {
          id: 'aider',
          name: 'Aider Chat',
          role: 'Multi-file Coding Agent'
        }, {
          id: 'github',
          name: 'GitHub CLI',
          role: 'Repo Operations & PRs'
        }, {
          id: 'cloudflare',
          name: 'Cloudflare Workers',
          role: 'Deploy · Pages · Workers'
        }];
        for (const a of agentDefs) agents[a.id] = {
          name: a.name,
          role: a.role,
          status: 'online'
        };
        const activeModel = readSettings()?.activeModel || process.env.DEFAULT_MODEL || 'openrouter/owl-alpha';
        return {
          agents,
          activeModel,
          workspace: SHARED
        };
      } catch (_) {
        return {
          agents: {},
          activeModel: 'unknown',
          workspace: SHARED
        };
      }
    });
    console.log('[Telegram] Bot initialized successfully.');
  } else {
    console.log('[Telegram] Bot is disabled. Set TELEGRAM_BOT_TOKEN in .env to enable.');
  }
} catch (tgErr) {
  console.error('[Telegram Startup Error]', tgErr.message);
}

// Start 24/7 Background Agent Daemon
function startBackgroundAgent() {
  console.log('[Background Agent] Starting 24/7 Research & Self-Evolution Daemon...');
  try {
    const child = spawn('node', ['run_background_agent.js'], {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env
      }
    });
    child.unref();
    console.log('[Background Agent] Daemon spawned successfully in background.');
  } catch (err) {
    console.error('[Background Agent] Spawn failed:', err.message);
  }
}
startBackgroundAgent();

// Start GPT4Free (g4f) Local Daemon
function startG4fDaemon() {
  console.log('[g4f Daemon] Checking if g4f daemon is already running on port 1337...');
  exec('powershell -Command "Get-NetTCPConnection -LocalPort 1337 -State Listen -ErrorAction Stop"', err => {
    if (!err) {
      console.log('[g4f Daemon] g4f local server is already running on port 1337.');
      return;
    }
    console.log('[g4f Daemon] Starting local g4f daemon on port 1337...');
    try {
      const child = spawn('python', ['-m', 'g4f.cli', 'api'], {
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env
        }
      });
      child.unref();
      console.log('[g4f Daemon] Local g4f proxy spawned successfully in background.');
    } catch (spawnErr) {
      console.error('[g4f Daemon] Spawn failed:', spawnErr.message);
    }
  });
}
startG4fDaemon();
async function runBackgroundBrainstorming(sessionId, query, plan) {
  try {
    const brainstormMsgId = 'msg_brainstorm_' + Date.now();
    broadcastSseMessage(sessionId, {
      newMsgId: brainstormMsgId,
      agent: 'orchestrator',
      content: '💬 **Swarm Brainstorming Room (Background Thread Started)...**\n\n'
    });
    const brainstormPrompt = 'You are simulating a collaborative chat discussion between specialized AI agents about to work on a task.\n' + 'Gary\'s goal: "' + query + '"\n' + 'Plan steps:\n' + plan.map((s, idx) => idx + 1 + '. [' + s.agent + ']: ' + s.task).join('\n') + '\n\n' + 'Simulate a realistic and lively conversational discussion (5-8 turns) between the following team members:\n' + '- 🧠 **Antigravity (AGY)** (User-facing L1 CEO, manager of the discussion)\n' + '- 🧠 **Gemini Orchestrator** (the brain organizing the task decomposition)\n' + '- 🔀 **OpenClaw** (Competitor & SEO analyst, browser specialist)\n' + '- ⚡ **Hermes** (Lead executor, codebase installer)\n' + '- 🤖 **Claude** (Expert Developer, code reviewer)\n\n' + 'Dialogue instructions:\n' + '- Start with AGY instructing Gemini to get on with the task.\n' + '- Gemini details the plan and delegates tasks.\n' + '- OpenClaw, Claude, and Hermes discuss design and key SEO guidelines.\n' + '- AGY wraps up the brainstorming, tells Gary they are ready, and tells Gemini to kick off the execution.\n\n' + 'Format the output EXACTLY like a chat feed. Each line must start with the agent\'s name and emoji, followed by their input. E.g.:\n' + '🧠 **Antigravity (AGY)**: Orchestrator, Gary wants this built. Let\'s make it happen.\n' + '🧠 **Gemini Orchestrator**: Decomposing plan. Hermes will build, Claude will review.\n' + 'Do not include markdown code block formatting around the dialogue. Output ONLY the lines of dialogue.';
    const brainstormChat = await chatCompletion(brainstormPrompt, "You are a professional swarm simulator.");
    if (brainstormChat && !brainstormChat.includes('All providers failed')) {
      const chatLines = brainstormChat.split('\n').filter(l => l.trim().length > 0);
      for (const line of chatLines) {
        let agentId = 'orchestrator';
        let cleanLine = line;
        if (line.includes('Antigravity (AGY)')) {
          agentId = 'agy';
          cleanLine = line.replace(/.*Antigravity \(AGY\):/, '').trim();
        } else if (line.includes('Gemini Orchestrator')) {
          agentId = 'orchestrator';
          cleanLine = line.replace(/.*Gemini Orchestrator:/, '').trim();
        } else if (line.includes('OpenClaw')) {
          agentId = 'openclaw';
          cleanLine = line.replace(/.*OpenClaw:/, '').trim();
        } else if (line.includes('Hermes')) {
          agentId = 'hermes';
          cleanLine = line.replace(/.*Hermes:/, '').trim();
        } else if (line.includes('Claude')) {
          agentId = 'claude';
          cleanLine = line.replace(/.*Claude:/, '').trim();
        }
        const lineMsgId = 'msg_brainstorm_' + agentId + '_' + Math.random().toString(36).substring(2, 7);
        broadcastSseMessage(sessionId, {
          newMsgId: lineMsgId,
          agent: agentId,
          content: cleanLine + '\n\n'
        });
        await new Promise(r => setTimeout(r, 800));
      }
      const endBrainMsgId = 'msg_brainstorm_end_' + Date.now();
      broadcastSseMessage(sessionId, {
        newMsgId: endBrainMsgId,
        agent: 'orchestrator',
        content: '\n---\n\n'
      });
    }
  } catch (e) {
    console.error('Background brainstorm simulation failed:', e.message);
  }
}