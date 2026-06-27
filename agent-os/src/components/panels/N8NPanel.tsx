import { useState } from "react";
import { Workflow, ExternalLink } from "lucide-react";

export default function N8NPanel() {
  const [wfId, setWfId] = useState('');
  const [n8nStatus, setN8nStatus] = useState('');
  const trigger = async () => {
    if (!wfId.trim()) return;
    try {
      const res = await fetch('http://localhost:3000/api/n8n/trigger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflowId: wfId }) });
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
