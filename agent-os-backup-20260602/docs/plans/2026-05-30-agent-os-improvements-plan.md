# Agent OS Improvements Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Fix multiple critical bugs (Obsidian vault paths, search mappings, proxy responses, active agent routing) and implement backend persistence for Todo Lists and Cron Jobs, along with a visual screenshot viewer for Playwright browser automation in the Agent OS dashboard.

**Architecture:** We will modify `server.mjs` to correct local paths and return format-compatible objects for search and vault endpoints, and build filesystem-persisted APIs for todos and crons alongside a Node.js background scheduler. We will update the React dashboard `App.tsx` to call these new endpoints, include the active agent in chat requests, and render the screenshot preview.

**Tech Stack:** Node.js, Express, React, TypeScript, Vite, Tailwind CSS V4, Playwright, SQLite

---

### Task 1: Fix Obsidian Vault Path & Note Metadata
**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs:35-36`
- Modify: `D:/Agent OS/agent-os/server.mjs:106-112`
- Modify: `D:/Agent OS/agent-os/server.mjs:1071-1108`

**Step 1: Write verification commands**
Verify the current response of `/api/vault` lists files but lacks `sizeBytes` or `mtime`.
Run command: `powershell -Command "Invoke-RestMethod -Uri http://localhost:3001/api/vault"`
Expected Output: List of file objects containing only `{ name: ... }`.

**Step 2: Implement path alignment and metadata extraction**
Update `AIONUI_DB` path check, `obsidian` status check path, and vault directory path (`const d = 'D:/Agent OS';`).
Use `fs.statSync` inside `/api/vault` mapping to return `sizeBytes: stats.size` and `mtime: stats.mtime.toISOString()`.

**Step 3: Run verification and commit**
Run: `powershell -Command "Invoke-RestMethod -Uri http://localhost:3001/api/vault"`
Expected Output: List of notes with correct size and time (e.g. `Welcome.md`, `sizeBytes`, `mtime`).
Commit:
```bash
git add agent-os/server.mjs
git commit -m "fix: align obsidian vault path to workspace root and fetch note metadata"
```

---

### Task 2: Fix Memory Search Field Mapping
**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs:871-906`

**Step 1: Write verification commands**
Verify memory search returns `{ source, line, text }`.
Run: `powershell -Command "Invoke-RestMethod -Uri http://localhost:3001/api/memory-search?q=vault"`
Expected Output: Objects with `source`, `line`, `text`.

**Step 2: Add duplicate compatible properties**
Inside `/api/memory-search`, update `results.push` statements to write:
`{ source: ..., file: ..., line: ..., text: ..., snippet: ... }`.

**Step 3: Run verification and commit**
Run: `powershell -Command "Invoke-RestMethod -Uri http://localhost:3001/api/memory-search?q=vault"`
Expected Output: Objects containing both `file` and `snippet`.
Commit:
```bash
git add agent-os/server.mjs
git commit -m "fix: map memory search fields to match frontend expectation"
```

---

### Task 3: Fix Web Search Proxy JSON Response
**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs:909-927`

**Step 1: Write verification commands**
Verify current proxy returns plain HTML text.
Run: `powershell -Command "Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/proxy -ContentType 'application/json' -Body '{\"url\":\"https://html.duckduckgo.com/html/?q=test\",\"method\":\"GET\"}'"`
Expected Output: A plain HTML string (not JSON).

**Step 2: Refactor `/api/proxy` to return JSON object for text response**
Modify the response block for non-JSON content types to return `{ raw: text }` as JSON.

**Step 3: Run verification and commit**
Run verification command again and check if it is formatted as JSON containing a `"raw"` key.
Commit:
```bash
git add agent-os/server.mjs
git commit -m "fix: wrap non-JSON proxy responses in JSON object to prevent frontend crash"
```

---

### Task 4: Fix Model Selection Config Bypass & Active Agent Routing
**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs:258-293`
- Modify: `D:/Agent OS/agent-os/src/App.tsx:1258-1262`

**Step 1: Write verification**
Verify current `chatCompletion` hardcodes `'openrouter/owl-alpha'`.

**Step 2: Read configured model and add active agent payload**
Modify `chatCompletion` to extract `default:` model from `config.yaml` using regex matching, falling back to `'openrouter/owl-alpha'`.
Modify frontend `App.tsx` line 1261 to include `agent: activeAgent` in the `/api/chat` POST payload.

**Step 3: Commit**
Commit:
```bash
git add agent-os/server.mjs agent-os/src/App.tsx
git commit -m "fix: respect model config and route chat queries to the active agent"
```

---

### Task 5: Implement Persistent Todo List API
**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs` (Add `/api/todos` GET and POST routes)
- Modify: `D:/Agent OS/agent-os/src/App.tsx:L647-L685` (Connect frontend to the endpoints)

**Step 1: Create backend todo handlers**
Implement `/api/todos` GET to read `D:\Agent OS\shared\todo-list.json` (falling back to default items if missing).
Implement `/api/todos` POST to save the todo array to `D:\Agent OS\shared\todo-list.json`.

**Step 2: Connect React TodoPanel**
Add a `fetchTodos` function triggered on mount, and a `saveTodos` function replacing React state changes that POSTs the updated list.

**Step 3: Verify and Commit**
Verify by writing a todo via UI, reloading, and checking if it persists.
Commit:
```bash
git add agent-os/server.mjs agent-os/src/App.tsx
git commit -m "feat: persist todo list items to shared workspace"
```

---

### Task 6: Implement Cron Job Background Scheduler & API
**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs` (Add scheduler and `/api/crons` GET/POST endpoints)
- Modify: `D:/Agent OS/agent-os/src/App.tsx:L597-L644` (Connect frontend to endpoints)

**Step 1: Create background runner in backend**
Add a scheduler inside `server.mjs` that loads crons from `D:\Agent OS\shared\cron-jobs.json` and spins up intervals using `setInterval` matching the job settings (such as OpenRouter key rotation and AionUI checks), writing executions to agent logs.

**Step 2: Connect React Cron panel**
Fetch the cron list on mount and update statuses via the `/api/crons` POST route.

**Step 3: Verify and Commit**
Verify the cron statuses and rotation logs.
Commit:
```bash
git add agent-os/server.mjs agent-os/src/App.tsx
git commit -m "feat: add backend cron scheduler and persistence"
```

---

### Task 7: Implement Playwright Screenshot Viewport
**Files:**
- Modify: `D:/Agent OS/agent-os/src/App.tsx:L301-L338`

**Step 1: Add screenshot display state**
Add `screenshotUrl` to the `BrowserPanel` component state.

**Step 2: Update UI layout**
Render an `<img>` tag showing the saved screenshot (`/screenshot.png?t=timestamp`) right below the browser controls when `screenshotUrl` is set.

**Step 3: Verify and Commit**
Initiate a browse session, trigger a screenshot, and verify it updates in the dashboard.
Commit:
```bash
git add agent-os/src/App.tsx
git commit -m "feat: add visual preview for browser screenshots"
```

---

### Task 8: Swarm Build & Diagnostic Verification
**Files:**
- Test: Build output compile verification

**Step 1: Run client build**
Execute `npm run build` inside `agent-os/` to check for TypeScript type check or syntax errors.
Verify: Compiles successfully without warnings.

**Step 2: Commit and final report**
Commit:
```bash
git commit --allow-empty -m "build: complete verification of agent OS dashboard improvements"
```
