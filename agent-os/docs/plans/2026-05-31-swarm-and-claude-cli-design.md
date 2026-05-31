# Design: Swarm Routing Optimization & Claude CLI Integration

This document outlines the design for optimizing the start-up latency of the Agent OS backend, integrating native CLI execution for OpenClaw and Claude Code (running free via local proxy), and equipping the swarm with a richer tool set.

## 1. Objectives
- Reduce first-request latency of the session from 5+ seconds to under 2 seconds.
- Run actual background CLI processes for `claude` (Claude Code) and `openclaw` when their agents are invoked, leveraging their native codebase-editing and searching powers.
- Implement robust failovers to simulated JS loops in case CLI binaries are missing or fail.
- Stream real-time status updates through Server-Sent Events (SSE) so the user is never left waiting in silence.
- Expand the simulated agent toolset to include `replace_file_content` and `grep_search`.

## 2. Architecture & Registry Changes
- Add the `claude` agent to `AGENTS` in `server.mjs`:
  ```javascript
  claude: {
    id: 'claude', name: 'Claude Code', emoji: '🤖',
    role: 'Expert Developer · Code Optimizer · Refactoring',
    status: 'online', color: '#ea580c',
    type: 'cli_agent',
    capabilities: ['code_gen', 'refactoring', 'terminal_tools', 'testing', 'codebase_search'],
    description: 'Native Claude Code CLI running free via local fcc-server proxy. Excellent at codebase refactoring, debugging, and terminal-based task execution.'
  }
  ```
- Implement `warmupOpenRouter()` on server startup to establish the DNS and TCP/SSL handshakes with OpenRouter beforehand.

## 3. Native CLI Execution & Failover
- When a task is routed to `claude` or `openclaw`:
  - Run the native CLI commands asynchronously via `exec`.
  - Claude CLI command:
    ```powershell
    $env:ANTHROPIC_API_KEY="freecc"; $env:ANTHROPIC_BASE_URL="http://localhost:8082"; $null | claude -p --dangerously-skip-permissions "<prompt>"
    ```
  - OpenClaw CLI command:
    ```powershell
    openclaw agent --local --agent main --message "<prompt>"
    ```
  - Implement a 90-second timeout.
  - If the CLI binary errors out or is missing, automatically fall back to the simulated JS LLM loop.

## 4. Enhanced Simulated Swarm Tools
- Equip the JS executor with `replace_file_content` (to modify lines precisely instead of rewriting entire files) and `grep_search` (fast recursive text lookup).
- Call `onProgress` callbacks to stream progress details (e.g. `🔧 Running search...`) through Server-Sent Events (SSE) to the frontend.
