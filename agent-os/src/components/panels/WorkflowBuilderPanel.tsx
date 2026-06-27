import { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Save, Bot, Server, Zap } from "lucide-react";
import { useUIStore } from '../../store/useUIStore';

const initialNodes = [
  { id: '1', position: { x: 250, y: 100 }, data: { label: 'Web Scraper Agent' }, style: { background: '#111', color: '#fff', border: '1px solid #3b82f6', borderRadius: '8px', padding: '10px' } },
  { id: '2', position: { x: 250, y: 250 }, data: { label: 'Data Extractor (LLM)' }, style: { background: '#111', color: '#fff', border: '1px solid #8b5cf6', borderRadius: '8px', padding: '10px' } },
  { id: '3', position: { x: 250, y: 400 }, data: { label: 'PostgreSQL Vector DB' }, style: { background: '#111', color: '#fff', border: '1px solid #10b981', borderRadius: '8px', padding: '10px' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#fff' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#fff' } },
];

export default function WorkflowBuilderPanel() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { addToast } = useUIStore();

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#fff' } }, eds)),
    [setEdges]
  );

  const addNode = (type: string) => {
    const newNode = {
      id: Math.random().toString(),
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { label: `New ${type}` },
      style: { background: '#111', color: '#fff', border: '1px solid #6b7280', borderRadius: '8px', padding: '10px' }
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleSave = async () => {
    try {
      addToast('Compiling workflow...', 'info');
      const res = await fetch('http://localhost:3000/api/workflow/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges })
      });
      const data = await res.json();
      if (data.success) {
        addToast(data.message, 'success');
      } else {
        addToast('Compilation failed', 'error');
      }
    } catch (e) {
      addToast('Backend error', 'error');
    }
  };

  const handleRun = async () => {
    try {
      addToast('Triggering workflow...', 'info');
      const res = await fetch('http://localhost:3000/api/workflow/run', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        addToast(data.message, 'success');
      }
    } catch (e) {
      addToast('Execution failed', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center space-x-3">
          <Zap className="text-yellow-400" />
          <h2 className="text-xl font-bold tracking-tight">Workflow Builder</h2>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => addNode('Agent')} className="flex items-center px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-sm transition-colors">
            <Bot size={14} className="mr-2" /> Add Agent
          </button>
          <button onClick={() => addNode('Tool')} className="flex items-center px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-sm transition-colors">
            <Server size={14} className="mr-2" /> Add Tool
          </button>
          <button onClick={handleSave} className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors">
            <Save size={14} className="mr-2" /> Save
          </button>
          <button onClick={handleRun} className="flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-sm transition-colors">
            <Play size={14} className="mr-2" /> Run
          </button>
        </div>
      </div>
      <div className="flex-1 w-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          className="bg-[#050505]"
          colorMode="dark"
        >
          <Controls className="bg-[#111] border border-white/10 fill-white" />
          <MiniMap className="bg-[#111] border border-white/10" maskColor="rgba(0,0,0,0.5)" />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#333" />
        </ReactFlow>
      </div>
    </div>
  );
}
