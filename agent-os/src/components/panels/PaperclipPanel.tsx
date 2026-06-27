import { useState, useEffect } from "react";
import { Paperclip, Play, Square, Settings, RefreshCw, Terminal } from "lucide-react";
import { useUIStore } from "../../store/useUIStore";

export default function PaperclipPanel() {
  const { addToast } = useUIStore();
  const [goal, setGoal] = useState("Build an entire React application from scratch");
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    "[SYSTEM] Paperclip Maximizer Mode Ready.",
    "[SYSTEM] Awaiting primary directive."
  ]);

  const [activeLoopId, setActiveLoopId] = useState<string | null>(null);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:3000/api/chat/stream');
    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'PAPERCLIP_LOG') {
          setLogs(prev => [...prev, data.log]);
          if (data.log.includes('completed') || data.log.includes('halted')) {
            setIsRunning(false);
            setActiveLoopId(null);
          }
        }
      } catch (err) {}
    };
    return () => eventSource.close();
  }, []);

  const toggleRun = async () => {
    if (isRunning && activeLoopId) {
      await fetch('http://localhost:3000/api/paperclip/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loopId: activeLoopId })
      });
      setIsRunning(false);
      setActiveLoopId(null);
      addToast('Auto-GPT loop halted', 'warning');
    } else {
      if (!goal) {
        addToast('Please enter a goal first', 'error');
        return;
      }
      setLogs([]);
      setIsRunning(true);
      
      const res = await fetch('http://localhost:3000/api/paperclip/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal })
      });
      const data = await res.json();
      if (data.success) {
        setActiveLoopId(data.loopId);
        addToast('Auto-GPT loop started', 'success');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="flex-none px-6 py-5 border-b border-white/5 bg-gradient-to-r from-amber-900/20 to-orange-900/20">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Paperclip className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-wide text-white/90">Paperclip Maximizer Loop</h2>
            <p className="text-xs text-white/50">Auto-GPT style recursive task execution (Agent operates without human intervention)</p>
          </div>
        </div>
      </div>

      {/* Control Area */}
      <div className="flex-none p-6 border-b border-white/5 bg-white/[0.01]">
        <div className="mb-4">
          <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Primary Directive</label>
          <textarea 
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={isRunning}
            placeholder="What should the agent accomplish?"
            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white/90 focus:outline-none focus:border-amber-500/50 resize-none h-24 disabled:opacity-50"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex space-x-3">
            <button 
              onClick={toggleRun}
              className={`px-6 py-2 rounded-md text-sm font-semibold flex items-center transition-all shadow-lg ${
                isRunning 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' 
                  : 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20'
              }`}
            >
              {isRunning ? <Square className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isRunning ? 'Halt Execution' : 'Deploy Agent'}
            </button>
            <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-sm transition-colors text-white/70">
              <Settings className="w-4 h-4" />
            </button>
          </div>
          
          {isRunning && (
            <div className="flex items-center text-amber-400 text-sm font-medium animate-pulse">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Agent is Thinking...
            </div>
          )}
        </div>
      </div>

      {/* Terminal Output */}
      <div className="flex-grow p-6 bg-[#050505] relative">
        <div className="absolute top-4 right-6 flex items-center space-x-2 opacity-50">
          <Terminal className="w-4 h-4" />
          <span className="text-xs uppercase tracking-widest font-bold">Execution Log</span>
        </div>
        <div className="h-full border border-white/5 rounded-xl bg-black/50 p-4 overflow-y-auto font-mono text-xs text-white/70 space-y-2">
          {logs.map((log, i) => (
            <div key={i} className={`${
              log.includes('[SYSTEM]') ? 'text-blue-400' :
              log.includes('[START]') ? 'text-amber-400 font-bold' :
              log.includes('[THINKING]') ? 'text-purple-400 italic' :
              log.includes('aborted') ? 'text-red-400 font-bold' :
              'text-emerald-400'
            }`}>
              {log}
            </div>
          ))}
          {isRunning && (
            <div className="text-white/30 animate-pulse">_</div>
          )}
        </div>
      </div>
    </div>
  );
}
