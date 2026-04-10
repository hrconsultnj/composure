#!/bin/bash
# ============================================================
# Auto-Update Health Check — Shared Library
# ============================================================
# Detects common auto-update misconfiguration and surfaces it
# to the user at session start. Catches silent config drift
# where users set flags that Claude Code silently ignores.
#
# Checks (throttled to once per 24h via stamp file):
#   1. DISABLE_AUTOUPDATER=1 env var (hard disable)
#   2. autoUpdatesChannel: "stable" (info, slower updates)
#   3. Misplaced `autoUpdate` flag inside extraKnownMarketplaces.*
#      (not in schema, silently ignored — classic UX trap)
#
# Sourced by session-boot.sh. Silent exit if throttled or if
# config files don't exist. Non-blocking (always returns 0).
#
# The function is defined, called, and unset in one shot so
# it doesn't pollute the caller's namespace.
# ============================================================

_composure_auto_update_check() {
  local SETTINGS_FILE="${HOME}/.claude/settings.json"
  local STAMP_FILE="${HOME}/.composure/last-autoupdate-check"

  # ── Throttle: skip if checked in last 24h ──
  if [ -f "$STAMP_FILE" ]; then
    local last
    last=$(cat "$STAMP_FILE" 2>/dev/null || echo 0)
    local now
    now=$(date +%s)
    [ $((now - last)) -lt 86400 ] && return 0
  fi

  local messages=()

  # ── Check 1: DISABLE_AUTOUPDATER env var ──
  if [ "${DISABLE_AUTOUPDATER:-0}" = "1" ]; then
    messages+=("[composure:auto-update] DISABLED — DISABLE_AUTOUPDATER=1 is set. Plugin updates will not happen. Run 'unset DISABLE_AUTOUPDATER' and restart to re-enable.")
  fi

  # ── jq-dependent checks (graceful skip if jq or settings.json missing) ──
  if [ -f "$SETTINGS_FILE" ] && command -v jq >/dev/null 2>&1; then
    # Check 2: autoUpdatesChannel set to "stable"
    local channel
    channel=$(jq -r '.autoUpdatesChannel // "latest"' "$SETTINGS_FILE" 2>/dev/null)
    if [ "$channel" = "stable" ]; then
      messages+=("[composure:auto-update] Channel: stable (~1 week behind latest). For fresh updates, set \"autoUpdatesChannel\": \"latest\" in ~/.claude/settings.json.")
    fi

    # Check 3: Misplaced autoUpdate flag inside extraKnownMarketplaces.*
    # Valid properties per JSON schema are only: installLocation, source.
    # Any extra keys (including autoUpdate) are silently ignored by Claude Code.
    local misplaced
    misplaced=$(jq -r '
      .extraKnownMarketplaces // {}
      | to_entries
      | map(select(.value.autoUpdate != null))
      | .[].key
    ' "$SETTINGS_FILE" 2>/dev/null)

    if [ -n "$misplaced" ]; then
      while IFS= read -r name; do
        [ -z "$name" ] && continue
        messages+=("[composure:auto-update] MISCONFIGURED — found 'autoUpdate' key inside extraKnownMarketplaces.${name}. This key is NOT recognized by Claude Code (valid keys: installLocation, source). The flag has no effect. Remove it; use top-level 'autoUpdatesChannel' to control updates.")
      done <<< "$misplaced"
    fi
  fi

  # ── Output ──
  if [ ${#messages[@]} -gt 0 ]; then
    printf '%s\n' "${messages[@]}"
  fi

  # ── Stamp (always, even with no messages — prevents re-check for 24h) ──
  mkdir -p "$(dirname "$STAMP_FILE")" 2>/dev/null
  date +%s > "$STAMP_FILE" 2>/dev/null

  return 0
}

_composure_auto_update_check
unset -f _composure_auto_update_check
