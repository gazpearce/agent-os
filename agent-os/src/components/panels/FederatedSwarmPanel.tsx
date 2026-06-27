import { useState, useEffect } from "react";
import { Server, Users, Zap, ShieldAlert, Cpu } from "lucide-react";
import { useUIStore } from "../../store/useUIStore";

export default function FederatedSwarmPanel() {
  const { addToast } = useUIStore();
  const [agents, setAgents] = useState<any[]>([]);

  const fetchSwarmStatus = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/swarm/status');
      const data = await res.json();
      if (data.success) {
        setAgents(data.agents);
      }
    } catch (e) {
      console.error('Failed to fetch swarm status', e);
    }
  };

  useEffect(() => {
    fetchSwarmStatus();
    const interval = setInterval(fetchSwarmStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const spawnAgent = async () => {
    try {
      addToast('Spawning new agent...', 'info');
      await fetch('http://localhost:3000/api/swarm/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'Dynamic Specialist' })
      });
      fetchSwarmStatus();
    } catch (e) {
      addToast('Failed to spawn agent', 'error');
    }
  };

  const killAgent = async (id: string) => {
    try {
      addToast(`Terminating ${id}...`, 'warning');
      await fetch(`http://localhost:3000/api/swarm/kill/${id}`, { method: 'DELETE' });
      fetchSwarmStatus();
    } catch (e) {
      addToast('Failed to kill agent', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="flex-none px-6 py-5 border-b border-white/5 bg-gradient-to-r from-emerald-900/20 to-teal-900/20">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Users className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-wide text-white/90">Federated Swarm Control</h2>
            <p className="text-xs text-white/50">Manage autonomous subagents and parallel task execution</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-grow p-6 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-white/[0.02] border border-white/10 rounded-xl p-5 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    agent.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 
                    agent.status === 'idle' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {agent.status === 'active' ? <Zap className="w-5 h-5" /> : 
                     agent.status === 'idle' ? <Server className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-medium text-white/90">{agent.role}</h3>
                    <p className="text-xs text-white/40 font-mono">{agent.id}</p>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                  agent.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
                  agent.status === 'idle' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {agent.status}
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/50 flex items-center"><Cpu className="w-3 h-3 mr-1" /> Compute Load</span>
                    <span className="text-white/80 font-mono">{agent.load}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${agent.load > 80 ? 'bg-red-500' : agent.load > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${agent.load}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded py-1.5 text-xs text-white/70 transition-colors">
                  View Logs
                </button>
                <button 
                  onClick={() => killAgent(agent.id)}
                  className="px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded py-1.5 text-xs transition-colors"
                >
                  Kill
                </button>
              </div>
            </div>
          ))}
          
          <button 
            onClick={spawnAgent}
            className="border-2 border-dashed border-white/10 rounded-xl p-5 flex flex-col items-center justify-center text-white/40 hover:text-white/80 hover:border-white/30 hover:bg-white/5 transition-all min-h-[160px]"
          >
            <Zap className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-sm font-medium">Spawn New Specialist</span>
          </button>
        </div>
      </div>
    </div>
  );
}
