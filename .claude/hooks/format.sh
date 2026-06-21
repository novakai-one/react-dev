#!/usr/bin/env bash
# PostToolUse hook. Runs on Edit|Write.
# Formats and lint-fixes ONLY the file that changed. Fast.
# Reads tool JSON from stdin; pulls the file path.

set -euo pipefail

file=$(jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && exit 0
case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.css) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0

npx prettier --write "$file" >/dev/null 2>&1 || true
npx eslint --fix "$file" >/dev/null 2>&1 || true
exit 0
