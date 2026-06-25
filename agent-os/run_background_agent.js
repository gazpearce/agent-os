import { execSync } from 'child_process';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const SHARED = 'D:\\Agent OS\\shared';
const STATE_PATH = join(SHARED, 'background_agent_state.json');

// Initialize state
let state = {
  status: 'initializing',
  lastIntensiveRun: 0,
  lastModelSync: 0,
  idleTimeSeconds: 0,
  activeIntervals: {},
  discoveriesCount: 0,
  logs: []
};

function logMsg(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  state.logs.push(line);
  if (state.logs.length > 50) state.logs.shift();
  saveState();
}

function saveState() {
  try {
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write background agent state:', e.message);
  }
}

// Function to check Windows idle time using the python script we created
function getIdleTime() {
  try {
    const output = execSync('python scratch/check_idle.py', { encoding: 'utf-8' }).trim();
    const secs = parseFloat(output);
    if (!isNaN(secs)) {
      return secs;
    }
  } catch (e) {
    // fallback if python script fails
  }
  return 0;
}

// Simple RSS parser using Regex to avoid external XML dependencies
async function fetchAINews() {
  logMsg('Scanning RSS feeds for new AI models, Chinese LLM releases, and free API providers...');
  try {
    const url = 'https://news.google.com/rss/search?q=LLM+model+release+OR+DeepSeek+OR+Qwen+OR+SiliconFlow+OR+Zhipu+OR+SambaNova+OR+Cerebras+OR+HuggingFace+OR+OpenRouter&hl=en-US&gl=US&ceid=US:en';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    
    // Find all <item> tags
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    const newsList = [];
    for (const item of items.slice(0, 10)) {
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      
      if (titleMatch && linkMatch) {
        newsList.push({
          title: titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1'),
          link: linkMatch[1],
          date: pubDateMatch ? pubDateMatch[1] : ''
        });
      }
    }
    return newsList;
  } catch (err) {
    logMsg(`News RSS scan warning: ${err.message}`);
    return [];
  }
}

// Trigger intensive scanning via server API endpoints
async function triggerIntensiveCycle() {
  logMsg('Waking up! Running intensive research and evolution cycle...');
  state.status = 'researching';
  saveState();

  try {
    // 1. Fetch AI news
    const news = await fetchAINews();
    if (news.length > 0) {
      logMsg(`Discovered ${news.length} AI news headlines. Ingesting into memory...`);
      // Ingest the headlines into semantic memory
      for (const item of news) {
        try {
          await fetch('http://localhost:3001/api/memories/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `AI News Release: ${item.title} - Source URL: ${item.link}`,
              source_type: 'rss_news',
              source_id: item.link
            })
          });
        } catch (_) {}
      }
    }

    // 2. Trigger YouTube watcher
    logMsg('Triggering YouTube channel watcher scan...');
    try {
      await fetch('http://localhost:3001/api/crons/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Julian Goldie Watcher' })
      });
    } catch (e) {
      logMsg(`Watcher trigger error: ${e.message}`);
    }

    // 3. Trigger Model Catalog & Evolution Scanner
    logMsg('Triggering Model Catalog & Evolution Scanner...');
    try {
      await fetch('http://localhost:3001/api/crons/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Model Catalog & Evolution Scanner' })
      });
    } catch (e) {
      logMsg(`Scanner trigger error: ${e.message}`);
    }

    // 4. Trigger Wishlist Scan
    logMsg('Triggering Self-Improvement Wishlist scan...');
    try {
      await fetch('http://localhost:3001/api/wishlist/scan', {
        method: 'POST'
      });
    } catch (e) {
      logMsg(`Wishlist trigger error: ${e.message}`);
    }

    // 5. Try self-evolution upgrade
    logMsg('Checking if auto-evolution upgrades can be applied...');
    try {
      // In a real run, this is handled by the auto-evolution engine or we can trigger it
      await fetch('http://localhost:3001/api/crons/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Swarm Auto-Evolution Engine' })
      });
    } catch (e) {
      logMsg(`Evolution engine trigger error: ${e.message}`);
    }

    state.lastIntensiveRun = Date.now();
    logMsg('Intensive research and evolution cycle completed successfully.');
  } catch (err) {
    logMsg(`Intensive research run error: ${err.message}`);
  } finally {
    state.status = 'idle-active';
    saveState();
  }
}

// Trigger lightweight/passive scans
async function runPassiveChecks() {
  logMsg('Running lightweight passive check (syncing models list)...');
  try {
    await fetch('http://localhost:3001/api/diagnostics/sync-models', { method: 'POST' });
    state.lastModelSync = Date.now();
  } catch (e) {
    logMsg(`Sync models passive error: ${e.message}`);
  }
}

// Main autonomous loop running 24/7
async function main() {
  logMsg('24/7 Background Research & Self-Evolution Daemon started.');
  
  // Wait a short time on startup for the server to fully initialize
  await new Promise(resolve => setTimeout(resolve, 10000));

  while (true) {
    try {
      const idleSecs = getIdleTime();
      state.idleTimeSeconds = Math.round(idleSecs);
      
      const isSystemIdle = idleSecs >= 1800; // 30 minutes idle threshold
      const isNightlyWindow = new Date().getHours() >= 1 && new Date().getHours() < 6;
      
      // Intensive run should execute if either:
      // 1. The system is idle (>30 mins) AND last run was > 4 hours ago.
      // 2. It is the nightly window AND last run was > 4 hours ago.
      const timeSinceLastRun = Date.now() - state.lastIntensiveRun;
      const shouldRunIntensive = (isSystemIdle || isNightlyWindow) && timeSinceLastRun > 4 * 60 * 60 * 1000;

      if (shouldRunIntensive) {
        logMsg(`Triggering intensive scan. Reason: ${isSystemIdle ? 'Idle mode active' : 'Nightly learning window active'}.`);
        await triggerIntensiveCycle();
      } else {
        // Passive monitoring mode
        state.status = isSystemIdle ? 'idle-passive' : 'user-active';
        saveState();
        
        // Every 2 hours, run a passive model catalog sync even if user is active
        const timeSinceLastModelSync = Date.now() - state.lastModelSync;
        if (timeSinceLastModelSync > 2 * 60 * 60 * 1000) {
          await runPassiveChecks();
        }
      }
    } catch (err) {
      logMsg(`Error in main background agent loop: ${err.message}`);
    }

    // Sleep for 60 seconds
    await new Promise(resolve => setTimeout(resolve, 60000));
  }
}

main();
