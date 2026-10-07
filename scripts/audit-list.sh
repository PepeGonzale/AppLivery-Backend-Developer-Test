#!/usr/bin/env bash
#
# List the most recent radar evaluations recorded for audit.
#
# Usage: ./scripts/audit-list.sh
# Override the target with API_URL, e.g. API_URL=http://host:8888 ./scripts/audit-list.sh

set -euo pipefail

API_URL="${API_URL:-http://localhost:8888}"

pretty() {
  if command -v jq >/dev/null 2>&1; then
    jq .
  elif command -v python3 >/dev/null 2>&1; then
    python3 -m json.tool
  else
    cat
  fi
}

curl --silent --show-error --fail "${API_URL}/audit" | pretty
