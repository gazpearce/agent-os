import { useState } from "react";
import { Database } from "lucide-react";

export default function MemoryPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const search = async () => {
    if (!query.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/memory-search?q=${encodeURIComponent(query)}`);
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
