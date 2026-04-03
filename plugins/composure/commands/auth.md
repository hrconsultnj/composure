---
name: auth
description: Authenticate with Composure Pro — login, logout, check status, or upgrade your plan
argument-hint: "login | logout | status | upgrade"
---

Manage CLI authentication for Composure. Runs the `composure-auth.mjs` binary from the plugin's `bin/` directory.

## Route by subcommand

Parse `$ARGUMENTS` to determine the action:

| Argument | Action |
|----------|--------|
| `login` | Run the browser-based OAuth login flow |
| `logout` | Clear stored credentials |
| `status` | Show current auth status, plan, and features |
| `upgrade` | Open the pricing page to upgrade your plan |
| *(empty)* | Show current status, or prompt to login if not authenticated |

## Execution

Run the appropriate command via Bash using the full plugin path:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/composure-auth.mjs" {subcommand}
```

### For `login`

1. Tell the user: "Opening your browser for authentication. Complete the login there and return here."
2. Run `"${CLAUDE_PLUGIN_ROOT}/bin/composure-auth.mjs" login`
3. The script opens a browser, waits for the OAuth callback, exchanges the code, and stores tokens at `~/.composure/credentials.json`.
4. Report the result (email, plan) back to the user.
5. If login fails, show the error and suggest checking their internet connection.

### For `logout`

1. Run `"${CLAUDE_PLUGIN_ROOT}/bin/composure-auth.mjs" logout`
2. Confirm: "Logged out. Sign back in anytime with `/composure:auth login`."

### For `status`

1. Run `"${CLAUDE_PLUGIN_ROOT}/bin/composure-auth.mjs" status`
2. Display the output (email, plan, features, token expiry).
3. If not authenticated, suggest: "Run `/composure:auth login` to authenticate."

### For `upgrade`

1. Run `"${CLAUDE_PLUGIN_ROOT}/bin/composure-auth.mjs" upgrade`
2. Tell the user: "The pricing page is opening in your browser."

### For no argument

1. Run `"${CLAUDE_PLUGIN_ROOT}/bin/composure-auth.mjs" status`
2. If the output shows "Not authenticated", suggest logging in.
3. If authenticated, display the status and mention available subcommands.
