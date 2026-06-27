import { useState, useEffect } from "react";

export default function DiagnosticsPanel() {
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const fetchErrors = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/diagnostics/errors');
      if (res.ok) {
        const data = await res.json();
        setErrors(data.errors || []);
      }
    } catch (_) {}
  };

  const clearErrors = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/diagnostics/clear-errors', { method: 'POST' });
      if (res.ok) {
        setErrors([]);
        setStatusMsg('Errors cleared!');
        setTimeout(() => setStatusMsg(''), 3000);
      }
    } catch (_) {}
    finally { setLoading(false); }
  };

  const runSwarmTest = async () => {
    setTesting(true);
    setStatusMsg('Running diagnostics swarm simulation...');
    try {
      const res = await fetch('http://localhost:3000/api/diagnostics/test-swarm', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMsg('Swarm simulation successful! All agents healthy.');
      } else {
        setStatusMsg('Swarm simulation error logged.');
      }
      fetchErrors();
    } catch (_) {
      setStatusMsg('Swarm simulation failed.');
    } finally {
      setTesting(false);
      setTimeout(() => setStatusMsg(''), 5000);
    }
  };

  useEffect(() => {
    fetchErrors();
    const interval = setInterval(fetchErrors, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
        <span className="flex items-center gap-1.5">🛡️ Self-Healing Diagnostics</span>
        <div className="flex gap-1.5 items-center">
          {statusMsg && <span className="text-[8px] text-indigo-400 font-mono animate-pulse">{statusMsg}</span>}
          <button onClick={fetchErrors} className="text-[8px] text-gray-500 hover:text-gray-300 cursor-pointer">Refresh</button>
        </div>
      </div>

      <div className="space-y-1.5">
        {errors.length === 0 ? (
          <div className="text-center py-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-[9.5px] text-emerald-400 font-mono">
            💚 System online: 0 errors detected
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {errors.map((err: any) => (
              <div key={err.id} className="p-2.5 bg-red-500/5 border border-red-500/15 rounded-xl space-y-1 text-left font-mono">
                <div className="flex justify-between items-start text-[8px]">
                  <span className="text-red-400 font-bold uppercase">🚨 Runtime Error</span>
                  <span className="text-gray-500">{new Date(err.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-[9px] text-gray-300 break-words leading-normal">{err.error_message}</div>
                {err.stack_trace && (
                  <div className="text-[7.5px] text-gray-500 max-h-12 overflow-y-auto leading-normal bg-black/20 p-1 rounded">
                    {err.stack_trace}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={runSwarmTest}
          disabled={testing}
          className="py-2 px-3 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/25 hover:border-indigo-500/40 text-indigo-300 rounded-xl text-[9px] font-bold uppercase cursor-pointer transition-all select-none text-center"
        >
          {testing ? 'Simulating...' : '🔥 Swarm Test'}
        </button>
        <button
          onClick={clearErrors}
          disabled={loading || errors.length === 0}
          className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/45 text-red-400 rounded-xl text-[9px] font-bold uppercase cursor-pointer transition-all select-none text-center disabled:opacity-55 disabled:cursor-not-allowed"
        >
          Clear Logs
        </button>
      </div>
    </div>
  );
}
