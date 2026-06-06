# NotebookLM + Hermes AI Agent Operating System Guide

This guide compiles the comprehensive workflows, architecture, and tool integrations of the **NotebookLM + Hermes AI Agent Operating System (OS)**, as detailed in recent tutorials by Julian Goldie. It outlines how to build an automated content factory that turns raw research into multi-channel assets with zero manual clicking.

---

## 1. System Architecture: The Three-Layer Engine

The system operates as a unified three-layer engine running on a local machine, using open-source connectors and free tools.

```mermaid
graph TD
    subgraph Knowledge Vault (Ingestion)
        NLM[NotebookLM] -->|Holds Sources: PDFs, Sites, Videos| KV[Knowledge Vault]
    end
    
    subgraph Agent Core (Orchestration)
        Agent[Hermes Agent / Claude OS Dashboard]
        MCP[Model Context Protocol Bridge]
        Portal[Nous Portal / Free Models]
        Agent --> MCP
        Agent --> Portal
    end
    
    subgraph Memory & Output (Obsidian & Plugins)
        Obsidian[(Obsidian Vault)]
        HF[Hyperframes Video Editor]
    end

    KV <-->|MCP Connector| Agent
    Obsidian <-->|Context Feed & Save Loop| Agent
    Agent -->|Execute Commands| HF
    HF -->|Local Output| Desktop[Desktop Files]
```

### Layer 1: The Knowledge Vault (NotebookLM)
*   **Purpose:** Houses all raw sources (PDFs, websites, docs, YouTube videos, customer queries).
*   **Role:** Acts as the base repository. Google NotebookLM reads, structures, and processes the inputs.
*   **Native Outputs:** Can generate 12 different content types on-demand (Audio Show/Podcasts, Videos, Slide Decks, Mind Maps, Infographics, Flashcards, Quizzes, Briefing Docs, Study Guides, FAQs, Full Reports).

### Layer 2: The Agent Core (Hermes / Claude Dashboard)
*   **Purpose:** The execution brain that sits on the local machine and orchestrates the system.
*   **Hermes Agent:** A free, open-source AI agent developed by Nous Research (publicly released in February 2026). It runs locally and handles workflows.
*   **MCP (Model Context Protocol):** The connector bridge that allows Hermes/Claude to communicate with NotebookLM directly. The agent can search, read, and trigger generations within NotebookLM without requiring human UI clicks.
*   **Dashboard Panels:**
    *   *NotebookLM Panel:* View all notebooks and trigger content creation.
    *   *Studio Panel:* Manage image, video, and voice assets.
    *   *SEO Panel:* Optimizes generated material for Google and AI Search engines.
    *   *Background Board:* Delegates tasks to a team of agents running concurrently.

### Layer 3: The Memory Vault (Obsidian Loop)
*   **Purpose:** Stores specific business context, brand voice, past wins, customer profiles, goals, and history.
*   **Obsidian:** A free local Markdown editor that integrates with Hermes.
*   **The Feedback Loop:**
    1.  New research is captured -> saved to Obsidian.
    2.  Agent reads Obsidian memory -> applies brand voice/story to NotebookLM commands.
    3.  NotebookLM generates content.
    4.  Finished files are saved back to the Obsidian Vault.
    5.  The system gets smarter over time, preventing generic AI fluff and ensuring all output sounds authentic.

---

## 2. The Content Factory Workflows & Tool Pairings

### Workflow 1: Capture & Ingestion (Knowledge Vault)
*   **Goal:** Collect high-quality reference material.
*   **Steps:**
    1.  Collect links, PDFs, case studies, or FAQs.
    2.  Drop them into a specific NotebookLM folder (Notebook).
    3.  The agent registers the new source and updates the workspace.

### Workflow 2: Generation Studio
*   **Tool Pairing:** NotebookLM + Hermes via MCP.
*   **Steps:**
    1.  Access the custom dashboard and select the target Notebook.
    2.  Command Hermes (e.g., *"Make a podcast explaining AI automation"*).
    3.  Hermes triggers NotebookLM's studio generation using the MCP bridge.
    4.  Hermes automatically downloads the generated audio/video files directly to the computer desktop.

### Workflow 3: Video Agent & Hyperframes
*   **Tool Pairing:** Hermes + Hyperframes (GitHub plugin).
*   **Steps:**
    1.  Install the open-source **Hyperframes** skill from GitHub into Hermes.
    2.  Feed the raw script/output generated from NotebookLM into the Hyperframes editor.
    3.  Hermes compiles, edits the video, and overlays a digital talking avatar (like the Julian Goldie avatar) onto the final cut.

### Workflow 4: Automated Background Publishing (Antigravity 2.0)
*   **Tool Pairing:** Gemini 3.5 Flash + Antigravity 2.0.
*   **Steps:**
    1.  Define a schedule for recurring background tasks inside the Antigravity workspace.
    2.  Set up an agent helper to run overnight (e.g., every Monday morning).
    3.  The helper compiles the best prompts, notes, and resources into finished guides and schedules them.
    4.  Gemini 3.5 Flash serves as the rapid-execution brain, completing multi-step tasks at 4x the speed of older models.

---

## 3. Specific Prompts, Macros, & Setup Tips

### Setup Tips
1.  **MCP Setup:** Always install the Model Context Protocol (MCP) server for NotebookLM first to enable direct agent interaction.
2.  **Obsidian Sync:** Make sure your Obsidian vault has a clean folders structure for `Core Brand Info`, `Past Content`, and `Target Audience Profile` so Hermes can easily retrieve contextual clues.
3.  **Nous Portal:** Use the Nous Portal to configure free API models to power Hermes locally without running up high costs.
4.  **UI Layout Adjustment:** You can customize the look of your dashboard by typing direct instructions into Hermes (e.g., *"Make this dashboard cleaner"*).
5.  **Gemini CLI Transition:** Note that Google's Gemini CLI is deprecated as of **June 18, 2026**, and replaced by the new command tool for **Antigravity**. Update scripts accordingly.

### Prompt Templates Mentioned

*   **Content Generation Prompt:**
    > *"Make me a podcast that explains how AI automation helps a business get more customers and save hundreds of hours."*

*   **Video Repurposing Prompt:**
    > *"Now, turn that into a short video and add my avatar."*

*   **Lead Generation Video Prompt:**
    > *"Create a short video explaining the three biggest benefits of joining the AI Profit Boardroom."*

*   **App Development Prompt (AI Studio):**
    > *"Build me a small app that shows AI Profit Boardroom members the next coaching call and lets them tap to set a reminder."*
