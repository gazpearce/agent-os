# Julian Goldie Agentic OS Analysis - SEO Content Pipeline

This report breaks down the features, visual layouts, and architectural ideas extracted from Julian Goldie's video **"How I use Claude code for SEO to rank number one" (Video ID: dTxBFDs8Buc)**.

---

## 1. Visual Layout & UI Audit (From Screenshots)

Julian's dashboard runs on `localhost:3737/seo`. Key visual panels and configurations include:

### Left Sidebar (Navigation)
- **Local Indicator**: Shows current local time and timezone (e.g. Bangkok).
- **Orchestration Brand**: labeled `Agentic OS`.
- **Workspace Workspace Section**: Labeled `Mission Control`.
- **Agents Swarm**: Lists active subagents `Claude`, `OpenClaw`, and `Hermes`.
- **Self-Operating Nodes**: Direct access to `Goals`, `SEO` (Active Tab), and `Studio`.

### SEO Content Pipeline Panel
- **Description**: "Pick a keyword + transcript. Generate 5 unique articles. Deploy to your Netlify funnel."
- **Generate / Deploy / History Sub-tabs**: Fast action tabs to toggle between code creation, build logs, and past generations.
- **Target Keyword & File Slug Inputs**: Clean forms to input targets (e.g., `hermes mcp server` / `hermes-mcp-server`).
- **Source Transcript Picker**: A file selection grid with pre-loaded logs (`ernie-5-1`, `perplexity-seo`, `deepseek-harness`, etc.) or a box to "Paste New" transcripts.
- **Auto-Deploy Toggle**: A switch that triggers Netlify site builds and publishes all 5 blogs in parallel once generation completes.
- **Generate 5 Articles Action**: One-click trigger button at the bottom-right.

---

## 2. Core Architectural Features (From Transcript)

Julian defines his Agentic OS via three main layers: **the Front**, **the Team**, and **the Brain**.

### The Front (The Controls)
- A browser-based interface constructed entirely by asking Claude to build it in plain English.
- Acts as a unified dashboard so the user doesn't have to copy-paste between tools.

### The Team (The Subagents)
- Uses **Claude Code** as a lead developer agent.
- A **Lead Agent** takes a high-level goal and splits it into smaller sub-tasks (Keyword Research, Outlining, Writing, Formatting, Interlinking).
- Sub-tasks are delegated to multiple child agents running in parallel to maximize output speed.

### The Brain (The Memory Layer)
- Stores personal context, target audience details, site authority tiers, and brand voice guidelines inside a local folder (managed via **Obsidian**).
- Before writing any article, the Agent reads this entire folder, preventing generic AI content and matching the exact human tone.

---

## 3. High-Priority Features to Clone in Our Dashboard

1. **SEO Content Pipeline Panel**:
   - Create a dedicated **SEO Pipeline** sub-tab in our Media Studio or Workspace.
   - Let Gary input a target keyword and select a reference transcript or text log.
   - Build a prompt that uses this input to draft 5 layered articles (Money site article, Tier-1 support articles, and satellite blog posts) that interlink to build local authority.
2. **Obsidian / Markdown Memory Folder Sync**:
   - Build a RAG scanning step that reads Gary's profile, Checkatrade reviews, and blogs list directly from a local folder before executing tasks.
3. **Auto-Deploy Integration**:
   - Provide a Netlify or FTP deploy toggle to automatically push newly generated pages directly online.
