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

import MediaEnginePanel from "./components/panels/MediaEnginePanel";
import SwarmDiagnosticsPanel from "./components/panels/SwarmDiagnosticsPanel";
import BrowserPanel from "./components/panels/BrowserPanel";
import TodoPanel from "./components/panels/TodoPanel";
import VoiceInput from "./components/chat/VoiceInput";
import SystemEvolutionPanel from "./components/panels/SystemEvolutionPanel";
import AgentConfigPanel from "./components/panels/AgentConfigPanel";
import GitHubPanel from "./components/panels/GithubPanel";



import CronManagementPanel from "./components/panels/CronManagementPanel";
import PersonalityPanel from "./components/panels/PersonalityPanel";
import VectorMemoryPanel from "./components/panels/VectorMemoryPanel";
import PaperclipPanel from "./components/panels/PaperclipPanel";
import SwarmHubPanel from "./components/panels/SwarmHubPanel";
import GoalsPanel from "./components/panels/GoalsPanel";

import Markdown from "./components/Markdown";
import DiagnosticsPanel from "./components/panels/DiagnosticsPanel";
import AgentTelemetryPanel from "./components/panels/AgentTelemetryPanel";
import ProviderPanel from "./components/panels/ProviderPanel";
import AionUITeamsPanel from "./components/panels/AionUITeamsPanel";
import DelegationPanel from "./components/panels/DelegationPanel";
import SpotifyPanel from "./components/panels/SpotifyPanel";
import N8NPanel from "./components/panels/N8NPanel";
import TTSPanel from "./components/panels/TTSPanel";
import CodePanel from "./components/panels/CodePanel";
import MemoryPanel from "./components/panels/MemoryPanel";
import WebSearchPanel from "./components/panels/WebSearchPanel";
import VisionPanel from "./components/panels/VisionPanel";
import VaultPanel from "./components/panels/VaultPanel";

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


export default function App() {
  const [streamTrigger, setStreamTrigger] = useState(0);
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
  const [evolutionUpdate, setEvolutionUpdate] = useState<{available: boolean, prompt: string}>({available: false, prompt: ''});

  useEffect(() => {
    // Check for auto-evolution update on mount
    fetch('/api/evolution/check')
      .then(r => r.json())
      .then(d => {
         if (d.updateAvailable) setEvolutionUpdate({available: true, prompt: d.proposedPrompt});
      })
      .catch(e => console.error(e));
  }, []);

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

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const handleCreateNewFile = async () => {
    if (!newFileName.trim()) return;
    try {
      const res = await fetch("/api/website/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFileName.trim(), content: "" })
      });
      if (res.ok) {
        setNewFileName("");
        fetchWorkspaceFiles();
      } else {
        alert("Failed to create file");
      }
    } catch (e: any) {
      alert("Error creating file: " + e.message);
    }
  };

  const handleCreateNewFolder = async () => {
    if (!newFileName.trim()) return;
    try {
      const res = await fetch("/api/website/mkdir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFileName.trim() })
      });
      if (res.ok) {
        setNewFileName("");
        fetchWorkspaceFiles();
      } else {
        alert("Failed to create folder");
      }
    } catch (e: any) {
      alert("Error creating folder: " + e.message);
    }
  };

  const handleUploadMultipleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadProgress(`Uploading 0/${files.length} files...`);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Uploading ${i + 1}/${files.length}: ${file.name}...`);
        
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await fetch("/api/website/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, content: base64Data })
        });
        
        if (!res.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }
      fetchWorkspaceFiles();
      alert("All files uploaded successfully!");
    } catch (e: any) {
      alert("Upload failed: " + e.message);
    } finally {
      setIsUploading(false);
      setUploadProgress("");
      e.target.value = "";
    }
  };

  const handleAddLinkShortcut = async () => {
    const url = prompt("Enter URL (e.g. https://google.com):");
    if (!url) return;
    const title = prompt("Enter shortcut name / title:");
    if (!title) return;
    
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9_\-]+/g, '_');
    const fileName = `${sanitizedTitle}.url`;
    const shortcutContent = `[InternetShortcut]\r\nURL=${url}\r\n`;
    
    try {
      const res = await fetch("/api/website/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fileName, content: shortcutContent })
      });
      if (res.ok) {
        fetchWorkspaceFiles();
        alert("Shortcut link created successfully!");
      }
    } catch (e: any) {
      alert("Failed to save link: " + e.message);
    }
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

  // Voice Input (Speech-to-Text) State handler
  const handleVoiceTranscript = (transcript: string) => {
    setChatInput(prev => (prev ? prev + ' ' : '') + transcript);
  };

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
      setStreamTrigger(prev => prev + 1);
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
  }, [activeSessionId, chatMode, activeAgent, voiceUpdatesEnabled, streamTrigger]);

  // System Status & Model selection
  const [activeModel, setActiveModel] = useState("deepseek/deepseek-v4-flash:free");
  const [evolutionStatus, setEvolutionStatus] = useState<any>(null);
  const [isReverting, setIsReverting] = useState(false);
  const [switchingModelId, setSwitchingModelId] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Swarm Visualizer & Manus execution telemetry states
  const [isVisualLiveMode, setIsVisualLiveMode] = useState(false);
  const [evolving, setEvolving] = useState(false);
  const [swarmExecution, setSwarmExecution] = useState<any>({
    currentTask: 'Idle',
    currentCommand: '',
    screenshotPath: '/videos/live_browser.png',
    lastUpdated: Date.now()
  });

  const handleApplyEvolution = async () => {
    if (!confirm("Are you sure you want to trigger the Auto-Evolution Upgrade? This will programmatically update codebase components, increment version number, and push to Git.")) return;
    setEvolving(true);
    try {
      const res = await fetch("/api/evolution/apply-upgrade", { method: "POST" });
      if (res.ok) {
        alert("Evolved successfully! Page will refresh.");
        window.location.reload();
      } else {
        const data = await res.json();
        alert(`Failed: ${data.error || "Unknown error"}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setEvolving(false);
    }
  };

  useEffect(() => {
    if (!isVisualLiveMode) return;
    const fetchSwarmState = async () => {
      try {
        const res = await fetch("/api/swarm/execution-state");
        if (res.ok) {
          setSwarmExecution(await res.json());
        }
      } catch (_) {}
    };
    fetchSwarmState();
    const interval = setInterval(fetchSwarmState, 2000);
    return () => clearInterval(interval);
  }, [isVisualLiveMode]);


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

  const fetchDbTasks = async (silent = false) => {
    if (!silent) setDbTasksLoading(true);
    try {
      const res = await fetch("/api/db-tasks");
      if (res.ok) {
        const data = await res.json();
        setDbTasks(data || { aionui: [], hermes: [] });
      }
    } catch (e) {
      console.error("Failed to fetch database tasks:", e);
    } finally {
      if (!silent) setDbTasksLoading(false);
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

  const fetchMailbox = async (silent = false) => {
    if (!silent) setMailboxLoading(true);
    try {
      const res = await fetch("/api/mailbox");
      if (res.ok) {
        const data = await res.json();
        setMailbox(data || []);
      }
    } catch (e) {
      console.error("Failed to fetch mailbox logs:", e);
    } finally {
      if (!silent) setMailboxLoading(false);
    }
  };

  // Poll system status
  const fetchStatus = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
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
      if (!silent) {
        setTimeout(() => setIsRefreshing(false), 500);
      }
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
    fetchStatus(true);
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
      fetchStatus(true);
      fetchDbTasks(true);
      fetchMailbox(true);
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
      setStreamTrigger(prev => prev + 1);
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
    <div className="h-full w-full flex flex-col bg-[#020208] text-[#e2e8f0] overflow-hidden selection:bg-indigo-500/30 selection:text-white">
      {/* Background grid canvas effect */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e1b4b_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none animate-[pulse_12s_ease-in-out_infinite]" />

      {/* ═══ SYSTEM HEADER ═══ */}
      <header className="glass-strong h-14 flex items-center justify-between px-5 shrink-0 z-50 relative border-b border-white/[0.04] select-none">
        <div className="flex items-center gap-3"><div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-300 text-[8px] px-2 py-0.5 rounded-full transition-all duration-300 animate-in fade-in"><span className="animate-pulse">⚠️</span><span>Build failures detected - See Console</span></div>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_15px_rgba(99,102,241,0.4)] relative">
            <span className="absolute inset-0 rounded-lg bg-white/20 animate-pulse pointer-events-none" />
            🦑
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-1.5">
              Agent OS <span className="text-[10px] text-indigo-400 font-mono font-normal">Mission Control</span>
            </h1>
            <div className="text-[9px] font-mono text-gray-500">v2.7.2 • Dynamic Skills & Obsidian Sync</div>
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
            onClick={() => fetchStatus()}
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
              v2.7.2
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
                        <span className="text-[9.5px] font-bold text-indigo-300 font-mono">v2.7.2 (Active)</span>
                        <span className="text-[8px] text-gray-500">Active</span>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">
                        Unlimited File Upload Support: Lifted Express request body size limit to 50GB and added support for automatic base64 binary decoding on file writing (allowing any images, videos, or archives to be added to the tool).
                      </p>
                    </div>
                    <div className="border-l-2 border-purple-500 pl-2 py-0.5 opacity-60 hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-bold text-purple-300 font-mono">v2.7.1</span>
                        <span className="text-[8px] text-gray-500">Previous</span>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">
                        Memory Recall Optimization: Replaced filesystem searching loops with indexed SQLite DB matching and configured background automatic RAG recall on every query.
                      </p>
                    </div>
                    <div className="border-l-2 border-purple-500 pl-2 py-0.5 opacity-60 hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-bold text-purple-300 font-mono">v2.6.0</span>
                        <span className="text-[8px] text-gray-500">Previous</span>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">
                        Intelligence & Memory Sync: Added local trending feed scraper and FastMCP intelligence server, global long-term memory graph synchronization, token-protected secure API gateway, and neural Edge TTS Q&A audio generator.
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

      {/* Auto-Evolution Update Banner */}
      {evolutionStatus && evolutionStatus.content && !evolutionStatus.content.includes("No evolution brief") && (
        <div className="bg-indigo-600/25 backdrop-blur-md border-b border-indigo-500/20 text-indigo-200 px-5 py-2.5 text-xs flex justify-between items-center z-[100] animate-[slideDown_0.3s_ease-out] select-none font-mono">
          <div className="flex items-center gap-2">
            <span className="animate-pulse">🚀</span>
            <span><strong>System Evolution Update Ready:</strong> A new autonomous codebase upgrade has been generated by the auto-evolution daemons.</span>
          </div>
          <button 
            onClick={handleApplyEvolution}
            disabled={evolving}
            className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 text-white font-bold px-3 py-1 rounded-md transition-all cursor-pointer shadow-[0_0_12px_rgba(99,102,241,0.3)] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-95 disabled:opacity-50"
          >
            {evolving ? "Upgrading..." : "Apply Codebase Upgrade"}
          </button>
        </div>
      )}

      {/* AUTO-EVOLUTION NOTIFICATION */}
      {evolutionUpdate.available && (
        <div className="bg-emerald-600/20 border-b border-emerald-500/30 px-4 py-2 flex items-center justify-between shadow-lg backdrop-blur-md z-[100] animate-[slideDown_0.3s_ease-out]">
          <div className="flex items-center gap-3">
            <Sparkles className="text-emerald-400 w-4 h-4 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-100">Auto-Evolution Update Needed: System has detected a high-impact missing feature.</span>
          </div>
          <button 
            onClick={() => {
              setChatInput(evolutionUpdate.prompt);
              setEvolutionUpdate({available: false, prompt: ''});
              // Focus the chat input
              setTimeout(() => {
                const el = document.getElementById('main-chat-input');
                if (el) el.focus();
              }, 100);
            }}
            className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] uppercase font-bold tracking-wider rounded-md transition-colors"
          >
            Review & Install
          </button>
        </div>
      )}

      {/* ═══ CORE LAYOUT ═══ */}
      <div className="flex-grow h-0 flex overflow-hidden relative p-4 gap-4 bg-[#03030b]/30">

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
            <SwarmHubPanel />
          )}

          {/* ─── TAB: PAPERCLIP SWARM ─── */}
          {centerTab === "paperclip" && (
            <PaperclipPanel />
          )}

          {/* ─── TAB 1: LIVE CONVERSATIONAL CHAT PANE ─── */}
          {centerTab === "chat" && (
            <div className="flex-grow h-0 flex overflow-hidden w-full relative">
              <div className={`flex flex-col flex-grow overflow-hidden justify-between transition-all duration-300 relative ${
                isVisualLiveMode 
                  ? 'w-1/2 border-r border-white/[0.04]' 
                  : activeSpecialistId && chatMode === 'collab' 
                  ? 'w-3/5 border-r border-white/[0.04]' 
                  : 'w-full'
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

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsVisualLiveMode(!isVisualLiveMode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer select-none font-mono ${
                      isVisualLiveMode
                        ? "bg-purple-600/30 text-purple-300 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                        : "bg-white/[0.02] text-gray-400 border-white/[0.04] hover:text-white hover:bg-white/[0.05]"
                    }`}
                  >
                    📺 {isVisualLiveMode ? "Disable Split View" : "Split Live View (Manus)"}
                  </button>

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
              </div>

              {/* Centered Scrollable Conversation */}
              <div ref={chatScrollContainerRef} className="flex-grow h-0 overflow-y-auto p-3 scroll-smooth" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: 0, minHeight: 0, flexGrow: 1 }}>
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
                                <span className="text-[13.5px] font-bold font-mono text-white">
                                  {isUser ? "USER" : isSystem ? "SYSTEM SECURITY" : agentMeta?.name || msg.agent}
                                </span>
                                <span className="text-[9.5px] text-gray-500 font-mono">{msg.time || "just now"}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {msg.id && (
                                  <button
                                    onClick={() => handleRewindSession(msg.id!)}
                                    className="text-[9.5px] font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-0.5 cursor-pointer select-none bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20"
                                    title="Rewind session history to this checkpoint"
                                  >
                                    <span>🔄</span>
                                    <span>Rewind</span>
                                  </button>
                                )}
                                {!isUser && !isSystem && !msg.isError && (
                                  <button
                                    onClick={() => handleOpenSpecialistPanel(msg.agent)}
                                    className="text-[9.5px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer select-none bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20"
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

                            <div className="text-[14.5px] text-[#e2e8f0] leading-relaxed break-words select-text">
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
              <div className="p-5 border-t border-white/[0.04] bg-[#03030d]/50 select-none flex justify-center w-full z-[100]">
                <div className="chat-container-centered">
                  <div className="w-full flex flex-col gap-2">
                    <div className="w-full flex items-center bg-[#0d0f22]/90 border border-[#1f2347] rounded-lg shadow-[0_4px_30px_rgba(0,0,0,0.5)] focus-within:border-indigo-500/50 focus-within:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all">
                      <span className="text-gray-900 font-mono pl-4 pr-1 select-none text-xs">&gt;</span>
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
                      <VoiceInput 
                        onTranscript={handleVoiceTranscript} 
                        disabled={isCurrentLoading} 
                      />
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

              {/* Right Column: Visual Live Browser/Execution Monitor (Manus-style) */}
              {isVisualLiveMode && (
                <div className="w-1/2 flex flex-col h-full overflow-hidden bg-[#070715]/95 border-l border-white/[0.04] backdrop-blur-md justify-between animate-[slideInRight_0.25s_cubic-bezier(0.16,1,0.3,1)] font-mono">
                  {/* Monitor Header */}
                  <div className="glass-strong h-14 flex items-center justify-between px-4 shrink-0 border-b border-white/[0.04] bg-[#03030d]/80 select-none">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400">📺</span>
                      <span className="text-[11px] font-bold text-white uppercase tracking-wider">Manus Live Execution Monitor</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Live Capturing</span>
                      </div>
                      <button 
                        onClick={() => setIsVisualLiveMode(false)}
                        className="text-gray-500 hover:text-white transition-colors cursor-pointer p-1"
                        title="Close Visual Monitor"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Monitor Body */}
                  <div className="flex-grow overflow-y-auto p-4 space-y-4 flex flex-col justify-start">
                    {/* Active Task Info Card */}
                    <div className="bg-[#0c0d22]/85 border border-[#1f2347] rounded-xl p-3.5 shadow-md space-y-2">
                      <div className="text-[9px] text-indigo-400 uppercase tracking-widest font-extrabold">Active Goal Objective</div>
                      <div className="text-xs text-white leading-relaxed">{swarmExecution.currentTask || "Idle: Waiting for instructions..."}</div>
                      
                      {swarmExecution.currentCommand && (
                        <>
                          <div className="text-[9px] text-purple-400 uppercase tracking-widest font-extrabold mt-3">Executing Command</div>
                          <div className="bg-black/45 border border-purple-500/10 rounded px-2.5 py-2 text-[10px] text-purple-300 overflow-x-auto whitespace-pre font-mono">
                            {swarmExecution.currentCommand}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Screenshot Live Feed Container */}
                    <div className="flex-grow flex flex-col justify-center items-center bg-black/30 border border-white/[0.03] rounded-xl overflow-hidden relative min-h-[320px] shadow-inner">
                      {swarmExecution.screenshotPath ? (
                        <img 
                          src={`${swarmExecution.screenshotPath}?t=${swarmExecution.lastUpdated || Date.now()}`} 
                          alt="Live Agent Screen Capture"
                          className="w-full h-full object-contain max-h-[460px]"
                          onError={(e) => {
                            // Fallback to placeholder if file does not exist yet
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80";
                          }}
                        />
                      ) : (
                        <div className="text-center text-xs text-gray-500 p-8">
                          <span className="block text-2xl mb-2">📸</span>
                          Screen capture feed loading...
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[8px] text-gray-400 border border-white/[0.04]">
                        Frame Refreshed: {new Date(swarmExecution.lastUpdated || Date.now()).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                      placeholder="Name (e.g. index.html or folder/)"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          if (newFileName.endsWith('/')) {
                            handleCreateNewFolder();
                          } else {
                            handleCreateNewFile();
                          }
                        }
                      }}
                    />
                    
                    {isUploading ? (
                      <div className="text-[10px] text-indigo-400 animate-pulse text-center py-1">
                        {uploadProgress}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={handleCreateNewFile}
                          className="px-2 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/10 text-indigo-300 hover:text-white rounded-lg text-[10px] font-medium transition-all cursor-pointer text-center"
                        >
                          + File
                        </button>
                        <button
                          onClick={handleCreateNewFolder}
                          className="px-2 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/10 text-emerald-300 hover:text-white rounded-lg text-[10px] font-medium transition-all cursor-pointer text-center"
                        >
                          + Folder
                        </button>
                        <button
                          onClick={() => document.getElementById("file-uploader-workspace")?.click()}
                          className="px-2 py-1.5 bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/10 text-blue-300 hover:text-white rounded-lg text-[10px] font-medium transition-all cursor-pointer text-center"
                        >
                          Upload
                        </button>
                        <button
                          onClick={handleAddLinkShortcut}
                          className="px-2 py-1.5 bg-amber-600/20 hover:bg-amber-600/35 border border-amber-500/10 text-amber-300 hover:text-white rounded-lg text-[10px] font-medium transition-all cursor-pointer text-center"
                        >
                          + Link
                        </button>
                        <input
                          type="file"
                          id="file-uploader-workspace"
                          multiple
                          className="hidden"
                          onChange={handleUploadMultipleFiles}
                        />
                      </div>
                    )}
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
                    <AgentConfigPanel />
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
                    <AgentConfigPanel />

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
                <div className="mt-1 flex gap-1">
                <button 
                  onClick={() => navigator.clipboard.writeText('/home/user/project/package.json')}
                  className="text-[8px] bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 px-2 py-0.5 rounded border border-red-500/20 cursor-pointer transition-all"
                  title="Copy Linux path"
                >
                  📋 Copy Linux Path
                </button>
                <button 
                  onClick={() => navigator.clipboard.writeText('D:\Agent OS\agent-os\package.json')}
                  className="text-[8px] bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-indigo-200 px-2 py-0.5 rounded border border-indigo-500/20 cursor-pointer transition-all"
                  title="Copy Windows path"
                >
                  🪟 Copy Windows Path
                </button>
              </div>
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
              
              {/* Environment Alert Banner */}
              <div className="absolute top-1 left-0 right-0 p-2 bg-red-500/10 border-b border-red-500/20 text-xs text-red-300 flex items-center justify-center gap-2 font-mono">
                <span className="animate-pulse">⚠️</span>
                <span>Current Environment: <span className="font-bold">{import.meta.env.VITE_ENVIRONMENT || 'DEV'}</span></span>
                <span>•</span>
                <span>Tip: Run 'pwd' before healing operations</span>
              </div>
              
              {/* Left Config Panel Column */}
              <div className="flex-1 overflow-y-auto p-6 border-r border-white/[0.04] space-y-6">
                <div className="bg-[#0b0b1e]/60 border border-white/[0.03] p-5 rounded-2xl shadow-xl">
                  <h4 className="text-[10px] font-bold text-white tracking-wider uppercase font-mono pb-2 border-b border-white/5 mb-4 flex items-center gap-1.5">
                    ⚙️ Config Properties
                  </h4>
                  <AgentConfigPanel />
                </div>
              </div>
              
              {/* Right Diagnostic / Keys Column */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-black/20">
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
          {evolutionUpdate.available && (
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 cursor-pointer transition-all animate-pulse text-[9px]"
              title="Auto-Evolution detected new updates. Click to open System Evolution Hub in Settings."
            >
              🧬 Evolution Ready
            </button>
          )}
          {terminalLogs.filter(l => l.type === 'error').length > 0 && (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[9px] font-bold text-red-400">{terminalLogs.filter(l => l.type === 'error').length} Errors</span>
            </div>
          )}
          {terminalLogs.filter(l => l.type === 'error').length > 0 && (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-300 text-[8px] px-2 py-0.5 rounded-full transition-all duration-300 animate-in fade-in">
              <span className="animate-pulse">⚠️</span>
              <span>Build failures detected - See Console</span>
            </div>
          )}
          {terminalLogs.filter(l => l.type === 'error').length > 0 && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 text-[8px] px-2 py-0.5 rounded-full transition-all duration-300 animate-in fade-in">
              <span className="animate-pulse">🔧</span>
              <span>Fix errors to enable build</span>
            </div>
          )}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 cursor-pointer transition-all text-[8px]"
            title="Open System Settings to view detailed build diagnostics"
          >
            🛠️ Build Diagnostics
          </button>
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

          <span className="text-[9px] font-sans bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 px-2 py-0.5 rounded-md">Antigravity Premium OS Dashboard {import.meta.env.VITE_ENVIRONMENT === 'development' && <span className="text-orange-400"> (DEV Env - Test in Prod before deploy)</span>}</span>
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
