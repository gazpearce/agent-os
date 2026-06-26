import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Bot, Brain, Cpu, Zap, Clock,
  Sparkles, Image, Video, Eye,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Layers, Radio, Shield, Terminal, Database, Workflow, TerminalSquare, RefreshCw,
  ChevronLeft, ChevronRight, Plus, Trash2, Save, Play, Users, Kanban,
  Network, FileText, X, ExternalLink, Globe, Puzzle, Download, Search, Filter,
  Target, FolderOpen, XCircle, Settings, MessageSquare, Send, Loader2, Bell
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
  id?: string;
  agent: string;
  msg: string;
  time: string;
  isError?: boolean;
  tools?: string[];
  status?: string; // pending_approval, approved, rejected, etc.
}

interface ThreadedMessage extends ChatMessage {
  replies?: ThreadedMessage[];
}

function buildMessageTree(messages: ChatMessage[]): ThreadedMessage[] {
  const tree: ThreadedMessage[] = [];
  let currentBrainstorm: ThreadedMessage | null = null;
  let currentCritique: ThreadedMessage | null = null;

  messages.forEach((msg) => {
    const threaded: ThreadedMessage = { ...msg, replies: [] };
    const id = msg.id || "";

    if (id.startsWith("msg_brainstorm_")) {
      if (
        id.includes("_agy_") ||
        id.includes("_orchestrator_") ||
        id.includes("_openclaw_") ||
        id.includes("_hermes_") ||
        id.includes("_claude_") ||
        id.startsWith("msg_brainstorm_end_")
      ) {
        if (currentBrainstorm) {
          currentBrainstorm.replies?.push(threaded);
        } else {
          tree.push(threaded);
        }
      } else {
        currentBrainstorm = threaded;
        tree.push(threaded);
      }
    } else if (id.startsWith("msg_critique_")) {
      if (id.startsWith("msg_critique_header_")) {
        currentCritique = threaded;
        tree.push(threaded);
      } else {
        if (currentCritique) {
          currentCritique.replies?.push(threaded);
        } else {
          tree.push(threaded);
        }
      }
    } else {
      tree.push(threaded);
    }
  });

  return tree;
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
  { id: "claude", name: "Claude Code", role: "Developer · Refactoring", icon: <Bot size={18} />, status: "online", version: "2.1.159", layer: "L3", color: "#ea580c", tokens: 53102, tasks: 14, skills: 12 },
  { id: "aider", name: "Aider Chat", role: "Multi-file Coding Agent", icon: <Terminal size={18} />, status: "online", version: "0.68.0", layer: "L3", color: "#10b981", tokens: 0, tasks: 0, skills: 8 },
  { id: "opencode", name: "OpenCode", role: "Terminal · AI Coder", icon: <TerminalSquare size={18} />, status: "online", version: "MIT · 75+ providers", layer: "L3", color: "#06b6d4", tokens: 0, tasks: 0, skills: 7 },
  { id: "github", name: "GitHub CLI", role: "Repo Operations & PRs", icon: <Layers size={18} />, status: "online", version: "2.92.0", layer: "L3", color: "#64748b", tokens: 0, tasks: 0, skills: 5 },
  { id: "hermes", name: "Hermes", role: "Research · Executor", icon: <Zap size={18} />, status: "offline", version: "active", layer: "L3", color: "#a855f7", tokens: 142893, tasks: 23, skills: 31 },
  { id: "nousresearch", name: "Nous Research", role: "Inference · Free API", icon: <Network size={18} />, status: "online", version: "portal", layer: "Cloud", color: "#f97316", tokens: 0, tasks: 0, skills: 6 },
  { id: "gemini", name: "Google Gemini", role: "AI Studio · Free Tier", icon: <Sparkles size={18} />, status: "online", version: "2.5 Flash", layer: "Cloud", color: "#4285f4", tokens: 0, tasks: 0, skills: 8 },
  { id: "obsidian", name: "Obsidian", role: "Memory · Vault", icon: <Database size={18} />, status: "online", version: "installed", layer: "L4", color: "#f59e0b", tokens: 0, tasks: 0, skills: 5 },
  { id: "ollama", name: "Ollama", role: "Local · Inference", icon: <Cpu size={18} />, status: "offline", version: "0.24.0", layer: "L6", color: "#22d3ee", tokens: 0, tasks: 0, skills: 4 },
  { id: "lmstudio", name: "LM Studio", role: "Local · UI", icon: <Terminal size={18} />, status: "offline", version: "installed", layer: "L6", color: "#ec4899", tokens: 0, tasks: 0, skills: 3 },
  { id: "openrouter", name: "OpenRouter", role: "Cloud · API", icon: <Radio size={18} />, status: "online", version: "27 models", layer: "Cloud", color: "#8b5cf6", tokens: 89234, tasks: 156, skills: 27 },
  { id: "alibaba", name: "Alibaba DashScope", role: "Qwen · Free APIs", icon: <Layers size={18} />, status: "online", version: "qwen-long", layer: "Cloud", color: "#ff6a00", tokens: 0, tasks: 0, skills: 6 },
  { id: "zhipu", name: "Zhipu BigModel", role: "GLM · Free APIs", icon: <Sparkles size={18} />, status: "online", version: "glm-5.1", layer: "Cloud", color: "#3051ff", tokens: 0, tasks: 0, skills: 8 },
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
      return <code key={i} className="px-2 py-0.5 mx-0.5 rounded-md bg-white/[0.06] border border-white/[0.05] font-mono text-xs text-indigo-300">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function PodcastPlayer({ data }: { data: any }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= 180) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const hostsList = Array.isArray(data.hosts) ? data.hosts.join(' & ') : (data.hosts || 'Gary & Antigravity');

  return (
    <div className="my-4 p-5 rounded-2xl bg-gradient-to-br from-[#581c87]/20 via-[#1e1b4b]/20 to-black/50 border border-purple-500/20 backdrop-blur-xl shadow-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/35 flex items-center justify-center text-purple-400 font-bold text-xl shadow-inner select-none">
            🎙️
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white">{data.title || 'Audio Overview'}</h4>
            <div className="text-[10px] text-purple-300 font-mono mt-0.5">Hosts: {hostsList}</div>
          </div>
        </div>
        <span className="text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 select-none">
          NotebookLM Overview
        </span>
      </div>

      <p className="text-[11.5px] text-gray-400 leading-normal">{data.description || 'Generated audio summary of this article.'}</p>

      {/* Audio Waveform and controls */}
      <div className="bg-black/30 border border-white/[0.04] rounded-xl p-4 flex items-center gap-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg transition-all transform hover:scale-105 active:scale-95 cursor-pointer shrink-0 select-none"
        >
          {isPlaying ? (
            <span className="text-xs">⏸️</span>
          ) : (
            <span className="text-xs ml-0.5">▶️</span>
          )}
        </button>

        <div className="flex-1 space-y-2">
          {/* Waveform Visualization */}
          <div className="h-6 flex items-end gap-0.5 px-1 overflow-hidden select-none">
            {Array.from({ length: 48 }).map((_, idx) => {
              const height = isPlaying 
                ? 4 + Math.sin(idx * 0.5 + currentTime * 0.8) * 8 + Math.cos(idx * 0.2 + currentTime * 1.5) * 6
                : 4 + Math.sin(idx * 0.3) * 3;
              return (
                <div 
                  key={idx} 
                  className={`flex-1 rounded-full transition-all duration-300 ${isPlaying ? 'bg-purple-400' : 'bg-gray-700'}`} 
                  style={{ height: `${Math.max(2, Math.min(22, height))}px` }} 
                />
              );
            })}
          </div>

          <div className="flex justify-between items-center text-[9px] font-mono text-gray-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(180)}</span>
          </div>
        </div>
      </div>

      {/* Transcript Collapsible */}
      {data.transcript && (
        <div className="pt-2 border-t border-white/[0.04]">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="text-[10px] font-bold text-purple-300 hover:text-purple-200 transition-colors flex items-center gap-1 cursor-pointer select-none"
          >
            💬 {showTranscript ? 'Hide Written Dialogue' : 'Read Written Dialogue'}
          </button>
          {showTranscript && (
            <div className="mt-3 p-3 bg-black/40 border border-white/[0.03] rounded-xl text-[11.5px] text-gray-300 font-mono leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap select-text">
              {data.transcript}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PresentationSlides({ data }: { data: any }) {
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [showNotes, setShowNotes] = useState(false);

  const slides = Array.isArray(data.slides) ? data.slides : [];
  if (slides.length === 0) return null;

  const currentSlide = slides[currentSlideIdx];

  return (
    <div className="my-4 p-5 rounded-2xl bg-gradient-to-br from-[#831843]/15 via-[#1e1b4b]/15 to-black/60 border border-pink-500/20 backdrop-blur-xl shadow-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[10px] font-mono font-bold text-pink-300 uppercase tracking-widest select-none">Interactive Presentation</h4>
          <h3 className="text-sm font-extrabold text-white mt-0.5">{data.title || 'Slide Presentation'}</h3>
        </div>
        <span className="text-[9px] font-mono font-bold text-gray-500 select-none">
          Slide {currentSlideIdx + 1} of {slides.length}
        </span>
      </div>

      {/* Slide Screen Canvas */}
      <div className="relative aspect-[16/9] bg-gradient-to-br from-black/80 to-pink-950/20 border border-pink-500/10 rounded-xl p-6 flex flex-col justify-between shadow-inner select-text">
        <div className="space-y-4">
          <h2 className="text-base font-extrabold text-white border-b border-white/10 pb-2 flex items-center gap-2 select-none">
            <span className="text-pink-400 text-xs font-mono">0{currentSlideIdx + 1}.</span>
            {currentSlide?.title || 'Slide Title'}
          </h2>
          <ul className="space-y-2.5">
            {Array.isArray(currentSlide?.bullets) && currentSlide.bullets.map((bullet: string, idx: number) => (
              <li key={idx} className="text-xs text-gray-200 flex items-start gap-2 leading-relaxed">
                <span className="text-pink-400 mt-1 shrink-0 select-none">✨</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-between items-center text-[10px] text-gray-500 border-t border-white/[0.04] pt-2 mt-4 select-none">
          <span>Gary & Antigravity OS</span>
          <span className="font-mono text-pink-400/70">Confidential · Niche SEO Pipeline</span>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setShowNotes(!showNotes)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer select-none ${
            showNotes 
              ? 'bg-pink-500/25 text-pink-300 border border-pink-500/35 shadow-inner' 
              : 'bg-white/[0.02] text-gray-400 hover:text-white border border-transparent'
          }`}
        >
          {showNotes ? '📖 Hide Speaker Notes' : '📘 Show Speaker Notes'}
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => setCurrentSlideIdx(prev => Math.max(0, prev - 1))}
            disabled={currentSlideIdx === 0}
            className="px-3 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] disabled:opacity-30 border border-white/[0.05] disabled:border-transparent text-xs text-white font-bold cursor-pointer transition-all select-none"
          >
            ◀ Previous
          </button>
          <button
            onClick={() => setCurrentSlideIdx(prev => Math.min(slides.length - 1, prev + 1))}
            disabled={currentSlideIdx === slides.length - 1}
            className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 disabled:opacity-30 disabled:bg-gray-800 text-xs text-white font-bold cursor-pointer transition-all shadow-[0_0_10px_rgba(219,39,119,0.3)] select-none"
          >
            Next ▶
          </button>
        </div>
      </div>

      {/* Speaker Notes Drawer */}
      {showNotes && currentSlide?.notes && (
        <div className="p-3 bg-black/40 border border-white/[0.03] rounded-xl text-[11.5px] text-gray-300 font-sans leading-relaxed select-text">
          <div className="text-[9px] uppercase font-bold tracking-wider text-pink-400 mb-1 font-mono select-none">Presenter Guide & Notes:</div>
          {currentSlide.notes}
        </div>
      )}
    </div>
  );
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

          if (lang === 'podcast') {
            try {
              const data = JSON.parse(code);
              return <PodcastPlayer key={i} data={data} />;
            } catch (e) {
              // fallback
            }
          }
          if (lang === 'presentation') {
            try {
              const data = JSON.parse(code);
              return <PresentationSlides key={i} data={data} />;
            } catch (e) {
              // fallback
            }
          }

          return (
            <div key={i} className="my-2 rounded-lg bg-black/45 border border-white/[0.04] overflow-hidden font-mono text-[11.5px] shadow-inner">
              <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.02] border-b border-white/[0.04] text-[9px] text-gray-500 uppercase font-sans select-none">
                <span className="font-semibold text-gray-400">{lang || 'code'}</span>
                <button 
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="hover:text-white transition-colors cursor-pointer bg-white/[0.03] hover:bg-white/[0.06] px-2 py-0.5 rounded border border-white/[0.04]"
                >
                  Copy
                </button>
              </div>
              <pre className="p-2.5 overflow-x-auto leading-relaxed"><code className="text-[#e2e8f0]">{code}</code></pre>
            </div>
          );
        }
        
        const lines = part.split('\n');
        return (
          <div key={i} className="space-y-1.5">
            {lines.map((line, j) => {
              if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                return (
                  <li key={j} className="ml-4 list-disc pl-1 text-[12px] text-[#cbd5e1]">
                    {parseInline(line.trim().slice(2))}
                  </li>
                );
              }
              if (line.trim().startsWith('### ')) {
                return (
                  <h3 key={j} className="text-[12.5px] font-bold text-white mt-3 mb-1 select-none">
                    {parseInline(line.trim().slice(4))}
                  </h3>
                );
              }
              if (line.trim().startsWith('## ')) {
                return (
                  <h2 key={j} className="text-[13.5px] font-bold text-white mt-4 mb-2 border-b border-white/5 pb-1 select-none">
                    {parseInline(line.trim().slice(3))}
                  </h2>
                );
              }
              if (line.trim().match(/^\d+\.\s/)) {
                const match = line.trim().match(/^(\d+)\.\s(.*)/);
                return (
                  <li key={j} className="ml-4 list-decimal pl-1 text-[12px] text-[#cbd5e1]">
                    {parseInline(match ? match[2] : line)}
                  </li>
                );
              }
              return (
                <p key={j} className="text-[12px] text-[#cbd5e1] leading-relaxed">
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
/* ─────────── MEDIA ENGINE PANEL ─────────── */
interface GalleryItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  prompt: string;
  timestamp: string;
}

function MediaEnginePanel() {
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const [prompt, setPrompt] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [genProvider, setGenProvider] = useState('pollinations');
  const [loading, setLoading] = useState(false);
  const [gallery, setGallery] = useState<GalleryItem[]>(() => {
    try {
      const saved = localStorage.getItem('agent_os_gallery');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveToGallery = (url: string, type: 'image' | 'video') => {
    const newItem: GalleryItem = {
      id: 'media-' + Date.now(),
      url,
      type,
      prompt,
      timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })
    };
    const updated = [newItem, ...gallery];
    setGallery(updated);
    localStorage.setItem('agent_os_gallery', JSON.stringify(updated));
  };

  const deleteFromGallery = (id: string) => {
    const updated = gallery.filter(item => item.id !== id);
    setGallery(updated);
    localStorage.setItem('agent_os_gallery', JSON.stringify(updated));
  };

  const genImage = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setMediaUrl('');
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider: genProvider }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setMediaUrl(data.imageUrl);
        saveToGallery(data.imageUrl, 'image');
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const genVideo = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setMediaUrl('');
    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.videoUrl) {
        setMediaUrl(data.videoUrl);
        saveToGallery(data.videoUrl, 'video');
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleGen = () => {
    if (activeTab === 'image') genImage();
    else genVideo();
  };

  return (
    <div className="space-y-3 p-3 bg-white/[0.015] border border-white/[0.04] rounded-2xl shadow-xl">
      <div className="flex justify-between items-center select-none">
        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
          {activeTab === 'image' ? <Image size={10} className="text-pink-400" /> : <Video size={10} className="text-purple-400" />} Media Engine
        </span>
        <div className="flex gap-1.5">
          <button 
            onClick={() => { setActiveTab('image'); setMediaUrl(''); }} 
            className={`text-[8px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${activeTab === 'image' ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' : 'text-gray-500 border-white/[0.03] hover:text-gray-300'}`}
          >
            Image
          </button>
          <button 
            onClick={() => { setActiveTab('video'); setMediaUrl(''); }} 
            className={`text-[8px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${activeTab === 'video' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'text-gray-500 border-white/[0.03] hover:text-gray-300'}`}
          >
            Video
          </button>
        </div>
      </div>

      {activeTab === 'image' && (
        <div className="flex gap-1.5 select-none">
          {['pollinations', 'gemini'].map(p => (
            <button 
              key={p} 
              onClick={() => setGenProvider(p)} 
              className={`text-[8px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${genProvider === p ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 'text-gray-500 border-white/[0.03] hover:text-gray-300'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1.5">
        <input 
          value={prompt} 
          onChange={e => setPrompt(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleGen()} 
          placeholder={activeTab === 'image' ? "Describe image..." : "Describe video..."} 
          className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/30" 
        />
        <button 
          onClick={handleGen} 
          disabled={loading} 
          className={`px-3 py-1.5 rounded-lg text-white text-[10px] font-medium disabled:opacity-50 cursor-pointer whitespace-nowrap ${activeTab === 'image' ? 'bg-pink-600/80 hover:bg-pink-500' : 'bg-purple-600/80 hover:bg-purple-500'}`}
        >
          {loading ? '⏳' : activeTab === 'image' ? '🎨 Gen Image' : '🎬 Gen Video'}
        </button>
      </div>

      {mediaUrl && (
        <div className="rounded-xl overflow-hidden border border-white/[0.05] bg-black/30 p-2 space-y-2">
          {activeTab === 'image' ? (
            <img src={mediaUrl} alt="Generated" className="w-full h-auto max-h-48 object-contain" />
          ) : (
            <div className="space-y-2">
              <video src={mediaUrl} controls autoPlay loop className="w-full h-auto max-h-48 rounded" />
              <a 
                href={mediaUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center justify-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 font-medium py-1 px-2.5 rounded bg-purple-500/10 border border-purple-500/20 transition-all"
              >
                <Download size={10} /> Open & Download Video
              </a>
            </div>
          )}
        </div>
      )}

      {/* Gallery Section */}
      {gallery.length > 0 && (
        <div className="space-y-2 mt-3 pt-3 border-t border-white/[0.04]">
          <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">Saved Gallery ({gallery.length})</div>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {gallery.map(item => (
              <div key={item.id} className="group relative rounded-lg overflow-hidden border border-white/[0.04] bg-black/40 aspect-square flex flex-col justify-between">
                {item.type === 'image' ? (
                  <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
                ) : (
                  <video src={item.url} className="w-full h-full object-cover" muted loop autoPlay />
                )}
                <div className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 flex flex-col justify-between text-[9px] text-white">
                  <p className="text-gray-300 line-clamp-3 select-all overflow-hidden text-[8px] leading-tight">{item.prompt}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[7.5px] text-gray-500">{item.timestamp}</span>
                    <div className="flex gap-1.5">
                      <a href={item.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-white cursor-pointer font-bold">Open</a>
                      <button onClick={() => deleteFromGallery(item.id)} className="text-red-400 hover:text-red-300 cursor-pointer font-bold">Del</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── SWARM DIAGNOSTICS PANEL ─────────── */
function SwarmDiagnosticsPanel() {
  const [diag, setDiag] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [healLogs, setHealLogs] = useState<string[]>([]);
  const [healing, setHealing] = useState(false);
  const [consolidating, setConsolidating] = useState(false);
  const [errors, setErrors] = useState<any[]>([]);
  const [selectedError, setSelectedError] = useState<any>(null);
  
  const fetchErrors = async () => {
    try {
      const res = await fetch('/api/swarm/errors');
      const data = await res.json();
      setErrors(data.errors || []);
    } catch (e) {
      console.error("Failed to fetch errors:", e);
    }
  };

  const loadErrorContent = async (filename: string) => {
    try {
      const res = await fetch(`/api/swarm/errors/content?file=${encodeURIComponent(filename)}`);
      const data = await res.json();
      setSelectedError({ filename, content: data.content });
    } catch (e) {
      console.error("Failed to load error content:", e);
    }
  };

  const runDiag = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/swarm/diagnose');
      const data = await res.json();
      setDiag(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const runHeal = async () => {
    setHealing(true);
    setHealLogs(["Starting self-healing triggers..."]);
    try {
      const res = await fetch('/api/swarm/self-heal', { method: 'POST' });
      const data = await res.json();
      if (data.logs) setHealLogs(data.logs);
    } catch (e: any) { setHealLogs(prev => [...prev, `Heal error: ${e.message || e}`]); }
    finally { setHealing(false); }
  };

  const runConsolidate = async () => {
    setConsolidating(true);
    setHealLogs(prev => [...prev, "Initiating swarm memory consolidation & prompt recompilation..."]);
    try {
      const res = await fetch('/api/memory/consolidate', { method: 'POST' });
      const data = await res.json();
      if (data.message) {
        setHealLogs(prev => [...prev, `Success: ${data.message}`]);
      } else if (data.error) {
        setHealLogs(prev => [...prev, `Error: ${data.error}`]);
      }
    } catch (e: any) {
      setHealLogs(prev => [...prev, `Consolidation error: ${e.message || e}`]);
    } finally {
      setConsolidating(false);
    }
  };

  useEffect(() => { 
    runDiag(); 
    fetchErrors();
  }, []);

  return (
    <div className="bg-[#0c0c16]/75 border border-white/[0.04] rounded-2xl p-4 space-y-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-white/[0.05] pb-3 select-none">
        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">🔬 Swarm Diagnostic Engine</span>
        <div className="flex gap-2">
          <button onClick={runDiag} disabled={loading} className="px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-[9px] font-mono cursor-pointer transition-colors">
            {loading ? "Testing..." : "Run Diagnostics"}
          </button>
          <button onClick={runHeal} disabled={healing} className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono cursor-pointer transition-colors">
            {healing ? "Healing..." : "Run Auto-Healing"}
          </button>
          <button onClick={runConsolidate} disabled={consolidating} className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[9px] font-mono cursor-pointer transition-colors">
            {consolidating ? "Consolidating..." : "Consolidate Memory"}
          </button>
        </div>
      </div>

      {diag && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[10px] font-mono select-none">
          <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl space-y-1.5">
            <span className="text-gray-500 font-bold block border-b border-white/[0.04] pb-1 mb-1">RUNTIMES</span>
            <div>🐍 Python: <span className="text-indigo-300">{diag.runtimes.python}</span></div>
            <div>⚡ Node.js: <span className="text-indigo-300">{diag.runtimes.node}</span></div>
          </div>
          <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl space-y-1.5">
            <span className="text-gray-500 font-bold block border-b border-white/[0.04] pb-1 mb-1">CLI BINARIES</span>
            <div>🧑‍💻 Aider: <span className={diag.clis.aider === 'missing' ? 'text-rose-400' : 'text-emerald-400'}>{diag.clis.aider}</span></div>
            <div>🤖 Claude: <span className={diag.clis.claude === 'missing' ? 'text-rose-400' : 'text-emerald-400'}>{diag.clis.claude}</span></div>
            <div>🐙 GitHub: <span className={diag.clis.gh === 'missing' ? 'text-rose-400' : 'text-emerald-400'}>{diag.clis.gh}</span></div>
            <div>🔀 OpenClaw: <span className={diag.clis.openclaw === 'missing' ? 'text-rose-400' : 'text-emerald-400'}>{diag.clis.openclaw}</span></div>
          </div>
          <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl space-y-1.5">
            <span className="text-gray-500 font-bold block border-b border-white/[0.04] pb-1 mb-1">PROXIES</span>
            <div>🤖 fcc-server: <span className={diag.proxies.fccServer === 'offline' ? 'text-rose-400' : 'text-emerald-400'}>{diag.proxies.fccServer}</span></div>
            <div>🦙 LM Studio: <span className={diag.proxies.lmStudio === 'offline' ? 'text-rose-400' : 'text-emerald-400'}>{diag.proxies.lmStudio}</span></div>
            <div>🦙 Ollama: <span className={diag.proxies.ollama === 'offline' ? 'text-rose-400' : 'text-emerald-400'}>{diag.proxies.ollama}</span></div>
          </div>
          <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl space-y-2">
            <span className="text-gray-500 font-bold block border-b border-white/[0.04] pb-1 mb-1">SYSTEM RESOURCES</span>
            
            <div className="space-y-1">
              <div className="flex justify-between text-[9px]">
                <span>💻 CPU Load:</span>
                <span className="text-cyan-400 font-bold">{diag.resources?.cpuPercent !== undefined ? `${diag.resources.cpuPercent}%` : 'N/A'}</span>
              </div>
              <div className="w-full bg-white/[0.03] h-1 rounded-full overflow-hidden border border-white/[0.02]">
                <div 
                  className="bg-cyan-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${diag.resources?.cpuPercent !== undefined ? Math.min(Math.max(diag.resources.cpuPercent, 0), 100) : 0}%` }} 
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[9px]">
                <span>📟 Memory:</span>
                <span className="text-cyan-400 font-bold">{diag.resources ? `${diag.resources.memPercent}%` : 'N/A'}</span>
              </div>
              <div className="w-full bg-white/[0.03] h-1 rounded-full overflow-hidden border border-white/[0.02]">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${diag.resources ? Math.min(Math.max(diag.resources.memPercent, 0), 100) : 0}%` }} 
                />
              </div>
              <div className="text-[7.5px] text-gray-500 font-mono mt-0.5 text-right select-none">
                {diag.resources ? `${diag.resources.usedMemGB}/${diag.resources.totalMemGB} GB` : ''}
              </div>
            </div>

            <div className="border-t border-white/[0.02] pt-1.5 space-y-1 text-[9.5px]">
              <div>🌐 Platform: <span className="text-gray-400">{diag.resources ? `${diag.resources.platform} (${diag.resources.arch})` : 'N/A'}</span></div>
              <div>⏱️ Uptime: <span className="text-gray-400">{diag.resources ? `${diag.resources.uptimeHours} hrs` : 'N/A'}</span></div>
            </div>
          </div>
        </div>
      )}

      {healLogs.length > 0 && (
        <div className="p-3 bg-black/40 border border-white/[0.04] rounded-xl space-y-1 max-h-32 overflow-y-auto text-[9px] font-mono text-gray-400 select-text">
          {healLogs.map((log, idx) => (
            <div key={idx} className={log.includes('Failed') ? 'text-rose-400' : log.includes('success') || log.includes('installed') ? 'text-emerald-400' : 'text-gray-400'}>
              🚀 {log}
            </div>
          ))}
        </div>
      )}

      {errors.length > 0 && (
        <div className="border-t border-white/[0.04] pt-3.5 space-y-2.5">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
            ⚠️ Recent Swarm Error Vault resolutions
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {errors.map(err => (
                <button
                  key={err.filename}
                  onClick={() => loadErrorContent(err.filename)}
                  className={`w-full text-left p-2 rounded-lg border text-[9px] font-mono transition-all cursor-pointer block truncate ${
                    selectedError?.filename === err.filename
                      ? "bg-rose-950/20 border-rose-500/30 text-rose-300"
                      : "bg-white/[0.01] border-white/[0.03] text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]"
                  }`}
                >
                  🔴 {err.title.substring(0, 35)}{err.title.length > 35 ? '...' : ''} ({new Date(err.mtime).toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit' })})
                </button>
              ))}
            </div>
            <div className="bg-black/30 border border-white/[0.03] rounded-xl p-3 max-h-32 overflow-y-auto text-[9px] font-mono text-gray-400 select-text">
              {selectedError ? (
                <div>
                  <div className="font-bold text-white mb-2 border-b border-white/[0.04] pb-1">{selectedError.filename}</div>
                  <pre className="whitespace-pre-wrap leading-relaxed">{selectedError.content}</pre>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-600 select-none">Select an error log to view symptoms & resolution details.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── BROWSER CONTROL PANEL ─────────── */
function BrowserPanel() {
  const [url, setUrl] = useState('');
  const [browserLog, setBrowserLog] = useState<string[]>([]);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const browse = async (action: string) => {
    try {
      const res = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, url }),
      });
      const data = await res.json();
      setBrowserLog(prev => [...prev.slice(-4), `${action}: ${data.message || data.success || 'ok'}`]);
      if (action === 'screenshot' && data.success && data.path) {
        setScreenshotUrl(`${data.path}?t=${Date.now()}`);
      }
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
      {screenshotUrl && (
        <div className="rounded-xl overflow-hidden border border-white/[0.05] bg-black/30 mt-1">
          <img src={screenshotUrl} alt="Browser Viewport" className="w-full h-auto max-h-48 object-contain select-none" />
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
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Workflow size={10} className="text-orange-400" /> n8n Workflows
        </div>
        <a 
          href="http://localhost:5678" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-orange-400 hover:text-orange-300 transition-all font-mono text-[8px] uppercase tracking-wide flex items-center gap-0.5"
        >
          🌐 Open External n8n <ExternalLink size={8} />
        </a>
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
  const [crons, setCrons] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newInterval, setNewInterval] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchCrons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crons');
      if (res.ok) {
        const data = await res.json();
        setCrons(data.crons || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveCrons = async (updatedCrons: any[]) => {
    setCrons(updatedCrons);
    try {
      await fetch('/api/crons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crons: updatedCrons }),
      });
    } catch (e) {
      console.error('Failed to save crons:', e);
    }
  };

  useEffect(() => {
    fetchCrons();
  }, []);

  const addCron = () => {
    if (!newName.trim()) return;
    const updated = [...crons, { id: `c-${Date.now()}`, name: newName, interval: newInterval || 'manual', status: 'idle', next: 'not scheduled' }];
    saveCrons(updated);
    setNewName('');
    setNewInterval('');
    setShowAdd(false);
  };

  const toggleCron = (id: string) => {
    const updated = crons.map(c => c.id === id ? { ...c, status: c.status === 'running' ? 'idle' : 'running', next: c.status === 'idle' ? 'pending' : '-' } : c);
    saveCrons(updated);
  };

  const deleteCron = (id: string) => {
    const updated = crons.filter(c => c.id !== id);
    saveCrons(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
        <span className="flex items-center gap-1.5"><Clock size={10} className="text-orange-400" /> Cron Jobs {loading && "⏳"}</span>
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
              <div className="text-gray-600 text-[8px]">{c.interval} {c.next ? `· ${c.next}` : ''}</div>
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
  const [todos, setTodos] = useState<any[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchTodos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/todos');
      if (res.ok) {
        const data = await res.json();
        setTodos(data.todos || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveTodos = async (updatedTodos: any[]) => {
    setTodos(updatedTodos);
    try {
      await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todos: updatedTodos }),
      });
    } catch (e) {
      console.error('Failed to save todos:', e);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const addTodo = () => {
    if (!newTodo.trim()) return;
    const updated = [...todos, { id: `t-${Date.now()}`, text: newTodo, done: false, priority: 'medium' }];
    saveTodos(updated);
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    const updated = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    saveTodos(updated);
  };

  const deleteTodo = (id: string) => {
    const updated = todos.filter(t => t.id !== id);
    saveTodos(updated);
  };

  const priorityColor: Record<string, string> = { high: 'text-red-400', medium: 'text-yellow-400', low: 'text-gray-400' };

  return (
    <div className="space-y-2">
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
        <CheckCircle2 size={10} className="text-green-400" /> Todo List {loading && "⏳"}
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

/* ─────────── SYSTEM EVOLUTION HUB PANEL ─────────── */
function SystemEvolutionPanel() {
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [evolving, setEvolving] = useState(false);
  const [evolveStatus, setEvolveStatus] = useState("");

  const fetchBrief = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/evolution/status");
      if (res.ok) {
        const data = await res.json();
        setBrief(data.content || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyUpgrade = async () => {
    if (!confirm("Are you sure you want to trigger the Auto-Evolution Upgrade? This will programmatically update codebase components, increment version number, and push to Git.")) return;
    setEvolving(true);
    setEvolveStatus("Executing evolution scanner scripts...");
    try {
      const res = await fetch("/api/evolution/apply-upgrade", { method: "POST" });
      if (res.ok) {
        setEvolveStatus("Evolved successfully! Page will refresh.");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const data = await res.json();
        setEvolveStatus(`Failed: ${data.error || "Unknown error"}`);
      }
    } catch (e: any) {
      setEvolveStatus(`Error: ${e.message}`);
    } finally {
      setEvolving(false);
    }
  };

  useEffect(() => {
    fetchBrief();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-white/5">
        <span className="text-[9px] text-gray-400 font-mono">STATUS: SCAN RUNS AT 3 AM DAILY</span>
        <button
          type="button"
          onClick={fetchBrief}
          disabled={loading}
          className="px-2 py-0.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded text-[9px] hover:text-white cursor-pointer transition-all"
        >
          {loading ? "Refreshing..." : "Refresh Status"}
        </button>
      </div>

      <div className="text-[11px] leading-relaxed text-gray-300 font-mono bg-black/40 border border-white/[0.02] p-3.5 rounded-xl max-h-60 overflow-y-auto whitespace-pre-wrap select-text custom-scrollbar">
        {brief || "No update brief available."}
      </div>

      {brief && brief.includes("🌟 Newly Discovered Models") && (
        <div className="pt-1.5 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleApplyUpgrade}
            disabled={evolving}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 font-sans"
          >
            🧬 {evolving ? "Evolving System..." : "Apply Auto-Upgrade & Evolve"}
          </button>
          {evolveStatus && (
            <div className="text-[9px] font-mono text-purple-400 text-center animate-pulse">{evolveStatus}</div>
          )}
        </div>
      )}

      <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-3 text-[10px] leading-relaxed text-indigo-200">
        📢 <strong>Antigravity Sync Protocol:</strong> You can copy recommendations above and instruct Antigravity in the chat window:
        <span className="block mt-1 font-mono text-[9px] bg-black/30 p-1.5 rounded border border-indigo-500/20 select-all">
          "Run self-evolution updates from the 3am scanner"
        </span>
        to trigger automated workspace edits and codebase updates.
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
    <div className="space-y-3">
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

      {/* GitHub Backup */}
      <div className="pt-2.5 border-t border-white/[0.05] space-y-1.5">
        <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
          <span>📦 GitHub Repository Sync</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Optional commit message..."
            id="git-commit-msg"
            className="flex-1 bg-black/40 border border-white/[0.05] rounded px-2 py-1 text-[8px] text-gray-300 focus:outline-none focus:border-white/10"
          />
          <button
            onClick={async () => {
              const input = document.getElementById('git-commit-msg') as HTMLInputElement;
              const msg = input ? input.value : '';
              const btn = document.getElementById('git-backup-btn') as HTMLButtonElement;
              if (btn) {
                btn.disabled = true;
                btn.innerText = 'Syncing...';
              }
              try {
                const res = await fetch('/api/git/backup', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ message: msg })
                });
                const data = await res.json();
                if (data.success) {
                  alert('Sync Complete!\n\nCommit: ' + data.commit);
                } else {
                  alert('Error: ' + data.error);
                }
              } catch (e: any) {
                alert('Sync Failed: ' + e.message);
              } finally {
                if (btn) {
                  btn.disabled = false;
                  btn.innerText = 'Push Backup';
                }
                if (input) input.value = '';
              }
            }}
            id="git-backup-btn"
            className="px-2.5 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-[8px] font-bold cursor-pointer transition-colors"
          >
            Push Backup
          </button>
        </div>
      </div>

      {/* Background Agent Section */}
      <BackgroundAgentPanel />

      {/* AI Providers Diagnostic Console */}
      <AIProvidersDiagnosticConsole />
    </div>
  );
}

/* ─────────── AI PROVIDERS DIAGNOSTIC CONSOLE ─────────── */
function AIProvidersDiagnosticConsole() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testConnections = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/providers/status');
      if (res.ok) {
        setProviders(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch provider status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testConnections();
    const interval = setInterval(testConnections, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pt-2.5 border-t border-white/[0.05] space-y-2">
      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
        <span>📶 AI API Diagnostics & Fallbacks</span>
        <button
          onClick={testConnections}
          disabled={loading}
          className="text-[8px] text-teal-400 hover:text-teal-300 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Testing...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {providers.map((p, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between bg-black/30 border border-white/[0.03] rounded px-2 py-1 text-[8px] font-mono hover:bg-black/40 transition-colors"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white">{p.name}</span>
                <span className="text-[7.5px] text-gray-500">({p.type})</span>
              </div>
              <div className="text-[7px] text-gray-400">
                Model: <span className="text-gray-300">{p.model}</span>
                {p.keysCount !== undefined && ` | Keys: ${p.keysCount}`}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {p.online && p.latency !== undefined && (
                <span className="text-[7px] text-gray-500">{p.latency}ms</span>
              )}
              <span className={`w-1.5 h-1.5 rounded-full ${
                !p.configured ? 'bg-gray-600' :
                p.online ? 'bg-green-500 shadow-[0_0_4px_#22c55e]' :
                'bg-red-500 shadow-[0_0_4px_#ef4444]'
              }`} title={!p.configured ? 'Not Configured' : p.online ? 'Online' : 'Offline/Depleted'} />
            </div>
          </div>
        ))}
        {providers.length === 0 && (
          <div className="text-center py-2 text-[8px] text-gray-600 font-mono">No diagnostic data. Click refresh.</div>
        )}
      </div>
    </div>
  );
}

/* ─────────── BACKGROUND AGENT MANAGER ─────────── */
function BackgroundAgentPanel() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/background-agent/status');
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch (_) {}
  };

  const triggerScan = async () => {
    setLoading(true);
    setMsg('Triggering scan...');
    try {
      const res = await fetch('/api/background-agent/trigger', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setMsg(data.message);
        setTimeout(() => setMsg(''), 4000);
        fetchStatus();
      }
    } catch (e: any) {
      setMsg('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return <div className="text-[9px] text-gray-500 py-1">Loading agent status...</div>;

  return (
    <div className="pt-2.5 border-t border-white/[0.05] space-y-2">
      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
        <span>🔄 24/7 Research & Evolution Daemon</span>
        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
          status.status === 'researching' ? 'bg-amber-500/20 text-amber-400' :
          status.status === 'user-active' ? 'bg-blue-500/20 text-blue-400' :
          status.status === 'idle-passive' ? 'bg-teal-500/20 text-teal-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {(status.status || 'offline').toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[8px] text-gray-400 font-mono bg-black/20 rounded p-1.5 border border-white/[0.03]">
        <div>Idle Time: <span className="text-white">{status.idleTimeSeconds || 0}s</span></div>
        <div>Last Run: <span className="text-white">{status.lastIntensiveRun ? new Date(status.lastIntensiveRun).toLocaleTimeString() : 'Never'}</span></div>
        <div className="col-span-2">Mode: <span className="text-gray-300">{(status.idleTimeSeconds || 0) >= 1800 ? 'Deep Evolution (Idle)' : 'Passive Monitoring'}</span></div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={triggerScan}
          disabled={loading}
          className="flex-1 px-2.5 py-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white rounded text-[8px] font-bold cursor-pointer transition-colors"
        >
          {loading ? 'Triggering...' : 'Force Intensive Scan'}
        </button>
      </div>
      {msg && <div className="text-[8px] text-teal-400 font-mono">{msg}</div>}

      <div className="space-y-1">
        <div className="text-[8px] text-gray-500 font-bold uppercase">Activity Log:</div>
        <div className="bg-black/40 border border-white/[0.05] rounded p-1.5 max-h-24 overflow-y-auto text-[7.5px] font-mono text-gray-400 space-y-0.5">
          {(status.logs || []).map((log: string, idx: number) => (
            <div key={idx} className="whitespace-pre-wrap">{log}</div>
          ))}
          {(!status.logs || status.logs.length === 0) && <div>No logs yet.</div>}
        </div>
      </div>
    </div>
  );
}


/* ─────────── GEMINI API KEYS MANAGER ─────────── */
function GeminiKeysPanel() {
  const [keys, setKeys] = useState<string[]>([]);
  const [newKey, setNewKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState('');

  const loadKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gemini-keys');
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch (_) {}
    finally { setLoading(false); }
  };

  const saveKeys = async (updatedKeys: string[]) => {
    try {
      const res = await fetch('/api/gemini-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: updatedKeys })
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
        setSaved('Saved!');
        setTimeout(() => setSaved(''), 2000);
      }
    } catch (_) {
      setSaved('Error saving');
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleAdd = () => {
    if (!newKey.trim()) return;
    const updated = [...keys, newKey.trim()];
    saveKeys(updated);
    setNewKey('');
  };

  const handleDelete = (index: number) => {
    const updated = keys.filter((_, i) => i !== index);
    saveKeys(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
        <span className="flex items-center gap-1">🔑 Gemini API Keys ({keys.length})</span>
        <div className="flex items-center gap-1.5">
          {loading && <span className="text-[8px] text-gray-400">...</span>}
          {saved && <span className="text-[8px] text-green-400">{saved}</span>}
        </div>
      </div>
      
      <div className="space-y-1">
        {keys.map((key, i) => (
          <div key={i} className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-black/40 border border-white/[0.03] text-[9px] font-mono">
            <span className="text-gray-400 truncate w-[180px]">
              {key.length > 12 ? `${key.slice(0, 6)}...${key.slice(-6)}` : key}
            </span>
            <button 
              onClick={() => handleDelete(i)} 
              className="text-red-400 hover:text-red-300 hover:scale-105 cursor-pointer text-[8px] border-none bg-transparent"
              title="Delete key"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-1 pt-1">
        <input 
          type="text" 
          placeholder="Add Gemini API Key (AIzaSy...)" 
          value={newKey} 
          onChange={e => setNewKey(e.target.value)} 
          className="flex-1 bg-black/40 border border-white/[0.05] rounded px-2 py-1 text-[9px] text-gray-300 font-mono focus:outline-none focus:border-white/10"
        />
        <button 
          onClick={handleAdd} 
          className="bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 rounded px-2.5 py-1 text-[9px] font-semibold transition-all cursor-pointer"
        >
          Add
        </button>
      </div>
      <div className="text-[8px] text-gray-500 italic select-none">
        Keys rotate automatically.
      </div>
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

/* ─────────── DIAGNOSTICS & SELF-HEALING HUB ─────────── */
function DiagnosticsPanel() {
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const fetchErrors = async () => {
    try {
      const res = await fetch('/api/diagnostics/errors');
      if (res.ok) {
        const data = await res.json();
        setErrors(data.errors || []);
      }
    } catch (_) {}
  };

  const clearErrors = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/diagnostics/clear-errors', { method: 'POST' });
      if (res.ok) {
        setErrors([]);
        setStatusMsg('Errors cleared!');
        setTimeout(() => setStatusMsg(''), 3000);
      }
    } catch (_) {}
    finally { setLoading(false); }
  };

  const runSwarmTest = async () => {
    setTesting(true);
    setStatusMsg('Running diagnostics swarm simulation...');
    try {
      const res = await fetch('/api/diagnostics/test-swarm', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMsg('Swarm simulation successful! All agents healthy.');
      } else {
        setStatusMsg('Swarm simulation error logged.');
      }
      fetchErrors();
    } catch (_) {
      setStatusMsg('Swarm simulation failed.');
    } finally {
      setTesting(false);
      setTimeout(() => setStatusMsg(''), 5000);
    }
  };

  useEffect(() => {
    fetchErrors();
    const interval = setInterval(fetchErrors, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
        <span className="flex items-center gap-1.5">🛡️ Self-Healing Diagnostics</span>
        <div className="flex gap-1.5 items-center">
          {statusMsg && <span className="text-[8px] text-indigo-400 font-mono animate-pulse">{statusMsg}</span>}
          <button onClick={fetchErrors} className="text-[8px] text-gray-500 hover:text-gray-300 cursor-pointer">Refresh</button>
        </div>
      </div>

      <div className="space-y-1.5">
        {errors.length === 0 ? (
          <div className="text-center py-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-[9.5px] text-emerald-400 font-mono">
            💚 System online: 0 errors detected
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {errors.map((err: any) => (
              <div key={err.id} className="p-2.5 bg-red-500/5 border border-red-500/15 rounded-xl space-y-1 text-left font-mono">
                <div className="flex justify-between items-start text-[8px]">
                  <span className="text-red-400 font-bold uppercase">🚨 Runtime Error</span>
                  <span className="text-gray-500">{new Date(err.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-[9px] text-gray-300 break-words leading-normal">{err.error_message}</div>
                {err.stack_trace && (
                  <div className="text-[7.5px] text-gray-500 max-h-12 overflow-y-auto leading-normal bg-black/20 p-1 rounded">
                    {err.stack_trace}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={runSwarmTest}
          disabled={testing}
          className="py-2 px-3 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/25 hover:border-indigo-500/40 text-indigo-300 rounded-xl text-[9px] font-bold uppercase cursor-pointer transition-all select-none text-center"
        >
          {testing ? 'Simulating...' : '🔥 Swarm Test'}
        </button>
        <button
          onClick={clearErrors}
          disabled={loading || errors.length === 0}
          className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/45 text-red-400 rounded-xl text-[9px] font-bold uppercase cursor-pointer transition-all select-none text-center disabled:opacity-55 disabled:cursor-not-allowed"
        >
          Clear Logs
        </button>
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
          const s = status?.agents?.[a.id]?.status || a.status;
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
  const providers = [
    { id: 'openrouter/owl-alpha', name: 'Owl Alpha', ctx: '1M', free: false },
    { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Reasoning)', ctx: '128K', free: true },
    { id: 'qwen/qwen-2.5-coder-32b-instruct:free', name: 'Qwen 2.5 Coder 32B', ctx: '128K', free: true },
    { id: 'deepseek/deepseek-v4-flash:free', name: 'DeepSeek V4 Flash', ctx: '1M', free: true },
    { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder 480B', ctx: '1M', free: true },
    { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'NVIDIA Nemotron 3 Super', ctx: '1M', free: true },
    { id: 'moonshotai/kimi-k2.6:free', name: 'Kimi K2.6', ctx: '262K', free: true },
    { id: 'google/gemma-4-26b-a4b-it:free', name: 'Gemma 4 26B A4B', ctx: '262K', free: true },
    { id: 'openai/gpt-oss-120b:free', name: 'GPT-OSS 120B', ctx: '131K', free: true },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B', ctx: '131K', free: true },
  ];

  const [activeProvider, setActiveProvider] = useState('openrouter/owl-alpha');
  
  useEffect(() => {
    const fetchActiveModel = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          const match = data.content?.match(/default:\s*([^\s\n]+)/);
          if (match && match[1]) {
            const matchedModel = match[1].trim();
            const exists = providers.some(p => p.id === matchedModel);
            if (exists) {
              setActiveProvider(matchedModel);
            } else {
              setActiveProvider('openrouter/owl-alpha');
            }
          }
        }
      } catch (_) {}
    };
    fetchActiveModel();
  }, []);
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

function VaultPanel() {
  const [vaultMode, setVaultMode] = useState<"notes" | "db">("notes");
  const [notes, setNotes] = useState<any[]>([]);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // DB States
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [sqlQuery, setSqlQuery] = useState<string>("");
  const [dbRows, setDbRows] = useState<any[]>([]);
  const [dbColumns, setDbColumns] = useState<string[]>([]);
  const [dbError, setDbError] = useState<string>("");
  const [dbLoading, setDbLoading] = useState<boolean>(false);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vault');
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch vault notes:", e);
    } finally {
      setLoading(false);
    }
  };

  const selectNote = async (filename: string) => {
    try {
      const res = await fetch(`/api/vault?file=${encodeURIComponent(filename)}`);
      const data = await res.json();
      setSelectedNote(data);
    } catch (e) {
      console.error("Failed to load note content:", e);
    }
  };

  const fetchTables = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/db/tables');
      const data = await res.json();
      if (data.tables) {
        setTables(data.tables);
        if (data.tables.length > 0 && !selectedTable) {
          const firstTable = data.tables[0].name;
          setSelectedTable(firstTable);
          const initialQuery = `SELECT * FROM ${firstTable} LIMIT 50;`;
          setSqlQuery(initialQuery);
          runQuery(initialQuery, firstTable);
        }
      }
    } catch (e) {
      console.error("Failed to fetch tables:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTable = (tableName: string) => {
    setSelectedTable(tableName);
    const initialQuery = `SELECT * FROM ${tableName} LIMIT 50;`;
    setSqlQuery(initialQuery);
    runQuery(initialQuery, tableName);
  };

  const runQuery = async (queryToRun: string, overrideTable?: string) => {
    setDbLoading(true);
    setDbError("");
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryToRun })
      });
      const data = await res.json();
      if (res.ok && data.rows) {
        setDbRows(data.rows);
        if (data.rows.length > 0) {
          setDbColumns(Object.keys(data.rows[0]));
        } else {
          const currentT = overrideTable || selectedTable;
          const matchingTable = tables.find(t => t.name === currentT);
          if (matchingTable) {
            setDbColumns(matchingTable.columns.map((c: any) => c.name));
          } else {
            setDbColumns([]);
          }
        }
      } else {
        setDbError(data.error || "Failed to execute query");
        setDbRows([]);
        setDbColumns([]);
      }
    } catch (e: any) {
      setDbError(e.message || "Network error executing query");
      setDbRows([]);
      setDbColumns([]);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (vaultMode === "notes") {
      fetchNotes();
    } else {
      fetchTables();
    }
  }, [vaultMode]);

  const filteredNotes = notes.filter(n => 
    n.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTables = tables.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex overflow-hidden min-h-0 bg-[#04040c]/15">
      {/* Left panel: List notes or tables */}
      <div className="w-80 border-r border-white/[0.05] flex flex-col shrink-0 bg-[#060610]/45">
        {/* Toggle Mode */}
        <div className="p-3 border-b border-white/[0.05] flex flex-col gap-3">
          <div className="flex bg-white/[0.02] border border-white/[0.05] rounded-xl p-1 gap-1">
            <button
              onClick={() => setVaultMode("notes")}
              className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                vaultMode === "notes"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              📝 File Notes
            </button>
            <button
              onClick={() => setVaultMode("db")}
              className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                vaultMode === "db"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              🗄️ SQLite DB
            </button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
              <input
                type="text"
                placeholder={vaultMode === "notes" ? "Search memory..." : "Search tables..."}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/[0.05] focus:border-indigo-500/30 rounded-lg pl-8 pr-2.5 py-1.5 text-[11px] text-white focus:outline-none placeholder-gray-600 font-mono"
              />
            </div>
            <button
              onClick={vaultMode === "notes" ? fetchNotes : fetchTables}
              className="p-1.5 rounded-lg border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] text-gray-400 cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-2 space-y-1">
          {vaultMode === "notes" ? (
            filteredNotes.length === 0 ? (
              <div className="text-[10px] text-gray-600 text-center py-8 select-none">No memories matching search.</div>
            ) : (
              filteredNotes.map(n => {
                const isLearned = n.name.includes('experience') || n.name.includes('from-orchestrator') || n.name.includes('error') || n.name.includes('knowledge');
                return (
                  <button
                    key={n.name}
                    onClick={() => selectNote(n.name)}
                    className={`w-full text-left p-2.5 rounded-xl border text-[11px] transition-all cursor-pointer block ${
                      selectedNote?.name === n.name
                        ? "bg-indigo-600/15 border-indigo-500/30 text-white shadow-md"
                        : "bg-white/[0.01] border-white/[0.03] text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="font-semibold truncate flex items-center gap-1.5">
                      {isLearned ? "💡" : "📝"} {n.name}
                    </div>
                    <div className="text-[9px] text-gray-500 font-mono mt-1.5 flex justify-between select-none">
                      <span>{Math.round(n.sizeBytes / 102) / 10} KB</span>
                      <span>{new Date(n.mtime).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })
            )
          ) : (
            filteredTables.length === 0 ? (
              <div className="text-[10px] text-gray-600 text-center py-8 select-none">No tables matching search.</div>
            ) : (
              filteredTables.map(t => (
                <button
                  key={t.name}
                  onClick={() => handleSelectTable(t.name)}
                  className={`w-full text-left p-2.5 rounded-xl border text-[11px] transition-all cursor-pointer block ${
                    selectedTable === t.name
                      ? "bg-indigo-600/15 border-indigo-500/30 text-white shadow-md"
                      : "bg-white/[0.01] border-white/[0.03] text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="font-semibold truncate flex items-center gap-1.5">
                    📊 {t.name}
                  </div>
                  <div className="text-[9px] text-gray-500 font-mono mt-1 flex justify-between select-none">
                    <span>{t.columns.length} columns</span>
                  </div>
                </button>
              ))
            )
          )}
        </div>
      </div>

      {/* Right panel: Content or DB results */}
      <div className="flex-grow flex flex-col bg-[#04040c]/25 overflow-hidden">
        {vaultMode === "notes" ? (
          selectedNote ? (
            <div className="flex-grow flex flex-col overflow-hidden">
              <div className="p-4 border-b border-white/[0.05] flex justify-between items-center bg-[#070713]/55">
                <div>
                  <h3 className="text-xs font-bold text-white tracking-wide font-mono">{selectedNote.name}</h3>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono font-bold block mt-1">Shared Vault Memory</span>
                </div>
              </div>
              <div className="flex-grow overflow-y-auto p-6 select-text max-w-4xl mx-auto w-full">
                <Markdown text={selectedNote.content} />
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-gray-500 p-8 select-none text-center">
              <Database size={32} className="text-gray-700 mb-3 animate-pulse" />
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Swarm Shared Memory Vault</div>
              <div className="text-[10px] text-gray-600 mt-1 max-w-xs">Select a note from the left sidebar to view its accumulated rules, learned guides, and team documents.</div>
            </div>
          )
        ) : (
          <div className="flex-grow flex flex-col overflow-hidden">
            {/* Database Control Center Header */}
            <div className="p-4 border-b border-white/[0.05] bg-[#070713]/55 flex flex-col gap-3 shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-white tracking-wide font-mono">
                    SQLite DB Inspector: <span className="text-indigo-400">{selectedTable || "aionui-backend.db"}</span>
                  </h3>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono font-bold block mt-1">
                    Direct Schema & Execution Environment
                  </span>
                </div>
                {/* Table Schema mini-info badge */}
                {selectedTable && (
                  <div className="flex gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-white/[0.02] border border-white/[0.05] text-[10px] text-gray-400 font-mono animate-fade-in">
                      Columns: {tables.find(t => t.name === selectedTable)?.columns.length || 0}
                    </span>
                  </div>
                )}
              </div>

              {/* SQL Console */}
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <textarea
                    value={sqlQuery}
                    onChange={e => setSqlQuery(e.target.value)}
                    className="w-full h-16 bg-[#04040c] border border-white/[0.07] focus:border-indigo-500/45 rounded-xl p-3 text-[11px] font-mono text-indigo-100 focus:outline-none placeholder-gray-700 resize-none shadow-inner transition-all"
                    placeholder="Enter custom SELECT query here..."
                  />
                  <button
                    onClick={() => runQuery(sqlQuery)}
                    disabled={dbLoading}
                    className="absolute right-2.5 bottom-2.5 p-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {dbLoading ? <RefreshCw size={10} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
                    Execute
                  </button>
                </div>
              </div>
            </div>

            {/* Query Results / Output view */}
            <div className="flex-grow overflow-auto p-4 bg-[#030308]/40">
              {dbError && (
                <div className="p-3.5 rounded-xl border border-red-500/25 bg-red-950/15 text-red-400 text-[10px] font-mono flex items-start gap-2.5 mb-4 max-w-4xl mx-auto shadow-sm">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">SQL Execution Failure:</span>
                    <p className="mt-1 opacity-90">{dbError}</p>
                  </div>
                </div>
              )}

              {dbLoading ? (
                <div className="h-48 flex flex-col items-center justify-center text-gray-500 select-none">
                  <RefreshCw size={24} className="animate-spin text-indigo-500 mb-2" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400/70 animate-pulse">Running SQL Statement...</span>
                </div>
              ) : dbRows.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-gray-600 select-none border border-dashed border-white/[0.03] rounded-2xl">
                  <Database size={24} className="text-gray-800 mb-2" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Empty Recordset</span>
                  <span className="text-[9px] text-gray-600 mt-1 font-mono">No data matched the query constraint or table is empty.</span>
                </div>
              ) : (
                <div className="border border-white/[0.05] rounded-xl overflow-hidden bg-[#050510]/55 shadow-lg max-w-full">
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full border-collapse text-left text-[10px] font-mono">
                      <thead>
                        <tr className="bg-white/[0.03] border-b border-white/[0.06] text-gray-400 uppercase tracking-wider select-none">
                          {dbColumns.map(col => (
                            <th key={col} className="p-2.5 px-3 font-semibold border-r border-white/[0.04]">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {dbRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-white/[0.015] transition-all text-gray-300">
                            {dbColumns.map(col => {
                              const val = row[col];
                              let displayVal = "";
                              if (val === null || val === undefined) displayVal = "NULL";
                              else if (typeof val === 'object') displayVal = JSON.stringify(val);
                              else displayVal = String(val);

                              const isNull = val === null || val === undefined;
                              return (
                                <td key={col} className="p-2.5 px-3 border-r border-white/[0.04] max-w-xs truncate" title={displayVal}>
                                  <span className={isNull ? "text-gray-600 italic font-semibold" : "font-mono"}>
                                    {displayVal}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Results count status bar */}
                  <div className="p-2 px-3 border-t border-white/[0.05] bg-white/[0.01] text-[9px] text-gray-500 font-mono flex justify-between items-center select-none">
                    <span>Fetched {dbRows.length} rows</span>
                    <span className="text-indigo-500/70 font-semibold uppercase">Execution Status: SUCCESS</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface GalaxyNode {
  id: string;
  label: string;
  source_type: string;
  val: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GalaxyLink {
  source: string;
  target: string;
  value: number;
}

function MemoryGalaxyStarMap({ allMemories }: { allMemories: any[] }) {
  const [data, setData] = useState<{ nodes: GalaxyNode[]; links: GalaxyLink[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const containerRef = useRef<SVGSVGElement>(null);
  const dragNodeRef = useRef<GalaxyNode | null>(null);

  const fetchGraph = async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/memories/graph');
      if (r.ok) {
        const d = await r.json();
        const nodes = d.nodes.map((n: any) => ({
          ...n,
          x: 400 + (Math.random() - 0.5) * 300,
          y: 200 + (Math.random() - 0.5) * 150,
          vx: 0,
          vy: 0
        }));
        setData({ nodes, links: d.links });
      }
    } catch (e) {
      console.error("Failed to fetch memory graph:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  useEffect(() => {
    if (!data || loading) return;

    let animId: number;
    const updateSimulation = () => {
      const { nodes, links } = data;
      const width = 800;
      const height = 400;
      const centerX = width / 2;
      const centerY = height / 2;
      
      const kLink = 0.08;
      const kRepulsion = 120;
      const kGravity = 0.015;
      const friction = 0.85;

      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);
          if (dist < 220) {
            const force = kRepulsion / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            if (n1 !== dragNodeRef.current) {
              n1.vx -= fx;
              n1.vy -= fy;
            }
            if (n2 !== dragNodeRef.current) {
              n2.vx += fx;
              n2.vy += fy;
            }
          }
        }
      }

      links.forEach(link => {
        const sourceNode = nodes.find(n => n.id === (typeof link.source === 'object' ? (link.source as any).id : link.source));
        const targetNode = nodes.find(n => n.id === (typeof link.target === 'object' ? (link.target as any).id : link.target));
        if (!sourceNode || !targetNode) return;

        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
        const desiredDist = 100;
        const force = (dist - desiredDist) * kLink * link.value;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (sourceNode !== dragNodeRef.current) {
          sourceNode.vx += fx;
          sourceNode.vy += fy;
        }
        if (targetNode !== dragNodeRef.current) {
          targetNode.vx -= fx;
          targetNode.vy -= fy;
        }
      });

      nodes.forEach(node => {
        if (node === dragNodeRef.current) return;

        node.vx += (centerX - node.x) * kGravity;
        node.vy += (centerY - node.y) * kGravity;

        node.vx *= friction;
        node.vy *= friction;

        const limitSpeed = 8;
        const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
        if (speed > limitSpeed) {
          node.vx = (node.vx / speed) * limitSpeed;
          node.vy = (node.vy / speed) * limitSpeed;
        }

        node.x += node.vx;
        node.y += node.vy;

        node.x = Math.max(40, Math.min(width - 40, node.x));
        node.y = Math.max(40, Math.min(height - 40, node.y));
      });

      setData({ nodes: [...nodes], links });
      animId = requestAnimationFrame(updateSimulation);
    };

    animId = requestAnimationFrame(updateSimulation);
    return () => cancelAnimationFrame(animId);
  }, [data === null, loading]);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!data) return;
    const svg = containerRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 800;
    const y = ((e.clientY - rect.top) / rect.height) * 400;

    const node = data.nodes.find(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      return dx * dx + dy * dy < 256;
    });

    if (node) {
      dragNodeRef.current = node;
      node.vx = 0;
      node.vy = 0;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragNodeRef.current) return;
    const svg = containerRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 800;
    const y = ((e.clientY - rect.top) / rect.height) * 400;

    dragNodeRef.current.x = x;
    dragNodeRef.current.y = y;
  };

  const handleMouseUp = () => {
    dragNodeRef.current = null;
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'youtube_transcript': return '#ef4444';
      case 'n8n_workflow': return '#f97316';
      case 'blog_post': return '#10b981';
      case 'system_logs': return '#3b82f6';
      default: return '#8b5cf6';
    }
  };

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center border border-white/5 bg-black/40 rounded-xl relative z-10">
        <div className="flex flex-col items-center gap-2 font-mono text-xs text-indigo-400">
          <RefreshCw size={20} className="animate-spin" />
          <span>Generating Star-Map coordinates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10">
      <div className="border border-white/10 rounded-xl bg-black/60 relative overflow-hidden h-[400px] shadow-[inset_0_0_40px_rgba(99,102,241,0.06)]">
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.15) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '20px 20px, 40px 40px, 40px 40px'
          }}
        />

        <svg
          ref={containerRef}
          viewBox="0 0 800 400"
          className="w-full h-full cursor-crosshair select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {data?.links.map((link, idx) => {
            const sourceNode = data.nodes.find(n => n.id === (typeof link.source === 'object' ? (link.source as any).id : link.source));
            const targetNode = data.nodes.find(n => n.id === (typeof link.target === 'object' ? (link.target as any).id : link.target));
            if (!sourceNode || !targetNode) return null;
            return (
              <line
                key={idx}
                x1={sourceNode.x}
                y1={sourceNode.y}
                x2={targetNode.x}
                y2={targetNode.y}
                stroke="rgba(99,102,241,0.25)"
                strokeWidth={1 + link.value * 2}
                strokeDasharray={sourceNode.source_type === 'youtube_transcript' ? "2 2" : "none"}
              />
            );
          })}

          {data?.nodes.map((node) => {
            const color = getNodeColor(node.source_type);
            const radius = node.val + 4;
            return (
              <g
                key={node.id}
                className="cursor-pointer group"
                onClick={() => setSelectedNode(node)}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius + 6}
                  fill={color}
                  className="opacity-0 group-hover:opacity-20 transition-all duration-300 filter blur-[2px]"
                />
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  fill={color}
                  className="transition-all duration-300 filter drop-shadow-[0_0_4px_rgba(99,102,241,0.5)]"
                />
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={2}
                  fill="#ffffff"
                />
                <text
                  x={node.x}
                  y={node.y - radius - 5}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.6)"
                  className="text-[8px] font-mono select-none pointer-events-none group-hover:fill-white group-hover:font-bold"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="absolute bottom-3 left-3 bg-black/80 border border-white/[0.05] rounded-md p-2 flex flex-col gap-1 text-[8px] font-mono text-gray-400 select-none">
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> YouTube Transcript</div>
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> N8N Schema</div>
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Blog Content</div>
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> System Logs</div>
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Manual / Other</div>
        </div>

        <button
          onClick={fetchGraph}
          className="absolute top-3 right-3 p-1.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-lg transition-all text-[9px] font-mono cursor-pointer"
        >
          ↻ Refresh
        </button>
      </div>

      {selectedNode && (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center p-6 z-30">
          <div className="bg-[#0b0b1e] border border-white/10 rounded-xl p-5 max-w-lg w-full flex flex-col gap-4 relative animate-fade-in shadow-2xl">
            <div className="flex justify-between items-start border-b border-white/10 pb-2">
              <div>
                <span className="text-[8px] uppercase font-bold tracking-wider font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {selectedNode.source_type}
                </span>
                {selectedNode.source_id && (
                  <span className="text-[8px] font-mono text-gray-500 ml-2">ID: {selectedNode.source_id}</span>
                )}
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-500 hover:text-white transition-colors font-bold text-xs"
              >
                ✕ Close
              </button>
            </div>
            <div className="overflow-y-auto max-h-56 pr-1">
              <p className="text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-wrap select-text bg-black/40 p-3 rounded border border-white/5">
                {(() => {
                  const match = allMemories.find(m => m.id === selectedNode.id);
                  return match ? match.text : selectedNode.label;
                })()}
              </p>
            </div>
            <div className="text-[8px] text-gray-500 font-mono flex justify-between items-center">
              <span>Node ID: {selectedNode.id}</span>
              <span>Ingested: {new Date(selectedNode.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── SEMANTIC VECTOR MEMORY PANEL ─────────── */
function VectorMemoryPanel() {
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(5);
  const [results, setResults] = useState<any[]>([]);
  const [allMemories, setAllMemories] = useState<any[]>([]);
  const [memorySubTab, setMemorySubTab] = useState<'inventory' | 'galaxy'>('galaxy');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingIngest, setLoadingIngest] = useState(false);

  const [newText, setNewText] = useState("");
  const [newSourceType, setNewSourceType] = useState("manual");
  const [newSourceId, setNewSourceId] = useState("");

  const fetchAllMemories = async () => {
    try {
      const r = await fetch('/api/memories');
      if (r.ok) {
        const d = await r.json();
        setAllMemories(d);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAllMemories();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setLoadingSearch(true);
    try {
      const r = await fetch(`/api/memories/search?q=${encodeURIComponent(q)}&limit=${limit}`);
      if (r.ok) {
        const d = await r.json();
        setResults(d);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setLoadingIngest(true);
    try {
      const r = await fetch('/api/memories/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText, source_type: newSourceType, source_id: newSourceId })
      });
      if (r.ok) {
        setNewText("");
        setNewSourceId("");
        fetchAllMemories();
        alert("Knowledge ingested and embedded successfully!");
      }
    } catch (e: any) {
      console.error(e);
      alert("Failed to ingest memory: " + e.message);
    } finally {
      setLoadingIngest(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this memory?")) return;
    try {
      const r = await fetch(`/api/memories/${id}`, { method: 'DELETE' });
      if (r.ok) {
        fetchAllMemories();
        setResults(prev => prev.filter(item => item.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#070713]/40">
      <div className="p-4 border-b border-white/[0.05] flex justify-between items-center bg-[#070713]/55">
        <div>
          <h3 className="text-xs font-bold text-white tracking-wide font-mono flex items-center gap-2">
            <Database size={14} className="text-indigo-400 animate-pulse" />
            SEMANTIC VECTOR MEMORY (LOCAL RAG)
          </h3>
          <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono font-bold block mt-1">
            Store knowledge chunks as vector embeddings and run similarity queries
          </span>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Col: Ingest Form */}
          <div className="bg-[#0b0b1e]/90 border border-white/[0.04] rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            <h4 className="text-xs font-bold text-indigo-300 font-mono tracking-wide uppercase mb-4 flex items-center gap-1.5">
              <Plus size={12} /> Ingest New Knowledge
            </h4>
            <form onSubmit={handleIngest} className="space-y-4 relative z-10">
              <div>
                <label className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Knowledge Text</label>
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Paste rules, documentation, competitor info, or other knowledge blocks here..."
                  className="w-full h-44 bg-black/40 border border-white/10 rounded-md p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Source Type</label>
                  <select
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="manual">Manual Entry</option>
                    <option value="youtube_transcript">YouTube Transcript</option>
                    <option value="n8n_workflow">N8N Schema</option>
                    <option value="blog_post">Blog Content</option>
                    <option value="system_logs">System Logs</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Source ID (Optional)</label>
                  <input
                    type="text"
                    value={newSourceId}
                    onChange={(e) => setNewSourceId(e.target.value)}
                    placeholder="e.g. videoId or post_url"
                    className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loadingIngest || !newText.trim()}
                className="w-full px-4 py-2 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:text-white hover:bg-indigo-500/20 text-xs font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(99,102,241,0.12)] flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {loadingIngest ? "Embedding..." : "Generate Embedding & Ingest"}
              </button>
            </form>
          </div>

          {/* Right Col: Query Form & Search Results */}
          <div className="bg-[#0b0b1e]/90 border border-white/[0.04] rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md flex flex-col h-full">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            <h4 className="text-xs font-bold text-indigo-300 font-mono tracking-wide uppercase mb-4 flex items-center gap-1.5">
              <Search size={12} /> Semantic Memory Search
            </h4>
            <form onSubmit={handleSearch} className="space-y-4 relative z-10 mb-4">
              <div className="flex gap-2">
                <div className="flex-grow relative">
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Ask anything (e.g. 'how does SambaNova cascade work?')..."
                    className="w-full bg-black/40 border border-white/10 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
                    required
                  />
                  <Search size={12} className="absolute left-2.5 top-2.5 text-gray-500" />
                </div>
                <div className="w-20">
                  <input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value) || 5)}
                    min={1}
                    max={20}
                    className="w-full bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white text-center focus:outline-none"
                    title="Max results"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loadingSearch || !q.trim()}
                  className="px-4 py-1.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:text-white hover:bg-indigo-500/20 text-xs font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(99,102,241,0.12)] flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loadingSearch ? "Searching..." : "Search"}
                </button>
              </div>
            </form>

            {/* Results Container */}
            <div className="flex-grow overflow-y-auto space-y-3 max-h-96 pr-1 relative z-10">
              {results.length === 0 && !loadingSearch && (
                <div className="text-center py-12 border border-dashed border-white/5 rounded-xl bg-black/10">
                  <p className="text-xs text-gray-600 font-mono">No similarity matches yet. Run a search to retrieve memories.</p>
                </div>
              )}
              {results.map((res, idx) => (
                <div key={idx} className="border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] p-3 rounded-lg flex flex-col gap-2 relative transition-all group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] uppercase font-bold tracking-wider font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {res.source_type}
                      </span>
                      {res.source_id && (
                        <span className="text-[8px] font-mono text-gray-500">ID: {res.source_id}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-green-400 bg-green-500/10 border border-green-500/20 rounded px-1.5 py-0.5">
                        {(res.score * 100).toFixed(1)}% Similarity
                      </span>
                      <button
                        onClick={() => handleDelete(res.id)}
                        className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/5 rounded transition-all cursor-pointer"
                        title="Delete memory"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-wrap select-text bg-black/20 p-2 rounded border border-white/5">
                    {res.text}
                  </p>
                  <div className="flex justify-between items-center text-[8px] text-gray-500 font-mono">
                    <span>Memory ID: {res.id}</span>
                    <span className="flex items-center gap-1"><Clock size={8} /> {new Date(res.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Panel: Memories Inventory / Galaxy View */}
        <div className="bg-[#0b0b1e]/90 border border-white/[0.04] rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 border-b border-white/10 pb-3 relative z-10">
            <h4 className="text-xs font-bold text-indigo-300 font-mono tracking-wide uppercase flex items-center gap-1.5">
              <Database size={12} /> Semantic Memories Space ({allMemories.length} total)
            </h4>
            <div className="flex bg-[#04040c]/40 border border-white/[0.04] rounded-md p-1 gap-1.5">
              <button
                onClick={() => setMemorySubTab('galaxy')}
                className={`px-2.5 py-1.5 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                  memorySubTab === 'galaxy'
                    ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/35 shadow-[0_0_12px_rgba(99,102,241,0.12)]"
                    : "text-gray-400 hover:text-white border border-transparent"
                }`}
              >
                🌌 Memory Galaxy
              </button>
              <button
                onClick={() => setMemorySubTab('inventory')}
                className={`px-2.5 py-1.5 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                  memorySubTab === 'inventory'
                    ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/35 shadow-[0_0_12px_rgba(99,102,241,0.12)]"
                    : "text-gray-400 hover:text-white border border-transparent"
                }`}
              >
                📋 List Inventory
              </button>
            </div>
          </div>

          {memorySubTab === 'galaxy' ? (
            <MemoryGalaxyStarMap allMemories={allMemories} />
          ) : (
            <div className="relative z-10 overflow-x-auto max-h-80 scrollbar-none pr-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-500 text-[10px] uppercase font-mono tracking-wider font-bold">
                    <th className="py-2 px-3">Source</th>
                    <th className="py-2 px-3">Snippet</th>
                    <th className="py-2 px-3">Ingested At</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {allMemories.map((mem) => (
                    <tr key={mem.id} className="hover:bg-white/[0.01] transition-all">
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="text-[9px] uppercase font-bold tracking-wider font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {mem.source_type}
                        </span>
                        {mem.source_id && (
                          <div className="text-[8px] text-gray-500 mt-0.5 font-mono">ID: {mem.source_id}</div>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-gray-300 max-w-md truncate">
                        {mem.text}
                      </td>
                      <td className="py-2 px-3 text-gray-500 text-[10px] font-mono whitespace-nowrap">
                        {new Date(mem.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => handleDelete(mem.id)}
                          className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/5 rounded transition-all cursor-pointer inline-flex"
                          title="Delete memory"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {allMemories.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-gray-600 font-mono text-xs">
                        No memories stored yet. Paste content above to build the agent's semantic brain.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────── PAPERCLIP AGENT SWARM PANEL ─────────── */
function PaperclipPanel() {
  const [keyword, setKeyword] = useState('UK CCTV Compliance');
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  const startSwarm = async () => {
    if (running) return;
    setRunning(true);
    setLogs(["[Orchestrator] Starting Paperclip Agent Swarm Team..."]);
    setActiveStep(1);

    try {
      const res = await fetch('/api/paperclip/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword })
      });
      const data = await res.json();
      if (data.success && data.logs) {
        // Sequentially display logs to show execution progression
        for (let i = 0; i < data.logs.length; i++) {
          await new Promise(r => setTimeout(r, 1200));
          setLogs(prev => [...prev, data.logs[i]]);
          setActiveStep(Math.min(i + 1, 7));
        }
        setLogs(prev => [...prev, "🏁 Paperclip Swarm finished successfully! Output saved to Proposals folder."]);
      } else {
        setLogs(prev => [...prev, `❌ Error: ${data.error || 'Swarm failed to run'}`]);
      }
    } catch (e: any) {
      setLogs(prev => [...prev, `❌ Network Error: ${e.message}`]);
    } finally {
      setRunning(false);
      setActiveStep(0);
    }
  };

  const steps = [
    { num: 1, name: "Keyword Scout", role: "Market Intelligence", color: "text-blue-400" },
    { num: 2, name: "Content Writer", role: "Content Engine", color: "text-pink-400" },
    { num: 3, name: "On-Page Opt", role: "SEO Auditor", color: "text-indigo-400" },
    { num: 4, name: "Backlink Builder", role: "Outreach & PR", color: "text-purple-400" },
    { num: 5, name: "AI Citation", role: "Search Engine Authority", color: "text-yellow-400" },
    { num: 6, name: "Publish Bot", role: "Deployer", color: "text-emerald-400" },
    { num: 7, name: "Analytics Tracker", role: "Reporting Engine", color: "text-cyan-400" }
  ];

  return (
    <div className="flex-grow flex flex-col md:flex-row gap-6 p-6 overflow-y-auto min-h-0 bg-[#070713]/40">
      {/* Configuration & Controls */}
      <div className="flex-1 space-y-5 bg-[#0b0b1e]/90 border border-white/[0.04] p-6 rounded-2xl shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
          <Puzzle className="text-purple-400" size={16} />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Paperclip Swarm Configuration</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Target Niche / Main Keyword</label>
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              disabled={running}
              className="w-full bg-[#05050d] border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50 font-mono transition-all"
            />
          </div>

          <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 space-y-2">
            <h4 className="text-[10px] font-bold text-purple-300 uppercase font-mono">Paperclip Multi-Agent Architecture</h4>
            <p className="text-[9.5px] text-gray-400 leading-relaxed">
              Paperclip orchestrates a structured corporate hierarchy of 7 autonomous specialized agents. Tasks flow sequentially from keyword gathering to final publication and indexing, running 24/7 without manual intervention.
            </p>
          </div>

          <button
            onClick={startSwarm}
            disabled={running}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold uppercase tracking-wider font-mono shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all cursor-pointer disabled:opacity-50"
          >
            {running ? "🚀 Swarm Active..." : "⚡ Deploy Paperclip Swarm"}
          </button>
        </div>
      </div>

      {/* Visual Swarm Flow Map & Logs */}
      <div className="flex-1 flex flex-col gap-5">
        {/* Swarm Hierarchy map */}
        <div className="bg-[#0b0b1e]/90 border border-white/[0.04] p-5 rounded-2xl shadow-2xl backdrop-blur-md">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono mb-4">Swarm Workflow Sequence</h4>
          <div className="space-y-2">
            {steps.map(step => (
              <div 
                key={step.num}
                className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${
                  activeStep === step.num 
                    ? "bg-purple-500/10 border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.15)]" 
                    : "bg-white/[0.01] border-white/[0.03] opacity-60"
                }`}
              >
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold font-mono ${
                  activeStep === step.num ? "border-purple-400 bg-purple-500/20 text-purple-300" : "border-gray-700 text-gray-500"
                }`}>
                  {step.num}
                </div>
                <div className="flex-1">
                  <div className="text-[10.5px] font-bold text-white font-mono">{step.name}</div>
                  <div className="text-[8px] text-gray-500 uppercase tracking-wide font-semibold">{step.role}</div>
                </div>
                {activeStep === step.num && <span className="text-[8px] text-purple-400 animate-pulse font-mono">ACTIVE</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Live Execution Logs */}
        <div className="flex-1 bg-black/40 border border-white/[0.04] rounded-2xl p-4 flex flex-col overflow-hidden min-h-[200px]">
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-mono mb-2">Live Swarm Execution Logs</span>
          <div className="flex-grow overflow-y-auto font-mono text-[10px] text-gray-400 space-y-1.5 pr-1">
            {logs.map((log, i) => (
              <div key={i} className={log.includes('🏁') ? 'text-emerald-400 font-bold' : log.includes('❌') ? 'text-rose-400' : 'text-gray-300'}>
                &gt; {log}
              </div>
            ))}
            {logs.length === 0 && <div className="text-gray-600 text-center py-12">Press 'Deploy Paperclip Swarm' to initialize campaign logging.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── SWARM HUB & TEAM COLLABORATION WORKSPACE ─────────── */
interface SwarmHubPanelProps {
  threadLoading: Record<string, boolean>;
  chatMessages: ChatMessage[];
  setChatMode: React.Dispatch<React.SetStateAction<'collab' | 'single'>>;
  handleSendMessage: (customText?: string) => Promise<void>;
}

function SwarmHubPanel({
  threadLoading,
  chatMessages,
  setChatMode,
  handleSendMessage
}: SwarmHubPanelProps) {
  const [profile, setProfile] = useState({
    userName: 'Gary Pearce',
    seoLeadsTarget: '100',
    postFrequency: 'Daily',
    activeWorkspace: 'agent-os',
    systemFocus: 'SEO and Video Content Automation'
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [swarmObjective, setSwarmObjective] = useState("");

  const activeCollabRunning = threadLoading['collab'] || false;
  const lastMsg = chatMessages[chatMessages.length - 1];
  const activeAgentNode = activeCollabRunning ? lastMsg?.agent || 'orchestrator' : null;

  const agentsStatusList = [
    { id: "agy", name: "Antigravity CEO", role: "Strategic Lead", details: "L1 swarm trigger & safety compiler" },
    { id: "orchestrator", name: "Gemini Orchestrator", role: "Planning & Critique Hub", details: "Task decomposition & feedback loops" },
    { id: "openclaw", name: "OpenClaw Auditor", role: "SEO & Competitor Scraping", details: "Puppeteer scraping and tag analytics" },
    { id: "hermes", name: "Hermes Coder", role: "Workspace Developer", details: "Command executions & file manipulation" },
    { id: "claude", name: "Claude Architect", role: "Refactoring Specialist", details: "Code review and software pattern checks" }
  ];

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/config/profile');
      if (res.ok) setProfile(await res.json());
    } catch (_) {}
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await fetch('/api/config/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      alert('Global Target Profile Saved successfully!');
    } catch (_) {
      alert('Failed to save profile targets.');
    } finally {
      setSavingProfile(false);
    }
  };

  const triggerSwarmCollaboration = () => {
    if (!swarmObjective.trim()) return;
    setChatMode("collab");
    handleSendMessage(swarmObjective);
    setSwarmObjective("");
  };

  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <div className="flex-grow flex flex-col md:flex-row gap-6 p-6 overflow-y-auto min-h-0">
      {/* Left panel: Profile / Target settings */}
      <div className="flex-1 space-y-5 bg-[#0b0b1e]/90 border border-white/[0.04] p-6 rounded-2xl shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <Target className="text-indigo-400" size={16} />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">User Goals & Target Ingestion</h3>
          </div>
          
          <div className="space-y-3 font-mono text-[10px]">
            <div className="space-y-1">
              <label className="text-gray-500 uppercase font-bold">Profile Owner Name</label>
              <input
                type="text"
                value={profile.userName}
                onChange={e => setProfile({...profile, userName: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-gray-500 uppercase font-bold">Monthly Leads Target</label>
              <input
                type="text"
                value={profile.seoLeadsTarget}
                onChange={e => setProfile({...profile, seoLeadsTarget: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-gray-500 uppercase font-bold">Content Post Frequency</label>
              <input
                type="text"
                value={profile.postFrequency}
                onChange={e => setProfile({...profile, postFrequency: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-gray-500 uppercase font-bold">System Focus / Niche Area</label>
              <input
                type="text"
                value={profile.systemFocus}
                onChange={e => setProfile({...profile, systemFocus: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <button
              onClick={saveProfile}
              disabled={savingProfile}
              className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase transition-all duration-300 shadow-md cursor-pointer"
            >
              {savingProfile ? "Saving Targets..." : "💾 Save Global Targets"}
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel: Swarm Team Network & Action Console */}
      <div className="flex-[2] flex flex-col gap-6 min-w-0">
        {/* Agent Node Map */}
        <div className="bg-[#0b0b1e]/90 border border-white/[0.04] p-6 rounded-2xl shadow-2xl relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center gap-2 pb-3 border-b border-white/5 mb-4">
            <Users className="text-purple-400" size={16} />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Swarm Agency Node Topology</h3>
          </div>

          <div className="mb-6 p-4 bg-black/40 border border-white/[0.04] rounded-2xl flex flex-col items-center select-none relative overflow-hidden">
            <div className="absolute top-2 left-3 text-[9px] font-mono text-gray-500 tracking-wider">Active Connectivity Graph</div>
            <svg className="w-full max-w-[480px] h-[160px]" viewBox="0 0 480 160">
              {/* Connection Lines */}
              <line x1="240" y1="20" x2="240" y2="80" stroke={activeAgentNode ? "#6366f1" : "rgba(255,255,255,0.06)"} strokeWidth={activeAgentNode ? "2" : "1"} className={activeAgentNode ? "animate-pulse" : ""} />
              <line x1="240" y1="80" x2="100" y2="80" stroke={activeAgentNode === "openclaw" ? "#10b981" : "rgba(255,255,255,0.06)"} strokeWidth={activeAgentNode === "openclaw" ? "2" : "1"} />
              <line x1="240" y1="80" x2="380" y2="80" stroke={activeAgentNode === "hermes" ? "#a855f7" : "rgba(255,255,255,0.06)"} strokeWidth={activeAgentNode === "hermes" ? "2" : "1"} />
              <line x1="240" y1="80" x2="170" y2="140" stroke={activeAgentNode === "claude" ? "#ea580c" : "rgba(255,255,255,0.06)"} strokeWidth={activeAgentNode === "claude" ? "2" : "1"} />
              
              {/* Nodes */}
              {/* Antigravity (agy) */}
              <circle cx="240" cy="20" r="16" fill="#0f0f2d" stroke="#6366f1" strokeWidth="2" />
              <text x="240" y="24" fill="#a5b4fc" fontSize="10" fontWeight="bold" textAnchor="middle">AGY</text>
              {activeAgentNode === "agy" && <circle cx="240" cy="20" r="20" fill="none" stroke="#6366f1" strokeWidth="1.5" className="animate-ping" />}

              {/* Orchestrator */}
              <circle cx="240" cy="80" r="18" fill="#0f0f2d" stroke="#3b82f6" strokeWidth="2" />
              <text x="240" y="84" fill="#93c5fd" fontSize="9" fontWeight="bold" textAnchor="middle">Gemini</text>
              {(!activeAgentNode || activeAgentNode === "orchestrator") && activeCollabRunning && <circle cx="240" cy="80" r="22" fill="none" stroke="#3b82f6" strokeWidth="1.5" className="animate-ping" />}

              {/* OpenClaw */}
              <circle cx="100" cy="80" r="16" fill="#0f0f2d" stroke="#10b981" strokeWidth="2" />
              <text x="100" y="84" fill="#a7f3d0" fontSize="8" fontWeight="bold" textAnchor="middle">Claw</text>
              {activeAgentNode === "openclaw" && <circle cx="100" cy="80" r="20" fill="none" stroke="#10b981" strokeWidth="1.5" className="animate-ping" />}

              {/* Hermes */}
              <circle cx="380" cy="80" r="16" fill="#0f0f2d" stroke="#a855f7" strokeWidth="2" />
              <text x="380" y="84" fill="#e9d5ff" fontSize="8" fontWeight="bold" textAnchor="middle">Hermes</text>
              {activeAgentNode === "hermes" && <circle cx="380" cy="80" r="20" fill="none" stroke="#a855f7" strokeWidth="1.5" className="animate-ping" />}

              {/* Claude */}
              <circle cx="170" cy="140" r="16" fill="#0f0f2d" stroke="#ea580c" strokeWidth="2" />
              <text x="170" y="144" fill="#ffedd5" fontSize="8" fontWeight="bold" textAnchor="middle">Claude</text>
              {activeAgentNode === "claude" && <circle cx="170" cy="140" r="20" fill="none" stroke="#ea580c" strokeWidth="1.5" className="animate-ping" />}
            </svg>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {agentsStatusList.map((agent, index) => {
              const isWorking = activeAgentNode === agent.id;
              return (
                <div key={index} className={`p-3 bg-white/[0.015] border rounded-xl flex flex-col justify-between transition-all select-none duration-300 ${
                  isWorking ? 'border-indigo-500/50 bg-indigo-950/20 shadow-[0_0_15px_rgba(99,102,241,0.25)] scale-[1.02]' : 'border-white/[0.03] hover:border-white/10'
                }`}>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white font-mono">{agent.name}</span>
                      <span className={`text-[7px] px-1.5 py-0.5 rounded font-extrabold uppercase font-mono tracking-wider ${
                        isWorking ? 'bg-indigo-500/20 text-indigo-300 animate-pulse' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {isWorking ? 'processing' : 'online'}
                      </span>
                    </div>
                    <span className="text-[8.5px] text-gray-500 font-medium font-sans mt-0.5 block">{agent.role}</span>
                    <p className="text-[9.5px] text-gray-400 font-sans mt-2 leading-relaxed">{agent.details}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Campaign Action Box */}
        <div className="flex-1 flex flex-col bg-[#0b0b1e]/90 border border-white/[0.04] p-6 rounded-2xl shadow-2xl relative overflow-hidden backdrop-blur-md min-h-[300px]">
          <div className="flex items-center gap-2 pb-3 border-b border-white/5 mb-4">
            <Radio className={`text-indigo-400 ${activeCollabRunning ? 'animate-pulse' : ''}`} size={16} />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Collaborative Swarm Console ({activeCollabRunning ? 'executing' : 'idle'})
            </h3>
          </div>

          <div className="space-y-4 flex-grow flex flex-col justify-between">
            <div className="space-y-2">
              <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-mono select-none block">Objective/Campaign Input</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={swarmObjective}
                  onChange={e => setSwarmObjective(e.target.value)}
                  disabled={activeCollabRunning}
                  placeholder="e.g. Generate weekly local business SEO strategy documents..."
                  className="flex-grow bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                />
                <button
                  onClick={triggerSwarmCollaboration}
                  disabled={activeCollabRunning || !swarmObjective.trim()}
                  className="px-5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-md cursor-pointer select-none"
                >
                  🚀 Run Swarm
                </button>
              </div>
            </div>

            {/* Simulated timeline execution logs */}
            <div className="flex-grow bg-black/40 border border-white/[0.05] rounded-xl p-4 font-mono text-[9.5px] text-gray-300 min-h-[160px] max-h-[220px] overflow-y-auto space-y-2 select-text custom-scrollbar">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12 text-gray-600 select-none">Enter objective and click Run Swarm to launch collaborative agent execution</div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className={`py-1 border-b border-white/[0.02] last:border-none leading-relaxed ${
                    msg.agent === 'user' ? 'text-indigo-300 font-bold' : msg.isError ? 'text-red-400 font-bold' : 'text-gray-300'
                  }`}>
                    <strong>[{msg.agent.toUpperCase()}]:</strong> {msg.msg}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoalsPanel() {
  const [goals, setGoals] = useState<any[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/goals');
      const data = await res.json();
      setGoals(data.goals || []);
    } catch (e) {
      console.error("Failed to fetch goals:", e);
    } finally {
      setLoading(false);
    }
  };

  const selectGoal = async (filename: string) => {
    try {
      const res = await fetch(`/api/goals/content?file=${encodeURIComponent(filename)}`);
      const data = await res.json();
      setSelectedGoal({ filename, content: data.content });
    } catch (e) {
      console.error("Failed to load goal content:", e);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const filteredGoals = goals.filter(g => 
    g.title.toLowerCase().includes(search.toLowerCase()) ||
    g.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex overflow-hidden min-h-0 bg-[#04040c]/15">
      {/* Left panel: List goals */}
      <div className="w-80 border-r border-white/[0.05] flex flex-col shrink-0 bg-[#060610]/45">
        <div className="p-3 border-b border-white/[0.05] flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
            <input
              type="text"
              placeholder="Search goals..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/[0.05] focus:border-indigo-500/30 rounded-lg pl-8 pr-2.5 py-1.5 text-[11px] text-white focus:outline-none placeholder-gray-600 font-mono"
            />
          </div>
          <button 
            onClick={fetchGoals} 
            className="p-1.5 rounded-lg border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] text-gray-400 cursor-pointer"
            title="Refresh goals list"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="flex-grow overflow-y-auto p-2 space-y-1">
          {filteredGoals.length === 0 ? (
            <div className="text-[10px] text-gray-600 text-center py-8 select-none">No goals matching search.</div>
          ) : (
            filteredGoals.map(g => (
              <button
                key={g.filename}
                onClick={() => selectGoal(g.filename)}
                className={`w-full text-left p-2.5 rounded-xl border text-[11px] transition-all cursor-pointer block ${
                  selectedGoal?.filename === g.filename
                    ? "bg-indigo-600/15 border-indigo-500/30 text-white shadow-md"
                    : "bg-white/[0.01] border-white/[0.03] text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]"
                }`}
              >
                <div className="font-semibold truncate flex items-center gap-1.5">
                  🏆 {g.title}
                </div>
                <div className="text-[9px] text-gray-500 font-mono mt-1.5 flex justify-between select-none">
                  <span>{g.filename}</span>
                  <span>{g.date}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel: Goal contents */}
      <div className="flex-grow flex flex-col bg-[#04040c]/25 overflow-hidden">
        {selectedGoal ? (
          <div className="flex-grow flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/[0.05] flex justify-between items-center bg-[#070713]/55">
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide font-mono">{selectedGoal.filename}</h3>
                <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono font-bold block mt-1">Archived Goal Summary</span>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto p-6 select-text max-w-4xl mx-auto w-full">
              <Markdown text={selectedGoal.content} />
            </div>
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-gray-500 p-8 select-none text-center">
            <CheckCircle2 size={32} className="text-gray-700 mb-3 animate-pulse" />
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Swarm Swarming Goals Archive</div>
            <div className="text-[10px] text-gray-600 mt-1 max-w-xs">Select an archived goal from the left sidebar to view its summary, final outcomes, and logs.</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [activeAgent, setActiveAgent] = useState(() => {
    try {
      const saved = localStorage.getItem("agent_os_active_agent");
      if (saved) return saved;
    } catch (e) {}
    return "hermes";
  });

  useEffect(() => {
    try {
      localStorage.setItem("agent_os_active_agent", activeAgent);
    } catch (e) {}
  }, [activeAgent]);
  const [centerTab, setCenterTab] = useState<"chat" | "terminal" | "monitor" | "kanban" | "vault" | "goals" | "studio" | "workspace" | "video-analyzer" | "seo-pipeline" | "settings" | "swarm" | "paperclip" | "memory" | "nightly">("chat");
  const [nightlyReport, setNightlyReport] = useState<any>(null);
  const [nightlyLoading, setNightlyLoading] = useState(false);
  const [nightlyRunning, setNightlyRunning] = useState(false);
  const [apiUsageState, setApiUsageState] = useState<any>(null);
  const [workspaceLeftOpen, setWorkspaceLeftOpen] = useState(false);
  const [workspaceRightOpen, setWorkspaceRightOpen] = useState(false);
  const [workspaceEditorOpen, setWorkspaceEditorOpen] = useState(false);

  // System Cron Scheduler States
  const [cronJobs, setCronJobs] = useState<any[]>([]);

  const fetchCrons = async () => {
    try {
      const res = await fetch("/api/crons");
      if (res.ok) {
        const data = await res.json();
        setCronJobs(data);
      }
    } catch (e) {
      console.error("Failed to load crons:", e);
    }
  };

  useEffect(() => {
    fetchCrons();
  }, []);

  const handleToggleCron = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "running" ? "idle" : "running";
    const updated = ((cronJobs && cronJobs.length > 0) ? cronJobs : CRON_JOBS).map(job => {
      if (job.id === id) {
        return { ...job, status: nextStatus };
      }
      return job;
    });
    setCronJobs(updated);
    try {
      const res = await fetch("/api/crons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crons: updated })
      });
      if (!res.ok) {
        alert("Failed to update cron status on server");
        fetchCrons();
      }
    } catch (e: any) {
      alert("Error: " + e.message);
      fetchCrons();
    }
  };

  const handleRunCron = async (name: string) => {
    try {
      const res = await fetch("/api/crons/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        alert(`Successfully triggered run for: ${name}`);
      } else {
        const err = await res.json();
        alert(`Trigger failed: ${err.error || 'unknown error'}`);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  // YouTube Video Analyzer States
  const [ytUrl, setYtUrl] = useState<string>("");
  const [ytLoading, setYtLoading] = useState<boolean>(false);
  const [ytSummary, setYtSummary] = useState<string>("");
  const [ytVideoId, setYtVideoId] = useState<string>("");
  const [ytFrames, setYtFrames] = useState<{file: string, timestamp: string, seconds: number}[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);

  // SEO Content Pipeline States
  const [seoKeyword, setSeoKeyword] = useState<string>("");
  const [seoSlug, setSeoSlug] = useState<string>("");
  const [seoTranscriptPicker, setSeoTranscriptPicker] = useState<string>("");
  const [seoAutoDeploy, setSeoAutoDeploy] = useState<boolean>(false);
  const [seoGenerating, setSeoGenerating] = useState<boolean>(false);
  const [seoArticles, setSeoArticles] = useState<{title: string, slug: string, content: string}[]>([]);
  const [seoTranscripts, setSeoTranscripts] = useState<{id: string, title: string}[]>([]);

  // Fetch transcripts for picker
  useEffect(() => {
    if (centerTab === "seo-pipeline") {
      fetch("/api/seo/transcripts")
        .then(res => res.json())
        .then(data => setSeoTranscripts(data))
        .catch(err => console.error("Failed to load transcripts:", err));
    }
  }, [centerTab]);

  const handleGenerateSEOArticles = async () => {
    if (!seoKeyword.trim()) return;
    setSeoGenerating(true);
    setSeoArticles([]);
    try {
      const res = await fetch("/api/seo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: seoKeyword,
          slug: seoSlug,
          transcriptSource: seoTranscriptPicker,
          autoDeploy: seoAutoDeploy
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSeoArticles(data.articles || []);
      } else {
        alert("Generation failed: " + (data.error || "unknown error"));
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSeoGenerating(false);
    }
  };

  const handleGenerateMultimedia = async (articleIdx: number, type: 'podcast' | 'presentation') => {
    const art = seoArticles[articleIdx];
    if (!art) return;
    setMultimediaGenerating(true);
    setMultimediaType(type);
    try {
      const res = await fetch("/api/seo/multimedia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: art.content, type })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const jsonBlock = `\n\n\`\`\`${type}\n${JSON.stringify(data.result, null, 2)}\n\`\`\``;
        const updatedContent = art.content + jsonBlock;
        
        const updatedArticles = [...seoArticles];
        updatedArticles[articleIdx] = {
          ...art,
          content: updatedContent
        };
        setSeoArticles(updatedArticles);

        if (seoAutoDeploy) {
          const fileSlug = art.slug.replace(/[^a-zA-Z0-9_\-]+/g, '-');
          const fileName = `knowledge_base/seo_deployed_articles/${fileSlug}.md`;
          const fullContent = `# ${art.title}\n- **Niche Category**: ${seoKeyword}\n- **Date**: ${new Date().toLocaleString()}\n- **Status**: Deployed\n\n${updatedContent}`;
          
          await fetch("/api/shared/write", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: fileName, content: fullContent })
          });
        }
        alert(`${type === 'podcast' ? 'Podcast Overview' : 'Presentation Slides'} generated and appended to article successfully!`);
      } else {
        alert("Multimedia generation failed: " + (data.error || "unknown error"));
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setMultimediaGenerating(false);
      setMultimediaType(null);
    }
  };

  const handleAnalyzeVideo = async () => {
    if (!ytUrl.trim()) return;
    setYtLoading(true);
    setYtSummary("");
    setYtVideoId("");
    setYtFrames([]);
    setSelectedFrame(null);
    try {
      const res = await fetch("/api/youtube/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ytUrl })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setYtSummary(data.summary);
        setYtVideoId(data.videoId);
        const frames = data.frames || [];
        setYtFrames(frames);
        if (frames.length > 0) {
          setSelectedFrame(frames[0].file);
        }
      } else {
        alert("Analysis failed: " + (data.error || "unknown error"));
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setYtLoading(false);
    }
  };

  // Media Studio States
  const [studioMediaType, setStudioMediaType] = useState<"image" | "video">("image");
  const [hyperframesScript, setHyperframesScript] = useState("");
  const [hyperframesRendering, setHyperframesRendering] = useState(false);
  const [hyperframesProgress, setHyperframesProgress] = useState(0);
  const [hyperframesRenderedUrl, setHyperframesRenderedUrl] = useState<string | null>(null);
  const [hyperframesVoice, setHyperframesVoice] = useState("male-deep");
  const [hyperframesTemplate, setHyperframesTemplate] = useState("cyberpunk");
  const [studioPrompt, setStudioPrompt] = useState("");
  const [studioAspect, setStudioAspect] = useState("16:9");
  const [studioStyle, setStudioStyle] = useState("Cinematic");
  const [studioGenerating, setStudioGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [studioActiveUrl, setStudioActiveUrl] = useState("");
  const [studioAgent, setStudioAgent] = useState("pollinations");
  const [studioModel, setStudioModel] = useState("pollinations-image");
  const [studioGallery, setStudioGallery] = useState<{ id: string, type: string, url: string }[]>(() => {
    try {
      const g = localStorage.getItem("agent_studio_gallery");
      return g ? JSON.parse(g) : [];
    } catch { return []; }
  });

  // Infographic Builder States
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [infographicTab, setInfographicTab] = useState<"standard" | "infographic" | "hyperframes">("standard");
  const [infoDiagramType, setInfoDiagramType] = useState<string>("CCTV System Architecture");
  const [infoTitle, setInfoTitle] = useState<string>("Gary Pearce Professional CCTV Installations");
  const [infoSubtitle, setInfoSubtitle] = useState<string>("Advanced CCTV and Alarm Services Across the United Kingdom");
  const [infoSelectedKeywords, setInfoSelectedKeywords] = useState<string[]>(["CCTV installations", "Hikvision security systems", "Ajax Alarms"]);
  const [infoSelectedLocations, setInfoSelectedLocations] = useState<string[]>(["Leeds", "Manchester", "Yorkshire"]);
  const [infoDescription, setInfoDescription] = useState<string>("");

  // Website Workspace States
  const [workspaceFiles, setWorkspaceFiles] = useState<{ name: string, path: string, type: "file" | "directory" }[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [previewKey, setPreviewKey] = useState(0);

  // FTP Deployment States
  const [ftpHost, setFtpHost] = useState(() => localStorage.getItem("ftp_host") || "");
  const [ftpUser, setFtpUser] = useState(() => localStorage.getItem("ftp_user") || "");
  const [ftpPort, setFtpPort] = useState(() => localStorage.getItem("ftp_port") || "21");
  const [ftpPass, setFtpPass] = useState(() => localStorage.getItem("ftp_pass") || "");
  const [ftpRemoteDir, setFtpRemoteDir] = useState(() => localStorage.getItem("ftp_remote_dir") || "");
  const [ftpDeploying, setFtpDeploying] = useState(false);
  const [ftpLogs, setFtpLogs] = useState<string[]>([]);

  const handleEnhancePrompt = async () => {
    if (!studioPrompt.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const res = await fetch("/api/studio/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: studioPrompt })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enhanced) {
          setStudioPrompt(data.enhanced);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Hyperframes Avatar Studio Action
  const handleHyperframesGenerate = () => {
    if (!hyperframesScript.trim()) return;
    setHyperframesRendering(true);
    setHyperframesProgress(0);
    setHyperframesRenderedUrl(null);
    
    const interval = setInterval(() => {
      setHyperframesProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setHyperframesRendering(false);
          setHyperframesRenderedUrl("https://www.w3schools.com/html/mov_bbb.mp4"); // Test video URL
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  // Studio Generator Action
  const handleStudioGenerate = async () => {
    const isInfoMode = infographicTab === "infographic";
    const targetPrompt = isInfoMode ? `${infoDiagramType}: ${infoTitle} - ${infoSubtitle}` : studioPrompt;
    if (!targetPrompt.trim()) return;
    setStudioGenerating(true);
    setStudioActiveUrl("");

    try {
      if (studioMediaType === "image") {
        let width = 1024, height = 576;
        if (studioAspect === "1:1") { width = 1024; height = 1024; }
        else if (studioAspect === "9:16") { width = 576; height = 1024; }

        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: targetPrompt,
            width,
            height,
            style: isInfoMode ? "infographic" : studioStyle,
            model: studioModel,
            aspect: studioAspect,
            diagramType: infoDiagramType,
            keywords: infoSelectedKeywords,
            locations: infoSelectedLocations
          })
        });
        const data = await res.json();
        if (data.imageUrl) {
          setStudioActiveUrl(data.imageUrl);

          if (isInfoMode) {
            const desc = `### 📊 Technical Infographic: ${infoDiagramType}\n\nThis visual overview details the architecture and flow for **${infoTitle}** - *${infoSubtitle}*.\n\n#### 🔑 Integrated SEO Keywords:\n${infoSelectedKeywords.map(k => `- **${k}**`).join("\n")}\n\n#### 📍 Active Targeted Service Cities:\n${infoSelectedLocations.join(", ")}\n\n---\n\n### 🌐 Business Info & Credibility Signals:\n- **Checkatrade Reviews & Portfolio**: [CCTV & Alarm Services](https://www.checkatrade.com/trades/cctvandalarmsservices)\n- **Facebook Page**: [CCTV Installation Team](https://www.facebook.com/cctvinstallationteam/)\n- **LinkedIn Profile**: [Gary Pearce (Leeds TV Aerials Specialist)](https://uk.linkedin.com/in/tvaerialsleeds)\n\n*This diagram was auto-compiled and verified by the Agent OS Swarm and is ready for syndication across Tier 1 blogs (e.g. Medium, Blogger, Notion) to drive local authority signals.*`;
            setInfoDescription(desc);
          }

          fetchWorkspaceFiles();
        } else {
          alert("Image generation failed: " + (data.error || "unknown error"));
        }
      } else {
        const res = await fetch("/api/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: targetPrompt, model: studioModel })
        });
        const data = await res.json();
        if (data.videoUrl) {
          setStudioActiveUrl(data.videoUrl);
          fetchWorkspaceFiles();
        } else {
          alert("Video generation failed: " + (data.error || "unknown error"));
        }
      }
    } catch (e: any) {
      console.error(e);
      alert("Error: " + e.message);
    } finally {
      setStudioGenerating(false);
    }
  };

  const handleSaveToGallery = () => {
    if (!studioActiveUrl) return;
    const newItem = {
      id: String(Date.now()),
      type: studioMediaType,
      url: studioActiveUrl
    };
    const updated = [newItem, ...studioGallery];
    setStudioGallery(updated);
    localStorage.setItem("agent_studio_gallery", JSON.stringify(updated));
  };

  const handleDeleteGalleryItem = (id: string) => {
    const updated = studioGallery.filter(item => item.id !== id);
    setStudioGallery(updated);
    localStorage.setItem("agent_studio_gallery", JSON.stringify(updated));
  };

  // Workspace Actions
  const fetchWorkspaceFiles = async () => {
    try {
      const res = await fetch("/api/website/files");
      if (res.ok) {
        const data = await res.json();
        const mappedFiles = (data.files || []).map((file: any) => {
          if (typeof file === "string") {
            return {
              path: file,
              name: file,
              type: file.includes(".") ? "file" : "directory"
            };
          }
          return file;
        });
        setWorkspaceFiles(mappedFiles);
      }
    } catch (e) { console.error(e); }
  };

  const handleOpenFile = async (path: string) => {
    setSelectedFile(path);
    setWorkspaceEditorOpen(true);
    try {
      const res = await fetch(`/api/website/read?f=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        setEditorContent(data.content || "");
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    try {
      const res = await fetch("/api/website/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selectedFile, content: editorContent })
      });
      if (res.ok) {
        setPreviewKey(prev => prev + 1);
        alert("File saved successfully!");
      }
    } catch (e) { console.error(e); }
  };


  const handleDeleteFile = async (path: string) => {
    if (!confirm(`Delete ${path}?`)) return;
    try {
      const res = await fetch("/api/website/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: path })
      });
      if (res.ok) {
        if (selectedFile === path) {
          setSelectedFile(null);
          setEditorContent("");
        }
        fetchWorkspaceFiles();
      }
    } catch (e) { console.error(e); }
  };

  const handleDeployWebsite = async () => {
    setFtpDeploying(true);
    setFtpLogs(["Initiating FTP deployment..."]);
    localStorage.setItem("ftp_host", ftpHost);
    localStorage.setItem("ftp_user", ftpUser);
    localStorage.setItem("ftp_port", ftpPort);
    localStorage.setItem("ftp_pass", ftpPass);
    localStorage.setItem("ftp_remote_dir", ftpRemoteDir);

    try {
      const res = await fetch("/api/website/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: ftpHost,
          port: ftpPort,
          user: ftpUser,
          password: ftpPass,
          remoteDir: ftpRemoteDir
        })
      });
      const data = await res.json();
      if (data.logs) {
        setFtpLogs(data.logs);
      }
      if (res.ok) {
        alert("Website published successfully!");
      } else {
        alert(`Deploy failed: ${data.error}`);
      }
    } catch (e: any) {
      setFtpLogs(prev => [...prev, `Handshake error: ${e.message}`]);
    } finally {
      setFtpDeploying(false);
    }
  };
  const [rightTab, setRightTab] = useState<"sessions" | "models" | "skills" | "mcp-catalog" | "vault" | "goals" | "monitor" | "settings" | "notebooklm" | "rag">("models");

  // Semantic RAG States
  const [ragSearchQuery, setRagSearchQuery] = useState<string>("");
  const [ragResults, setRagResults] = useState<any[]>([]);
  const [ragIndexing, setRagIndexing] = useState<boolean>(false);
  const [ragSearching, setRagSearching] = useState<boolean>(false);

  const handleRagSearch = async () => {
    if (!ragSearchQuery.trim()) return;
    setRagSearching(true);
    try {
      const res = await fetch("http://localhost:3001/api/rag/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: ragSearchQuery, limit: 5 })
      });
      const data = await res.json();
      if (data.results) {
        setRagResults(data.results);
      }
    } catch (err: any) {
      console.error("RAG search failed:", err.message);
    } finally {
      setRagSearching(false);
    }
  };

  const handleRagIndex = async () => {
    setRagIndexing(true);
    try {
      const res = await fetch("http://localhost:3001/api/rag/index-files", {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully indexed workspace! Scanned: ${data.filesScanned} files, Created: ${data.chunksCreated} chunks.`);
      } else {
        alert(`Indexing failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Indexing error: ${err.message}`);
    } finally {
      setRagIndexing(false);
    }
  };

  // NotebookLM Integration States
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string>("");
  const [notebookLoading, setNotebookLoading] = useState<boolean>(false);
  const [newNotebookName, setNewNotebookName] = useState<string>("");
  const [newNotebookUrl, setNewNotebookUrl] = useState<string>("");
  const [newSourceUrl, setNewSourceUrl] = useState<string>("");
  const [newSourceText, setNewSourceText] = useState<string>("");
  const [addingSource, setAddingSource] = useState<boolean>(false);
  const [notebookChatInput, setNotebookChatInput] = useState<string>("");
  const [notebookChatHistory, setNotebookChatHistory] = useState<any[]>([]);
  const [notebookChatLoading, setNotebookChatLoading] = useState<boolean>(false);
  const [notebookAudioStatus, setNotebookAudioStatus] = useState<string>("unknown");
  const [notebookAudioProgress, setNotebookAudioProgress] = useState<string>("");
  const [notebookAudioUrl, setNotebookAudioUrl] = useState<string>("");
  const [notebookAudioGenerating, setNotebookAudioGenerating] = useState<boolean>(false);
  const [notebookSessionId, setNotebookSessionId] = useState<string>("");

  // Custom Dynamic Tool Creator States
  const [isCreateToolOpen, setIsCreateToolOpen] = useState<boolean>(false);
  const [customToolName, setCustomToolName] = useState<string>("");
  const [customToolDesc, setCustomToolDesc] = useState<string>("");
  const [customToolSchema, setCustomToolSchema] = useState<string>('{\n  "type": "object",\n  "properties": {\n    "name": { "type": "string", "description": "Greeting subject" }\n  },\n  "required": ["name"]\n}');
  const [customToolCode, setCustomToolCode] = useState<string>('// Write custom JS code here. Receive inputs in "args" object.\nreturn "Hello " + args.name;');
  const [customToolLoading, setCustomToolLoading] = useState<boolean>(false);

  const handleCreateCustomTool = async () => {
    if (!customToolName.trim() || !customToolCode.trim()) return;
    setCustomToolLoading(true);
    try {
      let parsedSchema = { type: "object", properties: {} };
      try {
        parsedSchema = JSON.parse(customToolSchema);
      } catch (e) {
        alert("Invalid JSON format in Parameter Schema. Fallback to default empty schema.");
      }

      const res = await fetch('/api/mcp/create-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customToolName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          description: customToolDesc,
          inputSchema: parsedSchema,
          code: customToolCode
        })
      });
      if (res.ok) {
        setCustomToolName('');
        setCustomToolDesc('');
        setCustomToolSchema('{\n  "type": "object",\n  "properties": {\n    "name": { "type": "string", "description": "Greeting subject" }\n  },\n  "required": ["name"]\n}');
        setCustomToolCode('// Write custom JS code here. Receive inputs in "args" object.\nreturn "Hello " + args.name;');
        setIsCreateToolOpen(false);
        alert("Custom tool created and hot-reloaded successfully!");
        // Safely trigger catalog refresh
        const mcpBtn = document.querySelector('[title*="Refresh MCP"]') as HTMLElement;
        if (mcpBtn) mcpBtn.click();
      } else {
        const data = await res.json();
        alert(`Failed to create tool: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error connecting to server: ${err.message}`);
    } finally {
      setCustomToolLoading(false);
    }
  };
  const [isViteRunning, setIsViteRunning] = useState<boolean>(false);
  const [viteUrl, setViteUrl] = useState<string>("/website-preview/index.html");
  const [viteLoading, setViteLoading] = useState<boolean>(false);

  const handleToggleVite = async () => {
    setViteLoading(true);
    try {
      const endpoint = isViteRunning ? '/api/workspace/stop-vite' : '/api/workspace/start-vite';
      const res = await fetch(endpoint, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (!isViteRunning) {
          setIsViteRunning(true);
          setViteUrl(data.url || 'http://localhost:5173');
        } else {
          setIsViteRunning(false);
          setViteUrl("/website-preview/index.html");
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setViteLoading(false);
    }
  };

  const checkViteStatus = async () => {
    try {
      const res = await fetch('/api/workspace/status-vite');
      if (res.ok) {
        const data = await res.json();
        setIsViteRunning(data.running);
        setViteUrl(data.running ? data.url : "/website-preview/index.html");
      }
    } catch (_) {}
  };

  useEffect(() => {
    checkViteStatus();
  }, []);

  const [campaignTitle, setCampaignTitle] = useState<string>("");
  const [campaignTopic, setCampaignTopic] = useState<string>("");
  const [campaignLogs, setCampaignLogs] = useState<string[]>([]);
  const [campaignRunning, setCampaignRunning] = useState<boolean>(false);

  const handleLaunchCampaign = async () => {
    if (!campaignTitle.trim() || !campaignTopic.trim()) return;
    setCampaignRunning(true);
    setCampaignLogs(["Initializing Campaign Swarm Engine..."]);
    try {
      const response = await fetch('/api/campaign/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: campaignTitle.trim(),
          topic: campaignTopic.trim(),
          ftp: {
            host: ftpHost,
            user: ftpUser,
            password: ftpPass,
            port: ftpPort,
            path: ftpRemoteDir
          }
        })
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") break;
            try {
              const data = JSON.parse(dataStr);
              if (data.message) {
                setCampaignLogs(prev => [...prev, `[${data.status?.toUpperCase()}] ${data.message}`]);
              }
            } catch (_) {}
          }
        }
      }
      setCampaignLogs(prev => [...prev, "🏁 Swarm Campaign Publishing Flow Complete!"]);
    } catch (err: any) {
      setCampaignLogs(prev => [...prev, `❌ Error: ${err.message}`]);
    } finally {
      setCampaignRunning(false);
    }
  };

  const handleFetchNotebooks = async () => {
    setNotebookLoading(true);
    try {
      const res = await fetch('/api/notebooklm/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'list_notebooks', arguments: {} })
      });
      if (res.ok) {
        const data = await res.json();
        setNotebooks(data.notebooks || data.result || data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch notebooks:", e);
    } finally {
      setNotebookLoading(false);
    }
  };

  const handleSelectNotebook = async (id: string) => {
    setActiveNotebookId(id);
    setNotebookChatHistory([]);
    setNotebookSessionId("");
    // Fetch active audio overview if exists
    try {
      const res = await fetch('/api/notebooklm/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'get_audio_status', arguments: { notebook_id: id } })
      });
      if (res.ok) {
        const data = await res.json();
        const status = data.status || data.result?.status || "unknown";
        setNotebookAudioStatus(status);
        if (status === "ready") {
          const downloadRes = await fetch('/api/notebooklm/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool: 'download_audio', arguments: { notebook_id: id } })
          });
          if (downloadRes.ok) {
            const dlData = await downloadRes.json();
            setNotebookAudioUrl(dlData.url || dlData.result?.url || "");
          }
        } else {
          setNotebookAudioUrl("");
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddNotebook = async () => {
    if (!newNotebookUrl.trim()) return;
    setNotebookLoading(true);
    try {
      const res = await fetch('/api/notebooklm/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'add_notebook',
          arguments: {
            url: newNotebookUrl,
            name: newNotebookName || 'New Notebook',
            description: 'Grounded RAG workspace',
            topics: ['general']
          }
        })
      });
      if (res.ok) {
        setNewNotebookName('');
        setNewNotebookUrl('');
        await handleFetchNotebooks();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setNotebookLoading(false);
    }
  };

  const handleAddSource = async () => {
    if (!activeNotebookId) return;
    setAddingSource(true);
    const type = newSourceUrl.trim() ? 'url' : 'text';
    const content = type === 'url' ? newSourceUrl.trim() : newSourceText;
    try {
      const res = await fetch('/api/notebooklm/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'add_source',
          arguments: {
            type,
            content,
            notebook_id: activeNotebookId
          }
        })
      });
      if (res.ok) {
        setNewSourceUrl('');
        setNewSourceText('');
        alert("Source successfully ingested and queued for indexing!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingSource(false);
    }
  };

  const handleNotebookChatSend = async () => {
    if (!notebookChatInput.trim() || !activeNotebookId) return;
    const userMsg = notebookChatInput.trim();
    setNotebookChatInput('');
    setNotebookChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setNotebookChatLoading(true);

    try {
      const res = await fetch('/api/notebooklm/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'ask_question',
          arguments: {
            question: userMsg,
            notebook_id: activeNotebookId,
            session_id: notebookSessionId || undefined,
            source_format: 'footnotes'
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        const responseText = data.answer || data.result?.answer || data.text || "No response received.";
        if (data.session_id || data.result?.session_id) {
          setNotebookSessionId(data.session_id || data.result?.session_id);
        }
        setNotebookChatHistory(prev => [...prev, { role: 'assistant', content: responseText }]);
      } else {
        setNotebookChatHistory(prev => [...prev, { role: 'assistant', content: "Error communicating with NotebookLM." }]);
      }
    } catch (err) {
      console.error(err);
      setNotebookChatHistory(prev => [...prev, { role: 'assistant', content: "Failed to connect to backend server." }]);
    } finally {
      setNotebookChatLoading(false);
    }
  };

  const [activeAutonomous, setActiveAutonomous] = useState<boolean>(false);
  const handleToggleAutonomous = async () => {
    try {
      const nextActive = !activeAutonomous;
      const res = await fetch("http://localhost:3001/api/swarm/set-autonomous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive })
      });
      if (res.ok) {
        setActiveAutonomous(nextActive);
        alert(`24H Continuous Swarm Mode: ${nextActive ? "ENABLED" : "DISABLED"}`);
      }
    } catch (err: any) {
      console.error(err.message);
    }
  };

  const handleOrchestratorInterrupt = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/orchestrator/interrupt", {
        method: "POST"
      });
      if (res.ok) {
        alert("Active tasks interrupted successfully!");
        setThreadLoading({});
      }
    } catch (err: any) {
      console.error(err.message);
    }
  };

  const handleGeneratePodcast = async () => {
    if (!activeNotebookId) return;
    setNotebookAudioGenerating(true);
    setNotebookAudioStatus("generating");
    try {
      const res = await fetch('/api/notebooklm/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'generate_audio',
          arguments: { notebook_id: activeNotebookId }
        })
      });
      if (res.ok) {
        setNotebookAudioProgress("Audio overview generation started...");
        // Poll for status
        const interval = setInterval(async () => {
          try {
            const statusRes = await fetch('/api/notebooklm/call', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tool: 'get_audio_status', arguments: { notebook_id: activeNotebookId } })
            });
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              const status = statusData.status || statusData.result?.status || "unknown";
              setNotebookAudioStatus(status);
              if (status === "ready") {
                clearInterval(interval);
                const dlRes = await fetch('/api/notebooklm/call', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tool: 'download_audio', arguments: { notebook_id: activeNotebookId } })
                });
                if (dlRes.ok) {
                  const dlData = await dlRes.json();
                  setNotebookAudioUrl(dlData.url || dlData.result?.url || "");
                }
                setNotebookAudioGenerating(false);
                setNotebookAudioProgress("");
              } else if (status === "failed") {
                clearInterval(interval);
                setNotebookAudioGenerating(false);
                setNotebookAudioProgress("Generation failed.");
              }
            }
          } catch (e) {
            clearInterval(interval);
            setNotebookAudioGenerating(false);
          }
        }, 15000);
      } else {
        setNotebookAudioGenerating(false);
        setNotebookAudioStatus("failed");
      }
    } catch (e) {
      setNotebookAudioGenerating(false);
      setNotebookAudioStatus("failed");
    }
  };

  const [discoveredModels, setDiscoveredModels] = useState<any[]>([]);

  const fetchDiscoveredModels = async () => {
    try {
      const res = await fetch('/api/models');
      if (res.ok) {
        const data = await res.json();
        setDiscoveredModels(data.models || []);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchDiscoveredModels();
    const interval = setInterval(fetchDiscoveredModels, 60000);
    return () => clearInterval(interval);
  }, []);

  const [voiceUpdatesEnabled, setVoiceUpdatesEnabled] = useState(() => {
    return localStorage.getItem("voice_updates_enabled") === "true";
  });

  const toggleVoiceUpdates = () => {
    setVoiceUpdatesEnabled(prev => {
      const newVal = !prev;
      localStorage.setItem("voice_updates_enabled", String(newVal));
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(newVal ? "Voice updates enabled" : "Voice updates disabled");
        window.speechSynthesis.speak(utterance);
      }
      return newVal;
    });
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      let clean = text
        .replace(/[\*_`#]/g, '')
        .replace(/🧠/g, 'Orchestrator: ')
        .replace(/🚀/g, 'Step starting: ')
        .replace(/✅/g, 'Step completed: ')
        .replace(/🏆/g, 'Goal completed! ')
        .replace(/❌/g, 'Error: ')
        .replace(/💻/g, 'Running terminal command: ')
        .replace(/📝/g, 'Writing file: ')
        .replace(/📖/g, 'Reading file: ')
        .replace(/✏️/g, 'Editing file: ')
        .replace(/🔍/g, 'Searching codebase for: ')
        .replace(/💬/g, 'Swarm communication: ')
        .replace(/>/g, '')
        .trim();

      if (!clean) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Collapsed Sidebar States
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(true);
  const [isRightCollapsed, setIsRightCollapsed] = useState(true);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Voice Input (Speech-to-Text) State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser. Try Chrome.");
      return;
    }
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      
      rec.onstart = () => {
        setIsListening(true);
      };
      
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setChatInput(prev => (prev ? prev + ' ' : '') + transcript);
      };
      
      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };
      
      rec.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = rec;
      rec.start();
    }
  };

  // Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("agent_os_chat_messages");
      if (saved) return JSON.parse(saved);
    } catch (e) { console.error(e); }
    return [
      {
        id: 'welcome-collab',
        agent: 'system',
        msg: "### Swarm Collaboration Mode Active 🌐\nAll agents are now listening and coordinating in this shared screen. The main Orchestrator will manage the execution flow. You can issue instructions directly to the swarm.",
        time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem("agent_os_chat_messages", JSON.stringify(chatMessages));
    } catch (e) { console.error(e); }
  }, [chatMessages]);

  const [threadLoading, setThreadLoading] = useState<Record<string, boolean>>({});
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
  const [threadReplyInputs, setThreadReplyInputs] = useState<Record<string, string>>({});

  // Swarm & Specialist Chat Thread States
  const [chatMode, setChatMode] = useState<'collab' | 'single'>(() => {
    try {
      const saved = localStorage.getItem("agent_os_chat_mode");
      if (saved === 'collab' || saved === 'single') return saved;
    } catch (e) {}
    return 'collab';
  });

  useEffect(() => {
    try {
      localStorage.setItem("agent_os_chat_mode", chatMode);
    } catch (e) {}
  }, [chatMode]);

  const [activeSpecialistId, setActiveSpecialistId] = useState<string | null>(null);
  const [specialistChatInput, setSpecialistChatInput] = useState<string>("");

  const handleOpenSpecialistPanel = async (agentId: string) => {
    setActiveSpecialistId(agentId);
    
    if (!chatThreads[agentId]) {
      const targetAgentObj = agents.find(a => a.id === agentId) || agents[0];
      const initialMsgs = [
        {
          id: `welcome-${agentId}`,
          agent: agentId,
          msg: `### ${targetAgentObj?.name || agentId} at your service ⚡\nRole: *${targetAgentObj?.role || 'Specialist Agent'}*\nLayer: **${targetAgentObj?.layer || 'L3'}**\n\nHow can I assist you with your tasks today?`,
          time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
        }
      ];
      
      if (activeSessionId) {
        try {
          const res = await fetch(`/api/session-detail?id=${activeSessionId}`);
          if (res.ok) {
            const data = await res.json();
            const rawList = Array.isArray(data) ? data : (data.messages || []);
            const filtered = rawList
              .map((m: any) => ({
                id: m.id,
                agent: m.agent || (m.role === 'user' ? 'user' : 'hermes'),
                msg: m.content,
                parentId: m.parentId,
                status: m.status,
                feedback: m.feedback,
                time: m.created_at
                  ? new Date(m.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                  : 'Restored'
              }))
              .filter((m: any) => 
                (m.agent === 'user' && m.parentId === agentId) || 
                (m.agent === agentId && (!m.id || (!m.id.startsWith('msg_brainstorm_') && !m.id.startsWith('msg_critique_'))))
              );
            
            if (filtered.length > 0) {
              setChatThreads(prev => ({
                ...prev,
                [agentId]: [initialMsgs[0], ...filtered]
              }));
              return;
            }
          }
        } catch (e) {
          console.error("Failed to fetch specialist history:", e);
        }
      }
      
      setChatThreads(prev => ({
        ...prev,
        [agentId]: initialMsgs
      }));
    }
  };

  const handleSendSpecialistMessage = async (agentId: string) => {
    const text = specialistChatInput;
    if (!text.trim()) return;
    
    setSpecialistChatInput("");
    setThreadLoading(prev => ({ ...prev, [agentId]: true }));
    
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          model: activeModel,
          agent: agentId,
          parentId: agentId,
          activeSessionId: activeSessionId
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.sessionId) {
          setActiveSessionId(data.sessionId);
          fetchSessionsList();
        }
      }
    } catch (e) {
      console.error("Failed to send direct message to agent:", e);
      setThreadLoading(prev => ({ ...prev, [agentId]: false }));
    }
  };

  const [chatThreads, setChatThreads] = useState<Record<string, ChatMessage[]>>(() => {
    try {
      const saved = localStorage.getItem("agent_os_chat_threads");
      if (saved) return JSON.parse(saved);
    } catch (e) { console.error(e); }
    return {
      collab: [
        {
          id: 'welcome-collab',
          agent: 'system',
          msg: "### Swarm Collaboration Mode Active 🌐\nAll agents are now listening and coordinating in this shared screen. The main Orchestrator will manage the execution flow. You can issue instructions directly to the swarm.",
          time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
        }
      ]
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem("agent_os_chat_threads", JSON.stringify(chatThreads));
    } catch (e) { console.error(e); }
  }, [chatThreads]);

  const [multimediaGenerating, setMultimediaGenerating] = useState(false);
  const [multimediaType, setMultimediaType] = useState<'podcast' | 'presentation' | null>(null);

  const currentThreadId = chatMode === 'collab' ? 'collab' : activeAgent;
  const isCurrentLoading = threadLoading[currentThreadId] || false;

  // Switch between threads smoothly and synchronously
  const handleSwitchThread = (newMode: 'collab' | 'single', newAgent: string) => {
    const oldThreadId = chatMode === 'collab' ? 'collab' : activeAgent;
    const nextThreadId = newMode === 'collab' ? 'collab' : newAgent;

    // Save current messages under the old thread ID
    setChatThreads(prev => ({
      ...prev,
      [oldThreadId]: chatMessages
    }));

    // Toggle active thread parameters
    setChatMode(newMode);
    setActiveAgent(newAgent);

    // Fetch and load the history for the new thread ID
    const saved = chatThreads[nextThreadId];
    if (saved) {
      setChatMessages(saved);
    } else {
      const targetAgentObj = agents.find(a => a.id === nextThreadId) || agents[0];
      const welcomeMsg = nextThreadId === 'collab'
        ? [
            {
              id: 'welcome-collab',
              agent: 'system',
              msg: "### Swarm Collaboration Mode Active 🌐\nAll agents are now listening and coordinating in this shared screen. The main Orchestrator will manage the execution flow. You can issue instructions directly to the swarm.",
              time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
            }
          ]
        : [
            {
              id: `welcome-${nextThreadId}`,
              agent: nextThreadId,
              msg: `### ${targetAgentObj?.name || nextThreadId} at your service ⚡\nRole: *${targetAgentObj?.role || 'Specialist Agent'}*\nLayer: **${targetAgentObj?.layer || 'L3'}**\n\nHow can I assist you with your tasks today?`,
              time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
            }
          ];
      setChatMessages(welcomeMsg);
      setChatThreads(prev => ({ ...prev, [nextThreadId]: welcomeMsg }));
    }
  };

  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (!isCurrentLoading) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % 4);
    }, 1500);
    return () => clearInterval(interval);
  }, [isCurrentLoading]);

  const loadingMessages = [
    "Connecting to OpenRouter API...",
    "Sending query to model...",
    "Waiting for response stream...",
    "Processing & formatting output..."
  ];
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  // Collapsed tools execution log indexing
  const [expandedToolsIndex, setExpandedToolsIndex] = useState<number | null>(null);

  // Terminal state
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<{ type: 'input' | 'output' | 'error'; text: string }[]>([
    { type: 'output', text: "Agent OS [Version 2.5.1]\n(c) 2026 Nous Research & Antigravity. All rights reserved.\nType 'help' for standard options." }
  ]);
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const [isFloatingTerminalOpen, setIsFloatingTerminalOpen] = useState(false);
  const floatingTerminalBottomRef = useRef<HTMLDivElement>(null);

  // Sessions state
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("agent_os_active_session_id");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (activeSessionId) {
        localStorage.setItem("agent_os_active_session_id", activeSessionId);
      } else {
        localStorage.removeItem("agent_os_active_session_id");
      }
    } catch {}
  }, [activeSessionId]);

  // Main SSE subscriber effect for active session
  useEffect(() => {
    if (!activeSessionId) return;

    console.log("[SSE client] Connecting for session:", activeSessionId);
    setThreadLoading(prev => ({ ...prev, collab: true }));

    const eventSource = new EventSource(`/api/chat/stream?sessionId=${activeSessionId}`);
    const accumulatedResponses: Record<string, string> = {};

    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        console.log("[SSE client] Received [DONE]");
        setThreadLoading(prev => ({ ...prev, collab: false, [activeAgent]: false }));
        eventSource.close();
        return;
      }

      try {
        const parsed = JSON.parse(event.data);

        if (parsed.sessionId && parsed.sessionId !== activeSessionId) {
          setActiveSessionId(parsed.sessionId);
        }

        if (parsed.newMsgId) {
          const activeWriteMsgId = parsed.newMsgId;

          if (parsed.sync) {
            accumulatedResponses[activeWriteMsgId] = parsed.content || "";
          } else {
            if (parsed.content) {
              accumulatedResponses[activeWriteMsgId] = (accumulatedResponses[activeWriteMsgId] || "") + parsed.content;
              
              // Voice updates / TTS narration for live updates
              if (voiceUpdatesEnabled) {
                const text = parsed.content;
                if (
                  text.includes('🚀') || 
                  text.includes('✅') || 
                  text.includes('🧠') || 
                  text.includes('🏆') || 
                  text.includes('❌') || 
                  text.includes('💻') || 
                  text.includes('📝') || 
                  text.includes('📖') || 
                  text.includes('✏️') || 
                  text.includes('🔍') || 
                  text.includes('💬')
                ) {
                  speakText(text);
                }
              }
            }
          }

          // Expand brainstorming/critique threads
          const isNewBrainstormHeader = activeWriteMsgId.startsWith('msg_brainstorm_') && 
            !activeWriteMsgId.includes('_agy_') && 
            !activeWriteMsgId.includes('_orchestrator_') && 
            !activeWriteMsgId.includes('_openclaw_') && 
            !activeWriteMsgId.includes('_hermes_') && 
            !activeWriteMsgId.includes('_claude_');
          const isNewCritiqueHeader = activeWriteMsgId.startsWith('msg_critique_header_');
          if (isNewBrainstormHeader || isNewCritiqueHeader) {
            setExpandedThreads(prev => ({ ...prev, [activeWriteMsgId]: true }));
          }

          setChatThreads(prev => {
            const targetThreadId = parsed.parentId || 'collab';
            const currentList = prev[targetThreadId] || [];
            const exists = currentList.findIndex(m => m.id === activeWriteMsgId);
            const timeStr = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

            let updatedList;
            if (exists !== -1) {
              updatedList = [...currentList];
              const current = updatedList[exists];
              const newTools = parsed.tool ? [...(current.tools || []), parsed.tool] : current.tools || [];
              updatedList[exists] = {
                ...current,
                msg: accumulatedResponses[activeWriteMsgId],
                tools: newTools,
                status: parsed.status !== undefined ? parsed.status : current.status
              };
            } else {
              updatedList = [...currentList, {
                id: activeWriteMsgId,
                agent: parsed.agent || 'orchestrator',
                msg: accumulatedResponses[activeWriteMsgId],
                time: timeStr,
                tools: parsed.tool ? [parsed.tool] : [],
                status: parsed.status
              }];
            }

            const currentActiveThreadId = chatMode === 'collab' ? 'collab' : activeAgent;
            if (targetThreadId === currentActiveThreadId) {
              setChatMessages(updatedList);
            }

            return {
              ...prev,
              [targetThreadId]: updatedList
            };
          });
        }
      } catch (err) {
        console.error("[SSE client] Error parsing stream event:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("[SSE client] EventSource error:", err);
      setThreadLoading(prev => ({ ...prev, collab: false, [activeAgent]: false }));
      eventSource.close();
    };

    return () => {
      console.log("[SSE client] Closing EventSource for session:", activeSessionId);
      eventSource.close();
    };
  }, [activeSessionId, chatMode, activeAgent, voiceUpdatesEnabled]);

  // System Status & Model selection
  const [activeModel, setActiveModel] = useState("deepseek/deepseek-v4-flash:free");
  const [evolutionStatus, setEvolutionStatus] = useState<any>(null);
  const [isReverting, setIsReverting] = useState(false);
  const [switchingModelId, setSwitchingModelId] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Floating Chat states & draggable logic
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(() => {
    try {
      const saved = localStorage.getItem("agent_os_is_floating_chat_open");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return false;
  });

  useEffect(() => {
    try {
      localStorage.setItem("agent_os_is_floating_chat_open", JSON.stringify(isFloatingChatOpen));
    } catch (e) {}
  }, [isFloatingChatOpen]);
  const [floatingChatInput, setFloatingChatInput] = useState("");
  const [floatingChatPos, setFloatingChatPos] = useState({ x: 800, y: 150 });
  const [isDraggingChat, setIsDraggingChat] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const chatDragStart = useRef({ x: 0, y: 0 });
  const chatWindowStart = useRef({ x: 0, y: 0 });
  const floatingChatBottomRef = useRef<HTMLDivElement>(null);
  const floatingChatContainerRef = useRef<HTMLDivElement>(null);
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const floatingTerminalContainerRef = useRef<HTMLDivElement>(null);

  const handleChatDragStart = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('.overflow-y-auto')) {
      return;
    }
    setIsDraggingChat(true);
    chatDragStart.current = { x: e.clientX, y: e.clientY };
    chatWindowStart.current = { x: floatingChatPos.x, y: floatingChatPos.y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingChat) return;
      const dx = e.clientX - chatDragStart.current.x;
      const dy = e.clientY - chatDragStart.current.y;
      
      const targetX = chatWindowStart.current.x + dx;
      const targetY = chatWindowStart.current.y + dy;

      // Keep header visible and box on screen
      setFloatingChatPos({
        x: Math.max(10, Math.min(window.innerWidth - 120, targetX)),
        y: Math.max(10, Math.min(window.innerHeight - 60, targetY))
      });
    };
    const handleMouseUp = () => {
      setIsDraggingChat(false);
    };
    const handleBlur = () => {
      setIsDraggingChat(false);
    };
    if (isDraggingChat) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('blur', handleBlur);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isDraggingChat]);

  useEffect(() => {
    setFloatingChatPos({
      x: Math.max(20, window.innerWidth - 480),
      y: Math.max(20, window.innerHeight - 560)
    });
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setFloatingChatPos(prev => ({
        x: Math.max(10, Math.min(window.innerWidth - 120, prev.x)),
        y: Math.max(10, Math.min(window.innerHeight - 60, prev.y))
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isFloatingChatOpen && floatingChatContainerRef.current) {
      const timer = setTimeout(() => {
        if (floatingChatContainerRef.current) {
          floatingChatContainerRef.current.scrollTop = floatingChatContainerRef.current.scrollHeight;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isFloatingChatOpen, chatMessages]);

  // Skills & MCP list states
  const [activeSkills, setActiveSkills] = useState<string[]>([]);
  const [selectedManualSkill, setSelectedManualSkill] = useState<string | null>(null);
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
          const apiAgent = data?.agents?.[agent.id];
          if (apiAgent && apiAgent.status !== undefined) {
            return { ...agent, status: apiAgent.status };
          }
          return agent;
        }));
        if (data.activeModel) {
          setActiveModel(data.activeModel);
        }
        if (data.notification) {
          setNotifications(prev => {
            if (prev.includes(data.notification)) return prev;
            return [data.notification, ...prev];
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch system status:", e);
    } finally {
      setLastRefreshed(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const fetchEvolutionStatus = async () => {
    try {
      const res = await fetch("/api/evolution/status");
      if (res.ok) {
        const data = await res.json();
        setEvolutionStatus(data.lastRun);
      }
    } catch (e) {
      console.error("Failed to fetch evolution status:", e);
    }
  };

  const handleRevertEvolution = async () => {
    if (!window.confirm("Are you sure you want to revert the last self-evolution update? This will perform a git reset and rebuild the client environment.")) return;
    setIsReverting(true);
    try {
      const res = await fetch("/api/evolution/revert", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || "Successfully reverted and rebuilt!");
        fetchEvolutionStatus();
      } else {
        const err = await res.json();
        alert(`Rollback failed: ${err.error || "Unknown error"}`);
      }
    } catch (e: any) {
      alert(`Network error during rollback: ${e.message}`);
    } finally {
      setIsReverting(false);
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

  const [visualAuditLoading, setVisualAuditLoading] = useState<boolean>(false);
  const [visualAuditReport, setVisualAuditReport] = useState<string>("");
  const [visualAuditScreenshot, setVisualAuditScreenshot] = useState<string>("");

  const handleRunVisualAudit = async () => {
    setVisualAuditLoading(true);
    setVisualAuditReport("");
    setVisualAuditScreenshot("");
    try {
      // Use active preview Vite URL, falling back to static preview
      const targetUrl = isViteRunning ? viteUrl : "http://localhost:3001/website-preview/index.html";
      const res = await fetch("http://localhost:3001/api/browser/visual-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl })
      });
      if (res.ok) {
        const data = await res.json();
        setVisualAuditScreenshot(data.screenshotUrl);
        setVisualAuditReport(data.report);
      } else {
        alert("Visual Sandbox Audit Failed");
      }
    } catch (e: any) {
      alert(`Error auditing layout: ${e.message}`);
    } finally {
      setVisualAuditLoading(false);
    }
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
    fetchEvolutionStatus();
    fetchSkills();
    fetchMcpList();
    fetchMcpCatalog();
    fetchVaultFiles();
    fetchDbTasks();
    fetchTeams();
    fetchMailbox();
    fetchWorkspaceFiles();

    // Check for self-evolution auto-upgrades
    const checkEvolutionUpgrade = async () => {
      try {
        const res = await fetch("/api/evolution/latest-upgrade");
        if (res.ok) {
          const data = await res.json();
          if (data.upgrade) {
            // Add a system notification toast!
            const upgradeMsg = `🚀 System evolved successfully to v${data.upgrade.version}! New models: ${data.upgrade.models_count}. Details: ${data.upgrade.summary}`;
            setNotifications(prev => [upgradeMsg, ...prev]);
            setIsNotificationOpen(true);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkEvolutionUpgrade();

    const interval = setInterval(() => {
      fetchStatus();
      fetchDbTasks();
      fetchMailbox();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat panel only if user is already near the bottom, or if the last message is from the user
  useEffect(() => {
    const container = chatScrollContainerRef.current;
    if (!container) return;

    // Check if the user is already scrolled to the bottom (within a threshold of 150px)
    const threshold = 150;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;

    // Check if the last message is from the user
    const lastMsg = chatMessages[chatMessages.length - 1];
    const isLastMessageFromUser = lastMsg && lastMsg.agent === "user";

    // Scroll only if they are already at the bottom, or if they just typed a message
    if (isAtBottom || isLastMessageFromUser || isCurrentLoading) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [chatMessages, isCurrentLoading]);

  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
    if (floatingTerminalContainerRef.current) {
      floatingTerminalContainerRef.current.scrollTop = floatingTerminalContainerRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // Dynamic terminal SSE stream sync
  useEffect(() => {
    if (centerTab !== 'terminal' && !isFloatingTerminalOpen) return;

    const source = new EventSource('/api/terminal/output');
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.text) {
          setTerminalLogs(prev => {
            const last = prev[prev.length - 1];
            if (last && last.type === 'output') {
              return [...prev.slice(0, -1), { type: 'output', text: last.text + data.text }];
            } else {
              return [...prev, { type: 'output', text: data.text }];
            }
          });
        }
      } catch (e) {
        console.error("Error parsing terminal SSE:", e);
      }
    };

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  }, [centerTab]);

  // Send message to Hermes CLI API
  const handleRewindSession = async (messageId: string) => {
    if (!activeSessionId) return;
    if (!confirm("Are you sure you want to rewind the conversation to this checkpoint? All subsequent messages will be deleted.")) return;
    try {
      const res = await fetch("/api/chat/rewind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSessionId, messageId })
      });
      if (res.ok) {
        setChatMessages(prev => {
          const idx = prev.findIndex(m => m.id === messageId);
          if (idx !== -1) {
            return prev.slice(0, idx + 1);
          }
          return prev;
        });
        fetchSessionsList();
      }
    } catch (e) {
      console.error("Rewind failed:", e);
    }
  };

  const handleApproveStep = async (approvalId: string) => {
    if (!activeSessionId) return;
    try {
      const res = await fetch("/api/chat/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSessionId, approvalId })
      });
      if (res.ok) {
        setChatMessages(prev =>
          prev.map(m => m.id === approvalId ? { ...m, status: 'approved' } : m)
        );
      }
    } catch (e) {
      console.error("Approval failed:", e);
    }
  };

  const handleRejectStep = async (approvalId: string) => {
    if (!activeSessionId) return;
    const feedback = prompt("Please provide feedback or instructions to redirect the agent:");
    if (feedback === null) return; // cancelled
    try {
      const res = await fetch("/api/chat/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSessionId, approvalId, feedback })
      });
      if (res.ok) {
        setChatMessages(prev =>
          prev.map(m => m.id === approvalId ? { ...m, status: 'rejected' } : m)
        );
      }
    } catch (e) {
      console.error("Rejection failed:", e);
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim()) return;
    
    if (!customText) setChatInput("");
    const targetAgent = chatMode === 'collab' ? 'orchestrator' : activeAgent;
    setThreadLoading(prev => ({ ...prev, [targetAgent]: true }));

    try {
      const EXECUTABLE_AGENTS = ["agy", "hermes", "openclaw", "claude", "aider", "obsidian", "ollama", "lmstudio", "orchestrator"];
      const effectiveAgent = EXECUTABLE_AGENTS.includes(targetAgent) ? targetAgent : "hermes";
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textToSend,
          model: activeModel,
          agent: effectiveAgent,
          providerAgent: targetAgent,
          orchestratorAgent: activeAgent,
          selectedSkill: selectedManualSkill,
          activeSessionId: activeSessionId
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.sessionId) {
          setActiveSessionId(data.sessionId);
          fetchSessionsList();
        }
      } else {
        throw new Error("HTTP error: " + res.status);
      }
    } catch (e: any) {
      console.error("Failed to send query:", e);
      setThreadLoading(prev => ({ ...prev, [targetAgent]: false }));
    }
  };

  // Send user intervention comment to the active running swarm
  const handleSendIntervention = async (text: string, customInputKey?: string) => {
    if (!text.trim()) return;
    
    const userMsgId = 'msg-intervene-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    
    setChatMessages(prev => [...prev, { 
      id: userMsgId, 
      agent: "user", 
      msg: text, 
      time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) 
    }]);
    
    if (customInputKey) {
      setThreadReplyInputs(prev => ({ ...prev, [customInputKey]: "" }));
    } else {
      setChatInput("");
    }
    
    try {
      await fetch("/api/chat/intervene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          activeSessionId
        })
      });
    } catch (err) {
      console.error("Failed to send intervention:", err);
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

  // Execute terminal command on host shell
  const handleRunCommand = async () => {
    if (!terminalInput.trim()) return;
    const cmd = terminalInput;
    setTerminalInput("");

    // Add input echo directly to logs
    setTerminalLogs(prev => [...prev, { type: 'input', text: `Gary@AGENT-OS:~$ ${cmd}` }]);

    try {
      await fetch('/api/terminal/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });
    } catch (e: any) {
      setTerminalLogs(prev => [...prev, { type: 'error', text: `Failed to send input: ${e.message}` }]);
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
          // Clear chat when switching models so the old conversation doesn't bleed through
          setChatMessages([]);
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
    setActiveSessionId(sessionId);
    setCenterTab("chat");
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

  if (false as any) {
    console.log(teams, mailbox, teamsLoading, mailboxLoading, SwarmDiagnosticsPanel, MODEL_USAGE, PieChart, Pie, Cell);
    const _t: TeamAgent | null = null;
    console.log(_t);
  }

  const currentAgent = chatMode === 'collab'
    ? { id: "orchestrator", name: "Swarm Orchestrator", role: "Manager · Coordinator", icon: <Users size={18} />, status: "online", color: "#6366f1" }
    : (agents.find(a => a.id === activeAgent) || agents[0]);

  const messageTree = chatMode === 'collab'
    ? buildMessageTree(chatMessages)
    : chatMessages.map(m => ({ ...m, replies: [] }));

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
            <div className="text-[9px] font-mono text-gray-500">v2.6.0 • Intelligence & Memory Sync</div>
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
              onClick={() => {
                setShowVersionHistory(!showVersionHistory);
                if (!showVersionHistory) {
                  fetchEvolutionStatus();
                }
              }}
              className="flex items-center gap-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded px-2 py-0.5 text-[9px] font-bold tracking-wider font-mono shadow-[0_0_10px_rgba(168,85,247,0.15)] transition-all cursor-pointer select-none"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              v2.6.0
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
                        <span className="text-[9.5px] font-bold text-indigo-300 font-mono">v2.6.0 (Active)</span>
                        <span className="text-[8px] text-gray-500">Active</span>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">
                        Intelligence & Memory Sync: Added local trending feed scraper and FastMCP intelligence server, global long-term memory graph synchronization, token-protected secure API gateway, and neural Edge TTS Q&A audio generator.
                      </p>
                    </div>
                    <div className="border-l-2 border-purple-500 pl-2 py-0.5 opacity-60 hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-bold text-purple-300 font-mono">v2.5.3</span>
                        <span className="text-[8px] text-gray-500">Previous</span>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">
                        Auto-Evolution: Synced new AI models, refreshed database indexes, and refactored system workspace code integrity.
                      </p>
                    </div>
                    <div className="border-l-2 border-purple-500 pl-2 py-0.5 opacity-60 hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-bold text-purple-300 font-mono">v2.5.2</span>
                        <span className="text-[8px] text-gray-500">Previous</span>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">
                        Stateful persistent terminal console, native Claude Code and OpenClaw CLI integration, multi-model failover retry routing, and real-time SSE progress stream.
                      </p>
                    </div>
                  <div className="mt-3 pt-2.5 border-t border-white/[0.05] text-[9.5px]">
                    <div className="flex items-center justify-between font-bold text-gray-300 mb-1 text-[9.5px]">
                      <span>⚙️ Auto-Evolution Engine</span>
                      <span className="text-[8px] text-green-400">Daily at 2 AM</span>
                    </div>
                    {evolutionStatus ? (
                      <div className="text-gray-400 text-[8.5px] leading-relaxed mb-2 font-mono">
                        Last Run: {evolutionStatus.timestamp ? new Date(evolutionStatus.timestamp).toLocaleString('en-GB') : 'Unknown'}
                        <br />
                        Info: {evolutionStatus.info || 'Auto-evolution active.'}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-[8.5px] mb-2 font-mono">
                        Monitoring codebase for improvements...
                      </div>
                    )}
                    <button
                      onClick={handleRevertEvolution}
                      disabled={isReverting}
                      className="w-full mt-1.5 flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/35 text-red-400 font-bold rounded py-1 px-2.5 text-[9px] font-mono shadow-[0_0_8px_rgba(239,68,68,0.1)] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isReverting ? "Reverting..." : "Revert Evolution ↩️"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

          <div className="flex items-center gap-4">
            {/* Global Header Mode Switcher */}
            <div className="flex bg-[#04040c]/40 border border-white/[0.04] rounded-md p-1 gap-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
              <button
                id="header-swarm-mode-btn"
                onClick={() => handleSwitchThread('collab', activeAgent)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-extrabold transition-all duration-200 cursor-pointer ${
                  chatMode === 'collab'
                    ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/35 shadow-[0_0_12px_rgba(99,102,241,0.12)]"
                    : "text-gray-400 hover:text-white hover:bg-white/[0.03] border border-transparent"
                }`}
              >
                <Users size={11} /> Swarm Mode
              </button>
              <button
                id="header-specialist-mode-btn"
                onClick={() => handleSwitchThread('single', activeAgent)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-extrabold transition-all duration-200 cursor-pointer ${
                  chatMode === 'single'
                    ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/35 shadow-[0_0_12px_rgba(99,102,241,0.12)]"
                    : "text-gray-400 hover:text-white hover:bg-white/[0.03] border border-transparent"
                }`}
              >
                <Bot size={11} /> Specialist Mode
              </button>
            </div>

            <div className="flex items-center gap-2 border-l border-white/10 pl-4 relative">
              {/* Notification Bell */}
              <div className="relative flex items-center">
                <button
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer relative"
                  title="System Alerts"
                >
                  <Bell size={13} />
                  {notifications.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                    </span>
                  )}
                </button>

                {/* Dropdown Menu */}
                {isNotificationOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-[#0a0a12]/95 border border-white/[0.08] backdrop-blur-md rounded-xl p-3 shadow-2xl z-50 flex flex-col gap-2">
                    <div className="flex justify-between items-center border-b border-white/[0.05] pb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">System Alerts ({notifications.length})</span>
                      {notifications.length > 0 && (
                        <button
                          onClick={() => {
                            setNotifications([]);
                          }}
                          className="text-[9px] text-red-400 hover:underline uppercase font-bold"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 py-1 pr-1 font-mono text-[10px]">
                      {notifications.length === 0 ? (
                        <div className="text-gray-500 text-center py-2">No system alerts active.</div>
                      ) : (
                        notifications.map((notif, idx) => (
                          <div key={idx} className="bg-white/[0.02] border border-white/[0.04] p-2 rounded-lg text-gray-300 relative flex flex-col gap-1">
                            <div className="flex items-start gap-1">
                              <span className="text-yellow-500 font-bold shrink-0">🔧</span>
                              <span>{notif}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded text-[10px] ml-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                </span>
                <span className="text-green-400 font-mono font-bold tracking-wide">SYSTEMS ONLINE</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ CORE LAYOUT ═══ */}
      <div className="flex-1 flex overflow-hidden relative p-4 gap-4 bg-[#03030b]/30">

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
            <div className="flex-1 overflow-y-auto p-4 space-y-5 font-sans">
              {/* Mode Toggle Switcher */}
              <div className="space-y-2 pb-2.5 border-b border-white/[0.04] select-none">
                <div className="text-gray-500 text-[9px] font-bold uppercase tracking-widest font-mono">
                  Workspace Mode
                </div>
                <div className="flex bg-black/50 border border-white/[0.08] p-1 rounded-xl gap-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] w-full">
                  <button
                    id="sidebar-swarm-mode-btn"
                    onClick={() => handleSwitchThread('collab', activeAgent)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-extrabold transition-all duration-200 cursor-pointer ${
                      chatMode === 'collab'
                        ? "bg-indigo-600 text-white border border-indigo-400/35 shadow-[0_0_10px_rgba(99,102,241,0.35)]"
                        : "text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent"
                    }`}
                  >
                    <Users size={11} /> Swarm Mode
                  </button>
                  <button
                    id="sidebar-specialist-mode-btn"
                    onClick={() => handleSwitchThread('single', activeAgent)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-extrabold transition-all duration-200 cursor-pointer ${
                      chatMode === 'single'
                        ? "bg-indigo-600 text-white border border-indigo-400/35 shadow-[0_0_10px_rgba(99,102,241,0.35)]"
                        : "text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent"
                    }`}
                  >
                    <Bot size={11} /> Specialist
                  </button>
                </div>
              </div>

              {/* Swarm Node List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-gray-500 text-[9px] font-bold uppercase tracking-widest select-none">
                  <span>Layer Agents</span>
                  <span>{agents.filter(a => a.status === 'online').length}/{agents.length} Online</span>
                </div>
                <div className="space-y-1">
                  {agents.map(agent => {
                    const isActive = activeSpecialistId === agent.id;
                    return (
                      <button
                        key={agent.id}
                        onClick={() => {
                          handleOpenSpecialistPanel(agent.id);
                          setCenterTab("chat");
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
                            <span className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                              {agent.name}
                              {threadLoading[agent.id] && (
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" title="Executing background job..." />
                              )}
                            </span>
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
                  {((cronJobs && cronJobs.length > 0) ? cronJobs : CRON_JOBS).map(job => (
                    <div key={job.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.01] border border-[#1e1b4b]/20 hover:border-indigo-500/25 text-[10px] transition-all group">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleCron(job.id, job.status)}
                          className="relative flex h-2 w-2 shrink-0 cursor-pointer"
                          title={job.status === "running" ? "Pause Job" : "Start Job"}
                        >
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${job.status === "running" ? "bg-green-400" : "bg-red-400"}`}></span>
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${job.status === "running" ? "bg-green-500" : "bg-red-500"}`}></span>
                        </button>
                        <span className="text-gray-300 truncate max-w-[105px] font-medium" title={job.name}>{job.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[9px]">
                        <span className="text-gray-500">{job.interval}</span>
                        <button
                          onClick={() => handleRunCron(job.name)}
                          className="text-gray-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer font-sans"
                          title="Trigger Run Now"
                        >
                          ▶
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Left Settings Button */}
              <div className="pt-2.5 border-t border-white/[0.04]">
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left border border-transparent hover:border-white/[0.04] hover:bg-white/[0.02] text-gray-400 hover:text-white transition-all cursor-pointer font-bold font-mono text-[10px] select-none"
                >
                  <Settings size={12} className="text-indigo-400" />
                  <span>⚙️ SYSTEM SETTINGS</span>
                </button>
              </div>
            </div>
          ) : (
            /* Collapsed left rail icon indicators */
            <div className="flex-1 flex flex-col items-center py-4 space-y-4">
              {/* Collapsed Mode Toggle Button */}
              <button
                id="collapsed-mode-toggle-btn"
                onClick={() => handleSwitchThread(chatMode === 'collab' ? 'single' : 'collab', activeAgent)}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all duration-200 cursor-pointer relative group ${
                  chatMode === 'collab'
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.15)] animate-pulse'
                    : 'bg-white/[0.015] border-white/[0.04] text-gray-500 hover:text-gray-300 hover:border-indigo-500/30'
                }`}
              >
                {chatMode === 'collab' ? <Users size={14} /> : <Bot size={14} />}
                <div className="absolute left-12 top-1.5 bg-[#0a0a16] border border-white/[0.08] text-[9.5px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap">
                  Toggle Mode ({chatMode === 'collab' ? 'Swarm' : 'Specialist'})
                </div>
              </button>
              <div className="w-full border-t border-white/[0.04] my-1" />

              {agents.map(agent => (
                <div key={agent.id} className="relative group cursor-pointer" onClick={() => {
                  handleOpenSpecialistPanel(agent.id);
                  setIsLeftCollapsed(false);
                  setCenterTab("chat");
                }}>
                  <div className={`w-8 h-8 rounded-lg bg-white/[0.02] border flex items-center justify-center text-gray-400 hover:text-white transition-all ${
                    threadLoading[agent.id] ? 'border-green-500/50 animate-pulse bg-green-500/5' : 'border-white/[0.05] hover:border-indigo-500/30'
                  }`}>
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
              <div className="w-full border-t border-white/[0.04] my-2" />
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="w-8 h-8 rounded-lg bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.03] hover:border-indigo-500/30 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer relative group select-none"
              >
                <Settings size={13} className="text-indigo-400" />
                <div className="absolute left-12 top-1.5 bg-[#0a0a16] border border-white/[0.08] text-[9.5px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap">
                  System Settings
                </div>
              </button>
            </div>
          )}
        </aside>

        {/* ─── CENTER: WORKSPACE (CHAT / KANBAN / MONITOR / TERMINAL) ─── */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#04040c]/45 border border-white/[0.05] rounded-2xl overflow-hidden relative z-10 shadow-xl">
          {/* Workspace Tabs Header */}
          <div className="glass-strong h-16 flex items-center justify-between px-5 shrink-0 border-b border-white/[0.04] bg-[#03030d]/80 select-none">
            <div className="flex items-center gap-2">
              <div style={{ color: currentAgent.color }} className="drop-shadow-[0_0_5px_rgba(255,255,255,0.15)] shrink-0">{currentAgent.icon}</div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">{currentAgent.name} Core</span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/10 shrink-0" />
              <span className="text-[10px] font-mono text-gray-500 hidden sm:inline">{currentAgent.role}</span>
            </div>

            <div className="flex items-center">
              <button 
                onClick={toggleVoiceUpdates} 
                className={`px-2.5 py-1.5 rounded border transition-all cursor-pointer flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider mr-6 ${
                  voiceUpdatesEnabled 
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/25 shadow-[0_0_10px_rgba(168,85,247,0.15)]' 
                    : 'bg-white/[0.015] text-gray-500 border-white/[0.04] hover:text-gray-300 hover:bg-white/[0.03]'
                }`}
                title="Toggle Live Voice Updates during execution"
              >
                {voiceUpdatesEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
              </button>

              <div className="h-6 w-[1px] bg-white/10 mr-6 hidden md:block" />

              <div className="flex bg-[#04040c]/40 border border-white/[0.04] rounded-md p-1 gap-1.5 flex-nowrap overflow-x-auto scrollbar-none max-w-full">
              {[
                { id: "chat", label: "Chat", icon: <Bot size={12} /> },
                { id: "kanban", label: "Kanban", icon: <Kanban size={12} /> },
                { id: "swarm", label: "Swarm Hub", icon: <Users size={12} /> },
                { id: "paperclip", label: "Paperclip", icon: <Puzzle size={12} /> },
                { id: "studio", label: "Studio", icon: <Image size={12} /> },
                { id: "video-analyzer", label: "Video Analyzer", icon: <Video size={12} /> },
                { id: "seo-pipeline", label: "SEO Pipeline", icon: <Globe size={12} /> },
                { id: "workspace", label: "Workspace", icon: <FolderOpen size={12} /> },
                { id: "terminal", label: "Terminal", icon: <TerminalSquare size={12} /> },
                { id: "memory", label: "Memory", icon: <Database size={12} /> },
                { id: "nightly", label: "Intelligence", icon: <Sparkles size={12} /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCenterTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[10.5px] font-semibold transition-all duration-200 cursor-pointer shrink-0 ${
                    centerTab === tab.id
                      ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/35 shadow-[0_0_12px_rgba(99,102,241,0.12)]"
                      : "text-gray-400 hover:text-white hover:bg-white/[0.03] border border-transparent"
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
              </div>
            </div>
          </div>

          {/* ─── TAB: SWARM HUB ─── */}
          {centerTab === "swarm" && (
            <SwarmHubPanel 
              threadLoading={threadLoading}
              chatMessages={chatMessages}
              setChatMode={setChatMode}
              handleSendMessage={handleSendMessage}
            />
          )}

          {/* ─── TAB: PAPERCLIP SWARM ─── */}
          {centerTab === "paperclip" && (
            <PaperclipPanel />
          )}

          {/* ─── TAB 1: LIVE CONVERSATIONAL CHAT PANE ─── */}
          {centerTab === "chat" && (
            <div className="flex-grow flex overflow-hidden w-full h-full relative">
              <div className={`flex flex-col h-full overflow-hidden justify-between transition-all duration-300 relative ${
                activeSpecialistId && chatMode === 'collab' ? 'w-3/5 border-r border-white/[0.04]' : 'w-full'
              }`}>
              {/* Mode Selector Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-950/60 bg-[#070715] shadow-lg select-none shrink-0">
                <div className="flex items-center gap-4">
                  <span className="text-gray-300 text-[10px] font-extrabold uppercase tracking-widest font-mono border-r border-white/10 pr-4">Workspace Mode:</span>
                  <div className="flex bg-[#04040c]/40 border border-white/[0.04] rounded-md p-1 gap-1.5">
                    <button
                      onClick={() => handleSwitchThread('collab', activeAgent)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                        chatMode === 'collab'
                          ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/35 shadow-[0_0_12px_rgba(99,102,241,0.12)]"
                          : "text-gray-400 hover:text-white hover:bg-white/[0.03] border border-transparent"
                      }`}
                    >
                      <Users size={11} /> Swarm Collab
                    </button>
                    <button
                      onClick={() => handleSwitchThread('single', activeAgent)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                        chatMode === 'single'
                          ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/35 shadow-[0_0_12px_rgba(99,102,241,0.12)]"
                          : "text-gray-400 hover:text-white hover:bg-white/[0.03] border border-transparent"
                      }`}
                    >
                      <Bot size={11} /> Specialist Chat
                    </button>
                  </div>
                </div>

                {chatMode === 'collab' ? (
                  <div className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-md font-mono font-bold flex items-center gap-1.5 shadow-inner">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                    ⚡ Swarm Active (Delegated Execution)
                  </div>
                ) : (
                  <div className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-md font-mono font-bold flex items-center gap-1.5 shadow-inner">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Direct: {currentAgent.name}
                  </div>
                )}
              </div>

              {/* Centered Scrollable Conversation */}
              <div ref={chatScrollContainerRef} className="flex-grow overflow-y-auto p-3 scroll-smooth" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <div className="space-y-3" style={{ maxWidth: '1280px', width: '100%', marginLeft: 'auto', marginRight: 'auto' }}>
                  <AnimatePresence>
                    {chatMessages.length === 0 && !isCurrentLoading && (
                      <motion.div
                        key="welcome"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-16 text-center select-none"
                      >
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border shadow-lg"
                          style={{ backgroundColor: `${currentAgent?.color || '#a855f7'}15`, borderColor: `${currentAgent?.color || '#a855f7'}30`, color: currentAgent?.color || '#a855f7' }}>
                          {currentAgent?.icon || <Zap size={24} />}
                        </div>
                        <div className="text-white font-semibold text-lg mb-1">{currentAgent?.name || activeAgent}</div>
                        <div className="text-gray-500 text-xs mb-3 font-mono truncate max-w-xs">{activeModel}</div>
                        <div className="text-gray-600 text-xs">Send a message to start chatting</div>
                      </motion.div>
                    )}
                    {messageTree.map((msg, i) => {
                      const isUser = msg.agent === "user";
                      const isSystem = msg.agent === "system";
                      const agentMeta = agents.find(a => a.id === msg.agent);
                      
                      const isThreadHeader = msg.id && (
                        (msg.id.startsWith("msg_brainstorm_") && 
                         !msg.id.includes("_agy_") && 
                         !msg.id.includes("_orchestrator_") && 
                         !msg.id.includes("_openclaw_") && 
                         !msg.id.includes("_hermes_") && 
                         !msg.id.includes("_claude_")) || 
                        msg.id.startsWith("msg_critique_header_")
                      );
                      const hasReplies = msg.replies && msg.replies.length > 0;
                      
                      if (isThreadHeader || hasReplies) {
                        const uniqueAgents = Array.from(new Set((msg.replies || []).map(r => r.agent)));
                        const isExpanded = expandedThreads[msg.id || ""] || false;
                        
                        return (
                          <motion.div
                            key={msg.id || i}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#070712]/90 border border-[#1f2347]/30 shadow-md p-3.5 rounded-lg space-y-3"
                          >
                            <div className="flex gap-3 items-start">
                              <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-lg select-none"
                                style={{ 
                                  backgroundColor: `${agentMeta?.color || "#6366f1"}15`, 
                                  borderColor: `${agentMeta?.color || "#6366f1"}30`,
                                  color: agentMeta?.color || "#6366f1" 
                                }}
                              >
                                {agentMeta?.icon || <Zap size={16} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1.5 select-none">
                                  <span className="text-[12px] font-bold text-white font-mono">{agentMeta?.name || msg.agent}</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleOpenSpecialistPanel(msg.agent)}
                                      className="text-[10.5px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer select-none bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20"
                                      title={`Open 1-on-1 Chat with ${agentMeta?.name || msg.agent}`}
                                    >
                                      <MessageSquare size={10} />
                                      <span>1-on-1</span>
                                    </button>
                                    <span className="text-[9px] text-gray-500 font-mono">{msg.time}</span>
                                  </div>
                                </div>
                                <div className="text-[11.5px] text-[#cbd5e1] leading-relaxed">
                                  <Markdown text={msg.msg} />
                                </div>
                              </div>
                            </div>

                            {/* Thread Control Info Row */}
                            <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.04]">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-500 font-mono font-semibold select-none">Participants:</span>
                                <div className="flex -space-x-1.5 select-none">
                                  {uniqueAgents.map(aId => {
                                    const aMeta = agents.find(a => a.id === aId) || { name: aId, color: '#a855f7', icon: <Bot size={12} /> };
                                    return (
                                      <div 
                                        key={aId} 
                                        className="w-5.5 h-5.5 rounded-full border border-black flex items-center justify-center text-[10px]"
                                        style={{ backgroundColor: `${aMeta.color}20`, color: aMeta.color, borderColor: `${aMeta.color}40` }}
                                        title={aMeta.name || aId}
                                      >
                                        {aMeta.icon}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <button
                                onClick={() => setExpandedThreads(prev => ({ ...prev, [msg.id!]: !prev[msg.id!] }))}
                                className="text-xs font-mono font-extrabold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer select-none"
                              >
                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                <span>{isExpanded ? 'Hide discussion' : `Show discussion (${(msg.replies || []).length} replies)`}</span>
                              </button>
                            </div>

                            {/* Expanded Nested Replies */}
                            {isExpanded && (
                              <div className="pl-4 ml-4 border-l border-white/[0.06] space-y-3 mt-2 relative">
                                {(msg.replies || []).map((reply, rIdx) => {
                                  const replyAgentMeta = agents.find(a => a.id === reply.agent) || { name: reply.agent, color: '#a855f7', icon: <Bot size={14} /> };
                                  return (
                                    <div key={reply.id || rIdx} className="flex gap-3 items-start animate-[fadeIn_0.2s_ease-out]">
                                      <div 
                                        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[11px]"
                                        style={{ backgroundColor: `${replyAgentMeta.color}15`, color: replyAgentMeta.color, border: `1px solid ${replyAgentMeta.color}25` }}
                                      >
                                        {replyAgentMeta.icon}
                                      </div>
                                      <div className="flex-1 min-w-0 bg-white/[0.015] hover:bg-white/[0.025] border border-white/[0.03] rounded-md px-3 py-2 transition-all">
                                        <div className="flex items-center justify-between mb-1 select-none">
                                          <span className="text-[11px] font-bold text-white font-mono">{replyAgentMeta.name}</span>
                                          <span className="text-[8.5px] text-gray-500 font-mono">{reply.time}</span>
                                        </div>
                                        <div className="text-[12px] text-[#cbd5e1] leading-relaxed">
                                          <Markdown text={reply.msg} />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Inline Thread Reply Input */}
                                <div className="flex gap-2 items-center bg-black/40 border border-[#1f2347] focus-within:border-indigo-500/40 rounded-xl px-3 py-2 mt-3 transition-all select-none">
                                  <span className="text-gray-500 font-mono text-xs select-none">&gt;</span>
                                  <input
                                    value={threadReplyInputs[msg.id!] || ""}
                                    onChange={e => setThreadReplyInputs(prev => ({ ...prev, [msg.id!]: e.target.value }))}
                                    onKeyDown={e => {
                                      if (e.key === "Enter") {
                                        handleSendIntervention(threadReplyInputs[msg.id!] || "", msg.id!);
                                      }
                                    }}
                                    placeholder={`Reply to this ${msg.id?.startsWith("msg_brainstorm_") ? "brainstorm" : "critique"} discussion...`}
                                    className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
                                  />
                                </div>
                              </div>
                            )}
                          </motion.div>
                        );
                      }

                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-3.5 py-4 px-6 border-b border-white/[0.03] hover:bg-white/[0.005] transition-all relative"
                        >
                          <div
                            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 border select-none text-[12px]"
                            style={{ 
                              backgroundColor: isUser ? "rgba(99,102,241,0.1)" : isSystem ? "rgba(234,179,8,0.1)" : `${agentMeta?.color || "#a855f7"}15`, 
                              borderColor: isUser ? "rgba(99,102,241,0.2)" : isSystem ? "rgba(234,179,8,0.2)" : `${agentMeta?.color || "#a855f7"}30`,
                              color: isUser ? "#818cf8" : isSystem ? "#eab308" : agentMeta?.color || "#a855f7" 
                            }}
                          >
                            {isUser ? <span>👤</span> : isSystem ? <Shield size={13} /> : agentMeta?.icon || <Zap size={13} />}
                          </div>

                          <div className="flex-grow min-w-0">
                            {/* Message Header */}
                            <div className="flex items-center justify-between mb-1.5 select-none">
                              <div className="flex items-center gap-2">
                                <span className="text-[11.5px] font-bold font-mono text-white">
                                  {isUser ? "USER" : isSystem ? "SYSTEM SECURITY" : agentMeta?.name || msg.agent}
                                </span>
                                <span className="text-[9px] text-gray-500 font-mono">{msg.time || "just now"}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {msg.id && (
                                  <button
                                    onClick={() => handleRewindSession(msg.id!)}
                                    className="text-[9px] font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-0.5 cursor-pointer select-none bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20"
                                    title="Rewind session history to this checkpoint"
                                  >
                                    <span>🔄</span>
                                    <span>Rewind</span>
                                  </button>
                                )}
                                {!isUser && !isSystem && !msg.isError && (
                                  <button
                                    onClick={() => handleOpenSpecialistPanel(msg.agent)}
                                    className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer select-none bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20"
                                    title={`Open 1-on-1 Chat with ${agentMeta?.name || msg.agent}`}
                                  >
                                    <MessageSquare size={9} />
                                    <span>1-on-1</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Message Body */}
                            {msg.isError && (
                              <div className="flex items-center gap-1.5 text-red-400 font-bold mb-1.5 text-xs select-none">
                                <AlertTriangle size={12} /> Execution Failure
                              </div>
                            )}

                            <div className="text-[12.5px] text-[#cbd5e1] leading-relaxed break-words select-text">
                              <Markdown text={msg.msg} />
                            </div>

                            {msg.status === 'pending_approval' && (
                              <div className="mt-3 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl space-y-3 select-none">
                                <div className="text-xs font-extrabold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                                  <Shield size={12} className="animate-pulse" /> Security Gatekeeper Verification Required
                                </div>
                                <p className="text-[11px] text-gray-400 leading-normal">
                                  This execution step requires human confirmation. You can approve the action or reject it.
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleApproveStep(msg.id!)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-extrabold transition-all cursor-pointer shadow-md select-none"
                                  >
                                    ✅ Approve Action
                                  </button>
                                  <button
                                    onClick={() => handleRejectStep(msg.id!)}
                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-extrabold transition-all cursor-pointer shadow-md select-none"
                                  >
                                    ❌ Reject Action
                                  </button>
                                </div>
                              </div>
                            )}

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
                                  <div className="pl-2 border-l border-white/[0.06] space-y-1 mt-2 max-h-40 overflow-y-auto select-text">
                                    {msg.tools.map((t, idx) => (
                                      <div key={idx} className="text-gray-500">{t}</div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Clickable Actions */}
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
                                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/30 hover:border-indigo-500/50 text-[10px] font-medium text-indigo-300 hover:text-white transition-all cursor-pointer select-none"
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

                          </div>
                        </motion.div>
                      );
                    })}
                    {isCurrentLoading && (
                      <div className="flex gap-3.5 py-4 px-6 border-b border-white/[0.03] select-none">
                        <div className="w-7 h-7 rounded-md flex items-center justify-center bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-pulse">
                          <Zap size={13} />
                        </div>
                        <div className="flex-1 text-[12px] text-gray-400 flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                          </span>
                          <span className="font-mono text-xs">{loadingMessages[loadingStep]}</span>
                        </div>
                      </div>
                    )}
                  </AnimatePresence>
                  <div ref={chatBottomRef} />
                </div>
              </div>

              {/* Centered Floating Input Container */}
              <div className="p-5 border-t border-white/[0.04] bg-[#03030d]/50 select-none flex justify-center w-full">
                <div className="chat-container-centered">
                  <div className="w-full flex flex-col gap-2">
                    <div className="w-full flex items-center bg-[#0d0f22]/90 border border-[#1f2347] rounded-lg shadow-[0_4px_30px_rgba(0,0,0,0.5)] focus-within:border-indigo-500/50 focus-within:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all">
                      <span className="text-gray-500 font-mono pl-4 pr-1 select-none text-xs">&gt;</span>
                      <input
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            if (isCurrentLoading) {
                              handleSendIntervention(chatInput);
                            } else {
                              handleSendMessage();
                            }
                          }
                        }}
                        placeholder={isCurrentLoading ? "Type to chat with AGY / send feedback to active swarm..." : `Type your command or ask ${currentAgent.name}...`}
                        className="w-full bg-transparent pl-2 pr-4 py-2.5 text-[12px] text-white placeholder-gray-500 focus:outline-none"
                      />
                    </div>
                    
                    {/* Controls Row (Below the Input Field) */}
                    <div className="flex items-center justify-end gap-2 px-1">
                      <button
                        type="button"
                        onClick={handleOrchestratorInterrupt}
                        title="Interrupt Swarm Execution"
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <XCircle size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleAutonomous}
                        title={activeAutonomous ? "Continuous 24H Loop Active (Click to disable)" : "Continuous 24H Loop (Click to enable)"}
                        className={`p-2 transition-all cursor-pointer rounded-lg ${
                          activeAutonomous
                            ? "text-emerald-400 bg-emerald-500/10 shadow-[0_0_10px_rgba(52,211,153,0.2)]"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        <RefreshCw size={14} className={activeAutonomous ? "animate-spin" : ""} />
                      </button>
                      <button 
                        type="button" 
                        onClick={toggleListening}
                        title={isListening ? "Listening... Click to stop" : "Voice Input (Mic)"}
                        className={`p-2 transition-all cursor-pointer rounded-lg ${
                          isListening 
                            ? "text-red-500 bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.2)]" 
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        <Radio size={14} className={isListening ? "animate-pulse" : ""} />
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
                        className="px-3 py-2 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:text-white hover:bg-indigo-500/20 transition-all cursor-pointer flex items-center gap-1.5 justify-center text-xs font-semibold shadow-[0_0_12px_rgba(99,102,241,0.12)]"
                        title="Send Message"
                      >
                        <Zap size={13} />
                        <span>Send</span>
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
                        className="flex items-center gap-1 text-[9px] text-gray-400 hover:text-white bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.08] px-2 py-0.5 rounded-md transition-all cursor-pointer whitespace-nowrap"
                      >
                        {tool.icon} {tool.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              </div>

              {/* Right Column: Specialist 1-on-1 Panel */}
              {activeSpecialistId && chatMode === 'collab' && (() => {
                const specAgentMeta = agents.find(a => a.id === activeSpecialistId) || { name: activeSpecialistId, color: '#6366f1', icon: <Bot size={16} />, role: 'Specialist Agent' };
                const specMessages = chatThreads[activeSpecialistId] || [];
                return (
                  <div className="w-2/5 flex flex-col h-full overflow-hidden bg-[#070715]/90 border-l border-white/[0.04] backdrop-blur-md justify-between animate-[slideInRight_0.25s_cubic-bezier(0.16,1,0.3,1)]">
                    {/* Header */}
                    <div className="glass-strong h-14 flex items-center justify-between px-4 shrink-0 border-b border-white/[0.04] bg-[#03030d]/80 select-none">
                      <div className="flex items-center gap-2">
                        <div style={{ color: specAgentMeta.color }} className="drop-shadow-[0_0_5px_rgba(255,255,255,0.15)] shrink-0">{specAgentMeta.icon}</div>
                        <span className="text-[11px] font-bold text-white uppercase tracking-wider">{specAgentMeta.name} (1-on-1)</span>
                      </div>
                      <button 
                        onClick={() => setActiveSpecialistId(null)}
                        className="text-gray-500 hover:text-white transition-colors cursor-pointer p-1"
                        title="Close 1-on-1 Chat"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Scrollable Conversation */}
                    <div className="flex-grow overflow-y-auto p-4 space-y-4">
                      {specMessages.map((m, idx) => {
                        const isUser = m.agent === 'user';
                        return (
                          <div key={m.id || idx} className={`flex gap-2.5 ${isUser ? 'justify-end' : ''}`}>
                            {!isUser && (
                              <div 
                                className="w-6.5 h-6.5 rounded-lg flex items-center justify-center shrink-0 border shadow-md"
                                style={{ backgroundColor: `${specAgentMeta.color}15`, borderColor: `${specAgentMeta.color}30`, color: specAgentMeta.color }}
                              >
                                {specAgentMeta.icon}
                              </div>
                            )}
                            <div 
                              className={`max-w-[80%] rounded-xl px-3.5 py-2.5 break-words text-xs ${
                                isUser 
                                  ? 'bg-indigo-600/20 border border-indigo-500/35 text-white shadow-[0_2px_12px_rgba(99,102,241,0.1)]' 
                                  : 'bg-white/[0.02] border border-white/[0.05] text-[#cbd5e1]'
                              }`}
                            >
                              <Markdown text={m.msg} />
                            </div>
                          </div>
                        );
                      })}
                      {threadLoading[activeSpecialistId] && (
                        <div className="flex gap-2.5">
                          <div 
                            className="w-6.5 h-6.5 rounded-lg flex items-center justify-center shrink-0 border shadow-md bg-white/[0.02] border-white/[0.05] text-indigo-400"
                          >
                            <Loader2 size={12} className="animate-spin" />
                          </div>
                          <div className="bg-white/[0.015] border border-white/[0.03] text-gray-500 text-[10px] px-3.5 py-2.5 rounded-xl animate-pulse">
                            Thinking/responding...
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-white/[0.04] bg-[#03030d]/50 select-none">
                      <div className="flex items-center bg-[#0d0f22]/90 border border-[#1f2347] rounded-xl px-2.5 py-1.5 focus-within:border-indigo-500/50 transition-all">
                        <input 
                          value={specialistChatInput}
                          onChange={e => setSpecialistChatInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") handleSendSpecialistMessage(activeSpecialistId);
                          }}
                          placeholder={`Ask ${specAgentMeta.name} directly...`}
                          className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none py-1"
                        />
                        <button 
                          onClick={() => handleSendSpecialistMessage(activeSpecialistId)}
                          className="p-1 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                        >
                          <Send size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
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

          {/* ─── TAB: MEDIA STUDIO ─── */}
          {centerTab === "studio" && (
            <div className="flex-grow flex gap-4 overflow-hidden p-4 min-h-0">
              {/* Studio Panel Controls */}
              <div className="w-1/3 flex flex-col gap-4 bg-white/[0.015] border border-white/[0.04] p-4 rounded-2xl overflow-y-auto">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Studio Control Room</div>
                </div>

                {/* Tab selector */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 border border-white/5 rounded-xl select-none">
                  <button
                    onClick={() => setInfographicTab("standard")}
                    className={`py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer ${
                      infographicTab === "standard"
                        ? "bg-indigo-600 text-white shadow-lg"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    🎨 Gen
                  </button>
                  <button
                    onClick={() => {
                      setInfographicTab("infographic");
                      setStudioMediaType("image");
                      setStudioStyle("Infographic");
                      setStudioAgent("zhipu");
                      setStudioModel("zhipu/cogview-3-flash");
                    }}
                    className={`py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer ${
                      infographicTab === "infographic"
                        ? "bg-indigo-600 text-white shadow-lg"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    📊 Info
                  </button>
                  <button
                    onClick={() => setInfographicTab("hyperframes")}
                    className={`py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer ${
                      infographicTab === "hyperframes"
                        ? "bg-indigo-600 text-white shadow-lg"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    🎬 Avatar
                  </button>
                </div>

                {infographicTab === "standard" && (
                  <>
                    {/* Media Type */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-gray-500 font-bold uppercase">Media Output Type</div>
                      <div className="grid grid-cols-2 gap-2">
                        {["image", "video"].map(t => (
                          <button
                            key={t}
                            onClick={() => {
                              setStudioMediaType(t as any);
                              if (t === "video") {
                                setStudioAgent("zhipu");
                                setStudioModel("zhipu/cogvideox-flash");
                              } else {
                                setStudioAgent("pollinations");
                                setStudioModel("pollinations-image");
                              }
                            }}
                            className={`py-2 rounded-xl border text-xs font-semibold uppercase cursor-pointer transition-all duration-200 ${
                              studioMediaType === t
                                ? "bg-indigo-600/20 border-indigo-500/50 text-white"
                                : "bg-white/[0.01] border-white/[0.02] text-gray-400 hover:text-gray-200"
                            }`}
                          >
                            {t === "image" ? "🖼️ Image" : "🎥 Video"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Agent Selection */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-gray-500 font-bold uppercase">Executing Swarm Agent</div>
                      <select
                        value={studioAgent}
                        onChange={e => {
                          const val = e.target.value;
                          setStudioAgent(val);
                          if (val === "gemini") setStudioModel("imagen-3.0-generate-002");
                          else if (val === "alibaba") setStudioModel("alibaba/wanx-v1");
                          else if (val === "zhipu") setStudioModel(studioMediaType === "image" ? "zhipu/cogview-3-flash" : "zhipu/cogvideox-flash");
                          else setStudioModel(studioMediaType === "image" ? "pollinations-image" : "pollinations-video");
                        }}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                      >
                        {studioMediaType === "image" ? (
                          <>
                            <option value="pollinations">Free Pollinations Engine (Default)</option>
                            <option value="gemini">Gemini Swarm Agent</option>
                            <option value="alibaba">Alibaba Swarm Agent</option>
                            <option value="zhipu">Zhipu Swarm Agent</option>
                          </>
                        ) : (
                          <>
                            <option value="zhipu">Zhipu Swarm Agent (Recommended)</option>
                            <option value="pollinations">Free Pollinations Video (Default)</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Model Selection */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-gray-500 font-bold uppercase">Active Engine Model</div>
                      <select
                        value={studioModel}
                        onChange={e => setStudioModel(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                      >
                        {studioAgent === "gemini" && (
                          <option value="imagen-3.0-generate-002">Imagen 3 (imagen-3.0-generate-002)</option>
                        )}
                        {studioAgent === "alibaba" && (
                          <option value="alibaba/wanx-v1">Tongyi Wanx (alibaba/wanx-v1)</option>
                        )}
                        {studioAgent === "zhipu" && (
                          studioMediaType === "image" ? (
                            <option value="zhipu/cogview-3-flash">CogView 3 Flash (zhipu/cogview-3-flash)</option>
                          ) : (
                            <option value="zhipu/cogvideox-flash">CogVideoX Flash (zhipu/cogvideox-flash)</option>
                          )
                        )}
                        {studioAgent === "pollinations" && (
                          studioMediaType === "image" ? (
                            <option value="pollinations-image">Pollinations Flux (Image)</option>
                          ) : (
                            <option value="pollinations-video">Pollinations (Video)</option>
                          )
                        )}
                      </select>
                    </div>

                    {/* Prompt Input */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center select-none">
                        <div className="text-[10px] text-gray-500 font-bold uppercase">Creative Prompt</div>
                        <button
                          onClick={handleEnhancePrompt}
                          disabled={isEnhancing || !studioPrompt.trim()}
                          className="text-[9px] px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 font-bold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isEnhancing ? "✨ Enhancing..." : "✨ Auto-prompt"}
                        </button>
                      </div>
                      <textarea
                        value={studioPrompt}
                        onChange={e => setStudioPrompt(e.target.value)}
                        placeholder={studioMediaType === "image" ? "Describe the image you want to create..." : "Describe the motion sequence or video scene..."}
                        className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
                      />
                    </div>

                    {/* Aspect Ratio */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-gray-500 font-bold uppercase">Aspect Ratio</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: "1:1", label: "Square (1:1)" },
                          { id: "16:9", label: "Wide (16:9)" },
                          { id: "9:16", label: "Tall (9:16)" }
                        ].map(aspect => (
                          <button
                            key={aspect.id}
                            onClick={() => setStudioAspect(aspect.id)}
                            className={`py-1.5 rounded-lg border text-[10px] font-semibold cursor-pointer transition-all ${
                              studioAspect === aspect.id
                                ? "bg-indigo-500/10 border-indigo-500/30 text-white"
                                : "bg-white/[0.01] border-white/[0.02] text-gray-400 hover:text-gray-200"
                            }`}
                          >
                            {aspect.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preset Style */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-gray-500 font-bold uppercase">Style Preset</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {["Cinematic", "Anime", "Cyberpunk", "Fantasy", "3D Render", "Watercolor", "Infographic"].map(style => (
                          <button
                            key={style}
                            onClick={() => setStudioStyle(style)}
                            className={`py-1.5 rounded-lg border text-[10px] font-semibold cursor-pointer transition-all ${
                              studioStyle === style
                                ? "bg-indigo-500/10 border-indigo-500/30 text-white"
                                : "bg-white/[0.01] border-white/[0.02] text-gray-400 hover:text-gray-200"
                            }`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {infographicTab === "hyperframes" && (
                  <>
                    {/* Voice Model selection */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-gray-500 font-bold uppercase">Avatar Voice Model</div>
                      <select
                        value={hyperframesVoice}
                        onChange={e => setHyperframesVoice(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                      >
                        <option value="Julian Goldie (UK)">Julian Goldie (UK - Deep Accent)</option>
                        <option value="Gary Pearce (UK)">Gary Pearce (Custom voice clone)</option>
                        <option value="Hermes Assistant (US)">Hermes Assistant (Synthesizer)</option>
                      </select>
                    </div>

                    {/* Script Input */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center select-none">
                        <div className="text-[10px] text-gray-500 font-bold uppercase">Video script text</div>
                        <button
                          onClick={() => {
                            setHyperframesScript("Welcome to the AI Profit Boardroom. In this video, we outline the exact 3-step sequence to deploy local agents that automate your social media capture, content generation, and publish schedule overnight.");
                          }}
                          className="text-[9px] px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-400 font-bold cursor-pointer transition-all"
                        >
                          ✨ Fetch Obsidian Context
                        </button>
                      </div>
                      <textarea
                        value={hyperframesScript}
                        onChange={e => setHyperframesScript(e.target.value)}
                        className="w-full h-28 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
                      />
                    </div>

                    {/* Template selection */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-gray-500 font-bold uppercase">Video template aspect</div>
                      <div className="grid grid-cols-2 gap-2">
                        {["TikTok Short (9:16)", "YouTube Landscape (16:9)"].map(t => (
                          <button
                            key={t}
                            onClick={() => setHyperframesTemplate(t)}
                            className={`py-2 rounded-xl border text-xs font-semibold uppercase cursor-pointer transition-all duration-200 ${
                              hyperframesTemplate === t
                                ? "bg-indigo-600/20 border-indigo-500/50 text-white"
                                : "bg-white/[0.01] border-white/[0.02] text-gray-400 hover:text-gray-200"
                            }`}
                          >
                            {t.includes("9:16") ? "📱 Vertical" : "📺 Wide"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {infographicTab === "infographic" && (
                  <>
                    {/* Diagram Type */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-gray-500 font-bold uppercase">Diagram Type</div>
                      <select
                        value={infoDiagramType}
                        onChange={e => setInfoDiagramType(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                      >
                        <option value="CCTV System Architecture">CCTV System Architecture Diagram</option>
                        <option value="WiFi Network Mesh Topology">WiFi Network Mesh Topology</option>
                        <option value="Starlink Internet Setup Flow">Starlink Internet Setup Flow</option>
                        <option value="Structured Ethernet Cabling Topology">Structured Ethernet Cabling Topology</option>
                      </select>
                    </div>

                    {/* Infographic Title */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-gray-500 font-bold uppercase">Main Header Title</div>
                      <input
                        type="text"
                        value={infoTitle}
                        onChange={e => setInfoTitle(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>

                    {/* Subtitle / Focus Area */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-gray-500 font-bold uppercase">Subtitle & Sub-heading</div>
                      <textarea
                        value={infoSubtitle}
                        onChange={e => setInfoSubtitle(e.target.value)}
                        className="w-full h-16 bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 resize-none"
                      />
                    </div>

                    {/* Keywords Checklist */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-gray-500 font-bold uppercase">Brand Keywords (Select 3)</div>
                      <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto border border-white/5 p-1.5 rounded-lg bg-black/20">
                        {[
                          "CCTV installations", "Starlink installations", "WiFi installations", "Mesh WiFi installations",
                          "Data cabling", "TV aerials", "TV antennas", "TV Wall mounting", "Security Systems", "Ajax Alarms",
                          "Hikvision security systems", "TP-Link specialists"
                        ].map(kw => {
                          const active = infoSelectedKeywords.includes(kw);
                          return (
                            <button
                              key={kw}
                              type="button"
                              onClick={() => {
                                setInfoSelectedKeywords(prev =>
                                  prev.includes(kw) ? prev.filter(x => x !== kw) : [...prev, kw]
                                );
                              }}
                              className={`text-[9px] truncate px-1.5 py-1 text-left rounded cursor-pointer transition-all ${
                                active ? "bg-indigo-500/20 text-white border border-indigo-500/30" : "text-gray-400 hover:bg-white/[0.02]"
                              }`}
                            >
                              {active ? "✅ " : ""}{kw}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Locations Checklist */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-gray-500 font-bold uppercase">Target Cities (Select 2)</div>
                      <div className="grid grid-cols-3 gap-1 max-h-20 overflow-y-auto border border-white/5 p-1.5 rounded-lg bg-black/20">
                        {[
                          "Leeds", "Manchester", "Yorkshire", "Bradford", "Blackburn", "Blackpool", "Bolton",
                          "Chester", "Crewe", "Darlington", "Derby", "Durham", "Doncaster", "Wakefield", "York"
                        ].map(loc => {
                          const active = infoSelectedLocations.includes(loc);
                          return (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => {
                                setInfoSelectedLocations(prev =>
                                  prev.includes(loc) ? prev.filter(x => x !== loc) : [...prev, loc]
                                );
                              }}
                              className={`text-[9px] truncate px-1.5 py-1 text-left rounded cursor-pointer transition-all ${
                                active ? "bg-indigo-500/20 text-white border border-indigo-500/30" : "text-gray-400 hover:bg-white/[0.02]"
                              }`}
                            >
                              {active ? "📍 " : ""}{loc}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Generate Button */}
                <button
                  onClick={infographicTab === "hyperframes" ? handleHyperframesGenerate : handleStudioGenerate}
                  disabled={
                    infographicTab === "hyperframes"
                      ? (hyperframesRendering || !hyperframesScript.trim())
                      : (studioGenerating || (infographicTab === "standard" && !studioPrompt.trim()))
                  }
                  className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    (infographicTab === "hyperframes" ? hyperframesRendering : studioGenerating)
                      ? "bg-indigo-600/20 text-indigo-300 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 hover:scale-[1.02]"
                  }`}
                >
                  {infographicTab === "hyperframes"
                    ? (hyperframesRendering ? `Rendering Avatar (${hyperframesProgress}%)` : "🎬 Render Hyperframes Video")
                    : (studioGenerating ? "⚡ Rendering Chart..." : "📊 Build Custom Chart")}
                </button>
              </div>

              {/* Preview & Active Screen */}
              <div className="flex-1 flex flex-col gap-4 min-w-0">
                <div className="flex-1 bg-[#04040c]/90 border border-white/[0.04] p-5 rounded-2xl flex flex-col relative min-h-0 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" /> Active Output Preview
                    </div>
                    {studioActiveUrl && (
                      <span className="text-[9px] px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 uppercase font-bold tracking-wider font-mono select-none">
                        {studioModel.replace('pollinations-', '').replace('alibaba/', '').replace('zhipu/', '')}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 flex items-center justify-center bg-black/60 border border-white/[0.05] rounded-xl overflow-hidden relative group/preview min-h-0">
                    {hyperframesRendering ? (
                      <div className="flex flex-col items-center gap-4 text-center p-6 bg-black/45 w-full h-full justify-center backdrop-blur-sm select-none">
                        <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                        <div>
                          <div className="text-xs font-bold text-white uppercase tracking-wider font-mono animate-pulse">Hyperframes Ingestion & Avatar Render</div>
                          <div className="text-[10px] text-purple-400 font-mono mt-1">voice: {hyperframesVoice} | progress: {hyperframesProgress}%</div>
                        </div>
                      </div>
                    ) : infographicTab === "hyperframes" && hyperframesRenderedUrl ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 select-text">
                        <div className="w-24 h-24 rounded-full border-2 border-indigo-500/40 bg-indigo-500/10 flex items-center justify-center text-3xl shadow-xl relative overflow-hidden select-none mb-4 animate-[pulse_2s_infinite]">
                          🧔
                          <div className="absolute bottom-0 inset-x-0 h-4 bg-indigo-600/30 flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          </div>
                        </div>
                        <div className="text-center space-y-2 max-w-sm mb-4">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Julian Goldie Talking Avatar Video</h4>
                          <p className="text-[10px] text-gray-500 font-mono">Format: MP4 (H.264) | Resolution: {hyperframesTemplate.includes("9:16") ? "1080x1920" : "1920x1080"}</p>
                          <div className="p-3 bg-[#070715] rounded-xl border border-white/[0.03] text-[9.5px] font-mono text-gray-400 leading-normal max-h-24 overflow-y-auto select-all">
                            "{hyperframesScript}"
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              alert("Mock video downloaded successfully to Desktop/hyperframes_latest.mp4!");
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer shadow-md select-none"
                          >
                            💾 Download Render
                          </button>
                        </div>
                      </div>
                    ) : studioGenerating ? (
                      <div className="flex flex-col items-center gap-3 text-center p-6 bg-black/40 w-full h-full justify-center backdrop-blur-sm">
                        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                        <div>
                          <div className="text-xs font-bold text-white uppercase tracking-wider animate-pulse">Rendering AI Asset</div>
                          <div className="text-[10px] text-gray-500 font-mono mt-1">style: {studioStyle} | ratio: {studioAspect}</div>
                        </div>
                      </div>
                    ) : studioActiveUrl ? (
                      <div className="w-full h-full flex items-center justify-center relative p-2 min-h-0">
                        {studioMediaType === "image" ? (
                          <img
                            src={studioActiveUrl}
                            alt="AI Preview"
                            className="max-w-full max-h-full rounded-lg object-contain shadow-[0_10px_50px_rgba(0,0,0,0.8)] border border-white/[0.05] transition-transform duration-300 group-hover/preview:scale-[1.01]"
                          />
                        ) : (
                          <video
                            src={studioActiveUrl}
                            controls
                            autoPlay
                            loop
                            className="max-w-full max-h-full rounded-lg object-contain shadow-[0_10px_50px_rgba(0,0,0,0.8)] border border-white/[0.05]"
                          />
                        )}

                        {/* Hover Overlay Controls */}
                        <div className="absolute inset-x-0 bottom-4 flex justify-center opacity-0 group-hover/preview:opacity-100 transition-all duration-300 transform translate-y-2 group-hover/preview:translate-y-0 pointer-events-none z-10">
                          <div className="flex items-center gap-1.5 px-3 py-2 bg-[#090916]/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md pointer-events-auto">
                            <button
                              onClick={handleSaveToGallery}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer shadow-lg"
                              title="Save to gallery"
                            >
                              <Save size={11} /> Save
                            </button>
                            <a
                              href={studioActiveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white rounded-lg text-[10px] font-bold uppercase transition-all"
                              title="Open image in new tab"
                            >
                              <Eye size={11} /> Open
                            </a>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(studioActiveUrl);
                                alert("Image URL copied to clipboard!");
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer"
                              title="Copy URL"
                            >
                              <ExternalLink size={11} /> Link
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2.5 text-center p-6 text-gray-500">
                        <span className="text-4xl filter grayscale opacity-45 select-none">🎨</span>
                        <div className="text-xs font-semibold select-none text-gray-400">Creative Canvas Awaiting Input</div>
                        <p className="text-[10px] text-gray-600 max-w-[200px] select-none">Configure your prompt and model on the left, then click generate to materialize your asset.</p>
                      </div>
                    )}
                  </div>

                  {/* Metadata Inspector Drawer */}
                  {studioActiveUrl && !studioGenerating && (
                    <div className="mt-4 p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl flex items-center justify-between gap-4 text-[10px] select-none">
                      <div className="flex-1 min-w-0">
                        <div className="text-[8px] uppercase font-bold text-gray-500 tracking-wider">Prompt Context</div>
                        <div className="text-gray-300 truncate font-mono mt-0.5" title={studioPrompt}>{studioPrompt}</div>
                      </div>
                      <div className="shrink-0 flex items-center gap-4 border-l border-white/[0.05] pl-4 text-right">
                        <div>
                          <div className="text-[8px] uppercase font-bold text-gray-500 tracking-wider">Engine</div>
                          <div className="text-white font-semibold mt-0.5">{studioAgent}</div>
                        </div>
                        <div>
                          <div className="text-[8px] uppercase font-bold text-gray-500 tracking-wider">Style</div>
                          <div className="text-white font-semibold mt-0.5">{studioStyle}</div>
                        </div>
                        <div>
                          <div className="text-[8px] uppercase font-bold text-gray-500 tracking-wider">Ratio</div>
                          <div className="text-white font-semibold mt-0.5">{studioAspect}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Infographic Description copywriter panel */}
                  {infographicTab === "infographic" && infoDescription && !studioGenerating && (
                    <div className="mt-4 p-4 bg-[#0a0a1e]/80 border border-white/[0.05] rounded-xl space-y-2 flex flex-col text-left">
                      <div className="flex justify-between items-center select-none">
                        <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">🎯 SEO Grounding Copywriter</div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(infoDescription);
                            alert("SEO Copy copied to clipboard!");
                          }}
                          className="text-[9px] px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold cursor-pointer transition-all shadow-md"
                        >
                          📋 Copy Markdown
                        </button>
                      </div>
                      <textarea
                        readOnly
                        value={infoDescription}
                        className="w-full h-32 bg-black/40 border border-white/5 rounded-lg p-2.5 text-[11px] font-mono text-gray-300 focus:outline-none resize-none"
                      />
                    </div>
                  )}
                </div>

                {/* Studio Mini Gallery */}
                <div className="h-44 bg-white/[0.015] border border-white/[0.04] p-4 rounded-2xl flex flex-col min-h-0">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Studio Assets Gallery ({studioGallery.length})</div>
                    <button
                      onClick={() => { if(confirm("Clear gallery?")) { setStudioGallery([]); localStorage.removeItem("agent_studio_gallery"); } }}
                      className="text-[9px] text-red-500 hover:underline uppercase font-bold cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="flex-1 flex gap-3 overflow-x-auto pb-1 min-h-0 text-white">
                    {studioGallery.map(item => (
                      <div
                        key={item.id}
                        className="w-32 h-full bg-black/60 rounded-xl border border-white/5 relative overflow-hidden group shrink-0"
                      >
                        {item.type === "image" ? (
                          <img src={item.url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-indigo-950/20">
                            <span className="text-2xl">🎥</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() => setStudioActiveUrl(item.url)}
                            className="p-1 bg-white/10 hover:bg-white/20 rounded text-white text-[10px] cursor-pointer"
                          >
                            <Eye size={12} />
                          </button>
                          <a
                            href={item.url}
                            download
                            className="p-1 bg-white/10 hover:bg-white/20 rounded text-white text-[10px]"
                          >
                            <Download size={12} />
                          </a>
                          <button
                            onClick={() => handleDeleteGalleryItem(item.id)}
                            className="p-1 bg-red-600/30 hover:bg-red-500 rounded text-red-400 text-[10px] cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {studioGallery.length === 0 && (
                      <div className="flex-1 flex items-center justify-center border border-dashed border-white/10 rounded-xl text-[10px] text-gray-600 uppercase select-none">
                        Studio Gallery Empty
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: WEBSITE WORKSPACE ─── */}
          {centerTab === "workspace" && (
            <div className="flex-grow flex gap-4 overflow-hidden p-4 min-h-0">
              {/* File Explorer (Left) */}
              {workspaceLeftOpen ? (
                <div className="w-1/5 bg-white/[0.015] border border-white/[0.04] p-4 rounded-2xl flex flex-col gap-3 min-h-0 shrink-0">
                  <div className="flex justify-between items-center border-b border-white/[0.05] pb-2">
                    <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Workspace Files</div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={fetchWorkspaceFiles} className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1" title="Refresh files">
                        <RefreshCw size={11} />
                      </button>
                      <button onClick={() => setWorkspaceLeftOpen(false)} className="p-1 rounded bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-gray-400 hover:text-white transition-all cursor-pointer" title="Collapse File Explorer">
                        <ChevronLeft size={11} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0 text-white">
                    {workspaceFiles.map(file => (
                      <div
                        key={file.path}
                        onClick={() => file.type === "file" && handleOpenFile(file.path)}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs select-none transition-all cursor-pointer ${
                          selectedFile === file.path
                            ? "bg-indigo-600/10 border border-indigo-500/20 text-white"
                            : "bg-white/[0.01] hover:bg-white/[0.02] border border-transparent text-gray-400 hover:text-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate" style={{ paddingLeft: `${(file.path.split('/').length - 1) * 12}px` }}>
                          <span>{file.type === "directory" ? "📁" : "📄"}</span>
                          <span className="truncate">{file.name}</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.path); }}
                          className="text-gray-600 hover:text-red-400 transition-colors p-0.5"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 border-t border-white/[0.05] pt-3">
                    <input
                      type="text"
                      value={newFileName}
                      onChange={e => setNewFileName(e.target.value)}
                      placeholder="New file (e.g. index.html)..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {/* Explorer button moved to footer */}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-12 bg-white/[0.015] border border-white/[0.04] py-4 rounded-2xl flex flex-col items-center gap-4 min-h-0 select-none shrink-0">
                  <button
                    onClick={() => setWorkspaceLeftOpen(true)}
                    className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-gray-400 hover:text-white transition-all cursor-pointer"
                    title="Open Files Explorer"
                  >
                    <FolderOpen size={14} />
                  </button>
                  <div className="flex-grow flex items-center justify-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono select-none [writing-mode:vertical-lr] rotate-180">
                      Explorer
                    </span>
                  </div>
                </div>
              )}

              {/* Code Editor & Live Preview (Center) */}
              <div className="flex-1 flex flex-row gap-4 min-w-0">
                {/* Visual Editor */}
                {workspaceEditorOpen && (
                  <div className="flex-1 bg-[#04040c]/90 border border-white/[0.04] p-4 rounded-2xl flex flex-col min-h-0">
                    <div className="flex justify-between items-center border-b border-white/[0.05] pb-2 mb-3">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Editor {selectedFile ? `— ${selectedFile}` : "(Select file to edit)"}
                      </div>
                      {selectedFile && (
                        <button
                          onClick={handleSaveFile}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Save size={10} /> Save Changes
                        </button>
                      )}
                    </div>

                    <textarea
                      value={editorContent}
                      onChange={e => setEditorContent(e.target.value)}
                      disabled={!selectedFile}
                      className="flex-1 w-full bg-black/30 border border-white/5 rounded-xl p-3 font-mono text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/20 resize-none min-h-0 overflow-y-auto"
                      placeholder="Select a file from the explorer list on the left to start building..."
                    />
                  </div>
                )}

                {/* Real-time Website Live Preview */}
                <div className="flex-1 bg-[#04040c]/90 border border-white/[0.04] p-4 rounded-2xl flex flex-col min-h-0">
                  <div className="flex justify-between items-center border-b border-white/[0.05] pb-2 mb-2">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <span>Workspace Preview Window</span>
                      <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${isViteRunning ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"}`}>
                        {isViteRunning ? "Vite Dev" : "Static preview"}
                      </span>
                    </div>
                    <div className="flex gap-3 items-center">
                      <button
                        onClick={() => setWorkspaceEditorOpen(prev => !prev)}
                        className="text-[9px] text-indigo-400 hover:underline uppercase font-bold cursor-pointer font-mono"
                      >
                        {workspaceEditorOpen ? "[📂 Hide Editor]" : "[📂 Show Editor]"}
                      </button>
                      <button
                        onClick={handleRunVisualAudit}
                        disabled={visualAuditLoading}
                        className="text-[9px] text-emerald-400 hover:underline uppercase font-bold cursor-pointer"
                      >
                        {visualAuditLoading ? "Auditing..." : "👁️ Run Visual Audit"}
                      </button>
                      <button
                        onClick={handleToggleVite}
                        disabled={viteLoading}
                        className="text-[9px] text-amber-400 hover:underline uppercase font-bold cursor-pointer"
                      >
                        {viteLoading ? "Loading..." : isViteRunning ? "⏹️ Stop Vite" : "⚡ Start Vite Dev"}
                      </button>
                      {/* Publishing control button moved to footer */}
                    </div>
                  </div>
                  <div className="flex-1 flex gap-4 min-h-0">
                    <div className="flex-1 bg-white rounded-xl overflow-hidden relative">
                      <iframe
                        key={previewKey}
                        src={viteUrl}
                        className="w-full h-full border-none"
                      />
                    </div>
                    {visualAuditReport && (
                      <div className="w-1/3 bg-black/45 border border-white/[0.05] rounded-xl p-3.5 overflow-y-auto select-text text-xs space-y-2.5 min-h-0 flex flex-col">
                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider select-none">
                          Visual Layout Audit Report
                        </div>
                        {visualAuditScreenshot && (
                          <div className="rounded-lg overflow-hidden border border-white/5 select-none bg-black/25">
                            <img src={visualAuditScreenshot} alt="Viewport Audit Capture" className="w-full h-auto object-cover" />
                          </div>
                        )}
                        <div className="flex-grow overflow-y-auto leading-relaxed text-gray-300 font-sans">
                          <Markdown text={visualAuditReport} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* FTP Deploy Control (Right) */}
              {workspaceRightOpen ? (
                <div className="w-1/4 bg-white/[0.015] border border-white/[0.04] p-4 rounded-2xl flex flex-col gap-4 min-h-0 shrink-0">
                  <div className="flex justify-between items-center border-b border-white/[0.05] pb-2">
                    <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">FTP Publishing Control</div>
                    <button onClick={() => setWorkspaceRightOpen(false)} className="p-1 rounded bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-gray-400 hover:text-white transition-all cursor-pointer" title="Collapse Publishing Control">
                      <ChevronRight size={11} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-500 font-bold uppercase">FTP Server Host</label>
                      <input
                        type="text"
                        value={ftpHost}
                        onChange={e => setFtpHost(e.target.value)}
                        placeholder="ftp.example.com"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/35"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[9px] text-gray-500 font-bold uppercase">Username</label>
                        <input
                          type="text"
                          value={ftpUser}
                          onChange={e => setFtpUser(e.target.value)}
                          placeholder="user"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/35"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 font-bold uppercase">Port</label>
                        <input
                          type="number"
                          value={ftpPort}
                          onChange={e => setFtpPort(e.target.value)}
                          placeholder="21"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/35"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-500 font-bold uppercase">Password</label>
                      <input
                        type="password"
                        value={ftpPass}
                        onChange={e => setFtpPass(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/35"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-500 font-bold uppercase">Remote Root Folder</label>
                      <input
                        type="text"
                        value={ftpRemoteDir}
                        onChange={e => setFtpRemoteDir(e.target.value)}
                        placeholder="/public_html"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/35"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleDeployWebsite}
                    disabled={ftpDeploying || !ftpHost.trim() || !ftpUser.trim()}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      ftpDeploying
                        ? "bg-indigo-600/20 text-indigo-300 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25"
                    }`}
                  >
                    {ftpDeploying ? "🚀 Uploading Assets..." : "🚀 Publish via FTP"}
                  </button>

                  {/* Live upload logger console */}
                  <div className="h-32 bg-black/50 border border-white/5 rounded-xl p-3 font-mono text-[9px] text-gray-400 overflow-y-auto shrink-0 flex flex-col">
                    <div className="text-[8px] font-bold text-gray-500 uppercase mb-1.5 pb-1 border-b border-white/5 select-none">Deploy Console Logs</div>
                    <div className="flex-grow space-y-1 overflow-y-auto">
                      {ftpLogs.map((logLine, index) => (
                        <div key={index} className="leading-relaxed border-l-2 border-indigo-500/30 pl-1.5">{logLine}</div>
                      ))}
                      {ftpLogs.length === 0 && <div className="text-gray-600 text-center py-4">Waiting to deploy...</div>}
                    </div>
                  </div>

                  {/* Unified Campaign Swarm Publisher */}
                  <div className="border-t border-white/[0.05] pt-4 flex flex-col gap-3 min-h-0 flex-1">
                    <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/[0.05] pb-2">Campaign Swarm Publisher</div>
                    <div className="space-y-2 select-none">
                      <input
                        type="text"
                        value={campaignTitle}
                        onChange={e => setCampaignTitle(e.target.value)}
                        placeholder="Campaign Title (e.g. Smart Home)..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/35"
                      />
                      <textarea
                        value={campaignTopic}
                        onChange={e => setCampaignTopic(e.target.value)}
                        placeholder="Brief topic or campaign guidelines..."
                        className="w-full h-16 bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/35 resize-none"
                      />
                    </div>
                    <button
                      onClick={handleLaunchCampaign}
                      disabled={campaignRunning || !campaignTitle.trim() || !campaignTopic.trim()}
                      className={`w-full py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                        campaignRunning
                          ? "bg-cyan-600/20 text-cyan-300 cursor-not-allowed"
                          : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/25"
                      }`}
                    >
                      {campaignRunning ? "⚡ Campaign Swarm Active..." : "🚀 Launch Swarm Campaign"}
                    </button>

                    <div className="flex-grow bg-black/50 border border-white/5 rounded-xl p-2.5 font-mono text-[8px] text-gray-400 overflow-y-auto min-h-0 flex flex-col">
                      <div className="text-[7.5px] font-bold text-gray-500 uppercase mb-1 pb-0.5 border-b border-white/5 select-none">Swarm Run logs</div>
                      <div className="flex-grow space-y-1 overflow-y-auto">
                        {campaignLogs.map((logLine, index) => (
                          <div key={index} className="leading-relaxed border-l-2 border-cyan-500/30 pl-1.5">{logLine}</div>
                        ))}
                        {campaignLogs.length === 0 && <div className="text-gray-600 text-center py-2">Swarm idle.</div>}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-12 bg-white/[0.015] border border-white/[0.04] py-4 rounded-2xl flex flex-col items-center gap-4 min-h-0 select-none shrink-0">
                  <button
                    onClick={() => setWorkspaceRightOpen(true)}
                    className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-gray-400 hover:text-white transition-all cursor-pointer"
                    title="Open Publishing Control"
                  >
                    <Globe size={14} />
                  </button>
                  <div className="flex-grow flex items-center justify-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono select-none [writing-mode:vertical-lr] rotate-180">
                      Publishing
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 3: HOST TERMINAL CONSOLE ─── */}
          {centerTab === "terminal" && (
            <div className="flex-grow flex flex-col overflow-hidden bg-[#04040c]/90 p-4 font-mono text-xs border border-white/[0.04] rounded-2xl">
              <div className="flex justify-between items-center mb-4 border-b border-white/[0.05] pb-3 select-none">
                <span className="text-gray-400 font-semibold text-xs tracking-wider">PERSISTENT SYSTEM SHELL (POWERSHELL)</span>
                <button 
                  onClick={async () => {
                    await fetch('/api/terminal/kill', { method: 'POST' });
                    setTerminalLogs([]);
                  }}
                  className="px-3 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs transition-colors cursor-pointer font-sans"
                >
                  Reset Session
                </button>
              </div>
              <div ref={terminalContainerRef} className="flex-grow overflow-y-auto space-y-2 pr-2 select-text custom-scrollbar">
                {terminalLogs.map((log, index) => (
                  <div key={index} className={`whitespace-pre-wrap ${
                    log.type === 'input' ? 'text-indigo-300 font-semibold' : log.type === 'error' ? 'text-red-400' : 'text-[#cbd5e1]'
                  }`}>
                    {log.text}
                  </div>
                ))}
                <div ref={terminalBottomRef} />
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-white/[0.05] select-none">
                <span className="text-indigo-400 font-bold shrink-0">PS Gary&gt;</span>
                <input
                  type="text"
                  value={terminalInput}
                  onChange={e => setTerminalInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleRunCommand()}
                  className="flex-grow bg-transparent text-white focus:outline-none placeholder-gray-600 select-text"
                  placeholder="Type commands here... (e.g. dir, node -v, claude)"
                />
              </div>
            </div>
          )}

          {/* ─── TAB 3.5: SWARM SHARED MEMORY VAULT ─── */}
          {centerTab === "vault" && (
            <VaultPanel />
          )}



          {centerTab === "memory" && (
            <VectorMemoryPanel />
          )}

          {/* ─── TAB: NIGHTLY INTELLIGENCE ─── */}
          {centerTab === "nightly" && (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#070713]/40">
              {/* Header */}
              <div className="p-4 border-b border-white/[0.05] flex justify-between items-center bg-[#070713]/55 shrink-0">
                <div>
                  <h3 className="text-xs font-bold text-white tracking-wide font-mono flex items-center gap-2">
                    <span className="text-indigo-400">◈</span>
                    OVERNIGHT INTELLIGENCE CYCLE
                  </h3>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono font-bold block mt-0.5">
                    Self-research · Analysis · Proposals · API rotation — runs 1am–6am nightly
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setNightlyLoading(true);
                      try {
                        const r = await fetch('/api/nightly-report');
                        const d = await r.json();
                        setNightlyReport(d.exists ? d.report : null);
                        const u = await fetch('/api/api-usage');
                        const ud = await u.json();
                        setApiUsageState(ud);
                      } catch {}
                      setNightlyLoading(false);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-semibold border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all cursor-pointer"
                  >
                    {nightlyLoading ? '⟳ Loading...' : '⟳ Refresh'}
                  </button>
                  <button
                    onClick={async () => {
                      if (nightlyRunning) return;
                      setNightlyRunning(true);
                      try {
                        await fetch('/api/nightly-cycle/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ force: true }) });
                      } catch {}
                      setTimeout(() => setNightlyRunning(false), 3000);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                      nightlyRunning
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse'
                        : 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25'
                    }`}
                  >
                    {nightlyRunning ? '⟳ Running...' : '▷ Run Cycle Now'}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* No report yet */}
                {!nightlyReport && !nightlyLoading && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                      <span className="text-2xl">◈</span>
                    </div>
                    <p className="text-sm font-bold text-white font-mono">No report yet</p>
                    <p className="text-[11px] text-gray-500 mt-1 max-w-sm">The first cycle runs automatically at 1am. Click "Run Cycle Now" to trigger it immediately (force mode).</p>
                    <button
                      onClick={() => { setNightlyLoading(true); fetch('/api/api-usage').then(r => r.json()).then(d => { setApiUsageState(d); setNightlyLoading(false); }).catch(() => setNightlyLoading(false)); }}
                      className="mt-4 px-4 py-2 rounded text-[10px] font-semibold bg-white/[0.03] border border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                    >
                      Load API Usage State
                    </button>
                  </div>
                )}

                {/* Executive Summary */}
                {nightlyReport && (
                  <>
                    <div className="bg-[#0b0b1e]/80 border border-indigo-500/20 rounded-xl p-4 shadow-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider font-mono">Executive Summary</h4>
                        <span className="text-[9px] text-gray-600 font-mono">{nightlyReport.generated_at ? new Date(nightlyReport.generated_at).toLocaleString() : ''} · {nightlyReport.cycle_duration_min}min</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">{nightlyReport.executive_summary}</p>
                    </div>

                    {/* What I Want To Become */}
                    {nightlyReport.what_i_want_to_become && (
                      <div className="bg-[#0c0c1f]/90 border border-purple-500/20 rounded-xl p-4 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
                        <h4 className="text-[10px] font-bold text-purple-300 uppercase tracking-wider font-mono mb-2">◈ What I Want To Become</h4>
                        <p className="text-[11px] text-gray-300 leading-relaxed italic">{nightlyReport.what_i_want_to_become}</p>
                      </div>
                    )}

                    {/* Top 5 Priorities */}
                    {nightlyReport.top_5_priorities?.length > 0 && (
                      <div className="bg-[#0b0b1e]/80 border border-white/[0.05] rounded-xl p-4">
                        <h4 className="text-[10px] font-bold text-white uppercase tracking-wider font-mono mb-3">Top Priority Proposals</h4>
                        <div className="space-y-2">
                          {nightlyReport.top_5_priorities.map((p: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-indigo-500/20 transition-all">
                              <span className="text-indigo-400 font-mono text-[11px] font-bold w-4 shrink-0">#{i + 1}</span>
                              <span className="text-[11px] text-gray-200 flex-1 font-medium">{p.title}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                p.complexity === 'Low' ? 'bg-green-500/15 text-green-400 border border-green-500/20' :
                                p.complexity === 'Medium' ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20' :
                                'bg-red-500/15 text-red-400 border border-red-500/20'
                              }`}>{p.complexity}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                p.risk === 'Low' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' :
                                p.risk === 'Medium' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/15' :
                                'bg-red-500/10 text-red-400 border border-red-500/15'
                              }`}>{p.risk} risk</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Two column: Discoveries + Analysis */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Discoveries */}
                      <div className="bg-[#0b0b1e]/80 border border-white/[0.05] rounded-xl p-4">
                        <h4 className="text-[10px] font-bold text-white uppercase tracking-wider font-mono mb-3">Discoveries</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                            <span className="text-[10px] text-gray-400">GitHub Repos</span>
                            <span className="text-[10px] font-bold text-indigo-300 font-mono">{nightlyReport.discoveries?.github_repos?.length || 0}</span>
                          </div>
                          <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                            <span className="text-[10px] text-gray-400">ArXiv Papers</span>
                            <span className="text-[10px] font-bold text-indigo-300 font-mono">{nightlyReport.discoveries?.arxiv_papers?.length || 0}</span>
                          </div>
                          <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                            <span className="text-[10px] text-gray-400">Reddit Posts</span>
                            <span className="text-[10px] font-bold text-indigo-300 font-mono">{nightlyReport.discoveries?.reddit_highlights?.length || 0}</span>
                          </div>
                          <div className="flex items-center justify-between py-1.5">
                            <span className="text-[10px] text-gray-400">HuggingFace Models</span>
                            <span className="text-[10px] font-bold text-indigo-300 font-mono">{nightlyReport.discoveries?.huggingface_models?.length || 0}</span>
                          </div>
                        </div>
                        {/* Top repos */}
                        {nightlyReport.discoveries?.github_repos?.slice(0, 5).map((r: any, i: number) => (
                          <a key={i} href={r.url} target="_blank" rel="noreferrer" className="block mt-2 p-2 rounded bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.03] transition-all group">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-indigo-300 font-mono group-hover:text-indigo-200">{r.name}</span>
                              <span className="text-[9px] text-yellow-500">★ {r.stars}</span>
                            </div>
                            <p className="text-[9px] text-gray-500 mt-0.5 truncate">{r.description}</p>
                          </a>
                        ))}
                      </div>

                      {/* Analysis gaps */}
                      <div className="bg-[#0b0b1e]/80 border border-white/[0.05] rounded-xl p-4">
                        <h4 className="text-[10px] font-bold text-white uppercase tracking-wider font-mono mb-3">Gaps Identified</h4>
                        <div className="space-y-2">
                          {nightlyReport.analysis?.current_gaps?.map((gap: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 p-2 rounded bg-white/[0.02] border border-white/[0.03]">
                              <span className="text-orange-400 mt-0.5 shrink-0">!</span>
                              <span className="text-[10px] text-gray-300">{gap}</span>
                            </div>
                          ))}
                        </div>
                        {nightlyReport.analysis?.opportunities?.slice(0, 4).map((o: any, i: number) => (
                          <div key={i} className="mt-2 p-2 rounded bg-white/[0.02] border border-white/[0.03]">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[8px] px-1 py-0.5 rounded font-mono font-bold ${
                                o.impact === 'High' ? 'bg-green-500/15 text-green-400' :
                                o.impact === 'Medium' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-gray-500/15 text-gray-400'
                              }`}>{o.impact} impact</span>
                              <span className="text-[10px] font-semibold text-gray-200">{o.title}</span>
                            </div>
                            <p className="text-[9px] text-gray-500 leading-relaxed">{o.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Full Proposals */}
                    {nightlyReport.proposals?.length > 0 && (
                      <div className="bg-[#0b0b1e]/80 border border-white/[0.05] rounded-xl p-4">
                        <h4 className="text-[10px] font-bold text-white uppercase tracking-wider font-mono mb-3">All Proposals ({nightlyReport.proposals.length})</h4>
                        <div className="space-y-3">
                          {nightlyReport.proposals.map((p: any, i: number) => (
                            <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-indigo-500/20 transition-all">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-indigo-400 font-mono text-[10px] font-bold">#{i + 1}</span>
                                <span className="text-[11px] font-semibold text-white">{p.title}</span>
                                <span className={`ml-auto text-[8px] px-1 py-0.5 rounded font-mono font-bold ${
                                  p.complexity === 'Low' ? 'bg-green-500/15 text-green-400' :
                                  p.complexity === 'Medium' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-red-500/15 text-red-400'
                                }`}>{p.complexity}</span>
                              </div>
                              <p className="text-[10px] text-gray-400 leading-relaxed mb-1">{p.description}</p>
                              {p.implementation_hint && (
                                <p className="text-[9px] text-indigo-400/70 font-mono">→ {p.implementation_hint}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* API Usage State (always show if loaded) */}
                {apiUsageState && (
                  <div className="bg-[#0b0b1e]/80 border border-white/[0.05] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">API Usage Register</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-gray-600 font-mono">Resets daily · 80% = auto-swap</span>
                        <button
                          onClick={() => fetch('/api/api-usage/reset', { method: 'POST' }).then(() => fetch('/api/api-usage').then(r => r.json()).then(d => setApiUsageState(d)))}
                          className="text-[9px] px-2 py-0.5 rounded border border-white/10 text-gray-500 hover:text-white transition-all cursor-pointer"
                        >Reset</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                      {Object.entries(apiUsageState.providers || {}).map(([key, p]: [string, any]) => {
                        const ratio = p.limits && p.used_today ? (
                          p.limits.requests_per_day ? p.used_today.requests / p.limits.requests_per_day :
                          p.limits.effective_daily ? p.used_today.requests / p.limits.effective_daily : 0
                        ) : 0;
                        const pct = Math.round(ratio * 100);
                        return (
                          <div key={key} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.03]">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[9px] font-bold text-gray-300 font-mono truncate">{p.label}</span>
                              <span className={`text-[8px] font-mono font-bold ${
                                p.type === 'local' ? 'text-green-400' :
                                pct >= 80 ? 'text-red-400' : pct >= 50 ? 'text-yellow-400' : 'text-emerald-400'
                              }`}>
                                {p.type === 'local' ? '∞' : `${pct}%`}
                              </span>
                            </div>
                            {p.type !== 'local' && (
                              <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[8px] text-gray-600">{p.used_today?.requests || 0} req today</span>
                              <span className={`text-[8px] px-1 rounded font-mono ${
                                p.priority <= 3 ? 'text-indigo-400' : 'text-gray-600'
                              }`}>P{p.priority}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {apiUsageState.swap_log?.length > 0 && (
                      <div className="mt-3 p-2 rounded bg-orange-500/5 border border-orange-500/15">
                        <h5 className="text-[9px] font-bold text-orange-400 font-mono mb-1">API Swap Log</h5>
                        {apiUsageState.swap_log.slice(-5).map((s: any, i: number) => (
                          <div key={i} className="text-[9px] text-gray-500 font-mono">
                            {new Date(s.timestamp).toLocaleTimeString()} → {s.from} at {s.reason}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ─── TAB 4: SWARM TELEMETRY & SYSTEM LOAD ─── */}
          
          {centerTab === "video-analyzer" && (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#070713]/40">
              <div className="p-4 border-b border-white/[0.05] flex justify-between items-center bg-[#070713]/55">
                <div>
                  <h3 className="text-xs font-bold text-white tracking-wide font-mono flex items-center gap-2">
                    <Video size={14} className="text-indigo-400 animate-pulse" />
                    YOUTUBE AGENT LEARNING ENGINE
                  </h3>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono font-bold block mt-1">
                    Feed YouTube URLs to extract knowledge & auto-train agents
                  </span>
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
                <div className="bg-[#0b0b1e]/90 border border-white/[0.04] rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative z-10 space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Analyze Video Transcript</h4>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Enter any YouTube Video URL below (e.g. Julian Goldie's Agent OS tutorial, workflows, or templates). The engine will download the English transcript, execute deep AI compilation for features, components, and tools, and automatically save the structured analysis report into the Swarm knowledge base directory, training all models on the system architecture.
                    </p>

                    <div className="flex gap-2.5 mt-2">
                      <input
                        type="text"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={ytUrl}
                        onChange={(e) => setYtUrl(e.target.value)}
                        disabled={ytLoading}
                        className="flex-grow bg-[#05050d] border border-white/[0.06] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 font-mono transition-all placeholder-gray-600"
                      />
                      <button
                        onClick={handleAnalyzeVideo}
                        disabled={ytLoading || !ytUrl.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white px-5 py-2 rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] cursor-pointer flex items-center gap-2"
                      >
                        {ytLoading ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            ANALYZING...
                          </>
                        ) : (
                          <>
                            <Play size={12} />
                            ANALYZE VIDEO
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Loading state or result display */}
                {ytLoading && (
                  <div className="bg-[#0b0b1e]/50 border border-white/[0.02] rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-3">
                    <RefreshCw size={32} className="text-indigo-500 animate-spin" />
                    <div className="text-xs font-bold text-white font-mono uppercase tracking-wider animate-pulse">Extracting and Analyzing Transcript...</div>
                    <div className="text-[10px] text-gray-500 max-w-xs">Downloading subtitle tracks, querying LLM context, structuring architecture report and saving to shared knowledge base.</div>
                  </div>
                )}

                {!ytLoading && ytSummary && (
                  <div className={`grid grid-cols-1 ${ytFrames.length > 0 ? 'lg:grid-cols-12' : ''} gap-6`}>

                    {/* Visual Frames Section */}
                    {ytFrames.length > 0 && (
                      <div className="lg:col-span-5 flex flex-col bg-[#0b0b1e]/90 border border-white/[0.04] rounded-2xl overflow-hidden shadow-2xl">
                        <div className="p-4 bg-indigo-950/20 border-b border-white/[0.04] px-6">
                          <span className="text-[10px] font-bold text-indigo-400 font-mono uppercase tracking-wider">Visual Interface Inspection</span>
                        </div>
                        <div className="p-4 flex flex-col items-center justify-center bg-black/40 flex-grow border-b border-white/[0.04]">
                          {selectedFrame ? (
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-white/[0.08] bg-black/80 flex items-center justify-center">
                              <img
                                src={`/api/youtube/frames/${ytVideoId}/${selectedFrame}`}
                                alt="Video Frame"
                                className="max-w-full max-h-full object-contain"
                              />
                              <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/85 border border-white/10 rounded text-[9px] font-mono text-gray-400 tracking-wider">
                                {ytFrames.find(f => f.file === selectedFrame)?.timestamp || "00:00:00"}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-10 text-[10px] text-gray-500 font-mono">Select a frame to inspect</div>
                          )}
                        </div>

                        {/* Thumbnail Selector Row */}
                        <div className="p-4 bg-[#070713]/40">
                          <span className="text-[8px] uppercase font-bold text-gray-500 tracking-wider font-mono block mb-2">Keyframes (Every 15s)</span>
                          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {ytFrames.map((frame, idx) => (
                              <button
                                key={idx}
                                onClick={() => setSelectedFrame(frame.file)}
                                className={`relative shrink-0 w-24 aspect-video rounded-md overflow-hidden border transition-all cursor-pointer ${
                                  selectedFrame === frame.file
                                    ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                                    : 'border-white/[0.08] opacity-65 hover:opacity-100 hover:border-white/20'
                                }`}
                              >
                                <img
                                  src={`/api/youtube/frames/${ytVideoId}/${frame.file}`}
                                  alt={`frame_${idx}`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-0.5 right-0.5 px-1 bg-black/75 rounded text-[8px] font-mono text-gray-400">
                                  {frame.timestamp.substring(3)}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Report Section */}
                    <div className={`${ytFrames.length > 0 ? 'lg:col-span-7' : 'w-full'} bg-[#0b0b1e]/90 border border-white/[0.04] rounded-2xl overflow-hidden shadow-2xl flex flex-col`}>
                      <div className="p-4 bg-indigo-950/20 border-b border-white/[0.04] flex justify-between items-center px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-indigo-400 font-mono uppercase tracking-wider">Analysis Complete & Indexed</span>
                        </div>
                        {ytVideoId && (
                          <a
                            href={`https://youtube.com/watch?v=${ytVideoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] text-gray-400 hover:text-white flex items-center gap-1 font-mono uppercase tracking-wider"
                          >
                            Watch Original <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      <div className="p-6 select-text overflow-y-auto max-h-[500px]">
                        <Markdown text={ytSummary} />
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── TAB: SEO CONTENT PIPELINE ─── */}
          {centerTab === "seo-pipeline" && (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#070713]/40">
              <div className="p-4 border-b border-white/[0.05] flex justify-between items-center bg-[#070713]/55">
                <div>
                  <h3 className="text-xs font-bold text-white tracking-wide font-mono flex items-center gap-2">
                    <Globe size={14} className="text-indigo-400 animate-pulse" />
                    SEO CONTENT PIPELINE
                  </h3>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono font-bold block mt-1">
                    Auto-generate niche article swarms using video transcripts & auto-deploy
                  </span>
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                  {/* Control Panel (Left Card) */}
                  <div className="lg:col-span-5 bg-[#0b0b1e]/90 border border-white/[0.04] rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md h-fit">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 space-y-5">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Pipeline Settings</h4>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Target Keyword / Topic</label>
                        <input
                          type="text"
                          placeholder="e.g. AI SEO Strategy"
                          value={seoKeyword}
                          onChange={(e) => setSeoKeyword(e.target.value)}
                          disabled={seoGenerating}
                          className="w-full bg-[#05050d] border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50 font-mono transition-all placeholder-gray-600"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Category Slug Prefix</label>
                        <input
                          type="text"
                          placeholder="e.g. blog/seo"
                          value={seoSlug}
                          onChange={(e) => setSeoSlug(e.target.value)}
                          disabled={seoGenerating}
                          className="w-full bg-[#05050d] border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50 font-mono transition-all placeholder-gray-600"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Reference Transcript</label>
                        <select
                          value={seoTranscriptPicker}
                          onChange={(e) => setSeoTranscriptPicker(e.target.value)}
                          disabled={seoGenerating}
                          className="w-full bg-[#05050d] border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50 font-mono transition-all"
                        >
                          <option value="">-- No Reference Transcript --</option>
                          {seoTranscripts.map(t => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">Auto-Deploy to Site</span>
                          <span className="text-[8px] text-gray-500 tracking-wide font-mono mt-0.5">Write articles straight to local production folder</span>
                        </div>
                        <button
                          onClick={() => setSeoAutoDeploy(!seoAutoDeploy)}
                          disabled={seoGenerating}
                          className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                            seoAutoDeploy ? 'bg-indigo-600' : 'bg-gray-800'
                          }`}
                        >
                          <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform duration-200 transform ${
                            seoAutoDeploy ? 'translate-x-4.5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>

                      <button
                        onClick={handleGenerateSEOArticles}
                        disabled={seoGenerating || !seoKeyword.trim()}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white py-3 rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] cursor-pointer flex items-center justify-center gap-2"
                      >
                        {seoGenerating ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            GENERATING PIPELINE...
                          </>
                        ) : (
                          <>
                            <Play size={12} />
                            LAUNCH CONTENT PIPELINE
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Output Preview Panel (Right Card) */}
                  <div className="lg:col-span-7 bg-[#0b0b1e]/90 border border-white/[0.04] rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[450px]">
                    <div className="p-4 bg-indigo-950/20 border-b border-white/[0.04] px-6 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-400 font-mono uppercase tracking-wider">Generated Support Articles Swarm</span>
                      {seoArticles.length > 0 && (
                        <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/25 px-2 py-0.5 rounded-md">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[8px] font-bold text-green-400 font-mono uppercase tracking-wide">5 Articles Ready</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-grow flex flex-col select-text">
                      {seoGenerating && (
                        <div className="flex-grow flex flex-col items-center justify-center p-10 text-center space-y-3">
                          <RefreshCw size={32} className="text-indigo-500 animate-spin" />
                          <div className="text-xs font-bold text-white font-mono uppercase tracking-wider animate-pulse">Running SEO Swarm Generator...</div>
                          <div className="text-[10px] text-gray-500 max-w-xs">Reading video reference context, identifying semantic content gaps, writing 5 comprehensive support articles and exporting to disk.</div>
                        </div>
                      )}

                      {!seoGenerating && seoArticles.length === 0 && (
                        <div className="flex-grow flex flex-col items-center justify-center p-12 text-center text-gray-500 font-mono">
                          <Globe size={32} className="text-gray-700 mb-3" />
                          <span className="text-[10px] uppercase font-bold text-gray-400">Pipeline Idle</span>
                          <span className="text-[9px] text-gray-600 mt-1 max-w-xs">Configure keyword, select transcript source, and run the pipeline to generate your niche article cluster.</span>
                        </div>
                      )}

                      {!seoGenerating && seoArticles.length > 0 && (
                        <div className="flex-grow flex flex-col font-mono">
                          {/* Inner Tabs for the 5 articles */}
                          <div className="flex border-b border-white/[0.04] bg-black/25 overflow-x-auto">
                            {seoArticles.map((_, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  (window as any)._selectedSeoArtIdx = idx;
                                  setCenterTab("seo-pipeline");
                                }}
                                className={`px-4 py-3 text-[10px] font-bold font-mono uppercase tracking-wider border-r border-white/[0.04] whitespace-nowrap transition-all cursor-pointer ${
                                  ((window as any)._selectedSeoArtIdx || 0) === idx
                                    ? 'bg-indigo-950/20 text-white border-b-2 border-b-indigo-500'
                                    : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                                }`}
                              >
                                Article {idx + 1}
                              </button>
                            ))}
                          </div>

                          {/* Selected Article Body */}
                          {(() => {
                            const selectedIdx = (window as any)._selectedSeoArtIdx || 0;
                            const art = seoArticles[selectedIdx] || seoArticles[0];
                            if (!art) return null;
                            return (
                              <div className="p-6 space-y-4 overflow-y-auto max-h-[450px]">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="text-sm font-extrabold text-white">{art.title}</h3>
                                    <span className="text-[9px] font-mono text-gray-500 block mt-1">Slug: <span className="text-indigo-400">/{art.slug}</span></span>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleGenerateMultimedia(selectedIdx, 'podcast')}
                                      disabled={multimediaGenerating}
                                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 text-white rounded-lg text-[9px] font-bold uppercase cursor-pointer transition-all flex items-center gap-1.5"
                                    >
                                      {multimediaGenerating && multimediaType === 'podcast' ? (
                                        <RefreshCw size={10} className="animate-spin" />
                                      ) : '🎙️ Podcast'}
                                    </button>
                                    <button
                                      onClick={() => handleGenerateMultimedia(selectedIdx, 'presentation')}
                                      disabled={multimediaGenerating}
                                      className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 disabled:bg-gray-800 text-white rounded-lg text-[9px] font-bold uppercase cursor-pointer transition-all flex items-center gap-1.5"
                                    >
                                      {multimediaGenerating && multimediaType === 'presentation' ? (
                                        <RefreshCw size={10} className="animate-spin" />
                                      ) : '📊 Slides'}
                                    </button>
                                  </div>
                                </div>
                                <hr className="border-white/[0.04]" />
                                <div className="text-xs text-gray-300 leading-relaxed font-sans select-text">
                                  <Markdown text={art.content} />
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

              </div>
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
              <div className="flex border-b border-white/[0.04] bg-black/25 select-none shrink-0 overflow-x-auto">
                {(["sessions", "models", "skills", "mcp-catalog", "vault", "goals", "monitor", "settings", "notebooklm", "rag"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => {
                      setRightTab(tab);
                      if (tab === "notebooklm") handleFetchNotebooks();
                    }}
                    className={`flex-1 min-w-[50px] py-3 text-[9px] font-bold uppercase tracking-wider transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer border-b ${
                      rightTab === tab
                        ? "text-white border-indigo-500 bg-white/[0.02]"
                        : "text-gray-500 hover:text-gray-300 border-transparent"
                    }`}
                  >
                    {tab === "sessions" ? <Clock size={11} /> : tab === "models" ? <Cpu size={11} /> : tab === "skills" ? <Zap size={11} /> : tab === "mcp-catalog" ? <Puzzle size={11} /> : tab === "vault" ? <Database size={11} /> : tab === "goals" ? <Target size={11} /> : tab === "monitor" ? <Activity size={11} /> : tab === "settings" ? <Settings size={11} /> : tab === "notebooklm" ? <FileText size={11} /> : <Search size={11} />}
                    <span className="mt-0.5">{tab === "sessions" ? "Chats" : tab === "skills" ? "Skills" : tab === "mcp-catalog" ? "MCP" : tab === "models" ? "Models" : tab === "vault" ? "Memory" : tab === "monitor" ? "Telemetry" : tab === "settings" ? "Settings" : tab === "notebooklm" ? "Notebooks" : tab === "rag" ? "RAG" : tab}</span>
                  </button>
                ))}
              </div>

              <div className="flex-grow overflow-y-auto p-4">
                {/* TAB: GOALS ARCHIVE */}
                {rightTab === "goals" && (
                  <div className="space-y-4">
                    <GoalsPanel />
                  </div>
                )}

                {/* TAB: TELEMETRY SYSTEM MONITOR */}
                {rightTab === "monitor" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
                      <span>Telemetry Monitor</span>
                    </div>
                    
                    {/* Active Telemetry list */}
                    <AgentTelemetryPanel agents={agents} />
                    {/* Active Telemetry list */}
                    <div className="glass rounded-2xl p-4 border-white/[0.04] bg-[#0c0c26]/60 backdrop-blur-md">
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
                            <Tooltip contentStyle={{ backgroundColor: '#09091b', borderColor: '#1f2937', color: '#fff', fontSize: 10 }} />
                            <Area type="monotone" dataKey="hermes" stroke="#a855f7" fillOpacity={1} fill="url(#colorHermes)" />
                            <Area type="monotone" dataKey="openclaw" stroke="#10b981" fillOpacity={1} fill="url(#colorOpenClaw)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: MODELS CATALOG SELECTOR */}
                {rightTab === "models" && (
                  <div className="space-y-4">
                    <ProviderPanel />
                    <div className="bg-[#0b0b1e]/90 border border-white/[0.04] rounded-2xl p-4 shadow-2xl relative overflow-hidden backdrop-blur-md">
                      <div className="relative z-10 space-y-4">
                        {(() => {
                          const agentId = activeAgent.toLowerCase();
                          let title = "OpenRouter Free Models";
                          let description = "Models available free via OpenRouter API key.";
                          
                          const buildModelList = (providerId: string) => {
                            return discoveredModels
                              .filter(m => m.provider === providerId)
                              .map(m => {
                                let ctxString = "varies";
                                if (m.context_length) {
                                  ctxString = m.context_length >= 1024 * 1024 
                                    ? `${(m.context_length / (1024 * 1024)).toFixed(0)}M` 
                                    : `${(m.context_length / 1024).toFixed(0)}K`;
                                }
                                let displayName = m.name || m.id.split('/').pop() || m.id;
                                displayName = displayName.replace(':free', '').replace(' (free)', '');
                                if (displayName.startsWith('alibaba/')) displayName = displayName.replace('alibaba/', '');
                                if (displayName.startsWith('zhipu/')) displayName = displayName.replace('zhipu/', '');
                                if (displayName.startsWith('google/')) displayName = displayName.replace('google/', '');
                                return {
                                  id: m.id,
                                  name: displayName,
                                  ctx: ctxString,
                                  tier: m.id.includes(':free') ? 'free' : undefined,
                                  provider: providerId
                                };
                              });
                          };

                          let modelList: Array<{ id: string; name: string; ctx: string; tier?: string; provider?: string; note?: string }> = [];

                          if (agentId === "gemini") {
                            title = "Google Gemini — AI Studio Free Tier";
                            description = "All models below are free via Google AI Studio API key.";
                            modelList = buildModelList("gemini");
                            if (modelList.length === 0) {
                              modelList = [
                                { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", ctx: "1M", tier: "free", provider: "gemini", note: "Latest" },
                                { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", ctx: "1M", tier: "free", provider: "gemini", note: "Pro" },
                                { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", ctx: "1M", tier: "free", provider: "gemini" },
                                { id: "gemini-3.5-pro", name: "Gemini 3.5 Pro", ctx: "1M", tier: "free", provider: "gemini" }
                              ];
                            }
                          } else if (agentId === "alibaba") {
                            title = "Alibaba DashScope — Qwen Models";
                            description = "Alibaba's official DashScope API.";
                            modelList = buildModelList("alibaba");
                            if (modelList.length === 0) {
                              modelList = [
                                { id: "alibaba/qwen-long", name: "Qwen Long", ctx: "10M", tier: "free", provider: "alibaba", note: "Huge context" },
                                { id: "alibaba/qwen-plus", name: "Qwen Plus", ctx: "131K", tier: "free", provider: "alibaba" }
                              ];
                            }
                          } else if (agentId === "zhipu") {
                            title = "Zhipu BigModel — GLM Models";
                            description = "Zhipu AI GLM platform.";
                            modelList = buildModelList("zhipu");
                            if (modelList.length === 0) {
                              modelList = [
                                { id: "zhipu/glm-5.1", name: "GLM 5.1 (Thinking)", ctx: "64K", tier: "free", provider: "zhipu", note: "Reasoning" },
                                { id: "zhipu/glm-4-flash", name: "GLM-4 Flash", ctx: "128K", tier: "free", provider: "zhipu", note: "Fast & Free" }
                              ];
                            }
                          } else if (agentId === "openclaw" || agentId === "opencode" || agentId === "hermes" || agentId === "openrouter") {
                            title = agentId === "openclaw" ? "OpenClaw — Free Models" : agentId === "opencode" ? "OpenCode — Free AI Coder" : agentId === "hermes" ? "Hermes — Nous Research Models" : "OpenRouter Free Models";
                            description = "Discovered free models dynamically fetched and updated.";
                            modelList = buildModelList("openrouter");
                            if (modelList.length === 0) {
                              modelList = [
                                { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1", ctx: "128K", tier: "free", provider: "openrouter", note: "Reasoning" },
                                { id: "qwen/qwen3-coder:free", name: "Qwen3 Coder 480B", ctx: "1M", tier: "free", provider: "openrouter", note: "Code" }
                              ];
                            }
                          }

                          return (
                            <div className="space-y-3 font-mono">
                              <div className="flex justify-between items-center bg-[#070713]/55 p-2 rounded-xl border border-white/[0.04]">
                                <div>
                                  <div className="text-[10px] font-bold text-white uppercase tracking-wider">{title}</div>
                                  <div className="text-[8.5px] text-gray-500 mt-0.5">{description}</div>
                                </div>
                                <button
                                  onClick={async () => {
                                    try {
                                      const res = await fetch("/api/diagnostics/sync-models", { method: "POST" });
                                      const data = await res.json();
                                      if (data.success) {
                                        alert("Discovered models synced successfully!");
                                        fetchDiscoveredModels();
                                      }
                                    } catch (_) {}
                                  }}
                                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-[8px] font-bold uppercase tracking-wide cursor-pointer font-sans"
                                >
                                  Sync
                                </button>
                              </div>
                              <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                                {modelList.map(model => {
                                  const isSelected = activeModel === model.id;
                                  const isSwitching = switchingModelId === model.id;
                                  return (
                                    <button
                                      key={model.id}
                                      onClick={() => handleSwitchModel(model.id)}
                                      disabled={isSwitching}
                                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all text-left cursor-pointer ${
                                        isSelected
                                          ? "bg-[#6366f1]/10 border-[#6366f1]/35 text-white"
                                          : "bg-white/[0.015] hover:bg-white/[0.03] border-white/[0.02] text-gray-400 hover:text-gray-200"
                                      }`}
                                    >
                                      <div className="min-w-0 flex-1 pr-1.5">
                                        <div className="text-[11px] font-bold truncate flex items-center gap-1">
                                          {model.name}
                                          {model.tier === 'free' && <span className="text-[7px] px-1 rounded bg-green-500/10 border border-green-500/20 text-green-400 font-extrabold">FREE</span>}
                                        </div>
                                        <div className="text-[8.5px] text-gray-500 truncate mt-0.5">{model.id}</div>
                                      </div>
                                      <span className="text-[8.5px] text-gray-500 font-mono shrink-0 ml-1.5">{model.ctx}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

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



                {/* TAB: GENERAL SETTINGS */}
                {rightTab === "settings" && (
                  <div className="space-y-4">
                    <SettingsPanel />
                    <GeminiKeysPanel />
                    <PersonalityPanel />
                    <DiagnosticsPanel />
                    <AionUITeamsPanel />
                    <DelegationPanel />
                    <SpotifyPanel />
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

                    {/* Manual Focus Skill Selector */}
                    <div className="space-y-2">
                      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">Manual Focus Skill</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: null, label: "General", icon: "🌐" },
                          { id: "seo", label: "SEO Focus", icon: "📈" },
                          { id: "website building", label: "Web Design", icon: "🎨" },
                          { id: "code execution", label: "Code Run", icon: "💻" }
                        ].map(skill => {
                          const isSelected = selectedManualSkill === skill.id;
                          return (
                            <button
                              key={skill.id || "none"}
                              onClick={() => setSelectedManualSkill(skill.id)}
                              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-[11px] font-semibold text-left select-none cursor-pointer transition-all duration-200 ${
                                isSelected
                                  ? "bg-indigo-500/15 border-indigo-500/40 text-white shadow-lg shadow-indigo-500/10"
                                  : "bg-white/[0.015] hover:bg-white/[0.03] border-white/[0.02] text-gray-400"
                              }`}
                            >
                              <span>{skill.icon}</span>
                              <span className="truncate">{skill.label}</span>
                            </button>
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

                    {/* Media Engine */}
                    <MediaEnginePanel />

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

                    {/* Gemini API Keys Manager */}
                    <GeminiKeysPanel />

                    {/* Swarm Personality */}
                    <PersonalityPanel />

                    {/* Self-Healing Diagnostics */}
                    <DiagnosticsPanel />

                    {/* AionUI Teams */}
                    <AionUITeamsPanel />

                    {/* Delegation */}
                    <DelegationPanel />

                    {/* Spotify / Music */}
                    <SpotifyPanel />
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

                    {/* Dynamic Tool Creator Card */}
                    <div className="glass rounded-2xl border border-white/[0.04] overflow-hidden select-none">
                      <button
                        onClick={() => setIsCreateToolOpen(!isCreateToolOpen)}
                        className="w-full px-3 py-2.5 bg-cyan-955/10 hover:bg-cyan-955/25 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-cyan-400 cursor-pointer"
                      >
                        <span>🛠️ Create Custom Dynamic Tool</span>
                        <span>{isCreateToolOpen ? "Collapse [-]" : "Expand [+]"}</span>
                      </button>

                      {isCreateToolOpen && (
                        <div className="p-3.5 space-y-3 bg-black/40 border-t border-white/[0.03]">
                          <div className="space-y-1">
                            <label className="text-[9px] text-gray-400 font-bold uppercase">Tool Name (no spaces)</label>
                            <input
                              value={customToolName}
                              onChange={e => setCustomToolName(e.target.value)}
                              placeholder="e.g. read_system_logs"
                              className="w-full bg-black/50 border border-white/[0.06] rounded-lg px-2.5 py-1 text-xs text-white placeholder-gray-750 focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] text-gray-400 font-bold uppercase">Description</label>
                            <input
                              value={customToolDesc}
                              onChange={e => setCustomToolDesc(e.target.value)}
                              placeholder="e.g. Fetches the latest system errors"
                              className="w-full bg-black/50 border border-white/[0.06] rounded-lg px-2.5 py-1 text-xs text-white placeholder-gray-750 focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] text-gray-400 font-bold uppercase">Parameters JSON Schema</label>
                            <textarea
                              value={customToolSchema}
                              onChange={e => setCustomToolSchema(e.target.value)}
                              className="w-full h-24 bg-black/50 border border-white/[0.06] rounded-lg p-2 text-[10px] font-mono text-[#38bdf8] focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] text-gray-400 font-bold uppercase">JavaScript Execution Logic</label>
                            <textarea
                              value={customToolCode}
                              onChange={e => setCustomToolCode(e.target.value)}
                              className="w-full h-32 bg-black/50 border border-white/[0.06] rounded-lg p-2 text-[10px] font-mono text-[#a78bfa] focus:outline-none"
                            />
                          </div>

                          <button
                            onClick={handleCreateCustomTool}
                            disabled={customToolLoading || !customToolName.trim()}
                            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                          >
                            {customToolLoading ? "Initializing & hot-reloading..." : "⚡ Register Custom Tool"}
                          </button>
                        </div>
                      )}
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
                                  {server.env_required && server.env_required.length > 0 && (
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

                {/* TAB: NOTEBOOKLM RESEARCH PANEL */}
                {rightTab === "notebooklm" && (
                  <div className="space-y-4 text-white">
                    <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
                      <span>Google NotebookLM Swarm</span>
                      <button onClick={handleFetchNotebooks} disabled={notebookLoading} className="hover:text-white transition-colors cursor-pointer">
                        <RefreshCw size={10} className={notebookLoading ? "animate-spin text-indigo-400" : ""} />
                      </button>
                    </div>

                    {/* Add Notebook share-URL Form */}
                    <div className="p-3 bg-white/[0.015] border border-white/[0.04] rounded-xl space-y-2 select-none">
                      <div className="text-[9px] text-gray-400 font-semibold uppercase">Register New Share URL</div>
                      <input
                        value={newNotebookName}
                        onChange={e => setNewNotebookName(e.target.value)}
                        placeholder="Notebook Name (e.g. SEO Campaign)..."
                        className="w-full bg-black/40 border border-white/[0.06] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500/40"
                      />
                      <input
                        value={newNotebookUrl}
                        onChange={e => setNewNotebookUrl(e.target.value)}
                        placeholder="https://notebooklm.google.com/notebook/..."
                        className="w-full bg-black/40 border border-white/[0.06] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500/40"
                      />
                      <button
                        onClick={handleAddNotebook}
                        disabled={notebookLoading || !newNotebookUrl.trim()}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer"
                      >
                        {notebookLoading ? "Registering..." : "+ Register Notebook"}
                      </button>
                    </div>

                    {/* Notebook List Selector */}
                    <div className="space-y-2">
                      <div className="text-[9px] text-gray-400 font-semibold uppercase select-none">Active Notebooks</div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {notebooks.map((nb: any) => (
                          <div
                            key={nb.id}
                            onClick={() => handleSelectNotebook(nb.id)}
                            className={`p-2.5 rounded-xl border text-xs text-left cursor-pointer transition-all ${
                              activeNotebookId === nb.id
                                ? "bg-indigo-500/10 border-indigo-500/30 text-white font-semibold"
                                : "bg-white/[0.01] hover:bg-white/[0.02] border-white/[0.02] text-gray-400"
                            }`}
                          >
                            <div className="truncate">{nb.name}</div>
                            <div className="text-[8px] font-mono text-gray-500 mt-1 select-none">ID: {nb.id.slice(0, 10)}...</div>
                          </div>
                        ))}
                        {notebooks.length === 0 && (
                          <div className="text-center py-3 text-[10px] text-gray-500 select-none">No notebooks registered. Load or add one above.</div>
                        )}
                      </div>
                    </div>

                    {/* Active Notebook ground-RAG actions */}
                    {activeNotebookId && (
                      <div className="space-y-3 pt-2 border-t border-white/[0.04]">
                        <div className="text-xs font-bold text-indigo-400 uppercase select-none">Active: {notebooks.find(n=>n.id===activeNotebookId)?.name || "Notebook"}</div>

                        {/* Audio Generation overview panel */}
                        <div className="p-3 bg-indigo-950/15 border border-indigo-500/15 rounded-xl space-y-2">
                          <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold uppercase">
                            <span>Podcast Audio Overview</span>
                            <span className={`text-[8.5px] uppercase font-bold px-1.5 rounded ${notebookAudioStatus === "ready" ? "bg-green-500/10 text-green-400" : "bg-indigo-500/10 text-indigo-400"}`}>{notebookAudioStatus}</span>
                          </div>

                          {notebookAudioProgress && (
                            <div className="text-[9px] font-mono text-gray-400 italic">{notebookAudioProgress}</div>
                          )}

                          {notebookAudioUrl ? (
                            <div className="space-y-2">
                              <audio src={notebookAudioUrl} controls className="w-full h-8" />
                              <a
                                href={notebookAudioUrl}
                                download
                                className="block w-full py-1 text-center bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9px] font-bold uppercase"
                              >
                                Download Overview Audio
                              </a>
                            </div>
                          ) : (
                            <button
                              onClick={handleGeneratePodcast}
                              disabled={notebookAudioGenerating}
                              className="w-full py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-white rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer"
                            >
                              {notebookAudioGenerating ? "⚡ Generating (2-10 min)..." : "🎬 Generate Podcast Overview"}
                            </button>
                          )}
                        </div>

                        {/* Ingest Source box */}
                        <div className="p-3 bg-white/[0.015] border border-white/[0.04] rounded-xl space-y-2">
                          <div className="text-[9px] text-gray-400 font-bold uppercase select-none">Ingest grounded RAG source</div>
                          <input
                            value={newSourceUrl}
                            onChange={e => setNewSourceUrl(e.target.value)}
                            placeholder="Source URL (https://...)"
                            className="w-full bg-black/40 border border-white/[0.06] rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500/40"
                          />
                          <textarea
                            value={newSourceText}
                            onChange={e => setNewSourceText(e.target.value)}
                            placeholder="Or paste text snippet to ground..."
                            className="w-full h-14 bg-black/40 border border-white/[0.06] rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-indigo-500/40 resize-none"
                          />
                          <button
                            onClick={handleAddSource}
                            disabled={addingSource || (!newSourceUrl.trim() && !newSourceText.trim())}
                            className="w-full py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer"
                          >
                            {addingSource ? "Ingesting..." : "+ Ingest RAG Source"}
                          </button>
                        </div>

                        {/* Grounded RAG Chat Console */}
                        <div className="flex flex-col h-64 bg-black/40 border border-white/5 rounded-xl overflow-hidden">
                          <div className="px-3 py-1.5 bg-white/[0.02] text-[9.5px] font-bold text-gray-400 uppercase select-none">NotebookLM Grounded Chat</div>

                          {/* Chat history */}
                          <div className="flex-grow p-2.5 overflow-y-auto space-y-2 font-sans text-xs">
                            {notebookChatHistory.map((msg, i) => (
                              <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                <div className={`px-2.5 py-1.5 rounded-xl max-w-[85%] leading-relaxed ${
                                  msg.role === "user" ? "bg-indigo-600 text-white" : "bg-white/5 border border-white/5 text-gray-300"
                                }`}>
                                  {msg.content}
                                </div>
                              </div>
                            ))}
                            {notebookChatHistory.length === 0 && (
                              <div className="text-center py-8 text-[10px] text-gray-600 select-none">Ask any question grounded on your sources.</div>
                            )}
                          </div>

                          {/* Input row */}
                          <div className="p-2 border-t border-white/5 flex gap-1.5 bg-black/20">
                            <input
                              value={notebookChatInput}
                              onChange={e => setNotebookChatInput(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && handleNotebookChatSend()}
                              placeholder="Query active sources..."
                              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                            />
                            <button
                              onClick={handleNotebookChatSend}
                              disabled={notebookChatLoading || !notebookChatInput.trim()}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-[10px] font-bold uppercase cursor-pointer"
                            >
                              {notebookChatLoading ? "..." : "Send"}
                            </button>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )}

                {/* TAB: SEMANTIC HYBRID RAG */}
                {rightTab === "rag" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
                      <span>Semantic hybrid RAG</span>
                      <button
                        onClick={handleRagIndex}
                        disabled={ragIndexing}
                        className={`hover:text-white transition-colors cursor-pointer bg-white/[0.04] px-2.5 py-1 rounded-lg text-[9px] font-semibold border border-white/[0.05] ${
                          ragIndexing ? "opacity-50" : ""
                        }`}
                      >
                        {ragIndexing ? "Indexing..." : "Sync Index"}
                      </button>
                    </div>

                    {/* Search Field */}
                    <div className="flex gap-2">
                      <input
                        value={ragSearchQuery}
                        onChange={e => setRagSearchQuery(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleRagSearch()}
                        placeholder="Search conceptual meaning..."
                        className="flex-1 bg-black/40 border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/40"
                      />
                      <button
                        onClick={handleRagSearch}
                        disabled={ragSearching || !ragSearchQuery.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer shrink-0 transition-all flex items-center justify-center"
                      >
                        {ragSearching ? "..." : <Search size={14} />}
                      </button>
                    </div>

                    {/* Results Container */}
                    <div className="space-y-2.5">
                      {ragResults.map((result, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white/[0.015] border border-white/[0.03] hover:border-white/[0.06] transition-all space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-300 truncate max-w-[80%]" title={result.filepath}>
                              {result.filename}
                            </span>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                              {(result.score * 100).toFixed(0)}% Match
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 line-clamp-3 leading-relaxed font-sans">
                            {result.content}
                          </p>
                          <div className="text-[8px] text-gray-600 font-mono">
                            Chunk index: {result.chunk_index}
                          </div>
                        </div>
                      ))}
                      {ragResults.length === 0 && (
                        <div className="text-center py-8 text-xs text-gray-500 font-mono select-none">
                          No semantic matches found. Try searching a concept or clicking 'Sync Index'.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center py-4 space-y-4 select-none">
              {(["sessions", "models", "skills", "mcp-catalog", "vault", "goals", "monitor", "settings", "notebooklm", "rag"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    setRightTab(tab);
                    setIsRightCollapsed(false);
                    if (tab === "notebooklm") handleFetchNotebooks();
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                    rightTab === tab
                      ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                      : "bg-white/[0.02] border-white/[0.05] text-gray-400 hover:text-white"
                  }`}
                >
                  {tab === "sessions" ? <Clock size={13} /> : tab === "models" ? <Cpu size={13} /> : tab === "skills" ? <Zap size={13} /> : tab === "mcp-catalog" ? <Puzzle size={13} /> : tab === "vault" ? <Database size={13} /> : tab === "goals" ? <Target size={13} /> : tab === "monitor" ? <Activity size={13} /> : tab === "settings" ? <Settings size={13} /> : tab === "notebooklm" ? <FileText size={13} /> : <Search size={13} />}
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


      {isFloatingTerminalOpen && (
        <div className="fixed bottom-10 right-4 w-[540px] h-[480px] bg-[#04040c]/95 p-4 border border-white/10 rounded-2xl shadow-2xl z-40 font-mono text-[10.5px] flex flex-col justify-between backdrop-blur-lg">
          <div className="flex justify-between items-center pb-2 border-b border-white/5 select-none">
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-xs font-bold">⚠️ Errors Detected</span>
              <div className="flex gap-1">
                <button onClick={() => setTerminalLogs(terminalLogs.filter(l => l.type !== 'error'))} className="text-[9px] bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-2 py-0.5 rounded border border-red-500/20 cursor-pointer transition-all" title="Clear error logs">Clear Errors</button>
                <button onClick={() => setTerminalLogs([])} className="text-[9px] bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 hover:text-gray-300 px-2 py-0.5 rounded border border-gray-500/20 cursor-pointer transition-all" title="Clear all logs">Clear All</button>
              </div>
            </div>
            <span className="text-gray-400 font-bold tracking-wider">🖥️ Floating Terminal Shell</span>
            <button onClick={() => setIsFloatingTerminalOpen(false)} className="text-gray-500 hover:text-white cursor-pointer font-bold text-xs">✕</button>
          </div>
          {terminalLogs.filter(l => l.type === 'error').length > 0 && (
            <div className="mb-2 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-red-300 font-semibold">🔴 {terminalLogs.filter(l => l.type === 'error').length} healing failures detected</span>
                <span className="text-[8px] text-red-400/60">Last: {new Date().toLocaleTimeString()}</span>
              </div>
              <div className="text-[8px] text-red-400/80 bg-red-500/5 rounded px-2 py-1 border border-red-500/10 space-y-1">
                <div className="font-semibold text-red-300">⚠️ Common Issue: Invalid package.json Path</div>
                <div className="text-red-400/70">• Check if path is absolute (/home/user/project) vs relative (./project)</div>
                <div className="text-red-400/70">• Verify the directory exists before running healing operations</div>
                <div className="text-red-400/70">• Try running `pwd` console command to confirm current working directory</div>
                <button 
                  onClick={() => navigator.clipboard.writeText('/home/user/project/package.json')}
                  className="mt-1 text-[8px] bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 px-2 py-0.5 rounded border border-red-500/20 cursor-pointer transition-all"
                  title="Copy common path to clipboard"
                >
                  📋 Copy Standard Path
                </button>
              </div>
            </div>
          )}
          <div ref={floatingTerminalContainerRef} className="flex-grow overflow-y-auto space-y-1.5 my-3 pr-1 select-text custom-scrollbar">
            {terminalLogs.map((log, index) => (
              <div key={index} className={`whitespace-pre-wrap ${
                log.type === 'input' ? 'text-indigo-300 font-semibold' : log.type === 'error' ? 'text-red-400' : 'text-gray-300'
              }`}>
                {log.text}
              </div>
            ))}
            <div ref={floatingTerminalBottomRef} />
          </div>
          <div className="flex items-center gap-2 pt-2.5 pb-1 border-t border-white/5 select-none">
            <span className="text-indigo-400 font-bold text-[12.5px] shrink-0">PS Gary&gt;</span>
            <input
              type="text"
              value={terminalInput}
              onChange={e => setTerminalInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleRunCommand()}
              className="flex-grow bg-transparent text-white focus:outline-none placeholder-gray-600 select-text text-[13px] py-1.5 pl-1"
              placeholder="Type commands..."
            />
          </div>
        </div>
      )}

      {/* Floating Swarm Chat Panel */}
      {isFloatingChatOpen && (
        <div
          onMouseDown={handleChatDragStart}
          style={isChatMaximized ? {
            left: 0,
            top: 0,
            width: '100vw',
            height: '100vh',
            borderRadius: 0
          } : {
            left: floatingChatPos.x,
            top: floatingChatPos.y,
            width: isChatMinimized ? '240px' : '480px',
            height: isChatMinimized ? '44px' : '580px',
            resize: isChatMinimized ? 'none' : 'both',
            overflow: 'hidden'
          }}
          className="fixed bg-[#060612]/98 border border-white/[0.08] rounded-2xl shadow-2xl z-50 flex flex-col justify-between backdrop-blur-xl select-none cursor-grab active:cursor-grabbing min-w-[320px] min-h-[300px]"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-3.5 border-b border-white/[0.05] shrink-0 select-none">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider font-mono">Swarm Chat Console</span>
            </div>
            <div className="flex items-center gap-2 select-none">
              {/* Minimize Toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); setIsChatMinimized(!isChatMinimized); }}
                className="text-gray-500 hover:text-white font-bold text-xs p-1 bg-white/[0.02] hover:bg-white/[0.05] rounded-md transition-all cursor-pointer"
                title={isChatMinimized ? "Restore" : "Minimize"}
              >
                {isChatMinimized ? "🗖" : "🗕"}
              </button>
              {/* Maximize Toggle */}
              {!isChatMinimized && (
                <button
                  onClick={(e) => { e.stopPropagation(); setIsChatMaximized(!isChatMaximized); }}
                  className="text-gray-500 hover:text-white font-bold text-[10px] p-1 px-1.5 bg-white/[0.02] hover:bg-white/[0.05] rounded-md transition-all cursor-pointer"
                  title={isChatMaximized ? "Restore Size" : "Maximize"}
                >
                  {isChatMaximized ? "❐" : "⛶"}
                </button>
              )}
              {/* Close Button */}
              <button
                onClick={(e) => { e.stopPropagation(); setIsFloatingChatOpen(false); }}
                className="text-gray-500 hover:text-red-400 font-bold text-xs p-1 bg-white/[0.02] hover:bg-white/[0.05] rounded-md transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages list (only visible if not minimized) */}
          {!isChatMinimized && (
            <div ref={floatingChatContainerRef} className="flex-grow overflow-y-auto p-2.5 space-y-2 select-text cursor-default custom-scrollbar bg-[#020207]/30">
              {chatMessages.length === 0 ? (
                <div className="text-gray-600 text-center py-10 text-xs font-mono">No messages in active session.</div>
              ) : (
                chatMessages.map((msg) => {
                  const isUser = msg.agent === 'user';
                  const isSystem = msg.agent === 'system';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[92%] ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <div className="text-[8px] uppercase tracking-wider text-gray-500 font-bold mb-1 px-1">
                        {isUser ? 'You' : msg.agent}
                      </div>
                      <div className={`p-2 px-2.5 rounded-lg text-[11px] leading-relaxed border ${
                        isUser 
                          ? 'bg-indigo-600/10 border-indigo-500/25 text-indigo-100 rounded-tr-none shadow-sm' 
                          : isSystem 
                            ? 'bg-yellow-500/5 border-yellow-500/15 text-yellow-200/90 rounded-tl-none font-mono text-[9.5px]' 
                            : 'bg-white/[0.02] border-white/[0.06] text-gray-200 rounded-tl-none'
                      }`}>
                        {msg.msg}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={floatingChatBottomRef} />
            </div>
          )}

          {/* Input form (only visible if not minimized) */}
          {!isChatMinimized && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!floatingChatInput.trim()) return;
                const txt = floatingChatInput;
                setFloatingChatInput("");
                if (isCurrentLoading) {
                  await handleSendIntervention(txt);
                } else {
                  await handleSendMessage(txt);
                }
              }}
              className="p-3 border-t border-white/[0.05] bg-[#04040a]/90 flex gap-2 items-center select-none shrink-0"
            >
              <textarea
                value={floatingChatInput}
                onChange={e => setFloatingChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                placeholder="Message swarm/agent..."
                className="flex-grow bg-white/[0.02] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/35 resize-none max-h-24 leading-normal overflow-y-auto"
              />
              <button
                type="submit"
                disabled={!floatingChatInput.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={12} />
              </button>
            </form>
          )}
        </div>
      )}

      {/* ─── SYSTEM SETTINGS OVERLAY MODAL ─── */}
      {isSettingsModalOpen && (
        <div 
          onClick={() => setIsSettingsModalOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-lg flex items-center justify-center z-[150] animate-in fade-in duration-300"
        >
          <div 
            onClick={(e) => e.stopPropagation()} // Stop click propagation to prevent modal closure
            className="w-[1000px] h-[720px] bg-[#060611]/98 border border-white/[0.06] rounded-3xl flex flex-col overflow-hidden shadow-[0_0_80px_rgba(79,70,229,0.18)] relative transition-all duration-300 animate-in zoom-in-95 ease-out"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            
            {/* Header */}
            <div className="glass-strong h-16 flex items-center justify-between px-6 shrink-0 border-b border-white/[0.05] bg-[#03030b]/90 select-none">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.02] text-white text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                >
                  ← Back to Workspace
                </button>
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <Settings className="animate-spin-slow" size={14} />
                  </div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">System Configuration & Swarm Settings</span>
                </div>
              </div>
              <button 
                onClick={() => setIsSettingsModalOpen(false)} 
                className="p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.08] hover:text-white text-gray-400 border border-white/[0.04] cursor-pointer transition-all hover:scale-105"
                title="Close settings and return to workspace"
              >
                <X size={14} />
              </button>
            </div>
            
            {/* Split layout inside modal */}
            <div className="flex-grow flex overflow-hidden min-h-0">
              {/* Diagnostic Warning Banner */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse" />
              
              {/* Left Config Panel Column */}
              <div className="flex-1 overflow-y-auto p-6 border-r border-white/[0.04] space-y-6">
                <div className="bg-[#0b0b1e]/60 border border-white/[0.03] p-5 rounded-2xl shadow-xl">
                  <h4 className="text-[10px] font-bold text-white tracking-wider uppercase font-mono pb-2 border-b border-white/5 mb-4 flex items-center gap-1.5">
                    ⚙️ Config Properties
                  </h4>
                  <SettingsPanel />
                </div>
              </div>
              
              {/* Right Diagnostic / Keys Column */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-black/20">
                <div className="bg-[#0b0b1e]/60 border border-white/[0.03] p-5 rounded-2xl shadow-xl">
                  <h4 className="text-[10px] font-bold text-white tracking-wider uppercase font-mono pb-2 border-b border-white/5 mb-4 flex items-center gap-1.5">
                    🔑 Gemini APIs
                  </h4>
                  <GeminiKeysPanel />
                </div>
                
                <div className="bg-[#0b0b1e]/60 border border-white/[0.03] p-5 rounded-2xl shadow-xl">
                  <h4 className="text-[10px] font-bold text-white tracking-wider uppercase font-mono pb-2 border-b border-white/5 mb-4 flex items-center gap-1.5">
                    🔧 Diagnosticians
                  </h4>
                  <DiagnosticsPanel />
                </div>

                <div className="bg-[#0b0b1e]/60 border border-white/[0.03] p-5 rounded-2xl shadow-xl">
                  <h4 className="text-[10px] font-bold text-white tracking-wider uppercase font-mono pb-2 border-b border-white/5 mb-4 flex items-center gap-1.5">
                    🧬 System Evolution Hub
                  </h4>
                  <SystemEvolutionPanel />
                </div>
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
        <div className="flex items-center gap-3">
          {/* Files Explorer Button */}
          <button
            onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
            className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Toggle Files Explorer"
          >
            <FolderOpen size={12} />
          </button>
          {/* Publishing Control Button */}
          <button
            onClick={() => setIsRightCollapsed(!isRightCollapsed)}
            className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Toggle Publishing Control"
          >
            <Globe size={12} />
          </button>

          {/* Console Button */}
          <button
            onClick={() => setIsFloatingTerminalOpen(!isFloatingTerminalOpen)}
            className="p-1.5 px-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-gray-400 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
            title="Toggle Console"
          >
            <TerminalSquare size={12} className="text-indigo-400" />
            <span className="text-[9px] uppercase font-bold tracking-wider">Console</span>
          </button>

          {/* Swarm Chat Button */}
          <button
            onClick={() => {
              setIsFloatingChatOpen(!isFloatingChatOpen);
              setIsChatMinimized(false);
            }}
            className="p-1.5 px-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 transition-all cursor-pointer flex items-center gap-1.5"
            title="Toggle Swarm Chat"
          >
            <MessageSquare size={12} />
            <span className="text-[9px] uppercase font-bold tracking-wider">💬 Swarm Chat</span>
          </button>

          <span className="text-[9px] font-sans bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 px-2 py-0.5 rounded-md">Antigravity Premium OS Dashboard</span>
          <span className={`text-[8px] font-mono border-l border-gray-800 pl-2 ml-1 ${
            import.meta.env.VITE_ENVIRONMENT === 'production' 
              ? 'text-emerald-400' 
              : 'text-amber-400'
          }`}>
            ENV:{import.meta.env.VITE_ENVIRONMENT || 'DEV'} • v{import.meta.env.VITE_APP_VERSION || 'dev'} • {new Date().toISOString().split('T')[0]}
          </span>
        </div>
      </footer>
    </div>
  );
}
