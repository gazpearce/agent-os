import express from 'express';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export default function createCronRouter(CONTEXT) {
  const router = express.Router();
  const SHARED = 'D:/Agent OS/shared';
  const CRON_PATH = join(SHARED, 'cron-jobs.json');

  function readCronJobs() {
    try {
      if (existsSync(CRON_PATH)) {
        return JSON.parse(readFileSync(CRON_PATH, 'utf-8'));
      }
    } catch {}
    return [
      { id: '1', name: 'Self Evolution Cycle', expression: '0 0 * * *', active: true, script: 'python shared/trigger_run.py' },
      { id: '2', name: 'Daily Backup', expression: '0 2 * * *', active: false, script: 'npm run backup' }
    ];
  }

  function writeCronJobs(jobs) {
    try {
      writeFileSync(CRON_PATH, JSON.stringify(jobs, null, 2), 'utf-8');
    } catch (e) {
      console.error('Write cron failed:', e.message);
    }
  }

  router.get('/api/cron', (req, res) => {
    res.json({ jobs: readCronJobs() });
  });

  router.post('/api/cron', (req, res) => {
    const { jobs } = req.body;
    if (jobs) {
      writeCronJobs(jobs);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'jobs array required' });
    }
  });

  return router;
}
