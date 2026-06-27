import { useState } from "react";

export default function GitHubPanel() {
  const [repos, setRepos] = useState<any[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [ghStatus, setGhStatus] = useState('');

  const fetchRepos = async () => {
    setReposLoading(true);
    try {
      const res = await fetch('/api/github?action=repos');
      if (res.ok) setRepos(await res.json());
    } catch (_) {}
    finally { setReposLoading(false); }
  };

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/github?action=status');
      if (res.ok) setGhStatus((await res.json()).configured ? 'Connected' : 'Not configured');
    } catch (_) {}
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
