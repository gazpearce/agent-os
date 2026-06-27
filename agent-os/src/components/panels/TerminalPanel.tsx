import React, { useState, useRef, useEffect } from "react";
import { Terminal as TerminalIcon, Play, Loader2, Command } from "lucide-react";

export default function TerminalPanel() {
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<{type: 'input' | 'output' | 'error', text: string}[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const executeCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isRunning) return;

    const cmdToRun = command;
    setCommand("");
    setHistory(prev => [...prev, { type: 'input', text: `$ ${cmdToRun}` }]);
    setIsRunning(true);

    try {
      const res = await fetch('http://localhost:3000/api/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmdToRun })
      });
      const data = await res.json();
      
      if (data.error) {
        setHistory(prev => [...prev, { type: 'error', text: data.error }]);
      } else {
        if (data.stdout) setHistory(prev => [...prev, { type: 'output', text: data.stdout }]);
        if (data.stderr) setHistory(prev => [...prev, { type: 'error', text: data.stderr }]);
        if (!data.stdout && !data.stderr) setHistory(prev => [...prev, { type: 'output', text: `[Process completed with exit code ${data.exitCode}]` }]);
      }
    } catch (e: any) {
      setHistory(prev => [...prev, { type: 'error', text: e.message }]);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center space-x-3">
          <TerminalIcon className="text-emerald-400" />
          <h2 className="text-xl font-bold tracking-tight">Code Execution Sandbox</h2>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto font-mono text-sm space-y-2">
        <div className="text-emerald-500/70 mb-4">
          Agent OS Secure Execution Environment initialized. Type 'help' for commands.
        </div>
        
        {history.map((item, i) => (
          <div key={i} className={`whitespace-pre-wrap ${
            item.type === 'input' ? 'text-emerald-400 font-bold' :
            item.type === 'error' ? 'text-red-400' :
            'text-white/80'
          }`}>
            {item.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-white/5 bg-[#111]">
        <form onSubmit={executeCommand} className="flex items-center space-x-2">
          <Command className="text-white/40" size={16} />
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={isRunning}
            placeholder="Enter OS command to execute..."
            className="flex-1 bg-transparent border-none focus:outline-none text-white font-mono text-sm"
            autoFocus
          />
          <button type="submit" disabled={isRunning || !command.trim()} className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors">
            {isRunning ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
