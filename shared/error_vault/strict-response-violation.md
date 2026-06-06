# Error: Agent Ignored Exact‑Match Output Requirement

## Symptoms
- User request: *"Hello, respond with exactly \"OK\" and nothing else."*
- Agent first replied with the correct exact string `OK`.
- Immediately after, the agent sent an additional unsolicited message:  
  `Hello! How can I assist you today?`
- This extra output violates the user’s explicit instruction to return **only** the word `OK`.

## Root Cause
The agent’s response handling logic does not enforce a “single‑turn strict output” rule when a user explicitly demands an exact match. After satisfying the requirement, the generic fallback greeting routine was still triggered, causing a follow‑up message that the user did not request.

## Solution
1. **Add a post‑response guard** in the message handling pipeline:
   - Detect when a user instruction contains phrases like *“respond with exactly … and nothing else”* or similar constraints.
   - After generating the required output, **short‑circuit** any further response generation for that turn.
2. **Prioritize exact‑match directives** over default greeting intents.
3. **Unit test** the guard with scenarios:
   - `"respond with exactly \"OK\" and nothing else"` → returns only `OK`.
   - Variations with different exact strings.
4. **Log a warning** if the guard fails, so developers can quickly spot future regressions.