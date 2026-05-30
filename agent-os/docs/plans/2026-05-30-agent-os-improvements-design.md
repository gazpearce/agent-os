# Design Document: Agent OS Improvements
**Date:** 2026-05-30
**Status:** Approved

This document details the architecture and design changes to resolve critical bugs and implement missing systems in the **Agent OS** codebase.

---

## 1. Architectural Changes

### 1.1 Obsidian Vault Path Correction
* **Path:** `D:/Agent OS` (root of workspace contains `.obsidian` and notes).
* **Fix:** Update all references of `D:/Obsidian` to `D:/Agent OS` inside `server.mjs`.

### 1.2 Memory Search Compatibility
* **Endpoint:** `GET /api/memory-search`
* **Output structure:**
  ```json
  {
    "results": [
      {
        "source": "CONTEXT.md",
        "file": "CONTEXT.md",
        "line": 42,
        "text": "Matching line",
        "snippet": "Matching line"
      }
    ]
  }
  ```
  Returns duplicate fields to support both frontend (`file`/`snippet`) and backend logs (`source`/`text`).

### 1.3 Web Search Proxy Format
* **Endpoint:** `POST /api/proxy`
* **Fix:** Check content-type of response. If not JSON, return `{ raw: text }` instead of sending plain text, satisfying frontend expectations for DDG HTML scraping.

### 1.4 Obsidian Notes Metadata
* **Endpoint:** `GET /api/vault`
* **Fix:** Call `fs.statSync` to fetch `sizeBytes` and `mtime` for all listed files.

### 1.5 Model Configuration Sync
* **Fix:** Parse `config.yaml` to extract the `default` model and assign it to `model` inside `chatCompletion` in `server.mjs`.

### 1.6 Active Agent Message Routing
* **Fix:** Add `agent: activeAgent` to the `/api/chat` POST request payload in the frontend (`App.tsx`), allowing the backend to route queries to the selected agent instead of defaulting to Hermes.

---

## 2. New Systems

### 2.1 Todo Persistence
* **Storage:** `D:\Agent OS\shared\todo-list.json`
* **Endpoints:**
  * `GET /api/todos`: Returns list of todos. Falls back to default list if missing.
  * `POST /api/todos`: Saves the full todo list to JSON.
* **Frontend:** Refactor `TodoPanel` to synchronize state with the server.

### 2.2 Cron Scheduler & Persistence
* **Storage:** `D:\Agent OS\shared\cron-jobs.json`
* **Endpoints:**
  * `GET /api/crons`: Returns list of scheduled jobs.
  * `POST /api/crons`: Updates status/intervals and saves them.
* **Scheduler:** Node.js background runner utilizing `setInterval` matching definitions in `cron-jobs.json`.

---

## 3. UI/UX Enhancements

### 3.1 Playwright Preview Viewport
* **Frontend:** Add `screenshotUrl` state to `BrowserPanel`.
* **Rendering:** Display the screenshot under browser actions.
