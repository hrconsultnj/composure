---
name: auth
description: Authenticate with Composure — login, logout, check status, upgrade plan, migrate configs, or refresh tokens
argument-hint: "login | logout | status | upgrade | migrate | refresh"
---

Manage CLI authentication for Composure. Runs the `composure-auth.mjs` binary from the plugin's `bin/` directory.

## Route by subcommand

Parse `$ARGUMENTS` to determine the action:

| Argument | Action |
|----------|--------|
| `login` | Run the browser-based OAuth login flow |
| `logout` | Clear stored credentials and content cache |
| `status` | Show current auth status, plan, and token info |
| `upgrade` | Open the pricing page to upgrade your plan |
| `migrate` | Migrate project configs from `.claude/` to `.composure/` |
| `refresh` | Refresh an expired token without full re-login |
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
2. Confirm: "Logged out. Cached content cleared. Sign back in anytime with `/composure:auth login`."

### For `status`

1. Run `"${CLAUDE_PLUGIN_ROOT}/bin/composure-auth.mjs" status`
2. Display the output (email, plan, features, token expiry).
3. If not authenticated, suggest: "Run `/composure:auth login` to authenticate."
4. Mention: "Run `/composure:health` for full installation diagnostics."

### For `upgrade`

1. Run `"${CLAUDE_PLUGIN_ROOT}/bin/composure-auth.mjs" upgrade`
2. Tell the user: "The pricing page is opening in your browser."

### For `migrate`

1. Run `"${CLAUDE_PLUGIN_ROOT}/bin/composure-auth.mjs" migrate`
2. Report which files were migrated from `.claude/` to `.composure/`.
3. Remind user to restart Claude Code to pick up the new paths.

### For `refresh`

1. Run `"${CLAUDE_PLUGIN_ROOT}/bin/composure-auth.mjs" refresh`
2. If token was refreshed: "Token refreshed successfully."
3. If refresh failed: "Refresh failed. Run `/composure:auth login` to re-authenticate."

### For no argument

1. Run `"${CLAUDE_PLUGIN_ROOT}/bin/composure-auth.mjs" status`
2. If the output shows "Not authenticated", suggest logging in.
3. If authenticated, display the status and mention available subcommands.
