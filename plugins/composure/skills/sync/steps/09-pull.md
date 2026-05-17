# Step 09 — Pull (Cross-Machine Bootstrap)

Fires only when the user invokes `/composure:sync pull`. The other 8 steps (01–08) handle LOCAL sync. This step handles CROSS-MACHINE bootstrap: log in on a new machine and get everything back without remembering which plugins you had installed.

## What `pull` does

1. **Auth on this machine** — runs `/composure:account login` (interactive OAuth) if not already authenticated.
2. **Fetch user's plugin manifest from SaaS** — GET `https://composure-pro.com/api/v1/account/manifest` with bearer token. Returns the manifest the user's source machine exported via `composure-update`.
3. **Parse manifest** — extract plugin list, marketplace URL, pinned commits.
4. **Emit install plan** — print the exact `claude plugin marketplace add` + `claude plugin install` commands needed to restore the user's plugin set on this machine.
5. **(Optional) Restore Cortex graph backup** — if SaaS has a backup, download and place at `~/.composure/cortex/cortex.db`. Skip by default; opt-in via `--restore-cortex`.

## Why this exists

Codex (R3 research) doesn't solve cross-machine state portability — user must manually re-add marketplaces. Composure already has the SaaS infrastructure to do better. `composure:sync pull` is the differentiator: new machine, one command, plugin set restored.

## Implementation

The actual orchestration runs via the CLI binary:

```bash
<home>/.composure/bin/composure-sync-pull.mjs [--dry-run] [--restore-cortex]
```

The binary handles:
- Auth check + redirect to /composure:account login if needed
- Manifest fetch with retry + timeout (R1 retry pattern, 10s timeout)
- Falls back to local manifest at `~/.composure/manifest.json` if SaaS unreachable (useful for testing or offline diagnostic — emits the commands the user WOULD run if they were on a new machine)
- Outputs commands in a copy-paste-ready block + optionally executes them via `claude` CLI if available

## Output format

```
─── composure:sync pull ────────────────────
1. Auth:             ✅ logged in as h***s@gmail.com (enterprise plan)
2. Manifest fetch:   ✅ retrieved 5 plugins (last exported 2026-05-15 from MacBook-Pro)
3. Install plan:     5 plugins to install

Run these in Claude Code (or in your terminal if `claude` CLI is on PATH):

  claude plugin marketplace add hrconsultnj/claude-plugins
  claude plugin install composure@composure-suite
  claude plugin install design-forge@composure-suite
  claude plugin install sentinel@composure-suite
  claude plugin install shipyard@composure-suite
  claude plugin install testbench@composure-suite

4. Cortex restore:   skipped (use --restore-cortex to download backup)
────────────────────────────────────────────
Ready. Run the 6 commands above to complete the bootstrap.
```

## SaaS dependency status (2026-05-17)

The endpoint `https://composure-pro.com/api/v1/account/manifest` is **NOT yet implemented** on the SaaS side. Until it ships:
- The binary falls back to reading the LOCAL `~/.composure/manifest.json` (only useful for diagnostic / preview of the future flow)
- A clear "SaaS endpoint pending" warning is printed
- The install-plan output still works (with the local manifest as source)

SaaS endpoint requirements (Wave E follow-up):
- Method: `GET /api/v1/account/manifest`
- Auth: `Authorization: Bearer <access_token>`
- Response: JSON matching `~/.composure/manifest.json` schema (installed_plugins, upstream, policy)
- A complementary `POST /api/v1/account/manifest` to push the local manifest to SaaS (run from `composure:sync` local mode after a successful sync — sync up the latest plugin set)

## Failure modes (handled)

| Condition | Behavior |
|---|---|
| Not authenticated | Redirect to `/composure:account login`, then re-run |
| SaaS unreachable | Fall back to local manifest, warn |
| Local manifest absent AND SaaS unreachable | Print "No source manifest found — install plugins manually" |
| `claude` CLI not on PATH | Print copy-paste commands only; don't try to execute |
| Plugin install fails | Continue to next plugin; report failures at end |

## Not in scope today

- SaaS-side `GET /api/v1/account/manifest` endpoint (Wave E)
- SaaS-side `POST /api/v1/account/manifest` to push manifests (Wave E)
- Auto-execution of `claude plugin install` (currently print-only; user copies + runs)
- Cortex graph backup download (stub for `--restore-cortex` flag)
- Windows-specific install command differences

Status: client-side scaffold + skill flow complete; awaiting SaaS endpoint to enable full cross-machine bootstrap.
