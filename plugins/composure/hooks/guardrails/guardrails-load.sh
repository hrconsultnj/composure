#!/bin/bash
# ============================================================
# Guardrails Load — SessionStart hook
# ============================================================
# Detects active guardrails ruleset and reports status.
# ============================================================

GUARDRAILS_CONFIG=""
if [ -f ".composure/guardrails.json" ]; then
  GUARDRAILS_CONFIG=".composure/guardrails.json"
fi

if [ -n "$GUARDRAILS_CONFIG" ]; then
  DOMAIN_NAME=$(python3 -c "
import json
try:
  data = json.load(open('$GUARDRAILS_CONFIG'))
  print(data.get('domain', {}).get('name', 'custom'))
except:
  print('custom')
" 2>/dev/null)
  echo "[guardrails] Active ruleset: ${DOMAIN_NAME}"
fi

exit 0
