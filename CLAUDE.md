# Novakai

AI-first declarative workspace (Notion/Excel/Obsidian replacement).
Stack: React + Vite + TypeScript. Storage: Supabase (currently local storage).

Architecture + code-style law lives in `src/CLAUDE.md`. It loads automatically
when you read or edit files under `src/`. Do not duplicate it here.

---

## Workflow gate (every task)

For any task that creates or changes a module, output a **Design Block** and
STOP for my approval before writing code:

```
DESIGN BLOCK
- Module: <name>
- Single responsibility (one sentence): <...>
- Public surface (methods/props only): <...>
- Allowed callers (who may import this): <...>
- Shape it receives / returns: <...>
- Rules it could violate + how I avoid them: <...>
```

Trivial task (typo, comment, rename): say "trivial — skipping design block" and proceed.

A task is NOT done until `npm run verify` passes. Run it and paste the output.
"I believe it passes" is a failure. If it fails twice on the same point, leave
that error and report back after the session.

## Execution boundary

Fix knock-on errors one level out. Stop at the second level.

```
your change  ->  direct knock-on (FIX)  ->  secondary knock-on (STOP, report)
```

Example: a change in WorkspaceArea breaks DragContainer — fix DragContainer.
If fixing DragContainer breaks a third component, leave it and report back.

## Working style

- Don't plan more than ~10 seconds without executing. Plan a little, execute,
  build, find errors, fix, repeat.
- Work in small verifiable chunks: one module → design block → code → verify → next.
- Mistakes are fine; we fix them. Don't get stuck.

## The guardrails are law

`npm run verify` enforces the architecture and style rules. Read its error — it
names the rule you broke. Never weaken or delete a verify rule to make code pass.
If a rule blocks you and you think it's wrong, say so and wait. Fix the code, not
the check.

## Deeper docs

- `docs/VERIFY_SETUP.md` — what `npm run verify` runs and why.
- `docs/SUPABASE_SETUP.md` — storage setup.
- `docs/BuildPlan/` — roadmap.
