# VERIFY_SETUP.md — One-time setup for `npm run verify`

Give this file to Claude with the instruction:
**"Set up `npm run verify` exactly as specified in this file. Show me each file
you create/change, then run it and paste the output."**

This builds the guardrail layer that lets you run Claude unsupervised. Once it
exists, every task ends in `npm run verify` and Claude self-corrects against it.

---

## 1. Install dev dependencies

```bash
npm i -D dependency-cruiser eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

(You already have ESLint + TS; this ensures depcruiser and the TS eslint plugin
are present.)

---

## 2. package.json — add the verify script

```jsonc
"scripts": {
  "verify": "npm run verify:types && npm run verify:lint && npm run verify:deps && npm run verify:conduit",
  "verify:types": "tsc --noEmit",
  "verify:lint": "eslint src --max-warnings 0",
  "verify:deps": "depcruise src --config .dependency-cruiser.cjs",
  "verify:conduit": "node scripts/verify-conduit.mjs"
}
```

A single `npm run verify` now runs: types → lint → coupling → conduit purity.
Any failure stops the chain and names the broken rule.

---

## 3. ESLint — size & complexity caps (encodes "one responsibility")

Add these rules to `eslint.config.js` (flat config). Tune numbers to taste.

```js
rules: {
  "max-lines": ["error", { max: 200, skipBlankLines: true, skipComments: true }],
  "max-lines-per-function": ["error", { max: 40, skipBlankLines: true, skipComments: true }],
  "complexity": ["error", 8],
  "max-depth": ["error", 3],
  "@typescript-eslint/no-explicit-any": "error",
}
```

Why: these are the mechanical proxy for "small modules, one job, low
complexity." Claude can't drift past them — the build fails.

---

## 4. dependency-cruiser — encodes coupling + conduit rules

Create `.dependency-cruiser.cjs`:

```js
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "No circular dependencies.",
      from: {},
      to: { circular: true },
    },
    {
      name: "workspacearea-is-conduit",
      severity: "error",
      comment:
        "WorkspaceArea must not import block/selection/drag/layout MANAGERS' decision modules directly beyond the manager entrypoints it routes to.",
      from: { path: "components/workspace/WorkspaceArea\\.tsx$" },
      to: {
        path: "(blockMutations|blockManager|selectionManager|collisionManager)",
        pathNot: "receive", // routing entrypoints are allowed
      },
    },
    {
      name: "no-orphan-decisions-in-containers",
      severity: "error",
      comment: "Container components must not import stores to branch on state.",
      from: { path: "(WorkspaceArea|ContentArea|CanvasArea)\\.tsx$" },
      to: { path: "store/useBlockEventStore" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
  },
};
```

Adjust the `path` regexes to match your actual file names. This is your Rule 8
(minimal coupling) and Rule 1.1 (conduit) turned into a failing check.

> To add a coupling exception later, Claude must add it here explicitly AND
> record a `SHARED MODULE JUSTIFICATION` in its design block. Silent additions
> fail the build.

---

## 5. Conduit grep gate — the "NEVER do this" example, enforced

Create `scripts/verify-conduit.mjs`:

```js
import { readFileSync } from "node:fs";

// Files that must remain pure conduits (no decisions).
const CONDUITS = [
  "src/components/workspace/WorkspaceArea.tsx",
];

// Patterns that signal a DECISION made inside a conduit. Forbidden.
const FORBIDDEN = [
  /\.dispatch\(/,                 // firing decisions
  /getState\(\)\.\w+\s*\?\?/,     // reading + defaulting state to branch
  /const\s+create\w+At\b/,        // createBlockAt-style decision makers
  /const\s+(delete|place|insert)\w+\b\s*=/,
];

let failed = false;
for (const file of CONDUITS) {
  let src;
  try { src = readFileSync(file, "utf8"); } catch { continue; }
  for (const pattern of FORBIDDEN) {
    if (pattern.test(src)) {
      console.error(`CONDUIT VIOLATION in ${file}: ${pattern}`);
      console.error("  -> A container made a decision. Move it into a manager.");
      failed = true;
    }
  }
}

if (failed) {
  console.error("\nverify:conduit FAILED. See CLAUDE.md section 1.1.");
  process.exit(1);
}
console.log("verify:conduit passed.");
```

This is your exact "createBlockAt is WRONG" rule, now mechanical. If Claude
writes a decision into WorkspaceArea, `npm run verify` fails and tells it why.

---

## 6. Wire it into CLAUDE.md (already done)

CLAUDE.md section 0 already says: every task ends in `npm run verify`, paste the
output, never edit the guardrail to pass. Together they form the loop:

```
design block -> approve -> code -> npm run verify -> pass? done : fix & repeat
```

That loop is what lets Claude run for long stretches without you holding its
hand — the checks are the hands now.

---

## 7. Tuning note

Start strict (the numbers above). If a cap is genuinely too tight for a
legitimate module, raise that ONE number deliberately and say why — don't let
Claude raise it silently to pass. The whole point is that the guardrail only
moves when YOU move it.