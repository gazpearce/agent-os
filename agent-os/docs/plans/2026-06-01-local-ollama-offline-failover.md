# Local Ollama Offline Fallback Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Integrate a local Ollama model fallback in the main `chatCompletion` routing pool to guarantee complete offline execution capacity, and display Ollama status in the diagnostics panel.

**Architecture:** Extend the retry chain of `chatCompletion` in the Node backend to fall back to `http://localhost:11434/api/generate` running `qwen2.5-coder:7b`. Add a ping to Ollama's port in the `/api/swarm/diagnose` endpoint, and display the indicator in the React dashboard.

**Tech Stack:** Node.js, React, Ollama.

---

### Task T76: Backend Local Ollama Fallback & Diagnostics

**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs:1200-1215`
- Modify: `D:/Agent OS/agent-os/server.mjs:2520-2575`

**Step 1: Implement Ollama fallback in chatCompletion**
Add a try-catch block for local Ollama in `chatCompletion` as a final failover if OpenRouter, GitHub, Groq, and Gemini direct calls fail.

**Step 2: Add Ollama health ping to diagnostics endpoint**
Update `/api/swarm/diagnose` to check port 11434 and assign the status to `diagnostics.proxies.ollama`.

**Step 3: Verify backend changes**
Restart the server, simulate a network failure or call `chatCompletion` with fake/blocked keys to ensure the local Ollama fallback is engaged.

---

### Task T77: Frontend Diagnostics Update & Rebuild

**Files:**
- Modify: `D:/Agent OS/agent-os/src/App.tsx:430-440`

**Step 1: Add Ollama entry to SwarmDiagnosticsPanel**
In `SwarmDiagnosticsPanel` of `App.tsx`, render the status of `diag.proxies.ollama`.

**Step 2: Rebuild & Verify compile**
Run `npm run build` inside `D:/Agent OS/agent-os` to verify zero compile warnings/errors.
