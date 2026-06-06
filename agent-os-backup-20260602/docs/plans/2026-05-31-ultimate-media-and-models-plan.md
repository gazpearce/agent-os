# Ultimate Media Engine & Free Model Panel Integration Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement a keyless, free text-to-video generator using Pollinations AI, and integrate DeepSeek R1 and Qwen 2.5 Coder free models in the Agent OS dashboard.

**Architecture:** We will add `/api/generate-video` in `server.mjs` returning Pollinations video link, refactor the frontend `ImageGenPanel` to a split-tab `MediaEnginePanel` supporting image/video generations, and add new model entries in the `MODELS` list.

**Tech Stack:** Node.js, Express, React, TypeScript, Tailwind CSS V4

---

### Task 1: Backend Video Generator API

**Files:**
- Modify: `D:/Agent OS/agent-os/server.mjs:2034-2035`
- Create: `C:/Users/Gary/.gemini/antigravity-cli/brain/66e4840c-27be-4c58-96b3-7ac8ad88a68d/scratch/test-video-api.js`

**Step 1: Create verification script**
Write `test-video-api.js`:
```javascript
import http from 'http';

const data = JSON.stringify({ prompt: 'cinematic drone shot of home security cameras' });
const req = http.request('http://localhost:3001/api/generate-video', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      console.log('Response:', parsed);
      if (parsed.videoUrl && parsed.videoUrl.includes('video.pollinations.ai')) {
        console.log('SUCCESS: Video generation endpoint returned valid Pollinations URL');
        process.exit(0);
      } else {
        console.error('FAILURE: Unexpected response structure:', body);
        process.exit(1);
      }
    } catch (e) {
      console.error('FAILURE: Invalid JSON response:', body);
      process.exit(1);
    }
  });
});
req.on('error', (e) => {
  console.error('Connection error:', e.message);
  process.exit(1);
});
req.write(data);
req.end();
```

**Step 2: Run verification script to check failure**
Run: `node "C:/Users/Gary/.gemini/antigravity-cli/brain/66e4840c-27be-4c58-96b3-7ac8ad88a68d/scratch/test-video-api.js"`
Expected: Connection error or 404 since endpoint does not exist.

**Step 3: Implement endpoint in server.mjs**
Add right after `/api/generate-image` endpoint (around line 2034):
```javascript
// VIDEO GEN
app.post('/api/generate-video', (req, res) => {
  const p = req.body.prompt;
  if (!p) return res.status(400).json({ error: 'Prompt required' });
  res.json({ videoUrl: `https://video.pollinations.ai/prompt/${encodeURIComponent(p)}?width=512&height=512&nologo=true` });
});
```

**Step 4: Run verification script to confirm pass**
Start backend and run the test script.
Expected: SUCCESS log.

**Step 5: Commit changes**
```bash
git add agent-os/server.mjs
git commit -m "feat: add backend free video generation endpoint"
```

---

### Task 2: Update Models Registry

**Files:**
- Modify: `D:/Agent OS/agent-os/src/App.tsx:120-130`

**Step 1: Check existing MODELS registry**
Inspect the `MODELS` constant array in `src/App.tsx`.

**Step 2: Insert new model definitions**
Add DeepSeek R1 and Qwen 2.5 Coder free models:
```typescript
  { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Reasoning)", ctx: "128K", type: "reasoning", selected: false },
  { id: "qwen/qwen-2.5-coder-32b-instruct:free", name: "Qwen 2.5 Coder 32B", ctx: "128K", type: "coding", selected: false },
```

**Step 3: Commit**
```bash
git add agent-os/src/App.tsx
git commit -m "feat: integrate DeepSeek R1 and Qwen 2.5 Coder free models in models panel"
```

---

### Task 3: Refactor Image Generator to Media Engine Panel

**Files:**
- Modify: `D:/Agent OS/agent-os/src/App.tsx:250-320`

**Step 1: Replace ImageGenPanel with MediaEnginePanel**
Change the React component to support sub-tabs for Image and Video, displaying a custom HTML5 `<video>` player when a video is generated.

Complete code:
```tsx
function MediaEnginePanel() {
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const [prompt, setPrompt] = useState('');
  const [imgUrl, setImgUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [genProvider, setGenProvider] = useState('pollinations');
  const [genLoading, setGenLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() || genLoading) return;
    setGenLoading(true);
    if (activeTab === 'image') {
      setImgUrl('');
      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, provider: genProvider }),
        });
        const data = await res.json();
        if (data.imageUrl) setImgUrl(data.imageUrl);
      } catch (e) { console.error(e); }
      finally { setGenLoading(false); }
    } else {
      setVideoUrl('');
      try {
        const res = await fetch('/api/generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        if (data.videoUrl) setVideoUrl(data.videoUrl);
      } catch (e) { console.error(e); }
      finally { setGenLoading(false); }
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center justify-between border-b border-white/[0.04] pb-2">
        <span className="flex items-center gap-1.5"><Sparkles size={10} className="text-pink-400" /> Media Engine</span>
        <div className="flex bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.05]">
          <button onClick={() => { setActiveTab('image'); setPrompt(''); }} className={`px-2 py-0.5 rounded text-[8px] transition-colors cursor-pointer ${activeTab === 'image' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>Image</button>
          <button onClick={() => { setActiveTab('video'); setPrompt(''); }} className={`px-2 py-0.5 rounded text-[8px] transition-colors cursor-pointer ${activeTab === 'video' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>Video</button>
        </div>
      </div>

      <div className="space-y-2">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={activeTab === 'image' ? "Describe image (e.g. neon security camera)..." : "Describe short video clip..."}
          className="w-full h-16 bg-white/[0.02] border border-white/[0.06] rounded-xl p-2 text-[10px] focus:outline-none focus:border-indigo-500/50 resize-none text-white"
        />

        {activeTab === 'image' && (
          <div className="flex gap-1.5 items-center select-none">
            <span className="text-[8px] text-gray-500">Provider:</span>
            {['pollinations', 'gemini'].map(p => (
              <button key={p} onClick={() => setGenProvider(p)} className={`text-[8px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${genProvider === p ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' : 'text-gray-500 border-white/[0.03] hover:text-gray-300'}`}>
                {p}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={genLoading || !prompt.trim()}
          className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[10px] shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {genLoading ? (
            <span className="animate-spin text-white">⚙️</span>
          ) : (
            activeTab === 'image' ? 'Generate Image' : 'Generate Video'
          )}
        </button>

        {activeTab === 'image' && imgUrl && (
          <div className="mt-2 group relative rounded-xl overflow-hidden border border-white/[0.06] bg-black/20">
            <img src={imgUrl} className="w-full object-cover" alt="Gen preview" />
            <a href={imgUrl} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 px-2.5 py-1 rounded bg-black/60 backdrop-blur border border-white/[0.08] text-[9px] text-gray-300 hover:text-white select-none transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1">
              <Download size={8} /> Download
            </a>
          </div>
        )}

        {activeTab === 'video' && videoUrl && (
          <div className="mt-2 group relative rounded-xl overflow-hidden border border-white/[0.06] bg-black/20">
            <video src={videoUrl} controls autoPlay loop className="w-full" />
            <a href={videoUrl} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 px-2.5 py-1 rounded bg-black/60 backdrop-blur border border-white/[0.08] text-[9px] text-gray-300 hover:text-white select-none transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1">
              <Download size={8} /> Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
```

Ensure the sidebar renders `<MediaEnginePanel />` instead of `<ImageGenPanel />` around line 2315.

**Step 2: Run build to verify correct imports/types**
Run: `npm run build`
Expected: SUCCESS.

**Step 3: Commit**
```bash
git add agent-os/src/App.tsx
git commit -m "feat: replace ImageGenPanel with split-tab MediaEnginePanel supporting video generation"
```

---

### Task 4: Integration Verification

**Files:**
- Test: Full end-to-end user browser verify

**Step 1: Start backend & dev server**
Run: `node server.mjs` and `npm run dev`

**Step 2: Load dashboard**
Navigate to `http://localhost:3000`. Test:
- Switching model to DeepSeek R1.
- Generating an image under Image Gen tab.
- Generating a video under Video Gen tab and playing it.

**Step 3: Update task.md**
Mark all tasks complete.
