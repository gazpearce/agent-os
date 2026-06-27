import { useState } from "react";

export default function DelegationPanel() {
  const [subAgents, setSubAgents] = useState<any[]>([]);
  const [spawnName, setSpawnName] = useState('');
  const [spawnTask, setSpawnTask] = useState('');
  const spawn = async () => {
    if (!spawnName.trim() || !spawnTask.trim()) return;
    const id = `sub-${Date.now()}`;
    setSubAgents(prev => [...prev, { id, name: spawnName, task: spawnTask, status: 'spawning' }]);
    setSpawnName('');
    setSpawnTask('');
    try {
      await fetch('http://localhost:3000/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `Spawn sub-agent "${spawnName}" to: ${spawnTask}` }) });
      setSubAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'running' } : a));
    } catch (_) {
      setSubAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'error' } : a));
    }
  };
  return (
    <div className="space-y-2">
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
        <span className="text-orange-400">🤖</span> Delegation
      </div>
      <div className="space-y-1">
        <input value={spawnName} onChange={e => setSpawnName(e.target.value)} placeholder="Agent name..." className="w-full bg-white/[0.03] border border-white/[0.05] rounded px-2 py-1 text-[10px] text-white placeholder-gray-600 focus:outline-none" />
        <div className="flex gap-1">
          <input value={spawnTask} onChange={e => setSpawnTask(e.target.value)} placeholder="Task..." className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded px-2 py-1 text-[10px] text-white placeholder-gray-600 focus:outline-none" />
          <button onClick={spawn} className="px-2 py-1 rounded bg-orange-600/80 text-white text-[9px] font-medium cursor-pointer">Spawn</button>
        </div>
      </div>
      {subAgents.length > 0 && (
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {subAgents.map(a => (
            <div key={a.id} className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.015] text-[9px]">
              <span className="text-gray-300 truncate flex-1">{a.name}</span>
              <span className={`text-[7px] uppercase ${a.status === 'running' ? 'text-green-400' : a.status === 'spawning' ? 'text-yellow-400' : 'text-red-400'}`}>{a.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
