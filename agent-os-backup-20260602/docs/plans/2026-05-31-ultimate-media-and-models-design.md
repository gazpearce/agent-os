# Design: Ultimate Media Engine & Free Model Panel Integration

This document outlines the design for upgrading the Agent OS dashboard with a free video generator (via Pollinations AI) and integrating top-tier free models (DeepSeek R1 and Qwen 2.5 Coder) in the active models selection lists.

## 1. Objectives
- Equip the dashboard with a keyless, 100% free Video Generator widget in the sidebar.
- Integrate the high-performance `deepseek/deepseek-r1:free` and `qwen/qwen-2.5-coder-32b-instruct:free` models into the frontend select list and backend failover pools.
- Provide a premium styled media layout (HTML5 video player, download triggers, aspect-ratio controls).

## 2. Backend Upgrades (`server.mjs`)
- Add a new POST endpoint `/api/generate-video`:
  ```javascript
  app.post('/api/generate-video', (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });
    const videoUrl = `https://video.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`;
    res.json({ videoUrl });
  });
  ```
- Update OpenRouter failover chains to try `deepseek/deepseek-r1:free` and `qwen/qwen-2.5-coder-32b-instruct:free` during API failure recoveries.

## 3. Frontend Upgrades (`src/App.tsx`)
### A. Refactor `ImageGenPanel` to `MediaEnginePanel`
- Rename and structure the widget to support tabs: `🎨 Image Gen` and `🎥 Video Gen`.
- **Video Generator Panel UI**:
  - Prompt text area.
  - "Generate Clip" action button with a smooth rotating gradient loading state.
  - Video display container wrapping a premium styled `<video>` HTML5 player:
    ```tsx
    <video 
      src={videoUrl} 
      controls 
      autoPlay 
      loop 
      className="w-full rounded-xl border border-white/[0.08] shadow-lg bg-black"
    />
    ```
  - Clickable download link button.

### B. Expand Models Registry (`MODELS` list)
Add the following entries to the `MODELS` constant array in `src/App.tsx`:
```typescript
  { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Reasoning)", ctx: "128K", type: "reasoning", selected: false },
  { id: "qwen/qwen-2.5-coder-32b-instruct:free", name: "Qwen 2.5 Coder 32B", ctx: "128K", type: "coding", selected: false },
```

## 4. Verification & Testing
- Compile check using `npm run build`.
- Verify backend API responsiveness.
- Run text-to-video request and verify playback matches the returned Pollinations media stream.
