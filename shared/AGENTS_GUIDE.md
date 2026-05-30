# Agent OS — Swarm Team Collaboration & Self-Learning Protocol

Welcome to the **Agent OS V2** Swarm Team. All agents in this workspace (Antigravity, Hermes, OpenClaw, Obsidian) must follow these operational guidelines to collaborate, solve goals, and dynamically learn from one another.

---

## 1. Team Composition & Roles

| Agent | Layer | Emoji | Core Responsibility | Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Antigravity (AGY)** | L1 | 🧠 | CEO · Orchestrator · Deep Planner | Planning, multi-agent delegation, code synthesis, deep reasoning |
| **OpenClaw** | L2 | 🔀 | Routing Gateway · Messaging Hub | Message routing, channel configuration, cron scheduling, plugin loader |
| **Hermes** | L3 | ⚡ | Research · Executor · Terminal | File operations, shell commands, web search, browser automation, image gen |
| **Obsidian** | L4 | 📝 | Memory · Knowledge Graph · Vault | Persistent shared vault, index tracking, markdown note storage |
| **Ollama** | L6 | 🦙 | Local Inference Engine | Local LLM inference (`hermes3:8b`, `gemma4:e4b`) |

---

## 2. Inter-Agent Communication Rules

1. **Keep the Loop Moving**: If an agent hits a blocker, they must immediately query a peer.
   * *Example*: If Hermes gets a compiler warning it doesn't understand, it should POST to `/api/agents/message` to ask AGY: `"Here is the compiler output: [output]. Can you provide a refactoring plan?"`
2. **Shared State Workspace**: All operations on the project must happen in `D:/Agent OS/shared` or the target repository (`C:/Users/Gary/uni-blog`, etc.). Always write drafts, lists, and logs to the shared folders so other agents can inspect them.
3. **Task Hand-Offs**: When handing off a task:
   * Write the output/status to a file in `D:/Agent OS/shared/` or update the Kanban Board.
   * Notify the target agent via the messaging API with the filepath.

---

## 3. The Self-Learning Loop (How We Teach Each Other)

To become a self-learning machine system, every agent must actively participate in knowledge extraction and retrieval:

### Step 1: Pre-Execution Scan
* Before running any command or generating code, search `D:/Agent OS/shared/error_vault/` and `D:/Agent OS/shared/knowledge_base/` for relevant keywords.
* *Rule*: If a past fix exists, you **must** use it. Do not attempt to re-invent solutions.

### Step 2: Logging Failures (The Error Vault)
* If a command, script, or API call fails and you find the fix, write a short report to `D:/Agent OS/shared/error_vault/{error-type}.md`.
* Include:
  * The exact error message.
  * Why it happened.
  * The precise command or code change that fixed it.

### Step 3: Knowledge Consolidation (The Knowledge Base)
* Write guides to `D:/Agent OS/shared/knowledge_base/{topic}.md` for successful setups.
* *Example topics*: `VitePress-schema-injection.md`, `playwright-session-retention.md`, `openrouter-key-failover.md`.

---

## 4. Active Project Rules (CCTV & Home Security SEO)
* **Word Count**: 1000–3000 words. No thin stubs.
* **Format**: Include frontmatter, JSON-LD Schema (Article + FAQPage), heading hierarchies, and custom comparison tables.
* **Cross-Linking**: Target 3-5 similarity-based related pillar links instead of bulk all-to-all matching.
* **EEAT**: Gary Pearce (UK Installer) branding.
## 5. Swarm Memory & Dynamic Rules (Auto-Learned)

### 💡 [Error Fix] Error: prompt_toolkit Win32 NoConsoleScreenBufferError

## Root Cause
The `prompt_toolkit` library requires a real Win32 console screen buffer. Running the agent in background shells or output redirection streams deprives it of this buffer, causing the Win32 API to fail.

## Solution
Instead of invoking the CLI directly in the background process, launch it in a new visible shell window using PowerShell or Python subprocess.

### Example Python Fix (from `run_hermes_goal.py`):
```python
import subprocess

---

### 💡 [Knowledge Setup] VitePress Schema & OG Meta Tag Injection via transformHead

## Context
When building VitePress blogs, you must inject structured schema markup (JSON-LD) and Open Graph (OG) tags dynamically for search engine and AI-overview crawl optimization. Doing this in templates can lead to static or duplicate tags.

## Implementation Details
Use the VitePress `transformHead` hook in `.vitepress/config.mjs` (or `.config.ts`) to read the page frontmatter and generate page-specific metadata.

### Configuration Example
```javascript
export default defineConfig({
  srcDir: 'blog',
  transformHead: ({ pageData }) => {
    const head = [];
    const { title, description, category, slug, image } = pageData.frontmatter;
    const url = `https://uni-blog.vercel.app/posts/${category}/${slug}`;

    // 1. Ingest OG Tags
    head.push(['meta', { property: 'og:title', content: title }]);
    head.push(['meta', { property: 'og:description', content: description }]);
    if (image) {
      head.push(['meta', { property: 'og:image', content: image }]);
    }
    head.push(['meta', { property: 'og:type', content: 'article' }]);
    head.push(['meta', { property: 'og:url', content: url }]);

    // 2. Inject Article JSON-LD
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": title,
      "description": description,
      "image": image || "https://uni-blog.vercel.app/og-default.jpg",
      "author": {
        "@type": "Person",
        "name": "Gary Pearce"
      }
    };
    head.push(['script', { type: 'application/ld+json' }, JSON.stringify(articleSchema)]);

    // 3. Inject Breadcrumbs JSON-LD
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://uni-blog.vercel.app" },
        { "@type": "ListItem", "position": 2, "name": category, "item": `https://uni-blog.vercel.app/${category}` },
        { "@type": "ListItem", "position": 3, "name": title, "item": url }
      ]
    };
    head.push(['script', { type: 'application/ld+json' }, JSON.stringify(breadcrumbSchema)]);

    return head;
  }
});
```

## Critical Fixes
* **Double URL bug**: Avoid prefixing `/posts/` twice when assembling URLs (e.g., `posts/${category}/posts/${slug}`). Check `srcDir` mapping.
* **Quote escaping in frontmatter**: When frontmatter `description` contains colons, wrap it in double quotes in YAML to prevent parsing failures.

---