import { useState } from 'react';
import { Globe, RefreshCw, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

export default function BrowserPanel() {
  const [url, setUrl] = useState('');
  const [browserLog, setBrowserLog] = useState<string[]>([]);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const browse = async (action: string) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, url })
      });
      const data = await res.json();
      if (data.log) setBrowserLog(data.log);
      if (data.screenshotUrl) setScreenshotUrl(data.screenshotUrl);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0c0c16]/75 border border-white/[0.04] rounded-2xl p-4 space-y-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-white/[0.05] pb-3 select-none">
        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">🌐 Autonomous Browser Agent</span>
      </div>

      <div className="flex gap-2">
        <button onClick={() => browse('back')} className="p-2 bg-white/[0.02] border border-white/[0.05] rounded-lg text-gray-400 hover:text-white cursor-pointer transition-colors">
          <ChevronLeft size={14} />
        </button>
        <button onClick={() => browse('forward')} className="p-2 bg-white/[0.02] border border-white/[0.05] rounded-lg text-gray-400 hover:text-white cursor-pointer transition-colors">
          <ChevronRight size={14} />
        </button>
        <button onClick={() => browse('refresh')} className="p-2 bg-white/[0.02] border border-white/[0.05] rounded-lg text-gray-400 hover:text-white cursor-pointer transition-colors">
          <RefreshCw size={14} />
        </button>
        <input 
          value={url} 
          onChange={e => setUrl(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && browse('goto')} 
          placeholder="Enter website URL to visit..." 
          className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/30" 
        />
        <button 
          onClick={() => browse('goto')} 
          disabled={loading}
          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer"
        >
          {loading ? 'Visiting...' : 'Go'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Browser Logs */}
        <div className="bg-black/30 border border-white/[0.03] rounded-xl p-3 h-80 overflow-y-auto text-[10px] font-mono text-gray-400">
          <div className="text-gray-500 font-bold border-b border-white/[0.04] pb-1 mb-2 select-none">Execution Console Logs</div>
          {browserLog.length > 0 ? (
            browserLog.map((log, i) => <div key={i} className="py-0.5 select-text">{log}</div>)
          ) : (
            <div className="text-center py-20 text-gray-600 select-none">No active logs. Enter a URL to start browser control.</div>
          )}
        </div>

        {/* Live Browser Screenshot View */}
        <div className="bg-black/30 border border-white/[0.03] rounded-xl overflow-hidden h-80 flex flex-col items-center justify-center relative group">
          {screenshotUrl ? (
            <div className="w-full h-full p-2 flex items-center justify-center">
              <img src={screenshotUrl} alt="Browser screenshot" className="max-w-full max-h-full object-contain rounded" />
              <a href={screenshotUrl} target="_blank" rel="noreferrer" className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/80 border border-white/[0.05] text-indigo-400 hover:text-white transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer">
                <Eye size={12} />
              </a>
            </div>
          ) : (
            <div className="text-center text-gray-600 select-none">
              <Globe size={24} className="mx-auto mb-2 text-gray-700 animate-pulse" />
              <div className="text-[10px] uppercase font-bold tracking-wider">Live Screenshot Feed</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
