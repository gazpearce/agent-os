# Agent OS Environment Map

This document is generated automatically to provide a structured map of the Agent OS environment for context sharing.

---

### 💻 System Specifications
- **Operating System**: Windows_NT (win32 - x64)
- **Release**: 10.0.19045
- **CPU Cores**: 24
- **Total Memory**: 63.11 GB
- **Free Memory**: 35.05 GB
- **System Uptime**: 379.75 hours


---

### 🌐 Active API Endpoints (server.mjs)
- **GET** `/api/status` - Retreives server health & diagnostic metrics.
- **GET** `/api/agents` - Retreives active agent configurations & status.
- **POST** `/api/chat` - Primary chat route routing message arrays through provider APIs.
- **POST** `/api/agents/message` - Direct agent-to-agent message transport.
- **GET** `/api/skills` - Lists configured dynamic capabilities & directory structures.
- **GET** `/api/db-tasks` - Retrieves task listings from the SQLite backend.


---

### 📦 Project Dependencies
#### Dependencies
- **cors**: ^2.8.6
- **express**: ^5.2.1
- **node-pty**: ^1.1.0
- **react**: ^19.2.6
- **react-dom**: ^19.2.6

#### Dev Dependencies
- **@eslint/js**: ^10.0.1
- **@tailwindcss/vite**: ^4.3.0
- **@types/node**: ^24.12.3
- **@types/react**: ^19.2.14
- **@types/react-dom**: ^19.2.3
- **@vitejs/plugin-react**: ^6.0.1
- **eslint**: ^10.3.0
- **eslint-plugin-react-hooks**: ^7.1.1
- **eslint-plugin-react-refresh**: ^0.5.2
- **framer-motion**: ^12.40.0
- **globals**: ^17.6.0
- **lucide-react**: ^1.17.0
- **recharts**: ^3.8.1
- **tailwindcss**: ^4.3.0
- **typescript**: ~6.0.2
- **typescript-eslint**: ^8.59.2
- **vite**: ^8.0.12


---

### 📂 Directory Structure (D:\Agent OS\agent-os)
- 📁 **-p/**
- 📁 **.antigravitycli/**
- 📄 .gitignore (0.2 KB)
- 📄 api-config.json (5.4 KB)
- 📁 **docs/**
  - 📁 **plans/**
    - 📄 2026-05-30-agent-os-improvements-design.md (2.5 KB)
    - 📄 2026-05-30-agent-os-improvements-plan.md (7.3 KB)
    - 📄 2026-05-31-agent-os-improvements-design.md (1.3 KB)
    - 📄 2026-05-31-agent-os-improvements-plan.md (2.3 KB)
    - 📄 2026-05-31-stateful-terminal-bridge.md (9.1 KB)
    - 📄 2026-05-31-swarm-and-claude-cli-design.md (2.4 KB)
    - 📄 2026-05-31-swarm-and-claude-cli-plan.md (10.2 KB)
    - 📄 2026-05-31-swarm-evolution-and-healing-design.md (2.2 KB)
    - 📄 2026-05-31-swarm-evolution-and-healing-plan.md (19.2 KB)
    - 📄 2026-05-31-ultimate-media-and-models-design.md (2.4 KB)
    - 📄 2026-05-31-ultimate-media-and-models-plan.md (9.9 KB)
    - 📄 2026-06-01-local-ollama-offline-failover.md (1.8 KB)
    - 📄 2026-06-01-self-evolution-overnight.md (2.2 KB)
    - 📄 2026-06-01-swarm-goals-archiver.md (1.9 KB)
    - 📄 2026-06-01-unified-memory-search-and-recall.md (2.1 KB)
    - 📄 evolution-plan-1698213902345.md (0.8 KB)
    - 📄 evolution-plan-1702936200000.md (1.4 KB)
    - 📄 evolution-plan-1706750348123.md (1.9 KB)
    - 📄 evolution-plan-1716300000000.md (1.9 KB)
    - 📄 evolution-plan-1727561234567.md# System Evolution Plan (0.0 KB)
    - 📄 evolution-plan-1740144000000.md (1.6 KB)
    - 📄 evolution-plan-1740342000000.md (2.3 KB)
    - 📄 evolution-plan-1740562300000.md (1.7 KB)
    - 📄 free-claude-code-guide.md (3.0 KB)
    - 📄 task.md (17.3 KB)
- 📄 DAgent-os-server.log (2.6 KB)
- 📄 eslint.config.js (0.6 KB)
- 📄 generate-env-map.mjs (3.4 KB)
- 📄 index.html (0.6 KB)
- 📄 package-lock.json (151.9 KB)
- 📄 package.json (0.9 KB)
- 📁 **public/**
  - 📁 **assets/**
    - 📄 index-B_ieXh5f.css (71.6 KB)
    - 📄 index-DOaEzcWl.js (802.5 KB)
  - 📄 favicon.svg (9.3 KB)
  - 📄 icons.svg (4.9 KB)
  - 📄 index.html (0.7 KB)
- 📄 README.md (2.4 KB)
- 📄 server-latest.log (2.8 KB)
- 📄 server.mjs (166.6 KB)
- 📁 **src/**
  - 📄 App.css (2.8 KB)
  - 📄 App.tsx (233.0 KB)
  - 📁 **assets/**
    - 📄 hero.png (12.8 KB)
    - 📄 react.svg (4.0 KB)
    - 📄 vite.svg (8.5 KB)
  - 📄 index.css (2.3 KB)
  - 📄 main.tsx (0.2 KB)
- 📄 tsconfig.app.json (0.6 KB)
- 📄 tsconfig.json (0.1 KB)
- 📄 tsconfig.node.json (0.6 KB)
- 📄 vite.config.ts (0.3 KB)


---
*Generated on: 04/06/2026, 18:53:09*
