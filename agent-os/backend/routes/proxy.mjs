import express from 'express';
import fetch from 'node-fetch';

export default function createProxyRouter(CONTEXT) {
  const router = express.Router();

  router.post('/api/proxy', async (req, res) => {
    const { url, method = 'GET', headers = {}, body } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

    try {
      const options = {
        method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          ...headers
        }
      };
      
      if (body) {
        options.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const raw = await response.text();
      res.json({ raw, status: response.status });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
