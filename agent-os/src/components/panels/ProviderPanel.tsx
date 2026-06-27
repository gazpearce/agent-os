import { useState, useEffect } from "react";
import { Layers } from "lucide-react";

export default function ProviderPanel() {
  const providers = [
    { id: 'openrouter/owl-alpha', name: 'Owl Alpha', ctx: '1M', free: false },
    { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Reasoning)', ctx: '128K', free: true },
    { id: 'qwen/qwen-2.5-coder-32b-instruct:free', name: 'Qwen 2.5 Coder 32B', ctx: '128K', free: true },
    { id: 'deepseek/deepseek-v4-flash:free', name: 'DeepSeek V4 Flash', ctx: '1M', free: true },
    { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder 480B', ctx: '1M', free: true },
    { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'NVIDIA Nemotron 3 Super', ctx: '1M', free: true },
    { id: 'moonshotai/kimi-k2.6:free', name: 'Kimi K2.6', ctx: '262K', free: true },
    { id: 'google/gemma-4-26b-a4b-it:free', name: 'Gemma 4 26B A4B', ctx: '262K', free: true },
    { id: 'openai/gpt-oss-120b:free', name: 'GPT-OSS 120B', ctx: '131K', free: true },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B', ctx: '131K', free: true },
  ];

  const [activeProvider, setActiveProvider] = useState('openrouter/owl-alpha');
  
  useEffect(() => {
    const fetchActiveModel = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/config');
        if (res.ok) {
          const data = await res.json();
          const match = data.content?.match(/default:\s*([^\s\n]+)/);
          if (match && match[1]) {
            const matchedModel = match[1].trim();
            const exists = providers.some(p => p.id === matchedModel);
            if (exists) {
              setActiveProvider(matchedModel);
            } else {
              setActiveProvider('openrouter/owl-alpha');
            }
          }
        }
      } catch (_) {}
    };
    fetchActiveModel();
  }, []);

  const switchProvider = async (p: any) => {
    setActiveProvider(p.id);
    try {
      await fetch('http://localhost:3000/api/set-provider', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modelId: p.id }) });
      await fetch('http://localhost:3000/api/select-model', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modelId: p.id }) });
    } catch (_) {}
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
        <span className="flex items-center gap-1.5"><Layers size={10} className="text-indigo-400" /> Model Providers</span>
        <span className="text-[7px] text-gray-600">{providers.filter(p => p.free).length} free</span>
      </div>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {providers.map(p => (
          <button key={p.id} onClick={() => switchProvider(p)} className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[10px] cursor-pointer transition-all ${activeProvider === p.id ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-white/[0.015] border-white/[0.02] text-gray-400 hover:bg-white/[0.03]'}`}>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{p.name}</span>
              {p.free && <span className="text-[7px] px-1 py-0.5 rounded bg-green-500/10 text-green-400">FREE</span>}
            </div>
            <span className="text-[8px] text-gray-500 font-mono">{p.ctx}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
