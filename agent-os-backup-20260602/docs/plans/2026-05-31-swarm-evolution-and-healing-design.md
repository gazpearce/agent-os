# Design: Swarm Evolution, Self-Healing & Dynamic Tooling Protocol (v2.6.0)

This document designs the infrastructure for making the Agent OS swarm self-repairing, auto-updating, and dynamically capable of compiling new skills/MCP tools from external repositories (like GitHub) and automatically keeping CLI engines updated.

## 1. Objectives
- **CLI Dependency Auto-Upgrader**: Establish checks to automatically install and upgrade CLI binaries (`aider`, `claude`, `gh`, `openclaw`).
- **Self-Healing Cron Monitor**: A background monitor that checks agent status, identifies failed runs, scans the `error_vault`, and executes repairs (e.g. installing missing Python modules or resolving port conflicts).
- **Dynamic Skill Compilation**: Implement an agent pipeline that automatically converts raw code snippets or Github READMEs into registered Agent OS skills.
- **Unified Swarm Collaboration UI**: Visual progress indicators for self-healing and upgrade actions in the telemetry tab.

## 2. Architecture & Backend Additions (`server.mjs`)
- **Upgrade Endpoints**:
  - `/api/swarm/diagnose`: Checks CLI versions, installs missing ones (`pip install aider-chat`), and runs upgrade checks.
  - `/api/swarm/self-heal`: Scans `error_vault/*.md` and applies automated shell fixes (like port cleanups or package updates).
- **New Swarm Agents**:
  - `aider`: Handles complex multi-file codebase updates.
  - `github`: Translates natural language requests into `gh` commands and runs them.
  - `healer`: Background diagnostic specialist agent.

## 3. UI Dashboard Updates (`src/App.tsx`)
- Add **Aider** and **GitHub CLI** to `INITIAL_AGENTS` sidebar list.
- Add a new **Swarm Telemetry Diagnostic Panel** to trigger manual diagnostics, check CLI versions, and trigger self-healing.
- Display a dynamic progress bar for download/install operations.

## 4. Self-Healing & Upgrade Logic
1. **Startup Check**:
   - Verify `aider` and install if missing (`pip install aider-chat`).
   - Warm up OpenRouter keys.
2. **Background Cron**:
   - Runs every 10 minutes.
   - Pings `http://localhost:8082` (fcc-server), `http://localhost:1234` (LM Studio), and CLI versions.
   - Automatically repairs broken configs or logs alerts to `agent-activity.json`.
