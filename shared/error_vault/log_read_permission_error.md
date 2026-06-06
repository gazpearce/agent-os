# Error: Insufficient Permissions When Reading System Log

## Symptoms
The agent attempted to execute a command to read the system log, but the response was truncated, indicating the command stopped prematurely. The partial message suggests a permission issue: “the process doesn’t have permission to re…”.

## Root Cause
The agent ran the log‑reading command without elevated privileges (e.g., without `sudo` or appropriate file permissions). System logs such as `/var/log/syslog` or `/var/log/messages` are typically owned by `root` and are not readable by regular users.

## Solution
1. **Verify Required Permissions**
   ```bash
   ls -l /var/log/syslog   # or the specific log file being accessed
   ```
2. **Run with Elevated Privileges**
   - Prefix the command with `sudo` if the agent has sudo rights:
     ```bash
     sudo cat /var/log/syslog
     ```
   - Or adjust the ACL for the agent’s user (if security policy permits):
     ```bash
     sudo setfacl -m u:agent_user:r /var/log/syslog
     ```

3. **Update Agent Configuration**
   - Add a rule in the agent’s task definition to automatically prepend `sudo` for log‑reading actions, or to request the necessary capabilities from the host environment.

4. **Fail‑Safe Handling**
   - Implement error handling to catch permission denied (`EACCES`) and log a clear diagnostic message, suggesting the required privilege escalation.

By ensuring the agent has appropriate read access to system logs, the command will complete successfully and the truncated error will be eliminated.