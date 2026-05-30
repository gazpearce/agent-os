const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * OWL - Agent OS V2 Swarm
 * Directory Size Lister
 * Goal: List the directory size of D:/Agent OS/shared
 */

const TARGET_DIR = 'D:/Agent OS/shared';

function getDirectorySize(dirPath) {
  let totalSize = 0;
  let fileCount = 0;
  let dirCount = 0;

  try {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        dirCount++;
        const subDir = getDirectorySize(fullPath);
        totalSize += subDir.size;
        fileCount += subDir.files;
        dirCount += subDir.dirs;
      } else {
        fileCount++;
        totalSize += stats.size;
      }
    }
  } catch (err) {
    console.error(`✗ Error reading ${dirPath}: ${err.message}`);
  }

  return { size: totalSize, files: fileCount, dirs: dirCount };
}

function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// ---- Main Execution ----
console.log('=== OWL Directory Size Lister ===');
console.log(`Target: ${TARGET_DIR}\n`);

try {
  if (!fs.existsSync(TARGET_DIR)) {
    console.error(`✗ Directory not found: ${TARGET_DIR}`);
    process.exit(1);
  }

  const stats = fs.statSync(TARGET_DIR);

  if (!stats.isDirectory()) {
    console.error(`✗ Path is not a directory: ${TARGET_DIR}`);
    process.exit(1);
  }

  console.log('Scanning...');

  const result = getDirectorySize(TARGET_DIR);

  console.log('\n--- Results ---');
  console.log(`Total Size: ${formatSize(result.size)}`);
  console.log(`Files: ${result.files}`);
  console.log(`Subdirectories: ${result.dirs}`);
  console.log('---------------');
} catch (err) {
  console.error(`✗ Fatal error: ${err.message}`);
}

// ---- Cross-platform fallback using native commands ----
try {
  console.log('\n--- Native Command Fallback ---');
  const isWindows = process.platform === 'win32';

  if (isWindows) {
    const psSize = execSync(
      `(Get-ChildItem -Path "${TARGET_DIR}" -Recurse -Force | Measure-Object -Property Length -Sum).Sum`,
      { encoding: 'utf8', shell: 'powershell.exe' }
    ).trim();
    const psCount = execSync(
      `(Get-ChildItem -Path "${TARGET_DIR}" -Recurse -Force).Count`,
      { encoding: 'utf8', shell: 'powershell.exe' }
    ).trim();

    console.log(`PowerShell Total Size: ${formatSize(parseInt(psSize))}`);
    console.log(`PowerShell Total Items: ${psCount}`);
  } else {
    const duOutput = execSync(`du -sh "${TARGET_DIR}"`, { encoding: 'utf8' }).trim();
    const findCount = execSync(`find "${TARGET_DIR}" -type f | wc -l`, { encoding: 'utf8' }).trim();

    console.log(`du -sh: ${duOutput}`);
    console.log(`Total Files: ${findCount}`);
  }
} catch (err) {
  console.error(`✗ Native command fallback error: ${err.message}`);
}

console.log('\n=== OWL Directory Size Lister — Complete ===');
