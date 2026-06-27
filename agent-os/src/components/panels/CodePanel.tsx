import { useState } from "react";
import { TerminalSquare } from "lucide-react";

export default function CodePanel() {
  const [code, setCode] = useState('print("Hello from Agent OS")');
  const [lang, setLang] = useState('python');
  const [output, setOutput] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const run = async () => {
    if (!code.trim() || codeLoading) return;
    setCodeLoading(true);
    setOutput('');
    try {
      const res = await fetch('http://localhost:3000/api/run-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, language: lang }) });
      const data = await res.json();
      setOutput(data.output || data.error || 'No output');
    } catch (e) { setOutput(String(e)); }
    finally { setCodeLoading(false); }
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
        <span className="flex items-center gap-1.5"><TerminalSquare size={10} className="text-yellow-400" /> Code Execution</span>
        <div className="flex gap-1">
          {['python', 'javascript'].map(l => (
            <button key={l} onClick={() => setLang(l)} className={`text-[8px] px-1.5 py-0.5 rounded border cursor-pointer ${lang === l ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : 'text-gray-500 border-white/[0.03]'}`}>{l}</button>
          ))}
        </div>
      </div>
      <textarea value={code} onChange={e => setCode(e.target.value)} rows={3} className="w-full bg-black/30 border border-white/[0.05] rounded-lg px-2.5 py-1.5 text-[10px] text-green-300 font-mono placeholder-gray-600 focus:outline-none focus:border-yellow-500/30 resize-none" />
      <button onClick={run} disabled={codeLoading} className="w-full px-2.5 py-1.5 rounded-lg bg-yellow-600/80 hover:bg-yellow-500 text-white text-[10px] font-medium disabled:opacity-50 cursor-pointer">
        {codeLoading ? 'Running...' : '▶ Run Code'}
      </button>
      {output && (
        <div className="bg-black/40 rounded-lg p-2 text-[9px] text-gray-300 font-mono max-h-24 overflow-y-auto whitespace-pre-wrap border border-white/[0.03]">{output}</div>
      )}
    </div>
  );
}
