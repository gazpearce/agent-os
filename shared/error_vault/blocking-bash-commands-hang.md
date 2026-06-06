# Error: Blocking Bash Commands causing Agent Hangs and Manual Interruption

## Symptoms
The agent execution hangs indefinitely on a tool step or is terminated with the response `"Execution stopped by user"` after attempting to run terminal commands (such as network diagnostics like `ping`).

## Root Cause
1. **