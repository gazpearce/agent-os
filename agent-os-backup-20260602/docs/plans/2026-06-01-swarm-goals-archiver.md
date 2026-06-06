# Swarm Goals Archiver Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement a swarm goals archiver that records details of completed goals, execution plans, and AI-summarized outcomes into the markdown knowledge base.

**Architecture:** Create an `archiveGoal` helper function in `server.mjs` that compiles an executive summary using LLM completion, writes the plan and outcome to a new Markdown file inside `shared/knowledge_base/goals/`, updates a centralized `goals-index.md` list, and calls `runMemoryConsolidation` to index the information. Call this helper at the end of the orchestrator route in `/api/chat`.

**Tech Stack:** Node.js, Express, Markdown, LLM summarization.

---

### Task T81: Implement Swarm Goals Archiver Helper

**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs:1590-1610`

**Step 1: Write archiveGoal function**
Add the helper function to write Markdown goal reports and append them to `goals-index.md`. Run memory consolidation to index the new files.

**Step 2: Add dynamic LLM summarization**
Call `chatCompletion` with agent context to write a 2-3 sentence executive summary of the accomplishments.

---

### Task T82: Hook Goals Archiver into Orchestration Loop

**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs:1640-1660`

**Step 1: Update `/api/chat` orchestrator block**
Call `archiveGoal` after the orchestrator completes all step executions.

**Step 2: Restart server and verify**
Restart Node server, send a test orchestrator request, and confirm that a new Markdown file is successfully created in `shared/knowledge_base/goals/` and indexed in `goals-index.md`.

---

### Task T83: Rebuild & Diagnostic Check

**Files:**
- Modify: `D:/Agent OS/agent-os/docs/plans/task.md`

**Step 1: Rebuild dashboard**
Run `npm run build` to ensure zero compilation issues.
