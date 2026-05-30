import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Bot, Brain, Cpu, Zap, Clock,
  Sparkles, Image, Video, Eye,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Layers, Radio, Shield, Terminal, Database, Workflow, TerminalSquare, RefreshCw,
  ChevronLeft, ChevronRight, Plus, Trash2, Save, Play, Users, Kanban,
  Network, FileText, X, ExternalLink, Globe, Puzzle, Download, Search, Filter
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

/* ─────────────── DATA TYPES ─────────────── */
interface Agent {
  id: string;
  name: string;
  role: string;
  icon: React.ReactNode;
  status: "online" | "busy" | "offline" | "error";
  version: string;
  layer: string;
  color: string;
  tokens: number;
  tasks: number;
  skills: number;
}

interface ChatMessage {
  agent: string;
  msg: string;
  time: string;
  isError?: boolean;
  tools?: string[];
}

interface SessionInfo {
  id: string;
  fileName: string;
  date: string;
  rawDate: string;
  sizeBytes: number;
}

interface McpServerInfo {
  id: string;
  name: string;
  status: string;
  tools: number;
}

interface VaultFileInfo {
  name: string;
  sizeBytes: number;
  mtime: string;
}

interface TeamAgent {
  slotId: string;
  conversationId: string;
  role: string;
  agentType: string;
  agentName: string;
  status: string;
  conversationType: string;
  model?: string;
}

interface Team {
  id: string;
  user_id: string;
  name: string;
  workspace: string;
  workspace_mode: string;
  lead_agent_id: string;
  agents: string; // JSON string of TeamAgent[]
  created_at: number;
  updated_at: number;
  session_mode: string;
}

interface MailboxLog {
  id: string;
  team_id: string;
  to_agent_id: string;
  from_agent_id: string;
  type: string;
  content: string;
  summary: string | null;
  read: number;
  created_at: number;
  files: string;
}

interface DbTask {
  id: string;
  team_id: string;
  title: string;
  description: string;
  status: string;
  assignee: string;
  priority: "low" | "medium" | "high";
  source: "aionui" | "hermes";
  created_at: number | string;
}

const INITIAL_AGENTS: Agent[] = [
  { id: "agy", name: "Antigravity", role: "Intelligence · CEO", icon: <Brain size={18} />, status: "online", version: "1.0.2", layer: "L1", color: "#6366f1", tokens: 2841, tasks: 12, skills: 15 },
  { id: "openclaw", name: "OpenClaw", role: "Execution · Router", icon: <Workflow size={18} />, status: "offline", version: "2026.5.20", layer: "L2", color: "#10b981", tokens: 19430, tasks: 42, skills: 8 },
  { id: "hermes", name: "Hermes", role: "Research · Executor", icon: <Zap size={18} />, status: "offline", version: "active", layer: "L3", color: "#a855f7", tokens: 142893, tasks: 23, skills: 31 },
  { id: "obsidian", name: "Obsidian", role: "Memory · Vault", icon: <Database size={18} />, status: "online", version: "installed", layer: "L4", color: "#f59e0b", tokens: 0, tasks: 0, skills: 5 },
  { id: "ollama", name: "Ollama", role: "Local · Inference", icon: <Cpu size={18} />, status: "offline", version: "0.24.0", layer: "L6", color: "#22d3ee", tokens: 0, tasks: 0, skills: 4 },
  { id: "lmstudio", name: "LM Studio", role: "Local · UI", icon: <Terminal size={18} />, status: "offline", version: "installed", layer: "L6", color: "#ec4899", tokens: 0, tasks: 0, skills: 3 },
  { id: "openrouter", name: "OpenRouter", role: "Cloud · API", icon: <Radio size={18} />, status: "online", version: "27 models", layer: "Cloud", color: "#8b5cf6", tokens: 89234, tasks: 156, skills: 27 },
];

const MODELS = [
  { id: "openrouter/owl-alpha", name: "Owl Alpha", ctx: "1M", type: "agentic", selected: false },
  { id: "deepseek/deepseek-v4-flash:free", name: "DeepSeek V4 Flash", ctx: "1M", type: "reasoning", selected: false },
  { id: "qwen/qwen3-coder:free", name: "Qwen3 Coder 480B", ctx: "1M", type: "coding", selected: false },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "NVIDIA Nemotron 3 Super", ctx: "1M", type: "agentic", selected: false },
  { id: "moonshotai/kimi-k2.6:free", name: "Kimi K2.6", ctx: "262K", type: "multimodal", selected: false },
  { id: "google/gemma-4-26b-a4b-it:free", name: "Gemma 4 26B A4B", ctx: "262K", type: "vision", selected: false },
  { id: "openai/gpt-oss-120b:free", name: "GPT-OSS 120B", ctx: "131K", type: "agentic", selected: false },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B", ctx: "131K", type: "general", selected: false },
];

const TOKEN_DATA = [
  { time: "02:00", hermes: 1200, openclaw: 800, agy: 400 },
  { time: "06:00", hermes: 800, openclaw: 600, agy: 200 },
  { time: "10:00", hermes: 2400, openclaw: 1800, agy: 900 },
  { time: "14:00", hermes: 4200, openclaw: 3100, agy: 1500 },
  { time: "18:00", hermes: 6800, openclaw: 4500, agy: 2200 },
  { time: "22:00", hermes: 5200, openclaw: 3800, agy: 1800 },
];

const MODEL_USAGE = [
  { name: "Owl Alpha", value: 35, color: "#6366f1" },
  { name: "DeepSeek V4", value: 25, color: "#10b981" },
  { name: "Qwen3 Coder", value: 20, color: "#a855f7" },
  { name: "Llama 3.3", value: 12, color: "#f59e0b" },
  { name: "Other", value: 8, color: "#6b7280" },
];

const CRON_JOBS = [
  { id: "1", name: "OpenRouter Key Rotation", interval: "2 min", status: "running", next: "1m" },
  { id: "2", name: "Blog Content Engine", interval: "hourly", status: "idle", next: "15m" },
  { id: "3", name: "Free Model Scanner", interval: "6 hours", status: "idle", next: "2h" },
  { id: "4", name: "AionUI Health Monitor", interval: "5 min", status: "running", next: "2m" },
];

const PRESET_PROMPTS = [
  { name: "System Health Scan", desc: "Run a full diagnostics audit on workspace processes", prompt: "Run full system diagnostics scan and print active process health metrics." },
  { name: "Model Catalog Scan", desc: "Verify connection status & speed of all model providers", prompt: "Scan model catalog, test endpoint response times, and output a summary table." },
  { name: "Sync Swarm Teams", desc: "Trigger alignment verification across agent layers", prompt: "Initiate swarm alignment: Verify communications across all 7 agent layers." },
  { name: "Audit Vault Index", desc: "Scan Obsidian note list for broken link hierarchies", prompt: "Audit the Obsidian vault index and check for orphaned references or links." }
];

/* ─────────────── HELPER COMPONENT (MARKDOWN RENDERING) ─────────────── */
function parseInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.05] font-mono text-xs text-indigo-300">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function Markdown({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-2 select-text">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          const lang = match ? match[1] : '';
          const code = match ? match[2] : part.slice(3, -3);
          return (
            <div key={i} className="my-2.5 rounded-xl bg-black/45 border border-white/[0.04] overflow-hidden font-mono text-[13px] shadow-inner">
              <div className="flex items-center justify-between px-3.5 py-2 bg-white/[0.02] border-b border-white/[0.04] text-[9px] text-gray-500 uppercase font-sans select-none">
                <span className="font-semibold text-gray-400">{lang || 'code'}</span>
                <button 
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="hover:text-white transition-colors cursor-pointer bg-white/[0.03] hover:bg-white/[0.06] px-2 py-0.5 rounded border border-white/[0.04]"
                >
                  Copy
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto leading-relaxed"><code className="text-[#e2e8f0]">{code}</code></pre>
            </div>
          );
        }
        
        const lines = part.split('\n');
        return (
          <div key={i} className="space-y-1.5">
            {lines.map((line, j) => {
              if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                return (
                  <li key={j} className="ml-4 list-disc pl-1 text-[14.5px] text-[#cbd5e1]">
                    {parseInline(line.trim().slice(2))}
                  </li>
                );
              }
              if (line.trim().startsWith('### ')) {
                return (
                  <h3 key={j} className="text-sm font-bold text-white mt-3 mb-1 select-none">
                    {parseInline(line.trim().slice(4))}
                  </h3>
                );
              }
              if (line.trim().startsWith('## ')) {
                return (
                  <h2 key={j} className="text-base font-bold text-white mt-4 mb-2 border-b border-white/5 pb-1 select-none">
                    {parseInline(line.trim().slice(3))}
                  </h2>
                );
              }
              if (line.trim().match(/^\d+\.\s/)) {
                const match = line.trim().match(/^(\d+)\.\s(.*)/);
                return (
                  <li key={j} className="ml-4 list-decimal pl-1 text-[14.5px] text-[#cbd5e1]">
                    {parseInline(match ? match[2] : line)}
                  </li>
                );
              }
              return (
                <p key={j} className="text-[14.5px] text-[#cbd5e1] leading-relaxed">
                  {parseInline(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────── MAIN APP ─────────────── */
/* ─────────── IMAGE GENERATION PANEL ─────────── */
function ImageGenPanel() {
  const [prompt, setPrompt] = useState('');
  const [imgUrl, setImgUrl] = useState('');
  const [genProvider, setGenProvider] = useState('pollinations');
  const [genLoading, setGenLoading] = useState(false);
  const gen = async () => {
    if (!prompt.trim() || genLoading) return;
    setGenLoading(true);
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
  };
  return (
    <div className="space-y-2">
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
        <Image size={10} className="text-pink-400" /> Image Generation
      </div>
      <div className="flex gap-1.5">
        {['pollinations', 'gemini'].map(p => (
          <button key={p} onClick={() => setGenProvider(p)} className={`text-[8px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${genProvider === p ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' : 'text-gray-500 border-white/[0.03] hover:text-gray-300'}`}>
            {p}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && gen()} placeholder="Describe image..." className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/30" />
        <button onClick={gen} disabled={genLoading} className="px-3 py-1.5 rounded-lg bg-pink-600/80 hover:bg-pink-500 text-white text-[10px] font-medium disabled:opacity-50 cursor-pointer whitespace-nowrap">
          {genLoading ? '⏳' : '🎨 Gen'}
        </button>
      </div>
      {imgUrl && (
        <div className="rounded-xl overflow-hidden border border-white/[0.05] bg-black/30">
          {imgUrl.startsWith('data:') || imgUrl.startsWith('http') ? (
            <img src={imgUrl} alt="Generated" className="w-full h-auto max-h-48 object-contain" />
          ) : (
            <div className="p-3 text-[10px] text-gray-400">{imgUrl}</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────── BROWSER CONTROL PANEL ─────────── */
function BrowserPanel() {
  const [url, setUrl] = useState('');
  const [browserLog, setBrowserLog] = useState<string[]>([]);
  const browse = async (action: string) => {
    try {
      const res = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, url }),
      });
      const data = await res.json();
      setBrowserLog(prev => [...prev.slice(-4), `${action}: ${data.message || data.success || 'ok'}`]);
    } catch (e) {
      setBrowserLog(prev => [...prev.slice(-4), `Error: ${e}`]);
    }
  };
  return (
    <div className="space-y-2">
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
        <Globe size={10} className="text-cyan-400" /> Browser Control
      </div>
      <div className="flex gap-1.5">
        <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && browse('open')} placeholder="https://..." className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/30 font-mono" />
        <button onClick={() => browse('open')} className="px-2.5 py-1.5 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-white text-[10px] font-medium cursor-pointer">Open</button>
      </div>
      <div className="flex gap-1">
        {['screenshot', 'back', 'forward', 'refresh'].map(a => (
          <button key={a} onClick={() => browse(a)} className="text-[8px] px-2 py-1 rounded border border-white/[0.04] text-gray-500 hover:text-gray-300 hover:bg-white/[0.02] cursor-pointer capitalize">{a}</button>
        ))}
      </div>
      {browserLog.length > 0 && (
        <div className="bg-black/30 rounded-lg p-2 text-[9px] text-gray-500 font-mono space-y-0.5 max-h-16 overflow-y-auto">
          {browserLog.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  );
}

/* ─────────── GITHUB PANEL ─────────── */
function GitHubPanel() {
  const [repos, setRepos] = useState<any[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [ghStatus, setGhStatus] = useState('');
  const fetchRepos = async () => {
    setReposLoading(true);
    try { const res = await fetch('/api/github?action=repos'); if (res.ok) setRepos(await res.json()); } catch (_) {}
    finally { setReposLoading(false); }
  };
  const checkStatus = async () => {
    try { const res = await fetch('/api/github?action=status'); if (res.ok) setGhStatus((await res.json()).configured ? 'Connected' : 'Not configured'); } catch (_) {}
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
        <span className="flex items-center gap-1.5"><span className="text-white">⚡</span> GitHub</span>
        <div className="flex gap-1">
          <button onClick={checkStatus} className="text-[8px] text-gray-500 hover:text-gray-300 cursor-pointer">Status</button>
          <button onClick={fetchRepos} disabled={reposLoading} className="text-[8px] text-gray-500 hover:text-gray-300 cursor-pointer">Repos</button>
        </div>
      </div>
      {ghStatus && <div className="text-[9px] text-green-400">{ghStatus}</div>}
      <div className="space-y-1 max-h-24 overflow-y-auto">
        {repos.map(r => (
          <div key={r.id} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/[0.015] text-[10px]">
            <span className="text-white flex-1 truncate">{r.name}</span>
            <span className="text-yellow-400 text-[8px]">⭐{r.stars}</span>
          </div>
        ))}
        {repos.length === 0 && !reposLoading && <div className="text-[9px] text-gray-600 text-center py-1">Click Repos to load</div>}
      </div>
    </div>
  );
}

/* ─────────── N8N PANEL ─────────── */
function N8NPanel() {
  const [wfId, setWfId] = useState('');
  const [n8nStatus, setN8nStatus] = useState('');
  const trigger = async () => {
    if (!wfId.trim()) return;
    try {
      const res = await fetch('/api/n8n/trigger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflowId: wfId }) });
      const data = await res.json();
      setN8nStatus(data.success ? 'Triggered!' : data.error || 'Failed');
    } catch (e) { setN8nStatus(String(e)); }
  };
  return (
    <div className="space-y-2">
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
        <Workflow size={10} className="text-orange-400" /> n8n Workflows
      </div>
      <div className="flex gap-1.5">
        <input value={wfId} onChange={e => setWfId(e.target.value)} placeholder="Workflow ID..." className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/30 font-mono" />
        <button onClick={trigger} className="px-2.5 py-1.5 rounded-lg bg-orange-600/80 hover:bg-orange-500 text-white text-[10px] font-medium cursor-pointer">Run</button>
      </div>
      {n8nStatus && <div className="text-[9px] text-gray-400">{n8nStatus}</div>}
    </div>
  );
}

/* ─────────── TTS PANEL ─────────── */
function TTSPanel() {
  const [text, setText] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [ttsLoading, setTtsLoading] = useState(false);
  const speak = async () => {
    if (!text.trim() || ttsLoading) return;
    setTtsLoading(true);
    try {
      const res = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      const data = await res.json();
      if (data.audioUrl) {
        setAudioUrl(data.audioUrl);
        // Auto-play
        try { new Audio(data.audioUrl).play(); } catch (_) {}
      }
    } catch (e) { console.error(e); }
    finally { setTtsLoading(false); }
  };
  return (
    <div className="space-y-2">
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
        <span className="text-green-400">🔊</span> Text to Speech
      </div>
      <div className="flex gap-1.5">
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && speak()} placeholder="Type text to speak..." className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-green-500/30" />
        <button onClick={speak} disabled={ttsLoading} className="px-2.5 py-1.5 rounded-lg bg-green-600/80 hover:bg-green-500 text-white text-[10px] font-medium disabled:opacity-50 cursor-pointer">
          {ttsLoading ? '⏳' : '🔊 Speak'}
        </button>
      </div>
      {audioUrl && <audio controls src={audioUrl} className="w-full h-8 opacity-70" />}
    </div>
  );
}

/* ─────────── CODE EXECUTION PANEL ─────────── */
function CodePanel() {
  const [code, setCode] = useState('print("Hello from Agent OS")');
  const [lang, setLang] = useState('python');
  const [output, setOutput] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const run = async () => {
    if (!code.trim() || codeLoading) return;
    setCodeLoading(true);
    setOutput('');
    try {
      const res = await fetch('/api/run-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, language: lang }) });
      const data = await res.json();
      setOutput(data.output || data.error || 'No output');
    } catch (e) { setOutput(String(e)); }
    finally { setCodeLoading(false); }
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
        <span className="flex items-center gap-1.5"><TerminalSquare size={10} className="text-yellow-400" /> Code Execution</span>
        <div className="flex gap-1">
          {['python', 'javascript'].map(l => (
            <button key={l} onClick={() => setLang(l)} className={`text-[8px] px-1.5 py-0.5 rounded border cursor-pointer ${lang === l ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : 'text-gray-500 border-white/[0.03]'}`}>{l}</button>
          ))}
        </div>
      </div>
      <textarea value={code} onChange={e => setCode(e.target.value)} rows={3} className="w-full bg-black/30 border border-white/[0.05] rounded-lg px-2.5 py-1.5 text-[10px] text-green-300 font-mono placeholder-gray-600 focus:outline-none focus:border-yellow-500/30 resize-none" />
      <button onClick={run} disabled={codeLoading} className="w-full px-2.5 py-1.5 rounded-lg bg-yellow-600/80 hover:bg-yellow-500 text-white text-[10px] font-medium disabled:opacity-50 cursor-pointer">
        {codeLoading ? 'Running...' : '▶ Run Code'}
      </button>
      {output && (
        <div className="bg-black/40 rounded-lg p-2 text-[9px] text-gray-300 font-mono max-h-24 overflow-y-auto whitespace-pre-wrap border border-white/[0.03]">{output}</div>
      )}
    </div>
  );
}

/* ─────────── MEMORY SEARCH PANEL ─────────── */
function MemoryPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const search = async () => {
    if (!query.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/memory-search?q=${encodeURIComponent(query)}`);
      if (res.ok) { const data = await res.json(); setResults(data.results || []); }
    } catch (_) {}
    finally { setSearchLoading(false); }
  };
  return (
    <div className="space-y-2">
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
        <Database size={10} className="text-blue-400" /> Memory Search (Obsidian)
      </div>
      <div className="flex gap-1.5">
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Search vault..." className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/30" />
        <button onClick={search} disabled={searchLoading} className="px-2.5 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-white text-[10px] font-medium disabled:opacity-50 cursor-pointer">
          {searchLoading ? '⏳' : '🔍'}
        </button>
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {results.map((r, i) => (
          <div key={i} className="px-2.5 py-1.5 rounded-lg bg-white/[0.015] border border-white/[0.02] text-[10px]">
            <div className="text-indigo-300 font-semibold truncate">{r.file}</div>
            <div className="text-gray-500 truncate">{r.snippet}</div>
          </div>
        ))}
        {results.length === 0 && query && !searchLoading && <div className="text-[9px] text-gray-600 text-center py-1">No results</div>}
      </div>
    </div>
  );
}

/* ─────────── WEB SEARCH PANEL ─────────── */
function WebSearchPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const search = async () => {
    if (!query.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, method: 'GET' }) });
      const data = await res.json();
      // Parse basic results from HTML
      const html = data.raw || '';
      const results: any[] = [];
      const regex = /<a rel="nofollow" class="result__a" href="([^"]+)">([^<]+)<\/a>/g;
      let match;
      while ((match = regex.exec(html)) !== null && results.length < 10) {
        results.push({ url: match[1], title: match[2] });
      }
      setResults(results);
    } catch (e) { console.error(e); }
    finally { setSearchLoading(false); }
  };
  return (
    <div className="space-y-2">
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
        <Globe size={10} className="text-blue-400" /> Web Search
      </div>
      <div className="flex gap-1.5">
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Search the web..." className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/30" />
        <button onClick={search} disabled={searchLoading} className="px-2.5 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-white text-[10px] font-medium disabled:opacity-50 cursor-pointer">
          {searchLoading ? '⏳' : '🔍'}
        </button>
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {results.map((r, i) => (
          <a key={i} href={r.url} target="_blank" rel="noopener" className="block px-2.5 py-1.5 rounded-lg bg-white/[0.015] border border-white/[0.02] text-[10px] hover:bg-white/[0.03]">
            <div className="text-blue-300 font-semibold truncate">{r.title}</div>
            <div className="text-gray-600 truncate text-[8px]">{r.url}</div>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─────────── VISION PANEL ─────────── */
function VisionPanel() {
  const [imgUrl, setImgUrl] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const analyze = async () => {
    if (!imgUrl.trim()) return;
    setAnalyzing(true);
    setAnalysis('');
    try {
      const OR_KEYS = ['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'];
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OR_KEYS[0]}`, 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'Agent OS' },
        body: JSON.stringify({ model: 'google/gemma-4-26b-a4b-it:free', messages: [{ role: 'user', content: [{ type: 'text', text: 'Describe this image in detail.' }, { type: 'image_url', image_url: { url: imgUrl } }] }], max_tokens: 512 }),
      });
      const data = await res.json();
      setAnalysis(data.choices?.[0]?.message?.content || 'No analysis available');
    } catch (e) { setAnalysis(String(e)); }
    finally { setAnalyzing(false); }
  };
  return (
    <div className="space-y-2">
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
        <Eye size={10} className="text-purple-400" /> Vision Analysis
      </div>
      <div className="flex gap-1.5">
        <input value={imgUrl} onChange={e => setImgUrl(e.target.value)} placeholder="Image URL..." className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/30 font-mono" />
        <button onClick={analyze} disabled={analyzing} className="px-2.5 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white text-[10px] font-medium disabled:opacity-50 cursor-pointer">
          {analyzing ? '⏳' : '👁'}
        </button>
      </div>
      {analysis && <div className="bg-black/40 rounded-lg p-2 text-[9px] text-gray-300 max-h-24 overflow-y-auto whitespace-pre-wrap border border-white/[0.03]">{analysis}</div>}
    </div>
  );
}

/* ─────────── CRON MANAGEMENT PANEL ─────────── */
function CronManagementPanel() {
  const [crons, setCrons] = useState(CRON_JOBS);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newInterval, setNewInterval] = useState('');
  const addCron = () => {
    if (!newName.trim()) return;
    setCrons(prev => [...prev, { id: `c-${Date.now()}`, name: newName, interval: newInterval || 'manual', status: 'idle', next: 'not scheduled' }]);
    setNewName('');
    setNewInterval('');
    setShowAdd(false);
  };
  const toggleCron = (id: string) => {
    setCrons(prev => prev.map(c => c.id === id ? { ...c, status: c.status === 'running' ? 'idle' : 'running', next: c.status === 'idle' ? 'pending' : '-' } : c));
  };
  const deleteCron = (id: string) => { setCrons(prev => prev.filter(c => c.id !== id)); };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
        <span className="flex items-center gap-1.5"><Clock size={10} className="text-orange-400" /> Cron Jobs</span>
        <button onClick={() => setShowAdd(!showAdd)} className="text-[8px] text-gray-500 hover:text-white cursor-pointer">{showAdd ? 'Cancel' : '+ Add'}</button>
      </div>
      {showAdd && (
        <div className="space-y-1.5 p-2 rounded-lg bg-black/30 border border-white/[0.04]">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Job name..." className="w-full bg-white/[0.03] border border-white/[0.05] rounded px-2 py-1 text-[10px] text-white placeholder-gray-600 focus:outline-none" />
          <input value={newInterval} onChange={e => setNewInterval(e.target.value)} placeholder="Interval (e.g. 5 min, hourly)..." className="w-full bg-white/[0.03] border border-white/[0.05] rounded px-2 py-1 text-[10px] text-white placeholder-gray-600 focus:outline-none" />
          <button onClick={addCron} className="w-full py-1 rounded bg-orange-600/80 text-white text-[9px] font-medium cursor-pointer">Add Job</button>
        </div>
      )}
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {crons.map(c => (
          <div key={c.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.015] border border-white/[0.02] text-[10px]">
            <div className="flex-1 min-w-0">
              <div className="text-gray-300 truncate font-medium">{c.name}</div>
              <div className="text-gray-600 text-[8px]">{c.interval} · {c.next}</div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => toggleCron(c.id)} className={`text-[8px] px-1.5 py-0.5 rounded cursor-pointer ${c.status === 'running' ? 'bg-green-500/20 text-green-400' : 'bg-white/[0.03] text-gray-500'}`}>
                {c.status === 'running' ? '⏸ Stop' : '▶ Run'}
              </button>
              <button onClick={() => deleteCron(c.id)} className="text-[8px] px-1 py-0.5 text-red-400 hover:text-red-300 cursor-pointer">✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────── TODO PANEL ─────────── */
function TodoPanel() {
  const [todos, setTodos] = useState([
    { id: '1', text: 'Deploy Agent OS to production', done: false, priority: 'high' },
    { id: '2', text: 'Connect Spotify integration', done: false, priority: 'medium' },
    { id: '3', text: 'Set up Discord bot webhook', done: true, priority: 'low' },
  ]);
  const [newTodo, setNewTodo] = useState('');
  const addTodo = () => {
    if (!newTodo.trim()) return;
    setTodos(prev => [...prev, { id: `t-${Date.now()}`, text: newTodo, done: false, priority: 'medium' }]);
    setNewTodo('');
  };
  const toggleTodo = (id: string) => { setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t)); };
  const deleteTodo = (id: string) => { setTodos(prev => prev.filter(t => t.id !== id)); };
  const priorityColor: Record<string, string> = { high: 'text-red-400', medium: 'text-yellow-400', low: 'text-gray-400' };
  return (
    <div className="space-y-2">
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
        <CheckCircle2 size={10} className="text-green-400" /> Todo List
      </div>
      <div className="flex gap-1.5">
        <input value={newTodo} onChange={e => setNewTodo(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTodo()} placeholder="New todo..." className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-green-500/30" />
        <button onClick={addTodo} className="px-2.5 py-1.5 rounded-lg bg-green-600/80 hover:bg-green-500 text-white text-[10px] font-medium cursor-pointer">+</button>
      </div>
      <div className="space-y-1 max-h-36 overflow-y-auto">
        {todos.map(t => (
          <div key={t.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] ${t.done ? 'bg-white/[0.01] border-white/[0.02] opacity-50' : 'bg-white/[0.015] border-white/[0.03]'}`}>
            <button onClick={() => toggleTodo(t.id)} className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 cursor-pointer ${t.done ? 'bg-green-500/30 border-green-500/50 text-green-400' : 'border-white/10'}`}>
              {t.done && '✓'}
            </button>
            <span className={`flex-1 truncate ${t.done ? 'line-through text-gray-500' : 'text-gray-300'}`}>{t.text}</span>
            <span className={`text-[7px] uppercase font-bold ${priorityColor[t.priority]}`}>{t.priority}</span>
            <button onClick={() => deleteTodo(t.id)} className="text-gray-600 hover:text-red-400 cursor-pointer text-[10px]">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────── SETTINGS PANEL ─────────── */
function SettingsPanel() {
  const [config, setConfig] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState('');
  const loadConfig = async () => {
    setLoading(true);
    try { const res = await fetch('/api/config'); if (res.ok) setConfig((await res.json()).content || ''); } catch (_) {}
    finally { setLoading(false); }
  };
  const saveConfig = async () => {
    try {
      await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: config }) });
      setSaved('Saved!');
      setTimeout(() => setSaved(''), 2000);
    } catch (_) { setSaved('Error saving'); }
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
        <span>⚙️ Config.yaml</span>
        <div className="flex gap-1">
          <button onClick={loadConfig} disabled={loading} className="text-[8px] text-gray-500 hover:text-gray-300 cursor-pointer">{loading ? '...' : 'Load'}</button>
          {config && <button onClick={saveConfig} className="text-[8px] text-green-500 hover:text-green-300 cursor-pointer">Save</button>}
          {saved && <span className="text-[8px] text-green-400">{saved}</span>}
        </div>
      </div>
      {config ? (
        <textarea value={config} onChange={e => setConfig(e.target.value)} rows={10} className="w-full bg-black/40 border border-white/[0.05] rounded-lg px-2.5 py-1.5 text-[9px] text-gray-300 font-mono focus:outline-none focus:border-white/10 resize-none" />
      ) : (
        <div className="text-center py-3 text-[9px] text-gray-600">Click Load to view/edit config.yaml</div>
      )}
    </div>
  );
}

/* ─────────── PERSONALITY SWITCHER ─────────── */
function PersonalityPanel() {
  const [active, setActive] = useState('helpful');
  const personalities = [
    { id: 'helpful', name: 'Helpful', emoji: '😊', desc: 'Default helpful assistant' },
    { id: 'concise', name: 'Concise', emoji: '⚡', desc: 'Brief and to the point' },
    { id: 'creative', name: 'Creative', emoji: '🎨', desc: 'Think outside the box' },
    { id: 'hype', name: 'Hype', emoji: '🔥', desc: 'YOOO LETS GOOO!!!' },
    { id: 'catgirl', name: 'Catgirl', emoji: '🐱', desc: 'Nya~! Anime catgirl mode' },
    { id: 'kawaii', name: 'Kawaii', emoji: '⭐', desc: 'Cute and adorable desu~' },
    { id: 'noir', name: 'Noir', emoji: '🕵️', desc: 'Detective in the shadows' },
    { id: 'pirate', name: 'Pirate', emoji: '🏴‍☠️', desc: 'Arrr! Captain Hermes' },
    { id: 'shakespeare', name: 'Shakespeare', emoji: '🎭', desc: 'Hark! Bardic prose' },
    { id: 'philosopher', name: 'Philosopher', emoji: '🧠', desc: 'Seek deeper truths' },
  ];
  const apply = async (id: string) => {
    setActive(id);
    try {
      await fetch('/api/personality', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personality: id }) });
    } catch (_) {}
  };
  return (
    <div className="space-y-2">
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
        <span className="text-yellow-400">🎭</span> AI Personality
      </div>
      <div className="grid grid-cols-2 gap-1">
        {personalities.map(p => (
          <button key={p.id} onClick={() => apply(p.id)} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[9px] cursor-pointer transition-all ${active === p.id ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300' : 'bg-white/[0.015] border-white/[0.02] text-gray-400 hover:bg-white/[0.03]'}`}>
            <span>{p.emoji}</span>
            <span className="font-semibold">{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────── AGENT TELEMETRY / MONITOR ─────────── */
function AgentTelemetryPanel({ agents }: { agents: any[] }) {
  const [status, setStatus] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try { const res = await fetch('/api/status'); if (res.ok) setStatus(await res.json()); } catch (_) {}
    finally { setRefreshing(false); }
  };
  useEffect(() => { refresh(); const i = setInterval(refresh, 10000); return () => clearInterval(i); }, []);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
        <span className="flex items-center gap-1.5"><Activity size={10} className="text-cyan-400" /> Agent Telemetry</span>
        <button onClick={refresh} disabled={refreshing} className="text-[8px] text-gray-500 hover:text-gray-300 cursor-pointer">{refreshing ? '...' : 'Refresh'}</button>
      </div>
      <div className="space-y-1">
        {agents.map(a => {
          const s = status[a.id] || a.status;
          return (
            <div key={a.id} className="flex items-center justify-between px-2 py-1 rounded-lg bg-white/[0.015] border border-white/[0.02] text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${s === 'online' ? 'bg-green-500' : 'bg-gray-500'}`} />
                <span className="text-gray-300">{a.name}</span>
              </div>
              <span className={`text-[8px] uppercase ${s === 'online' ? 'text-green-400' : 'text-gray-500'}`}>{s}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── PROVIDER SWITCHER ─────────── */
function ProviderPanel() {
  const [activeProvider, setActiveProvider] = useState('deepseek/deepseek-v4-flash:free');
  const providers = [
    { id: 'openrouter/owl-alpha', name: 'Owl Alpha', ctx: '1M', free: false },
    { id: 'deepseek/deepseek-v4-flash:free', name: 'DeepSeek V4', ctx: '1M', free: true },
    { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder', ctx: '1M', free: true },
    { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super', ctx: '1M', free: true },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B', ctx: '131K', free: true },
    { id: 'google/gemma-4-26b-a4b-it:free', name: 'Gemma 4 26B', ctx: '262K', free: true },
    { id: 'openai/gpt-oss-120b:free', name: 'GPT-OSS 120B', ctx: '131K', free: true },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', ctx: '1M', free: false },
    { id: 'grok-3', name: 'Grok 3', ctx: '1M', free: false },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', ctx: '200K', free: false },
  ];
  const switchProvider = async (p: any) => {
    setActiveProvider(p.id);
    try {
      await fetch('/api/set-provider', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modelId: p.id }) });
      await fetch('/api/select-model', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modelId: p.id }) });
    } catch (_) {}
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
        <span className="flex items-center gap-1.5"><Layers size={10} className="text-indigo-400" /> Model Providers</span>
        <span className="text-[7px] text-gray-600">{providers.filter(p => p.free).length} free</span>
      </div>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {providers.map(p => (
          <button key={p.id} onClick={() => switchProvider(p)} className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[10px] cursor-pointer transition-all ${activeProvider === p.id ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-white/[0.015] border-white/[0.02] text-gray-400 hover:bg-white/[0.03]'}`}>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{p.name}</span>
              {p.free && <span className="text-[7px] px-1 py-0.5 rounded bg-green-500/10 text-green-400">FREE</span>}
            </div>
            <span className="text-[8px] text-gray-500 font-mono">{p.ctx}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────── AIONUI TEAMS PANEL ─────────── */
function AionUITeamsPanel() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const loadTeams = async () => {
    setLoading(true);
    try { const res = await fetch('/api/teams'); if (res.ok) setTeams(await res.json()); } catch (_) {}
    finally { setLoading(false); }
  };
  useEffect(() => { loadTeams(); }, []);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
        <span className="flex items-center gap-1.5"><Users size={10} className="text-purple-400" /> AionUI Teams</span>
        <button onClick={loadTeams} disabled={loading} className="text-[8px] text-gray-500 hover:text-gray-300 cursor-pointer">{loading ? '...' : '↻'}</button>
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {teams.map(t => (
          <div key={t.id} className="px-2.5 py-1.5 rounded-lg bg-white/[0.015] border border-white/[0.02] text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold">{t.name}</span>
              <span className={`text-[7px] uppercase px-1 py-0.5 rounded ${t.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>{t.status}</span>
            </div>
            <div className="text-gray-500 text-[8px] mt-0.5">Lead: {t.lead} · {t.agents} agents · {t.workspace}</div>
          </div>
        ))}
        {teams.length === 0 && <div className="text-center py-2 text-[9px] text-gray-600">No teams loaded</div>}
      </div>
    </div>
  );
}

/* ─────────── DELEGATION PANEL ─────────── */
function DelegationPanel() {
  const [subAgents, setSubAgents] = useState<any[]>([]);
  const [spawnName, setSpawnName] = useState('');
  const [spawnTask, setSpawnTask] = useState('');
  const spawn = async () => {
    if (!spawnName.trim() || !spawnTask.trim()) return;
    const id = `sub-${Date.now()}`;
    setSubAgents(prev => [...prev, { id, name: spawnName, task: spawnTask, status: 'spawning' }]);
    setSpawnName('');
    setSpawnTask('');
    try {
      await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `Spawn sub-agent "${spawnName}" to: ${spawnTask}` }) });
      setSubAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'running' } : a));
    } catch (_) {
      setSubAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'error' } : a));
    }
  };
  return (
    <div className="space-y-2">
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
        <span className="text-orange-400">🤖</span> Delegation
      </div>
      <div className="space-y-1">
        <input value={spawnName} onChange={e => setSpawnName(e.target.value)} placeholder="Agent name..." className="w-full bg-white/[0.03] border border-white/[0.05] rounded px-2 py-1 text-[10px] text-white placeholder-gray-600 focus:outline-none" />
        <div className="flex gap-1">
          <input value={spawnTask} onChange={e => setSpawnTask(e.target.value)} placeholder="Task..." className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded px-2 py-1 text-[10px] text-white placeholder-gray-600 focus:outline-none" />
          <button onClick={spawn} className="px-2 py-1 rounded bg-orange-600/80 text-white text-[9px] font-medium cursor-pointer">Spawn</button>
        </div>
      </div>
      {subAgents.length > 0 && (
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {subAgents.map(a => (
            <div key={a.id} className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.015] text-[9px]">
              <span className="text-gray-300 truncate flex-1">{a.name}</span>
              <span className={`text-[7px] uppercase ${a.status === 'running' ? 'text-green-400' : a.status === 'spawning' ? 'text-yellow-400' : 'text-red-400'}`}>{a.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────── SPOTIFY / MUSIC PANEL ─────────── */
function SpotifyPanel() {
  const [track, setTrack] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const togglePlay = () => { setIsPlaying(!isPlaying); if (!isPlaying) setTrack('Now Playing'); };
  return (
    <div className="space-y-2">
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
        <span className="text-green-400">🎵</span> Spotify
      </div>
      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.015] border border-white/[0.02]">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm ${isPlaying ? 'bg-green-600 animate-pulse' : 'bg-gray-700'}`}>🎵</div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-white font-medium truncate">{track || 'Not playing'}</div>
          <div className="text-[8px] text-gray-500">Local control</div>
        </div>
        <button onClick={togglePlay} className="w-7 h-7 rounded-full bg-green-600/80 hover:bg-green-500 flex items-center justify-center text-white cursor-pointer text-xs">
          {isPlaying ? '⏸' : '▶'}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [activeAgent, setActiveAgent] = useState("hermes");
  const [centerTab, setCenterTab] = useState<"chat" | "terminal" | "monitor" | "kanban">("chat");
  const [rightTab, setRightTab] = useState<"sessions" | "models" | "skills" | "mcp-catalog" | "vault">("models");
  
  // Collapsed Sidebar States
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { agent: "agy", msg: "Agent OS v2.5.0 — Chat now routes through OpenRouter directly. Fast responses. Model switching enabled.", time: "System Boot" }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (!chatLoading) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % 4);
    }, 1500);
    return () => clearInterval(interval);
  }, [chatLoading]);

  const loadingMessages = [
    "Connecting to OpenRouter API...",
    "Sending query to model...",
    "Waiting for response stream...",
    "Processing & formatting output..."
  ];
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Collapsed tools execution log indexing
  const [expandedToolsIndex, setExpandedToolsIndex] = useState<number | null>(null);

  // Terminal state
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<{ type: 'input' | 'output' | 'error'; text: string }[]>([
    { type: 'output', text: "Agent OS [Version 2.4.0]\n(c) 2026 Nous Research & Antigravity. All rights reserved.\nType 'help' for standard options." }
  ]);
  const [terminalLoading, setTerminalLoading] = useState(false);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Sessions state
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // System Status & Model selection
  const [activeModel, setActiveModel] = useState("deepseek/deepseek-v4-flash:free");
  const [switchingModelId, setSwitchingModelId] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Skills & MCP list states
  const [activeSkills, setActiveSkills] = useState<string[]>([]);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [skillsDir, setSkillsDir] = useState<any[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [mcpList, setMcpList] = useState<McpServerInfo[]>([]);
  const [mcpLoading, setMcpLoading] = useState(false);

  // MCP Catalog state
  const [mcpCatalog, setMcpCatalog] = useState<any>(null);
  const [mcpCatalogLoading, setMcpCatalogLoading] = useState(false);
  const [mcpCatalogSearch, setMcpCatalogSearch] = useState("");
  const [mcpCatalogCategory, setMcpCatalogCategory] = useState<string>("all");
  const [mcpInstallStatus, setMcpInstallStatus] = useState<Record<string, "idle" | "installing" | "installed" | "error">>({});

  // Obsidian Vault state
  const [vaultFiles, setVaultFiles] = useState<VaultFileInfo[]>([]);
  const [activeVaultFile, setActiveVaultFile] = useState<{ name: string; content: string } | null>(null);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [isVaultEditorOpen, setIsVaultEditorOpen] = useState(false);
  const [newNoteName, setNewNoteName] = useState("");
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  // Real database states
  const [teams, setTeams] = useState<Team[]>([]);
  const [mailbox, setMailbox] = useState<MailboxLog[]>([]);
  const [dbTasks, setDbTasks] = useState<{ aionui: DbTask[]; hermes: DbTask[] }>({ aionui: [], hermes: [] });
  const [kanbanSourceFilter, setKanbanSourceFilter] = useState<"all" | "aionui" | "hermes">("all");
  const [addTaskSource, setAddTaskSource] = useState<"aionui" | "hermes">("hermes");
  const [dbTasksLoading, setDbTasksLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [mailboxLoading, setMailboxLoading] = useState(false);

  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDesc, setNewCardDesc] = useState("");
  const [newCardPriority, setNewCardPriority] = useState<"low" | "medium" | "high">("medium");
  const [newCardAssignee, setNewCardAssignee] = useState("Hermes");
  const [isAddingCard, setIsAddingCard] = useState(false);

  const fetchDbTasks = async () => {
    setDbTasksLoading(true);
    try {
      const res = await fetch("/api/db-tasks");
      if (res.ok) {
        const data = await res.json();
        setDbTasks(data || { aionui: [], hermes: [] });
      }
    } catch (e) {
      console.error("Failed to fetch database tasks:", e);
    } finally {
      setDbTasksLoading(false);
    }
  };

  const fetchTeams = async () => {
    setTeamsLoading(true);
    try {
      const res = await fetch("/api/teams");
      if (res.ok) {
        const data = await res.json();
        setTeams(data || []);
      }
    } catch (e) {
      console.error("Failed to fetch teams:", e);
    } finally {
      setTeamsLoading(false);
    }
  };

  const fetchMailbox = async () => {
    setMailboxLoading(true);
    try {
      const res = await fetch("/api/mailbox");
      if (res.ok) {
        const data = await res.json();
        setMailbox(data || []);
      }
    } catch (e) {
      console.error("Failed to fetch mailbox logs:", e);
    } finally {
      setMailboxLoading(false);
    }
  };

  // Poll system status
  const fetchStatus = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data = await res.json();
        setAgents(prev => prev.map(agent => {
          if (data[agent.id] !== undefined) {
            return { ...agent, status: data[agent.id] };
          }
          return agent;
        }));
        if (data.activeModel) {
          setActiveModel(data.activeModel);
        }
      }
    } catch (e) {
      console.error("Failed to fetch system status:", e);
    } finally {
      setLastRefreshed(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Fetch past sessions list
  const fetchSessionsList = async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (e) {
      console.error("Failed to fetch sessions list:", e);
    } finally {
      setSessionsLoading(false);
    }
  };

  // Fetch Hermes active/available skills
  const fetchSkills = async () => {
    setSkillsLoading(true);
    try {
      const res = await fetch("/api/skills");
      if (res.ok) {
        const data = await res.json();
        setActiveSkills(data.active || []);
        setAvailableSkills(data.available || []);
        // Also load the full skills directory
        fetchSkillsDir();
      }
    } catch (e) {
      console.error("Failed to fetch skills:", e);
    } finally {
      setSkillsLoading(false);
    }
  };

  // Fetch Hermes skills directory
  const fetchSkillsDir = async () => {
    try {
      const res = await fetch('/api/skills-dir');
      if (res.ok) {
        const data = await res.json();
        setSkillsDir(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch skills directory:', e);
    }
  };

  // Fetch MCP server configuration status
  const fetchMcpList = async () => {
    setMcpLoading(true);
    try {
      const res = await fetch("/api/mcp-list");
      if (res.ok) {
        const data = await res.json();
        setMcpList(data || []);
      }
    } catch (e) {
      console.error("Failed to fetch MCP list:", e);
    } finally {
      setMcpLoading(false);
    }
  };

  // Fetch MCP Catalog (all available servers)
  const fetchMcpCatalog = async () => {
    setMcpCatalogLoading(true);
    try {
      const res = await fetch("/api/mcp-catalog");
      if (res.ok) {
        const data = await res.json();
        setMcpCatalog(data);
      }
    } catch (e) {
      console.error("Failed to fetch MCP catalog:", e);
    } finally {
      setMcpCatalogLoading(false);
    }
  };

  // Filtered catalog servers
  const getFilteredCatalogServers = () => {
    if (!mcpCatalog?.categories) return [];
    let servers: any[] = [];
    mcpCatalog.categories.forEach((cat: any) => {
      if (mcpCatalogCategory === "all" || cat.name === mcpCatalogCategory) {
        servers = servers.concat(cat.servers.map((s: any) => ({ ...s, category: cat.name, categoryIcon: cat.icon })));
      }
    });
    if (mcpCatalogSearch.trim()) {
      const q = mcpCatalogSearch.toLowerCase();
      servers = servers.filter(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
    }
    return servers;
  };

  // Fetch Obsidian vault file index
  const fetchVaultFiles = async () => {
    setVaultLoading(true);
    try {
      const res = await fetch("/api/vault");
      if (res.ok) {
        const data = await res.json();
        setVaultFiles(data || []);
      }
    } catch (e) {
      console.error("Failed to fetch vault files:", e);
    } finally {
      setVaultLoading(false);
    }
  };

  // Initialize data on mount
  useEffect(() => {
    fetchStatus();
    fetchSessionsList();
    fetchSkills();
    fetchMcpList();
    fetchMcpCatalog();
    fetchVaultFiles();
    fetchDbTasks();
    fetchTeams();
    fetchMailbox();
    const interval = setInterval(() => {
      fetchStatus();
      fetchDbTasks();
      fetchMailbox();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat and terminal panels
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLogs]);

  // Send message to Hermes CLI API
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim() || chatLoading) return;
    
    setChatMessages(prev => [...prev, { agent: "user", msg: textToSend, time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) }]);
    if (!customText) setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: textToSend, model: activeModel })
      });
      if (res.ok) {
        // Add a blank message from the agent to stream text into
        setChatMessages(prev => [...prev, {
          agent: activeAgent,
          msg: "",
          time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          tools: []
        }]);

        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }

        const decoder = new TextDecoder();
        let accumulatedResponse = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunkText = decoder.decode(value, { stream: true });
          const lines = chunkText.split('\n');
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const dataText = trimmed.slice(6).trim();
              if (dataText === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataText);
                if (parsed.content) {
                  accumulatedResponse += parsed.content;
                  setChatMessages(prev => {
                    const updated = [...prev];
                    if (updated.length > 0) {
                      const lastIdx = updated.length - 1;
                      updated[lastIdx] = {
                        ...updated[lastIdx],
                        msg: accumulatedResponse
                      };
                    }
                    return updated;
                  });
                }
              } catch (_) {
                // Ignore incomplete JSON chunks
              }
            }
          }
        }

        // Auto-open detected URLs in new tabs if they resemble navigation targets
        const urlRegex = /(https?:\/\/[^\s]+|localhost:\d+[^\s]*)/gi;
        const msgMatch = accumulatedResponse.match(urlRegex) || [];
        if (msgMatch.length > 0) {
          const url = msgMatch[0];
          const href = (url || '').startsWith('http') ? (url || '') : 'http://' + (url || '');
          window.open(href || 'https://google.com', '_blank');
        }

        // Refresh mailbox logs to capture any real agent exchanges
        fetchMailbox();
      } else {
        throw new Error("HTTP error: " + res.status);
      }
    } catch (e: any) {
      setChatMessages(prev => [...prev, {
        agent: activeAgent,
        msg: `Failed to talk to ${activeAgent}: ${e.message}. Ensure the CLI gateway is online.`,
        time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        isError: true
      }]);
    } finally {
      setChatLoading(false);
      fetchSessionsList(); // Refresh session list after a query
    }
  };

  // Toggle toolsets in Hermes config.yaml
  const handleToggleSkill = async (skill: string) => {
    const isCurrentlyActive = activeSkills.includes(skill);
    const updated = isCurrentlyActive
      ? activeSkills.filter(s => s !== skill)
      : [...activeSkills, skill];
    
    // Optimistic update
    setActiveSkills(updated);

    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolsets: updated })
      });
      if (!res.ok) {
        throw new Error("Failed to update skills in configuration.");
      }
      // Add feedback message in chat
      setChatMessages(prev => [...prev, {
        agent: "system",
        msg: `Successfully ${isCurrentlyActive ? "disabled" : "enabled"} skill: **${skill}** in config.yaml.`,
        time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      }]);
    } catch (e) {
      console.error("Failed to toggle skill:", e);
      // Revert if error
      fetchSkills();
    }
  };

  // Load selected Obsidian note
  const handleLoadVaultFile = async (name: string) => {
    setVaultLoading(true);
    try {
      const res = await fetch(`/api/vault?file=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        setActiveVaultFile(data);
        setIsVaultEditorOpen(true);
      }
    } catch (e) {
      console.error("Failed to load vault note:", e);
    } finally {
      setVaultLoading(false);
    }
  };

  // Save changes to Obsidian note
  const handleSaveVaultFile = async () => {
    if (!activeVaultFile) return;
    setVaultLoading(true);
    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: activeVaultFile.name, content: activeVaultFile.content })
      });
      if (res.ok) {
        setIsVaultEditorOpen(false);
        setActiveVaultFile(null);
        fetchVaultFiles();
        setChatMessages(prev => [...prev, {
          agent: "system",
          msg: `Successfully saved updates to note: **${activeVaultFile.name}** in Obsidian vault.`,
          time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
        }]);
      }
    } catch (e) {
      console.error("Failed to save vault file:", e);
    } finally {
      setVaultLoading(false);
    }
  };

  // Create new Obsidian note
  const handleCreateNote = async () => {
    if (!newNoteName.trim()) return;
    const name = newNoteName.trim().endsWith(".md") ? newNoteName.trim() : `${newNoteName.trim()}.md`;
    setVaultLoading(true);
    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: name, content: `# ${newNoteName.trim()}\n\nStart typing note contents here...` })
      });
      if (res.ok) {
        setNewNoteName("");
        setIsCreatingNote(false);
        fetchVaultFiles();
        handleLoadVaultFile(name);
      }
    } catch (e) {
      console.error("Failed to create note:", e);
    } finally {
      setVaultLoading(false);
    }
  };

  // Execute terminal command
  const handleRunCommand = async () => {
    if (!terminalInput.trim() || terminalLoading) return;
    const cmd = terminalInput;
    setTerminalLogs(prev => [...prev, { type: 'input', text: `Gary@AGENT-OS:~$ ${cmd}` }]);
    setTerminalInput("");

    if (cmd.trim() === 'clear') {
      setTerminalLogs([]);
      return;
    }
    if (cmd.trim() === 'help') {
      setTerminalLogs(prev => [...prev, { type: 'output', text: "Available commands:\n  - hermes chat -q \"<msg>\" : Send direct Hermes query\n  - node -v / python --version : Print environment runtimes\n  - dir / ls : List current directories\n  - clear : Clear terminal logs\n  - help : Print this list" }]);
      return;
    }

    setTerminalLoading(true);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd })
      });
      if (res.ok) {
        const data = await res.json();
        setTerminalLogs(prev => [...prev, { type: 'output', text: data.output }]);
      } else {
        throw new Error("Execution failed: " + res.statusText);
      }
    } catch (e: any) {
      setTerminalLogs(prev => [...prev, { type: 'error', text: `Error: ${e.message}` }]);
    } finally {
      setTerminalLoading(false);
    }
  };

  // Switch Active Model in config.yaml
  const handleSwitchModel = async (modelId: string) => {
    setSwitchingModelId(modelId);
    try {
      const res = await fetch("/api/select-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setActiveModel(modelId);
          setChatMessages(prev => [...prev, {
            agent: "system",
            msg: `Switched active default agent model to: \`${modelId}\``,
            time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
          }]);
        }
      }
    } catch (e) {
      console.error("Failed to switch model:", e);
    } finally {
      setSwitchingModelId(null);
    }
  };

  // Restores a selected session log
  const handleLoadSession = async (sessionId: string) => {
    setChatLoading(true);
    setActiveSessionId(sessionId);
    try {
      const res = await fetch(`/api/session-detail?id=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((m: any) => ({
          agent: m.role === 'user' ? 'user' : 'hermes',
          msg: m.content,
          time: 'Restored'
        }));
        setChatMessages(mapped.length > 0 ? mapped : [
          { agent: "hermes", msg: "Empty session log context.", time: "System Info" }
        ]);
        setCenterTab("chat");
      }
    } catch (e) {
      console.error("Failed to load session:", e);
      setChatMessages([{
        agent: "system",
        msg: `Failed to restore details for session ${sessionId}.`,
        time: "Error"
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Add card to Kanban board
  const handleAddKanbanCard = async () => {
    if (!newCardTitle.trim()) return;
    const taskId = crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}`;
    const newTask: DbTask = {
      id: taskId,
      team_id: addTaskSource === "aionui" ? "cb0c7074-579d-4762-aae0-c446c786ef58" : "hermes-local-team",
      title: newCardTitle.trim(),
      description: newCardDesc.trim() || "No description provided.",
      status: addTaskSource === "aionui" ? "pending" : "todo",
      assignee: newCardAssignee || (addTaskSource === "hermes" ? "Hermes" : "Unassigned"),
      priority: newCardPriority,
      source: addTaskSource,
      created_at: Date.now()
    };

    // Optimistic state update
    setDbTasks(prev => ({
      ...prev,
      [addTaskSource]: [...(prev[addTaskSource] || []), newTask]
    }));

    // Reset fields
    setNewCardTitle("");
    setNewCardDesc("");
    setNewCardPriority("medium");
    setIsAddingCard(false);

    try {
      const res = await fetch("/api/db-tasks/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: addTaskSource,
          task: {
            id: taskId,
            title: newTask.title,
            description: newTask.description,
            assignee: newTask.assignee,
            priority: newTask.priority
          }
        })
      });
      if (!res.ok) {
        throw new Error("Failed to add task: " + res.statusText);
      }
      fetchDbTasks();
    } catch (e) {
      console.error("Error adding task:", e);
      fetchDbTasks();
    }
  };

  // Shift Kanban card status
  const handleMoveKanbanCard = async (source: "aionui" | "hermes", id: string, nextStatus: "backlog" | "todo" | "in_progress" | "done") => {
    let dbStatus: string = nextStatus;
    if (source === "aionui") {
      const statusMap: Record<string, string> = {
        backlog: "pending",
        todo: "pending",
        in_progress: "running",
        done: "completed"
      };
      dbStatus = statusMap[nextStatus] || nextStatus;
    }

    setDbTasks(prev => ({
      ...prev,
      [source]: prev[source].map(t => t.id === id ? { ...t, status: dbStatus } : t)
    }));

    try {
      const res = await fetch("/api/db-tasks/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, id, status: nextStatus })
      });
      if (!res.ok) {
        throw new Error("Failed to update status");
      }
      fetchDbTasks();
    } catch (e) {
      console.error("Error moving task:", e);
      fetchDbTasks();
    }
  };

  // Remove Kanban card
  const handleDeleteKanbanCard = async (source: "aionui" | "hermes", id: string) => {
    setDbTasks(prev => ({
      ...prev,
      [source]: prev[source].filter(t => t.id !== id)
    }));

    try {
      const res = await fetch("/api/db-tasks/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, id })
      });
      if (!res.ok) {
        throw new Error("Failed to delete task");
      }
      fetchDbTasks();
    } catch (e) {
      console.error("Error deleting task:", e);
      fetchDbTasks();
    }
  };

  const currentAgent = agents.find(a => a.id === activeAgent) || agents[0];

  return (
    <div className="h-screen w-screen flex flex-col bg-[#020208] text-[#e2e8f0] overflow-hidden selection:bg-indigo-500/30 selection:text-white">
      {/* Background grid canvas effect */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e1b4b_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none animate-[pulse_12s_ease-in-out_infinite]" />

      {/* ═══ SYSTEM HEADER ═══ */}
      <header className="glass-strong h-14 flex items-center justify-between px-5 shrink-0 z-50 relative border-b border-white/[0.04] select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_15px_rgba(99,102,241,0.4)] relative">
            <span className="absolute inset-0 rounded-lg bg-white/20 animate-pulse pointer-events-none" />
            🦑
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-1.5">
              Agent OS <span className="text-[10px] text-indigo-400 font-mono font-normal">Mission Control</span>
            </h1>
            <div className="text-[9px] font-mono text-gray-500">v2.4.0 • Swarms & Vault DB Sync</div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 text-[9px] font-mono">
          {["L1 · Intelligence", "L2 · Routing", "L3 · Execution", "L4 · Vault", "L5 · UI", "L6 · Inference", "L7 · Automation"].map((l, i) => (
            <span key={i} className={`px-2.5 py-1 rounded-md border transition-all ${
              i === 2
                ? "bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]"
                : i === 4
                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]"
                : "text-gray-500 border-white/[0.02]"
            }`}>{l}</span>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={fetchStatus}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] rounded-lg px-2.5 py-1 text-[10px] font-mono text-gray-400 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={10} className={isRefreshing ? "animate-spin text-indigo-400" : ""} />
            {isRefreshing ? "Syncing..." : `Synced: ${lastRefreshed || "just now"}`}
          </button>

          {/* Version Selector Pill */}
          <div className="relative">
            <button
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              className="flex items-center gap-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wider font-mono shadow-[0_0_10px_rgba(168,85,247,0.15)] transition-all cursor-pointer select-none"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              v2.4.0
              <ChevronDown size={10} className={`opacity-80 transition-transform ${showVersionHistory ? "rotate-180" : ""}`} />
            </button>

            {showVersionHistory && (
              <>
                <div 
                  className="fixed inset-0 z-[100]" 
                  onClick={() => setShowVersionHistory(false)} 
                />
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/[0.08] bg-[#0c0c16]/95 p-3.5 shadow-2xl backdrop-blur-xl z-[101] text-left">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/[0.05]">
                    <h3 className="text-[10px] font-bold text-white tracking-wider uppercase">Version History</h3>
                    <span className="text-[8px] bg-purple-500/10 border border-purple-500/20 rounded px-1.5 py-0.5 text-purple-400 font-mono">Changelog</span>
                  </div>
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    <div className="border-l-2 border-indigo-500 pl-2 py-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-bold text-indigo-300 font-mono">v2.4.0 (Active)</span>
                        <span className="text-[8px] text-gray-500">Active</span>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">
                        Vault DB Sync, SQLite database queries for Kanban, live telemetry logs, and Obsidian markdown editor.
                      </p>
                    </div>
                    <div className="border-l-2 border-purple-500 pl-2 py-0.5 opacity-60 hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-bold text-purple-300 font-mono">v2.3.0</span>
                        <span className="text-[8px] text-gray-500">Build 9</span>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">
                        Redesigned floating panel interface with gaps, optimized layouts, and collapsible side rails.
                      </p>
                    </div>
                    <div className="border-l-2 border-pink-500 pl-2 py-0.5 opacity-60 hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-bold text-pink-300 font-mono">v2.2.0</span>
                        <span className="text-[8px] text-gray-500">Build 8</span>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">
                        Hermes configuration manager & automatic YAML hot-reloader for system skills.
                      </p>
                    </div>
                    <div className="border-l-2 border-blue-500 pl-2 py-0.5 opacity-60 hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-bold text-blue-300 font-mono">v2.1.0</span>
                        <span className="text-[8px] text-gray-500">Build 5</span>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">
                        Telemetry logging, multi-agent workspace synchronization, and system status checkers.
                      </p>
                    </div>
                    <div className="border-l-2 border-gray-600 pl-2 py-0.5 opacity-40 hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-bold text-gray-400 font-mono">v1.0.0</span>
                        <span className="text-[8px] text-gray-500">Legacy</span>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">
                        Original monolithic layout.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-green-400 text-xs font-semibold">Systems Online</span>
          </div>
        </div>
      </header>

      {/* ═══ CORE LAYOUT ═══ */}
      <div className="flex-1 flex overflow-hidden relative p-3 gap-3 bg-[#03030b]/30">

        {/* ─── LEFT SIDEBAR: SWARMS, PRESETS & AGENT LIST ─── */}
        <aside 
          className={`glass-strong flex flex-col shrink-0 border border-white/[0.05] bg-[#03030d]/85 z-20 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 ${
            isLeftCollapsed ? "w-14" : "w-72"
          }`}
        >
          {/* Header toggle */}
          <div className="h-11 border-b border-white/[0.04] flex items-center justify-between px-3.5 shrink-0 select-none">
            {!isLeftCollapsed && (
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase flex items-center gap-1.5">
                <Users size={12} className="text-indigo-400" /> Swarm Ecosystem
              </span>
            )}
            <button 
              onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
              className="p-1 rounded bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-gray-400 hover:text-white transition-all ml-auto cursor-pointer"
            >
              {isLeftCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>
          </div>

          {/* Expanded left rail contents */}
          {!isLeftCollapsed ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Swarm Node List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-gray-500 text-[9px] font-bold uppercase tracking-widest select-none">
                  <span>Layer Agents</span>
                  <span>{agents.filter(a => a.status === 'online').length}/{agents.length} Online</span>
                </div>
                <div className="space-y-1">
                  {agents.map(agent => {
                    const isActive = activeAgent === agent.id;
                    return (
                      <button
                        key={agent.id}
                        onClick={() => {
                          setActiveAgent(agent.id);
                          if (agent.id === "agy" || agent.id === "hermes" || agent.id === "openclaw") {
                            setCenterTab("chat");
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left border transition-all duration-200 cursor-pointer ${
                          isActive
                            ? "bg-white/[0.04] border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                            : "hover:bg-white/[0.02] border-transparent hover:border-white/[0.03]"
                        }`}
                      >
                        <div className="relative shrink-0">
                          <div className={`w-2.5 h-2.5 rounded-full status-dot status-${agent.status}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white truncate">{agent.name}</span>
                            <span className="text-[7.5px] font-mono px-1 rounded bg-white/[0.03] text-gray-500 border border-white/[0.02]">{agent.layer}</span>
                          </div>
                          <div className="text-[9px] text-gray-500 truncate mt-0.5">{agent.role}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preset Prompts Macros */}
              <div className="space-y-2.5">
                <div className="text-gray-500 text-[9px] font-bold uppercase tracking-widest select-none flex items-center gap-1.5">
                  <Play size={10} className="text-indigo-400" /> Presets Executor
                </div>
                <div className="space-y-2">
                  {PRESET_PROMPTS.map((macro, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(macro.prompt)}
                      className="w-full text-left p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.03] hover:border-white/[0.06] transition-all group cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-indigo-300 group-hover:text-indigo-200 flex items-center gap-1.5">
                        <Sparkles size={10} className="text-indigo-400 group-hover:animate-pulse" />
                        {macro.name}
                      </div>
                      <div className="text-[9.5px] text-gray-500 mt-1 leading-normal select-none">{macro.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* System Active Tasks Monitor */}
              <div className="space-y-2">
                <div className="text-gray-500 text-[9px] font-bold uppercase tracking-widest select-none flex items-center justify-between">
                  <span>System Crons</span>
                  <span className="text-[8px] bg-green-500/10 text-green-400 px-1 rounded">Actively Monitoring</span>
                </div>
                <div className="space-y-1.5">
                  {CRON_JOBS.map(job => (
                    <div key={job.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.01] border border-white/[0.02] text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-1.5 w-1.5 shrink-0">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${job.status === "running" ? "bg-green-400" : "bg-gray-400"}`}></span>
                          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${job.status === "running" ? "bg-green-500" : "bg-gray-500"}`}></span>
                        </span>
                        <span className="text-gray-300 truncate max-w-[130px] font-medium">{job.name}</span>
                      </div>
                      <span className="text-gray-500 font-mono text-[9px]">{job.interval}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Collapsed left rail icon indicators */
            <div className="flex-1 flex flex-col items-center py-4 space-y-4">
              {agents.map(agent => (
                <div key={agent.id} className="relative group cursor-pointer" onClick={() => {
                  setActiveAgent(agent.id);
                  setIsLeftCollapsed(false);
                }}>
                  <div className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-indigo-500/30 flex items-center justify-center text-gray-400 hover:text-white transition-all">
                    {agent.icon}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-[#020208] status-dot status-${agent.status}`} />
                  {/* Tooltip */}
                  <div className="absolute left-12 top-1.5 bg-[#0a0a16] border border-white/[0.08] text-[9.5px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap">
                    {agent.name} ({agent.layer})
                  </div>
                </div>
              ))}
              <div className="w-full border-t border-white/[0.04] my-2" />
              {PRESET_PROMPTS.map((m, i) => (
                <div key={i} className="relative group cursor-pointer" onClick={() => handleSendMessage(m.prompt)}>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 flex items-center justify-center text-indigo-400 hover:text-indigo-300 transition-all">
                    <Play size={13} />
                  </div>
                  <div className="absolute left-12 top-1.5 bg-[#0a0a16] border border-white/[0.08] text-[9.5px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap">
                    Preset: {m.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* ─── CENTER: WORKSPACE (CHAT / KANBAN / MONITOR / TERMINAL) ─── */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#04040c]/45 border border-white/[0.05] rounded-2xl overflow-hidden relative z-10 shadow-xl">
          {/* Workspace Tabs Header */}
          <div className="glass-strong h-12 flex items-center justify-between px-4 shrink-0 border-b border-white/[0.04] bg-[#03030d]/80 select-none">
            <div className="flex items-center gap-2">
              <div style={{ color: currentAgent.color }} className="drop-shadow-[0_0_5px_rgba(255,255,255,0.15)] shrink-0">{currentAgent.icon}</div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">{currentAgent.name} Core</span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/10 shrink-0" />
              <span className="text-[10px] font-mono text-gray-500 hidden sm:inline">{currentAgent.role}</span>
            </div>

            <div className="flex bg-white/[0.03] border border-white/[0.05] rounded-xl p-0.5">
              {[
                { id: "chat", label: "Chat", icon: <Bot size={12} /> },
                { id: "kanban", label: "Kanban", icon: <Kanban size={12} /> },
                { id: "terminal", label: "Terminal", icon: <TerminalSquare size={12} /> },
                { id: "monitor", label: "Telemetry", icon: <Activity size={12} /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCenterTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-200 cursor-pointer ${
                    centerTab === tab.id
                      ? "bg-indigo-600 text-white shadow-[0_0_10px_rgba(79,70,229,0.35)]"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ─── TAB 1: LIVE CONVERSATIONAL CHAT PANE ─── */}
          {centerTab === "chat" && (
            <div className="flex-1 flex flex-col overflow-hidden justify-between">
              {/* Centered Scrollable Conversation */}
              <div className="flex-grow overflow-y-auto p-6 scroll-smooth">
                <div className="max-w-4xl mx-auto w-full space-y-6">
                  <AnimatePresence>
                    {chatMessages.map((msg, i) => {
                      const isUser = msg.agent === "user";
                      const isSystem = msg.agent === "system";
                      const agentMeta = agents.find(a => a.id === msg.agent);
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex gap-3.5 ${isUser ? "justify-end" : ""}`}
                        >
                          {!isUser && !isSystem && (
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-lg select-none"
                              style={{ 
                                backgroundColor: `${agentMeta?.color || "#a855f7"}15`, 
                                borderColor: `${agentMeta?.color || "#a855f7"}30`,
                                color: agentMeta?.color || "#a855f7" 
                              }}
                            >
                              {agentMeta?.icon || <Zap size={16} />}
                            </div>
                          )}
                          {isSystem && (
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-yellow-500/20 bg-yellow-500/10 text-yellow-400 select-none">
                              <Shield size={16} />
                            </div>
                          )}
                          <div 
                            className={`max-w-[75%] rounded-2xl px-5 py-4 break-words backdrop-blur-md shadow-lg ${
                              isUser
                                ? "bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-tr-none border border-indigo-500/30 text-[#f1f5f9] shadow-[0_4px_24px_rgba(99,102,241,0.1)]"
                                : isSystem
                                ? "bg-yellow-500/5 border border-yellow-500/15 rounded-2xl text-[#cbd5e1]"
                                : msg.isError
                                ? "bg-red-500/5 border border-red-500/15 rounded-2xl text-[#cbd5e1]"
                                : "rounded-tl-none text-[#e2e8f0]"
                            }`}
                            style={(!isUser && !isSystem && !msg.isError) ? {
                              backgroundColor: `${agentMeta?.color || "#a855f7"}06`,
                              borderColor: `${agentMeta?.color || "#a855f7"}1d`
                            } : undefined}
                          >
                            {msg.isError && (
                              <div className="flex items-center gap-1.5 text-red-400 font-bold mb-2 text-xs select-none">
                                <AlertTriangle size={12} /> Execution Failure
                              </div>
                            )}
                            
                            {/* Main Content Area */}
                            <Markdown text={msg.msg} />
                            
                            {/* Collapsible Tool Call Steps */}
                            {msg.tools && msg.tools.length > 0 && (
                              <div className="mt-3 pt-2.5 border-t border-white/[0.04] text-[10px] font-mono text-gray-500 space-y-1">
                                <button
                                  onClick={() => setExpandedToolsIndex(expandedToolsIndex === i ? null : i)}
                                  className="font-semibold text-gray-400 flex items-center gap-1 cursor-pointer hover:text-white transition-colors select-none"
                                >
                                  <Terminal size={10} /> 
                                  <span>Invoked toolchain ({msg.tools.length} tasks)</span>
                                  {expandedToolsIndex === i ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                </button>
                                {expandedToolsIndex === i && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }} 
                                    animate={{ height: "auto", opacity: 1 }}
                                    className="pl-2 border-l border-white/[0.06] space-y-1 mt-2 max-h-40 overflow-y-auto select-text"
                                  >
                                    {msg.tools.map((t, idx) => (
                                      <div key={idx} className="text-gray-500">{t}</div>
                                    ))}
                                  </motion.div>
                                )}
                              </div>
                            )}

                            {/* Clickable Actions (e.g. Open Browser links detected in text/tools) */}
                            {(() => {
                              const urlRegex = /(https?:\/\/[^\s]+|localhost:\d+[^\s]*)/gi;
                              const urlsInMsg = msg.msg.match(urlRegex) || [];
                              const urlsInTools = (msg.tools || []).flatMap(t => t.match(urlRegex) || []);
                              const allUrls = Array.from(new Set([...urlsInMsg, ...urlsInTools]));
                              
                              if (allUrls.length === 0) return null;
                              
                              return (
                                <div className="mt-3 pt-2.5 border-t border-white/[0.04] space-y-2">
                                  <div className="text-[9px] text-indigo-400 font-mono font-semibold select-none flex items-center gap-1">
                                    <ExternalLink size={10} /> Detected browser destinations:
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {allUrls.map((url, idx) => {
                                      const href = url.startsWith('http') ? url : `http://${url}`;
                                      return (
                                        <a
                                          key={idx}
                                          href={href}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/30 hover:border-indigo-500/50 text-[10px] font-medium text-indigo-300 hover:text-white transition-all cursor-pointer shadow-[0_0_10px_rgba(99,102,241,0.1)] hover:shadow-[0_0_15px_rgba(99,102,241,0.25)] select-none"
                                        >
                                          <Globe size={10} />
                                          <span>Open {url.replace(/^https?:\/\//i, '')}</span>
                                        </a>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            <div className="text-[9px] text-gray-500 font-mono mt-2.5 text-right select-none">{msg.time}</div>
                          </div>
                          {isUser && (
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-white/[0.08] bg-white/[0.04] text-indigo-300 shadow-md select-none order-last">
                              👤
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                    {chatLoading && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3.5 select-none">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-500/20 text-purple-400 animate-pulse">
                          <Zap size={16} />
                        </div>
                        <div className="glass rounded-2xl rounded-tl-none border-white/[0.04] px-4 py-3 text-xs text-gray-400 flex items-center gap-3">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                          </span>
                          <span>{loadingMessages[loadingStep]}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div ref={chatBottomRef} />
                </div>
              </div>

              {/* Centered Floating Input Container */}
              <div className="p-5 border-t border-white/[0.04] bg-[#03030d]/50 select-none">
                <div className="max-w-4xl mx-auto w-full">
                  <div className="relative w-full flex items-center bg-[#0d0f22]/90 border border-[#1f2347] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] focus-within:border-indigo-500/50 focus-within:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all">
                    <span className="text-gray-500 font-mono pl-4 pr-1 select-none text-[15px]">&gt;</span>
                    <input
                      value={chatInput}
                      disabled={chatLoading}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSendMessage()}
                      placeholder={`Type your command or ask ${currentAgent.name}...`}
                      className="w-full bg-transparent pl-2 pr-32 py-4 text-[14.5px] text-white placeholder-gray-500 focus:outline-none disabled:opacity-50"
                    />
                    
                    {/* Floating Controls Row */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button 
                        type="button" 
                        title="Voice Input (Mic)"
                        className="p-2 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                      >
                        <Radio size={14} />
                      </button>
                      <button 
                        type="button" 
                        title="Attach Workspace File"
                        className="p-2 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        onClick={() => handleSendMessage()}
                        disabled={chatLoading}
                        className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(124,58,237,0.3)] flex items-center justify-center"
                        title="Send Message"
                      >
                        <Zap size={14} className="fill-white" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 overflow-x-auto">
                    <span className="text-[10px] text-gray-500 font-mono shrink-0">Workspace Helpers:</span>
                    {[
                      { icon: <Image size={10} />, label: "Visual Sandbox", prompt: "Launch a visual mock container sandbox for layout verification." },
                      { icon: <Video size={10} />, label: "Media Engine", prompt: "Run media compilation check on local assets." },
                      { icon: <Eye size={10} />, label: "Vision Parse", prompt: "Execute image model scan on standard output formats." }
                    ].map(tool => (
                      <button
                        key={tool.label}
                        onClick={() => handleSendMessage(tool.prompt)}
                        className="flex items-center gap-1 text-[9px] text-gray-400 hover:text-white bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.08] px-2 py-0.5 rounded-full transition-all cursor-pointer whitespace-nowrap"
                      >
                        {tool.icon} {tool.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 2: INTERACTIVE KANBAN BOARD ─── */}
          {centerTab === "kanban" && (
            <div className="flex-1 flex flex-col overflow-hidden p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 select-none">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Kanban size={14} className="text-indigo-400" /> Workspace Task Board
                    {dbTasksLoading && (
                      <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-indigo-400 border-t-transparent ml-1.5" />
                    )}
                  </h2>
                  <p className="text-[10px] text-gray-500">Track and manage task states visually across your swarm agents.</p>
                </div>
                
                {/* Source Filter Selector */}
                <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.04] p-1 rounded-xl">
                  {(["all", "aionui", "hermes"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setKanbanSourceFilter(f)}
                      className={`text-[9px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        kanbanSourceFilter === f
                          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]"
                          : "bg-transparent text-gray-500 border-transparent hover:text-gray-300"
                      }`}
                    >
                      {f === "all" ? "All Sources" : f === "aionui" ? "AionUi Swarms" : "Hermes Local"}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsAddingCard(!isAddingCard)}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer shadow-[0_0_10px_rgba(79,70,229,0.2)]"
                >
                  <Plus size={13} /> {isAddingCard ? "Close panel" : "Create Card"}
                </button>
              </div>

              {/* Add card layout panel */}
              {isAddingCard && (
                <div className="glass rounded-2xl p-4 border-white/[0.06] space-y-3 select-none animate-[slideDown_0.2s_ease-out]">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase font-bold">Target System (Source)</label>
                      <select
                        value={addTaskSource}
                        onChange={e => setAddTaskSource(e.target.value as "aionui" | "hermes")}
                        className="w-full bg-[#0a0a16] border border-white/[0.05] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/40 mt-1 cursor-pointer"
                      >
                        <option value="hermes">Hermes Local (hermes.db)</option>
                        <option value="aionui">AionUi Swarm (aionui.db)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase font-bold">Task Title</label>
                      <input
                        value={newCardTitle}
                        onChange={e => setNewCardTitle(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40 mt-1"
                        placeholder="Define work item..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase font-bold">Assignee Agent</label>
                      <select
                        value={newCardAssignee}
                        onChange={e => setNewCardAssignee(e.target.value)}
                        className="w-full bg-[#0a0a16] border border-white/[0.05] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/40 mt-1 cursor-pointer"
                      >
                        <option value="">Unassigned</option>
                        {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Description</label>
                    <textarea
                      rows={2}
                      value={newCardDesc}
                      onChange={e => setNewCardDesc(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40 mt-1 resize-none"
                      placeholder="Add sub-task requirements..."
                    />
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">Priority:</span>
                      {(["low", "medium", "high"] as const).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewCardPriority(p)}
                          className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold border transition-all cursor-pointer ${
                            newCardPriority === p
                              ? p === "high" ? "bg-red-500/10 text-red-400 border-red-500/20" : p === "medium" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-sky-500/10 text-sky-400 border-sky-500/20"
                              : "bg-transparent text-gray-500 border-white/[0.02] hover:text-gray-300"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleAddKanbanCard}
                      className="bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer shadow-[0_0_10px_rgba(79,70,229,0.2)]"
                    >
                      Add Task
                    </button>
                  </div>
                </div>
              )}

              {/* Kanban columns Grid */}
              <div className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-3.5 overflow-hidden">
                {(["backlog", "todo", "in_progress", "done"] as const).map(col => {
                  const getTaskStatus = (t: DbTask): "backlog" | "todo" | "in_progress" | "done" => {
                    if (t.source === "aionui") {
                      const s = t.status ? t.status.toLowerCase() : "";
                      if (s === "running") return "in_progress";
                      if (s === "completed") return "done";
                      if (s === "pending") return "todo";
                      return "backlog";
                    }
                    const s = t.status ? t.status.toLowerCase() : "";
                    if (s === "backlog" || s === "todo" || s === "in_progress" || s === "done") {
                      return s as "backlog" | "todo" | "in_progress" | "done";
                    }
                    return "todo";
                  };

                  const allTasks: DbTask[] = [
                    ...(dbTasks.aionui || []),
                    ...(dbTasks.hermes || [])
                  ];

                  const filteredTasks = allTasks.filter(t => {
                    if (kanbanSourceFilter === "all") return true;
                    return t.source === kanbanSourceFilter;
                  });

                  const colCards = filteredTasks.filter(t => getTaskStatus(t) === col);
                  const colLabel = col === "in_progress" ? "In Progress" : col === "done" ? "Completed" : col.charAt(0).toUpperCase() + col.slice(1);
                  const colColor = col === "done" ? "border-t-2 border-green-500" : col === "in_progress" ? "border-t-2 border-indigo-500" : col === "todo" ? "border-t-2 border-yellow-500" : "border-t-2 border-gray-600";
                  
                  return (
                    <div key={col} className="flex flex-col rounded-2xl bg-white/[0.015] border border-white/[0.03] overflow-hidden">
                      {/* Column Header */}
                      <div className={`p-3 bg-white/[0.01] border-b border-white/[0.03] flex justify-between items-center select-none ${colColor}`}>
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">{colLabel}</span>
                        <span className="text-[10px] font-mono font-bold bg-white/[0.04] text-gray-500 px-1.5 py-0.5 rounded-full">{colCards.length}</span>
                      </div>

                      {/* Column Cards Container */}
                      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                        {colCards.map(card => {
                          const priorityColor = card.priority === "high" ? "text-red-400 bg-red-500/10 border-red-500/10" : card.priority === "medium" ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/10" : "text-sky-400 bg-sky-500/10 border-sky-500/10";
                          const sourceBadgeColor = card.source === "aionui" ? "text-purple-400 bg-purple-500/10 border-purple-500/20" : "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
                          
                          return (
                            <div key={card.id} className="glass rounded-xl p-3 border border-white/[0.03] hover:border-white/[0.06] transition-all group flex flex-col justify-between space-y-2.5">
                              <div>
                                <div className="flex justify-between items-center gap-1 select-none">
                                  <div className="flex gap-1.5">
                                    <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${priorityColor}`}>{card.priority}</span>
                                    <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${sourceBadgeColor}`}>{card.source === "aionui" ? "AionUi" : "Hermes"}</span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteKanbanCard(card.source, card.id)}
                                    className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0.5 rounded hover:bg-white/[0.03]"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                                <h4 className="text-xs font-semibold text-white mt-1.5 select-text">{card.title}</h4>
                                <p className="text-[10px] text-gray-500 mt-1 leading-normal select-text">{card.description}</p>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-white/[0.03] select-none">
                                <span className="text-[9px] text-indigo-300 font-semibold flex items-center gap-1">
                                  <Bot size={9} /> {card.assignee}
                                </span>
                                
                                {/* Status shift controls */}
                                <div className="flex gap-1">
                                  {col !== "backlog" && (
                                    <button
                                      onClick={() => handleMoveKanbanCard(card.source, card.id, col === "done" ? "in_progress" : col === "in_progress" ? "todo" : "backlog")}
                                      className="p-1 rounded bg-white/[0.02] border border-white/[0.04] text-gray-500 hover:text-white cursor-pointer"
                                      title="Move Left"
                                    >
                                      <ChevronLeft size={8} />
                                    </button>
                                  )}
                                  {col !== "done" && (
                                    <button
                                      onClick={() => handleMoveKanbanCard(card.source, card.id, col === "backlog" ? "todo" : col === "todo" ? "in_progress" : "done")}
                                      className="p-1 rounded bg-white/[0.02] border border-white/[0.04] text-gray-500 hover:text-white cursor-pointer"
                                      title="Move Right"
                                    >
                                      <ChevronRight size={8} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {colCards.length === 0 && (
                          <div className="text-center py-6 text-[10px] text-gray-600 border border-dashed border-white/[0.02] rounded-xl select-none">
                            No tasks
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── TAB 3: HOST TERMINAL CONSOLE ─── */}
          {centerTab === "terminal" && (
            <div className="flex-grow flex flex-col overflow-hidden bg-black/60 p-4 font-mono text-xs">
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 select-text">
                {terminalLogs.map((log, index) => (
                  <div key={index} className={`whitespace-pre-wrap ${
                    log.type === 'input' ? 'text-indigo-300 font-semibold' : log.type === 'error' ? 'text-red-400' : 'text-[#cbd5e1]'
                  }`}>
                    {log.text}
                  </div>
                ))}
                {terminalLoading && (
                  <div className="text-gray-500 flex items-center gap-2 animate-pulse select-none">
                    <span>⚡ Executing command in host shell...</span>
                  </div>
                )}
                <div ref={terminalBottomRef} />
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-white/[0.05] select-none">
                <span className="text-indigo-400 font-bold shrink-0">Gary@AGENT-OS:~$</span>
                <input
                  type="text"
                  value={terminalInput}
                  disabled={terminalLoading}
                  onChange={e => setTerminalInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleRunCommand()}
                  className="flex-grow bg-transparent text-white focus:outline-none placeholder-gray-600 select-text"
                  placeholder="Type commands here... (e.g. dir, node -v, hermes --help)"
                />
              </div>
            </div>
          )}

          {/* ─── TAB 4: SWARM TELEMETRY & SYSTEM LOAD ─── */}
          {centerTab === "monitor" && (
            <div className="flex-grow p-5 space-y-5 overflow-y-auto select-none">
              {/* Telemetry charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass rounded-2xl p-4 border-white/[0.04]">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5"><Activity size={12} className="text-indigo-400" /> Token consumption (24h)</h3>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={TOKEN_DATA}>
                        <defs>
                          <linearGradient id="colorHermes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorOpenClaw" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" tick={{fontSize:9, fill:"#6b7280"}} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={{background:"#0a0a16",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,fontSize:10,color:"#e5e7eb"}} />
                        <Area type="monotone" dataKey="hermes" stroke="#a855f7" fill="url(#colorHermes)" strokeWidth={1.5} name="Hermes" />
                        <Area type="monotone" dataKey="openclaw" stroke="#10b981" fill="url(#colorOpenClaw)" strokeWidth={1.5} name="OpenClaw" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass rounded-2xl p-4 border-white/[0.04] flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5"><Sparkles size={12} className="text-purple-400" /> Model Share distribution</h3>
                    <div className="flex items-center gap-6">
                      <div className="h-32 w-32 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={MODEL_USAGE} cx="50%" cy="50%" innerRadius={28} outerRadius={46} dataKey="value" strokeWidth={0}>
                              {MODEL_USAGE.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-1.5 flex-1">
                        {MODEL_USAGE.map(m => (
                          <div key={m.name} className="flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{background:m.color}} />
                              <span className="text-gray-400 font-semibold">{m.name}</span>
                            </div>
                            <span className="text-gray-300 font-mono">{m.value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Swarm Communication Diagram */}
              <div className="glass rounded-2xl p-4 border-white/[0.04]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5"><Network size={12} className="text-indigo-400" /> Swarm Telemetry Nodes</h3>
                <div className="grid grid-cols-5 gap-2 items-center justify-center py-6 text-center border border-white/[0.02] rounded-xl bg-black/20 overflow-x-auto min-w-[500px] select-none">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 border-2 border-indigo-500 flex items-center justify-center text-indigo-400 animate-pulse">
                      <Brain size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-white">Antigravity (CEO)</span>
                    <span className="text-[8px] text-gray-500 font-mono">Routing L1</span>
                  </div>

                  <div className="h-0.5 bg-gradient-to-r from-indigo-500 to-green-500 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center text-green-400">
                      <Workflow size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-white">OpenClaw (Router)</span>
                    <span className="text-[8px] text-gray-500 font-mono">Pipeline L2</span>
                  </div>

                  <div className="h-0.5 bg-gradient-to-r from-green-500 to-purple-500 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 border-2 border-purple-500 flex items-center justify-center text-purple-400">
                      <Zap size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-white">Hermes (Executor)</span>
                    <span className="text-[8px] text-gray-500 font-mono">CLI Tasks L3</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                    Swarm Exchange Logs
                    {mailboxLoading && (
                      <span className="inline-block animate-spin rounded-full h-2 w-2 border border-indigo-400 border-t-transparent" />
                    )}
                  </h4>
                  <div className="bg-black/35 rounded-xl p-3.5 border border-white/[0.03] space-y-1.5 font-mono text-[9px] max-h-48 overflow-y-auto select-text">
                    {mailbox.map((log, idx) => {
                      const formatTimestamp = (ts: number | string) => {
                        const num = typeof ts === 'string' ? parseFloat(ts) : ts;
                        if (!num || isNaN(num)) return String(ts);
                        const date = new Date(num < 10000000000 ? num * 1000 : num);
                        return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                      };
                      return (
                        <div key={log.id || idx} className="text-gray-400 border-b border-white/[0.01] pb-1.5 last:border-0">
                          <span className="text-gray-600 font-mono text-[8px]">[{formatTimestamp(log.created_at)}]</span>{" "}
                          <span className="text-indigo-400 font-semibold">{log.from_agent_id || "System"}</span>
                          <span className="text-gray-500"> → </span>
                          <span className="text-indigo-300 font-semibold">{log.to_agent_id || "Swarm"}</span>
                          <span className="text-gray-500"> ({log.type})</span>:{" "}
                          <span className="text-white font-sans">{log.content || log.summary}</span>
                        </div>
                      );
                    })}
                    {mailbox.length === 0 && (
                      <div className="text-center py-4 text-[10px] text-gray-500 select-none">
                        No swarm mailbox exchange logs recorded.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Active Teams list */}
              <div className="glass rounded-2xl p-4 border-white/[0.04] space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={12} className="text-purple-400" /> Active Swarm Teams (AionUi)
                </h3>
                {teamsLoading ? (
                  <div className="text-center py-6 text-xs text-gray-500 font-mono">Loading teams database...</div>
                ) : teams.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-500 font-mono">No active teams discovered.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {teams.map(team => {
                      let parsedAgents: TeamAgent[] = [];
                      try {
                        if (team.agents) {
                          parsedAgents = JSON.parse(team.agents);
                        }
                      } catch (e) {
                        console.error("Failed to parse agents JSON for team:", team.name, e);
                      }
                      
                      return (
                        <div key={team.id} className="bg-black/35 border border-white/[0.03] rounded-xl p-3.5 flex flex-col justify-between space-y-3 hover:border-white/[0.06] transition-all">
                          <div>
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-xs font-bold text-white">{team.name}</h4>
                                <p className="text-[9px] text-gray-500 font-mono mt-0.5">Workspace: {team.workspace || "Default"}</p>
                              </div>
                              <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-purple-500/20 text-purple-400 bg-purple-500/10">
                                {team.workspace_mode || "stand-alone"}
                              </span>
                            </div>
                            
                            {/* Agent list in team */}
                            <div className="mt-3.5 space-y-1.5">
                              <span className="text-[8px] uppercase font-bold text-gray-500 tracking-wider">Agents in Team:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {parsedAgents.map((ag, i) => (
                                  <div key={ag.conversationId || i} className="text-[9px] bg-white/[0.02] border border-white/[0.04] rounded-lg px-2 py-0.5 text-gray-300 flex items-center gap-1" title={`${ag.role} (${ag.agentType})`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                    <span className="font-semibold text-white">{ag.agentName}</span>
                                    <span className="text-gray-500 text-[8px]">({ag.role})</span>
                                  </div>
                                ))}
                                {parsedAgents.length === 0 && <span className="text-gray-600 text-[9px]">No agents registered.</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-white/[0.02] text-[8px] font-mono text-gray-500 select-text">
                            <span>Created: {new Date(team.created_at).toLocaleDateString()}</span>
                            <span>ID: {team.id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* ─── RIGHT SIDEBAR: SESSIONS / MODELS / SKILLS / VAULT ─── */}
        <aside 
          className={`glass-strong flex flex-col shrink-0 border border-white/[0.05] bg-[#03030d]/85 z-20 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 ${
            isRightCollapsed ? "w-14" : "w-80"
          }`}
        >
          {/* Header toggle */}
          <div className="h-11 border-b border-white/[0.04] flex items-center justify-between px-3.5 shrink-0 select-none">
            <button 
              onClick={() => setIsRightCollapsed(!isRightCollapsed)}
              className="p-1 rounded bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-gray-400 hover:text-white transition-all cursor-pointer mr-auto"
            >
              {isRightCollapsed ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
            </button>
            {!isRightCollapsed && (
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase flex items-center gap-1.5">
                Brain & Vault Control
              </span>
            )}
          </div>

          {!isRightCollapsed ? (
            /* Expanded right rail panel content */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex border-b border-white/[0.04] bg-black/25 select-none shrink-0">
                {(["sessions", "models", "skills", "mcp-catalog", "vault"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setRightTab(tab)}
                    className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-wider transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer border-b ${
                      rightTab === tab
                        ? "text-white border-indigo-500 bg-white/[0.02]"
                        : "text-gray-500 hover:text-gray-300 border-transparent"
                    }`}
                  >
                    {tab === "sessions" ? <Clock size={11} /> : tab === "models" ? <Sparkles size={11} /> : tab === "skills" ? <Cpu size={11} /> : tab === "mcp-catalog" ? <Puzzle size={11} /> : <Database size={11} />}
                    <span className="mt-0.5">{tab === "mcp-catalog" ? "MCP" : tab}</span>
                  </button>
                ))}
              </div>

              <div className="flex-grow overflow-y-auto p-4">
                {/* TAB 1: SESSIONS RESTORE */}
                {rightTab === "sessions" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1 select-none">
                      <span>Hermes CLI Sessions</span>
                      <button onClick={fetchSessionsList} disabled={sessionsLoading} className="hover:text-white transition-colors cursor-pointer">
                        <RefreshCw size={10} className={sessionsLoading ? "animate-spin text-indigo-400" : ""} />
                      </button>
                    </div>
                    {sessionsLoading && (
                      <div className="text-gray-500 text-center py-4 font-mono text-xs select-none">Restoring logs index...</div>
                    )}
                    {!sessionsLoading && sessions.length === 0 && (
                      <div className="text-gray-600 text-center py-4 text-xs select-none">No past session contexts.</div>
                    )}
                    {!sessionsLoading && (
                      <div className="space-y-1.5">
                        {sessions.map(s => {
                          const isActive = activeSessionId === s.id;
                          return (
                            <button
                              key={s.id}
                              onClick={() => handleLoadSession(s.id)}
                              className={`w-full flex flex-col px-3 py-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                                isActive
                                  ? "bg-indigo-500/10 border-indigo-500/30 text-white"
                                  : "bg-white/[0.015] hover:bg-white/[0.03] border-white/[0.02] hover:border-white/[0.04] text-gray-400 hover:text-gray-300"
                              }`}
                            >
                              <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                Session: {s.id.slice(-6)}
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-gray-500 mt-1 select-none font-mono">
                                <span>{s.date}</span>
                                <span>{(s.sizeBytes / 1024).toFixed(1)} KB</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: ACTIVE MODELS CATALOG */}
                {rightTab === "models" && (
                  <div className="space-y-3">
                    <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1 select-none">OpenRouter Provider Catalog</div>
                    <div className="space-y-1.5">
                      {MODELS.map(model => {
                        const isSelected = activeModel === model.id;
                        const isSwitching = switchingModelId === model.id;
                        return (
                          <button
                            key={model.id}
                            onClick={() => handleSwitchModel(model.id)}
                            disabled={isSwitching}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-200 text-left cursor-pointer ${
                              isSelected
                                ? "bg-indigo-500/10 border-indigo-500/30 text-white shadow-[0_0_15px_rgba(99,102,241,0.06)]"
                                : "bg-white/[0.015] hover:bg-white/[0.03] border-white/[0.02] hover:border-white/[0.04] text-gray-400 hover:text-gray-200"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold truncate">{model.name}</div>
                              <div className="text-[9px] text-gray-500 font-mono truncate mt-0.5">{model.id}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2 select-none">
                              <span className="text-[8.5px] text-gray-500 font-mono">{model.ctx}</span>
                              {isSwitching ? (
                                <RefreshCw size={11} className="animate-spin text-indigo-400" />
                              ) : isSelected ? (
                                <CheckCircle2 size={12} className="text-green-400" />
                              ) : (
                                <div className="w-3 h-3 rounded-full border border-white/10" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 3: SKILLS MANAGER & TOOL PANELS */}
                {rightTab === "skills" && (
                  <div className="space-y-4">
                    {/* Hermes Skills from disk */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
                        <span>Hermes Skills Directory ({skillsDir.length})</span>
                        <button onClick={() => { fetchSkills(); fetchSkillsDir(); }} disabled={skillsLoading} className="hover:text-white transition-colors cursor-pointer">
                          <RefreshCw size={10} className={skillsLoading ? "animate-spin text-indigo-400" : ""} />
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {skillsDir.map(s => (
                          <div key={s.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.015] border border-white/[0.02] text-[11px]">
                            <span className="text-indigo-400">📦</span>
                            <span className="text-gray-300 flex-1 truncate">{s.name}</span>
                            <span className="text-[8px] text-gray-600 font-mono">{s.id}</span>
                          </div>
                        ))}
                        {skillsDir.length === 0 && !skillsLoading && (
                          <div className="text-center py-2 text-[10px] text-gray-600">No skills loaded</div>
                        )}
                      </div>
                    </div>

                    {/* Active Toolsets Toggle */}
                    <div className="space-y-2">
                      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">Active Toolsets</div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {availableSkills.map(skill => {
                          const isActive = activeSkills.includes(skill);
                          return (
                            <label key={skill} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs cursor-pointer select-none transition-all duration-200 ${isActive ? "bg-purple-500/5 border-purple-500/20 text-white" : "bg-white/[0.01] hover:bg-white/[0.02] border-white/[0.02] text-gray-400"}`}>
                              <span className="font-semibold capitalize">{skill.replace('_', ' ')}</span>
                              <input type="checkbox" checked={isActive} onChange={() => handleToggleSkill(skill)} className="rounded border-white/10 bg-black/40 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer" />
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* MCP Servers */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
                        <span>MCP Servers</span>
                        <button onClick={fetchMcpList} disabled={mcpLoading} className="hover:text-white transition-colors cursor-pointer">
                          <RefreshCw size={10} className={mcpLoading ? "animate-spin text-indigo-400" : ""} />
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {mcpList.map(server => (
                          <div key={server.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.015] border border-white/[0.02] text-xs">
                            <div>
                              <div className="font-semibold text-gray-300">{server.name}</div>
                              <div className="text-[9px] font-mono text-gray-500">{server.tools} tool schemas</div>
                            </div>
                            <span className={`text-[8.5px] uppercase font-bold px-1.5 py-0.5 rounded font-sans select-none ${server.status === "online" ? "bg-green-500/10 text-green-400 border border-green-500/10" : "bg-red-500/10 text-red-400 border border-red-500/10"}`}>{server.status}</span>
                          </div>
                        ))}
                        {mcpList.length === 0 && <div className="text-center py-3 text-[10px] text-gray-600 select-none">No active MCP directories found.</div>}
                      </div>
                    </div>

                    {/* Image Generation */}
                    <ImageGenPanel />

                    {/* Browser Control */}
                    <BrowserPanel />

                    {/* GitHub */}
                    <GitHubPanel />

                    {/* N8N */}
                    <N8NPanel />

                    {/* TTS */}
                    <TTSPanel />

                    {/* Code Execution */}
                    <CodePanel />

                    {/* Memory Search */}
                    <MemoryPanel />

                    {/* Web Search */}
                    <WebSearchPanel />

                    {/* Vision / Image Analysis */}
                    <VisionPanel />

                    {/* Cron Job Management */}
                    <CronManagementPanel />

                    {/* Todo List */}
                    <TodoPanel />

                    {/* Settings / Config Viewer */}
                    <SettingsPanel />

                    {/* Spotify / Music */}
                    <SpotifyPanel />

                    {/* Personality Switcher */}
                    <PersonalityPanel />

                    {/* Agent Telemetry */}
                    <AgentTelemetryPanel agents={agents} />

                    {/* Model Providers */}
                    <ProviderPanel />

                    {/* AionUI Teams */}
                    <AionUITeamsPanel />

                    {/* Delegation */}
                    <DelegationPanel />
                  </div>
                )}

                {/* TAB: MCP CATALOG — Browse & Install MCP Servers */}
                {rightTab === "mcp-catalog" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
                        <span className="flex items-center gap-1.5"><Puzzle size={10} className="text-cyan-400" /> MCP Server Catalog</span>
                        <button onClick={fetchMcpCatalog} disabled={mcpCatalogLoading} className="hover:text-white transition-colors cursor-pointer">
                          <RefreshCw size={10} className={mcpCatalogLoading ? "animate-spin text-cyan-400" : ""} />
                        </button>
                      </div>
                      <div className="text-[10px] text-gray-600 pl-0.5">
                        Browse {mcpCatalog ? mcpCatalog.categories.reduce((a: number, c: any) => a + c.servers.length, 0) : '—'} available MCP servers across {mcpCatalog ? mcpCatalog.categories.length : '—'} categories. Hermes connects to these via stdio or HTTP.
                      </div>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="flex gap-1.5">
                      <div className="flex-1 relative">
                        <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          value={mcpCatalogSearch}
                          onChange={e => setMcpCatalogSearch(e.target.value)}
                          placeholder="Search servers..."
                          className="w-full bg-white/[0.03] border border-white/[0.05] rounded-lg pl-7 pr-2.5 py-1.5 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/30"
                        />
                      </div>
                      <button
                        onClick={() => { setMcpCatalogSearch(""); setMcpCatalogCategory("all"); }}
                        className="px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] text-gray-500 hover:text-white text-[9px] font-bold uppercase tracking-wider cursor-pointer whitespace-nowrap"
                      >
                        <Filter size={10} />
                      </button>
                    </div>

                    {/* Category Pills */}
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                      <button
                        onClick={() => setMcpCatalogCategory("all")}
                        className={`text-[8px] px-2.5 py-1 rounded-full border transition-all cursor-pointer font-bold uppercase tracking-wider ${mcpCatalogCategory === "all" ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" : "text-gray-500 border-white/[0.03] hover:text-gray-300 hover:border-white/[0.06]"}`}
                      >
                        All
                      </button>
                      {mcpCatalog?.categories.map((cat: any) => (
                        <button
                          key={cat.name}
                          onClick={() => setMcpCatalogCategory(cat.name)}
                          className={`text-[8px] px-2.5 py-1 rounded-full border transition-all cursor-pointer font-bold ${mcpCatalogCategory === cat.name ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" : "text-gray-500 border-white/[0.03] hover:text-gray-300 hover:border-white/[0.06]"}`}
                        >
                          {cat.icon} {cat.name} ({cat.servers.length})
                        </button>
                      ))}
                    </div>

                    {/* Server Cards */}
                    {mcpCatalogLoading ? (
                      <div className="text-gray-500 text-center py-8 font-mono text-xs select-none">Loading catalog...</div>
                    ) : (
                      <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
                        {getFilteredCatalogServers().map((server: any) => {
                          const installState = mcpInstallStatus[server.id] || "idle";
                          return (
                            <div key={server.id} className="rounded-xl bg-white/[0.015] border border-white/[0.02] hover:border-white/[0.05] transition-all duration-200 overflow-hidden">
                              <div className="px-3.5 py-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-white">{server.categoryIcon} {server.name}</span>
                                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.04] text-gray-400 font-mono">{server.transport}</span>
                                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-semibold">{server.tools} tools</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1 leading-relaxed line-clamp-2">{server.description}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    {installState === "idle" && (
                                      <button
                                        onClick={() => {
                                          setMcpInstallStatus(prev => ({ ...prev, [server.id]: "installing" }));
                                          // Copy install command to clipboard as a helper
                                          const cmd = server.command ? `${server.command} ${server.args?.join(' ') || ''}` : server.url || '';
                                          navigator.clipboard?.writeText(cmd);
                                          setTimeout(() => setMcpInstallStatus(prev => ({ ...prev, [server.id]: "installed" })), 1500);
                                        }}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-white text-[9px] font-bold cursor-pointer transition-all"
                                      >
                                        <Download size={9} /> Install
                                      </button>
                                    )}
                                    {installState === "installing" && (
                                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/20 text-cyan-300 text-[9px] font-bold">
                                        <RefreshCw size={9} className="animate-spin" /> Adding...
                                      </div>
                                    )}
                                    {installState === "installed" && (
                                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-600/20 text-green-400 text-[9px] font-bold">
                                        <CheckCircle2 size={9} /> Added
                                      </div>
                                    )}
                                    {installState === "error" && (
                                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600/20 text-red-400 text-[9px] font-bold">
                                        <AlertTriangle size={9} /> Error
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {/* Config details */}
                                <div className="flex flex-wrap items-center gap-2 text-[8px] text-gray-600 font-mono">
                                  <span className="bg-black/30 px-1.5 py-0.5 rounded">id: {server.id}</span>
                                  {server.command && <span className="bg-black/30 px-1.5 py-0.5 rounded">cmd: {server.command}</span>}
                                  {server.url && <span className="bg-black/30 px-1.5 py-0.5 rounded truncate max-w-40">url: {server.url}</span>}
                                  {server.transport === "http" && <span className="bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded font-semibold">HTTP</span>}
                                  {server.transport === "stdio" && <span className="bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded font-semibold">stdio</span>}
                                  {server.env_required.length > 0 && (
                                    <span className="bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded font-semibold">🔑 {server.env_required.join(', ')}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {getFilteredCatalogServers().length === 0 && !mcpCatalogLoading && (
                          <div className="text-center py-6 text-[10px] text-gray-600 select-none">
                            {mcpCatalogSearch ? `No servers match "${mcpCatalogSearch}"` : "No servers in this category."}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick Hermes Config Reference */}
                    <div className="rounded-xl bg-white/[0.01] border border-white/[0.02] p-3 space-y-2">
                      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
                        <Terminal size={10} className="text-cyan-400" /> Hermes Config Reference
                      </div>
                      <div className="text-[9px] text-gray-400 font-mono bg-black/30 rounded-lg p-2.5 leading-relaxed">
                        <span className="text-gray-600"># Add to ~/.hermes/config.yaml under mcp_servers:</span>{'\n'}
                        <span className="text-cyan-300">mcp_servers:</span>{'\n'}
                        {'  '}<span className="text-green-300">filesystem</span>:{'\n'}
                        {'    '}<span className="text-purple-300">command</span>: <span className="text-yellow-300">npx</span>{'\n'}
                        {'    '}<span className="text-purple-300">args</span>: [<span className="text-yellow-300">-y</span>, <span className="text-yellow-300">@modelcontextprotocol/server-filesystem</span>, <span className="text-yellow-300">/path/to/allow</span>]{'\n'}
                        {'    '}<span className="text-purple-300">timeout</span>: <span className="text-yellow-300">30</span>
                      </div>
                      <div className="text-[8px] text-gray-600 select-none">
                        ☝️ Use <span className="text-cyan-400 font-mono">hermes mcp add &lt;name&gt; --command &lt;cmd&gt; --args &lt;args&gt;</span> or edit config.yaml directly. Restart Hermes to apply.
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: OBSIDIAN VAULT NOTES */}
                {rightTab === "vault" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
                      <span>Obsidian Vault Notes</span>
                      <button onClick={fetchVaultFiles} disabled={vaultLoading} className="hover:text-white transition-colors cursor-pointer">
                        <RefreshCw size={10} className={vaultLoading ? "animate-spin text-indigo-400" : ""} />
                      </button>
                    </div>

                    {/* New Note Interface */}
                    <div className="select-none">
                      {isCreatingNote ? (
                        <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl space-y-2">
                          <input
                            value={newNoteName}
                            onChange={e => setNewNoteName(e.target.value)}
                            placeholder="Note title (e.g. todo-list)..."
                            className="w-full bg-black/40 border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/40"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setIsCreatingNote(false)}
                              className="text-[10px] bg-transparent text-gray-500 hover:text-gray-300 px-2 py-1 rounded cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleCreateNote}
                              className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                            >
                              Create
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsCreatingNote(true)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-white/[0.06] hover:border-white/15 rounded-xl text-xs text-gray-400 hover:text-white transition-all cursor-pointer"
                        >
                          <Plus size={12} /> Create Note
                        </button>
                      )}
                    </div>

                    {vaultLoading && vaultFiles.length === 0 ? (
                      <div className="text-gray-500 text-center py-4 font-mono text-xs select-none">Piping files stream...</div>
                    ) : (
                      <div className="space-y-1.5">
                        {vaultFiles.map(file => (
                          <button
                            key={file.name}
                            onClick={() => handleLoadVaultFile(file.name)}
                            className="w-full p-3 rounded-xl bg-white/[0.015] hover:bg-white/[0.035] border border-white/[0.02] hover:border-white/[0.04] text-left transition-all duration-200 cursor-pointer flex items-start gap-2.5"
                          >
                            <FileText size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-white truncate">{file.name.slice(0, -3)}</div>
                              <div className="flex justify-between items-center text-[9px] text-gray-500 mt-1 select-none font-mono">
                                <span>{(file.sizeBytes / 1024).toFixed(1)} KB</span>
                                <span>{new Date(file.mtime).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                              </div>
                            </div>
                          </button>
                        ))}
                        {vaultFiles.length === 0 && (
                          <div className="text-center py-4 text-xs text-gray-600 select-none">No markdown notes found in D:\Agent OS.</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Collapsed right rail icon column */
            <div className="flex-1 flex flex-col items-center py-4 space-y-4 select-none">
              {(["sessions", "models", "skills", "mcp-catalog", "vault"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    setRightTab(tab);
                    setIsRightCollapsed(false);
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                    rightTab === tab
                      ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                      : "bg-white/[0.02] border-white/[0.05] text-gray-400 hover:text-white"
                  }`}
                >
                  {tab === "sessions" ? <Clock size={13} /> : tab === "models" ? <Sparkles size={13} /> : tab === "skills" ? <Cpu size={13} /> : tab === "mcp-catalog" ? <Puzzle size={13} /> : <Database size={13} />}
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* ═══ OBSIDIAN INLINE EDITOR MODAL ═══ */}
      {isVaultEditorOpen && activeVaultFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl glass-strong border border-white/[0.08] shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex flex-col max-h-[80vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.05] select-none">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-indigo-400" />
                <span className="text-sm font-bold text-white font-mono">{activeVaultFile.name}</span>
              </div>
              <button
                onClick={() => {
                  setIsVaultEditorOpen(false);
                  setActiveVaultFile(null);
                }}
                className="text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Content / Text Area */}
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
              <textarea
                value={activeVaultFile.content}
                onChange={e => setActiveVaultFile({ ...activeVaultFile, content: e.target.value })}
                className="flex-1 bg-black/40 border border-white/[0.06] rounded-xl p-4 text-xs font-mono text-[#cbd5e1] leading-relaxed resize-none focus:outline-none focus:border-indigo-500/40"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center p-4 border-t border-white/[0.05] select-none">
              <span className="text-[10px] text-gray-500">Local vault editor: D:\Agent OS</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsVaultEditorOpen(false);
                    setActiveVaultFile(null);
                  }}
                  className="text-xs bg-transparent hover:bg-white/[0.03] text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/[0.05] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveVaultFile}
                  disabled={vaultLoading}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-[0_0_10px_rgba(79,70,229,0.25)]"
                >
                  <Save size={12} /> {vaultLoading ? "Saving note..." : "Save note"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SYSTEM FOOTER ═══ */}
      <footer className="glass-strong h-8 flex items-center justify-between px-5 shrink-0 text-[10px] text-gray-500 font-mono border-t border-white/[0.04] bg-[#03030d]/80 z-20 select-none">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5"><Layers size={11} className="text-gray-600" /> 7 Layers Active</span>
          <span className="flex items-center gap-1.5"><Cpu size={11} className="text-gray-600" /> 8 Inference Catalogs</span>
          <span className="flex items-center gap-1.5 text-purple-400"><Sparkles size={11} /> Model: {activeModel}</span>
        </div>
        <div>
          <span className="text-[9px] font-sans bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 px-2 py-0.5 rounded-full">Antigravity Premium OS Dashboard</span>
        </div>
      </footer>
    </div>
  );
}
