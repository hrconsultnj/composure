#!/bin/bash
# Sync version from plugin.json → marketplace.json (composure entry) + graph/package.json
# Paths adjusted for plugins/ directory structure.

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
VERSION=$(jq -r '.version' "$REPO_ROOT/.claude-plugin/plugin.json")

if [ -z "$VERSION" ] || [ "$VERSION" = "null" ]; then
  echo "Error: Could not read version from plugin.json" >&2
  exit 1
fi

# Update marketplace.json — metadata.version and composure plugin entry (plugins[0])
MARKETPLACE="$REPO_ROOT/.claude-plugin/marketplace.json"
jq --arg v "$VERSION" '.metadata.version = $v | .plugins[0].version = $v' \
  "$MARKETPLACE" > "${MARKETPLACE}.tmp" \
  && mv "${MARKETPLACE}.tmp" "$MARKETPLACE"

# Update graph/package.json (under plugins/composure/)
GRAPH_PKG="$REPO_ROOT/plugins/composure/graph/package.json"
if [ -f "$GRAPH_PKG" ]; then
  jq --arg v "$VERSION" '.version = $v' "$GRAPH_PKG" > "${GRAPH_PKG}.tmp" \
    && mv "${GRAPH_PKG}.tmp" "$GRAPH_PKG"
fi

echo "Synced version $VERSION → marketplace.json, graph/package.json"
