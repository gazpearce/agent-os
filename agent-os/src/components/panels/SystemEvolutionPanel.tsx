import { useState, useEffect } from "react";

export default function SystemEvolutionPanel() {
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [evolving, setEvolving] = useState(false);
  const [evolveStatus, setEvolveStatus] = useState("");

  const fetchBrief = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/api/evolution/status");
      if (res.ok) {
        const data = await res.json();
        setBrief(data.content || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyUpgrade = async () => {
    if (!confirm("Are you sure you want to trigger the Auto-Evolution Upgrade? This will programmatically update codebase components, increment version number, and push to Git.")) return;
    setEvolving(true);
    setEvolveStatus("Executing evolution scanner scripts...");
    try {
      const res = await fetch("http://localhost:3000/api/evolution/apply-upgrade", { method: "POST" });
      if (res.ok) {
        setEvolveStatus("Evolved successfully! Page will refresh.");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const data = await res.json();
        setEvolveStatus(`Failed: ${data.error || "Unknown error"}`);
      }
    } catch (e: any) {
      setEvolveStatus(`Error: ${e.message}`);
    } finally {
      setEvolving(false);
    }
  };

  useEffect(() => {
    fetchBrief();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-white/5">
        <span className="text-[9px] text-gray-400 font-mono">STATUS: SCAN RUNS AT 3 AM DAILY</span>
        <button
          type="button"
          onClick={fetchBrief}
          disabled={loading}
          className="px-2 py-0.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded text-[9px] hover:text-white cursor-pointer transition-all"
        >
          {loading ? "Refreshing..." : "Refresh Status"}
        </button>
      </div>

      <div className="text-[11px] leading-relaxed text-gray-300 font-mono bg-black/40 border border-white/[0.02] p-3.5 rounded-xl max-h-60 overflow-y-auto whitespace-pre-wrap select-text custom-scrollbar">
        {brief || "No update brief available."}
      </div>

      {brief && brief.includes("🌟 Newly Discovered Models") && (
        <div className="pt-1.5 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleApplyUpgrade}
            disabled={evolving}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 font-sans"
          >
            🧬 {evolving ? "Evolving System..." : "Apply Auto-Upgrade & Evolve"}
          </button>
          {evolveStatus && (
            <div className="text-[9px] font-mono text-purple-400 text-center animate-pulse">{evolveStatus}</div>
          )}
        </div>
      )}

      <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-3 text-[10px] leading-relaxed text-indigo-200">
        📢 <strong>Antigravity Sync Protocol:</strong> You can copy recommendations above and instruct Antigravity in the chat window:
        <span className="block mt-1 font-mono text-[9px] bg-black/30 p-1.5 rounded border border-indigo-500/20 select-all">
          "Run self-evolution updates from the 3am scanner"
        </span>
        to trigger automated workspace edits and codebase updates.
      </div>
    </div>
  );
}
