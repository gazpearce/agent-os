# Agent OS Parser Robustness & Model Failovers Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Modify the tool call parser to support nested XML structures and add multi-model failover chains to ensure flawless out-of-the-box operations.

**Architecture:** Use dual regex key-value/nested XML extraction in `executeToolCall` and wrap completion functions in dynamic failover loops traversing active free models.

**Tech Stack:** Node.js, Express, Fetch API, YAML config

---

### Task 1: Update Default Config Model
**Files:**
- Modify: `C:/Users/Gary/AppData/Local/hermes/config.yaml:1-10`

**Step 1: Write the change to config.yaml**
Update default model from `google/gemini-2.0-flash-001` to `google/gemma-4-31b-it:free`.

**Step 2: Verify the change**
Read the config file to confirm the default is `google/gemma-4-31b-it:free`.

**Step 3: Commit**
Add and commit changes to git (if tracked).

---

### Task 2: Implement Unified Tool Call Parser
**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs:247-310`

**Step 1: Rewrite executeToolCall**
Rewrite the parser to extract arguments from both custom key/value pairs and nested tags, and map normalized aliases (`cmd`, `TargetFile`, `CodeContent`).

**Step 2: Verify code syntax**
Check for syntax errors in `server.mjs` using `node --check server.mjs`.

**Step 3: Commit**
Add and commit changes to `server.mjs`.

---

### Task 3: Implement Swarm Model Failover Chain
**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs:311-355` (chatCompletionWithHistory)
- Modify: `D:/Agent OS/agent-os/server.mjs:587-639` (chatCompletion)
- Modify: `D:/Agent OS/agent-os/server.mjs:717-789` (getOrchestratorPlan)

**Step 1: Implement the failover loops**
Refactor these three functions to try fallback models `['google/gemma-4-31b-it:free', 'openrouter/free']` when the primary fails.

**Step 2: Verify server syntax**
Run `node --check server.mjs` to ensure clean parsing.

**Step 3: Commit**
Add and commit changes.

---

### Task 4: Restart & End-To-End Verification
**Files:**
- Test: Local API endpoint `/api/chat`

**Step 1: Restart Server**
Restart the Node server.

**Step 2: Send Chat Request**
Send a chat task to hermes and verify it responds fast with correct tool executions and no XML leak.
