import { useState, useEffect } from 'react';

export default function SwarmDiagnosticsPanel() {
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
