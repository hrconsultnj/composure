---
name: auth
description: Authenticate with Composure — login, logout, check status, upgrade plan, migrate configs, or refresh tokens
---

Manage CLI authentication for Composure. Invokes the `composure-auth.mjs` binary via the user's `~/.composure/bin/` indirection layer (works across Claude Code, Codex, Gemini, and other MCP-aware clients).

## Route by user intent

Read the user's request and pick the action:

| User intent | Subcommand to run |
|---|---|
| Sign in / log in / connect | `login` |
| Sign out / log out / disconnect | `logout` |
| Check status / show plan / am I logged in | `status` |
| Upgrade plan / pricing | `upgrade` |
| Migrate project configs from `.claude/` to `.composure/` | `migrate` |
| Refresh an expired session without re-login | `refresh` |
| (no clear intent) | `status` (then suggest next step based on output) |

## Execution

Run the binary via Bash using the user's resolved home directory:

```bash
<home>/.composure/bin/composure-auth.mjs {subcommand}
```

Replace `<home>` with the user's **resolved absolute home directory** (e.g., `/Users/username` on macOS, `/home/username` on Linux). Do NOT use `$HOME`, `~`, or quotes — Claude Code's permission system requires the literal path.

### login

1. Tell the user: "Opening your browser for authentication. Complete the login there and return here."
2. Run `<home>/.composure/bin/composure-auth.mjs login`.
3. The script opens a browser, waits for the OAuth callback, exchanges the code, and stores tokens at `~/.composure/credentials.json`.
4. Report the result (email, plan) back to the user.
5. If login fails, show the error and suggest checking their internet connection.

### logout

1. Run `<home>/.composure/bin/composure-auth.mjs logout`.
2. Confirm: "Logged out. Cached content cleared. Sign back in anytime by asking me to log in to Composure."

### status

1. Run `<home>/.composure/bin/composure-auth.mjs status`.
2. Display the output (email, plan, features, token expiry).
3. If not authenticated, suggest: "Ask me to log in to Composure to authenticate."
4. Mention: "Run `/composure:health` for full installation diagnostics."

### upgrade

1. Run `<home>/.composure/bin/composure-auth.mjs upgrade`.
2. Tell the user: "The pricing page is opening in your browser."

### migrate

1. Run `<home>/.composure/bin/composure-auth.mjs migrate`.
2. Report which files were migrated from `.claude/` to `.composure/`.
3. Remind the user to restart their AI coding client to pick up the new paths.

### refresh

1. Run `<home>/.composure/bin/composure-auth.mjs refresh`.
2. If token was refreshed: "Token refreshed successfully."
3. If refresh failed: "Refresh failed. Ask me to log in to Composure to re-authenticate."

### no clear intent

1. Run `<home>/.composure/bin/composure-auth.mjs status`.
2. If the output shows "Not authenticated", suggest logging in.
3. If authenticated, display the status and mention available actions (login, logout, status, upgrade, migrate, refresh).
