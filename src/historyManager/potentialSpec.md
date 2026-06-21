21st June - placeholder only - not confirmed design choice for implementation.

Only make changes to teh code in /historyManager.



Anything that requires workspaceArea or other components to provide a shape, if it is in the spec you can write historyManager in isolation and trust that the requirements will be met.



---





Novakai Editor — HistoryManager Spec (Undo / Redo)

Standalone contract for the undo/redo subsystem. Conforms to the existing Novakai conduit architecture as built on disk — not the aspirational spec. If this document and the code disagree, the code's existing patterns win; this fills the gap, it does not reshape what exists.

Design choice (locked): full-DocShape snapshots, not command objects. Rationale in Section 0. The consequence that matters: no manager signature changes. Managers keep returning a bare DocShape. History sits at the commit point in WorkspaceArea, captures the shape that is already flowing through, and never participates in the manager chain.

0. Why snapshots (read once, then never revisit)





A DocShape is four data references + selection. Every mutation already builds new objects by spread, so unchanged slices are shared by reference between consecutive shapes. A snapshot captures references, not deep copies — its true cost is the size of what changed, the same as a command's inverse would be.



Commands would force all five managers to emit { shape, command } and to author correct inverse logic (a wrong inverse = silent corruption). Snapshots need none of that.



Coalescing and history length — the only real snapshot weaknesses — are handled by a debounce window and a hard cap (Sections 4–5), both trivial.

This choice is final for this stage. Do not introduce DocCommand / CommandFactory. If snapshots ever become too large to hold, that is a future migration, not a reason to reopen this now.

1. Where it sits

UI event ─▶ WorkspaceArea.route ─▶ manager chain (bm→sm→dm→lm) ─▶ commit()
                                                                     │
                                              ┌──────────────────────┤
                                              │  history.record(shape) BEFORE the store write
                                              ▼
                                         DocStore / store write ─▶ React re-render

undo()/redo():
  history pops/pushes ─▶ hands a shape back to WorkspaceArea ─▶ commit path ─▶ store write ─▶ re-render


History is owned and driven by WorkspaceArea, the same single component that already owns commit(). It is NOT a manager and is NOT in the chain. It has exactly two interaction points with the rest of the system:





WorkspaceArea.commit() calls history.record(shape) when an edit changed the document (mirrors the existing docUnchanged test in commit).



An undo/redo trigger calls history.undo() / history.redo(), takes the returned shape, and runs it through the same commit path an edit uses.

No other code touches history. SM, BM, DM, LM never see it. Persistence never sees it.

2. The one decision that keeps history correct

A history entry is a document state, plus the selection that was active when that state was current. Undo must restore both — jumping the caret back to where it was is half the point of undo in an editor.

So an entry is not a bare DocShape; it is the document slices and the selection snapshot, captured together. On undo you restore the document AND the selection of the state you are returning to.

Two-pointer model, standard and sufficient:





A single ordered list of entries.



A current index into it.



undo moves current back one and returns that entry.



redo moves current forward one and returns that entry.



Recording a new edit truncates everything after current (the classic "edit after undo discards the redo branch") and appends.

3. Locked data shapes

Reuses existing types verbatim. Adds exactly one new type. No existing type is modified.

import type { DocShape, SelectionSnapshot } from "../types/types";

// One captured point in history: the document slices + the selection that was
// live for them. NOT a full DocShape — `file` identity and the live store are
// not part of an undo step; only the editable document state and its selection.
interface HistoryEntry {
  contentData:  DocShape["contentData"];
  layoutData:   DocShape["layoutData"];
  databaseData: DocShape["databaseData"];
  selection:    SelectionSnapshot;
}

// What undo()/redo() hand back to WorkspaceArea: the slices to write plus the
// selection to restore. WorkspaceArea folds these onto the CURRENT active file
// + store the same way commit() already writes slices. null = nothing to do
// (stack end reached) — WorkspaceArea does nothing on null.
type HistoryResult = HistoryEntry | null;


Note: file (the FileData and its content order) — decide explicitly. The file's content block-id list IS document state and must be part of the entry if Enter/Backspace/drag reorder it. If content order changes on edits (it does — BlockManager and LayoutManager both rewrite file.content), the entry MUST also capture file. Add file: DocShape["file"] to HistoryEntry and restore it on undo. The version below assumes this is required, because the codebase rewrites content on nearly every structural edit.

// Corrected entry — content order is document state, so file is captured.
interface HistoryEntry {
  file:         DocShape["file"];
  contentData:  DocShape["contentData"];
  layoutData:   DocShape["layoutData"];
  databaseData: DocShape["databaseData"];
  selection:    SelectionSnapshot;
}


4. Contract — HistoryManager





owns: the ordered list of HistoryEntry and the current pointer.



may call: nothing. It is a leaf. It holds arrays and an index; it neither reads the store nor touches the DOM nor calls any manager.



must NOT: touch the DOM, read or write the store, call managers, build commands, decide what an edit "means", debounce by itself reading time (the caller passes the trigger context; see coalescing note).



constructed by: WorkspaceArea (one instance, same lifetime as the workspace), held in a useRef so it survives re-renders.

Public surface

class HistoryManager {
  // Seed the baseline. Called ONCE when a document loads, with the loaded
  // shape, so the first undo has a state to return to. Clears any prior
  // history (switching documents starts fresh).
  init(shape: DocShape): void;

  // Record a new edit state. Called by WorkspaceArea.commit() AFTER a manager
  // changed the document, with the post-edit shape. Truncates any redo branch,
  // appends the entry, advances `current`, enforces the cap.
  // `coalesceKey` (optional): when the new edit's key equals the top entry's
  // key AND falls within the same logical burst, REPLACE the top entry instead
  // of appending (so a run of single-character text edits is one undo step).
  // Pass undefined for structural edits (split/delete/drop) — those always
  // append as their own discrete step.
  record(shape: DocShape, coalesceKey?: string): void;

  // Move back one state. Returns the entry now current, or null if already at
  // the oldest entry (nothing to undo).
  undo(): HistoryResult;

  // Move forward one state. Returns the entry now current, or null if already
  // at the newest entry (nothing to redo).
  redo(): HistoryResult;

  // Cheap guards for enabling/disabling UI affordances.
  canUndo(): boolean;
  canRedo(): boolean;
}


Behaviour notes (the parts that are easy to get wrong)





record truncates first. If current is not the last index (the user undid, then made a new edit), drop every entry after current before appending. This discards the redo branch — correct and expected.



undo returns the PREVIOUS entry, not the current one. After record, current points at the just-made state. undo decrements, then returns entries[current] — the state to revert TO. If current is already 0, return null and do not move.



redo is the mirror. If current is already the last index, return null.



The cap is a sliding window. When entries.length exceeds the cap after an append, drop from the FRONT (oldest) and leave current pointing at the same logical entry. Cap value: start at 100; it is a constant, tune later.



History never deep-copies. Entries store the shape's existing references. Because every mutation already produced fresh objects, two entries that share an unchanged slice share it by reference — that is the point, not a bug.

5. Contract — WorkspaceArea additions (the only wiring)

WorkspaceArea already owns route() and commit(). History adds three small things to that existing component. No new component, no chain change.

5a. Hold the instance

const history = useRef(new HistoryManager()).current;


5b. Seed on document load

Where the workspace first learns its active document (the same effect/selector that sets activeFile), call history.init(shape) once per loaded document so undo has a floor. Re-init when the active file id changes (switching documents resets history — do NOT carry one document's undo stack into another).

5c. Record inside the existing commit gate

commit() already distinguishes "document changed" from "selection-only change" via its docUnchanged test. Hook record into the SAME branch that performs a document write — so selection-only passes (caret moves) do NOT create undo steps, exactly as today they do not create document writes:

commit(shape):
  ... existing reference checks ...
  if (docUnchanged && selectionUnchanged) return
  if (docUnchanged) { state.setSelection(shape.selection); return }   // no record
  // document changed → this is the ONE place an undo step is born:
  history.record(shape, coalesceKeyFor(trigger))                       // record BEFORE the store write
  ... existing saveDocument + setDataSet + setSelection ...


coalesceKeyFor(trigger) returns a stable key for runs that should collapse into one undo step (e.g. "text:" + blockId for content-refresh on the same block) and undefined for structural triggers (Enter, Backspace, drop, canvas-click) so each is its own step.

5d. Drive undo/redo from the existing key conduit

Undo/redo are keystrokes, so they enter through the SAME router as everything else — they are NOT a special path. Add a trigger the key handler recognises (Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z) and, on it, run the returned entry through the commit path:

on undo trigger:
  const entry = history.undo()
  if (!entry) return
  applyHistory(entry)            // see 5e

on redo trigger:
  const entry = history.redo()
  if (!entry) return
  applyHistory(entry)


Important: undo/redo recording must NOT re-enter history.record. applyHistory writes to the store directly (it is restoring a recorded state, not creating a new one). Route it around the record call — either a dedicated write that skips record, or a flag the commit gate checks. The invariant: undo/redo never appends to history; only a genuine new edit does.

5e. applyHistory — restore both document and selection

applyHistory(entry):
  const files = { ...store.files, [entry.file.id]: entry.file }
  saveDocument(files, entry.contentData, entry.layoutData, entry.databaseData)
  setDataSet (files, entry.contentData, entry.layoutData, entry.databaseData)
  store.setSelection(entry.selection)
  // selection snapshot carries the caret; the existing post-render caret
  // placement path (SM/DomBridge) puts the native caret back on next render.


This reuses the exact persistence + store calls commit() already makes. The only difference from a normal commit is that the slices come from a history entry instead of a manager chain, and record is skipped.

6. The caret-after-restore seam (the known smell — handled here)

The SM file already worries about caret sequencing after a mutation. Undo makes this concrete: after applyHistory writes a restored document, the caret must land at entry.selection.caret. Because selection rides inside the snapshot and the existing render path places the native caret from it, restoring the snapshot is sufficient — no special caret call in HistoryManager. History restores the snapshot; the existing SM/render path does the placement. If caret restoration misbehaves, the fix is in the existing placement path, never in HistoryManager — HistoryManager's job ends at handing back the right snapshot.

7. What HistoryManager deliberately does NOT do





No debounce timer of its own. Coalescing is decided by the caller via coalesceKey (derived from the trigger), keeping HistoryManager a pure data structure with no clock. If a true time-window debounce is wanted later, it belongs in WorkspaceArea's record call site, not inside History.



No persistence of the undo stack. History is in-memory and per-session. Reload starts from the loaded document as the baseline. (Persisting history across reloads is a separate, later feature.)



No partial/slice-level undo. An entry is the whole document state. There is no "undo just this block." Granularity is per-edit, set by how often record is called and how coalesceKey groups edits.



No command inversion. By construction. See Section 0.

8. Build order

1. Type        HistoryEntry, HistoryResult (Section 3 — exactly)
2. Class       HistoryManager (Section 4) — pure, unit-testable with no DOM/store
3. Wiring      WorkspaceArea 5a–5e, one step at a time, verifying each:
                 a. hold instance + init on load        (no behaviour change yet)
                 b. record in the commit document-branch (undo stack fills; verify via canUndo)
                 c. undo/redo triggers + applyHistory    (round-trip a single edit)
                 d. coalesceKey for text runs            (a typed word = one undo step)


Build and verify the class in isolation FIRST (it needs no React, no store, no DOM — pure pointer arithmetic over an array). Only then wire it into WorkspaceArea. This keeps the one piece with real logic fully testable before it touches the live commit path.

9. Verification





[ ] HistoryManager imports nothing from managers, store, or DOM.



[ ] record truncates the redo branch before appending.



[ ] undo at index 0 returns null and does not move; redo at the last index returns null and does not move.



[ ] A selection-only commit (caret move) creates NO history entry.



[ ] A structural edit (Enter/Backspace/drop) creates exactly ONE entry.



[ ] A run of same-block text edits with one coalesceKey collapses to ONE entry.



[ ] undo restores BOTH document slices AND selection (caret returns to the prior position).



[ ] undo/redo do NOT append to history (no growth on round-trip).



[ ] Switching the active document re-inits and clears the prior stack.



[ ] Exceeding the cap drops oldest entries; current still points at the right logical state.



[ ] No manager signature changed; managers still return bare DocShape.



