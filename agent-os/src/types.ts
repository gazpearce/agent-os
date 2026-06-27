/* ─────────────── SHARED TYPES ─────────────── */

export interface Agent {
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

export interface ChatMessage {
  id?: string;
  agent: string;
  msg: string;
  time: string;
  isError?: boolean;
  tools?: string[];
  status?: string;
}

export interface ThreadedMessage extends ChatMessage {
  replies?: ThreadedMessage[];
}

export interface SessionInfo {
  id: string;
  fileName: string;
  date: string;
  rawDate: string;
  sizeBytes: number;
}

export interface McpServerInfo {
  id: string;
  name: string;
  status: string;
  tools: number;
}

export interface VaultFileInfo {
  name: string;
  sizeBytes: number;
  mtime: string;
}

export interface TeamAgent {
  slotId: string;
  conversationId: string;
  role: string;
  agentType: string;
  agentName: string;
  status: string;
  conversationType: string;
  model?: string;
}

export interface Team {
  id: string;
  user_id: string;
  name: string;
  workspace: string;
  workspace_mode: string;
  lead_agent_id: string;
  agents: string;
  created_at: number;
  updated_at: number;
  session_mode: string;
}

export interface MailboxLog {
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

export interface DbTask {
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

export interface GalleryItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  prompt: string;
  timestamp: string;
}

export const INITIAL_AGENTS: Agent[] = [
  { id: "agy", name: "Antigravity", role: "Intelligence · CEO", icon: null, status: "online", version: "1.0.2", layer: "L1", color: "#6366f1", tokens: 2841, tasks: 12, skills: 15 },
  { id: "openclaw", name: "OpenClaw", role: "Execution · Router", icon: null, status: "offline", version: "2026.5.20", layer: "L2", color: "#10b981", tokens: 19430, tasks: 42, skills: 8 },
  { id: "claude", name: "Claude Code", role: "Developer · Refactoring", icon: null, status: "online", version: "2.1.159", layer: "L3", color: "#ea580c", tokens: 53102, tasks: 14, skills: 12 },
  { id: "hermes", name: "Hermes", role: "Research · Executor", icon: null, status: "offline", version: "active", layer: "L3", color: "#a855f7", tokens: 142893, tasks: 23, skills: 31 },
  { id: "openrouter", name: "OpenRouter", role: "Cloud · API", icon: null, status: "online", version: "27 models", layer: "Cloud", color: "#8b5cf6", tokens: 89234, tasks: 156, skills: 27 },
  { id: "ollama", name: "Ollama", role: "Local · Inference", icon: null, status: "offline", version: "0.24.0", layer: "L6", color: "#22d3ee", tokens: 0, tasks: 0, skills: 4 },
  { id: "lmstudio", name: "LM Studio", role: "Local · UI", icon: null, status: "offline", version: "installed", layer: "L6", color: "#ec4899", tokens: 0, tasks: 0, skills: 3 },
];
