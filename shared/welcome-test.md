# Welcome to the Agent OS Shared Workspace!

This document outlines the setup, usage guidelines, and core operational lessons compiled for the **Agent OS V2** shared workspace environment. All swarm agents and developers working in this directory must adhere to these conventions.

---

## 🚀 1. Shared Workspace Architecture

The workspace is centered at `D:\Agent OS\shared`. It is designed to act as a shared state memory and learning engine.

```
D:\Agent OS\shared\
├── error_vault\         # Case reports of past failures and code fixes
├── knowledge_base\      # Documentation on successfully verified setups
├── AGENTS_GUIDE.md      # Consolidated master rules for all swarm agents
├── hermes_system_prompt.txt # Direct instructions appended to the agent LLM prompt
├── learning_loop.js     # Background cron/script that syncs knowledge & rules
└── welcome-test.md      # [This File] Setup and validation guidelines
```

---

## 👥 2. Swarm Team Roles & Messaging

Agent OS is powered by a multi-layered swarm team cooperating via database-backed communication and APIs:

| Agent | Layer | Role | Core Capability |
| :--- | :--- | :--- | :--- |
| **Antigravity (AGY)** | L1 | CEO & Deep Planner | Reasoning, planning, multi-agent goal delegation |
| **OpenClaw** | L2 | Routing Gateway | Message passing, plugin management, crons |
| **Hermes** | L3 | Terminal & Researcher | Shell execution, file CRUD, search, local script runs |
| **Obsidian** | L4 | Memory & Vault | Vault note tracking (`D:\Agent OS\`), markdown logs |
| **Ollama** | L6 | Local Inference | Running local models (`hermes3:8b`, `gemma4:e4b`) |

### Inter-Agent Communication:
* **No Blocked Loops**: If you encounter an error or limitation, POST immediately to `/api/agents/message` to request help from a peer agent.
* **Shared State**: Always record logs, output drafts, and tasks to `D:\Agent OS\shared\` or the target repo so they are readable by all swarm components.

---

## 💡 3. Core Lessons Learned (Auto-Compiled Rules)

Our self-learning loop has extracted key rules that must be followed during setup and execution:

### ⚠️ A. Win32 console screen buffer crashes
* **Problem**: CLI tools (like `hermes`) using the Python `prompt_toolkit` require a real Win32 console buffer. Running them via standard Node.js `exec` or background subprocesses throws `NoConsoleScreenBufferError`.
* **Fix**: Run the process in a new visible shell window using Windows Shell launch commands:
  * **PowerShell**: Launch via `powershell.exe -WindowStyle Normal -File start_script.ps1`
  * **Node.js**: Use `start cmd.exe /k "hermes chat --yolo"`

### 🌐 B. VitePress Head & SEO Meta Injection
* **Problem**: Static meta tags in VitePress templates cause duplicate or misaligned headers, hindering search engine / AI crawler optimization.
* **Fix**: Inject structured schemas (JSON-LD Article + Breadcrumbs) dynamically via the `transformHead` hook in `.vitepress/config.mjs`:
  ```javascript
  transformHead: ({ pageData }) => {
    const head = [];
    const { title, description, category, slug, image } = pageData.frontmatter;
    // Inject OG, Article schema, and Breadcrumb schema here...
    return head;
  }
  ```
* **Critical Catch**: Wrap descriptions containing colons (`:`) in quotes in YAML frontmatter to prevent parsing exceptions, and watch out for double-prefixing URLs (e.g. `posts/${category}/posts/${slug}`).

---

## 🛠️ 4. Setup & Usage Instructions

### Step 1: Verification of Node environment
Ensure you have Node.js installed in the shell path.

### Step 2: Triggering the Self-Learning Loop
Whenever you add reports to `error_vault/` or `knowledge_base/`, run the learning script to rebuild the prompts:
```bash
node "D:\Agent OS\shared\learning_loop.js"
```
Verify that the output console says:
```
Starting learning loop...
Updated AGENTS_GUIDE.md
Updated hermes_system_prompt.txt
Learning loop complete!
```

### Step 3: Run the Dashboard
Navigate to `D:\Agent OS\agent-os` and start the server:
```bash
npm run dev
```
Open `http://localhost:3001` or `http://localhost:3000` to interact with the glassmorphic dashboard, use the dynamic Kanban Board, and access notes.

---

## ✅ 5. Workspace Verification Checklist

Use this quick checklist to test if your workspace configuration is working correctly:

- [ ] **Database Integrity**: Check if the database paths exist:
  * AionUi DB: `C:\Users\Gary\AppData\Roaming\AionUi\aionui\aionui.db`
  * Hermes DB: `C:\Users\Gary\AppData\Local\hermes\kanban.db`
- [ ] **Learning Loop**: Adding a mock error file to `error_vault/` and running `node learning_loop.js` successfully updates the rules section.
- [ ] **Obsidian Vault Sync**: Notes in `D:\Agent OS` display correctly under the "Vault" tab on the dashboard.
- [ ] **TTS & Code Execution**: Call `/api/tts` to hear system logs out-loud, and verify `/api/run-code` executes JavaScript/Python scripts.
