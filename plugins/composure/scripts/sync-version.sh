#!/bin/bash
# Sync version from root plugin.json → all version consumers.
# Targets: marketplace.json, each plugin's own plugin.json, graph/package.json
# This ensures the Claude Code plugin cache invalidates on every bump.

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
VERSION=$(jq -r '.version' "$REPO_ROOT/.claude-plugin/plugin.json")

if [ -z "$VERSION" ] || [ "$VERSION" = "null" ]; then
  echo "Error: Could not read version from plugin.json" >&2
  exit 1
fi

# 1. Update marketplace.json — metadata.version + each plugin's entry
MARKETPLACE="$REPO_ROOT/.claude-plugin/marketplace.json"
PLUGIN_COUNT=$(jq '.plugins | length' "$MARKETPLACE")
UPDATE_EXPR='.metadata.version = $v'
for i in $(seq 0 $((PLUGIN_COUNT - 1))); do
  PLUGIN_NAME=$(jq -r ".plugins[$i].name" "$MARKETPLACE")
  PLUGIN_VER=$(jq -r ".plugins[$i].version" "$MARKETPLACE")
  # Only sync composure to marketplace version; others keep their own versions
  if [ "$PLUGIN_NAME" = "composure" ]; then
    UPDATE_EXPR="$UPDATE_EXPR | .plugins[$i].version = \$v"
  fi
done
jq --arg v "$VERSION" "$UPDATE_EXPR" "$MARKETPLACE" > "${MARKETPLACE}.tmp" \
  && mv "${MARKETPLACE}.tmp" "$MARKETPLACE"

# 2. Sync individual plugin plugin.json files (cache invalidation key)
for PLUGIN_JSON in "$REPO_ROOT"/plugins/*/.claude-plugin/plugin.json; do
  [ ! -f "$PLUGIN_JSON" ] && continue
  PLUGIN_NAME=$(jq -r '.name' "$PLUGIN_JSON")
  # Read this plugin's target version from marketplace.json
  TARGET_VER=$(jq -r --arg n "$PLUGIN_NAME" '.plugins[] | select(.name == $n) | .version' "$MARKETPLACE")
  [ -z "$TARGET_VER" ] || [ "$TARGET_VER" = "null" ] && continue
  CURRENT_VER=$(jq -r '.version' "$PLUGIN_JSON")
  if [ "$CURRENT_VER" != "$TARGET_VER" ]; then
    jq --arg v "$TARGET_VER" '.version = $v' "$PLUGIN_JSON" > "${PLUGIN_JSON}.tmp" \
      && mv "${PLUGIN_JSON}.tmp" "$PLUGIN_JSON"
    echo "  ↳ $PLUGIN_NAME plugin.json: $CURRENT_VER → $TARGET_VER"
  fi
done

# 3. Update graph/package.json (under plugins/composure/)
GRAPH_PKG="$REPO_ROOT/plugins/composure/graph/package.json"
if [ -f "$GRAPH_PKG" ]; then
  jq --arg v "$VERSION" '.version = $v' "$GRAPH_PKG" > "${GRAPH_PKG}.tmp" \
    && mv "${GRAPH_PKG}.tmp" "$GRAPH_PKG"
fi

echo "Synced version $VERSION → marketplace.json, plugin caches, graph/package.json"
