# src/ — Architecture & code-style law

These rules govern code under `src/`. Most are enforced by `npm run verify`;
breaking them fails the build. Treat them as law. Fix the code, never the check.

---

## Architecture — non-negotiables

### Containers are conduits. They make ZERO decisions.
WorkspaceArea and any "Area"/container only forwards events. It packages a
uniform shape and hands it to the managers. The managers decide what happens.

Forbidden inside a container:
- `.dispatch(`
- `getState()` to read state and branch on it
- functions named like `createBlockAt`, `deleteX`, `placeY` (these are decisions)
- `if` statements that choose a domain outcome

---
A choice inside a container belongs in a manager. Move it.

### Uniform shapes everywhere.
Every manager receives and returns the SAME shape type.
No bespoke signatures per manager. Same in, same out.

### Coupling: ≤ 1 caller by default.
A module is imported by exactly one parent. A second importer needs a line in
the Design Block: `SHARED MODULE JUSTIFICATION: <why>`. Enforced by `depcruise`.

### One responsibility per module.
If you can't state a module's job in one sentence with no "and", split it.
Prefer many small modules over one large one.

---

## Code style enforced by `npm run verify`

Small functions, small files, no circular deps, coupling limits, conduit purity,
strict types with no `any` leak. The build names the exact rule if you break one.

## Code style I check by reading (not yet mechanized)

1. **Named intent.** Every transform/retrieval/creation uses a named function
   whose name states intent. Readable top-to-bottom without reading line-by-line.
2. **One action set per function**, matching its name. No side errands.
3. **Meaningful variable names.** `file.content.map((block) => ...)`, never `(b) =>`.
4. **Encapsulation.** Public surface matches the module's intent. Nothing public
   that shouldn't be.
5. **Comments enhance, not crutch.** If a comment exists only because the code is
   unclear, rename the code instead.
6. **Readability over brevity.** A junior dev must follow it.
7. **CSS in separate `.css` files**, themed via CSS variables in root.
8. **Types live in `types.ts`.**
9. **State is a last resort.** Don't reach for a hook/store/stateful var unless
   100% necessary. Default to an instance variable or plain value. If you add
   state, justify it in one line.

---

## Product context (so designs fit the vision)

- Databases hold all information. UX containers render it.
- Visual/spatial layout IS data (like a DOM tree). Block position is stored.
- User describes outcomes in natural language; the AI builds the UI and writes
  the formulas. Declarative, not hand-authored formulas.
- Stage 2 (multi-user AI agents) and Stage 3 (integrations) build on this core.
  Clean coupling now prevents breakage later.
