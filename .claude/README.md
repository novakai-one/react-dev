# .claude config

## Subagents (.claude/agents/)
Invoke with: "use the <name> subagent to ..."

- code-reviewer   review a diff before commit
- type-checker    run tsc, report errors
- test-runner     run vitest, explain failures
- refactor        multi-file structural change
- debugger        trace one bug to root cause
- ui-builder      components + styling only
- dependency-auditor  unused / outdated deps
- scorer          grade finished work vs the task
- workflow-reviewer   weekly review of prompt log + git churn

## Hooks (.claude/settings.json)
- UserPromptSubmit -> log-prompt.sh   logs every prompt to .claude/logs/prompts.jsonl
- PreToolUse Bash  -> bash-guard.sh    blocks rm -rf, force push, hard reset, .env clobber, npm publish
- PostToolUse Edit -> format.sh        prettier + eslint --fix on the changed file only
- Stop             -> typecheck.sh     tsc --noEmit once per task
- Stop             -> test.sh          vitest related on changed files

## Requires
jq, and project scripts: prettier, eslint, tsc, vitest available via npx.
