#!/usr/bin/env bash
# Stop hook. Runs the test suite once when a task ends.
# Uses `related` so only tests touching changed files run, if git is clean enough.

set -uo pipefail

changed=$(git diff --name-only HEAD 2>/dev/null | grep -E '\.(ts|tsx)$' || true)

if [ -z "$changed" ]; then
  exit 0
fi

# shellcheck disable=SC2086
out=$(npx vitest related --run $changed 2>&1) || {
  echo "test failures:"
  echo "$out" | tail -30
  exit 2
}
exit 0
