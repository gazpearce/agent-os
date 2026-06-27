import { useState, useEffect } from "react";

export function AIProvidersDiagnosticConsole() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testConnections = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/providers/status');
      if (res.ok) {
        setProviders(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch provider status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testConnections();
    const interval = setInterval(testConnections, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pt-2.5 border-t border-white/[0.05] space-y-2">
      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
        <span>📶 AI API Diagnostics & Fallbacks</span>
        <button
          onClick={testConnections}
          disabled={loading}
          className="text-[8px] text-teal-400 hover:text-teal-300 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Testing...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {providers.map((p, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between bg-black/30 border border-white/[0.03] rounded px-2 py-1 text-[8px] font-mono hover:bg-black/40 transition-colors"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white">{p.name}</span>
                <span className="text-[7.5px] text-gray-500">({p.type})</span>
              </div>
              <div className="text-[7px] text-gray-400">
                Model: <span className="text-gray-300">{p.model}</span>
                {p.keysCount !== undefined && ` | Keys: ${p.keysCount}`}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {p.online && p.latency !== undefined && (
                <span className="text-[7px] text-gray-500">{p.latency}ms</span>
              )}
              <span className={`w-1.5 h-1.5 rounded-full ${
                !p.configured ? 'bg-gray-600' :
                p.online ? 'bg-green-500 shadow-[0_0_4px_#22c55e]' :
                'bg-red-500 shadow-[0_0_4px_#ef4444]'
              }`} title={!p.configured ? 'Not Configured' : p.online ? 'Online' : 'Offline/Depleted'} />
            </div>
          </div>
        ))}
        {providers.length === 0 && (
          <div className="text-center py-2 text-[8px] text-gray-600 font-mono">No diagnostic data. Click refresh.</div>
        )}
      </div>
    </div>
  );
}

export function BackgroundAgentPanel() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/background-agent/status');
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch (_) {}
  };

  const triggerScan = async () => {
    setLoading(true);
    setMsg('Triggering scan...');
    try {
      const res = await fetch('/api/background-agent/trigger', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setMsg(data.message);
        setTimeout(() => setMsg(''), 4000);
        fetchStatus();
      }
    } catch (e: any) {
      setMsg('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return <div className="text-[9px] text-gray-500 py-1">Loading agent status...</div>;

  return (
    <div className="pt-2.5 border-t border-white/[0.05] space-y-2">
      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
        <span>🔄 24/7 Research & Evolution Daemon</span>
        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
          status.status === 'researching' ? 'bg-amber-500/20 text-amber-400' :
          status.status === 'user-active' ? 'bg-blue-500/20 text-blue-400' :
          status.status === 'idle-passive' ? 'bg-teal-500/20 text-teal-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {(status.status || 'offline').toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[8px] text-gray-400 font-mono bg-black/20 rounded p-1.5 border border-white/[0.03]">
        <div>Idle Time: <span className="text-white">{status.idleTimeSeconds || 0}s</span></div>
        <div>Last Run: <span className="text-white">{status.lastIntensiveRun ? new Date(status.lastIntensiveRun).toLocaleTimeString() : 'Never'}</span></div>
        <div className="col-span-2">Mode: <span className="text-gray-300">{(status.idleTimeSeconds || 0) >= 1800 ? 'Deep Evolution (Idle)' : 'Passive Monitoring'}</span></div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={triggerScan}
          disabled={loading}
          className="flex-1 px-2.5 py-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white rounded text-[8px] font-bold cursor-pointer transition-colors"
        >
          {loading ? 'Triggering...' : 'Force Intensive Scan'}
        </button>
      </div>
      {msg && <div className="text-[8px] text-teal-400 font-mono">{msg}</div>}

      <div className="space-y-1">
        <div className="text-[8px] text-gray-500 font-bold uppercase">Activity Log:</div>
        <div className="bg-black/40 border border-white/[0.05] rounded p-1.5 max-h-24 overflow-y-auto text-[7.5px] font-mono text-gray-400 space-y-0.5">
          {(status.logs || []).map((log: string, idx: number) => (
            <div key={idx} className="whitespace-pre-wrap">{log}</div>
          ))}
          {(!status.logs || status.logs.length === 0) && <div>No logs yet.</div>}
        </div>
      </div>
    </div>
  );
}

export function GeminiKeysPanel() {
  const [keys, setKeys] = useState<string[]>([]);
  const [newKey, setNewKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState('');

  const loadKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gemini-keys');
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch (_) {}
    finally { setLoading(false); }
  };

  const saveKeys = async (updatedKeys: string[]) => {
    try {
      const res = await fetch('/api/gemini-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: updatedKeys })
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
        setSaved('Saved!');
        setTimeout(() => setSaved(''), 2000);
      }
    } catch (_) {
      setSaved('Error saving');
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleAdd = () => {
    if (!newKey.trim()) return;
    const updated = [...keys, newKey.trim()];
    saveKeys(updated);
    setNewKey('');
  };

  const handleDelete = (index: number) => {
    const updated = keys.filter((_, i) => i !== index);
    saveKeys(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
        <span className="flex items-center gap-1">🔑 Gemini API Keys ({keys.length})</span>
        <div className="flex items-center gap-1.5">
          {loading && <span className="text-[8px] text-gray-400">...</span>}
          {saved && <span className="text-[8px] text-green-400">{saved}</span>}
        </div>
      </div>
      
      <div className="space-y-1">
        {keys.map((key, i) => (
          <div key={i} className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-black/40 border border-white/[0.03] text-[9px] font-mono">
            <span className="text-gray-400 truncate w-[180px]">
              {key.length > 12 ? `${key.slice(0, 6)}...${key.slice(-6)}` : key}
            </span>
            <button 
              onClick={() => handleDelete(i)} 
              className="text-red-400 hover:text-red-300 hover:scale-105 cursor-pointer text-[8px] border-none bg-transparent"
              title="Delete key"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-1 pt-1">
        <input 
          type="text" 
          placeholder="Add Gemini API Key (AIzaSy...)" 
          value={newKey} 
          onChange={e => setNewKey(e.target.value)} 
          className="flex-1 bg-black/40 border border-white/[0.05] rounded px-2 py-1 text-[9px] text-gray-300 font-mono focus:outline-none focus:border-white/10"
        />
        <button 
          onClick={handleAdd} 
          className="bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 rounded px-2.5 py-1 text-[9px] font-semibold transition-all cursor-pointer"
        >
          Add
        </button>
      </div>
      <div className="text-[8px] text-gray-500 italic select-none">
        Keys rotate automatically.
      </div>
    </div>
  );
}

export default function AgentConfigPanel() {
  const [config, setConfig] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState('');
  const loadConfig = async () => {
    setLoading(true);
    try { const res = await fetch('/api/config'); if (res.ok) setConfig((await res.json()).content || ''); } catch (_) {}
    finally { setLoading(false); }
  };
  const saveConfig = async () => {
    try {
      await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: config }) });
      setSaved('Saved!');
      setTimeout(() => setSaved(''), 2000);
    } catch (_) { setSaved('Error saving'); }
  };
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
          <span>⚙️ Config.yaml</span>
          <div className="flex gap-1">
            <button onClick={loadConfig} disabled={loading} className="text-[8px] text-gray-500 hover:text-gray-300 cursor-pointer">{loading ? '...' : 'Load'}</button>
            {config && <button onClick={saveConfig} className="text-[8px] text-green-500 hover:text-green-300 cursor-pointer">Save</button>}
            {saved && <span className="text-[8px] text-green-400">{saved}</span>}
          </div>
        </div>
        {config ? (
          <textarea value={config} onChange={e => setConfig(e.target.value)} rows={10} className="w-full bg-black/40 border border-white/[0.05] rounded-lg px-2.5 py-1.5 text-[9px] text-gray-300 font-mono focus:outline-none focus:border-white/10 resize-none" />
        ) : (
          <div className="text-center py-3 text-[9px] text-gray-600">Click Load to view/edit config.yaml</div>
        )}
      </div>

      {/* GitHub Backup */}
      <div className="pt-2.5 border-t border-white/[0.05] space-y-1.5">
        <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">
          <span>📦 GitHub Repository Sync</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Optional commit message..."
            id="git-commit-msg"
            className="flex-1 bg-black/40 border border-white/[0.05] rounded px-2 py-1 text-[8px] text-gray-300 focus:outline-none focus:border-white/10"
          />
          <button
            onClick={async () => {
              const input = document.getElementById('git-commit-msg') as HTMLInputElement;
              const msg = input ? input.value : '';
              const btn = document.getElementById('git-backup-btn') as HTMLButtonElement;
              if (btn) {
                btn.disabled = true;
                btn.innerText = 'Syncing...';
              }
              try {
                const res = await fetch('/api/git/backup', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ message: msg })
                });
                const data = await res.json();
                if (data.success) {
                  alert('Sync Complete!\n\nCommit: ' + data.commit);
                } else {
                  alert('Error: ' + data.error);
                }
              } catch (e: any) {
                alert('Sync Failed: ' + e.message);
              } finally {
                if (btn) {
                  btn.disabled = false;
                  btn.innerText = 'Push Backup';
                }
                if (input) input.value = '';
              }
            }}
            id="git-backup-btn"
            className="px-2.5 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-[8px] font-bold cursor-pointer transition-colors"
          >
            Push Backup
          </button>
        </div>
      </div>

      {/* Background Agent Section */}
      <BackgroundAgentPanel />

      {/* AI Providers Diagnostic Console */}
      <AIProvidersDiagnosticConsole />
      
      {/* Gemini API Keys */}
      <GeminiKeysPanel />
    </div>
  );
}
