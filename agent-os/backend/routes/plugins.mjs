import express from 'express';
import { spawn } from 'child_process';
import { join } from 'path';

let mockPluginsDB = [
  { id: 'mcp-github', name: 'GitHub MCP', description: 'Interact with GitHub repositories.', installed: true, version: '1.2.0', author: 'Agent OS Core' },
  { id: 'mcp-seo', name: 'SEO Expert', description: 'Automates SEO optimization and internal linking.', installed: false, version: '2.1.0', author: 'Gary Pearce' },
  { id: 'mcp-postgres', name: 'PostgreSQL MCP', description: 'Connects to a PostgreSQL database securely.', installed: false, version: '0.9.1', author: 'Agent OS Core' }
];

export default function createPluginsRouter(CONTEXT) {
  const router = express.Router();

  router.get('/api/plugins', (req, res) => {
    res.json({ plugins: mockPluginsDB });
  });

  router.post('/api/plugins/install', async (req, res) => {
    const { pluginId } = req.body;
    if (!pluginId) return res.status(400).json({ error: 'pluginId required' });
    
    mockPluginsDB = mockPluginsDB.map(p => p.id === pluginId ? { ...p, installed: true } : p);
    res.json({ success: true, message: \`Successfully installed \${pluginId}\` });
  });

  router.post('/api/plugins/uninstall', async (req, res) => {
    const { pluginId } = req.body;
    if (!pluginId) return res.status(400).json({ error: 'pluginId required' });

    mockPluginsDB = mockPluginsDB.map(p => p.id === pluginId ? { ...p, installed: false } : p);
    res.json({ success: true, message: \`Successfully uninstalled \${pluginId}\` });
  });

  return router;
}
