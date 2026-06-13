# ROADMAP — Student → Anomalous Grad

> **The vision:** Pieces — a workspace app where the layout adapts to the
> user's mind, not the other way around. Pages open into workspaces that can
> be a doc, a canvas, a grid of draggable tiles. Notion-class editing,
> Obsidian-class ownership, built by one person who understands every layer.
>
> **The why:** react-pieces proved you can *architect* at mid level with AI.
> This roadmap closes the gap: prove you can *execute* at that level solo,
> then go past it into full-stack territory most grads never touch.
> Every milestone produces a thing you can demo AND a decision you can
> defend in an interview. That combination is what makes you an anomaly.

---

## ▌STATUS — read this first

```
CURRENT LEVEL .... Junior (solo) / Mid (architectural judgment, AI-assisted)
ACTIVE MILESTONE . M1 — Editing Model
LAST REVIEW ...... 2026-06-11 (baseline set by Claude code review)
LOUDEST GAP ...... Zero tests in any repo. Closed at M3, started at M1.
```

---

## ▌THE MAP

```
                        you are here
                             ▼
  ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐
  │  M1  │──▶│  M2  │──▶│  M3  │──▶│  M4  │──▶│  M5  │──▶│  M6  │
  │ Edit │   │ Grid │   │ Test │   │ Back │   │ Sync │   │ Ship │
  │ Model│   │Engine│   │ + CI │   │ End  │   │Engine│   │Pieces│
  └──────┘   └──────┘   └──────┘   └──────┘   └──────┘   └──────┘
  FRONTEND DEPTH ──────────────▶   FULL STACK ─────────▶  PRODUCT

  ══════════ LEVEL LADDER ══════════════════════════════════════
  Junior      ████████░░░░░░░░░░░░░░░░░░░░░░░░  ← M1–M2
  Mid signal  ░░░░░░░░████████░░░░░░░░░░░░░░░░  ← M3–M4
  Anomaly     ░░░░░░░░░░░░░░░░████████████████  ← M5–M6
```

| #  | Outcome                                          | Level signal            | Est.     | Status |
|----|--------------------------------------------------|-------------------------|----------|--------|
| M1 | Block editing works: split/merge/type → state    | Solid junior → mid FE   | 2–4 wks  | 🔵 ACTIVE |
| M2 | Own grid engine (drag/resize/collide), no RGL    | Mid FE + interview gold | 3–5 wks  | ⚪ |
| M3 | Vitest + GitHub Actions, core logic covered      | Employability baseline  | 1–2 wks  | ⚪ |
| M4 | Backend YOU designed: schema, RLS, auth, API     | Junior full-stack       | 3–5 wks  | ⚪ |
| M5 | Offline-first sync, conflicts resolved           | Senior-signal work      | 4–8 wks  | ⚪ |
| M6 | Merge with react-pieces → Pieces live + observed | Shipped product         | 3–6 wks  | ⚪ |

`⚪ not started 🔵 active 🟡 in review 🟢 done`
**Total: ~4–7 months part-time. Ambitious, not fantasy.**

---

## ▌HOW MILESTONES WORK

```
  build ──▶ exit criteria all ✓ ──▶ Claude PR-style review ──▶ verbal drill
                                          │                        │
                                     fails: review log       can't explain:
                                     entry + fix list        not done yet
```

A milestone is DONE when: every exit criterion is checked, the code survives
a review, and you can explain every "Can explain" item out loud without notes.
Structure of this file is frozen — only checkboxes and review logs change.

---

## M1 — EDITING MODEL ▸ react-dev

> Solve the contentEditable/React conflict YOUR way. This is the decision
> Slate, Lexical and ProseMirror exist for. react-pieces dodged it per-tile;
> here you face it for a document.

```
  keystroke ──▶ intercept ──▶ update normalized store ──▶ React re-renders
                   │
            you own the DOM. React never fights the browser.
```

### Exit criteria
- [ ] State is normalized: `Record<id, Block>` + parent/child ids. No nested arrays as source of truth.
- [ ] Tree derived from flat state by recursive selector — grandchildren render (fixes buildTree).
- [ ] Enter splits a block at caret. Backspace at block-start merges with previous.
- [ ] Typing updates store; refresh restores exact document (localStorage).
- [ ] Store exposes addBlock / updateBlock / deleteBlock / moveBlock. Components never mutate.
- [ ] Every `.map` has a stable `key`. Caret position survives re-render.

### Tasks
- [ ] Decide: controlled (intercept all keys) vs reconciled (contentEditable + sync back). Write the decision + trade-offs as a comment block in the store.
- [ ] Migrate `TextElement[]` → normalized `Record<id, Block>` in Zustand.
- [ ] Write recursive `selectTree(state)` selector. Test manually with 3-level nesting.
- [ ] Move hardcoded data out of LeftPanel into store initial state.
- [ ] Implement keydown router in ContentArea: Enter, Backspace, printable chars.
- [ ] Caret management: save/restore caret across re-renders (the hard 20%).
- [ ] Persist store to localStorage (subscribe middleware), hydrate on load.

### Can explain (verbal drill — no notes)
- [ ] Why does React fight contentEditable? What do Lexical/Slate do about it?
- [ ] Why normalize state? What breaks with nested arrays as source of truth?
- [ ] Why do keys matter — what actually goes wrong without them?
- [ ] Why is caret restoration needed after a controlled re-render?

### Review log
| Date | Verdict | Notes |
|------|---------|-------|
| 2026-06-11 | baseline | Pre-M1: missing keys, data in components, store read-only, tree 1 level deep. |

---

## M2 — LAYOUT ENGINE ▸ react-dev

> Rebuild what RGL v2 does — drag, resize, collide — as YOUR code you can
> debug. react-pieces has a CollisionManager already; this time the whole
> engine is yours. Interview story: "I replaced a dependency I couldn't
> reason about."

### Exit criteria
- [ ] Tiles drag via pointer events; position is grid-snapped state, not DOM mutation.
- [ ] Resize from corner/edge handles with min/max constraints.
- [ ] Collision: tiles push or block (configurable) — port/replace CollisionManager logic, solo.
- [ ] 60fps drag with 50 tiles (transform-based movement, rAF, measured in DevTools).
- [ ] Engine is a self-contained module: typed public API, zero app imports.

### Tasks (expand on arrival)
- [ ] Pointer event capture + coordinate → grid-unit math.
- [ ] Drag ghost via `transform`, commit to state on drop.
- [ ] Collision resolution pass.
- [ ] Performance profiling pass — React DevTools profiler + Performance tab.

### Can explain
- [ ] Why transform instead of top/left during drag?
- [ ] Pointer events vs mouse events — what do you get?
- [ ] How does your collision algorithm work, step by step, on a whiteboard?
- [ ] When is useMemo pointless? Where did memoization actually matter here?

### Review log
| Date | Verdict | Notes |
|------|---------|-------|

---

## M3 — TESTS + CI ▸ both repos

> The single loudest student→professional signal. Everything in M1/M2 that
> is pure logic (tree builder, store actions, collision math, caret math)
> gets locked behind tests BEFORE M4 builds on top of it.

### Exit criteria
- [ ] Vitest: store actions, selectTree, split/merge logic, collision resolution — all covered.
- [ ] At least one React Testing Library test: render → keystroke → assert state.
- [ ] GitHub Actions: lint + typecheck + test on every push. Red X blocks you, by your own rule.
- [ ] One bug found BY a test before you found it manually (log it below — this is the proof tests pay).

### Tasks (expand on arrival)
- [ ] Vitest + RTL setup in react-dev.
- [ ] Write tests for the gnarliest M1 function first.
- [ ] `.github/workflows/ci.yml`.

### Can explain
- [ ] What do you test vs not test? Why is collision math ideal and CSS pointless?
- [ ] What's the difference between a unit test and an RTL component test?
- [ ] Why test before refactoring rather than after?

### Review log
| Date | Verdict | Notes |
|------|---------|-------|

---

## M4 — BACKEND, DESIGNED NOT CONSUMED ▸ react-dev

> You've pushed to Supabase; you've never designed it. This milestone is the
> difference. Supabase is fine as the platform — every decision must be
> yours and written down.

```
  ┌─────────┐     ┌──────────────────────────────┐
  │ Client  │────▶│ Postgres: users / pages /    │
  │ (store) │◀────│ blocks / workspaces          │
  └─────────┘     │ RLS: row-level auth YOU wrote│
                  │ Migrations: SQL files in git │
                  └──────────────────────────────┘
```

### Exit criteria
- [ ] Schema designed on paper first: ER diagram committed to repo. Blocks/pages/users/workspaces.
- [ ] Migrations are SQL files in version control — not dashboard clicks.
- [ ] RLS policies written and TESTED: user A provably cannot read user B's pages.
- [ ] Auth flow understood end-to-end: you can draw what happens to a JWT from login → DB query.
- [ ] Store syncs to backend: load on auth, save on change (naive save is fine — M5 fixes it).
- [ ] One deliberate decision documented: e.g. "blocks as rows vs JSONB document — chose X because…"

### Tasks (expand on arrival)
- [ ] ER diagram. Get it reviewed before writing SQL.
- [ ] Migrations + seed script.
- [ ] RLS policies + a test script that tries to violate them.
- [ ] Auth integration + protected client routes.

### Can explain
- [ ] Walk through your schema. Why is `parent_id` on blocks and not a join table?
- [ ] What is RLS actually doing at query time?
- [ ] What's in a JWT? Where is it validated?
- [ ] Rows vs JSONB for document storage — trade-offs?

### Review log
| Date | Verdict | Notes |
|------|---------|-------|

---

## M5 — SYNC ENGINE ▸ react-dev ░ ANOMALY ZONE ░

> The actual hard problem of Notion-class apps. Offline-first, optimistic
> updates, two tabs editing one page and converging. Almost no grad
> portfolio has this. That's the point.

```
  Tab A ──┐                       ┌── Tab B
          ▼                       ▼
     local store ◀── conflict ──▶ local store
          │        resolution        │
          └────────▶ server ◀────────┘
              (eventual convergence)
```

### Exit criteria
- [ ] Edits work offline; queue flushes and converges on reconnect.
- [ ] Optimistic updates: UI never waits on the network; rollback on rejection.
- [ ] Two tabs editing the same page converge to the same state (demo-able).
- [ ] Conflict strategy chosen DELIBERATELY (last-write-wins per block / version vectors / CRDT lib) with written rationale — LWW honestly beats CRDT cargo-culted.
- [ ] Sync logic covered by tests (this is where M3 pays off).

### Tasks (expand on arrival)

### Can explain
- [ ] Why is "just save on every keystroke" broken?
- [ ] Your conflict strategy vs CRDTs — what did you trade away and why is it acceptable?
- [ ] What happens, step by step, when a queued offline edit hits a stale server row?

### Review log
| Date | Verdict | Notes |
|------|---------|-------|

---

## M6 — SHIP PIECES ▸ merge + production

> react-dev's engine + react-pieces' selection architecture become one app:
> Pieces, live, observed, documented. The portfolio centerpiece.

### Exit criteria
- [ ] Merge plan written BEFORE merging: what survives from each repo, what dies, why.
- [ ] Pieces deployed (Vercel) with a real domain. Usable by a stranger without instructions.
- [ ] Error tracking live (Sentry) — you've seen and fixed one real production error.
- [ ] Performance audited: Lighthouse + profiler, one real fix documented.
- [ ] ARCHITECTURE.md: diagrams + the 5 biggest decisions and their trade-offs. Written for the interviewer who has 10 minutes.
- [ ] README that sells it: what, why, gif/demo link, stack, architecture link.

### Tasks (expand on arrival)

### Can explain
- [ ] The whole system, on a whiteboard, in 5 minutes.
- [ ] The worst decision you made across M1–M6 and what you'd do differently.

### Review log
| Date | Verdict | Notes |
|------|---------|-------|

---

## ▌SKILLS LEDGER — what each milestone banks

```
                          M1   M2   M3   M4   M5   M6
State architecture        ██   ░    ░    ░    █    ░
React internals           ██   █    ░    ░    ░    ░
DOM / events / perf       █    ██   ░    ░    ░    █
Testing & CI              ░    ░    ██   ░    █    ░
Data modeling / SQL       ░    ░    ░    ██   ░    ░
Auth & security           ░    ░    ░    ██   ░    ░
Distributed thinking      ░    ░    ░    ░    ██   ░
Production ops            ░    ░    ░    ░    ░    ██
Communicating decisions   █    █    █    █    █    ██
```

---

## ▌RULES OF THE ROAD

1. **Frozen structure.** Only checkboxes, status icons, and review-log rows change.
2. **No milestone skipping.** M5 without M3's tests is how sync engines kill projects.
3. **Review gate is real.** Claude reviews like a senior on a PR. "Works" ≠ "passes review."
4. **Verbal drill is real.** If you can't explain it without notes, the box stays unchecked.
5. **Estimates are part-time honest.** Slipping is data, not failure — log it, don't hide it.
6. **This file is the source of truth.** Mirror to Notion if you want views. Never sync backwards.
