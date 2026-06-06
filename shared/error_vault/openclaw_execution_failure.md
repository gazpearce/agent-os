# Error: OpenClaw CLI Returned No Data – Research Step Failed

## Symptoms
- The orchestrator instructed Hermes to fetch recent CCTV FAQ articles via OpenClaw.
- OpenClaw CLI run returned an empty response.
- Subsequent Hermes message: “It looks like OpenClaw ran into an issue before it could return the research results.”
- No FAQ data was produced, causing downstream steps (FAQ placeholder creation, blog drafting) to stall and repeatedly request manual input.

## Root Cause
OpenClaw was invoked without valid arguments or with a malformed query, leading the underlying tool to exit with an error state that was not captured. The tool’s error handling did not surface a clear message, only a generic `tool_error` entry, causing the swarm to continue without the needed data.

## Solution
1. **Validate Input Before Invocation**  
   - Ensure the query string passed to OpenClaw follows its required format (e.g., JSON with `search_terms`, `sources`, `limit`).  
   - Add a pre‑flight check in Hermes to verify that the constructed payload is non‑empty.

2. **Improve Error Propagation**  
   - Modify the OpenClaw wrapper to capture stdout/stderr and return a structured error object if the exit code ≠ 0.  
   - Propagate this error back to the orchestrator so the swarm can decide to retry or fallback.

3. **Add Retry Logic**  
   - Implement a simple exponential back‑off retry (max 3 attempts) for transient network or rate‑limit failures.

4. **Fallback to Alternative Tool**  
   - If OpenClaw fails after retries, automatically switch to a secondary web‑search tool (e.g., `searchapi` or `scrape`) to retrieve the FAQs.

5. **Log Detailed Diagnostics**  
   - Record the full command, payload, and response (or error) in the shared log directory for future debugging.

By applying these fixes, future runs will either successfully retrieve the FAQ data or fail gracefully with actionable diagnostics, preventing the swarm from stalling on missing research results.