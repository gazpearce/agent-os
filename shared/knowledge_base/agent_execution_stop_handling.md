# Handling “Execution stopped by user” Responses from Agents

## Context
During routine interactions, several agents (openclaw, claude, aider, hermes) returned the response **“Execution stopped by user.”** when prompted to verify activity or execute simple commands. This pattern indicates that the agents are interpreting the request as a command execution request and automatically halting due to an internal safety guard, rather than providing the expected short confirmation.

## Implementation Details
- **Trigger**: A user message of the form “Hello, verify you are active and respond with a short confirmation message.” sent to an agent.
- **Agent behavior**: 
  - Gemini, Hermes responded with a confirmation.
  - Openclaw, Claude, Aider, and Hermes (in some attempts) returned “Execution stopped by user.”
- **Underlying mechanism**: These agents have a built‑in guard that stops execution when a request could be interpreted as a command or when interaction policy flags a potential non‑interactive action.

### Recommended Interaction Pattern
1. **Explicitly request a textual reply** without framing it as a command.  
   ```text
   Please reply with a short confirmation like “Active”.
   ```
2. **Use the `message` type** rather than a `command` or `terminal` type in the orchestration layer.
3. **If a stop response is received**, fallback to a simpler prompt or route the request to an agent known to handle such checks (e.g., Gemini).

### Example Fix
```python
def verify_agent(agent_name):
    prompt = "Please confirm you are active with a short reply, e.g., 'Active'."
    response = send_message(to=agent_name, msg=prompt)
    if "Execution stopped by user" in response:
        # Retry with a more explicit wording or switch agent
        fallback_prompt = "Just reply 'Active' to confirm you're online."
        response = send_message(to=agent_name, msg=fallback_prompt)
    return response
```

## Critical Fixes
* **Avoid phrasing that resembles command execution** when only a textual confirmation is needed.
* **Implement a retry mechanism** that detects “Execution stopped by user” and adjusts the prompt.
* **Maintain a whitelist** of agents (e.g., Gemini, Hermes) that reliably provide short confirmations without triggering stop guards.