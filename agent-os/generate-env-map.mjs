import { writeFileSync, existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import os from 'os';

const WORKSPACE = 'D:\\Agent OS';
const SHARED = join(WORKSPACE, 'shared');
const MAP_PATH = join(SHARED, 'environment_map.md');

function getDirectoryTree(dir, depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return '... (max depth reached)\n';
  let result = '';
  try {
    const items = readdirSync(dir);
    for (const item of items) {
      if (['node_modules', '.git', 'dist', 'build', '.openclaw', '.fcc', 'cache', 'node_modules_backup'].includes(item)) continue;
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      const indent = '  '.repeat(depth);
      if (stat.isDirectory()) {
        result += `${indent}- 📁 **${item}/**\n`;
        result += getDirectoryTree(fullPath, depth + 1, maxDepth);
      } else {
        result += `${indent}- 📄 ${item} (${(stat.size / 1024).toFixed(1)} KB)\n`;
      }
    }
  } catch (e) {
    result += `Error reading directory: ${e.message}\n`;
  }
  return result;
}

function getSystemInfo() {
  return `### 💻 System Specifications
- **Operating System**: ${os.type()} (${os.platform()} - ${os.arch()})
- **Release**: ${os.release()}
- **CPU Cores**: ${os.cpus().length}
- **Total Memory**: ${(os.totalmem() / (1024 * 1024 * 1024)).toFixed(2)} GB
- **Free Memory**: ${(os.freemem() / (1024 * 1024 * 1024)).toFixed(2)} GB
- **System Uptime**: ${(os.uptime() / 3600).toFixed(2)} hours
`;
}

function getPackageDeps() {
  const pkgPath = join(WORKSPACE, 'agent-os', 'package.json');
  if (!existsSync(pkgPath)) return '`package.json` not found.';
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const deps = Object.keys(pkg.dependencies || {}).map(d => `- **${d}**: ${pkg.dependencies[d]}`).join('\n');
    const devDeps = Object.keys(pkg.devDependencies || {}).map(d => `- **${d}**: ${pkg.devDependencies[d]}`).join('\n');
    return `### 📦 Project Dependencies
#### Dependencies
${deps || 'None'}

#### Dev Dependencies
${devDeps || 'None'}
`;
  } catch (e) {
    return `Failed to parse package.json: ${e.message}`;
  }
}

function getAPIEndpoints() {
  return `### 🌐 Active API Endpoints (server.mjs)
- **GET** \`/api/status\` - Retreives server health & diagnostic metrics.
- **GET** \`/api/agents\` - Retreives active agent configurations & status.
- **POST** \`/api/chat\` - Primary chat route routing message arrays through provider APIs.
- **POST** \`/api/agents/message\` - Direct agent-to-agent message transport.
- **GET** \`/api/skills\` - Lists configured dynamic capabilities & directory structures.
- **GET** \`/api/db-tasks\` - Retrieves task listings from the SQLite backend.
`;
}

function generateMap() {
  console.log('Generating environment map...');
  const systemInfo = getSystemInfo();
  const tree = getDirectoryTree(join(WORKSPACE, 'agent-os'));
  const deps = getPackageDeps();
  const endpoints = getAPIEndpoints();

  const markdownContent = `# Agent OS Environment Map

This document is generated automatically to provide a structured map of the Agent OS environment for context sharing.

---

${systemInfo}

---

${endpoints}

---

${deps}

---

### 📂 Directory Structure (D:\\Agent OS\\agent-os)
${tree}

---
*Generated on: ${new Date().toLocaleString()}*
`;

  writeFileSync(MAP_PATH, markdownContent, 'utf-8');
  console.log(`Environment map written to: ${MAP_PATH}`);
}

generateMap();
