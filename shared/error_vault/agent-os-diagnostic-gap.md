# Error: Insufficient OS Diagnostic Capabilities

## Symptoms
The agent `hermes` is unable to answer user queries regarding the host OS system architecture and internals. When asked "ca you see the whole OS system that i have you in?", the agent attempts a tool call that fails to provide system data, resulting in a response telling the user to manually run `uname` or `systemctl`.

## Root Cause
The `swarm_executor` lacks the necessary system-level tool definitions or permissions to access OS diagnostics, creating a capability gap between the user's expectations of the "Agent OS" and the agent's actual access levels.

## Solution
Implement a secure diagnostic toolset within the `swarm_executor` that allows agents to execute read-only system commands (e.g., `uname -a`, `hostnamectl`, `df -h`). Ensure these tools are sandboxed or restricted to specific non-privileged paths to maintain system security while providing necessary visibility to the agent.