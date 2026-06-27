import express from 'express';

export default function createSpotifyRouter(CONTEXT) {
  const router = express.Router();

  router.post('/api/spotify/control', (req, res) => {
    const { action } = req.body;
    if (!action) return res.status(400).json({ error: 'action required' });

    // Mock response for now as Spotify requires OAuth
    res.json({ success: true, track: 'Agent OS LoFi Beats', isPlaying: action === 'play' });
  });

  return router;
}
