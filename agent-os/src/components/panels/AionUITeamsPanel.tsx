import { useState, useEffect } from "react";
import { Users } from "lucide-react";

export default function AionUITeamsPanel() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const loadTeams = async () => {
    setLoading(true);
    try { const res = await fetch('http://localhost:3000/api/teams'); if (res.ok) setTeams(await res.json()); } catch (_) {}
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
