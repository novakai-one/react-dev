#!/usr/bin/env bash
# Stop hook. Runs once when a task ends, NOT per edit.
# tsc is too slow to run on every file change.
# Non-zero exit surfaces the errors back to the session.

set -uo pipefail

out=$(npx tsc --noEmit 2>&1) || {
  echo "tsc found type errors:"
  echo "$out" | grep -E "error TS" | head -30
  exit 2
}
exit 0
