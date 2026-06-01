# Unified Memory Search & Dynamic Recall Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Upgrade Agent OS's memory retrieval by indexing `agent-log.json` in `/api/memory-search`, and enabling dynamic query-time memory context injection in `/api/chat`.

**Architecture:** Update `/api/memory-search` in `server.mjs` to scan the agent log file for queries. Add a pre-scan keywords check to the default chat route in `server.mjs` to dynamically fetch matching memories and append them as context to the LLM completion prompt.

**Tech Stack:** Node.js, React, Express, LLM prompt engineering.

---

### Task T78: Index Agent Logs in Memory Search

**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs:2098-2135`

**Step 1: Update `/api/memory-search`**
Add logic to check if `shared/agent-log.json` exists. Parse the log array, search all properties (type, from, to, message, response) for the query, and append matched entries as hits under source "Agent Log".

**Step 2: Run verification test**
Query the search endpoint via curl/PowerShell with a term from recent crons (e.g., "Rotation" or "diagnose") and confirm log hits are returned.

---

### Task T79: Dynamic Memory Recall Context Injection

**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs:1625-1645`

**Step 1: Implement pre-scan recall helper**
Create a helper `injectRecalledMemory(query)` that extracts keywords from a query, scans the memory database, formats matching snippets, and appends them to the prompt.

**Step 2: Update `/api/chat` route**
Call this helper on default routes if the user query contains recall-trigger words.

---

### Task T80: Build & Verify Swarm Swarming

**Files:**
- Modify: `D:/Agent OS/agent-os/docs/plans/task.md`

**Step 1: Rebuild Frontend**
Run `npm run build` to ensure zero compilation errors.

**Step 2: Test Interactive Recall**
Query the chatbot on the dev server (or backend) with a recall question (e.g. "what was the last cron job executed?") and verify it answers with accurate context.
