import { useState, useEffect } from "react";
import { Activity } from "lucide-react";

interface AgentTelemetryPanelProps {
  agents: any[];
}

export default function AgentTelemetryPanel({ agents }: AgentTelemetryPanelProps) {
  const [status, setStatus] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try { const res = await fetch('http://localhost:3000/api/status'); if (res.ok) setStatus(await res.json()); } catch (_) {}
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
