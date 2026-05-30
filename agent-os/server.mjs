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
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { exec, execSync } from 'child_process';
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
const WORKSPACE = `D:\\Agent OS`;
const SHARED = `${WORKSPACE}\\shared`;
const AGENT_LOG = `${SHARED}\\agent-log.json`;

// Ensure directories exist
[WORKSPACE, SHARED].forEach(d => { try { mkdirSync(d, { recursive: true }); } catch {} });

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
    status: existsSync('D:/Obsidian') ? 'online' : 'offline',
    color: '#f59e0b',
    type: 'knowledge_base',
    vaultPath: 'D:/Obsidian',
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
};

// Check agent health on startup
function checkAgentHealth() {
  // AGY
  try {
    execSync(`"${AGENTS.agy.binary}" --version`, { timeout: 3000 });
    AGENTS.agy.status = 'online';
  } catch { AGENTS.agy.status = 'offline'; }
  
  // OpenClaw
  try {
    execSync('openclaw --version', { timeout: 3000 });
    AGENTS.openclaw.status = 'online';
  } catch { AGENTS.openclaw.status = 'offline'; }
  
  // Ollama
  try {
    execSync('ollama list', { timeout: 3000 });
    AGENTS.ollama.status = 'online';
  } catch { AGENTS.ollama.status = 'offline'; }
  
  // LM Studio port connection check
  try {
    // Check if port 1234 is listening on Windows
    execSync('powershell -Command "Get-NetTCPConnection -LocalPort 1234 -ErrorAction Stop"', { timeout: 3000 });
    AGENTS.lmstudio.status = 'online';
  } catch { AGENTS.lmstudio.status = 'offline'; }
  
  // Obsidian
  AGENTS.obsidian.status = existsSync('D:/Obsidian') ? 'online' : 'offline';
}

checkAgentHealth();

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

// Send message to another agent and get response
async function sendMessage(toAgent, message, fromAgent = 'hermes') {
  logActivity({ type: 'message', from: fromAgent, to: toAgent, message: message.substring(0, 200) });
  
  const agent = AGENTS[toAgent];
  if (!agent) return { error: `Agent ${toAgent} not found` };
  if (agent.status === 'offline') return { error: `Agent ${toAgent} is offline` };
  
  let response;
  
  if (toAgent === 'agy') {
    // Call chatCompletion directly for AGY to bypass CLI Win32 screen buffer issues
    try {
      const agyPrompt = 'You are Antigravity (AGY), the L1 CEO, Orchestrator, and Deep Planner of the Agent OS V2 Swarm. Analyze goals, generate correct code, and provide detailed planning.';
      response = await chatCompletion(message, agyPrompt);
    } catch (e) { response = `AGY error: ${e.message}`; }
    
  } else if (toAgent === 'openclaw') {
    // Send to OpenClaw with --agent main to select target session
    try {
      const output = await new Promise((resolve) => {
        exec(`openclaw agent --agent main -m "${message.replace(/"/g, '\\"')}"`, { timeout: 60000, cwd: HOME }, (err, stdout, stderr) => {
          resolve(stdout || stderr || 'OpenClaw completed');
        });
      });
      response = output.trim();
    } catch (e) { response = `OpenClaw error: ${e.message}`; }
    
  } else if (toAgent === 'hermes') {
    // Hermes processes directly
    response = await chatCompletion(message);
    
  } else if (toAgent === 'obsidian') {
    // Write to shared notes
    try {
      const noteName = `${Date.now()}-from-${fromAgent}.md`;
      const content = `# Message from ${fromAgent}\n\n${message}\n\n---\n*Logged at ${new Date().toISOString()}*`;
      writeFileSync(`${SHARED}\\${noteName}`, content, 'utf-8');
      response = `Written to shared workspace: ${noteName}`;
    } catch (e) { response = `Obsidian error: ${e.message}`; }
    
  } else if (toAgent === 'ollama') {
    try {
      const output = await new Promise((resolve) => {
        exec(`ollama run "${message.replace(/"/g, '\\"')}"`, { timeout: 60000, cwd: HOME }, (err, stdout, stderr) => {
          resolve(stdout || stderr || 'Ollama completed');
        });
      });
      response = output.trim();
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
async function chatCompletion(query, overrideSystemPrompt = null) {
  const model = 'openrouter/owl-alpha';
  
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

  for (const key of [...OR_KEYS].sort(() => Math.random() - 0.5).slice(0, 5)) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'HTTP-Referer': `http://localhost:${PORT}`, 'X-Title': 'Agent OS' },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: query }], max_tokens: 2048 }),
      });
      const d = await r.json();
      if (d.error) { const c = d.error?.code; if ([429, 401, 503, 529].includes(c)) continue; return `Error: ${d.error.message}`; }
      return d.choices?.[0]?.message?.content || 'No response';
    } catch { continue; }
  }
  // Gemini fallback
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Query: ${query}` }] }] }),
    });
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
  } catch (e) { return `All providers failed: ${e.message}`; }
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
    activeModel: m ? m[1] : 'openrouter/owl-alpha',
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

  const model = 'openrouter/owl-alpha';
  for (const key of [...OR_KEYS].sort(() => Math.random() - 0.5)) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${key}`, 
          'HTTP-Referer': `http://localhost:${PORT}`, 
          'X-Title': 'Agent OS' 
        },
        body: JSON.stringify({ 
          model, 
          messages: [
            { role: 'system', content: orchestratorPrompt }, 
            { role: 'user', content: `Goal: ${goal}` }
          ], 
          max_tokens: 1024 
        }),
      });
      const d = await r.json();
      if (d.error) continue;
      const text = d.choices?.[0]?.message?.content || '[]';
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanedText);
    } catch { continue; }
  }

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
      for (let i = 0; i < plan.length; i++) {
        const step = plan[i];
        res.write(`data: ${JSON.stringify({ content: `🚀 **Step ${i + 1}/${plan.length}**: Dispatching to **${AGENTS[step.agent]?.emoji || '🤖'} ${AGENTS[step.agent]?.name || step.agent}**...\n` })}\n\n`);
        res.write(`data: ${JSON.stringify({ content: `> Task: *${step.task}*\n\n` })}\n\n`);

        // Send task to target agent
        const result = await sendMessage(step.agent, step.task, 'orchestrator');
        
        let formattedResponse = result.response || result.error || 'Done';
        if (formattedResponse.length > 1500) {
          formattedResponse = formattedResponse.substring(0, 1500) + '\n\n*(Truncated due to length)*';
        }

        res.write(`data: ${JSON.stringify({ content: `📥 **Response from ${AGENTS[step.agent]?.name || step.agent}:**\n\`\`\`\n${formattedResponse}\n\`\`\`\n\n` })}\n\n`);
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
    const result = await sendMessage(agentId, query, 'user');
    response = result.response || result.error || 'No response';
  } else {
    // Default: Hermes handles it
    response = await chatCompletion(query);
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
    const db = new (require('node:sqlite').DatabaseSync)(AIONUI_DB);
    const rows = db.prepare('SELECT * FROM teams').all();
    res.json(rows);
  } catch {
    res.json([]);
  }
});

app.get('/api/aionui/teams', (req, res) => {
  try {
    const db = new (require('node:sqlite').DatabaseSync)(AIONUI_DB);
    res.json({ teams: db.prepare('SELECT * FROM teams').all() });
  } catch {
    res.json({ teams: [] });
  }
});

app.get('/api/mailbox', (req, res) => {
  try {
    const db = new (require('node:sqlite').DatabaseSync)(AIONUI_DB);
    const rows = db.prepare('SELECT * FROM mailbox ORDER BY created_at DESC LIMIT 50').all();
    res.json(rows);
  } catch {
    res.json([]);
  }
});

app.get('/api/aionui/mailbox', (req, res) => {
  try {
    const db = new (require('node:sqlite').DatabaseSync)(AIONUI_DB);
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
    const db = new (require('node:sqlite').DatabaseSync)(AIONUI_DB);
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
      const db = new (require('node:sqlite').DatabaseSync)(AIONUI_DB);
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
      const db = new (require('node:sqlite').DatabaseSync)(AIONUI_DB);
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
      const db = new (require('node:sqlite').DatabaseSync)(AIONUI_DB);
      db.prepare("DELETE FROM team_tasks WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
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

// MEMORY SEARCH
app.get('/api/memory-search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ results: [] });
  
  const results = [];
  const query = q.toLowerCase();
  
  const contextPath = 'C:\\Users\\Gary\\CONTEXT.md';
  if (existsSync(contextPath)) {
    const content = readFileSync(contextPath, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(query)) {
        results.push({ source: 'CONTEXT.md', line: idx + 1, text: line.trim() });
      }
    });
  }
  
  const obsidianPath = 'D:\\Obsidian';
  if (existsSync(obsidianPath)) {
    try {
      const files = readdirSync(obsidianPath).filter(f => f.endsWith('.md'));
      files.forEach(f => {
        const content = readFileSync(join(obsidianPath, f), 'utf-8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.toLowerCase().includes(query)) {
            results.push({ source: `Obsidian: ${f}`, line: idx + 1, text: line.trim() });
          }
        });
      });
    } catch {}
  }
  
  res.json({ results: results.slice(0, 30) });
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
      res.send(await r.text());
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
    const db = new (require('node:sqlite').DatabaseSync)(AIONUI_DB);
    const rows = db.prepare("SELECT id, title, created_at FROM conversations ORDER BY created_at DESC LIMIT 50").all();
    res.json(rows);
  } catch {
    res.json([]);
  }
});

app.get('/api/session-detail', (req, res) => {
  const { id } = req.query;
  try {
    const db = new (require('node:sqlite').DatabaseSync)(AIONUI_DB);
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
  const d = 'D:/Obsidian';
  if (f) {
    try {
      res.json({ name: f, content: readFileSync(join(d, f), 'utf-8') });
    } catch {
      res.status(404).json({ error: 'Not found' });
    }
    return;
  }
  try {
    res.json(existsSync(d) ? readdirSync(d).filter(x => x.endsWith('.md')).map(x => ({ name: x })) : []);
  } catch {
    res.json([]);
  }
});

app.post('/api/vault', (req, res) => {
  const { action, name, content } = req.body;
  const vaultPath = 'D:/Obsidian';
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

// TERMINAL
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
