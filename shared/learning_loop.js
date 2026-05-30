import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const SHARED = 'D:/Agent OS/shared';
const ERROR_VAULT = join(SHARED, 'error_vault');
const KNOWLEDGE_BASE = join(SHARED, 'knowledge_base');
const GUIDE_PATH = join(SHARED, 'AGENTS_GUIDE.md');
const SYSTEM_PROMPT_PATH = join(SHARED, 'hermes_system_prompt.txt');

function run() {
  console.log('Starting learning loop...');
  
  let learnedRules = [];
  
  // Parse error vault
  if (existsSync(ERROR_VAULT)) {
    try {
      const files = readdirSync(ERROR_VAULT).filter(f => f.endsWith('.md'));
      for (const f of files) {
        const content = readFileSync(join(ERROR_VAULT, f), 'utf-8');
        const lines = content.split('\n');
        const title = lines.find(l => l.startsWith('# '))?.replace('# ', '').trim() || f;
        
        // Extract solution section
        let solution = '';
        let capturing = false;
        for (const line of lines) {
          if (line.startsWith('## Solution') || line.startsWith('## Root Cause') || line.startsWith('### Solution')) {
            capturing = true;
            solution += line + '\n';
          } else if (line.startsWith('#') && capturing && !line.startsWith('## Solution') && !line.startsWith('## Root Cause') && !line.startsWith('###')) {
            capturing = false;
          } else if (capturing) {
            solution += line + '\n';
          }
        }
        if (!solution) {
          solution = lines.slice(2, 8).join('\n'); // fallback first few lines
        }
        learnedRules.push({ type: 'Error Fix', title, content: solution.trim() });
      }
    } catch (e) {
      console.error('Error reading error_vault:', e.message);
    }
  }

  // Parse knowledge base
  if (existsSync(KNOWLEDGE_BASE)) {
    try {
      const files = readdirSync(KNOWLEDGE_BASE).filter(f => f.endsWith('.md'));
      for (const f of files) {
        const content = readFileSync(join(KNOWLEDGE_BASE, f), 'utf-8');
        const lines = content.split('\n');
        const title = lines.find(l => l.startsWith('# '))?.replace('# ', '').trim() || f;
        
        let details = '';
        let capturing = false;
        for (const line of lines) {
          if (line.startsWith('## Critical Fixes') || line.startsWith('## Context') || line.startsWith('## Implementation Details')) {
            capturing = true;
            details += line + '\n';
          } else if (line.startsWith('#') && capturing && !line.startsWith('## Critical Fixes') && !line.startsWith('## Context') && !line.startsWith('## Implementation Details') && !line.startsWith('###')) {
            capturing = false;
          } else if (capturing) {
            details += line + '\n';
          }
        }
        if (!details) {
          details = lines.slice(2, 8).join('\n');
        }
        learnedRules.push({ type: 'Knowledge Setup', title, content: details.trim() });
      }
    } catch (e) {
      console.error('Error reading knowledge_base:', e.message);
    }
  }

  // Format into markdown
  let mdSection = `\n## 5. Swarm Memory & Dynamic Rules (Auto-Learned)\n\n`;
  if (learnedRules.length === 0) {
    mdSection += `No learned rules compiled yet. Swarm is in early learning phase.\n`;
  } else {
    for (const rule of learnedRules) {
      mdSection += `### 💡 [${rule.type}] ${rule.title}\n\n`;
      mdSection += `${rule.content}\n\n`;
      mdSection += `---\n\n`;
    }
  }

  // Update AGENTS_GUIDE.md
  if (existsSync(GUIDE_PATH)) {
    try {
      let guideContent = readFileSync(GUIDE_PATH, 'utf-8');
      const markerIdx = guideContent.indexOf('## 5. Swarm Memory & Dynamic Rules');
      if (markerIdx !== -1) {
        guideContent = guideContent.substring(0, markerIdx).trim() + '\n' + mdSection.trim();
      } else {
        guideContent = guideContent.trim() + '\n\n' + mdSection.trim();
      }
      writeFileSync(GUIDE_PATH, guideContent, 'utf-8');
      console.log('Updated AGENTS_GUIDE.md');
    } catch (e) {
      console.error('Failed to write AGENTS_GUIDE.md:', e.message);
    }
  }

  // Format short prompt bullet points for system prompt
  let promptBullets = `\n\n### # Dynamic Learned Rules (DO NOT IGNORE):\n`;
  if (learnedRules.length === 0) {
    promptBullets += `* No specific dynamic rules yet. Continue scanning vault.\n`;
  } else {
    for (const rule of learnedRules) {
      // Create concise bullet point summary of the rules
      let brief = '';
      if (rule.title.includes('Win32 NoConsoleScreenBufferError')) {
        brief = 'Win32 NoConsoleScreenBufferError: Avoid running CLI tools in background shell redirections directly. Use start cmd.exe or PowerShell start-process window instead.';
      } else if (rule.title.includes('VitePress Schema')) {
        brief = 'VitePress Metadata: Inject JSON-LD & OG tags dynamically using transformHead hook. Avoid double prefixing URL posts/ slug. Wrap descriptions containing colons in quotes.';
      } else {
        brief = rule.content.replace(/\r?\n/g, ' ').substring(0, 150) + '...';
      }
      promptBullets += `* **${rule.title}**: ${brief}\n`;
    }
  }

  // Update hermes_system_prompt.txt
  if (existsSync(SYSTEM_PROMPT_PATH)) {
    try {
      let promptContent = readFileSync(SYSTEM_PROMPT_PATH, 'utf-8');
      const markerIdx = promptContent.indexOf('### # Dynamic Learned Rules');
      if (markerIdx !== -1) {
        promptContent = promptContent.substring(0, markerIdx).trim() + promptBullets;
      } else {
        promptContent = promptContent.trim() + promptBullets;
      }
      writeFileSync(SYSTEM_PROMPT_PATH, promptContent, 'utf-8');
      console.log('Updated hermes_system_prompt.txt');
    } catch (e) {
      console.error('Failed to write hermes_system_prompt.txt:', e.message);
    }
  }
  
  console.log('Learning loop complete!');
}

run();
