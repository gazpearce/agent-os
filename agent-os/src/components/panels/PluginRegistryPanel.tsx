import { useState, useEffect } from "react";
import { Server, Download, Trash2, RefreshCw, Box, Shield, ExternalLink } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

const mockPlugins = [
  { id: 'mcp-github', name: 'GitHub MCP', description: 'Interact with GitHub repositories, issues, and PRs.', installed: true, version: '1.2.0', author: 'Agent OS Core' },
  { id: 'mcp-postgres', name: 'PostgreSQL MCP', description: 'Direct database access and schema introspection.', installed: true, version: '0.9.1', author: 'Agent OS Core' },
  { id: 'mcp-linear', name: 'Linear MCP', description: 'Create and manage Linear issues automatically.', installed: false, version: '1.0.5', author: 'Community' },
  { id: 'skill-seo', name: 'SEO Expert', description: 'Automated on-page and off-page SEO optimization workflows.', installed: true, version: '2.1.0', author: 'Gary Pearce' },
  { id: 'skill-social', name: 'Social Syndicator', description: 'Auto-publish to Twitter, LinkedIn, and Reddit.', installed: false, version: '1.0.0', author: 'Community' },
];

export default function PluginRegistryPanel() {
  const [plugins, setPlugins] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const { addToast } = useUIStore();

  const fetchPlugins = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/plugins');
      const data = await res.json();
      if (data.plugins) setPlugins(data.plugins);
    } catch (e) {
      addToast('Failed to fetch plugins', 'error');
    }
  };

  useEffect(() => { fetchPlugins(); }, []);

  const toggleInstall = async (id: string, currentlyInstalled: boolean) => {
    try {
      const endpoint = currentlyInstalled ? '/api/plugins/uninstall' : '/api/plugins/install';
      const res = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pluginId: id })
      });
      const data = await res.json();
      if (data.success) {
        addToast(data.message, 'success');
        fetchPlugins();
      } else {
        addToast(data.error || 'Operation failed', 'error');
      }
    } catch (e) {
      addToast('Network error', 'error');
    }
  };

  const filtered = plugins.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center space-x-3">
          <Server className="text-emerald-400" />
          <h2 className="text-xl font-bold tracking-tight">Plugin & MCP Registry</h2>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => addToast('Registry refreshed', 'success')} className="flex items-center px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-sm transition-colors">
            <RefreshCw size={14} className="mr-2" /> Refresh
          </button>
        </div>
      </div>
      
      <div className="p-6 overflow-y-auto flex-1">
        <div className="mb-6 flex justify-between items-center">
          <p className="text-white/60 text-sm">Discover and install Model Context Protocol (MCP) servers and specialized Skills.</p>
          <input 
            type="text" 
            placeholder="Search plugins..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm w-64 focus:outline-none focus:border-white/20"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(plugin => (
            <div key={plugin.id} className="bg-[#111] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/5 rounded-lg">
                    {plugin.id.startsWith('mcp') ? <Server size={20} className="text-blue-400"/> : <Box size={20} className="text-purple-400"/>}
                  </div>
                  <div>
                    <h3 className="font-semibold">{plugin.name}</h3>
                    <p className="text-xs text-white/40 font-mono">v{plugin.version} • {plugin.author}</p>
                  </div>
                </div>
                {plugin.author === 'Agent OS Core' && <Shield size={14} className="text-emerald-500" />}
              </div>
              
              <p className="text-sm text-white/60 mb-6 flex-1">{plugin.description}</p>
              
              <div className="flex justify-between items-center mt-auto pt-4 border-t border-white/5">
                <button className="text-xs text-white/40 hover:text-white flex items-center transition-colors">
                  <ExternalLink size={12} className="mr-1" /> Docs
                </button>
                <button 
                  onClick={() => toggleInstall(plugin.id, plugin.installed)}
                  className={`flex items-center px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                    plugin.installed 
                      ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                      : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  {plugin.installed ? <><Trash2 size={12} className="mr-1.5" /> Uninstall</> : <><Download size={12} className="mr-1.5" /> Install</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
