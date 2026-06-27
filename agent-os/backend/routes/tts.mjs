import express from 'express';

export default function createTTSRouter(CONTEXT) {
  const router = express.Router();

  router.post('/api/tts', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    try {
      // Free Google Translate TTS endpoint as a quick working solution
      const url = \`https://translate.google.com/translate_tts?ie=UTF-8&q=\${encodeURIComponent(text)}&tl=en&client=tw-ob\`;
      res.json({ audioUrl: url });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
