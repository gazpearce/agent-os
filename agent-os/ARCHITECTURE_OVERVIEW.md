# Agent OS Architecture & Directory Tree

This file provides a directory tree and architecture overview of the project to help external AI models or developers understand the structure.

## GitHub Link
* Repository: [https://github.com/gazpearce/agent-os](https://github.com/gazpearce/agent-os)
* Default Branch: `main`

---

## Directory Trees

### 1. Main Application (`D:\Agent OS\agent-os`)
This is the core frontend React application and Node backend server.

```text
agent-os/
  package.json
  vite.config.ts
  tailwind.config.js
  tsconfig.json
  server.mjs            <-- Backend API Server (port 3001)
  src/
    main.tsx            <-- React client entry
    index.css           <-- Tailwind directives & main styles
    App.tsx             <-- Core state, drag-drop panels, terminal logic
    App.css             <-- Custom scrollbars & visual styling
    components/         <-- Swarm & OS components (e.g. SwarmHub, VideoAnalyzer)
```

### 2. Shared Data & Knowledge Base (`D:\Agent OS\shared`)
This contains shared configuration, persistent files, knowledge bases, and scripts used by the swarm.

```text
shared/
  GARY_PEARCE_CONTENT_ENGINE_V2.md   <-- Content generation strict rules
  cctv_seo_competitive_analysis.md   <-- Competitor analysis & SEO strategy
  state.db                           <-- Shared state SQLite database
  whatsapp_status.json               <-- Shared Whatsapp status logs
  cron-jobs.json                     <-- Swarm task schedules
  brand_guidelines.md                <-- Core brand styling parameters
  knowledge_base/                    <-- Competitor transcript summaries & proposals
  website/                           <-- Root of compiled SEO local landing page assets
```
