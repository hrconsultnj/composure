#!/usr/bin/env bash
# ============================================================
# cache-heal.sh — Keep stale composure plugin cache dirs alive
# ============================================================
# Runs from composure's SessionStart hook on every user's machine.
# Ensures that older cached version dirs always contain fresh content
# so running sessions bound to stale CLAUDE_PLUGIN_ROOT paths never
# see "Plugin directory does not exist" transcript spam.
#
# Problem: Claude Code caches plugins at
#   ~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/
# and binds CLAUDE_PLUGIN_ROOT per-session to that exact path. The
# official 7-day orphan sweep is broken in practice (see
# anthropics/claude-code#14061, #29074, #13799, #15642, #18426) —
# old version dirs either accumulate forever OR get cleaned up out
# from under running sessions, and hook scripts start failing.
#
# Fix: when a session starts from the NEWEST cached version, mirror
# its content into every older sibling version dir via rsync. Older
# sessions see fresh scripts in their (stale-numbered) cache dirs and
# keep running. This makes every user's machine self-heal on session
# start without requiring any dev-side action.
#
# Only the newest-version session performs the mirror. Older sessions
# exit immediately to avoid downgrading newer dirs. A mkdir-based
# lockfile prevents concurrent heals from racing.
#
# This script must never block a session and must never emit stderr.
# Every error path exits 0.
# ============================================================

set +e  # never propagate non-zero

# Bail silently if we can't see our own plugin root (nothing to heal from)
[ -z "${CLAUDE_PLUGIN_ROOT:-}" ] && exit 0
[ -d "$CLAUDE_PLUGIN_ROOT" ] || exit 0

# Parent dir holds all cached versions of this plugin
PARENT="$(dirname "$CLAUDE_PLUGIN_ROOT")"
[ -d "$PARENT" ] || exit 0

# Need rsync. If missing (uncommon on macOS/Linux, common on bare Windows
# without git-bash), silently skip.
command -v rsync >/dev/null 2>&1 || exit 0

# Find the newest version dir via semver sort. `ls | sort -V` handles
# strings like 1.47.59 vs 1.47.60 correctly.
NEWEST_NAME=$(ls -1 "$PARENT" 2>/dev/null | sort -V | tail -1)
[ -z "$NEWEST_NAME" ] && exit 0

NEWEST_DIR="$PARENT/$NEWEST_NAME"
[ -d "$NEWEST_DIR" ] || exit 0

# Only act if WE are the newest. Older sessions defer to newer ones —
# this avoids the "older session downgrades the newer cache" race.
CURRENT_REAL="$(cd "$CLAUDE_PLUGIN_ROOT" 2>/dev/null && pwd -P)"
NEWEST_REAL="$(cd "$NEWEST_DIR" 2>/dev/null && pwd -P)"
[ -z "$CURRENT_REAL" ] || [ -z "$NEWEST_REAL" ] && exit 0
[ "$CURRENT_REAL" = "$NEWEST_REAL" ] || exit 0

# Concurrent-heal protection. mkdir is atomic across processes on POSIX
# filesystems. If another session is already healing, we skip this round.
LOCKDIR="$PARENT/.cache-heal.lock"
if ! mkdir "$LOCKDIR" 2>/dev/null; then
  exit 0
fi
trap 'rmdir "$LOCKDIR" 2>/dev/null' EXIT

# Mirror our content into every older sibling dir
healed=0
for sibling in "$PARENT"/*/; do
  [ -d "$sibling" ] || continue
  SIBLING_REAL="$(cd "$sibling" 2>/dev/null && pwd -P)"
  [ -z "$SIBLING_REAL" ] && continue
  [ "$SIBLING_REAL" = "$CURRENT_REAL" ] && continue

  # --delete removes files in sibling that no longer exist in current.
  # --exclude keeps .git and node_modules out of the mirror to avoid
  # gigantic copies. 2>/dev/null on rsync: if permissions or something
  # else fails, we skip that sibling and continue.
  if rsync -a --delete --quiet \
      --exclude '.git' \
      --exclude 'node_modules' \
      "$CLAUDE_PLUGIN_ROOT/" "$sibling/" 2>/dev/null; then
    healed=$((healed + 1))
  fi
done

# Completely silent on success. Any output from SessionStart hooks
# gets swallowed by the statusMessage UI anyway, and we don't want
# transcript spam even on the success path.
exit 0
