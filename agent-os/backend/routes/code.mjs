import express from 'express';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import os from 'os';

export default function createCodeRouter(CONTEXT) {
  const router = express.Router();

  router.post('/api/run-code', async (req, res) => {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ error: 'No code provided' });

    let ext = 'txt';
    let cmd = '';
    if (language === 'python') { ext = 'py'; cmd = 'python'; }
    else if (language === 'javascript') { ext = 'js'; cmd = 'node'; }
    else return res.status(400).json({ error: 'Unsupported language' });

    const tempFile = join(os.tmpdir(), \`agent-os-run-\${Date.now()}.\${ext}\`);
    
    try {
      writeFileSync(tempFile, code, 'utf-8');
      
      const child = spawn(cmd, [tempFile]);
      let output = '';
      let errorOut = '';

      child.stdout.on('data', d => output += d.toString());
      child.stderr.on('data', d => errorOut += d.toString());

      child.on('close', code => {
        try { unlinkSync(tempFile); } catch {}
        res.json({ output: output.trim() || errorOut.trim(), error: errorOut.trim() ? errorOut.trim() : null });
      });

      child.on('error', err => {
        try { unlinkSync(tempFile); } catch {}
        res.status(500).json({ error: err.message });
      });

    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
