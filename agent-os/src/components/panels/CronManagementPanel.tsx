import { useState, useEffect } from 'react';
import { Clock, Play, Plus, Save, Trash2 } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export default function CronManagementPanel() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { addToast } = useUIStore();

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/cron');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (e) {
      console.error(e);
      addToast('Failed to load cron jobs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const saveJobs = async (updatedJobs: any[]) => {
    setJobs(updatedJobs);
    try {
      await fetch('http://localhost:3000/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs: updatedJobs }),
      });
      addToast('Cron jobs saved successfully', 'success');
    } catch (e) {
      console.error(e);
      addToast('Failed to save cron jobs', 'error');
    }
  };

  const addJob = () => {
    saveJobs([...jobs, { id: `c-${Date.now()}`, name: 'New Cron Job', expression: '0 0 * * *', active: false, script: '' }]);
  };

  const updateJob = (id: string, field: string, value: any) => {
    saveJobs(jobs.map(j => j.id === id ? { ...j, [field]: value } : j));
  };

  const deleteJob = (id: string) => {
    saveJobs(jobs.filter(j => j.id !== id));
  };

  const toggleJob = (id: string) => {
    const job = jobs.find(j => j.id === id);
    if (job) updateJob(id, 'active', !job.active);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-gradient-to-r from-indigo-900/20 to-purple-900/20">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Clock className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Background Agent Scheduler</h2>
            <p className="text-xs text-white/50">Manage CRON intervals and automated agent tasks</p>
          </div>
        </div>
        <button onClick={addJob} className="flex items-center px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg text-sm transition-colors border border-indigo-500/30">
          <Plus size={16} className="mr-2" /> Add Job
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {loading && <div className="text-white/50 text-sm">Loading schedules...</div>}
        {!loading && jobs.map(job => (
          <div key={job.id} className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col space-y-4 hover:border-white/20 transition-all">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-4">
                <button onClick={() => toggleJob(job.id)} className={`p-2 rounded-lg border ${job.active ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-white/30'}`}>
                  <Play size={18} className={job.active ? 'opacity-100' : 'opacity-50'} fill={job.active ? 'currentColor' : 'none'} />
                </button>
                <div>
                  <input 
                    type="text" 
                    value={job.name} 
                    onChange={e => updateJob(job.id, 'name', e.target.value)}
                    className="bg-transparent border-none focus:outline-none text-lg font-semibold text-white/90 placeholder-white/30 w-64"
                    placeholder="Job Name"
                  />
                </div>
              </div>
              <button onClick={() => deleteJob(job.id)} className="p-1.5 hover:bg-red-500/20 text-red-400/50 hover:text-red-400 rounded transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase text-white/40 font-bold mb-1 ml-1">CRON Expression</label>
                <input 
                  type="text" 
                  value={job.expression} 
                  onChange={e => updateJob(job.id, 'expression', e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:border-indigo-500/50 focus:outline-none"
                  placeholder="0 0 * * *"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-white/40 font-bold mb-1 ml-1">Execution Command</label>
                <input 
                  type="text" 
                  value={job.script} 
                  onChange={e => updateJob(job.id, 'script', e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:border-indigo-500/50 focus:outline-none"
                  placeholder="python script.py"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}