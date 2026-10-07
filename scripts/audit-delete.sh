#!/usr/bin/env bash
#
# Delete a single audit record by its id.
#
# Usage: ./scripts/audit-delete.sh <audit-id>

set -euo pipefail

API_URL="${API_URL:-http://localhost:8888}"
ID="${1:-}"

if [ -z "${ID}" ]; then
  echo "Usage: $0 <audit-id>" >&2
  exit 1
fi

STATUS=$(
  curl --silent --show-error \
    -o /dev/null \
    -w "%{http_code}" \
    -X DELETE \
    "${API_URL}/audit/${ID}"
)

if [ "${STATUS}" = "204" ]; then
  echo "Audit record ${ID} deleted."
else
  echo "Could not delete audit record ${ID} (HTTP ${STATUS})." >&2
  exit 1
fi
