# Stateful PTY Terminal Bridge Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement a persistent, stateful PowerShell terminal session backend in Agent OS, and connect the React dashboard frontend via a Server-Sent Events (SSE) stream to enable real-time interactive terminal execution.

**Architecture:** We will implement a background process spawning helper in `server.mjs` that manages a single active `powershell.exe` child process, mapping stdin writes and stdout/stderr broadcasts. In the React frontend `App.tsx`, we will replace the static `/api/run` callback with an active `EventSource` listener that dynamically subscribes to the stdout/stderr stream when the Terminal pane is active.

**Tech Stack:** Node.js, Express, Server-Sent Events (SSE), React (TypeScript).

---

### Task 1: Create Terminal Session Management APIs in Backend

**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs:1940-1947`

**Step 1: Check existing `/api/run` endpoint**
Verify the line structure around `/api/run` to prepare for replacement.

**Step 2: Add Persistent Terminal logic**
Implement global terminal process tracking variables, a buffer to cache recent console lines, and the `/api/terminal/*` endpoints in `D:/Agent OS/agent-os/server.mjs`:

```javascript
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
```

Make sure to add `spawn` to the destructured imports from `'child_process'` at the top of `server.mjs`.

**Step 3: Verify syntax**
Run: `node --check D:/Agent OS/agent-os/server.mjs`
Expected: Command exits with 0.

**Step 4: Commit**
```bash
git add agent-os/server.mjs
git commit -m "feat: implement stateful terminal backend routing and powershell session bridge"
```

---

### Task 2: Connect Frontend Terminal pane to SSE stream & Stdin POST

**Files:**
- Modify: `D:/Agent OS/agent-os/src/App.tsx:L1335-L1340`
- Modify: `D:/Agent OS/agent-os/src/App.tsx:L1553-L1588`
- Modify: `D:/Agent OS/agent-os/src/App.tsx:L2491-L2520`

**Step 1: Check existing Terminal component**
Inspect the exact HTML structure and submit handlers in `App.tsx`.

**Step 2: Add dynamic EventSource connection**
Implement a `useEffect` hook in `App.tsx` that establishes the `/api/terminal/output` listener when the active tab is `terminal` and tears it down on unmount:

```typescript
  // Dynamic terminal SSE stream sync
  useEffect(() => {
    if (centerTab !== 'terminal') return;

    const source = new EventSource('/api/terminal/output');
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.text) {
          setTerminalLogs(prev => {
            const last = prev[prev.length - 1];
            if (last && last.type === 'output') {
              return [...prev.slice(0, -1), { type: 'output', text: last.text + data.text }];
            } else {
              return [...prev, { type: 'output', text: data.text }];
            }
          });
        }
      } catch (e) {
        console.error("Error parsing terminal SSE:", e);
      }
    };

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  }, [centerTab]);
```

**Step 3: Update `handleTerminalSubmit`**
Replace stateless command execution with POSTing user commands directly to the persistent shell session `stdin`:

```typescript
  // Execute terminal command on host shell
  const handleTerminalSubmit = async () => {
    if (!terminalInput.trim()) return;
    const cmd = terminalInput;
    setTerminalInput("");
    
    try {
      await fetch('/api/terminal/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });
    } catch (e: any) {
      setTerminalLogs(prev => [...prev, { type: 'error', text: `Failed to send input: ${e.message}` }]);
    }
  };
```

**Step 4: Update UI Layout**
Refactor the Terminal Viewport in `App.tsx` to include the Session Reset action, render the raw output with whitespace preservation, and simplify the input console:

```typescript
          {/* ─── TAB 3: HOST TERMINAL CONSOLE ─── */}
          {centerTab === "terminal" && (
            <div className="flex-grow flex flex-col min-h-0 bg-[#04040c]/90 rounded-2xl border border-white/[0.04] p-6 font-mono text-sm leading-relaxed overflow-hidden shadow-2xl relative">
              <div className="flex justify-between items-center mb-4 border-b border-white/[0.04] pb-3">
                <span className="text-gray-400 font-semibold text-xs tracking-wider">PERSISTENT SYSTEM SHELL (POWERSHELL)</span>
                <button 
                  onClick={async () => {
                    await fetch('/api/terminal/kill', { method: 'POST' });
                    setTerminalLogs([]);
                  }}
                  className="px-3 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs transition-colors cursor-pointer font-sans"
                >
                  Reset Session
                </button>
              </div>
              <div className="flex-grow overflow-y-auto mb-4 space-y-2 pr-2 custom-scrollbar">
                {terminalLogs.map((log, index) => (
                  <div key={index} className={log.type === 'input' ? 'text-indigo-400 font-semibold' : log.type === 'error' ? 'text-rose-400 font-semibold' : 'text-gray-300 whitespace-pre-wrap'}>
                    {log.text}
                  </div>
                ))}
                <div ref={terminalBottomRef} />
              </div>
              <div className="flex gap-3 border-t border-white/[0.04] pt-3">
                <span className="text-indigo-400 flex items-center font-semibold">PS Gary></span>
                <input 
                  type="text" 
                  className="flex-grow bg-transparent focus:outline-none text-white font-mono"
                  value={terminalInput}
                  onChange={e => setTerminalInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTerminalSubmit()}
                  placeholder="Type commands here and press Enter..."
                />
              </div>
            </div>
          )}
```

**Step 5: Verify build**
Run: `npm run build` inside `D:/Agent OS/agent-os`
Expected: Build compiles cleanly with 0 type-check or bundling warnings.

**Step 6: Commit**
```bash
git add src/App.tsx
git commit -m "feat: upgrade terminal console to stream real-time stdout and handle interactive stdin"
```

---

### Task 3: Final Integration Test and Restart Verification

**Files:**
- Test: Live port 3001 verification

**Step 1: Restart Server**
Terminate the existing running Node server and spawn a fresh instance.

**Step 2: Run terminal interaction test**
- Open the dashboard Terminal view.
- Send a simple command like `dir` or `whoami` and verify it prints output.
- Send `claude -v` and verify it shows the Claude CLI version.
- Verify resetting the session restarts powershell cleanly.

**Step 3: Commit**
```bash
git commit --allow-empty -m "build: verify persistent system shell dashboard integration is stable"
```
