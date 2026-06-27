import { useState } from "react";
import { Cpu, Download, Play, Loader2, HardDrive, Zap, CheckCircle2 } from "lucide-react";
import { CreateMLCEngine, MLCEngine, type InitProgressReport } from "@mlc-ai/web-llm";

export default function LocalEnginePanel() {
  const [engine, setEngine] = useState<MLCEngine | null>(null);
  const [progress, setProgress] = useState<InitProgressReport | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [selectedModel, setSelectedModel] = useState("Llama-3-8B-Instruct-q4f32_1-MLC");
  const [testPrompt, setTestPrompt] = useState("");
  const [testResponse, setTestResponse] = useState("");
  const [isInferring, setIsInferring] = useState(false);

  const initEngine = async () => {
    setStatus("loading");
    try {
      const newEngine = await CreateMLCEngine(selectedModel, {
        initProgressCallback: (p: InitProgressReport) => {
          setProgress(p);
        }
      });
      setEngine(newEngine);
      setStatus("ready");
    } catch (e) {
      console.error(e);
      setStatus("idle");
    }
  };

  const runInference = async () => {
    if (!engine || !testPrompt.trim()) return;
    setIsInferring(true);
    setTestResponse("");
    try {
      const chunks = await engine.chat.completions.create({
        messages: [{ role: "user", content: testPrompt }],
        stream: true,
      });
      for await (const chunk of chunks) {
        setTestResponse((prev) => prev + (chunk.choices[0]?.delta?.content || ""));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsInferring(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center space-x-3">
          <Cpu className="text-amber-400" />
          <h2 className="text-xl font-bold tracking-tight">WebGPU Local Engine</h2>
        </div>
      </div>
      
      <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start space-x-3">
          <Zap className="text-amber-400 mt-0.5" size={18} />
          <div>
            <h4 className="font-semibold text-amber-300 text-sm">100% Private, Zero-Latency Inference</h4>
            <p className="text-xs text-amber-500/80 mt-1">
              Download and execute Large Language Models directly within your browser utilizing your device's GPU (WebGPU) via MLC WebLLM. No API keys required. No data leaves your machine.
            </p>
          </div>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-xl p-6">
          <h3 className="text-sm font-bold text-white/80 mb-4 uppercase tracking-wider font-mono flex items-center">
            <HardDrive size={14} className="mr-2 text-white/40" /> Engine Configuration
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/60 mb-1 block">Select WebGPU Model</label>
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={status !== 'idle'}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-amber-500/50"
              >
                <option value="Llama-3-8B-Instruct-q4f32_1-MLC">Llama 3 8B Instruct (4-bit)</option>
                <option value="Phi-3-mini-4k-instruct-q4f16_1-MLC">Phi-3 Mini 4K (4-bit)</option>
                <option value="Mistral-7B-Instruct-v0.2-q4f16_1-MLC">Mistral 7B Instruct (4-bit)</option>
              </select>
            </div>

            {status === "idle" && (
              <button 
                onClick={initEngine}
                className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-lg p-3 text-sm transition-colors flex items-center justify-center"
              >
                <Download size={16} className="mr-2" /> Download & Initialize Engine
              </button>
            )}

            {status === "loading" && progress && (
              <div className="bg-black/30 rounded-lg p-4 border border-white/5 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-amber-400">Loading Weights...</span>
                  <span className="text-white/60">
                    {progress.text.split(']')[0] + ']'}
                  </span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  {/* Rough visual indicator */}
                  <div className="bg-amber-500 h-full rounded-full animate-pulse" style={{ width: '50%' }}></div>
                </div>
                <p className="text-[10px] text-white/40 font-mono truncate">{progress.text}</p>
              </div>
            )}

            {status === "ready" && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg p-3 text-sm flex items-center justify-center font-bold">
                <CheckCircle2 size={16} className="mr-2" /> Engine Active & Loaded in GPU VRAM
              </div>
            )}
          </div>
        </div>

        {status === "ready" && (
          <div className="bg-[#111] border border-white/10 rounded-xl p-6">
            <h3 className="text-sm font-bold text-white/80 mb-4 uppercase tracking-wider font-mono">Local Inference Test</h3>
            <textarea
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Enter a prompt to test the local model..."
              className="w-full h-24 bg-black/50 border border-white/10 rounded-lg p-3 text-sm mb-4 focus:outline-none focus:border-amber-500/50"
            />
            <button 
              onClick={runInference}
              disabled={isInferring || !testPrompt.trim()}
              className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-lg p-3 text-sm transition-colors flex items-center justify-center mb-4"
            >
              {isInferring ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Play size={16} className="mr-2" />}
              {isInferring ? 'Generating...' : 'Run Inference'}
            </button>

            {testResponse && (
              <div className="bg-black/40 border border-white/5 rounded-lg p-4 text-sm text-white/80 whitespace-pre-wrap font-mono">
                {testResponse}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
