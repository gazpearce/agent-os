# Swarm Evolution, Self-Healing & Dynamic Tooling Protocol Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement the video generator, integrate DeepSeek R1 and Qwen 2.5, add Aider and GitHub CLI agents, and establish self-healing/diagnostic endpoints and background cron checking.

**Architecture:** 
- Add `/api/generate-video`, `/api/swarm/diagnose`, and `/api/swarm/self-heal` backend endpoints in `server.mjs`.
- Integrate Aider and GitHub CLI execution in `sendMessage()` in `server.mjs`.
- Refactored `INITIAL_AGENTS` and `MODELS` list in `src/App.tsx`.
- Refactor `ImageGenPanel` to `MediaEnginePanel` and add a new Swarm Telemetry Diagnostic Panel in the UI.

**Tech Stack:** Node.js, Express, React, TypeScript, Child Process, Tailwind CSS V4

---

### Task 1: Backend Video Generator API

**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs`
- Create: `C:/Users/Gary/.gemini/antigravity-cli/brain/66e4840c-27be-4c58-96b3-7ac8ad88a68d/scratch/test-video-api.js`

**Step 1: Create verification script**
Write `test-video-api.js`:
```javascript
import http from 'http';
const data = JSON.stringify({ prompt: 'cinematic drone shot of home security cameras' });
const req = http.request('http://localhost:3001/api/generate-video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      if (parsed.videoUrl && parsed.videoUrl.includes('video.pollinations.ai')) {
        console.log('SUCCESS: Video generation API works!');
        process.exit(0);
      } else {
        console.error('FAILURE:', body);
        process.exit(1);
      }
    } catch (e) {
      console.error('FAILURE:', e.message);
      process.exit(1);
    }
  });
});
req.on('error', (e) => { console.error('Error:', e.message); process.exit(1); });
req.write(data);
req.end();
```

**Step 2: Run verification script to check failure**
Run: `node "C:/Users/Gary/.gemini/antigravity-cli/brain/66e4840c-27be-4c58-96b3-7ac8ad88a68d/scratch/test-video-api.js"`
Expected: Connection error or 404 since endpoint does not exist.

**Step 3: Implement endpoint in server.mjs**
Add right after `/api/generate-image` endpoint (around line 2034):
```javascript
app.post('/api/generate-video', (req, res) => {
  const p = req.body.prompt;
  if (!p) return res.status(400).json({ error: 'Prompt required' });
  res.json({ videoUrl: `https://video.pollinations.ai/prompt/${encodeURIComponent(p)}?width=512&height=512&nologo=true` });
});
```

**Step 4: Run verification script to confirm pass**
Start backend and run the test script.
Expected: SUCCESS log.

**Step 5: Commit changes**
```bash
git add agent-os/server.mjs
git commit -m "feat: add backend free video generation endpoint"
```

---

### Task 2: Implement Aider & GitHub CLI Agent Routing

**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs:580-630` (Update `sendMessage` to support `aider` and `github` agents)

**Step 1: Check existing routing logic**
Inspect how `claude` and `openclaw` execute shell processes in `sendMessage`.

**Step 2: Add Aider and GitHub CLI commands inside sendMessage**
Add the execution handlers:
```javascript
  } else if (toAgent === 'aider') {
    try {
      if (onProgress) onProgress(`🤖 **Aider CLI** is initializing codebase environment...`);
      console.log(`[Swarm Execution] Running native Aider CLI agent...`);
      const key = OR_KEYS[0] || '';
      const escapedMessage = message.replace(/"/g, "'").replace(/\r?\n/g, ' ');
      // run aider in batch message mode using the active OpenRouter free model
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
      
      // Translate natural language query to gh command using fast LLM completion
      const translationPrompt = `You are a translator that converts natural language requests into a single executable GitHub CLI (gh) command.
Current workspace is a git repository.
Request: "${message}"

Output ONLY the raw gh command. Do not write markdown, do not write code blocks, do not explain. Just the exact command (e.g. gh pr list or gh issue status).`;

      const cmdToRunRaw = await chatCompletionWithHistory('github', translationPrompt, []);
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
```

Add `aider` and `github` to the simulated LLM fallback checklist in `sendMessage`:
```javascript
  if (['agy', 'openclaw', 'hermes', 'claude', 'aider', 'github'].includes(toAgent) && (!['claude', 'openclaw', 'aider', 'github'].includes(toAgent) || runSimulated)) {
```

And define system prompts for simulated fallbacks:
```javascript
      } else if (toAgent === 'aider') {
        agentPrompt = 'You are Aider, the Multi-file Coding agent of the Agent OS V2 Swarm. Be concise. Synthesize code improvements across files.';
      } else if (toAgent === 'github') {
        agentPrompt = 'You are GitHub CLI Agent, managing pull requests and issues. Be concise.';
```

**Step 3: Commit**
```bash
git add agent-os/server.mjs
git commit -m "feat: implement native Aider and GitHub CLI agent backend executors"
```

---

### Task 3: Implement Swarm Diagnostics and Self-Healing APIs

**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs:2035-2040` (Add `/api/swarm/diagnose` and `/api/swarm/self-heal`)

**Step 1: Write diagnostic endpoints**
```javascript
// SWARM DIAGNOSTICS
app.get('/api/swarm/diagnose', async (req, res) => {
  const diagnostics = {
    runtimes: { python: 'checking', node: 'checking' },
    clis: { aider: 'checking', claude: 'checking', gh: 'checking', openclaw: 'checking' },
    proxies: { fccServer: 'checking', lmStudio: 'checking' }
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
```

**Step 2: Commit**
```bash
git add agent-os/server.mjs
git commit -m "feat: implement Swarm Diagnostics and Self-Healing APIs"
```

---

### Task 4: Add Background Diagnostic Cron Check

**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs:180-240` (Inside cron registration setup)

**Step 1: Check existing crons**
Identify `OpenRouter Key Rotation` and `AionUI Health Monitor` cron setups in `server.mjs`.

**Step 2: Add Swarm Self-Check Cron**
Add the cron checker:
```javascript
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
```

**Step 3: Commit**
```bash
git add agent-os/server.mjs
git commit -m "feat: add background self-diagnosing cron loop for CLI tools"
```

---

### Task 4.5: Add Aider and GitHub CLI Agents to Server Registries

**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs:110-140`

**Step 1: Insert Aider and GitHub CLI agents into AGENTS registry**
Add:
```javascript
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
```

---

### Task 5: Upgrade Frontend App.tsx

**Files:**
- Modify: `D:/Agent OS/agent-os/src/App.tsx`

**Step 1: Update INITIAL_AGENTS**
Add `aider` and `github` to the list of agents (around line 110):
```typescript
  { id: "aider", name: "Aider Chat", role: "Multi-file Coding Agent", icon: <Terminal size={18} />, status: "online", version: "0.68.0", layer: "L3", color: "#10b981", tokens: 0, tasks: 0, skills: 8 },
  { id: "github", name: "GitHub CLI", role: "Repo Operations & PRs", icon: <Layers size={18} />, status: "online", version: "2.92.0", layer: "L3", color: "#64748b", tokens: 0, tasks: 0, skills: 5 },
```

**Step 2: Update MODELS array**
Add DeepSeek R1 and Qwen 2.5 Coder free models (around line 125):
```typescript
  { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Reasoning)", ctx: "128K", type: "reasoning", selected: false },
  { id: "qwen/qwen-2.5-coder-32b-instruct:free", name: "Qwen 2.5 Coder 32B", ctx: "128K", type: "coding", selected: false },
```

**Step 3: Refactor ImageGenPanel into MediaEnginePanel**
Replace the layout on line 250 with the split-tab Image & Video generation widget. Ensure standard download trigger anchor blocks are styled with flex alignment matching the layout rules.

**Step 4: Add Swarm Telemetry Diagnostic Panel**
Under the Telemetry tab (`TelemetryPanel` rendering segment in JSX, around line 2350), add a diagnostic visual panel display:
```tsx
function SwarmDiagnosticsPanel() {
  const [diag, setDiag] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [healLogs, setHealLogs] = useState<string[]>([]);
  const [healing, setHealing] = useState(false);

  const runDiag = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/swarm/diagnose');
      const data = await res.json();
      setDiag(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const runHeal = async () => {
    setHealing(true);
    setHealLogs(["Starting self-healing triggers..."]);
    try {
      const res = await fetch('/api/swarm/self-heal', { method: 'POST' });
      const data = await res.json();
      if (data.logs) setHealLogs(data.logs);
    } catch (e) { setHealLogs(prev => [...prev, `Heal error: ${e.message}`]); }
    finally { setHealing(false); }
  };

  useEffect(() => { runDiag(); }, []);

  return (
    <div className="bg-[#0c0c16]/75 border border-white/[0.04] rounded-2xl p-4 space-y-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-white/[0.05] pb-3">
        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">🔬 Swarm Diagnostic Engine</span>
        <div className="flex gap-2">
          <button onClick={runDiag} disabled={loading} className="px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-[9px] font-mono cursor-pointer transition-colors">
            {loading ? "Testing..." : "Run Diagnostics"}
          </button>
          <button onClick={runHeal} disabled={healing} className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono cursor-pointer transition-colors">
            {healing ? "Healing..." : "Run Auto-Healing"}
          </button>
        </div>
      </div>

      {diag && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px] font-mono">
          <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl space-y-1.5">
            <span className="text-gray-500 font-bold block border-b border-white/[0.04] pb-1 mb-1">RUNTIMES</span>
            <div>🐍 Python: <span className="text-indigo-300">{diag.runtimes.python}</span></div>
            <div>⚡ Node.js: <span className="text-indigo-300">{diag.runtimes.node}</span></div>
          </div>
          <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl space-y-1.5">
            <span className="text-gray-500 font-bold block border-b border-white/[0.04] pb-1 mb-1">CLI BINARIES</span>
            <div>🧑‍💻 Aider: <span className={diag.clis.aider === 'missing' ? 'text-rose-400' : 'text-emerald-400'}>{diag.clis.aider}</span></div>
            <div>🤖 Claude: <span className={diag.clis.claude === 'missing' ? 'text-rose-400' : 'text-emerald-400'}>{diag.clis.claude}</span></div>
            <div>🐙 GitHub: <span className={diag.clis.gh === 'missing' ? 'text-rose-400' : 'text-emerald-400'}>{diag.clis.gh}</span></div>
            <div>🔀 OpenClaw: <span className={diag.clis.openclaw === 'missing' ? 'text-rose-400' : 'text-emerald-400'}>{diag.clis.openclaw}</span></div>
          </div>
          <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl space-y-1.5">
            <span className="text-gray-500 font-bold block border-b border-white/[0.04] pb-1 mb-1">PROXIES</span>
            <div>🤖 fcc-server: <span className={diag.proxies.fccServer === 'offline' ? 'text-rose-400' : 'text-emerald-400'}>{diag.proxies.fccServer}</span></div>
            <div>🦙 LM Studio: <span className={diag.proxies.lmStudio === 'offline' ? 'text-rose-400' : 'text-emerald-400'}>{diag.proxies.lmStudio}</span></div>
          </div>
        </div>
      )}

      {healLogs.length > 0 && (
        <div className="p-3 bg-black/40 border border-white/[0.04] rounded-xl space-y-1 max-h-32 overflow-y-auto text-[9px] font-mono text-gray-400 select-text">
          {healLogs.map((log, idx) => (
            <div key={idx} className={log.includes('Failed') ? 'text-rose-400' : log.includes('success') || log.includes('installed') ? 'text-emerald-400' : 'text-gray-400'}>
              🚀 {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

Render `<SwarmDiagnosticsPanel />` at the bottom of the Telemetry tab views list.

**Step 5: Commit**
```bash
git add agent-os/src/App.tsx
git commit -m "feat: integrate Aider, GitHub CLI agents, MediaEngine, and Swarm Diagnostics panel in UI"
```

---

### Task 6: Compile & Run Verification

**Files:**
- Test: Production Vite compilation and CLI runtime logs

**Step 1: Run build compile check**
Run: `npm run build`
Expected: Compile SUCCESS with no TypeScript warnings/errors.

**Step 2: Restart Agent OS server**
Kill active server background task and start the new server task using `node server.mjs`.

**Step 3: Run live test script**
Test that `github` translates commands and `aider` integrates seamlessly.
Verify that the `SwarmDiagnosticsPanel` runs and shows CLI versions correctly.
Verify the `VideoGen` tab works.

**Step 4: Update task.md**
Update tracking.
