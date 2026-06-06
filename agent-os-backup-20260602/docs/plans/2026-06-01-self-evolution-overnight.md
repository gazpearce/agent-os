# Overnight Self-Evolution Upgrades Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Upgrade Agent OS to support dynamic LLM-based memory consolidation, enhanced terminal tool parameters with longer timeouts, and an interactive learning trigger in the frontend dashboard.

**Architecture:** Add a new memory consolidation API endpoint to the backend that runs logs through LLM synthesis, upgrade the bash execution tool call handler with custom working directory and 90-second timeouts, and integrate manual triggers on the React frontend.

**Tech Stack:** Node.js, React, Express, Vite, OpenRouter/Gemini API.

---

### Task T73: Backend Memory Consolidation Endpoint

**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs`
- Test: Verify `/api/memory/consolidate` via curl or custom script

**Step 1: Write test script**
Create a scratch script `D:/Agent OS/agent-os/scratch/test-memory-consolidate.js` to mock server payload and hit the new endpoint.

**Step 2: Implement `/api/memory/consolidate` in server.mjs**
Add the route handler using chatCompletion to analyze agent-log.json and append compiled lessons to `shared/knowledge_base/user-memories.md`.

**Step 3: Run verification test**
Execute the test script and verify that `user-memories.md` is successfully generated/updated.

---

### Task T74: Upgrade Tool Execution Bash Handler

**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs:485-520`

**Step 1: Modify executeToolCall**
Update the bash tool handler in `server.mjs` to accept `args.cwd` / `args.dir_path` / `args.working_dir` and pass it to `exec`. Increase execution timeout from 30000ms to 90000ms.

**Step 2: Run verification test**
Execute a mock tool call with `cwd` set to another directory and confirm execution happens in the correct target folder.

---

### Task T75: Frontend Dashboard UI Memory Trigger

**Files:**
- Modify: `D:/Agent OS/agent-os/src/App.tsx:405-460`

**Step 1: Add manual triggers to SwarmDiagnosticsPanel**
Add a "Consolidate Swarm Memory" button that calls `/api/memory/consolidate` and shows logs.

**Step 2: Rebuild & Verify compile**
Run `npm run build` inside `D:/Agent OS/agent-os` to verify zero compile warnings/errors.
