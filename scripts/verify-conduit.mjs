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
