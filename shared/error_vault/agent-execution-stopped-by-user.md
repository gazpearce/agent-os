# Error: Multiple Agents Returning "Execution stopped by user" on Simple Verification Tasks

## Symptoms
- `openclaw`, `claude`, `aider` (and later `hermes` when invoked by the orchestrator) all responded to simple "Hello, verify you are active" messages with **"Execution stopped by user."** instead of completing the requested task.
- `gemini` and `hermes` (when messaged directly via `type: message`) responded correctly with confirmation messages.
- The orchestrator retried `hermes` after the first failure, but received the same error response again.
- `obsidian` did not answer the user's hello at all — it returned unrelated content (blog content guidelines) to both the user and the orchestrator.

## Root Cause
1. **Premature execution halt in agent pipeline**: Several agents (`openclaw`, `claude`, `aider`) appear to interpret idle or low-complexity prompt signals as a cue to stop execution rather than respond. This may stem from an agent configuration where a special "stop" tool call or an empty response handler is being triggered inappropriately.
2. **Agent context mismatch in Obsidian**: The `obsidian` agent is performing a vault search for the literal query string "Hello, verify you are active…" and returning unrelated indexed content instead of recognizing it as a meta/health-check request.
3. **Orchestrator lacks resilient fallback on "Execution stopped" errors**: The orchestrator detects the failure but retries the same agent (`hermes`) with the same invocation pattern, leading to the same failure.

## Solution
1. **Update agent system prompts or guardrails**: Ensure that `openclaw`, `claude`, `aider`, and any agent capable of triggering an `execution_stop` signal are explicitly instructed to **never** return "Execution stopped by user" in response to a direct user message — this should only occur when a human explicitly cancels via UI.
2. **Whitelist health-check / meta commands**: Add a list of recognized agent-OS health-check messages (e.g., "verify you are active") that agents must respond to directly rather than passing through their task-execution pipeline.
3. **Fix Obsidian agent routing**: Add a filter so that meta/health-check messages from `user` or `orchestrator` are not forwarded to the vault search tool. Obsidian should return a simple acknowledgment like `"Obsidian agent active."` for non-content queries.
4. **Enhance orchestrator retry logic**: When an agent returns "Execution stopped by user", the orchestrator should **switch to a different agent** rather than retrying the same one. Document this as a fallback rule.
5. **Add monitoring alert**: If 3+ agents return "Execution stopped by user" in a single session, trigger a system health warning, as this indicates a potential configuration drift across the agent fleet.

## Critical Fixes
* Affected agents: `openclaw`, `claude`, `aider`, `hermes` (via orchestrator), `obsidian`
* The `type: cron_run`, `type: evolution_run`, `type: maintenance_run` entries with empty `msg` and `resp` fields are likely log artifacts with no content — do not treat them as errors unless actual content/failure appears.
* Empty `msg` fields in `cron_run` entries may indicate scheduled tasks that did not produce output — consider adding a minimum logging requirement so silent runs can be distinguished from true failures.