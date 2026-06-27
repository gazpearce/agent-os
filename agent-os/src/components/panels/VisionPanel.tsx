import { useState } from "react";
import { Eye } from "lucide-react";

export default function VisionPanel() {
  const [imgUrl, setImgUrl] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const analyze = async () => {
    if (!imgUrl.trim()) return;
    setAnalyzing(true);
    setAnalysis('');
    try {
      const res = await fetch('http://localhost:3000/api/vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imgUrl }),
      });
      const data = await res.json();
      setAnalysis(data.analysis || data.error || 'No analysis available');
    } catch (e) { setAnalysis(String(e)); }
    finally { setAnalyzing(false); }
  };
  return (
    <div className="space-y-2">
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
        <Eye size={10} className="text-purple-400" /> Vision Analysis
      </div>
      <div className="flex gap-1.5">
        <input value={imgUrl} onChange={e => setImgUrl(e.target.value)} placeholder="Image URL..." className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/30 font-mono" />
        <button onClick={analyze} disabled={analyzing} className="px-2.5 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white text-[10px] font-medium disabled:opacity-50 cursor-pointer">
          {analyzing ? '⏳' : '👁'}
        </button>
      </div>
      {analysis && <div className="bg-black/40 rounded-lg p-2 text-[9px] text-gray-300 max-h-24 overflow-y-auto whitespace-pre-wrap border border-white/[0.03]">{analysis}</div>}
    </div>
  );
}
