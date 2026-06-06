import { spawn } from 'child_process';
import { writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import os from 'os';

const logFile = join(os.tmpdir(), 'computer_use_mcp.log');
function log(msg) {
  try {
    writeFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`, { flag: 'a' });
  } catch {}
}

log('Starting updated Computer Use MCP Server with temporary file execution');

function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    const tempFile = join(os.tmpdir(), `mcp_ps_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.ps1`);
    try {
      writeFileSync(tempFile, '\ufeff' + script, 'utf8'); // Write UTF-8 with BOM
      
      const ps = spawn('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', tempFile], { shell: true });
      let stdout = '';
      let stderr = '';
      
      ps.stdout.on('data', (data) => stdout += data.toString());
      ps.stderr.on('data', (data) => stderr += data.toString());
      
      ps.on('close', (code) => {
        try { unlinkSync(tempFile); } catch {}
        if (code === 0) resolve(stdout.trim());
        else reject(new Error(stderr.trim() || `PowerShell exited with code ${code}`));
      });
    } catch (err) {
      try { unlinkSync(tempFile); } catch {}
      reject(err);
    }
  });
}

const tools = [
  {
    name: 'mouse_move',
    description: 'Moves the mouse cursor to a specific (x, y) coordinate on the screen.',
    inputSchema: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'The X coordinate' },
        y: { type: 'number', description: 'The Y coordinate' }
      },
      required: ['x', 'y']
    }
  },
  {
    name: 'mouse_click',
    description: 'Performs a mouse click (left, right, or double click) at the current position or optional coordinates.',
    inputSchema: {
      type: 'object',
      properties: {
        button: { type: 'string', enum: ['left', 'right', 'double'], default: 'left', description: 'Type of click to perform' },
        x: { type: 'number', description: 'Optional X coordinate' },
        y: { type: 'number', description: 'Optional Y coordinate' }
      }
    }
  },
  {
    name: 'keyboard_type',
    description: 'Types text into the active window.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The text to type' }
      },
      required: ['text']
    }
  },
  {
    name: 'take_screenshot',
    description: 'Takes a screenshot of the primary screen and returns the file path.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

async function handleToolCall(name, args) {
  log(`Handling tool call: ${name} with args: ${JSON.stringify(args)}`);
  
  if (name === 'mouse_move') {
    const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32Mouse {
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
}
"@
[Win32Mouse]::SetCursorPos(${args.x}, ${args.y})
    `;
    await runPowerShell(script);
    return { content: [{ type: 'text', text: `Moved mouse to (${args.x}, ${args.y})` }] };
  }
  
  if (name === 'mouse_click') {
    let script = '';
    if (args.x !== undefined && args.y !== undefined) {
      script += `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32Mouse {
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
}
"@
[Win32Mouse]::SetCursorPos(${args.x}, ${args.y})
Start-Sleep -Milliseconds 150
      `;
    }
    
    script += `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32Click {
    [DllImport("user32.dll")]
    public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
}
"@
    `;
    
    if (args.button === 'right') {
      script += `
[Win32Click]::mouse_event(0x0008, 0, 0, 0, 0) # Right down
[Win32Click]::mouse_event(0x0010, 0, 0, 0, 0) # Right up
      `;
    } else if (args.button === 'double') {
      script += `
[Win32Click]::mouse_event(0x0002, 0, 0, 0, 0) # Left down
[Win32Click]::mouse_event(0x0004, 0, 0, 0, 0) # Left up
Start-Sleep -Milliseconds 50
[Win32Click]::mouse_event(0x0002, 0, 0, 0, 0) # Left down
[Win32Click]::mouse_event(0x0004, 0, 0, 0, 0) # Left up
      `;
    } else {
      script += `
[Win32Click]::mouse_event(0x0002, 0, 0, 0, 0) # Left down
[Win32Click]::mouse_event(0x0004, 0, 0, 0, 0) # Left up
      `;
    }
    
    await runPowerShell(script);
    return { content: [{ type: 'text', text: `Performed ${args.button || 'left'} click` }] };
  }
  
  if (name === 'keyboard_type') {
    const escaped = args.text.replace(/["'{}]/g, '{$&}');
    const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait("${escaped}")
    `;
    await runPowerShell(script);
    return { content: [{ type: 'text', text: `Typed: "${args.text}"` }] };
  }
  
  if (name === 'take_screenshot') {
    const filename = `screenshot-${Date.now()}.png`;
    const outputPath = join(os.tmpdir(), filename);
    const script = `
[Reflection.Assembly]::LoadWithPartialName("System.Drawing") | Out-Null
[Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms") | Out-Null
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bmp.Save("${outputPath.replace(/\\/g, '\\\\')}", [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bmp.Dispose()
    `;
    await runPowerShell(script);
    return { content: [{ type: 'text', text: `Screenshot saved to: ${outputPath}` }] };
  }
  
  throw new Error(`Tool not found: ${name}`);
}

import readline from 'readline';
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async (line) => {
  log(`Received line: ${line}`);
  try {
    const request = JSON.parse(line);
    const { method, params, id } = request;
    
    if (method === 'initialize') {
      const response = {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'computer-use-mcp',
            version: '1.0.0'
          }
        }
      };
      process.stdout.write(JSON.stringify(response) + '\n');
      return;
    }
    
    if (method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        id,
        result: { tools }
      };
      process.stdout.write(JSON.stringify(response) + '\n');
      return;
    }
    
    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      try {
        const result = await handleToolCall(name, args);
        const response = {
          jsonrpc: '2.0',
          id,
          result
        };
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch (err) {
        const response = {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32603,
            message: err.message
          }
        };
        process.stdout.write(JSON.stringify(response) + '\n');
      }
      return;
    }
    
    if (id !== undefined) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: 'Method not found' }
      }) + '\n');
    }
  } catch (err) {
    log(`Error parsing JSON message: ${err.message}`);
  }
});
