import express from 'express';
export default function createTeamsRouter(CONTEXT) {
  const router = express.Router();
  const {
    db,
    aionuiDb,
    logSwarmActivity,
    writeDbErrorToVault,
    chatCompletion,
    sendToClients,
    AGENTS,
    activeSessions,
    getOrCreateConversation,
    saveChatMessage,
    executeSwarmInBackground
  } = CONTEXT;
  router.get('/api/teams', async (req, res) => {
    try {
      if (!aionuiDb) return res.json([]);
      // Check if teams table exists
      const tableCheck = aionuiDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='teams';").get();
      if (!tableCheck) {
        // Create table if missing
        aionuiDb.prepare("CREATE TABLE teams (id TEXT PRIMARY KEY, name TEXT, status TEXT, lead TEXT, agents INTEGER, workspace TEXT)").run();
        // Insert mock data
        const stmt = aionuiDb.prepare("INSERT INTO teams (id, name, status, lead, agents, workspace) VALUES (?, ?, ?, ?, ?, ?)");
        stmt.run('t1', 'Content Creation Team', 'active', 'hermes', 3, 'shared');
        stmt.run('t2', 'Backend Services Team', 'idle', 'obsidian', 2, 'agent-os');
      }
      
      const rows = aionuiDb.prepare('SELECT * FROM teams').all();
      res.json(rows);
    } catch (e) {
      res.json([]);
    }
  });
  return router;
}