# OS Diagnostics Tip: Using Basic Commands

## Context
During a user interaction, the system was asked to display the entire OS environment. Direct diagnostic tools were not available, so a manual approach was recommended.

## Implementation Details
When direct OS inspection tools are missing, use one of the following basic commands:

- **Linux/Unix**: `uname -a` – prints kernel name, hostname, kernel release, version, machine, processor, and operating system.
- **System services**: `systemctl status` – shows the status of systemd services; can be combined with `systemctl list-units --type=service --state=running` to list active services.
- **General info**: `cat /etc/os-release` – displays detailed OS version information.

These commands can be executed directly in a shell or via a terminal emulator to retrieve system details.

## Critical Fixes
* If the user cannot run built‑in diagnostic tools, always suggest using `uname`, `systemctl`, or reading `/etc/os-release` manually.  * Document the exact command to copy‑paste for quick execution.  
* Ensure the response includes a brief explanation of what each command outputs.