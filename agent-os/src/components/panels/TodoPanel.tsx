import { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function TodoPanel() {
  const [todos, setTodos] = useState<any[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchTodos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/todos');
      if (res.ok) {
        const data = await res.json();
        setTodos(data.todos || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveTodos = async (updatedTodos: any[]) => {
    setTodos(updatedTodos);
    try {
      await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todos: updatedTodos }),
      });
    } catch (e) {
      console.error('Failed to save todos:', e);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const addTodo = () => {
    if (!newTodo.trim()) return;
    const updated = [...todos, { id: `t-${Date.now()}`, text: newTodo, done: false, priority: 'medium' }];
    saveTodos(updated);
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    const updated = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    saveTodos(updated);
  };

  const deleteTodo = (id: string) => {
    const updated = todos.filter(t => t.id !== id);
    saveTodos(updated);
  };

  const priorityColor: Record<string, string> = { high: 'text-red-400', medium: 'text-yellow-400', low: 'text-gray-400' };

  return (
    <div className="space-y-2">
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
        <CheckCircle2 size={10} className="text-green-400" /> Todo List {loading && "⏳"}
      </div>
      <div className="flex gap-1.5">
        <input 
          value={newTodo} 
          onChange={e => setNewTodo(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && addTodo()} 
          placeholder="New todo..." 
          className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-green-500/30" 
        />
        <button onClick={addTodo} className="px-2.5 py-1.5 rounded-lg bg-green-600/80 hover:bg-green-500 text-white text-[10px] font-medium cursor-pointer">+</button>
      </div>
      <div className="space-y-1 max-h-36 overflow-y-auto">
        {todos.map(t => (
          <div key={t.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] ${t.done ? 'bg-white/[0.01] border-white/[0.02] opacity-50' : 'bg-white/[0.015] border-white/[0.03]'}`}>
            <button onClick={() => toggleTodo(t.id)} className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 cursor-pointer ${t.done ? 'bg-green-500/30 border-green-500/50 text-green-400' : 'border-white/10'}`}>
              {t.done && '✓'}
            </button>
            <span className={`flex-1 truncate ${t.done ? 'line-through text-gray-500' : 'text-gray-300'}`}>{t.text}</span>
            <span className={`text-[7px] uppercase font-bold ${priorityColor[t.priority]}`}>{t.priority}</span>
            <button onClick={() => deleteTodo(t.id)} className="text-gray-600 hover:text-red-400 cursor-pointer text-[10px]">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
