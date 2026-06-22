---
description: Turn a raw request into a precise spec, execute it, and verify. Runs autonomously.
argument-hint: <what you want changed>
---

Request: $ARGUMENTS

Run this pipeline end to end. Do not stop for approval between phases.

1. Explore.
   If the request touches files you have not read this session, delegate to the
   `explorer` subagent to map the relevant files, current shapes, and call sites.
   Read the real code before editing. Never edit from memory of how a file looks.

2. Spec.
   Rewrite the request as a precise spec:
   - exact files, functions, and types to change
   - the shape each manager/helper receives and returns
   - the acceptance condition (what "done" looks like)
   - any frozen code that must stay byte-for-byte
   Resolve vague words yourself. Ask at most one question, and only if a missing
   decision blocks correctness.

3. Execute.
   Make the edits with find/replace. Never rewrite a whole file to regenerate
   code that did not change. Honor frozen code per CLAUDE.md: do not rename or
   restyle a body marked byte-for-byte.

4. Verify.
   Run `npm run verify`. If it fails, read the named rule, fix the code, rerun.
   A multi-file change is legitimately red until every file is done — keep going
   to green. After two failures on the same error, leave it and report.

5. Report.
   For a change touching 3+ files, delegate to the `reviewer` subagent for a
   read-only pass/fail against the acceptance condition. Otherwise just paste the
   final `npm run verify` output and a one-line summary per acceptance condition.
