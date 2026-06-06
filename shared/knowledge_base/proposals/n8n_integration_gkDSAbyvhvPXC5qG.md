## 📈 Integration Opportunity – “Reddit‑to‑AI Content Pipeline”

The supplied n8n workflow is a **lightweight data‑collector** that:

1. **Runs on a schedule (every 30 min).**  
2. **Queries Reddit** for the target keyword `home security CCTV UK` (limit 5).  
3. **Posts each result** to an internal “ingest” webhook (`/api/webhook/ingest`) with a simple JSON payload (title, body, author, URL, source).

Although the workflow itself is minimal, the pattern — *periodic social‑media scrape → structured payload → AI‑ready ingestion point* — is **exactly the kind of automated knowledge‑feed** that can power the **Agent OS** for:

* **SEO‑focused content ideation** (topic clustering, SERP gap analysis).  
* **Continuous prompt‑generation for a writing‑agent** (e.g., “create a 1500‑word guide on ‘Best CCTV setups for UK homes’”).  
* **Dynamic authority‑building** (auto‑populate Tier‑2/‑3 sites with fresh, Reddit‑derived snippets).  
* **Monitoring brand‑mention signals** (detect emerging questions or complaints about CCTV in the UK).

Below is a **complete integration proposal** that maps this workflow onto the Agent OS stack (CLI + web dashboard) and extends it with additional value‑adding steps.

---  

## 1️⃣ Proposed Feature – “Reddit Insight Collector”

| Goal | Description |
|------|-------------|
| **Automated Reddit mining** | Pull recent Reddit posts/comments matching a set of SEO‑relevant queries (e.g., “cctv uk”, “home security advice”, “starlink installation”). |
| **Canonical JSON schema** | Normalise Reddit data into the Agent‑OS `ContentItem` model (`title`, `body`, `source`, `author`, `url`, `publishedAt`, `tags`). |
| **Enrich & store** | Add NLP‑derived tags, sentiment, and topic clusters; persist in the local vector store (e.g., **Qdrant** or **Pinecone**). |
| **Trigger downstream agents** | – Content‑Idea Generator → Draft writer → Publication Scheduler.<br>– Alerting agent for brand‑reputation spikes. |
| **Dashboard UI** | Real‑time list of harvested Reddit items, filterable by query, sentiment, or tag; “Push to Writer” button. |

---  

## 2️⃣ Architecture Overview  

```
┌─────────────┐      ┌─────────────┐      ┌─────────────────┐
│ n8n Scheduler│──►│ Reddit Node │──►│ HTTP → /ingest  │
└───────┬─────┘      └───────┬─────┘      └───────┬─────────┘
        │                    │                │
        ▼                    ▼                ▼
   (cron 30 min)   (Reddit JSON)   (Agent‑OS Ingest API)
                                         │
      ┌──────────────────────────────────┼───────────────────────┐
      │                                  │                       │
      ▼                                  ▼                       ▼
   Enrichment                     Persist to               Trigger
   (LLM/NLP) –                     Vector DB                Agents
   tag extraction,
   sentiment
```

### Key Components  

| Component | Current state | Required change |
|-----------|----------------|-----------------|
| **n8n workflow** | Simple Reddit → HTTP | Add **Function** node for enrichment (call local LLM via `/api/llm/tag`). |
| **Ingest webhook** (`/api/webhook/ingest`) | Accepts generic JSON | Extend to validate against `ContentItem` schema; store `source: "reddit"`; compute `publishedAt` from Reddit metadata. |
| **Vector store** | Already used for other sources | Index new items (text embeddings) for similarity search by the writer‑agent. |
| **CLI command** | `agent os ingest` supports manual JSON | Add sub‑command `agent os ingest reddit --query "<q>" --limit N` that internally spawns the n8n workflow or directly calls Reddit API (fallback). |
| **Web dashboard** | Shows generic ingest queue | New “Reddit Feed” tab with table view, bulk actions, and a “Create article draft” button that launches the **Content‑Idea Agent** with the selected item. |
| **Prompt template** | Basic “write article about {title}” | New template `reddit_insight_prompt` that injects `title`, `body`, `tags`, and Reddit‑derived Q&A snippets. |

---  

## 3️⃣ Code Changes  

### 3.1 n8n – Add Enrichment Function Node  

```json
{
  "id": "enrich-reddit",
  "name": "Enrich Reddit",
  "type": "n8n-nodes-base.function",
  "typeVersion": 1,
  "position": [330,0],
  "parameters": {
    "functionCode": "const fetch = require('node-fetch');\nconst items = [];\nfor (const item of $json) {\n  const text = `${item.title}\\n${item.selftext || ''}`;\n  // Call local LLM endpoint for tags & sentiment\n  const resp = await fetch('http://localhost:3000/api/llm/enrich', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({ text })\n  });\n  const { tags, sentiment } = await resp.json();\n  items.push({ ...item, tags, sentiment });\n}\nreturn items;"
  }
}
```

Connect **Schedule Trigger → Reddit → Enrich Reddit → HTTP Request**.

### 3.2 Agent‑OS – Extend Ingest API (`src/routes/ingest.ts`)

```ts
// new interface
interface ContentItem {
  title: string;
  body: string;
  source: string;      // e.g. 'reddit'
  author: string;
  url: string;
  publishedAt?: string;
  tags?: string[];
  sentiment?: 'positive'|'negative'|'neutral';
}

// validation (using zod / yup)
const contentSchema = z.object({
  title: z.string(),
  body: z.string(),
  source: z.literal('reddit'),
  author: z.string(),
  url: z.string().url(),
  publishedAt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sentiment: z.enum(['positive','negative','neutral']).optional(),
});

router.post('/webhook/ingest', async (req, res) => {
  const parsed = contentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });
  const item = parsed.data;
  // store in DB
  await db.content.create(item);
  // push to vector store
  await vectorStore.upsert(item.id, embed(item.title + ' ' + item.body));
  // fire event for downstream agents
  eventBus.emit('content:new', item);
  res.json({ ok: true, id: item.id });
});
```

### 3.3 CLI – New Sub‑command (`src/cli/ingest-reddit.ts`)

```ts
program
  .command('ingest:reddit')
  .description('Fetch Reddit posts and ingest them')
  .option('-q, --query <string>', 'Reddit search query', 'home security CCTV UK')
  .option('-l, --limit <number>', 'Number of posts', 5)
  .action(async (opts) => {
    const resp = await axios.post('http://localhost:5678/webhook', {
      // minimal payload to trigger the n8n workflow via its HTTP Trigger node
      query: opts.query,
      limit: opts.limit,
    });
    console.log('Ingest request sent →', resp.data);
  });
```

*(If you expose the n8n workflow via an HTTP trigger, the CLI can call it directly.)*

### 3.4 Dashboard – React component (`src/dashboard/RedditFeed.tsx`)

```tsx
export const RedditFeed = () => {
  const { data, refresh } = useFetch('/api/content?source=reddit');
  const [selected, setSelected] = useState<string[]>([]);

  const createDraft = async () => {
    await axios.post('/api/agents/content-idea', {
      sourceIds: selected,
      promptTemplate: 'reddit_insight_prompt',
    });
    toast.success('Draft generation queued');
  };

  return (
    <Box>
      <Heading>Reddit Insights (home security)</Heading>
      <Table>
        <Thead><Tr><Th>Select</Th><Th>Title</Th><Th>Author</Th><Th>Sentiment</Th></Tr></Thead>
        <Tbody>
          {data?.map(item => (
            <Tr key={item.id}>
              <Td><Checkbox value={item.id} onChange={e=> toggle(e)}/></Td>
              <Td>{item.title}</Td>
              <Td>{item.author}</Td>
              <Td>{item.sentiment ?? '—'}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      <Button onClick={createDraft} disabled={!selected.length}>Create Draft</Button>
      <IconButton aria-label="refresh" icon={<RefreshIcon/>} onClick={refresh}/>
    </Box>
  );
};
```

---  

## 4️⃣ Prompt Template – `reddit_insight_prompt`

```yaml
name: reddit_insight_prompt
description: Generate a SEO‑optimised article based on a Reddit discussion.
variables:
  - title
  - body
  - tags
  - sentiment
template: |
  You are an SEO content specialist for a UK CCTV installation business.
  Using the Reddit post below, write a **1 200‑word, fully‑structured article** that:
  1. Answers the main question(s) expressed in the post.
  2. Incorporates at least three relevant long‑tail keywords (derived from {{tags}}).
  3. Highlights the pros/cons mentioned (use sentiment cues).
  4. Includes a short “Why choose Gary Pearce?” CTA linking to tier‑0 money site (do not expose the URL; use a placeholder for later replacement).

  -----
  **Reddit title:** {{title}}
  **Author:** {{author}} ({{url}})
  **Content:** {{body}}
```

The **Content‑Idea Agent** will receive this template, fill the variables from the stored `ContentItem`, and push the result to the **Writer Agent**.

---  

## 5️⃣ Benefits & KPI Impact  

| Metric | Expected lift |
|--------|---------------|
| **Fresh content ideas per week** | +30 % (automated Reddit scanning). |
| **Time from idea → draft** | ↓ 70 % (one‑click “Create Draft”). |
| **Authority‑building** | New Tier‑2 posts can be auto‑generated from Reddit Q&A, boosting internal linking. |
| **Brand sentiment awareness** | Real‑time alerts when negative sentiment spikes (> 5 % of fetched posts). |
| **Overall organic traffic** | Projected +5 % after 3 months (more topical, user‑question‑focused pages). |

---  

## 6️⃣ Implementation Roadmap (2 weeks)

| Week | Tasks |
|------|-------|
| **1** | Fork the n8n workflow; add Function node for enrichment; expose n8n via an HTTP Trigger. |
| **1‑2**| Implement `/api/webhook/ingest` enhancements, vector‑store upsert, and event‑bus emission. |
| **2** | Add CLI sub‑command; write unit tests for ingest validation. |
| **2** | Build Reddit Feed dashboard component; integrate with existing Agent‑OS UI framework. |
| **2** | Create `reddit_insight_prompt` in the prompt‑library; test with the Writer Agent. |
| **2** | QA – run end‑to‑end ingest → draft generation; monitor logs for rate‑limit errors from Reddit API. |
| **2** | Deploy to staging; collect KPI baseline. |

---  

## 7️⃣ Risks & Mitigations  

| Risk | Mitigation |
|------|------------|
| **Reddit API rate limits** | Cache last `after` token; respect `X‑RateLimit-Remaining`; fall back to 15‑min interval if needed. |
| **Low‑quality content** | Enrichment step adds sentiment & tag filters; only forward posts with ≥ 3 tags and neutral/positive sentiment. |
| **Privacy / GDPR** | All stored items are public Reddit data; no personal identifiers beyond username – mark as public‑source metadata only. |
| **Webhook overload** | Queue incoming items with BullMQ; process at max 20 req/s. |

---  

## 8️⃣ Wrap‑up  

The **Reddit‑to‑AI Dev Ingest** workflow is a **minimal yet powerful pattern**. By extending it with enrichment, robust ingestion, UI hooks, and a dedicated prompt template, we turn a simple 5‑post scraper into a **continuous SEO‑insight engine** for the Agent OS ecosystem.

Implementing the steps above will give our product:

1. **Auto‑generated, hot‑topic article ideas** directly from the community where our customers ask questions.  
2. **Seamless hand‑off** from raw data → LLM‑driven drafting → scheduled publishing on Tier‑1/‑2 sites.  
3. **Better monitoring** of brand perception on Reddit, feeding into reputation‑management agents.

> **Next Action:** Assign a small dev‑ops sprint (2 weeks) to deliver the enriched workflow, webhook upgrades, and UI component. Once live, measure the “ideas per week” KPI and iterate on tag‑extraction quality.  