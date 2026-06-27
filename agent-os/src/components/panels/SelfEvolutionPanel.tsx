import { useState, useEffect } from "react";
import { Activity, Sparkles, TrendingUp, FileCode, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

const mockTimeline = [
  { id: 1, type: 'refactor', title: 'Modularized Backend Architecture', description: 'Extracted 136 routes into independent backend modules.', date: new Date().toISOString(), impact: 'High' },
  { id: 2, type: 'optimization', title: 'Async SQLite Worker Thread', description: 'Offloaded synchronous database operations to a dedicated worker pool.', date: new Date(Date.now() - 3600000).toISOString(), impact: 'Critical' },
  { id: 3, type: 'feature', title: 'UX Enchancements', description: 'Implemented Command Palette, React Flow Builder, and Plugin Registry.', date: new Date(Date.now() - 7200000).toISOString(), impact: 'Medium' },
];

export default function SelfEvolutionPanel() {
  const [timeline] = useState(mockTimeline);
  const [hasUpgrade, setHasUpgrade] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const checkStatus = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/evolution/status');
      const data = await res.json();
      setHasUpgrade(data.status === 'upgrade_pending');
    } catch (e) {}
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const applyUpgrade = async () => {
    setIsUpgrading(true);
    try {
      await fetch('http://localhost:3000/api/evolution/apply-upgrade', { method: 'POST' });
      setHasUpgrade(false);
      // Let it refresh timeline if needed
    } catch (e) {}
    setIsUpgrading(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center space-x-3">
          <TrendingUp className="text-fuchsia-400" />
          <h2 className="text-xl font-bold tracking-tight">Self-Evolution Timeline</h2>
        </div>
      </div>
      
      <div className="p-6 overflow-y-auto flex-1">
        {hasUpgrade && (
          <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start space-x-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <AlertTriangle className="text-yellow-500 w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-yellow-500 font-semibold mb-1">Agent Self-Correction Proposal Ready</h3>
              <p className="text-sm text-yellow-500/70 mb-3">An autonomous agent has detected an error in its own code and has written a patch. Review the AST syntax diff before applying.</p>
              <button 
                onClick={applyUpgrade}
                disabled={isUpgrading}
                className="flex items-center px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg text-sm hover:bg-yellow-400 transition-colors disabled:opacity-50"
              >
                {isUpgrading ? 'Applying Patch...' : 'Apply Evolution Patch'} <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        <p className="text-white/60 text-sm mb-8">
          This timeline tracks structural, architectural, and logical improvements made to the Agent OS core by autonomous agents over time.
        </p>

        <div className="relative border-l border-white/10 ml-4 space-y-8 pb-12">
          {timeline.map((event) => (
            <div key={event.id} className="relative pl-8">
              <div className="absolute -left-[17px] top-1 h-8 w-8 rounded-full bg-[#111] border border-white/20 flex items-center justify-center">
                {event.type === 'refactor' ? <FileCode size={14} className="text-blue-400" /> : 
                 event.type === 'optimization' ? <Activity size={14} className="text-emerald-400" /> : 
                 <Sparkles size={14} className="text-yellow-400" />}
              </div>
              
              <div className="bg-[#111] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-white/90">{event.title}</h3>
                  <span className="text-[10px] font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">
                    {new Date(event.date).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-white/60 mb-4">{event.description}</p>
                <div className="flex items-center space-x-3">
                  <span className={`text-[10px] uppercase font-bold tracking-wider font-mono px-2 py-0.5 rounded border 
                    ${event.impact === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                      event.impact === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                      'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                    {event.impact} Impact
                  </span>
                  <span className="text-[10px] flex items-center text-emerald-400 font-mono">
                    <CheckCircle2 size={10} className="mr-1" /> Verified
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
