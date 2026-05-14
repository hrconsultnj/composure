#!/usr/bin/env bash
# composure-freshness.sh — per-session freshness check for Composure runtime.
#
# Owns three concerns the host's marketplace doesn't own for us:
#   1. Bootstrap ~/.composure/manifest.json on cold boot (single source of
#      truth for "what plugin runtime is installed where").
#   2. Detect drift between manifest's recorded plugin commit and the
#      currently-installed plugin (cache-heal mid-session, version skew,
#      partial updates).
#   3. Rate-limited upstream check (compare installed commit vs marketplace
#      origin/HEAD). If newer → emit [composure:update-available] and let the
#      user run /composure:update + reload.
#
# Designed to be silent on the happy path: only emits messages when there's
# something the user/agent should know. Exit code is always 0 so a failure
# here never breaks session boot.
#
# Registered in plugins/composure/hooks/hooks.json SessionStart chain BEFORE
# session-boot.sh so the rest of boot can rely on the manifest existing.

set -u

# ── 0. Resolve self + load resolve lib ────────────────────────
SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESOLVE_LIB="$(cd "${SELF_DIR}/../../scripts" && pwd)/composure-resolve.sh"

if [ ! -f "$RESOLVE_LIB" ]; then
  # No resolve lib → can't do anything. Bail silently; session-boot will run.
  exit 0
fi
# shellcheck disable=SC1090
. "$RESOLVE_LIB"
composure_resolve_init

COMPOSURE_HOME="${HOME}/.composure"
MANIFEST="${COMPOSURE_HOME}/manifest.json"
AUTOUPDATE_STAMP="${COMPOSURE_HOME}/last-autoupdate-check"
FRESHNESS_STAMP="${COMPOSURE_HOME}/last-freshness-check"

# ── 0a. Reachability probes ────────────────────────────────────
# When the agent can't reach Composure, every other step downstream of
# this hook will fail with cryptic errors. Surface the canonical "what to
# do" message here, BEFORE anything else tries to use the plugin.

if [ -z "${COMPOSURE_RUNTIME_ROOT:-}" ]; then
  # No runtime path resolvable from manifest OR fallback chain.
  echo "[composure:not-installed] Composure plugin runtime not detected on this machine"
  echo "[composure:not-installed] step 1 — in Claude Code: /plugin install composure@composure-suite"
  echo "[composure:not-installed] step 2 — then /reload"
  exit 0
fi

if [ ! -f "${COMPOSURE_RUNTIME_ROOT}/.claude-plugin/plugin.json" ]; then
  echo "[composure:degraded] runtime path exists but plugin.json is missing — install is broken"
  echo "[composure:degraded] run /composure:update (or /plugin install composure@composure-suite if that fails)"
  exit 0
fi

BOOTSTRAP="${COMPOSURE_RUNTIME_ROOT}/scripts/manifest-bootstrap.mjs"

# ── 1. Bootstrap manifest if missing ──────────────────────────
if ! composure_manifest_fresh; then
  if [ -f "$BOOTSTRAP" ] && command -v node >/dev/null 2>&1; then
    node "$BOOTSTRAP" --quiet 2>/dev/null || true
  fi
fi

# Manifest still absent → emit degraded notice; session-boot keeps running
# off CLAUDE_PLUGIN_ROOT fallback. Not silent — user should know the
# manifest didn't get written (likely permission issue under ~/.composure/).
if [ ! -f "$MANIFEST" ]; then
  echo "[composure:degraded] ~/.composure/manifest.json could not be written — check ~/.composure/ permissions"
  echo "[composure:degraded] freshness checks disabled this session; run /composure:update once permissions are fixed"
  exit 0
fi
command -v jq >/dev/null 2>&1 || exit 0

# ── 2. Drift check (cheap) ────────────────────────────────────
# Hash the installed plugin's plugin.json and compare to manifest. If the
# installed file changed but the manifest wasn't refreshed, runtime is drifting
# from what every other component thinks is installed. This catches:
#   - mid-session marketplace pulls
#   - manual user edits to cached files
#   - cache-heal mirroring an older version on top of a newer one
RECORDED_HASH=$(jq -r '.installed_plugins.composure.integrity.plugin_json_sha256 // ""' "$MANIFEST" 2>/dev/null)
ACTUAL_HASH=""
if [ -f "${COMPOSURE_RUNTIME_ROOT}/.claude-plugin/plugin.json" ] && command -v shasum >/dev/null 2>&1; then
  ACTUAL_HASH=$(shasum -a 256 "${COMPOSURE_RUNTIME_ROOT}/.claude-plugin/plugin.json" 2>/dev/null | awk '{print $1}')
fi
if [ -n "$RECORDED_HASH" ] && [ -n "$ACTUAL_HASH" ] && [ "$RECORDED_HASH" != "$ACTUAL_HASH" ]; then
  RECORDED_VER=$(jq -r '.installed_plugins.composure.version // "?"' "$MANIFEST" 2>/dev/null)
  ACTUAL_VER=$(jq -r '.version // "?"' "${COMPOSURE_RUNTIME_ROOT}/.claude-plugin/plugin.json" 2>/dev/null)
  echo "[composure:drift] manifest=${RECORDED_VER} runtime=${ACTUAL_VER} — rebuilding manifest"
  [ -f "$BOOTSTRAP" ] && node "$BOOTSTRAP" --force --quiet 2>/dev/null || true
fi

# ── 3. Rate-limited upstream check ────────────────────────────
# Honor existing 24h cadence used by /composure:update step 02. We also write
# our own `last-freshness-check` so future tightening of the cadence doesn't
# fight the user's existing autoupdate stamp.
INTERVAL=$(jq -r '.policy.check_interval_seconds // 14400' "$MANIFEST" 2>/dev/null)
NOW=$(date +%s)
LAST=0
[ -f "$FRESHNESS_STAMP" ] && LAST=$(cat "$FRESHNESS_STAMP" 2>/dev/null || echo 0)
DELTA=$((NOW - LAST))

if [ "$DELTA" -lt "$INTERVAL" ]; then
  exit 0   # within cooldown — silent
fi

MARKETPLACE_SRC="${HOME}/.claude/plugins/marketplaces/composure-suite"
[ -d "${MARKETPLACE_SRC}/.git" ] || exit 0

HEAD_SHA=$(git -C "$MARKETPLACE_SRC" rev-parse HEAD 2>/dev/null || true)
INSTALLED_SHA=$(jq -r '.installed_plugins.composure.claude_commit_sha // ""' "$MANIFEST" 2>/dev/null)
echo "$NOW" > "$FRESHNESS_STAMP"

# Touch the legacy stamp too so /composure:update step 02 stays consistent.
echo "$NOW" > "$AUTOUPDATE_STAMP"

if [ -z "$HEAD_SHA" ] || [ -z "$INSTALLED_SHA" ]; then
  exit 0   # fail-open — never block boot
fi

if [ "$HEAD_SHA" = "$INSTALLED_SHA" ]; then
  exit 0   # up to date
fi

# Count commits behind for the message. Fail-open if the ancestry isn't there.
BEHIND=$(git -C "$MARKETPLACE_SRC" rev-list --count "${INSTALLED_SHA}..${HEAD_SHA}" 2>/dev/null || echo "?")
INSTALLED_VER=$(jq -r '.installed_plugins.composure.version // "?"' "$MANIFEST" 2>/dev/null)

echo "[composure:update-available] composure ${INSTALLED_VER} is ${BEHIND} commits behind"
echo "[composure:update-available] run /composure:update — then /reload to pick up new hooks/MCP servers"

exit 0
