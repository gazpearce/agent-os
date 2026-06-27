import { useState, useEffect } from "react";
import { Target, Plus, FileText } from "lucide-react";

export default function GoalsPanel() {
  const [goals, setGoals] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedGoalContent, setSelectedGoalContent] = useState<string | null>(null);

  const fetchGoals = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/goals');
      const data = await res.json();
      if (data.goals) setGoals(data.goals);
    } catch (e) {}
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreate = async () => {
    if (!newTitle || !newContent) return;
    try {
      await fetch('http://localhost:3000/api/goals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, content: newContent })
      });
      setIsCreating(false);
      setNewTitle("");
      setNewContent("");
      fetchGoals();
    } catch (e) {}
  };

  const loadGoal = async (filename: string) => {
    try {
      const res = await fetch(`http://localhost:3000/api/goals/content?file=${filename}`);
      const data = await res.json();
      setSelectedGoalContent(data.content);
    } catch (e) {}
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center space-x-3">
          <Target className="text-blue-400" />
          <h2 className="text-xl font-bold tracking-tight">Global Swarm Goals</h2>
        </div>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
        >
          <Plus size={16} /> <span>New Goal</span>
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar List */}
        <div className="w-1/3 border-r border-white/5 overflow-y-auto p-4 space-y-2 bg-[#111]">
          {isCreating && (
            <div className="bg-black border border-blue-500/30 p-3 rounded-lg mb-4">
              <input 
                type="text" 
                placeholder="Goal Title..." 
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full bg-transparent border-b border-white/20 pb-1 text-sm outline-none mb-3 focus:border-blue-400"
              />
              <textarea 
                placeholder="Primary directive details..." 
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                className="w-full bg-transparent border border-white/10 rounded p-2 text-xs outline-none h-24 mb-2 focus:border-blue-400"
              />
              <div className="flex justify-end space-x-2">
                <button onClick={() => setIsCreating(false)} className="text-xs text-white/50 hover:text-white">Cancel</button>
                <button onClick={handleCreate} className="text-xs bg-blue-600 px-2 py-1 rounded text-white hover:bg-blue-500">Save</button>
              </div>
            </div>
          )}

          {goals.map((goal, idx) => (
            <div 
              key={idx}
              onClick={() => loadGoal(goal.filename)}
              className="p-3 border border-white/5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <h4 className="text-sm font-semibold text-white/90 truncate">{goal.title}</h4>
              <p className="text-xs text-white/50 mt-1">{goal.date}</p>
            </div>
          ))}
          {goals.length === 0 && !isCreating && (
            <div className="text-center text-white/30 text-sm mt-10">No active goals found.</div>
          )}
        </div>

        {/* Content Area */}
        <div className="w-2/3 p-6 overflow-y-auto bg-black">
          {selectedGoalContent ? (
            <div className="prose prose-invert max-w-none text-sm whitespace-pre-wrap font-mono">
              {selectedGoalContent}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white/20">
              <FileText size={48} className="mb-4 opacity-50" />
              <p>Select a goal to view the primary directive.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
