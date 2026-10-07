#!/usr/bin/env bash
#
# Run one official test case (or all of them) against a running server, with
# full detail. tests.sh reports only OK/FAIL for the whole batch and aborts on
# the first failure; this lets you isolate a single case without touching the
# official file.
#
# Usage:
#   ./scripts/run-test.sh 3        # run case #3
#   ./scripts/run-test.sh all      # run every case
#
# Override the target with API_URL, e.g.:
#   API_URL=http://host:8888 ./scripts/run-test.sh 3

set -euo pipefail

API_URL="${API_URL:-http://localhost:8888}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CASES_FILE="${CASES_FILE:-${DIR}/../test_cases.txt}"

green="$(tput setaf 2 2>/dev/null || true)"
red="$(tput setaf 1 2>/dev/null || true)"
cyan="$(tput setaf 6 2>/dev/null || true)"
reset="$(tput sgr0 2>/dev/null || true)"

load_cases() {
  grep -v '^#' "${CASES_FILE}" | awk 'NF'
}

run_case() {
  local number="$1"
  local line input expected output

  line="$(load_cases | sed -n "${number}p")"
  if [ -z "${line}" ]; then
    echo "Case ${number} not found in ${CASES_FILE}" >&2
    return 2
  fi

  input="${line%%|*}"
  expected="${line#*|}"

  output="$(curl --silent --show-error \
    -H "Content-Type: application/json" \
    -X POST \
    -d "${input}" \
    "${API_URL}/radar")"

  if [ "${output}" = "${expected}" ]; then
    echo "Test ${number} : ${green}[  OK  ]${reset}"
    return 0
  fi

  echo "Test ${number} : ${red}[ FAIL ]${reset}"
  echo " > ${cyan}INPUT${reset}:    ${input}"
  echo " > ${cyan}EXPECTED${reset}: ${expected}"
  echo " > ${cyan}OUTPUT${reset}:   ${output}"
  return 1
}

total="$(load_cases | wc -l | tr -d ' ')"

if [ "${1:-}" = "all" ] || [ -z "${1:-}" ]; then
  failures=0
  for number in $(seq 1 "${total}"); do
    run_case "${number}" || failures=$((failures + 1))
  done
  echo
  echo "$((total - failures))/${total} passed"
  [ "${failures}" -eq 0 ]
else
  run_case "$1"
fi
