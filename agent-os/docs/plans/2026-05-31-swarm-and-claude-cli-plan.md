# Swarm Routing Optimization & Claude CLI Integration Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Optimize startup latency of the Agent OS server, integrate native CLI background processes for Claude Code (running free via local proxy) and OpenClaw agents, and add `replace_file_content` and `grep_search` to the simulated agent tools.

**Architecture:** 
- Add a warmup function on server start to pre-fetch and open a TCP/SSL handshake with OpenRouter.
- Implement background command execution using Node.js `exec` inside `sendMessage` for `claude` and `openclaw` agents, with automatic simulated JS loop failovers.
- Enhance the tool execution logic in `server.mjs` to support precise code editing (`replace_file_content`) and recursive code searching (`grep_search`).
- Use Server-Sent Events (SSE) in `server.mjs` to stream real-time progress text during tool calls.

**Tech Stack:** Node.js, Express, Child Process CLI execution, Server-Sent Events (SSE).

---

### Task 1: Add Claude Code Agent & Health check to Server Registry

**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs` (Add `claude` agent properties and update `checkAgentHealth()`)

**Step 1: Write mock implementation test**
Create a temporary verify script `D:/Agent OS/agent-os/test-health.js` to assert that `claude` is listed in the agents check.

```javascript
import { execSync } from 'child_process';
const agents = {
  claude: { id: 'claude', type: 'cli_agent', binary: 'claude' }
};
console.log("Checking if claude CLI command works...");
try {
  const version = execSync('claude -v', { encoding: 'utf8' });
  console.log("Success: " + version.trim());
} catch (e) {
  console.log("Failed: " + e.message);
}
```

**Step 2: Run test to verify it works**
Run: `node "D:/Agent OS/agent-os/test-health.js"`
Expected: Success or fails gracefully with message.

**Step 3: Modify server.mjs**
Add `claude` in `AGENTS` registry in `D:/Agent OS/agent-os/server.mjs` (around line 128):
```javascript
  claude: {
    id: 'claude', name: 'Claude Code', emoji: '🤖',
    role: 'Expert Developer · Code Optimizer',
    status: 'online', color: '#ea580c',
    type: 'cli_agent',
    capabilities: ['code_gen', 'refactoring', 'terminal_tools', 'testing', 'codebase_search'],
    description: 'Native Claude Code CLI running free via local fcc-server proxy. Excellent at codebase refactoring, debugging, and terminal-based task execution.'
  }
```

Update `checkAgentHealth` in `D:/Agent OS/agent-os/server.mjs`:
```javascript
  // Claude Code
  exec('claude -v', { timeout: 3000 }, (err) => {
    AGENTS.claude.status = err ? 'offline' : 'online';
  });
```

**Step 4: Verify health update**
Run: `node "D:/Agent OS/agent-os/test-health.js"`
Expected: Prints CLI version correctly.

**Step 5: Commit changes**
Commit file updates.

---

### Task 2: Implement OpenRouter Connection Warmup on Server Startup

**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs` (Add `warmupOpenRouter()`)

**Step 1: Write warmup method in server.mjs**
```javascript
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
// Call at end of file setup
warmupOpenRouter();
```

**Step 2: Start server.mjs to verify warmup logs**
Run: `node "D:/Agent OS/agent-os/server.mjs"` and verify logs.
Expected: `[Warmup] OpenRouter warmed up successfully` appears.

---

### Task 3: Implement Native CLI Background Execution for Claude & OpenClaw

**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs` (Update `sendMessage` to execute real CLIs for `claude` and `openclaw`)

**Step 1: Modify server.mjs routing inside sendMessage()**
Add logic to run native commands with a 90-second timeout, falling back to simulated API completion if they fail or time out:

```javascript
  // Native CLI execution handlers
  if (toAgent === 'claude') {
    try {
      console.log(`[Swarm Execution] Running native Claude Code CLI agent...`);
      const escapedMessage = message.replace(/"/g, '`"').replace(/\n/g, ' ');
      const cmd = `$env:ANTHROPIC_API_KEY="freecc"; $env:ANTHROPIC_BASE_URL="http://localhost:8082"; $null | claude -p --dangerously-skip-permissions "${escapedMessage}"`;
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
    }
  } else if (toAgent === 'openclaw') {
    try {
      console.log(`[Swarm Execution] Running native OpenClaw CLI agent...`);
      const escapedMessage = message.replace(/"/g, '`"').replace(/\n/g, ' ');
      const cmd = `openclaw agent --local --agent main --message "${escapedMessage}"`;
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
    }
  }
```

**Step 2: Test API endpoint**
Send a post request to `/api/agents/message` with target `claude` and verify it invokes the local CLI proxy correctly.

---

### Task 4: Add replace_file_content & grep_search tools to simulated agent loop

**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs` (Add `recursiveSearch()` helper, add `replace_file_content` and `grep_search` checks to `executeToolCall()`, and update `toolInstructions`)

**Step 1: Write recursiveSearch helper in server.mjs**
```javascript
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
```

**Step 2: Implement tool execution in executeToolCall()**
Add conditions for `replace_file_content` and `grep_search`:
```javascript
  } else if (toolLower === 'replace_file_content' || toolLower === 'edit_file') {
    const filePath = normalizedArgs.filePath;
    const target = args.target_content || args.target || '';
    const replacement = args.replacement_content || args.replacement || '';
    if (!filePath) return '<longcat_tool_response>\nError: file_path arg missing\n</longcat_tool_response>';
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
    const query = args.query || '';
    const dir = args.dir_path || WORKSPACE;
    if (!query) return '<longcat_tool_response>\nError: query arg missing\n</longcat_tool_response>';
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
```

**Step 3: Update tool instructions in sendMessage()**
Add the documentation for these two tools to `toolInstructions`.

---

### Task 5: Add SSE Real-Time Swarm Progress Logging

**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs` (Add `onProgress` callbacks in `sendMessage` and `executeToolCall()`, and integrate inside `/api/chat` SSE stream)

**Step 1: Add onProgress parameter to sendMessage()**
Pass progress details back to `/api/chat` to write to the Server-Sent Events stream when running tool loops or starting CLI tasks.
Example:
```javascript
res.write(`data: ${JSON.stringify({ content: `🔧 **Tool execution: replace_file_content**...\n` })}\n\n`);
```

**Step 2: Restart & Verify**
Restart backend, perform end-to-end chat queries, and verify live progress logs.
