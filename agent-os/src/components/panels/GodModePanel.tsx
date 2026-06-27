import { useState, useEffect } from "react";
import { Activity, Cpu, Database, Network, Zap, Terminal } from "lucide-react";

export default function GodModePanel() {
  const [cpuLoad, setCpuLoad] = useState(0);
  const [ramUsage, setRamUsage] = useState(0);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/diagnostics/telemetry');
        if (res.ok) {
          const data = await res.json();
          setCpuLoad(data.cpuLoad);
          setRamUsage(data.ramUsage);
        }
      } catch (e) {}
    };
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-black text-white font-mono overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0a0a0a]">
        <div className="flex items-center space-x-3 text-red-500">
          <Zap size={20} className="animate-pulse" />
          <h2 className="text-xl font-bold tracking-tight uppercase">God Mode Command Center</h2>
        </div>
        <div className="flex items-center space-x-4 text-xs font-bold text-white/60 uppercase">
          <span className="flex items-center"><Activity size={12} className="mr-1 text-emerald-400" /> System Online</span>
        </div>
      </div>
      
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
        
        {/* Core Telemetry */}
        <div className="bg-[#111] border border-red-500/20 rounded-xl p-4 flex flex-col">
          <h3 className="text-red-400 text-xs font-bold uppercase tracking-wider mb-4 border-b border-red-500/20 pb-2 flex items-center">
            <Cpu size={14} className="mr-2" /> Core Telemetry
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/60">CPU Load</span>
                <span className="text-emerald-400">{cpuLoad}%</span>
              </div>
              <div className="w-full bg-black border border-white/10 rounded-full h-2">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${cpuLoad}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/60">RAM Allocation</span>
                <span className="text-amber-400">{ramUsage}%</span>
              </div>
              <div className="w-full bg-black border border-white/10 rounded-full h-2">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${ramUsage}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Neural Swarm Matrix */}
        <div className="bg-[#111] border border-cyan-500/20 rounded-xl p-4 flex flex-col">
          <h3 className="text-cyan-400 text-xs font-bold uppercase tracking-wider mb-4 border-b border-cyan-500/20 pb-2 flex items-center">
            <Network size={14} className="mr-2" /> Neural Swarm Matrix
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center bg-black/50 p-2 rounded border border-white/5">
              <span className="text-white/80">Local Master Node</span>
              <span className="text-emerald-400">ACTIVE</span>
            </div>
            <div className="flex justify-between items-center bg-black/50 p-2 rounded border border-white/5">
              <span className="text-white/80">Cloud GPU Workers</span>
              <span className="text-amber-400">STANDBY (2)</span>
            </div>
            <div className="flex justify-between items-center bg-black/50 p-2 rounded border border-white/5">
              <span className="text-white/80">Active Agents</span>
              <span className="text-cyan-400 font-bold">14</span>
            </div>
          </div>
        </div>

        {/* Data Pipelines */}
        <div className="bg-[#111] border border-purple-500/20 rounded-xl p-4 flex flex-col">
          <h3 className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-4 border-b border-purple-500/20 pb-2 flex items-center">
            <Database size={14} className="mr-2" /> Vector Streams
          </h3>
          <div className="space-y-3">
            <div className="flex items-center text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-ping"></div>
              <span className="text-white/60">Ingesting:</span>
              <span className="ml-auto text-emerald-400">n8n_webhook_payloads.json</span>
            </div>
            <div className="flex items-center text-xs">
              <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
              <span className="text-white/60">Total Dimensions:</span>
              <span className="ml-auto text-white">1536</span>
            </div>
            <div className="flex items-center text-xs">
              <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
              <span className="text-white/60">Knowledge Nodes:</span>
              <span className="ml-auto text-white">42,109</span>
            </div>
          </div>
        </div>

        {/* Global Terminal Stream */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-black border border-white/10 rounded-xl flex flex-col min-h-[300px]">
          <div className="p-3 border-b border-white/10 flex justify-between items-center bg-[#0a0a0a] rounded-t-xl">
            <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider flex items-center">
              <Terminal size={14} className="mr-2" /> Global Terminal Intercept
            </h3>
          </div>
          <div className="p-4 flex-1 text-xs text-emerald-500/80 font-mono space-y-1">
            <div>[SYS] OS Kernel initialized...</div>
            <div>[SYS] Mounting Vector Memory store... OK</div>
            <div>[SYS] Starting WebGPU initialization background thread... OK</div>
            <div className="text-cyan-400">[NET] Swarm connection established to 192.168.1.105:3001</div>
            <div>[AGENT:04] Executing autonomous task: "Re-index SQLite"</div>
            <div>[AGENT:04] Database indexing completed in 1.4s</div>
            <div className="animate-pulse">_</div>
          </div>
        </div>

      </div>
    </div>
  );
}
