# Error: OpenClaw CLI Failure during FAQ Retrieval

## Symptoms
- The orchestrator sent a request to OpenClaw to search for recent CCTV FAQ articles.
- The `openclaw_cli_run` event returned a `tool_error` with no detailed message.
- OpenClaw did not return any results, causing the workflow to stall.
- Hermes responded that the step could not be completed automatically and suggested manual handling.

## Root Cause
- The OpenClaw CLI failed due to one or more of the following:
  1. **Network Connectivity**: The local environment could not reach the external web services OpenClaw requires (e.g., Google Search API, Bing, or Office 365).
  2. **Authentication/Authorization**: The API keys or OAuth tokens required by OpenClaw were missing, expired, or invalid.
  3. **Missing Dependencies**: Required Python packages, environment variables, or binaries were not present or misconfigured.
  4. **CLI Invocation Error**: Incorrect command syntax or missing arguments caused the CLI to exit with an error.

## Solution
1. **Verify Network Access**
   - Ensure the host machine and Docker container have outbound internet connectivity.
   - Test by pinging external domains or using `curl https://www.google.com`.

2. **Check API Credentials**
   - Confirm that all required API keys (e.g., Google Custom Search, Bing Search) are set in environment variables or a secure secrets vault.
   - Verify the keys are up‑to‑date and have sufficient quota.

3. **Validate OpenClaw Installation**
   - Run `openclaw --version` to ensure the CLI is installed and reachable.
   - Reinstall or update OpenClaw using:  
     ```bash
     pip install --upgrade openclaw
     ```
   - Ensure all dependencies (`python-dotenv`, `requests`, etc.) are installed.

4. **Inspect CLI Logs**
   - Run the OpenClaw command manually with `-v` or `--debug` to capture verbose output and pinpoint the failure point.

5. **Adjust Orchestrator Execution**
   - If network constraints cannot be resolved, consider offloading the research step to an agent with guaranteed connectivity, or provide a manual fallback as Hermes suggested.

6. **Automated Retry Policy**
   - Implement a simple retry mechanism (e.g., 3 attempts with exponential backoff) to handle transient failures.

By ensuring network connectivity, valid credentials, proper installation, and detailed logging, future attempts to use OpenClaw for FAQ retrieval will resolve the error and allow the workflow to proceed without manual intervention.