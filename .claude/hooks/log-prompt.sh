#!/usr/bin/env bash
# UserPromptSubmit hook. Logs every prompt to a jsonl file.
# Non-blocking. This is the data source for scorer and workflow-reviewer.
# Does NOT modify or block the prompt.

set -uo pipefail

logdir=".claude/logs"
mkdir -p "$logdir"

prompt=$(jq -r '.prompt // empty')
[ -z "$prompt" ] && exit 0

ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
words=$(echo "$prompt" | wc -w | tr -d ' ')

jq -n -c \
  --arg ts "$ts" \
  --arg branch "$branch" \
  --arg prompt "$prompt" \
  --argjson words "$words" \
  '{ts:$ts, branch:$branch, words:$words, prompt:$prompt}' \
  >> "$logdir/prompts.jsonl"

exit 0
