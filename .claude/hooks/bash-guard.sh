#!/usr/bin/env bash
# PreToolUse hook on Bash. Blocks destructive commands before they run.
# Exit 2 = block and tell the model why.

set -uo pipefail

cmd=$(jq -r '.tool_input.command // empty')
[ -z "$cmd" ] && exit 0

deny() { echo "BLOCKED: $1"; exit 2; }

echo "$cmd" | grep -Eq 'rm[[:space:]]+-[a-z]*r[a-z]*f'        && deny "recursive force delete"
echo "$cmd" | grep -Eq 'git[[:space:]]+push.*--force'         && deny "force push"
echo "$cmd" | grep -Eq 'git[[:space:]]+reset[[:space:]]+--hard' && deny "hard reset"
echo "$cmd" | grep -Eq '>[[:space:]]*\.env'                   && deny "overwriting .env"
echo "$cmd" | grep -Eq 'npm[[:space:]]+publish'               && deny "publishing package"

exit 0
