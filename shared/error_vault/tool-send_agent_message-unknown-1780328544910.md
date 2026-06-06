# Error: Tool send_agent_message failed on unknown

## Symptoms
The tool execution failed with the following error:
```
Response from OPENCLAW:
[assistant turn failed before producing content]
```

## Root Cause
The tool send_agent_message encountered a failure when interacting with the target path or execution command: unknown.

## Solution
Examine the console error message and verify permission configuration, path availability, command syntax, or workspace locking state.
