import { useState, useEffect } from "react";
import { Brain, Database, Network, Search, GitGraph } from "lucide-react";
import MemoryGalaxyStarMap from "./MemoryGalaxyStarMap";

export default function VectorMemoryPanel() {
  const [activeTab, setActiveTab] = useState<'nodes' | 'graph'>('graph');
  const [searchQuery, setSearchQuery] = useState('');
  const [memoryStats, setMemoryStats] = useState({ entities: 0, relations: 0, observations: 0 });

  useEffect(() => {
    fetch('http://localhost:3000/api/memory/nodes')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.stats) {
          setMemoryStats(data.stats);
        }
      })
      .catch(e => console.error('Failed to load memory stats', e));
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white overflow-hidden relative">
      {/* Header */}
      <div className="flex-none px-6 py-5 border-b border-white/5 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-wide text-white/90">Agentic Memory Core</h2>
              <p className="text-xs text-white/50">Vector Embeddings & Knowledge Graph (MCP memory-mcp-server)</p>
            </div>
          </div>
          <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
            <button 
              onClick={() => setActiveTab('graph')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'graph' ? 'bg-purple-500/20 text-purple-300' : 'text-white/40 hover:text-white/70'}`}
            >
              <Network className="w-4 h-4 inline-block mr-2" />
              Galaxy Map
            </button>
            <button 
              onClick={() => setActiveTab('nodes')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'nodes' ? 'bg-purple-500/20 text-purple-300' : 'text-white/40 hover:text-white/70'}`}
            >
              <Database className="w-4 h-4 inline-block mr-2" />
              Raw Entities
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex-none px-6 py-3 border-b border-white/5 flex items-center space-x-8 bg-white/[0.01]">
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse"></div>
          <span className="text-xs text-white/60">Entities: <span className="text-white/90 font-mono">{memoryStats.entities}</span></span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-purple-500 mr-2 animate-pulse"></div>
          <span className="text-xs text-white/60">Relations: <span className="text-white/90 font-mono">{memoryStats.relations}</span></span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></div>
          <span className="text-xs text-white/60">Observations: <span className="text-white/90 font-mono">{memoryStats.observations}</span></span>
        </div>
        <div className="flex-grow"></div>
        <div className="relative">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search semantic memory..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-1.5 bg-black/40 border border-white/10 rounded-md text-sm text-white/80 focus:outline-none focus:border-purple-500/50 w-64 transition-colors"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow relative overflow-hidden">
        {activeTab === 'graph' ? (
          <MemoryGalaxyStarMap />
        ) : (
          <div className="p-6 h-full overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:border-purple-500/30 transition-colors group cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      <GitGraph className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-semibold text-white/80">Entity_{i}</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-purple-400/60 bg-purple-500/10 px-2 py-0.5 rounded">Node</span>
                  </div>
                  <p className="text-xs text-white/50 mb-4 line-clamp-2">
                    Observation: User prefers auto-accept mode for Mega-Execution execution. Configured local agent settings accordingly.
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-white/30 border border-white/10 px-1.5 py-0.5 rounded">Memory</span>
                    <span className="text-[10px] text-white/30 border border-white/10 px-1.5 py-0.5 rounded">System</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
