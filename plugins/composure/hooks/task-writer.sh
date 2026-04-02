#!/bin/bash
# ============================================================
# Task Writer — Shared helper for PostToolUse hooks
# ============================================================
# Sourced by decomposition-check.sh (not a standalone hook).
# Provides task file initialization and section insertion.
# ============================================================

# Section headers
SECTION_CRITICAL="## 🔴 Critical"
SECTION_HIGH="## 🟡 High"
SECTION_MODERATE="## 🟢 Moderate"

# Initialize task file with section headers if needed
init_task_file() {
  local TASK_FILE="$1"
  mkdir -p "$(dirname "$TASK_FILE")" 2>/dev/null

  if [ ! -f "$TASK_FILE" ]; then
    cat > "$TASK_FILE" << HEADER
# Code Quality Tasks
<!-- Auto-detected by code quality hooks. Process with /backlog or delegate to a sub-agent. -->
<!-- Mark [x] when resolved. Delete resolved entries periodically. -->

${SECTION_CRITICAL}

${SECTION_HIGH}

${SECTION_MODERATE}

HEADER
  fi

  # Ensure all 3 sections exist
  for SECT in "$SECTION_CRITICAL" "$SECTION_HIGH" "$SECTION_MODERATE"; do
    if ! grep -qF "$SECT" "$TASK_FILE" 2>/dev/null; then
      echo -e "\n${SECT}\n" >> "$TASK_FILE"
    fi
  done
}

# Insert a block into the correct severity section
# Args: $1 = task file, $2 = target section header, remaining = block text
insert_into_section() {
  local TASK_FILE="$1"
  local target_section="$2"
  shift 2
  local block="$*"

  local insert_before=""
  case "$target_section" in
    *Critical*) insert_before="$SECTION_HIGH" ;;
    *High*)     insert_before="$SECTION_MODERATE" ;;
    *)          insert_before="" ;;
  esac

  if [ -n "$insert_before" ]; then
    local line_num
    line_num=$(grep -nF "$insert_before" "$TASK_FILE" | head -1 | cut -d: -f1)
    if [ -n "$line_num" ]; then
      head -n "$((line_num - 1))" "$TASK_FILE" > "${TASK_FILE}.tmp"
      echo -e "$block" >> "${TASK_FILE}.tmp"
      tail -n "+${line_num}" "$TASK_FILE" >> "${TASK_FILE}.tmp"
      mv "${TASK_FILE}.tmp" "$TASK_FILE"
      return
    fi
  fi
  echo -e "$block" >> "$TASK_FILE"
}
