# Error: CLI Agents Emit Empty or Unrouted Responses to User Messages

## Symptoms
- User messages to CLI-backed agents (`agy`, `openclaw`, `claude`) trigger the corresponding `_cli_run` entries, but both the `msg` and `resp` fields in those entries are empty.
- The `hermes` agent correctly generates a separate `response` type log entry routing back to the user; the CLI-backed agents never generate a `response` entry.
- After the `claude` agent fails to return usable output, the user sends a follow-up message reading "strange response," confirming the broken interaction is user-visible.

## Root Cause
The CLI runner wrapper for non-Hermes agents executes the underlying process but fails to capture stdout into the log entry's `resp` field, and/or does not publish the captured output as a `response` type message on the bus. The result is silently dropped instead of being routed back to the user.

## Solution
1. **Capture all CLI output:** Update the `_cli_run` executor to pipe the agent's stdout/stderr into the `resp` field of the run entry.
2. **Enforce response routing:** After any `_cli_run` triggered by a user `message`, the orchestrator must emit a `response` type log entry (`from: <agent>`, `to: user`) containing the captured output.
3. **Guard against empty output:** If the CLI output is empty or whitespace-only, return a fallback error message (e.g., "Agent produced no output") instead of a silent empty response.
4. **Audit CLI adapters:** Apply the stdout capture and response routing fixes to `agy_cli_run`, `openclaw_cli_run`, and `claude_cli_run` to ensure parity with the `hermes` direct-response path.