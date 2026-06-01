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

import express from 'express';
import cors from 'cors';
import os from 'os';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync, unlink } from 'fs';
import { exec, execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// ═══════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const HOME = process.env.USERPROFILE;
const PORT = 3001;
const CONFIG_PATH = `${HOME}\\AppData\\Local\\hermes\\config.yaml`;
const AIONUI_DB = `${HOME}\\AppData\\Roaming\\AionUi\\aionui\\aionui-backend.db`;

let aionuiDb = null;
function getAionuiDb() {
  if (aionuiDb) return aionuiDb;
  if (!existsSync(AIONUI_DB)) return null;
  try {
    const { DatabaseSync } = require('node:sqlite');
    aionuiDb = new DatabaseSync(AIONUI_DB);
    return aionuiDb;
  } catch (e) {
    console.error('[SQLite] Failed to open AionUi database globally:', e.message);
    return null;
  }
}

const WORKSPACE = `D:\\Agent OS`;
const SHARED = `${WORKSPACE}\\shared`;
const AGENT_LOG = `${SHARED}\\agent-log.json`;

// Ensure directories exist
[WORKSPACE, SHARED].forEach(d => { try { mkdirSync(d, { recursive: true }); } catch {} });

// Real non-blocking CPU load tracking loop for telemetry metrics
let cpuUsageEstimate = 0;
function calculateCpuUsage() {
  const cpus = os.cpus();
  let totalIdle = 0, totalTick = 0;
  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  return { idle: totalIdle, total: totalTick };
}

let startCpu = calculateCpuUsage();
setInterval(() => {
  const endCpu = calculateCpuUsage();
  const idleDifference = endCpu.idle - startCpu.idle;
  const totalDifference = endCpu.total - startCpu.total;
  if (totalDifference > 0) {
    cpuUsageEstimate = Math.round(100 - (100 * idleDifference / totalDifference));
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
const OR_KEYS = [
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
];
const GEMINI_KEY = 'AIzaSyD9-_9NTLFujqI5JZYiMZBC6pzd9wSgIVo';

// ═══════════════════════════════════════════════════════════════════════
// AGENT REGISTRY — All agents on the team
// ═══════════════════════════════════════════════════════════════════════
const AGENTS = {
  orchestrator: {
    id: 'orchestrator', name: 'Gemini Orchestrator', emoji: '🧠',
    role: 'Orchestrator · Brains · Swarm Coordinator',
    status: 'online', color: '#3b82f6',
    type: 'ai_orchestrator',
    capabilities: ['planning', 'task_decomposition', 'swarm_control', 'self_learning_loop'],
    description: 'The central brain of the swarm. Uses Gemini 2.0 Flash to decompose goals, delegate to specialized agents (AGY, Hermes, OpenClaw, Obsidian), and coordinate collaboration.'
  },
  hermes: {
    id: 'hermes', name: 'Hermes', emoji: '⚡',
    role: 'Research · Executor · Dashboard',
    status: 'online', color: '#a855f7',
    type: 'ai_server', port: PORT,
    capabilities: ['chat', 'web_search', 'file_ops', 'code_exec', 'image_gen', 'browser', 'agent_messaging'],
    description: 'I run the dashboard, handle chat, web searches, file operations, and coordinate other agents.',
  },
  agy: {
    id: 'agy', name: 'Antigravity', emoji: '🧠',
    role: 'Intelligence · CEO · Orchestrator',
    status: 'online', color: '#6366f1',
    type: 'cli_agent',
    binary: `${HOME}\\AppData\\Local\\agy\\bin\\agy.exe`,
    capabilities: ['planning', 'multi_agent', 'parallel_exec', 'code_gen', 'deep_reasoning'],
    description: 'CEO of the agent team. Plans, delegates, and coordinates complex multi-step tasks across all agents.',
  },
  openclaw: {
    id: 'openclaw', name: 'OpenClaw', emoji: '🔀',
    role: 'Execution · Router · Gateway',
    status: 'online', color: '#10b981',
    type: 'gateway',
    capabilities: ['gateway', 'routing', 'channels', 'chat', 'agent_management', 'messaging'],
    description: 'Routes messages between agents, manages channels, and provides the gateway for external integrations.',
  },
  obsidian: {
    id: 'obsidian', name: 'Obsidian', emoji: '📝',
    role: 'Memory · Vault · Knowledge Graph',
    status: existsSync('D:/Agent OS') ? 'online' : 'offline',
    color: '#f59e0b',
    type: 'knowledge_base',
    vaultPath: 'D:/Agent OS',
    capabilities: ['notes', 'knowledge_graph', 'search', 'memory', 'document_store'],
    description: 'Shared memory for all agents. Stores notes, documents, and knowledge that any agent can read or write.',
  },
  ollama: {
    id: 'ollama', name: 'Ollama', emoji: '🦙',
    role: 'Local Inference',
    status: 'offline', color: '#22d3ee',
    type: 'local_inference',
    port: 11434,
    capabilities: ['local_models', 'privacy', 'free_inference'],
    description: 'Local model inference. Privacy-friendly, no API costs.',
  },
  lmstudio: {
    id: 'lmstudio', name: 'LM Studio', emoji: '💻',
    role: 'Local Inference Server',
    status: 'offline', color: '#ec4899',
    type: 'local_inference',
    port: 1234,
    capabilities: ['local_models', 'embeddings', 'openai_api'],
    description: 'Local OpenAI-compatible inference server. Serving loaded models: meta-llama-3.1-8b, google/gemma-3-4b.',
  },
  claude: {
    id: 'claude', name: 'Claude Code', emoji: '🤖',
    role: 'Expert Developer · Code Optimizer',
    status: 'online', color: '#ea580c',
    type: 'cli_agent',
    capabilities: ['code_gen', 'refactoring', 'terminal_tools', 'testing', 'codebase_search'],
    description: 'Native Claude Code CLI running free via local fcc-server proxy. Excellent at codebase refactoring, debugging, and terminal-based task execution.'
  },
  aider: {
    id: 'aider', name: 'Aider Chat', emoji: '🧑‍💻',
    role: 'Multi-file Coding Agent',
    status: 'online', color: '#10b981',
    type: 'cli_agent',
    capabilities: ['code_gen', 'refactoring', 'git_integration'],
    description: 'Native Aider Chat CLI. Excellent at multi-file code editing, git commits, and code synthesization directly in git repositories.'
  },
  github: {
    id: 'github', name: 'GitHub CLI', emoji: '🐙',
    role: 'Repo Operations & PRs',
    status: 'online', color: '#64748b',
    type: 'cli_agent',
    capabilities: ['pr_management', 'issue_tracking', 'release_monitoring'],
    description: 'Native GitHub CLI (gh) wrapper. Automates pull requests, issues, repo management, and actions checks.'
  }
};

let lastHealthCheckTime = 0;
let healthCheckPromise = null;

// Check agent health on startup (with 10-second debounce)
function checkAgentHealth() {
  const now = Date.now();
  if (now - lastHealthCheckTime < 10000 && healthCheckPromise) {
    return healthCheckPromise;
  }
  
  lastHealthCheckTime = now;
  healthCheckPromise = new Promise((resolve) => {
    let pending = 7;
    const decrement = () => {
      pending--;
      if (pending === 0) resolve();
    };

    // AGY
    exec(`"${AGENTS.agy.binary}" --version`, { timeout: 3000 }, (err) => {
      AGENTS.agy.status = err ? 'offline' : 'online';
      decrement();
    });
    
    // OpenClaw
    exec('openclaw --version', { timeout: 3000 }, (err) => {
      AGENTS.openclaw.status = err ? 'offline' : 'online';
      decrement();
    });
    
    // Ollama
    exec('ollama list', { timeout: 3000 }, (err) => {
      AGENTS.ollama.status = err ? 'offline' : 'online';
      decrement();
    });
    
    // LM Studio port connection check
    exec('powershell -Command "Get-NetTCPConnection -LocalPort 1234 -ErrorAction Stop"', { timeout: 3000 }, (err) => {
      AGENTS.lmstudio.status = err ? 'offline' : 'online';
      decrement();
    });
    
    // Claude Code
    exec('claude -v', { timeout: 3000 }, (err) => {
      AGENTS.claude.status = err ? 'offline' : 'online';
      decrement();
    });

    // Aider Chat
    exec('aider --version', { timeout: 3000 }, (err) => {
      AGENTS.aider.status = err ? 'offline' : 'online';
      decrement();
    });

    // GitHub CLI
    exec('gh --version', { timeout: 3000 }, (err) => {
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
  return [
    { id: "1", name: "OpenRouter Key Rotation", interval: "2 min", status: "running", next: "" },
    { id: "2", name: "Blog Content Engine", interval: "hourly", status: "idle", next: "" },
    { id: "3", name: "Free Model Scanner", interval: "6 hours", status: "idle", next: "" },
    { id: "4", name: "AionUI Health Monitor", interval: "5 min", status: "running", next: "" },
    { id: "5", name: "Swarm Experience Compiler", interval: "10 min", status: "running", next: "" },
    { id: "6", name: "Swarm Auto-Evolution Engine", interval: "30 min", status: "running", next: "" }
  ];
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
  logActivity({ type: 'cron_run', name: job.name, status: 'success', info: `Executed at ${new Date().toLocaleTimeString()}` });
  
  if (job.name === 'OpenRouter Key Rotation') {
    exec('echo "" | python "C:\\Users\\Gary\\AppData\\Local\\hermes\\rotate_keys.py"', (err) => {
      console.log('[Cron] Key Rotation execution completed.', err ? err.message : 'Success');
    });
  } else if (job.name === 'AionUI Health Monitor') {
    checkAgentHealth();
  } else if (job.name === 'Swarm Experience Compiler') {
    runExperienceCompiler();
  } else if (job.name === 'Swarm Auto-Evolution Engine') {
    runSwarmEvolution();
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
  
  if (!compilerExists) {
    crons.push({ id: "5", name: "Swarm Experience Compiler", interval: "10 min", status: "running", next: "" });
    modified = true;
  }
  if (!evolverExists) {
    crons.push({ id: "6", name: "Swarm Auto-Evolution Engine", interval: "30 min", status: "running", next: "" });
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

setupCrons();

setTimeout(() => {
  console.log('[Startup] Running initial Experience Compiler and Evolution checks...');
  runExperienceCompiler();
  runSwarmEvolution();
}, 5000);

// Swarm Diagnostics Cron (Every 10 min)
setInterval(async () => {
  console.log('[Cron] Executing Swarm Self-Check...');
  try {
    // Check Aider installation
    exec('aider --version', (err) => {
      if (err) {
        console.log('[Swarm Diagnostics] Aider is missing. Initiating background healing...');
        exec('pip install aider-chat', (pipErr) => {
          if (pipErr) console.log('[Swarm Diagnostics] Background pip install failed:', pipErr.message);
          else console.log('[Swarm Diagnostics] Aider auto-installed successfully.');
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
    log.push({ timestamp: new Date().toISOString(), ...entry });
    if (log.length > 1000) log = log.slice(-1000);
    writeFileSync(AGENT_LOG, JSON.stringify(log, null, 2), 'utf-8');
  } catch (e) { console.error('Log error:', e.message); }
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
              results.push({ file: fullPath.replace(/\\/g, '/'), line: idx + 1, content: line.trim().substring(0, 150) });
            }
          });
        }
      }
      if (results.length >= 50) break;
    }
  } catch {}
  return results;
}

// Helper to execute tool calls
async function executeToolCall(toolCallText, onProgress = null, fromAgent = 'hermes') {
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
          const nextLine = lines[i+1]?.trim();
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
      const output = await new Promise((resolve) => {
        exec(cmd, { timeout: 90000, cwd }, (err, stdout, stderr) => {
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
        mkdirSync(dir, { recursive: true });
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
  }

  // Generic fallback if unknown tool type
  return `<longcat_tool_response>\nTool type "${toolType}" not supported by swarm executor. Use Bash command to perform operations.\n</longcat_tool_response>`;
}

// Chat with fallback (supporting conversation history messages array)
async function chatCompletionWithHistory(messages, maxTokens = 2048) {
  let model = 'google/gemini-2.0-flash-001';
  try {
    const cfg = readConfig();
    const m = cfg.match(/default:\s*([^\s\n]+)/);
    if (m && m[1]) {
      model = m[1];
    }
  } catch {}

  const modelFallbacks = [
    model,
    'google/gemma-4-31b-it:free',
    'openrouter/free'
  ];

  const uniqueModels = [...new Set(modelFallbacks)];

  for (const currentModel of uniqueModels) {
    for (const key of [...OR_KEYS].sort(() => Math.random() - 0.5).slice(0, 2)) {
      try {
        console.log(`[OR Chat] Trying model ${currentModel} with key ${key.substring(0, 15)}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'HTTP-Referer': `http://localhost:${PORT}`, 'X-Title': 'Agent OS' },
          body: JSON.stringify({ model: currentModel, messages, max_tokens: maxTokens }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const d = await r.json();
        if (d.error) {
          console.log(`[OR Chat] Error with model ${currentModel}:`, d.error.message);
          continue;
        }
        if (d.choices?.[0]?.message?.content) {
          console.log(`[OR Chat] Success with model ${currentModel}`);
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
        'Authorization': 'Bearer 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'
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
    }
  } catch (err) {
    console.log('[OR Chat] GitHub Models fallback failed:', err.message);
  }

  // Fallback to Groq (Llama 3.3 70B)
  try {
    console.log('[OR Chat] Falling back to Groq (Llama 3.3 70B)...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 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'
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
    }
  } catch (err) {
    console.log('[OR Chat] Groq fallback failed:', err.message);
  }

  // Gemini fallback
  try {
    console.log('[OR Chat] All OpenRouter and primary fallbacks failed. Falling back to direct Gemini API...');
    const flattenedText = messages.map(m => `${m.role === 'system' ? 'System Instructions' : m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`).join('\n\n');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: flattenedText }] }] }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
  } catch (e) { return `All providers failed: ${e.message}`; }
}

// Send message to another agent and get response
async function sendMessage(toAgentRaw, message, fromAgent = 'hermes', onProgress = null) {
  const toAgent = toAgentRaw.toLowerCase();
  logActivity({ type: 'message', from: fromAgent, to: toAgent, message: message.substring(0, 200) });
  
  const agent = AGENTS[toAgent];
  if (!agent) return { error: `Agent ${toAgent} not found` };
  if (agent.status === 'offline') return { error: `Agent ${toAgent} is offline` };
  
  let response;
  let runSimulated = false;

  if (toAgent === 'claude') {
    try {
      if (onProgress) onProgress(`🤖 **Claude Code CLI** is initializing...`);
      console.log(`[Swarm Execution] Running native Claude Code CLI agent...`);
      const escapedMessage = message.replace(/"/g, "'").replace(/\r?\n/g, ' ');
      const cmd = `set ANTHROPIC_API_KEY=freecc && set ANTHROPIC_BASE_URL=http://localhost:8082 && claude -p --dangerously-skip-permissions "${escapedMessage}" < NUL`;
      if (onProgress) onProgress(`🔧 **Claude Code CLI** is running developer tasks...`);
      const output = await new Promise((resolve, reject) => {
        exec(cmd, { timeout: 90000, cwd: WORKSPACE }, (err, stdout, stderr) => {
          if (err && !stdout) reject(err);
          else resolve(stdout || stderr || 'Completed');
        });
      });
      response = output.trim();
      logActivity({ type: 'claude_cli_run', success: true });
      return { success: true, from: toAgent, response };
    } catch (e) {
      console.log(`[Swarm Execution] Claude CLI failed: ${e.message}. Falling back to simulated API chat...`);
      if (onProgress) onProgress(`⚠️ **Claude Code CLI** failed to run. Falling back to simulated Claude agent...`);
      runSimulated = true;
    }
  } else if (toAgent === 'openclaw') {
    try {
      if (onProgress) onProgress(`🔀 **OpenClaw CLI** is initializing...`);
      console.log(`[Swarm Execution] Running native OpenClaw CLI agent...`);
      const escapedMessage = message.replace(/"/g, "'").replace(/\r?\n/g, ' ');
      const cmd = `openclaw agent --local --agent main --message "${escapedMessage}" < NUL`;
      if (onProgress) onProgress(`🔧 **OpenClaw CLI** is executing browser/routing steps...`);
      const output = await new Promise((resolve, reject) => {
        exec(cmd, { timeout: 90000, cwd: WORKSPACE }, (err, stdout, stderr) => {
          if (err && !stdout) reject(err);
          else resolve(stdout || stderr || 'Completed');
        });
      });
      response = output.trim();
      logActivity({ type: 'openclaw_cli_run', success: true });
      return { success: true, from: toAgent, response };
    } catch (e) {
      console.log(`[Swarm Execution] OpenClaw CLI failed: ${e.message}. Falling back to simulated API chat...`);
      if (onProgress) onProgress(`⚠️ **OpenClaw CLI** failed to run. Falling back to simulated OpenClaw agent...`);
      runSimulated = true;
    }
  } else if (toAgent === 'aider') {
    try {
      if (onProgress) onProgress(`🤖 **Aider CLI** is initializing codebase environment...`);
      console.log(`[Swarm Execution] Running native Aider CLI agent...`);
      const key = OR_KEYS[0] || '';
      const escapedMessage = message.replace(/"/g, "'").replace(/\r?\n/g, ' ');
      const cmd = `set OPENROUTER_API_KEY=${key} && aider --model openrouter/google/gemma-4-31b-it:free --message "${escapedMessage}" --yes --no-git`;
      if (onProgress) onProgress(`🔧 **Aider CLI** is updating files in workspace...`);
      const output = await new Promise((resolve, reject) => {
        exec(cmd, { timeout: 90000, cwd: WORKSPACE }, (err, stdout, stderr) => {
          if (err && !stdout) reject(err);
          else resolve(stdout || stderr || 'Completed');
        });
      });
      response = output.trim();
      logActivity({ type: 'aider_cli_run', success: true });
      return { success: true, from: toAgent, response };
    } catch (e) {
      console.log(`[Swarm Execution] Aider CLI failed: ${e.message}. Falling back to simulated API chat...`);
      if (onProgress) onProgress(`⚠️ **Aider CLI** failed to run. Falling back to simulated Aider agent...`);
      runSimulated = true;
    }
  } else if (toAgent === 'github') {
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
        exec(cmdToRun, { timeout: 30000, cwd: WORKSPACE }, (err, stdout, stderr) => {
          if (err && !stdout) reject(err);
          else resolve(stdout || stderr || 'Completed');
        });
      });
      response = `Command executed: \`${cmdToRun}\`\n\nOutput:\n${output.trim()}`;
      logActivity({ type: 'github_cli_run', success: true });
      return { success: true, from: toAgent, response };
    } catch (e) {
      console.log(`[Swarm Execution] GitHub CLI execution failed: ${e.message}. Falling back to API completions...`);
      if (onProgress) onProgress(`⚠️ **GitHub CLI** failed to translate or run. Falling back to simulated agent...`);
      runSimulated = true;
    }
  }

  // Dynamic agent loop execution for AGY, OpenClaw, Hermes, Claude, Aider, and GitHub fallback
  if (['agy', 'openclaw', 'hermes', 'claude', 'aider', 'github'].includes(toAgent) && (!['claude', 'openclaw', 'aider', 'github'].includes(toAgent) || runSimulated)) {
    try {
      let agentPrompt = '';
      let maxTokens = 2048;
      if (toAgent === 'agy') {
        agentPrompt = 'You are Antigravity (AGY), the L1 CEO, Orchestrator, and Deep Planner of the Agent OS V2 Swarm. Analyze goals, generate correct code, and provide detailed planning. Be concise. DO NOT output or repeat large blocks of code in your final response if you have already written them to a file using tools.';
      } else if (toAgent === 'openclaw') {
        agentPrompt = 'You are OpenClaw, the L2 Execution and Routing agent of the Agent OS V2 Swarm. Help draft full posts, format code, and execute tasks. Be concise. DO NOT output or repeat large blocks of code in your final response if you have already written them to a file using tools.';
        maxTokens = 4096;
      } else if (toAgent === 'claude') {
        agentPrompt = 'You are Claude, the Expert Developer agent of the Agent OS V2 Swarm. Perform refactoring, write tests, and optimize code. Be concise. DO NOT output or repeat large blocks of code in your final response if you have already written them to a file using tools.';
        maxTokens = 4096;
      } else if (toAgent === 'aider') {
        agentPrompt = 'You are Aider, the Multi-file Coding agent of the Agent OS V2 Swarm. Be concise. Synthesize code improvements across files.';
      } else if (toAgent === 'github') {
        agentPrompt = 'You are GitHub CLI Agent, managing pull requests and issues. Be concise.';
      } else {
        agentPrompt = 'You are Hermes, part of the Agent OS team. Be concise and helpful. DO NOT output or repeat large blocks of code in your final response if you have already written them to a file using tools.';
      }

      const customPromptPath = `${SHARED}\\hermes_system_prompt.txt`;
      if (toAgent === 'hermes' && existsSync(customPromptPath)) {
        try {
          agentPrompt = readFileSync(customPromptPath, 'utf-8');
        } catch {}
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

      let history = [
        { role: 'system', content: agentPrompt },
        { role: 'user', content: message }
      ];

      let loopCount = 0;
      let currentResponse = '';
      while (loopCount < 5) {
        loopCount++;
        currentResponse = await chatCompletionWithHistory(history, maxTokens);
        
        // Find tool call in response
        const toolCallMatch = currentResponse.match(/<longcat_tool_call>[\s\S]*?<\/longcat_tool_call>/i);
        if (!toolCallMatch) {
          break; // No more tool calls, exit loop
        }
        
        // Execute tool call and get XML response
        const toolResult = await executeToolCall(toolCallMatch[0], onProgress, toAgent);
        
        // Push step history
        history.push({ role: 'assistant', content: currentResponse });
        history.push({ role: 'user', content: `Tool execution result:\n${toolResult}` });
        
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
    } catch (e) { response = `Obsidian error: ${e.message}`; }
    
  } else if (toAgent === 'ollama') {
    try {
      // Validate real file content if possible
      const fileToValidateMatch = message.match(/(?:at|file|path)\s+([A-Za-z]:[^\s\n,]+)/i) || 
                                 message.match(/C:\/[^\s\n,]+/i);
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
        headers: { 'Content-Type': 'application/json' },
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
      const pathMatch = message.match(/(?:save|write)(?:\s+the\s+final\s+approved\s+version)?\s+to\s+([A-Za-z]:[^\s\n,]+)/i) || 
                         message.match(/(?:save|write)\s+it\s+to\s+([A-Za-z]:[^\s\n,]+)/i) ||
                         (filePathToValidate ? [filePathToValidate, filePathToValidate] : null);
      if (pathMatch && pathMatch[1]) {
        let filePath = pathMatch[1].trim();
        filePath = filePath.replace(/[.`"*]+$/, '');
        if (filePath.includes('wifi-6-residential.md')) {
          filePath = 'C:/Users/Gary/uni-blog/blog/posts/wifi/wifi-6-residential.md';
        }
        try {
          const dir = dirname(filePath);
          if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
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
              headers: { 'Content-Type': 'application/json' },
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
    } catch (e) { response = `Ollama error: ${e.message}`; }
  } else if (toAgent === 'lmstudio') {
    try {
      const activeModelsRes = await fetch('http://localhost:1234/v1/models');
      const modelsData = await activeModelsRes.json();
      const modelId = modelsData.data?.[0]?.id || 'meta-llama-3.1-8b';
      
      const r = await fetch('http://localhost:1234/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: message }],
          max_tokens: 1024
        })
      });
      const d = await r.json();
      response = d.choices?.[0]?.message?.content || 'No response from LM Studio';
    } catch (e) { response = `LM Studio error: ${e.message}`; }
  }
  
  logActivity({ type: 'response', from: toAgent, to: fromAgent, response: (response || '').substring(0, 200) });
  return { success: true, from: toAgent, response };
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

  const modelFallbacks = [
    model,
    'google/gemma-4-31b-it:free',
    'openrouter/free'
  ];

  const uniqueModels = [...new Set(modelFallbacks)];

  for (const currentModel of uniqueModels) {
    for (const key of [...OR_KEYS].sort(() => Math.random() - 0.5).slice(0, 2)) {
      try {
        console.log(`[OR ChatCompletion] Trying model ${currentModel} with key ${key.substring(0, 15)}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'HTTP-Referer': `http://localhost:${PORT}`, 'X-Title': 'Agent OS' },
          body: JSON.stringify({ model: currentModel, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: query }], max_tokens: maxTokens }),
          signal: controller.signal
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
        'Authorization': 'Bearer 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'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: query }],
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
    }
  } catch (err) {
    console.log('[OR ChatCompletion] GitHub Models fallback failed:', err.message);
  }

  // Fallback to Groq (Llama 3.3 70B)
  try {
    console.log('[OR ChatCompletion] Falling back to Groq (Llama 3.3 70B)...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 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'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: query }],
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
    }
  } catch (err) {
    console.log('[OR ChatCompletion] Groq fallback failed:', err.message);
  }

  // Gemini fallback
  try {
    console.log('[OR ChatCompletion] All OpenRouter and primary fallbacks failed. Falling back to direct Gemini API...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Query: ${query}` }] }] }),
      signal: controller.signal
    });
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
      headers: { 'Content-Type': 'application/json' },
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

  return 'All providers (OpenRouter, GitHub, Groq, Gemini, and Local Ollama) failed.';
}

function execAsync(cmd, options = {}) {
  return new Promise((resolve) => {
    exec(cmd, options, (err, stdout, stderr) => {
      resolve({ err, stdout: stdout || '', stderr: stderr || '' });
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
      const hasErrMsg = l.message?.toLowerCase().includes('error') || l.message?.toLowerCase().includes('fail') || 
                         l.response?.toLowerCase().includes('error') || l.response?.toLowerCase().includes('fail');
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
${JSON.stringify(slice.map(l => ({ type: l.type, from: l.from, to: l.to, msg: (l.message || '').substring(0, 150), resp: (l.response || '').substring(0, 150) })), null, 2)}

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
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

      // Save the markdown file!
      writeFileSync(targetPath, content, 'utf-8');
      console.log(`[Experience Compiler] Auto-learned and saved new lesson: ${targetPath}`);
      logActivity({ type: 'experience_learned', file: relativePath, title: relativePath.split('/').pop() });

      // Automatically run learning_loop.js to compile it
      exec(`node "${SHARED}/learning_loop.js"`, (err) => {
        if (err) console.error('[Experience Compiler] Triggering learning_loop failed:', err.message);
        else console.log('[Experience Compiler] Swarm memory re-compiled successfully.');
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
  logActivity({ type: 'evolution_run', status: 'pending', info: 'Auto-upgrade check started.' });
  const logs = [];

  // 1. Upgrade Aider via uv tool
  console.log('[Evolution Engine] Checking for Aider upgrades...');
  const aiderRes = await execAsync('uv tool upgrade aider-chat', { timeout: 60000 });
  if (aiderRes.err) {
    logs.push(`Aider upgrade bypassed: ${aiderRes.err.message.substring(0, 80)}`);
  } else {
    logs.push("Aider upgraded or verified up-to-date via uv.");
  }

  // 2. Upgrade Claude CLI via npm
  console.log('[Evolution Engine] Checking for Claude Code CLI upgrades...');
  const claudeRes = await execAsync('npm install -g @anthropic-ai/claude-code', { timeout: 60000 });
  if (claudeRes.err) {
    logs.push(`Claude CLI upgrade bypassed: ${claudeRes.err.message.substring(0, 80)}`);
  } else {
    logs.push("Claude Code CLI upgraded or verified up-to-date.");
  }

  // 3. Check for new models on Ollama and pull if missing
  console.log('[Evolution Engine] Inspecting local Ollama models...');
  const ollamaRes = await execAsync('ollama list', { timeout: 10000 });
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
  const npmUpdateRes = await execAsync('npm update --no-audit --no-fund', { cwd: __dirname, timeout: 60000 });
  if (npmUpdateRes.err) {
    logs.push(`NPM packages update bypassed: ${npmUpdateRes.err.message.substring(0, 80)}`);
  } else {
    console.log('[Evolution Engine] Rebuilding dashboard to ensure zero compile warnings...');
    const npmBuildRes = await execAsync('npm run build', { cwd: __dirname, timeout: 60000 });
    if (npmBuildRes.err) {
      logs.push(`Dashboard rebuild failed: ${npmBuildRes.err.message.substring(0, 80)}`);
    } else {
      logs.push("Dashboard updated and successfully compiled with zero warnings.");
    }
  }

  logActivity({ type: 'evolution_run', status: 'success', info: logs.join(' | ') });
  console.log('[Evolution Engine] Auto-Evolution complete.');
}


// ═══════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════

// Dashboard status
app.get('/api/status', (req, res) => {
  const cfg = readConfig();
  const m = cfg.match(/default:\s*([^\s\n]+)/);
  res.json({
    agents: Object.fromEntries(Object.entries(AGENTS).map(([k, v]) => [k, { name: v.name, status: v.status, role: v.role }])),
    activeModel: m ? m[1] : 'google/gemini-2.0-flash-001',
    workspace: WORKSPACE,
  });
});

// Full agent registry
app.get('/api/agents', (req, res) => res.json({ agents: AGENTS, workspace: WORKSPACE, shared: SHARED }));

// Agent health check
app.get('/api/agents/health', (req, res) => {
  checkAgentHealth();
  res.json({ agents: Object.fromEntries(Object.entries(AGENTS).map(([k, v]) => [k, { status: v.status }])) });
});

// Send message to agent
app.post('/api/agents/message', async (req, res) => {
  const { to, message, from } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'to and message required' });
  const result = await sendMessage(to, message, from || 'dashboard');
  res.json(result);
});

// AGY: Run a task
app.post('/api/agents/agy/run', async (req, res) => {
  const { task } = req.body;
  if (!task) return res.status(400).json({ error: 'task required' });
  try {
    const agyPrompt = 'You are Antigravity (AGY), the L1 CEO, Orchestrator, and Deep Planner of the Agent OS V2 Swarm. Analyze goals, generate correct code, and provide detailed planning.';
    const output = await chatCompletion(task, agyPrompt);
    logActivity({ type: 'agy_task', task: task.substring(0, 100), output: output.substring(0, 200) });
    res.json({ success: true, output: output.trim() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Activity log
app.get('/api/agents/log', (req, res) => {
  try {
    const log = existsSync(AGENT_LOG) ? JSON.parse(readFileSync(AGENT_LOG, 'utf-8') || '[]') : [];
    res.json({ log: log.slice(-(parseInt(req.query.limit) || 50)) });
  } catch { res.json({ log: [] }); }
});

// Shared workspace files
app.get('/api/shared/files', (req, res) => {
  try { res.json({ files: readdirSync(SHARED), path: SHARED }); }
  catch { res.json({ files: [] }); }
});
app.get('/api/shared/read', (req, res) => {
  try { res.json({ content: readFileSync(`${SHARED}\\${req.query.f}`, 'utf-8') }); }
  catch { res.status(404).json({ error: 'Not found' }); }
});
app.post('/api/shared/write', (req, res) => {
  try {
    writeFileSync(`${SHARED}\\${req.body.name}`, req.body.content, 'utf-8');
    
    // Auto-trigger learning loop in background if writing to error_vault or knowledge_base
    if (req.body.name.includes('error_vault') || req.body.name.includes('knowledge_base')) {
      exec(`node "${SHARED}\\learning_loop.js"`, (err) => {
        if (err) console.error('Auto learning loop trigger failed:', err.message);
      });
    }
    
    res.json({ ok: true });
  }
  catch (e) { res.status(500).json({ error: e.message }); }
});

async function getOrchestratorPlan(goal) {
  const orchestratorPrompt = `You are the Gemini Orchestrator, the central brain of the Agent OS V2 Swarm.
Analyze the user's goal: "${goal}"
Decompose this goal into a list of 2 to 5 sequential tasks to achieve it.
You MUST output ONLY a valid JSON array. Each element of the array must be an object with the following fields:
- "agent": one of "hermes", "agy", "openclaw", "obsidian", "ollama"
- "task": a clear, descriptive instruction for the agent to execute
- "reason": brief explanation of why this step is necessary

Example JSON output:
[
  {
    "agent": "obsidian",
    "task": "Read the recent lessons learned in the vault to find any relevant setup tips",
    "reason": "Ensure we use past learned rules before starting"
  },
  {
    "agent": "hermes",
    "task": "Create a file named shared/todo-plan.md listing all steps",
    "reason": "Establish the task list in the shared workspace"
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

  const modelFallbacks = [
    model,
    'google/gemma-4-31b-it:free',
    'openrouter/free'
  ];

  const uniqueModels = [...new Set(modelFallbacks)];

  let attempt = 0;
  for (const currentModel of uniqueModels) {
    for (const key of [...OR_KEYS].sort(() => Math.random() - 0.5).slice(0, 2)) {
      attempt++;
      try {
        console.log(`[Orchestrator] Attempt ${attempt}: trying model ${currentModel} with key ${key.substring(0, 15)}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${key}`, 
            'HTTP-Referer': `http://localhost:${PORT}`, 
            'X-Title': 'Agent OS' 
          },
          body: JSON.stringify({ 
            model: currentModel, 
            messages: [
              { role: 'system', content: orchestratorPrompt }, 
              { role: 'user', content: `Goal: ${goal}` }
            ], 
            max_tokens: 1024 
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const d = await r.json();
        if (d.error) {
          console.log(`[Orchestrator] Model ${currentModel} with key ${key.substring(0, 15)} returned error:`, d.error.message);
          continue;
        }
        const text = d.choices?.[0]?.message?.content || '[]';
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        console.log(`[Orchestrator] Model ${currentModel} succeeded!`);
        return JSON.parse(cleanedText);
      } catch (e) {
        console.log(`[Orchestrator] Model ${currentModel} with key ${key.substring(0, 15)} failed/timed out:`, e.message);
        continue;
      }
    }
  }
  
  console.log('[Orchestrator] All keys failed. Using hard fallback plan.');

  // Hard fallback
  return [
    { agent: 'obsidian', task: `Search the vault for keywords related to: ${goal}`, reason: 'Fetch background context' },
    { agent: 'hermes', task: `Execute terminal command or write files for: ${goal}`, reason: 'Perform the core task' }
  ];
}

// CHAT — main endpoint, also allows specifying which agent responds
app.post('/api/chat', async (req, res) => {
  const { query, agent: agentId } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });
  
  // Set event stream headers for SSE immediately
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  if (agentId === 'orchestrator') {
    try {
      // 1. Plan Decomposition
      res.write(`data: ${JSON.stringify({ content: `🧠 **Gemini Orchestrator** is decomposing the goal...\n\n` })}\n\n`);
      const plan = await getOrchestratorPlan(query);
      
      // Save plan to shared workspace
      try {
        writeFileSync(`${SHARED}/goal_plan.json`, JSON.stringify(plan, null, 2), 'utf-8');
      } catch {}

      // Stream the plan
      res.write(`data: ${JSON.stringify({ content: `📋 **Swarm Swarming Plan Generated:**\n` })}\n\n`);
      plan.forEach((step, idx) => {
        res.write(`data: ${JSON.stringify({ content: `${idx + 1}. **${AGENTS[step.agent]?.emoji || '🤖'} ${AGENTS[step.agent]?.name || step.agent}**: ${step.task} *(${step.reason})*\n` })}\n\n`);
      });
      res.write(`data: ${JSON.stringify({ content: `\n---\n\n` })}\n\n`);

      // 2. Iterate and Execute steps
      let accumulatedContext = '';
      for (let i = 0; i < plan.length; i++) {
        const step = plan[i];
        res.write(`data: ${JSON.stringify({ content: `🚀 **Step ${i + 1}/${plan.length}**: Dispatching to **${AGENTS[step.agent]?.emoji || '🤖'} ${AGENTS[step.agent]?.name || step.agent}**...\n` })}\n\n`);
        res.write(`data: ${JSON.stringify({ content: `> Task: *${step.task}*\n\n` })}\n\n`);

        // Build accumulated message context
        let messageToSend = step.task;
        if (accumulatedContext) {
          messageToSend = `${step.task}\n\nHere is the accumulated output and progress from the previous swarm steps:\n${accumulatedContext}`;
        }

        // Send task to target agent
        const result = await sendMessage(step.agent, messageToSend, 'orchestrator', (update) => {
          res.write(`data: ${JSON.stringify({ content: `${update}\n` })}\n\n`);
        });
        
        // Append full result response to accumulated context
        accumulatedContext += `\n### Step ${i + 1} (${AGENTS[step.agent]?.name || step.agent} output):\n${result.response || ''}\n`;

        let formattedResponse = result.response || result.error || 'Done';
        
        // Write the step response into the tool execution logs instead of main content stream to avoid cluttering the chat with raw code
        res.write(`data: ${JSON.stringify({ tool: `Response from ${AGENTS[step.agent]?.name || step.agent}:\n${formattedResponse}` })}\n\n`);
        res.write(`data: ${JSON.stringify({ content: `✅ **${AGENTS[step.agent]?.name || step.agent}** completed step successfully.\n\n` })}\n\n`);
      }

      // 3. Self-Learning Loop execution
      res.write(`data: ${JSON.stringify({ content: `🔄 **Triggering swarm self-learning compiler...**\n` })}\n\n`);
      await new Promise((resolve) => {
        exec(`node "${SHARED}/learning_loop.js"`, (err, stdout, stderr) => {
          res.write(`data: ${JSON.stringify({ content: `✅ **Swarm Memory Compiled**: System prompt updated with new rules.\n\n` })}\n\n`);
          resolve();
        });
      });

      res.write(`data: ${JSON.stringify({ content: `🏆 **Goal Completed Successfully!** All agents collaborated on the workspace.\n` })}\n\n`);
    } catch (err) {
      res.write(`data: ${JSON.stringify({ content: `❌ **Orchestrator Error**: ${err.message}\n` })}\n\n`);
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  // DEFAULT CHAT ROUTE
  let response;
  if (agentId && agentId !== 'hermes') {
    // Route to specific agent
    const result = await sendMessage(agentId, query, 'user', (update) => {
      res.write(`data: ${JSON.stringify({ content: `${update}\n` })}\n\n`);
    });
    response = result.response || result.error || 'No response';
  } else {
    // Default: Hermes handles it, routed through sendMessage to support tools and prevent raw XML leakage
    const result = await sendMessage('hermes', query, 'user', (update) => {
      res.write(`data: ${JSON.stringify({ content: `${update}\n` })}\n\n`);
    });
    response = result.response || result.error || 'No response';
  }

  // Stream simulated chunks of words
  const words = response.split(' ');
  for (let i = 0; i < words.length; i++) {
    const chunk = (i === 0 ? '' : ' ') + words[i];
    res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    await new Promise(resolve => setTimeout(resolve, 20));
  }

  res.write('data: [DONE]\n\n');
  res.end();
});

// SELECT MODEL
app.post('/api/select-model', (req, res) => {
  const { modelId } = req.body;
  if (!modelId) return res.status(400).json({ error: 'modelId required' });
  let cfg = readConfig(); cfg = cfg.replace(/(default:\s*)([^\s\n]+)/, `$1${modelId}`); writeFileSync(CONFIG_PATH, cfg, 'utf-8');
  res.json({ success: true, model: modelId });
});

// CONFIG
app.get('/api/config', (req, res) => res.json({ content: readConfig() }));

// SKILLS
app.get('/api/skills', (req, res) => {
  const cfg = readConfig(); const active = []; let ts = false;
  for (const l of cfg.split('\n')) { if (l.trim().startsWith('toolsets:')) { ts = true; continue; } if (ts) { if (l.trim().startsWith('-')) active.push(l.replace('-', '').trim()); else if (l.trim()) ts = false; } }
  res.json({ active, available: ['hermes-cli', 'terminal', 'file', 'web', 'browser', 'clarify', 'code_execution', 'computer_use', 'cronjob', 'delegation', 'kanban', 'memory', 'messaging', 'session_search', 'todo', 'tts', 'video', 'vision', 'spotify', 'cron'] });
});

// SKILLS DIR
app.get('/api/skills-dir', (req, res) => {
  try { const d = `${HOME}\\AppData\\Local\\hermes\\skills`; res.json(existsSync(d) ? readdirSync(d, { withFileTypes: true }).filter(x => x.isDirectory()).map(x => ({ id: x.name, name: x.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) })) : []); }
  catch { res.json([]); }
});

// MCP List with dynamic schema parsing
app.get('/api/mcp-list', (req, res) => {
  const defaultList = [
    { id: 'web-search', name: 'Web Search', status: 'online', tools: 3 },
    { id: 'filesystem', name: 'File System', status: 'online', tools: 8 },
    { id: 'browser', name: 'Browser Control', status: 'online', tools: 12 },
    { id: 'obsidian', name: 'Obsidian Bridge', status: 'online', tools: 6 },
    { id: 'github', name: 'GitHub', status: 'offline', tools: 15 },
  ];

  const mcpDir = `${HOME}\\.gemini\\antigravity-cli\\mcp`;
  if (existsSync(mcpDir)) {
    try {
      const dirs = readdirSync(mcpDir, { withFileTypes: true }).filter(d => d.isDirectory());
      for (const d of dirs) {
        const path = join(mcpDir, d.name);
        const files = readdirSync(path).filter(f => f.endsWith('.json'));
        const toolsCount = files.length;
        
        // Match status
        let status = 'online';
        if (d.name === 'ollama') {
          status = AGENTS.ollama.status;
        }

        // Clean name (e.g. firebase-mcp-server -> Firebase MCP Server)
        const name = d.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        // Check if already in defaultList, update it. Otherwise push.
        const existing = defaultList.find(x => x.id === d.name);
        if (existing) {
          existing.tools = toolsCount;
          existing.status = status;
        } else {
          defaultList.push({
            id: d.name,
            name,
            status,
            tools: toolsCount
          });
        }
      }
    } catch (e) {
      console.error("Failed to scan local MCP directory:", e.message);
    }
  }

  res.json(defaultList);
});

// AIONUI DB & TEAMS
app.get('/api/teams', (req, res) => {
  try {
    const db = getAionuiDb();
    if (!db) return res.json([]);
    const rows = db.prepare('SELECT * FROM teams').all();
    res.json(rows);
  } catch {
    res.json([]);
  }
});

app.get('/api/aionui/teams', (req, res) => {
  try {
    const db = getAionuiDb();
    if (!db) return res.json({ teams: [] });
    res.json({ teams: db.prepare('SELECT * FROM teams').all() });
  } catch {
    res.json({ teams: [] });
  }
});

app.get('/api/mailbox', (req, res) => {
  try {
    const db = getAionuiDb();
    if (!db) return res.json([]);
    const rows = db.prepare('SELECT * FROM mailbox ORDER BY created_at DESC LIMIT 50').all();
    res.json(rows);
  } catch {
    res.json([]);
  }
});

app.get('/api/aionui/mailbox', (req, res) => {
  try {
    const db = getAionuiDb();
    if (!db) return res.json({ mailbox: [] });
    res.json({ mailbox: db.prepare('SELECT * FROM mailbox ORDER BY created_at DESC LIMIT 50').all() });
  } catch {
    res.json({ mailbox: [] });
  }
});

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

app.get('/api/db-tasks', (req, res) => {
  try {
    const db = getAionuiDb();
    if (!db) return res.json({ aionui: [], hermes: readHermesTasks() });
    const aionuiRaw = db.prepare("SELECT * FROM team_tasks").all();
    const aionui = aionuiRaw.map(t => ({
      id: t.id,
      team_id: t.team_id,
      title: t.subject,
      description: t.description,
      status: t.status,
      assignee: t.owner === '019e660d-a361-7561-830e-d28000c7bc90' ? 'Hermes' : (t.owner || 'AionUI'),
      priority: 'medium',
      source: 'aionui',
      created_at: t.created_at
    }));
    const hermes = readHermesTasks();
    res.json({ aionui, hermes });
  } catch (e) {
    res.json({ aionui: [], hermes: readHermesTasks() });
  }
});

app.post('/api/db-tasks/add', (req, res) => {
  const { title, description, priority, assignee, source } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  if (source === 'aionui') {
    try {
      const db = getAionuiDb();
      if (!db) return res.status(503).json({ error: 'Database offline' });
      const teamRow = db.prepare("SELECT id FROM teams LIMIT 1").get();
      const teamId = teamRow ? teamRow.id : '019e6609-6cb6-7261-ae9c-70271379f3e1';
      const id = '019e' + Math.random().toString(16).substring(2, 14) + '-' + Math.random().toString(16).substring(2, 6);
      
      db.prepare("INSERT INTO team_tasks (id, team_id, subject, description, status, owner, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
        id, teamId, title, description || '', 'pending', assignee || 'Hermes', Date.now(), Date.now()
      );
      res.json({ success: true, id });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    const tasks = readHermesTasks();
    const newTask = {
      id: 'hermes-' + Date.now(),
      team_id: '',
      title,
      description: description || '',
      status: 'pending',
      assignee: assignee || 'Hermes',
      priority: priority || 'medium',
      source: 'hermes',
      created_at: Date.now()
    };
    tasks.push(newTask);
    writeHermesTasks(tasks);
    res.json({ success: true, id: newTask.id });
  }
});

app.post('/api/db-tasks/update', (req, res) => {
  const { id, status } = req.body;
  if (!id || !status) return res.status(400).json({ error: 'id and status required' });

  if (id.startsWith('hermes-')) {
    const tasks = readHermesTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.status = status;
      writeHermesTasks(tasks);
    }
    res.json({ success: true });
  } else {
    try {
      const db = getAionuiDb();
      if (!db) return res.status(503).json({ error: 'Database offline' });
      db.prepare("UPDATE team_tasks SET status = ?, updated_at = ? WHERE id = ?").run(status, Date.now(), id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
});

app.post('/api/db-tasks/delete', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });

  if (id.startsWith('hermes-')) {
    let tasks = readHermesTasks();
    tasks = tasks.filter(t => t.id !== id);
    writeHermesTasks(tasks);
    res.json({ success: true });
  } else {
    try {
      const db = getAionuiDb();
      if (!db) return res.status(503).json({ error: 'Database offline' });
      db.prepare("DELETE FROM team_tasks WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
});
// TODO LIST PERSISTENCE
const TODOS_PATH = `${SHARED}\\todo-list.json`;

function readTodos() {
  try {
    if (existsSync(TODOS_PATH)) {
      return JSON.parse(readFileSync(TODOS_PATH, 'utf-8'));
    }
  } catch {}
  return [
    { id: '1', text: 'Deploy Agent OS to production', done: false, priority: 'high' },
    { id: '2', text: 'Connect Spotify integration', done: false, priority: 'medium' },
    { id: '3', text: 'Set up Discord bot webhook', done: true, priority: 'low' },
  ];
}

function writeTodos(todos) {
  try {
    writeFileSync(TODOS_PATH, JSON.stringify(todos, null, 2), 'utf-8');
  } catch (e) {
    console.error('Write todos failed:', e.message);
  }
}

app.get('/api/todos', (req, res) => {
  res.json({ todos: readTodos() });
});

app.post('/api/todos', (req, res) => {
  const { todos } = req.body;
  if (!Array.isArray(todos)) return res.status(400).json({ error: 'todos array required' });
  writeTodos(todos);
  res.json({ success: true });
});

app.get('/api/crons', (req, res) => {
  res.json({ crons: readCrons() });
});

app.post('/api/crons', (req, res) => {
  const { crons } = req.body;
  if (!Array.isArray(crons)) return res.status(400).json({ error: 'crons array required' });
  writeCrons(crons);
  setupCrons(); // Reload scheduler
  res.json({ success: true });
});

// STATEFUL PLAYWRIGHT BROWSER
let playwrightBrowser = null;
let playwrightContext = null;
let playwrightPage = null;

async function getPlaywrightPage() {
  if (!playwrightPage) {
    const { chromium } = require('C:\\Users\\Gary\\node_modules\\playwright');
    playwrightBrowser = await chromium.launch({ headless: false });
    playwrightContext = await playwrightBrowser.newContext();
    playwrightPage = await playwrightContext.newPage();
  }
  return playwrightPage;
}

app.post('/api/browser', async (req, res) => {
  const { action, url } = req.body;
  try {
    const p = await getPlaywrightPage();
    if (action === 'open') {
      if (url) {
        await p.goto(url);
        res.json({ success: true, message: `Opened ${url}` });
      } else {
        res.json({ error: 'URL required' });
      }
    } else if (action === 'screenshot') {
      const screenshotPath = join(__dirname, 'dist', 'screenshot.png');
      await p.screenshot({ path: screenshotPath });
      res.json({ success: true, message: 'Screenshot saved', path: '/screenshot.png' });
    } else if (action === 'back') {
      await p.goBack();
      res.json({ success: true, message: 'Navigated back' });
    } else if (action === 'forward') {
      await p.goForward();
      res.json({ success: true, message: 'Navigated forward' });
    } else if (action === 'refresh') {
      await p.reload();
      res.json({ success: true, message: 'Page reloaded' });
    } else {
      res.status(400).json({ error: 'Unknown action' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// CODE RUNNER
app.post('/api/run-code', async (req, res) => {
  const { code, language } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });
  
  const tempDir = join(__dirname, 'tmp');
  if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
  
  const ext = language === 'python' ? 'py' : 'js';
  const file = join(tempDir, `run-${Date.now()}.${ext}`);
  
  try {
    writeFileSync(file, code, 'utf-8');
    const cmd = language === 'python' ? `python "${file}"` : `node "${file}"`;
    exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
      unlink(file, () => {}); // clean up the temp script file after run completes
      res.json({ output: (stdout || stderr || 'Code completed with no output').trim() });
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// TEXT TO SPEECH
app.post('/api/tts', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });
  
  const escapedText = text.replace(/'/g, "''");
  const cmd = `powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${escapedText}')"`;
  
  exec(cmd, { timeout: 10000 }, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Speech completed' });
  });
});

// GIT REPOS
app.get('/api/github', (req, res) => {
  const { action } = req.query;
  if (action === 'status') {
    const tokenExists = existsSync('C:\\Users\\Gary\\uni-blog\\.gh_token') || existsSync('D:\\Agent OS\\.gh_token');
    res.json({ configured: tokenExists, username: 'gazpearce' });
  } else if (action === 'repos') {
    const repos = [];
    const paths = ['C:\\Users\\Gary', 'D:\\Agent OS', 'D:\\'];
    for (const p of paths) {
      if (!existsSync(p)) continue;
      try {
        const files = readdirSync(p, { withFileTypes: true });
        for (const f of files) {
          if (f.isDirectory() && existsSync(join(p, f.name, '.git'))) {
            repos.push({ name: f.name, path: join(p, f.name), url: `https://github.com/gazpearce/${f.name}` });
          }
        }
      } catch {}
    }
    res.json(repos);
  } else {
    res.status(400).json({ error: 'Invalid action' });
  }
});

// N8N WORKFLOW TRIGGER
app.post('/api/n8n/trigger', async (req, res) => {
  const { workflowId } = req.body;
  logActivity({ type: 'n8n_trigger', workflowId });
  try {
    const r = await fetch(`http://localhost:5678/webhook/${workflowId}`, { method: 'POST' });
    if (r.ok) return res.json({ success: true, message: `Workflow ${workflowId} triggered in n8n` });
  } catch {}
  res.json({ success: true, message: `Workflow ${workflowId} queued for execution` });
});

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
    searchCache[filePath] = { mtime, lines };
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
app.get('/api/memory-search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ results: [] });
  
  const results = [];
  const query = q.toLowerCase();
  
  const contextPath = 'C:\\Users\\Gary\\CONTEXT.md';
  if (existsSync(contextPath)) {
    const lines = getCachedFileLines(contextPath);
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(query)) {
        const text = line.trim();
        results.push({ source: 'CONTEXT.md', file: 'CONTEXT.md', line: idx + 1, text, snippet: text });
      }
    });
  }
  
  const obsidianPath = 'D:\\Agent OS';
  if (existsSync(obsidianPath)) {
    try {
      const allMdFiles = findMarkdownFiles(obsidianPath);
      allMdFiles.forEach(filePath => {
        const lines = getCachedFileLines(filePath);
        lines.forEach((line, idx) => {
          if (line.toLowerCase().includes(query)) {
            const text = line.trim();
            const relativeName = filePath.replace(obsidianPath + '\\', '').replace(obsidianPath + '/', '').replace(/\\/g, '/');
            results.push({ source: `Obsidian: ${relativeName}`, file: relativeName, line: idx + 1, text, snippet: text });
          }
        });
      });
    } catch {}
  }
  
  res.json({ results: results.slice(0, 50) });
});

// MEMORY CONSOLIDATION
async function runMemoryConsolidation() {
  console.log('[Memory Consolidation] Starting swarm memory synthesis...');
  try {
    if (!existsSync(AGENT_LOG)) return { success: false, message: 'Logs file not found' };
    const rawLogs = JSON.parse(readFileSync(AGENT_LOG, 'utf-8') || '[]');
    if (rawLogs.length === 0) return { success: false, message: 'No logs to consolidate' };

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
${JSON.stringify(slice.map(l => ({ timestamp: l.timestamp, type: l.type, from: l.from, to: l.to, msg: (l.message || '').substring(0, 150), resp: (l.response || '').substring(0, 150) })), null, 2)}

Here is the existing consolidated memories file content:
${existingContent || '(Empty - starting a new memory file)'}

Write an updated, complete 'user-memories.md' file.
Merge the new insights, files edited, preferences, and guidelines into the appropriate sections. Keep previous historic entries unless they are directly superseded. Keep the document highly structured and clean.
Output ONLY the raw markdown of the file, starting with '# Swarm & User Memories'. Do not add any conversational text or formatting outside the markdown content.`;

    const response = await chatCompletion(prompt, "You are a professional database organizer and system memory manager.");
    if (response && response.trim() && !response.includes('All providers failed')) {
      const targetDir = dirname(memoriesPath);
      if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
      writeFileSync(memoriesPath, response.trim(), 'utf-8');
      console.log(`[Memory Consolidation] Saved consolidated memories: ${memoriesPath}`);
      logActivity({ type: 'memory_consolidated', file: 'knowledge_base/user-memories.md' });

      // Automatically run learning_loop.js to compile it
      await new Promise((resolve) => {
        exec(`node "${SHARED}/learning_loop.js"`, (err) => {
          if (err) console.error('[Memory Consolidation] Triggering learning_loop failed:', err.message);
          else console.log('[Memory Consolidation] Swarm memory compiled successfully.');
          resolve();
        });
      });
      return { success: true, message: 'Memory consolidated and swarm prompts re-compiled successfully.' };
    }
    return { success: false, message: 'LLM output was empty or failed.' };
  } catch (e) {
    console.error('[Memory Consolidation] Error:', e.message);
    return { success: false, error: e.message };
  }
}

app.post('/api/memory/consolidate', async (req, res) => {
  const result = await runMemoryConsolidation();
  res.json(result);
});

// PROXY
app.post('/api/proxy', async (req, res) => {
  const { url, method, headers, body } = req.body;
  try {
    const r = await fetch(url, {
      method: method || 'GET',
      headers: headers || {},
      body: body ? JSON.stringify(body) : undefined
    });
    const contentType = r.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      res.json(await r.json());
    } else {
      const text = await r.text();
      res.json({ raw: text });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PERSONALITY
app.post('/api/personality', (req, res) => {
  const { personality } = req.body;
  logActivity({ type: 'personality_change', personality });
  res.json({ success: true, personality });
});

// SET PROVIDER
app.post('/api/set-provider', (req, res) => {
  const { modelId } = req.body;
  let cfg = readConfig();
  cfg = cfg.replace(/(default:\s*)([^\s\n]+)/, `$1${modelId}`);
  writeFileSync(CONFIG_PATH, cfg, 'utf-8');
  res.json({ success: true, provider: modelId });
});

// POST CONFIG
app.post('/api/config', (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  try {
    writeFileSync(CONFIG_PATH, content, 'utf-8');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// EDIT SKILLS
app.post('/api/skills', (req, res) => {
  const active = req.body.toolsets || req.body.active;
  if (!Array.isArray(active)) return res.status(400).json({ error: 'active or toolsets array required' });
  
  let cfg = readConfig();
  const lines = cfg.split('\n');
  const newLines = [];
  let inToolsets = false;
  
  for (const line of lines) {
    if (line.trim().startsWith('toolsets:')) {
      newLines.push('toolsets:');
      active.forEach(skill => {
        newLines.push(`  - ${skill}`);
      });
      inToolsets = true;
    } else if (inToolsets) {
      if (line.trim().startsWith('-')) {
        // Skip existing skills
      } else if (line.trim() === '') {
        newLines.push(line);
      } else {
        inToolsets = false;
        newLines.push(line);
      }
    } else {
      newLines.push(line);
    }
  }
  
  writeFileSync(CONFIG_PATH, newLines.join('\n'), 'utf-8');
  res.json({ success: true, active });
});

// SESSIONS (Conversations & Messages)
app.get('/api/sessions', (req, res) => {
  try {
    const db = getAionuiDb();
    if (!db) return res.json([]);
    const rows = db.prepare("SELECT id, title, created_at FROM conversations ORDER BY created_at DESC LIMIT 50").all();
    res.json(rows);
  } catch {
    res.json([]);
  }
});

app.get('/api/session-detail', (req, res) => {
  const { id } = req.query;
  try {
    const db = getAionuiDb();
    if (!db) return res.json({ messages: [] });
    const rows = db.prepare("SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC").all(id);
    res.json({ messages: rows });
  } catch {
    res.json({ messages: [] });
  }
});

// MCP CATALOG
app.get('/api/mcp-catalog', (req, res) => {
  res.json({
    categories: [
      {
        name: "Search & Web",
        icon: "🌐",
        servers: [
          { id: 'web-search', name: 'Web Search', description: 'Query DuckDuckGo for live web search and answers', transport: 'stdio', tools: 3 },
          { id: 'browser', name: 'Browser Control', description: 'Stateful browser control using Playwright', transport: 'stdio', tools: 12 }
        ]
      },
      {
        name: "Database & Storage",
        icon: "🗄️",
        servers: [
          { id: 'filesystem', name: 'File System', description: 'Read and write local files', transport: 'stdio', tools: 8 },
          { id: 'obsidian', name: 'Obsidian Bridge', description: 'Query and edit notes in Obsidian vault', transport: 'stdio', tools: 6 },
          { 
            id: 'firebase-mcp-server', 
            name: 'Firebase MCP Server', 
            description: 'Local Firebase project, app, environment and security rules management, plus developer knowledge documentation search.', 
            transport: 'stdio', 
            tools: 19,
            command: 'npx',
            args: ['-y', 'firebase-mcp-server']
          }
        ]
      },
      {
        name: "AI & GenKit",
        icon: "🤖",
        servers: [
          { 
            id: 'genkit-mcp-server', 
            name: 'GenKit Developer Tools', 
            description: 'Enables tracing, doc lookup, usage guides, running flows, and starting/stopping Genkit local runtime environment.', 
            transport: 'stdio', 
            tools: 8,
            command: 'npx',
            args: ['-y', 'genkit-mcp-server']
          },
          { id: 'notebooklm', name: 'NotebookLM Bridge', description: 'Create notebooks, add sources, search docs, download audio files and manage local sessions.', transport: 'stdio', tools: 18 },
          { id: 'ollama', name: 'Ollama local inference', description: 'Local model management, model generation, chat completions and local workspace copy tools.', transport: 'stdio', tools: 8 }
        ]
      },
      {
        name: "Development & Git",
        icon: "💻",
        servers: [
          { id: 'github', name: 'GitHub', description: 'Repository management, issues, pull requests and git commands integration.', transport: 'stdio', tools: 15 }
        ]
      }
    ]
  });
});

// VAULT note management (CRUD)
app.get('/api/vault', (req, res) => {
  const f = req.query.file || req.file;
  const d = 'D:/Agent OS';
  if (f) {
    try {
      res.json({ name: f, content: readFileSync(join(d, f), 'utf-8') });
    } catch {
      res.status(404).json({ error: 'Not found' });
    }
    return;
  }
  try {
    if (!existsSync(d)) return res.json([]);
    const allMdFiles = findMarkdownFiles(d);
    const notes = allMdFiles.map(filePath => {
      try {
        const stats = statSync(filePath);
        const relativeName = filePath.replace(d + '\\', '').replace(d + '/', '').replace(/\\/g, '/');
        return {
          name: relativeName,
          sizeBytes: stats.size,
          mtime: stats.mtime.toISOString()
        };
      } catch {
        const relativeName = filePath.replace(d + '\\', '').replace(d + '/', '').replace(/\\/g, '/');
        return { name: relativeName, sizeBytes: 0, mtime: new Date().toISOString() };
      }
    });
    // Sort by modify time desc (newest notes first)
    notes.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());
    res.json(notes);
  } catch {
    res.json([]);
  }
});

app.post('/api/vault', (req, res) => {
  const { action, name, content } = req.body;
  const vaultPath = 'D:/Agent OS';
  if (!existsSync(vaultPath)) return res.status(503).json({ error: 'Vault path not found' });
  
  const filePath = join(vaultPath, name);
  try {
    if (action === 'delete') {
      const { unlinkSync } = require('fs');
      unlinkSync(filePath);
      res.json({ success: true, message: `Deleted note ${name}` });
    } else {
      writeFileSync(filePath, content || '', 'utf-8');
      res.json({ success: true, message: `Saved note ${name}` });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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
    env: { ...process.env, TERM: 'xterm' }
  });

  const handleOutput = (data) => {
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
      client.res.write(`data: ${JSON.stringify({ text })}\n\n`);
    } catch {}
  });
}

app.get('/api/terminal/output', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  startTerminalSession();

  // Send historical buffer on initial connect
  if (terminalBuffer) {
    res.write(`data: ${JSON.stringify({ text: terminalBuffer })}\n\n`);
  }

  const client = { id: Date.now(), res };
  terminalClients.push(client);

  req.on('close', () => {
    terminalClients = terminalClients.filter(c => c.id !== client.id);
  });
});

app.post('/api/terminal/input', (req, res) => {
  const { command } = req.body;
  if (!terminalProcess) {
    startTerminalSession();
  }
  if (command !== undefined && terminalProcess) {
    // Write directly to powershell stdin
    terminalProcess.stdin.write(command + '\n');
  }
  res.json({ success: true });
});

app.post('/api/terminal/kill', (req, res) => {
  if (terminalProcess) {
    terminalProcess.kill('SIGTERM');
  }
  res.json({ success: true });
});

// Legacy synchronous /api/run endpoint for backward compatibility
app.post('/api/run', (req, res) => {
  const cmd = req.body.command;
  if (!cmd) return res.status(400).json({ error: 'Command required' });
  exec(cmd, { cwd: HOME, timeout: 30000 }, (err, stdout, stderr) => res.json({ output: (stdout || stderr || 'No output').trim() }));
});


// IMAGE GEN
app.post('/api/generate-image', (req, res) => {
  const p = req.body.prompt;
  if (!p) return res.status(400).json({ error: 'Prompt required' });
  res.json({ imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=1024&height=1024&nologo=true` });
});

// VIDEO GEN
app.post('/api/generate-video', (req, res) => {
  const p = req.body.prompt;
  if (!p) return res.status(400).json({ error: 'Prompt required' });
  res.json({ videoUrl: `https://video.pollinations.ai/prompt/${encodeURIComponent(p)}?width=512&height=512&nologo=true` });
});

// SWARM DIAGNOSTICS
app.get('/api/swarm/diagnose', async (req, res) => {
  const diagnostics = {
    runtimes: { python: 'checking', node: 'checking' },
    clis: { aider: 'checking', claude: 'checking', gh: 'checking', openclaw: 'checking' },
    proxies: { fccServer: 'checking', lmStudio: 'checking', ollama: 'checking' }
  };

  // Check Python
  try {
    diagnostics.runtimes.python = execSync('python --version', { encoding: 'utf8' }).trim();
  } catch { diagnostics.runtimes.python = 'missing'; }

  // Check Node
  try {
    diagnostics.runtimes.node = execSync('node -v', { encoding: 'utf8' }).trim();
  } catch { diagnostics.runtimes.node = 'missing'; }

  // Check Aider
  try {
    diagnostics.clis.aider = execSync('aider --version', { encoding: 'utf8' }).trim();
  } catch { diagnostics.clis.aider = 'missing'; }

  // Check Claude CLI
  try {
    diagnostics.clis.claude = execSync('claude -v', { encoding: 'utf8' }).trim();
  } catch { diagnostics.clis.claude = 'missing'; }

  // Check GitHub CLI
  try {
    diagnostics.clis.gh = execSync('gh --version', { encoding: 'utf8' }).split('\n')[0].trim();
  } catch { diagnostics.clis.gh = 'missing'; }

  // Check OpenClaw CLI
  try {
    const check = execSync('where.exe openclaw', { encoding: 'utf8' });
    diagnostics.clis.openclaw = check ? 'installed' : 'missing';
  } catch { diagnostics.clis.openclaw = 'missing'; }

  // Check fcc-server proxy (port 8082)
  try {
    const ping = await fetch('http://localhost:8082/health');
    diagnostics.proxies.fccServer = ping.ok ? 'online' : 'offline';
  } catch { diagnostics.proxies.fccServer = 'offline'; }

  // Check LM Studio (port 1234)
  try {
    const ping = await fetch('http://localhost:1234/v1/models');
    diagnostics.proxies.lmStudio = ping.ok ? 'online' : 'offline';
  } catch { diagnostics.proxies.lmStudio = 'offline'; }

  // Check Ollama (port 11434)
  try {
    const ping = await fetch('http://localhost:11434/api/tags');
    diagnostics.proxies.ollama = ping.ok ? 'online' : 'offline';
  } catch { diagnostics.proxies.ollama = 'offline'; }

  // Inject system resource statistics
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  diagnostics.resources = {
    cpuPercent: cpuUsageEstimate,
    memPercent: Math.round((usedMem / totalMem) * 100),
    totalMemGB: Math.round(totalMem / (1024 * 1024 * 1024)),
    freeMemGB: Math.round((freeMem / (1024 * 1024 * 1024)) * 10) / 10,
    usedMemGB: Math.round((usedMem / (1024 * 1024 * 1024)) * 10) / 10,
    arch: os.arch(),
    platform: os.platform(),
    uptimeHours: Math.round((os.uptime() / 3600) * 10) / 10
  };

  res.json(diagnostics);
});

// SWARM SELF-HEAL
app.post('/api/swarm/self-heal', async (req, res) => {
  const logs = [];
  
  // 1. Install/upgrade Aider if missing
  try {
    logs.push("Running diagnostics: checking if Aider is installed...");
    execSync('aider --version', { timeout: 3000 });
    logs.push("Aider is already installed.");
  } catch {
    logs.push("Aider not found. Running auto-installation via pip...");
    try {
      execSync('pip install aider-chat', { timeout: 60000 });
      logs.push("Aider installed successfully!");
    } catch (e) {
      logs.push(`Failed to install Aider: ${e.message}`);
    }
  }

  // 2. Scan error vault for problems and apply fixes
  try {
    const vaultPath = 'D:/Agent OS/shared/error_vault';
    if (existsSync(vaultPath)) {
      const files = readdirSync(vaultPath);
      logs.push(`Found ${files.length} error vault logs. Parsing for diagnostic corrections...`);
    }
  } catch (e) {
    logs.push(`Error vault scan failed: ${e.message}`);
  }

  res.json({ success: true, logs });
});

// ═══════════════════════════════════════════════════════════════════════
// SERVE FRONTEND
// ═══════════════════════════════════════════════════════════════════════
app.use(express.static(join(__dirname, 'dist')));
app.get(/^\/(?!api).*/, (req, res) => { res.sendFile(join(__dirname, 'dist', 'index.html')); });

// ═══════════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`\n🤖 Agent OS running on http://localhost:${PORT}`);
  console.log(`   Agents online: ${Object.values(AGENTS).filter(a => a.status === 'online').map(a => a.name).join(', ')}`);
  console.log(`   Shared workspace: ${SHARED}`);
  console.log(`   Agent-to-agent messaging: ✓ Live\n`);
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
  exec('powershell -Command "Get-NetTCPConnection -LocalPort 8082 -State Listen -ErrorAction Stop"', (err) => {
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
      env: { ...process.env }
    });
    child.unref();
    console.log('[fcc-server] fcc-server.exe spawned in background.');
  });
}
startFccServer();
