# Error: prompt_toolkit Win32 NoConsoleScreenBufferError

## Symptoms
When running the `hermes` agent command line tool via non-interactive processes (such as Node `exec` or background scripts), it crashes on startup with the following stack trace:
```
  File "C:\Users\Gary\hermes-agent\venv\Lib\site-packages\prompt_toolkit\output\win32.py", line 219, in get_win32_screen_buffer_info
    raise NoConsoleScreenBufferError
prompt_toolkit.output.win32.NoConsoleScreenBufferError: No Windows console found. Are you running cmd.exe?
```

## Root Cause
The `prompt_toolkit` library requires a real Win32 console screen buffer. Running the agent in background shells or output redirection streams deprives it of this buffer, causing the Win32 API to fail.

## Solution
Instead of invoking the CLI directly in the background process, launch it in a new visible shell window using PowerShell or Python subprocess.

### Example Python Fix (from `run_hermes_goal.py`):
```python
import subprocess

# Create a startup script that keeps the window open
ps_script = '''
$env:HERMES_ACCEPT_HOOKS = "1"
& "python.exe" "hermes" chat -q "your goal"
Read-Host "Press Enter to close"
'''

# Launch in a visible window
subprocess.Popen([
    "powershell.exe",
    "-ExecutionPolicy", "Bypass",
    "-WindowStyle", "Normal",
    "-File", "start_script.ps1"
])
```

### Example Node.js Fix:
```javascript
import { exec } from 'child_process';
// Run in a cmd window
exec('start cmd.exe /k "hermes chat --yolo"');
```
