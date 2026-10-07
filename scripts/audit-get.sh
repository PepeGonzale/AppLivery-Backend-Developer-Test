#!/usr/bin/env bash
#
# Show a single audit record by its id.
#
# Usage: ./scripts/audit-get.sh <audit-id>

set -euo pipefail

API_URL="${API_URL:-http://localhost:8888}"
ID="${1:-}"

if [ -z "${ID}" ]; then
  echo "Usage: $0 <audit-id>" >&2
  exit 1
fi

pretty() {
  if command -v jq >/dev/null 2>&1; then
    jq .
  elif command -v python3 >/dev/null 2>&1; then
    python3 -m json.tool
  else
    cat
  fi
}

curl --silent --show-error --fail "${API_URL}/audit/${ID}" | pretty
