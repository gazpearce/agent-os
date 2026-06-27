import express from 'express';

export default function createVisionRouter(CONTEXT) {
  const router = express.Router();

  router.post('/api/vision/analyze', async (req, res) => {
    const { imgUrl } = req.body;
    if (!imgUrl) return res.status(400).json({ error: 'imgUrl required' });

    try {
      // Free openrouter vision model
      const OR_KEY = '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';
      const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${OR_KEY}\`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Agent OS'
        },
        body: JSON.stringify({
          model: 'google/gemini-1.5-flash',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: 'Describe this image in detail.' },
              { type: 'image_url', image_url: { url: imgUrl } }
            ]
          }],
          max_tokens: 512
        })
      });

      const data = await openRouterRes.json();
      res.json({ analysis: data.choices?.[0]?.message?.content || 'No analysis available' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
