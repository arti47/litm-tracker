#!/usr/bin/env bash
# Project spec runner. Exits non-zero if any spec fails, so it works as a pre-commit hook or CI gate.
# These are deterministic static checks — do NOT wrap in a retry loop. Run -> read names -> fix -> re-run.
set -u
cd "$(dirname "$0")/.."

rc=0
echo "=== coverage spec (source document -> code) ==="
node scripts/coverage.js || rc=1
echo
echo "=== reachability spec (code -> user) ==="
node scripts/reachability.js || rc=1

echo
if [ "$rc" -ne 0 ]; then echo "SPECS FAILED"; else echo "ALL SPECS PASSED"; fi
exit "$rc"
