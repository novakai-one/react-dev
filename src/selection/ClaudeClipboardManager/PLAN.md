# ClipboardManager — Plan

## Contract (reliable)

```
receiveEvent(eventData, reactEvent, trigger, shape, range: SelectionPoint[]) -> DocShape
```

- `receiveEvent` is the ONLY public method.
- Return is always a NEW `DocShape` (never the same reference).
- `range` is the SM-built selection (SelectionPoint[]); only copy/cut read it. It is
  the LAST arg and defaults to `[]`, so the 4-arg helper shape still holds for paste.
- copy fills the buffer, no document change.
- cut fills the buffer AND removes the source blocks — returns a new shape.
- paste returns a NEW `shape` with pasted blocks merged in.

NOTE: SM's live contract today is `(eventData, trigger, shape)` — no separate
`reactEvent` arg yet (see NEWSelectionManager.receiveKeyEvent). `reactEvent` is
carried here as the 2nd param ahead of that landing ("it will soon"). When SM
starts passing it, no signature change is needed on this side.

## Behaviour spec (authoritative scenarios)

The id rule is the core distinction: COPY makes a new block, CUT moves the same block.

1. COPY → PASTE (same file). Copy A, enter (makes B), paste → new block C with a
   NEW id. C is a fresh block+instance, not a second view of A. (paste mints ids in
   copy mode.)

2. CUT → PASTE (same file). Cut A → A disappears from content (cut removes the
   source). Click elsewhere, paste → A reappears, inserted at the caret, with the
   SAME id. It is the same block, relocated. (paste preserves ids in cut mode; no
   collision because the source was already removed.) BUILT.

3. COPY across files/tabs/windows. Copy A in File 1, paste in File 2 → new block B
   (NEW id). A still shows in File 1. paste re-keys layout to the target file, so
   the block lands on File 2's canvas. Cross-FILE within one tab works on the
   singleton today. Cross-TAB / cross-WINDOW needs the buffer to cross the JS-context
   boundary, which the singleton does NOT — DEFERRED post-MVP (placeholder 2).

4. CUT → close app → reopen → paste = NOTHING. The cut block was destroyed on close;
   the buffer did not persist. (Recovery is version control's job, not clipboard's.)
   So the cut buffer must be EPHEMERAL — it must not survive an app restart.

SYNC INVARIANT (POST-MVP): blocks move across files, tabs, and windows; two windows
on the same account + same file + same workspace must stay in sync, so a user can
copy/cut in one and paste in the other. That document-state sync is the
persistence/doc layer's job, NOT clipboard's — clipboard only needs its buffer
reachable across windows (transport). DEFERRED — not required for MVP.

## What clipboard stores

A `DocShape` slice — NOT the html/tag `ClipboardBlockData` shape (that type is
not trusted). The buffer (`clipboardStore`) holds:

- `contentData`  — the selected `TextElement` records.
- `layoutData`   — the `LayoutItem` records for those blocks (keyed `fileId:blockId`).
- `databaseData` — `DatabaseConfiguration` only if a selected block is a DatabaseArea.
- `orderedIds`   — the selected block ids in DOCUMENT ORDER. Datasets are unordered
                   Records; this list carries the order paste must re-emit in, so
                   LayoutManager positions blocks against a correct sequence.
- `sourceIds`    — ids to delete on a cut paste. Empty for copy; == orderedIds for cut.
- `mode`         — "copy" or "cut".
- `file`         — NOT stored. Paste targets `shape.file` (the active file).

## Trigger routing (private)

Trigger words are EVENTS, not commands. There is NO "clipboard-copy" trigger. SM
routes raw events (e.g. "content-area-key-down") to clipboard without deciding.
Clipboard reads the KeyEventData and DETECTS the command itself — this decision is
100% internal; SM never knows clipboard copied, and that is not SM's job.

Command detection (private, `detectCommand`):
- Gate: `trigger.endsWith("-key-down")` — cmd+c can fire from any focused area, so
  the component prefix (content-area / workspace-area / database-cell / …) is irrelevant.
- Modifier: `metaKey` (mac cmd) OR `ctrlKey` (win/linux). Nothing else qualifies.
- Key: `c` -> copy, `x` -> cut, `v` -> paste. Anything else -> no command.

receiveEvent returns a NEW shape 100% of the time (matches SM.receiveKeyEvent,
which always returns buildShape). Only paste rebuilds datasets; copy / cut / no
command return `cloneShape(shape)` — same dataset refs, new top-level identity.

```
event + key            -> command -> path                            -> return
  *-key-down + cmd/c    -> copy    -> copy(selection, shape)  buffer  -> cloneShape
  *-key-down + cmd/x    -> cut     -> cut(selection, shape)   buffer  -> cloneShape
  *-key-down + cmd/v    -> paste   -> paste(eventData, reactEvent, shape) -> NEW shape
  anything else         -> none    -> no-op                          -> cloneShape
```

NOTE: "clear" has no keystroke, so it is NOT a detected command. `clipboardStore.clear()`
exists for SM to call directly if/when a clear path is wanted. Flagged, not wired.

## File layout

```
ClipboardManager.ts   public class — only receiveEvent(), routes by trigger
clipboardStore.ts     internal buffer (slice + mode + orderedIds + sourceIds)
selectionRange.ts     resolves SelectionState (anchor/focus) -> ordered id list
copy.ts               buildSlice + copy path (reads SelectionState)
cut.ts                cut path — reuses buildSlice; records sourceIds, mode="cut"
paste.ts              placement + merge, returns new immutable shape
ids.ts                regenerateIds for pasted blocks; returns idMap for nested remap
serialize.ts          slice <-> plain object (placeholder, future cross-tab)
```

## Responsibility per module

- `ClipboardManager.ts` — routing only, no logic.
- `clipboardStore.ts` — owns the buffer. hold / read / mode / orderedIds /
  sourceIds / hasContent / clear (all private use — only `receiveEvent` is public).
- `selectionRange.ts` — turns two endpoint ids into an ordered, inclusive id list
  using `file.content` (the reliable order). Normalises by index, not by anchor.
- `copy.ts` — read `SelectionState`, resolve to ordered ids, pull records into a slice.
- `cut.ts` — same as copy but mode "cut" and records sourceIds. No deletion (deferred).
- `paste.ts` — placement decision lives here (clipboard decides where).
- `ids.ts` — new ids on paste so copies never collide with source.
- `serialize.ts` — only needed for JSON / cross-tab. Placeholder for now.

## STATE AFTER BUILD

Resolved during build (matched against reliable types):

- Storage shape — buffer holds a `DocShape` slice minus `file`, PLUS `orderedIds`
  + `sourceIds` + `mode`. `contentData` + `layoutData` (keyed `fileId:blockId`) +
  `databaseData`.
- Database blocks — `block.component === "DatabaseArea"` is the test for pulling a
  `DatabaseConfiguration`. Confirmed against `TextElement.component`.
- `databaseKey(blockId)` is identity today (returns blockId). `ids.ts` re-keying of
  databaseData relies on that — fine now, but coupled: if databaseKey ever becomes
  composite, the re-key in `regenerateIds` step 4 must change too.
- Keys — using `layoutKey(fileId, blockId)` and `databaseKey(blockId)` from
  types.ts, not hand-rolled strings.
- Command source — RESOLVED. Clipboard receives a raw key EVENT (KeyEventData) and
  detects the command itself: `metaKey || ctrlKey` + `key` c/x/v. The event carries
  `key`, the four modifier flags, and `blockId` (the focused/caret block). No
  invented fields.
- Selection source — RESOLVED. KeyEventData carries ONE `blockId`, not the multi-block
  selection. SM owns selection: its `buildRange` produces a `range` (SelectionPoint[],
  each `{ elementId, offset }`) passed as receiveEvent's LAST arg. copy/cut pass it to
  `selectionRange.resolveSelectedIds`, which orders the ids by index in `file.content`
  (the reliable order LM positions against), dedupes, and drops ids not in this file.
  Block count falls out of the length. `range` defaults to `[]` so the manager works
  standalone (copy/cut then no-op).
- Cut deletion — RESOLVED (built). cut removes the source from contentData + layoutData
  + databaseData + file.content in lockstep and returns the new shape (scenario 2: block
  disappears on cut). NO LM signaling — clipboard returns data only; LM closes the hole
  on its pass, trusting file.content order (a filter preserves it). Paste in cut mode
  keeps the same ids; no collision because the source is already gone.
- Paste anchor — RESOLVED. `KeyEventData.blockId` is the caret block at paste time.
  cmd+v fires a key-down whose blockId is the focused block. Paste stacks below it.
- Ordering — RESOLVED. `orderedIds` is held in the buffer and drives both the
  layout stacking and the content-array insertion on paste, so LM sees correct order.
- Paste placement — RESOLVED. Stack directly below the anchor's bottom edge, NO gap:
  `next y = prev y + prev h`. Clipboard does NOT fix collisions — LM does — but
  clipboard guarantees correct order, which LM relies on.
- Content-insert position — RESOLVED. Paste APPENDS the pasted ids to the end of
  `file.content`, in order. Caret lands AFTER the appended ids (normal editor
  behaviour). Caret itself is SelectionManager's job, not clipboard's — clipboard
  only guarantees the appended ids are last and correctly ordered.
- Always-new-shape — RESOLVED. receiveEvent returns a fresh DocShape every call,
  even on no-op triggers (cloneShape: same dataset refs, new identity), matching
  SM.receiveKeyEvent.
- Immutability — paste shallow-copies all three datasets + the file before writing,
  returns a new shape. React diff sees new identities.

## OPEN PLACEHOLDERS (your decisions — not mine to invent)

1. NESTED REMAP — `children[]` (block nesting) and database row `cells` both hold
   ids that would need remapping through `idMap` on paste. Flat blocks only today
   (children null), so deferred. `idMap` is already returned by `regenerateIds`
   for when this lands. (SM's `range` solves multi-block SELECTION; this is the
   separate concern of rewriting ids INSIDE a copied block.)

2. TRANSPORT / BUFFER LIFETIME — DEFERRED, POST-MVP (decided).
   Cross-tab / cross-window paste (scenario 3) and the sync invariant need the buffer
   to cross the tab/window boundary. The module singleton does NOT (one JS context per
   tab). This is an advanced feature, NOT required for MVP — solved in a later build.
   For MVP the singleton is the accepted solution: single-tab copy/cut/paste works.
   Scenario 3 and the sync invariant are explicitly OUT of MVP scope. serialize.ts
   stays a placeholder until that later build. Design notes kept below for then.

## Transport / buffer lifetime  (DEFERRED — post-MVP, see placeholder 2)

The buffer must satisfy four facts at once:
- COPY crosses tabs/windows (scenario 3) and survives within a session.
- CUT crosses tabs/windows too (move a block between windows — sync invariant)...
- ...but CUT is EPHEMERAL: it must NOT survive an app restart (scenario 4).
- COPY surviving a restart is acceptable (an OS clipboard does), but not required.

The current `clipboardStore` is a module-level singleton — fine WITHIN one tab, but
it does not cross tabs/windows. So a transport is needed. `serialize.ts` is the seam:
slice <-> plain JSON for whatever transport is chosen. Candidate transports:

- OS clipboard (`navigator.clipboard`, custom MIME). Natural for copy: crosses tabs,
  windows, even apps; user-driven. Permission/async nuances. Survives restart, so
  cut would need a different/clearable path.
- BroadcastChannel — real-time push between same-origin tabs/windows, ephemeral
  (dies on close → matches cut). But a tab that opens LATER misses an earlier copy
  (no retained state), so it needs a backing store for late joiners.
- Shared backing store (sessionStorage is per-tab — no; a small server-/account-side
  buffer would match the "same account, multiple windows, in sync" invariant and is
  clearable on cut/close).

DECISION (yours, and partly NOT clipboard's): the cross-window SYNC of document state
is the persistence/doc layer's job, not clipboard's. Clipboard only needs a transport
its buffer rides on. Recommend: copy → OS clipboard (cross-everything, durable-ok);
cut → ephemeral same-origin channel (BroadcastChannel and/or account-side buffer,
cleared on app close). NOT built — confirm the transport before wiring serialize.ts.
Until then the singleton is correct for single-tab use; cross-tab is a known gap.
