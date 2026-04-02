#!/bin/bash
# ============================================================
# Dynamic Plugin Suite Manifest
# ============================================================
# Walks all plugins and counts skills, hooks, MCP tools,
# languages, and templates. Outputs JSON to stdout.
#
# Usage:
#   bash scripts/manifest.sh              # JSON to stdout
#   bash scripts/manifest.sh --summary    # Human-readable summary
#
# Consumed by: README.md references, composure-pro.com, marketplace.json

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLUGINS_DIR="$REPO_ROOT/plugins"

# Count skills per plugin
total_skills=0
skills_json="{"
for plugin_dir in "$PLUGINS_DIR"/*/; do
  plugin_name=$(basename "$plugin_dir")
  skill_dir="$plugin_dir/skills"
  if [ -d "$skill_dir" ]; then
    count=$(ls -d "$skill_dir"/*/ 2>/dev/null | wc -l | tr -d ' ')
    skills_json="${skills_json}\"${plugin_name}\":${count},"
    total_skills=$((total_skills + count))
  fi
done
skills_json="${skills_json%,}}"

# Count hooks per plugin (matcher entries in hooks.json)
total_hooks=0
hooks_json="{"
for hooks_file in "$PLUGINS_DIR"/*/hooks/hooks.json; do
  [ ! -f "$hooks_file" ] && continue
  plugin_name=$(basename "$(dirname "$(dirname "$hooks_file")")")
  count=$(grep -c '"matcher"' "$hooks_file" 2>/dev/null || echo 0)
  hooks_json="${hooks_json}\"${plugin_name}\":${count},"
  total_hooks=$((total_hooks + count))
done
hooks_json="${hooks_json%,}}"

# Count MCP tools (from composure graph server.ts)
mcp_tools=$(grep -c 'server\.tool(' "$PLUGINS_DIR/composure/graph/src/server.ts" 2>/dev/null || echo 0)

# Count languages enforced by no-bandaids
enforcement_langs=$(grep -c 'case "' "$PLUGINS_DIR/composure/hooks/no-bandaids.sh" 2>/dev/null || echo 0)

# Count graph-indexed languages
graph_langs=$(grep -c '"' "$PLUGINS_DIR/composure/graph/src/parser.ts" 2>/dev/null | head -1)
# Better: count from known parsers
graph_parsers=0
for parser in parser.ts sql-parser.ts config-parser.ts pkg-parser.ts md-parser.ts sh-parser.ts; do
  [ -f "$PLUGINS_DIR/composure/graph/src/$parser" ] && graph_parsers=$((graph_parsers + 1))
done

# List all skill names
skill_list="["
for plugin_dir in "$PLUGINS_DIR"/*/; do
  plugin_name=$(basename "$plugin_dir")
  skill_dir="$plugin_dir/skills"
  [ ! -d "$skill_dir" ] && continue
  for skill in "$skill_dir"/*/; do
    [ ! -d "$skill" ] && continue
    sname=$(basename "$skill")
    skill_list="${skill_list}\"${plugin_name}:${sname}\","
  done
done
skill_list="${skill_list%,}]"

if [ "$1" = "--summary" ]; then
  echo "Plugin Suite Manifest"
  echo "====================="
  echo "Plugins:      $(ls -d "$PLUGINS_DIR"/*/ | wc -l | tr -d ' ')"
  echo "Skills:       $total_skills"
  echo "Hooks:        $total_hooks"
  echo "MCP tools:    $mcp_tools"
  echo "Graph parsers: $graph_parsers"
  echo ""
  echo "Per plugin:"
  for plugin_dir in "$PLUGINS_DIR"/*/; do
    pname=$(basename "$plugin_dir")
    scount=$(ls -d "$plugin_dir/skills"/*/ 2>/dev/null | wc -l | tr -d ' ')
    hcount=$(grep -c '"matcher"' "$plugin_dir/hooks/hooks.json" 2>/dev/null || echo 0)
    echo "  $pname: $scount skills, $hcount hooks"
  done
else
  cat <<EOF
{
  "generated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "totals": {
    "plugins": $(ls -d "$PLUGINS_DIR"/*/ | wc -l | tr -d ' '),
    "skills": $total_skills,
    "hooks": $total_hooks,
    "mcp_tools": $mcp_tools,
    "graph_parsers": $graph_parsers
  },
  "skills_per_plugin": $skills_json,
  "hooks_per_plugin": $hooks_json,
  "all_skills": $skill_list
}
EOF
fi
