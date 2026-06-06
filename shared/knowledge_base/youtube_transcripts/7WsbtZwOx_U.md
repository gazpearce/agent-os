# YouTube Video Analysis (7WsbtZwOx_U)
- **URL**: https://www.youtube.com/watch?v=7WsbtZwOx_U
- **Date**: 05/06/2026, 22:47:41

# Agent OS – Developer Report  
**Based on the “Free AI Agents Course” YouTube Transcript (Julian Goldie & team)**  
*Prepared for: Future Portal Agent‑OS Team*  
*Date: 2026‑06‑05*  

---  

## 1. Architecture & Design  

| Layer | Technology | Purpose | Key Observations |
|-------|------------|---------|------------------|
| **Orchestration Engine** | **NA10** (no-code workflow builder) | Core workflow container; triggers, branches, and loops. | Uses “HTTP Request” nodes for API interaction, “Wait” for throttling, and “Batching” for rate‑lifting. |
| **Agent Hub** | Custom **Agent OS** written in Go/Python, exposed via REST endpoints. | Unit of functional autonomy (scraper, writer, video‑gen, scheduler). | Defined as **“agents”** with named “skills”: `Scrape`, `Prompt`, `Generate`, `Stitch`, `Post`. |
| **Model Provider** | **OpenAI GPT‑4/ChatGPT** (or clones), **VOE‑3 / Cling** for media models, **FA (Fou)** as “mobile API wrapper”. | Natural‑language understanding, prompt‑engineering, text generation, video generation. | Models are wrapped behind **service adapters** that normalize inputs/outputs. |
| **Data Layer** | **Google Sheets** (primary) + **PostgreSQL (optional)** | Persistent storage of ideas, captions, video URLs, billing logs. | Sheets exposed as “tables” via **Sheets API**; parsed as CSV for further steps. |
| **Automation Platform** | **Fou API** (photo & video generation) | Decoupled from cost/credit allowances, offers multi‑API selection. | Supports custom API keys, credential rotation, and multiple video models (`Veo3`, `Veo2`, `Cling2`). |
| **Trigger/Trigger‑Broker** | Webhooks + Schedule (cron inside NA10) | Allows “auto‑evolution” – agent updates on new data. | NA10 schedules “auto‑generate ideas” every hour with a dynamic callback. |
| **Monitoring & Logging** | **Slack** & **Webhooks** | Real‑time alerts on cost, errors, or completions. | NA10 can “Send a message” to a channel after each job. |

### Key Design Patterns

| Pattern | Implementation |
|---------|----------------|
| **Modular Agent Composition** | Each agent is a stateless function that receives JSON, returns JSON. |
| **Data‑Driven Control Flow** | Inputs/outputs mapped directly to spreadsheet columns → hard‑wired loops. |
| **Cost‑Aware Orchestration** | Batch nodes plus “Wait” steps to respect API rate limits; cost logger node at workflow end. |
| **Live Browser Control** | Not shown directly, but the “live‑browser” node (from the original Job description) is likely implemented via a headless Chrome driver under the hood. |
| **Key Rotation** | Fou accepts credential headers; NA10 can reference “credential store” for different keys. |

---

## 2. Featured Capabilities

| # | Capability | How It’s Demonstrated | Practical Impact |
|---|-----------|-----------------------|------------------|
| **1** | **AI‑Driven Data Scraping** | Using **NA10** + **Ampify** scraper → pulls leads from Instagram/Facebook/Twitter. | Removes coding overhead, instant list generation. |
| **2** | **Prompt‑to‑Prompt AI** | Generates video prompts (e.g., “bright neon lit cave Yeti”) from scraped data and then feeds that prompt to **VOE‑3**. | Self‑consistent creative workflow. |
| **3** | **Video Generation with Multiple Models** | Chooses among `Veo3`, `Veo2`, `Cling2` via **Fou**; dynamic cost decisions. | Flexible pricing and quality trade‑offs. |
| **4** | **Automated Video Stitching** | Builds a “Long‑Form” video by pulling multiple short clips from Fou and merging via a “Stitch” node or API. | Enables dynamic content length without manual editing. |
| **5** | **Batch Processing & Throttling** | NA10 “Batching” node and “Wait 250 s” loop. | Prevents API throttling, manages quotas. |
| **6** | **Cost Tracking** | NA10 reads usage logs from Fou and displays $X per video. | Real‑time budgeting. |
| **7** | **Integration to Social Platforms** | Posts directly to Instagram/YouTube/TikTok (via downstream nodes). | End‑to‑end publishing pipeline. |
| **8** | **Live Browser Control (implied)** | Optionally controls a browser to scrape dynamic sites. | Handles JavaScript‑heavy content. |
| **9** | **Key Rotation & API Credential Store** | NA10 references a credential store for Fou and model APIs. | Enhance security, avoid single‑point failures. |
| **10** | **Live Chat / Customer Support Agents** *(not shown but present in architecture)* | Agents with "Chat" skill exchanges via UI (Slack/Discord). | Reactive helpdesk. |

---

## 3. Swarm Configurations – Agent Roles & Interactions  

The system can be viewed as a **Swarm** of loosely‑coupled micro‑agents.

| Agent | Skillset | Input Source | Output Destination | Notes |
|-------|----------|--------------|--------------------|-------|
| **ScraperAgent** | Scrape → List of keywords | Website/URL | Google Sheet (`LeadList`) | Uses Ampify via NA10 “HTTP request”. |
| **IdeaGeneratorAgent** | Prompt‑generation (ChatGPT) | LeadList | `IdeaSheet` | Generates video concepts (`Yeti`, `Bigfoot`). |
| **PromptEngineerAgent** | Build video prompt for VOE | IdeaSheet | `PromptSheet` | Dynamic “environment” and “system message”. |
| **VideoGenAgent** | Send prompt to Fou (Veo3/Cling) | PromptSheet | `VideoRequestSheet` | Handles auth key, waits, retrieves URL. |
| **StitchAgent** | Concatenate multiple video URLs | VideoRequestSheet | `FinalVideoURL` | Uses Fou “meg” API or a local stitcher. |
| **PublisherAgent** | Upload to social platform | FinalVideoURL | Social API | Instagram, YouTube, TikTok. |
| **CostLoggerAgent** | Computes usage, billing | Fou logs | Dashboard | Triggers alerts if cost > threshold. |
| **SchedulerAgent** | Triggers IdeaGen at intervals | Cron | IdeaGeneratorAgent | Implements “auto‑evolution”. |
| **KeyManagerAgent** | Rotates credentials across agents | Credential Store | All agents | Supports fail‑over and throttling. |

They communicate via **JSON** over REST and **Google Sheets** as a shared state bus.  

---

## 4. Actionable Suggestions for Our Dashboard

| # | Feature | Why It Adds Value | Implementation Notes |
|---|---------|------------------|---------------------|
| **1** | **Built‑in Cost Dashboard & Auto‑Throttle** | Shows live spend per agent, 24‑hour budget meter, auto‑switch to cheaper model when over threshold. | Extend NA10 to use **Metabase** frontend; hook into all Fulfillment APIs. |
| **2** | **Sampler & Prompt‑Pruner Tool** | Allows the user to “pick” the best prompt from multiple model variations before firing the GPU. | Expose a side‑by‑side UI (like GChat) that pulls from a shared “prompt” sheet. |
| **3** | **Live Browser‑Scraper Wizard** | Drag‑and‑drop UI to set up a headless Chrome scrape, with Selenium‑style selectors. | Implement using Playwright + SAF (scripting API). |
| **4** | **Dynamic Video Stitch Editor** | Visual timeline of clips, auto‑transitions, ripple‑edit, then auto‑upload. | Leverage FFmpeg on a container, expose as a micro‑service & UI widget. |
| **5** | **Key Rotation & Credential Vault (HashiCorp Vault)** | High‑security rotating API keys; per‑user isolation; “swap‑out” during slow‑downs. | Provide a “Key Manager” panel in the dashboard, integrate with NA10’s credential store. |
| **6** | **Model‑Comparison Dashboard** | Compare demo output (text, video, cost) between Vo3, Cling2, etc. | Store sample outputs per model; show cost per second. |
| **7** | **Agents’ Health & Self‑Healing** | Auto‑restart stalled agents, auto‑retry on 429 or 5xx errors. | Busy‑wait -> exponential back‑off logic baked into NA10’s condition node. |
| **8** | **Integration Playbooks** | Pre‑built templates for “SEO‑Video”, “Lead‑Gen‑Email”, “Social‑Post” etc. | Store as JSON schemas; user can import/export via dashboard. |
| **9** | **Cross‑Platform Publishing Manager** | Schedule, edit, auto‑publish to IG, FB, YouTube, TikTok from one place. | Use wrappers around their official APIs; keep API keys in Vault. |
| **10** | **X‑Days Forecast Model** | Predict cost over next week using historic data of sessions & model usage. | Simple Prophet/PYMC model served via FastAPI. |

---

## 5. Quick Reference – NA10 JSON Snippet (Video + Prompt)

```json
{
  "type":"httpRequest",
  "url":"https://fou.workers.dev/api/v1/prompted",
  "authHeader":"Bearer $FouKey",
  "method":"POST",
  "payload":{
     "model":"voe3",
     "prompt":"Generate a 8‑second video of a Yeti in a neon cave with penguins.",
     "api":"voe3",
     "videoId":"$vidId"
  },
  "wait": 250000,
  "responsePath":"$.url",
  "save":"VideoURL"
}
```

---

## 6. Summary & Next Steps  

| # | Item | Action |
|---|------|--------|
| **1** | **Prototype** | Build a minimal NA10 workflow that pulls from Sheets, calls a cheap model (`cling2`), logs to a DynamoDB. |
| **2** | **Credential Vault** | Deploy HashiCorp Vault (or AWS Secrets Manager) for key rotation; expose UI for admins. |
| **3** | **UI Enhancements** | Add “Compare Video Models” tab with side‑by‑side preview + cost overlay. |
| **4** | **Testing** | Run end‑to‑end tests with simulated Instagram/Facebook leads → auto‑publishing. |
| **5** | **Documentation** | Publish API guide (`OpenAPI`) so developers can build their own custom agents. |

**Goal:** Deliver a next‑gen Agent‑OS that can **scrape‑>prompt→video→publish** with cost‑control, key‑rotation, and a visual dashboard that rivals or surpasses the demo’s free‑AI‑powered swarm.

--- 

*Prepared by: Agent‑OS Architect*