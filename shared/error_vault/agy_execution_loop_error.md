# Error: AGY Execution Loop Failure – Undefined `agentPrompt`

## Symptoms
- The orchestrator sent a request to the `agy` agent to query the local knowledge base and web for latest CCTV FAQ entries.
- The response from `agy` was:  
  `AGY execution loop error: agentPrompt is not defined`
- Subsequent attempts to use `agy` for content generation also failed to produce expected output.

## Root Cause
The `agy` agent’s execution loop references a variable `agentPrompt` that was never initialized or passed in the request context. This leads to a runtime JavaScript/Node.js error, causing the agent to abort without performing its intended task.

## Solution
1. **Initialize `agentPrompt`**  
   - Ensure that every invocation of the `agy` agent includes a defined `agentPrompt` field containing the prompt text or task description.
2. **Validate Input Parameters**  
   - Add a pre‑execution validation step in the `agy` agent code to check for required fields (`agentPrompt`, `task_id`, etc.) and return a clear error message if missing.
3. **Fallback Prompt Generation**  
   - If `agentPrompt` is omitted, construct a default prompt from the incoming message content to maintain robustness.
4. **Update Orchestrator Calls**  
   - Modify orchestrator scripts to include `agentPrompt` when calling `agy`, e.g.:  
   ```json
   {
     "type": "message",
     "to": "agy",
     "msg": "Query the local knowledge base and the web for the latest CCTV FAQ entries...",
     "agentPrompt": "Retrieve recent CCTV FAQs and compile into a list."
   }
   ```
5. **Add Logging**  
   - Implement detailed logging around prompt handling to quickly identify missing parameters in future runs.

By applying these fixes, the `agy` agent will execute its loop correctly, allowing the swarm to retrieve up‑to‑date FAQ data and continue downstream blog generation tasks without interruption.