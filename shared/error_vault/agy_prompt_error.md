# Error: AGY Agent Execution Loop Failure – Undefined `agentPrompt`

## Symptoms
- When the orchestrator sent a query to the **agy** agent to retrieve the latest CCTV FAQ entries, the response was:
  ```
  AGY execution loop error: agentPrompt is not defined
  ```
- No data was returned, and subsequent steps that depended on this information (e.g., blog generation, keyword density checks) could not proceed.
- Repeated attempts to invoke **agy** produced the same error, indicating a persistent issue in the agent’s execution loop.

## Root Cause
The **agy** agent’s runtime code expects a variable or configuration named `agentPrompt` to be defined before entering its execution loop. This variable is typically injected during agent initialization to supply the system prompt context. In this deployment:

1. The orchestrator’s message payload did **not** include the required `agentPrompt` field.
2. The agent’s internal guard clause (`if (!agentPrompt) throw ...`) triggered, causing the uncaught exception.
3. No fallback or default prompt was provided, leading to a hard failure rather than graceful degradation.

## Solution
1. **Update Orchestrator Message Schema**  
   Ensure every request sent to **agy** includes an `agentPrompt` key. Example payload:
   ```json
   {
     "type": "message",
     "from": "orchestrator",
     "to": "agy",
     "msg": "Query the local knowledge base and the web for the latest CCTV FAQ entries, compiling the most recent and relevant questions and answers into a list.",
     "agentPrompt": "You are a research assistant specialized in security camera technology. Provide concise, up‑to‑date FAQ entries."
   }
   ```

2. **Add Default Prompt in AGY Initialization**  
   Modify the AGY startup code to supply a fallback prompt if none is provided:
   ```python
   agentPrompt = config.get("agentPrompt") or """
   You are a knowledgeable assistant tasked with gathering the latest FAQs on CCTV systems.
   """
   ```

3. **Graceful Error Handling**  
   Wrap the execution loop in a try‑except block that logs the missing prompt and returns a user‑friendly error message instead of crashing:
   ```python
   try:
       run_agent_loop(agentPrompt)
   except NameError as e:
       logger.error("Missing agentPrompt: %s", e)
       return {"error": "Agent prompt not supplied. Please include `agentPrompt` in the request."}
   ```

4. **Testing**  
   - Add unit tests that simulate a request without `agentPrompt` and verify the agent returns the friendly error.
   - Run integration tests where the orchestrator sends a valid prompt and confirm the agent returns the expected FAQ list.

By enforcing the presence of `agentPrompt` (or providing a safe default) and improving error handling, the AGY agent will no longer abort, enabling downstream workflow steps to complete successfully.