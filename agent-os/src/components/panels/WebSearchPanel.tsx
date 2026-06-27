import { useState } from "react";
import { Globe } from "lucide-react";

export default function WebSearchPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const search = async () => {
    if (!query.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, method: 'GET' }) });
      const data = await res.json();
      // Parse basic results from HTML
      const html = data.raw || '';
      const results: any[] = [];
      const regex = /<a rel="nofollow" class="result__a" href="([^"]+)">([^<]+)<\/a>/g;
      let match;
      while ((match = regex.exec(html)) !== null && results.length < 10) {
        results.push({ url: match[1], title: match[2] });
      }
      setResults(results);
    } catch (e) { console.error(e); }
    finally { setSearchLoading(false); }
  };
  return (
    <div className="space-y-2">
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
        <Globe size={10} className="text-blue-400" /> Web Search
      </div>
      <div className="flex gap-1.5">
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Search the web..." className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/30" />
        <button onClick={search} disabled={searchLoading} className="px-2.5 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-white text-[10px] font-medium disabled:opacity-50 cursor-pointer">
          {searchLoading ? '⏳' : '🔍'}
        </button>
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {results.map((r, i) => (
          <a key={i} href={r.url} target="_blank" rel="noopener" className="block px-2.5 py-1.5 rounded-lg bg-white/[0.015] border border-white/[0.02] text-[10px] hover:bg-white/[0.03]">
            <div className="text-blue-300 font-semibold truncate">{r.title}</div>
            <div className="text-gray-600 truncate text-[8px]">{r.url}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
