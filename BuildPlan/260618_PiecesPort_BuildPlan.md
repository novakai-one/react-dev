# React-Pieces → react-dev Port — Build Plan

Built 18/06/2026.

## Terminology

**`piece` is gone.** react-dev's vocabulary is **block / Block**. Anything in the React-Pieces source named `piece*`, `tile*`, or `row*` ports as `block*`. Concretely:

- `BlockType` → `BlockType` (values: `"content-area"` for now; future `"canvas-area"`, `"database-cell"`)
- `rowId`, `tileId` → `blockId`
- `RowData[]` → `_blockOrder: string[]` (just the ordered ids — see Phase 6.4)
- `ClipboardTileData` → `ClipboardBlockData`
- `_selectedTileIds` → `_selectedBlockIds`
- `_handleTile*` → `_handleBlock*`
- `data-rowid`, `data-tileid` → `data-blockid` (one attribute, one name, everywhere)
- Class names: `Row`, `Tile` (component) → `ContentArea`, `DragContainer` (already react-dev names — just keep them)

If you see "piece", "tile", or "row" in any new file you write, it's a porting mistake.

## DOM CLIMBING SAFETY — read this twice

**Never read or persist the outer wrapper's `innerHTML`.** Only ever read the `[contenteditable="true"]` element directly.

```tsx
// ContentArea renders:
<div className="content-area">           ← outer wrapper. DO NOT read its innerHTML.
    <Tag contentEditable={true} ...>     ← THIS is the editable. Read THIS innerHTML.
        ...inner content...
    </Tag>
</div>
```

If `_readBlockContent` ever reads the outer `.content-area` div's `innerHTML`, the saved string will look like `<p>hello</p>`. On reload, react-dev renders `<div className="content-area"><Tag>...innerContent...</Tag></div>` and dumps the saved string into the Tag's innerText. Result on second load: `<p><p>hello</p></p>`. Every save doubles the wrapping. Within a few reloads the tree is unrecoverable.

The safe lookup pattern (port of Pieces lines 1233–1244, do not deviate):

```ts
const blockEl  = wsaEl.querySelector<HTMLElement>(`[data-blockid="${blockId}"]`)
const editable = blockEl?.matches('[contenteditable="true"]')
    ? blockEl
    : blockEl?.querySelector<HTMLElement>('[contenteditable="true"]')
if (!editable) return null
const rawHTML = editable.innerHTML        // ← from the editable, never from the wrapper
```

This works whether `data-blockid` is on the editable Tag (current plan) or on a parent (e.g. `.content-area`). The `matches(...)` branch handles both.

## Where to put `data-blockid` (clarification of Phase 1)

- **`DragContainer` outer div**: `data-blockid={id}` — for rubber-band hit-tests + DM's `elementFromPoint().closest()`.
- **`ContentArea` inner `<Tag>` (the contentEditable)**: `data-blockid={id}` — for SM text-node walks.
- **`ContentArea` outer `.content-area` wrapper**: NO `data-blockid`. Adding it here would make the wrapper a candidate for DOM walks and risks the double-wrap above.

DragContainer and ContentArea both carry the **same id** (the TextElement id) on their respective `data-blockid` — they are two layers of the same logical block.

## Deferred design refactors (do NOT do during the port)

The following improvements were flagged but are explicitly out of scope for this migration. Port mechanically first, refactor second.

- Split SM into siblings (`HighlightRenderer`, `ClipboardManager`, `BlockSelectionManager`) — defer.
- Decouple helpers from React event types (pre-extract fields, pass `preventDefault: () => void`) — defer.
- Replace keyboard switch with a `Map<KeyCombo, Handler>` for extensibility — defer.
- Move `_formattingTarget` out of SM into a future `FormattingManager` — defer (Toolbar isn't ported yet).

Open a follow-up plan in `BuildPlan/` after the acceptance checklist passes.

## Non-negotiable rule (read first, do not violate)

WSA is the **only** conduit. Every event from any sub-component (`DragHandle`, `DragContainer`, `ContentArea`, future `Block` types, document-level listeners) is forwarded to WSA. WSA forwards to the helper classes (`SelectionManager`, `DragManager`, future `ClipboardManager`, `BlockSelectionManager`). Helpers **never** attach DOM listeners. Helpers **never** import each other. Components **never** import helpers.

```
            ┌──────────────── WorkspaceArea (ONLY conduit) ────────────────┐
DragHandle ─┤                                                              │
DragContnr ─┤  handleMouseEvent(mouseData, trigger)                        │
ContentArea ┤  handleKeyEvent(keyData,   trigger)                          │
WSA root   ─┤  handleClipboardEvent(clipData, trigger)                     │
document   ─┤        │                                                     │
            │        ├──▶ sm.receiveMouseEvent / receiveKeyEvent / ...     │
            │        ├──▶ dm.receiveMouseEvent                             │
            │        └──▶ (future helpers, same signature)                 │
            └──────────────────────────────────────────────────────────────┘
```

If a step in this plan ever reads as "ContentArea calls SM directly" or "DragHandle calls DM directly", **stop and re-read this section**. The last attempt violated this and was discarded.

---

## What is being ported from React-Pieces

The source codebase is `/Users/christopherdasca/Programming/React-Pieces/pieces/src`. The single load-bearing file is `SelectionManager/SelectionManager.ts` (2664 lines). Almost all logic survives — only the **integration shape** changes (RGL → react-dev's own DragManager, Page-routed events → WSA-routed events, `data-rowid`/`data-tileid` → `data-blockid`).

Concretely reusable (with adaptation):

| Pieces concept | Reuse | Maps to react-dev |
|---|---|---|
| `SelectionPoint` (node, nodeText, rowId, blockType, offset) | Yes | Replace existing thin `SelectionPoint` in `selection/selectionManager/SelectionManager.ts` |
| `ResolvedRange` cross-tile model | Yes | New `_resolved` field on SM |
| `​` (zero-width space) rule | Yes | Required for cross-block ranges; do not skip |
| `_rowIdFromNode` / `_tileIdFromNode` DOM walkers | Yes | Rename to `_blockIdFromNode`; targets `data-blockid` |
| `_getFirstTextNodeForTile` / `_getLastTextNodeForTile` | Yes | Rename `*ForBlock`; queries `[data-blockid]` |
| `_getPrev/NextTextNodeInTile` | Yes | `*InBlock` |
| `_caretPointFromCoordinates` | Yes | Same |
| `_snapshotBrowserCaret` | Yes | Same |
| `_pushCaretToDOM`, `_setFocusPoint`, `_syncAnchorToFocusAndPushCaret` | Yes | Same |
| `_collapseToStart` / `_collapseToEnd` | Yes | Same |
| Plain arrows + Shift+Arrow + Cmd+Shift+Arrow (R/L/U/D) handlers | Yes | All ported wholesale |
| `_targetOffset` vertical-column memory | Yes | Same |
| `_handleSelectAll` (Cmd+A — first press selects block, second escalates) | Yes | Same; "rows" → file content order |
| `_clearSelection` + `CSS.highlights.clear()` | Yes | Same |
| `_buildRange` (cross-block resolve) | Yes | Same |
| `_applyHighlight` (CSS Highlights API) | Yes | Same |
| `_handleMouseDown / _handleMouseUp / _handleMouseMove` (text selection + extension via Shift) | Yes | Same — fed via WSA conduit not Page |
| Clipboard: `CLIPBOARD_CUSTOM_TYPE`, `copyToClipboard`, `pasteFromClipboard`, `insertAtCaret`, `_buildClipboardTiles`, `_internalClipboard` fallback, `getSelectedText` | Yes | Same |
| Browser-default overrides: Enter, Tab, Backspace (empty), Cmd+C/V/A, all arrow keys | Yes | Same set; `preventDefault()` lives in SM |
| Structural-mutation callback registration (`registerNewRowHandler`, etc.) | Yes | Renamed to `registerNewBlockHandler` etc., called by WSA on mount |
| Rubber-band block selection (`_handlePageMouseDown`, `_updateRubberBandSelection`, `_selectedTileIds` + `useSyncExternalStore`) | Yes | "tile" → "block"; uses WSA root listeners |
| `_coordinatesAreInsideTile` gate | Yes | `_coordinatesAreInsideBlock` against `data-blockid` |
| RGL drag-start / drag-stop invalidation gates | Adapted | Replaced by `drag-handle-mouse-down` / `workspace-mouse-up` triggers |

**Not reused (RGL-specific, react-dev replaces wholesale):**

- `ReactGrid/Grid/Grid.tsx`, `Tile/Tile.tsx`, `CollisionManager/CollisionManager.tsx`
- `layout: Layout[]` array, `LayoutItem`, RGL hooks (`onDragStart`, `onResizeStart`)
- `Toolbar/*` (port later as a separate plan)
- Per-tile `h: gridRowUnits` in clipboard payload — replace with `LayoutData { x, y, w, h }` in pixels (or omit entirely on copy and let layout flow on paste; see Phase 7)

---

## Target final architecture (one diagram, then phases)

```
App
 └── Editor
      └── WorkspaceArea (WSA)              ← owns wsaRef; document-level listener attach in useEffect
           ├── handleMouseEvent      → sm.receiveMouseEvent / dm.receiveMouseEvent
           ├── handleKeyEvent        → sm.receiveKeyEvent
           ├── handleClipboardEvent  → sm.receiveClipboardEvent
           ├── registers SM structural callbacks (newBlock, deleteBlock, contentRefresh, pastedBlocks)
           └── renders DragContainer per root TextElement
                ├── DragHandle (emits "drag-handle-mouse-down")
                └── ContentArea (emits keydown/keyup/mousedown/mousemove/mouseup/click/blur)

SelectionManager (no DOM listeners, no setState, no React imports)
 ├── receiveMouseEvent(mouseData, trigger)
 ├── receiveKeyEvent(keyData, trigger)
 ├── receiveClipboardEvent(clipData, trigger)
 ├── subscribe / getSelectedBlocksSnapshot  (useSyncExternalStore)
 └── register*Handler  (structural callbacks back into WSA)

DragManager (existing, unchanged — already pure receiver)
 └── receiveMouseEvent(mouseData, trigger)
```

---

## Phase 0 — Verify current contract is intact

Confirm no helper imports another helper, no component imports SM/DM. Run:

```bash
rg "from .*SelectionManager" src/components src/draggable
rg "from .*DragManager"      src/components src/selection
```

`WorkspaceArea.tsx`, `Editor.tsx`, `App.tsx` are the only allowed importers. If anything else appears, fix before continuing.

---

## Phase 1 — DOM identity attributes (foundation for SM DOM walks)

SM in Pieces walks up the DOM looking for `data-rowid` / `data-tileid`. We need the same anchor points.

**`DragContainer.tsx`** — add `data-blockid={id}` to the outer `.drag-container` div. (Keep `id` for DM's `elementFromPoint().closest('.drag-container')` lookup.)

**`ContentArea.tsx`** — add `data-blockid={id}` to the inner `<Tag>` (the contentEditable). **Do not** put `data-blockid` on the outer `.content-area` wrapper — that would make the wrapper a DOM-walk target and risks double-wrap on persist (see "DOM CLIMBING SAFETY" above).

Rubber-band hit-tests use `DragContainer`'s `data-blockid`, not the ContentArea wrapper.

`data-blockid` is the single source of truth for SM's DOM walks. Do not introduce a second attribute name.

---

## Phase 2 — Extend `MouseEventData` to carry modifiers + buttons

Current shape:

```ts
export type MouseEventData = {
    clientX: number, clientY: number, blockId: string, blockType: string,
}
```

Add (mirror Pieces' use of the live event):

```ts
export type MouseEventData = {
    clientX: number,
    clientY: number,
    blockId: string,
    blockType: string,
    shiftKey: boolean,
    metaKey: boolean,
    ctrlKey: boolean,
    altKey: boolean,
    button: number,
    buttons: number,
}
```

Update every emitter to fill these:

- `ContentArea.handleMouseEvent` — read off `e.shiftKey`, `e.metaKey`, `e.ctrlKey`, `e.altKey`, `e.button`, `e.buttons`
- `DragHandle.handleMouseEvent` — same
- `WSA.handleWorkspaceMouseEvent` — same

No defaulting on the emitter side — always fill.

---

## Phase 3 — New keyboard channel through WSA

Pieces routes keydown via the same Page-conduit and lets SM own every `preventDefault` and every branch. Replicate it here.

**New type in `selection/selectionManager/SelectionManager.ts`:**

```ts
export type KeyEventData = {
    key: string,         // e.target key (e.g. "Enter", "ArrowRight", "c")
    shiftKey: boolean,
    metaKey: boolean,
    ctrlKey: boolean,
    altKey: boolean,
    blockId: string,
    blockType: string,
    // raw event reference — SM owns preventDefault; chain stays synchronous (React 19, no pooling)
    nativeEvent: React.KeyboardEvent,
}
```

**`ContentArea.tsx`** — replace `handleKeyEvent` (which currently builds a `TextElement`) with a raw-key emitter that mirrors the mouse one:

```ts
const handleKeyboardEvent = (e: React.KeyboardEvent, trigger: string) => {
    const keyData: KeyEventData = {
        key: e.key,
        shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey, altKey: e.altKey,
        blockId: id, blockType: component,
        nativeEvent: e,
    }
    cbKeyboardEvent(keyData, trigger)
}
```

Wire on the editable `<Tag>`: `onKeyDown={(e) => handleKeyboardEvent(e, "keydown")}` and `onKeyUp={(e) => handleKeyboardEvent(e, "keyup")}`.

The **existing** `cbKeyEvent` (which fires post-edit to persist content) becomes a **separate** content-mirror callback fired on `onInput`, not on `keyup`. This separates "key happened, SM decides" from "content changed, persist". Wire `onBlur` to fire the same content-mirror callback. SM also calls back into WSA via `_onContentRefresh` registration to trigger the persist.

**`WSA.tsx`** — add:

```ts
const handleKeyEvent = (keyData: KeyEventData, trigger: string) => {
    sm.receiveKeyEvent(keyData, trigger)
}
```

Pass `cbKeyboardEvent={handleKeyEvent}` into every `DragContainer` → `ContentArea`. Add to `DragContainerProps` and `ContentAreaProps`.

**`SelectionManager`** — add public:

```ts
receiveKeyEvent = (keyData: KeyEventData, trigger: string): void => {
    if (trigger !== "keydown") return     // keyup is no-op for now
    this._handleKeyDown(keyData)
}
```

`_handleKeyDown` is the central switch ported from Pieces (Phase 6 fills it).

> **The chain Component → WSA → SM must remain synchronous.** No `setTimeout`, no `Promise.then`, no `requestAnimationFrame`. SM's `event.preventDefault()` calls silently break otherwise.

---

## Phase 4 — Port SelectionPoint + DOM readers + caret writer

Replace `selection/selectionManager/SelectionManager.ts` contents (preserve the file path and the `receiveMouseEvent(mouseData, trigger)` public method — WSA already calls it).

**4.1 Types**

```ts
export type BlockType = "content-area"      // future: | "canvas-area" | "database-cell"
export type ClipboardBlockData = { html: string; tag: string; layout?: LayoutData }
```

**4.2 `SelectionPoint` class** — direct port of Pieces (lines 77–101). Rename `rowId` → `blockId`. Add `nodeText` field. Add `isSet` getter, `copyFrom`, `clone`. `offset` defaults to `-1`.

**4.3 `ResolvedRange` interface** — direct port (lines 109–114). `start`, `middle: SelectionPoint[]`, `end`, `type: BlockType`.

**4.4 SM fields**

```ts
anchor: SelectionPoint = new SelectionPoint()
focus:  SelectionPoint = new SelectionPoint()
public _resolved: ResolvedRange | null = null
private _targetOffset: number | null = null
private _internalClipboard: { blocks: ClipboardBlockData[]; plainText: string } | null = null
private _selectedBlockIds: ReadonlySet<string> = new Set()
private _blockSelectionListeners: Set<() => void> = new Set()
private _isDragging: boolean = false       // set by drag-handle-mouse-down, cleared by workspace-mouse-up
private _rubberBandAnchor: { x: number; y: number; cmdKey: boolean } | null = null
private _blockSelectionValid: boolean = false
private _formattingTarget: string | null = null
private _wsaEl: HTMLElement | null = null
```

`_wsaEl` is set once via `setWorkspaceEl(el)` from WSA's existing `useEffect` (mirror the DM call already in WSA). Every SM DOM read uses `_wsaEl` as its scoping root (Pieces uses `pageNode` — same role).

**4.5 Computed getters** — `isCollapsed`, `hasActiveSelection()`, `isSameType`, `selectionType`. Direct port (lines 178–203).

**4.6 ZWS helpers** — `_stripZWS(text)` (lines 235–237). Document the rule at the top of the file verbatim from Pieces (lines 34–39) — this is the single most footgunny invariant.

**4.7 DOM readers** — port:

- `_blockIdFromNode(node, wsaEl)` — walks up looking for `[data-blockid]`. Boundary is `_wsaEl`.
- `_caretPointFromCoordinates(x, y, wsaEl, blockType)` — uses `document.caretPositionFromPoint`; rejects non-Text nodes; derives `blockId` via `_blockIdFromNode`.
- `_snapshotBrowserCaret(blockId, blockType)` — used to seed anchor on first Shift+Arrow when SM has no state.
- `_getFirstTextNodeForBlock(blockId, wsaEl)` / `_getLastTextNodeForBlock(blockId, wsaEl)` — query inside `[data-blockid="..."]` for a `[contenteditable="true"]` and walk childNodes for first/last Text.
- `_getPrevTextNodeInBlock(node)` / `_getNextTextNodeInBlock(node)` — walk parent's childNodes skipping `<br>`s.
- `_prevTextNodeExistsInBlock(node)` — boolean wrapper.

**4.8 DOM writer** — `_pushCaretToDOM(point)` (lines 488–500). Single sink for writing the browser caret. Nothing else in the codebase calls `window.getSelection()`.

**4.9 Focus-point helpers** — `_setFocusPoint(node, blockId, offset)`, `_syncAnchorToFocusAndPushCaret()` (lines 253–271). Pre-existing `focusCaret()` in current SM is removed — `_pushCaretToDOM` supersedes it.

---

## Phase 5 — Port mouse handlers (text selection + extension)

**5.1 Public switch — replace the current `receiveMouseEvent`:**

```ts
receiveMouseEvent = (mouseData: MouseEventData, trigger: string): void => {
    switch (trigger) {
        case "content-area-mouse-down": this._handleContentMouseDown(mouseData); break
        case "content-area-mouse-up":   this._handleContentMouseUp(mouseData);   break
        case "content-area-click":      this._handleContentClick(mouseData);     break

        case "workspace-mouse-down":    this._handlePageMouseDown(mouseData);    break
        case "workspace-mouse-move":    this._handleMouseMove(mouseData);        break
        case "workspace-mouse-up":      this._handleMouseUp(mouseData);          break

        case "drag-handle-mouse-down":  this._isDragging = true; this._clearSelection(); break
    }
    if (this._wsaEl) this._rebuildAndRenderSelection(this._wsaEl)
}
```

Note the **drag-handle gate**: when a drag starts, SM sees the trigger and sets `_isDragging`. `workspace-mouse-up` clears it (Phase 9 wires this back). This is the new analogue of Pieces' `_handleTileDragStart`/`Stop`.

**5.2 New trigger from `ContentArea`** — emit `"content-area-mouse-down"` on `onMouseDown`, `"content-area-mouse-up"` on `onMouseUp`, keep `"click"` but rename to `"content-area-click"` for symmetry. Update the existing `onClick` wire-up accordingly.

**5.3 New trigger from WSA root** — wire `onMouseDown={(e) => handleWorkspaceMouseEvent(e, "workspace-mouse-down")}`. Already have `onMouseMove` and `onMouseUp`.

**5.4 Port handler bodies (direct ports from Pieces):**

- `_handleContentMouseDown` ← Pieces `_handleMouseDown` (lines 1413–1432). Uses `mouseData.shiftKey`. Calls `_caretPointFromCoordinates`. Shift+click extends focus; plain click sets both anchor+focus. Always clears `_targetOffset`.
- `_handleContentMouseUp` ← Pieces `_handleMouseUp` (lines 1449–1464). Bails if `_isDragging`. Bails if rubber-band active (handled in workspace branch). Otherwise refines focus to release coords.
- `_handleContentClick(mouseData)` ← Pieces `_handleClick(rowId, pageNode)` (lines 1212–1216) — fires `_onContentRefresh` callback.

- `_handlePageMouseDown(mouseData)` ← Pieces `_handlePageMouseDown` (lines 1038–1060). Gates on `button !== 0` and `_coordinatesAreInsideBlock`. Records `_rubberBandAnchor`. If no cmd, immediately clears the block selection.
- `_handleMouseMove(mouseData)` ← Pieces `_handleMouseMove` (lines 1491–1512). Three paths: drag-gate, rubber-band, text-selection extension.
- `_handleMouseUp(mouseData)` ← Pieces page-mouseup branch (lines 1158–1161 + `_handleMouseUp` body). Finalises rubber-band or text selection. Always clears `_isDragging` at the top so DM's cleanup and SM's stay in lockstep.

**5.5 Cross-type guard** — `_canExtendTo(candidate)` (lines 218–221).

**5.6 Block-inside-coords helper** — `_coordinatesAreInsideBlock(x, y)` — port of `_coordinatesAreInsideTile` but targets `[data-blockid]` (lines 1069–1073).

**5.7 Block selection store API** — `subscribe`, `getSelectedBlocksSnapshot`, `_emitBlockSelectionChange`, `clearSelectedBlocks`, `_toggleBlockSelection`, `_applyRubberBandSelection` (lines 816–867 — rename "Tile" → "Block").

**5.8 Rubber-band** — `_updateRubberBandSelection(x, y, wsaEl)` (lines 1530–1556). Targets `[data-blockid]` (was `[data-tileid]`).

WSA reads the snapshot via `useSyncExternalStore(sm.subscribe, sm.getSelectedBlocksSnapshot)` and passes the resulting `Set<string>` down to `DragContainer` so it can toggle a `.is-selected` className. **WSA owns this read** — `DragContainer` receives `isSelected: boolean` as a prop. Never let `DragContainer` subscribe directly.

---

## Phase 6 — Port keyboard handlers

**6.1 Central dispatcher** — `_handleKeyDown(keyData)` ports Pieces `_handleKeyDown` (lines 1268–1358) with this shape change: SM reads `key`, `shiftKey`, `metaKey || ctrlKey` off `keyData`, and calls `keyData.nativeEvent.preventDefault()` where Pieces calls `event.preventDefault()`. Cases to port verbatim:

- `"Enter"` — Shift+Enter native; else preventDefault, fire `_onNewBlock` with current content snapshot.
- `"Tab"` — preventDefault, no-op.
- `"Backspace"` — only intercepts when the editable is empty; else native. preventDefault, clears `_formattingTarget` if equal, fires `_onDeleteBlock`.
- `"c"` (with cmd) — preventDefault, calls `_copyCurrentSelection`.
- `"v"` (with cmd) — preventDefault, calls `_pasteAtCurrentCaret`.
- `"a"` (with cmd) — preventDefault, calls `_handleSelectAll`.
- `"ArrowRight"`, `"ArrowLeft"`, `"ArrowUp"`, `"ArrowDown"` — preventDefault, route to plain/Shift/Cmd+Shift variants.

**6.2 Caret-movement helpers (direct ports):**

- `_moveCaretRight / Left / Up / Down` (lines 650–800) — pass `_wsaEl` instead of `pageNode`, pass the **ordered block array** (see 6.4) instead of `rows`.
- `_handleArrowRight / Left / Up / Down` (lines 1737–1832).
- `_handleShiftArrowRight / Left` (lines 1569–1611).
- `_handleCmdShiftArrowRight / Left / Up / Down` (lines 1627–1723).
- `_handleShiftArrowUp / Down` (lines 1866–1981).
- `_handleSelectAll` (lines 1999–2039).
- `_extendFocusToTile` (rename `_extendFocusToBlock`, lines 2052–2063).
- `_collapseToStart / End` (lines 595–635).
- `_clearTargetOffset`, `_clearSelection` (lines 572–587).
- `_ensureAnchorIsSet` (lines 1844–1852).

**6.3 Content snapshot reader** — `_readBlockContent(blockId, wsaEl)` ← Pieces `_readRowContent` (lines 1233–1244). Reads the contenteditable's `innerHTML` (NOT `textContent` — preserves bold/italic/`<br>`). Returns `{ value, tag }` or null.

**6.4 Ordered block array — the file's reading order**

Pieces passes `rows: RowData[]` everywhere. react-dev's equivalent is `activeFile.content: string[]` (an ordered array of block ids), with the actual data in `contentDataSet`. Two options:

- **Option A (preferred):** SM never receives the ordered array. WSA calls `sm.setBlockOrder(activeFile.content)` whenever `activeFile.content` changes (a `useEffect`). SM stores it as `private _blockOrder: string[] = []` and helpers read it. This keeps SM's public surface as `(mouseData|keyData, trigger)` only.
- Option B: extend `MouseEventData`/`KeyEventData` to include the array. Rejected — pollutes every event.

Use Option A. Add `setBlockOrder(ids: string[]): void` to SM.

Helpers that previously took `rows: RowData[]` now read `this._blockOrder` and look up the next/prev block id by index. The `RowData` shape (`id`, `value`, `tag`) was only used for `.id` lookups — `_blockOrder` is sufficient.

**6.5 Structural callbacks** — port the four register methods (lines 901–933) renamed to react-dev nomenclature:

```ts
registerNewBlockHandler(handler: (value: string, blockId: string, tag: TextElement['Tag']) => void): void
registerDeleteBlockHandler(handler: (blockId: string) => void): void
registerContentRefreshHandler(handler: (value: string, blockId: string, tag: TextElement['Tag']) => void): void
registerPastedBlocksHandler(handler: (anchorBlockId: string, blocks: ClipboardBlockData[]) => void): void
```

WSA registers all four inside the existing `useEffect`. The handler bodies live in WSA and mutate the Zustand store + persist via `useDocumentStorage`.

- `registerNewBlockHandler` → builds a new `TextElement`, inserts under parent root with default `LayoutData`, updates `activeFile.content` (insert id directly after the source block), writes to store and disk. Use existing reorder logic in the current WSA drop callback as the persistence pattern.
- `registerDeleteBlockHandler` → removes from `contentDataSet`, removes id from `activeFile.content`, writes.
- `registerContentRefreshHandler` → mutates `contentDataSet[blockId].innerContent` (and `Tag` if changed), writes.
- `registerPastedBlocksHandler` → for each pasted block: new id, layout slotted below anchor, splice into `activeFile.content` immediately after anchor, write.

---

## Phase 7 — Port clipboard

**7.1 MIME type constant** — `const CLIPBOARD_CUSTOM_TYPE = "web application/x-novari-clipboard"` (rename from `x-pieces-clipboard`). Same `web ` prefix rule applies for Chrome.

**7.2 `ClipboardBlockData` shape** — `{ html: string; tag: string; layout?: LayoutData }`. Drop the `h: gridRowUnits` field from Pieces — react-dev uses absolute pixel `LayoutData { x, y, w, h }`. On paste, `layout` is optional: if present, restore; if absent (external paste), let the new block flow into a default slot below the anchor.

**7.3 Methods to port verbatim:**

- `_fragmentToHtmlString(fragment)` (lines 2076–2080).
- `_getTagForBlock(blockId, wsaEl)` ← `_getTagForTile` (lines 2092–2096).
- `_buildClipboardBlocks(wsaEl)` ← `_buildClipboardTiles` (lines 2118–2210). Drop the `layout: Layout` parameter; replace `getHeightForTile(rowId)` with `getLayoutForBlock(blockId)` which reads the block's `LayoutData` off the Zustand store via a small callback registered from WSA (or pass the `contentDataSet` reference through `setBlockOrder` extension — prefer a callback). For the first pass, omit `layout` from copy and add it back when the layout-preserve-on-paste requirement is implemented.
- `copyToClipboard(wsaEl)` (lines 2231–2260).
- `pasteFromClipboard()` (lines 2272–2309). Priority order unchanged: native structured → in-memory fallback (with plain-text consistency check) → native plain text.
- `insertAtCaret(html, wsaEl)` (lines 2322–2352). Returns the anchor block id for the pasted-rows handler.
- `getSelectedText()` (lines 2380–2457).
- `_copyCurrentSelection(wsaEl)` (lines 1366–1379).
- `_pasteAtCurrentCaret(wsaEl)` (lines 1386–1395) — calls `insertAtCaret(blocks[0].html)`, then `_onPastedBlocks(anchor, blocks.slice(1))` if more.

**7.4 Browser clipboard events** — Cmd+C and Cmd+V are intercepted by `_handleKeyDown`, so document-level `copy`/`paste` listeners are not strictly required. **Do not add them.** Adding both would double-fire. (If a future need arises for non-keyboard paste — e.g. context-menu paste — route it through WSA via a new trigger `"workspace-clipboard-paste"`.)

---

## Phase 8 — Cross-block highlighting

Two pieces — both already covered above but listed separately so it isn't lost:

**8.1 `_rebuildAndRenderSelection(wsaEl)` ← Pieces lines 2477–2494.** Called at the end of every `receiveMouseEvent` / `receiveKeyEvent` so the visual highlight always matches SM state. Bails if no active selection or cross-type.

**8.2 `_buildRange(wsaEl)` ← lines 2514–2552.** Walks `_blockOrder` between anchor and focus indices. Collects middle SelectionPoints. Stores in `_resolved`.

**8.3 `_applyHighlight(wsaEl)` ← lines 2573–2664.** Uses `CSS.highlights.set("highlight", new Highlight(...ranges))`. Range endpoints use `node.length` raw (ZWS rule). Single-block has two sub-cases (same Text node, different Text nodes via `<br>`). Cross-block uses `_resolved`.

**8.4 CSS** — add to `index.css`:

```css
::highlight(highlight) {
    background-color: rgba(100, 149, 237, 0.4);
    color: inherit;
}
```

(Pieces colour is whatever it uses today — copy verbatim from `pieces/src/page.css` or similar.)

---

## Phase 9 — Drag invalidation, completed

Already covered in 5.1. To summarise the contract:

- `"drag-handle-mouse-down"` → SM sets `_isDragging = true` and clears any text selection. This means a drag never coexists with a highlight.
- `"workspace-mouse-up"` → SM's `_handleMouseUp` clears `_isDragging` at the top before any rubber-band/text branching.
- While `_isDragging` is true, `_handleMouseMove` returns immediately — neither rubber-band nor text-extension runs.

DM already lives by `isDragging` independently of SM (it is its own state). The two flags are coincident in practice because both are set by the same trigger; they are not the same variable and must not be shared. Helpers do not import each other.

---

## Phase 10 — WSA wiring (the only file that knows about both helpers)

Edit `WorkspaceArea.tsx`:

```ts
// existing imports + add KeyEventData
import type { MouseEventData, KeyEventData } from '../../selection/selectionManager/SelectionManager'
import { useSyncExternalStore } from 'react'

// inside the component, after the existing dm.setOnDropCallback useEffect:

// SM gets the WSA element + the ordered block id list. Re-runs when the active file changes.
useEffect(() => {
    sm.setWorkspaceEl(wsaRef.current)
}, [sm])

useEffect(() => {
    if (!activeFile) return
    sm.setBlockOrder(activeFile.content)
}, [sm, activeFile])

// Structural callbacks. Wired once; bodies close over the latest store via the
// functional setter pattern (or via reading `useWorkspaceStore.getState()` inline
// to dodge stale closures — pick one and use it consistently).
useEffect(() => {
    sm.registerNewBlockHandler(handleNewBlock)
    sm.registerDeleteBlockHandler(handleDeleteBlock)
    sm.registerContentRefreshHandler(handleContentRefresh)
    sm.registerPastedBlocksHandler(handlePastedBlocks)
}, [sm])

// Selected blocks — SM is the source of truth.
const selectedBlockIds = useSyncExternalStore(sm.subscribe, sm.getSelectedBlocksSnapshot)
```

Replace the existing `handleMouseEvent`:

```ts
const handleMouseEvent = (mouseData: MouseEventData, trigger: string) => {
    sm.receiveMouseEvent(mouseData, trigger)
    dm.receiveMouseEvent(mouseData, trigger)
}

const handleKeyEvent = (keyData: KeyEventData, trigger: string) => {
    sm.receiveKeyEvent(keyData, trigger)
}
```

Replace `handleWorkspaceMouseEvent` to also fill the new modifier fields and add `onMouseDown`:

```ts
const handleWorkspaceMouseEvent = (e: React.MouseEvent, trigger: string) => {
    const mouseData: MouseEventData = {
        clientX: e.clientX, clientY: e.clientY,
        blockId: "", blockType: "",
        shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey, altKey: e.altKey,
        button: e.button, buttons: e.buttons,
    }
    handleMouseEvent(mouseData, trigger)
}
```

JSX:

```tsx
<div className="workspace-area" ref={wsaRef}
    onMouseDown={(e) => handleWorkspaceMouseEvent(e, "workspace-mouse-down")}
    onMouseMove={(e) => handleWorkspaceMouseEvent(e, "workspace-mouse-move")}
    onMouseUp={(e)   => handleWorkspaceMouseEvent(e, "workspace-mouse-up")}>
    {roots.map((node) => {
        const isSelected = selectedBlockIds.has(node.id)
        const ComponentToRender = COMPONENT_REGISTRY[node.component as keyof typeof COMPONENT_REGISTRY]
        return (
            <DragContainer key={node.id} id={node.id}
                layoutData={node.layout?.layoutData}
                isSelected={isSelected}
                cbMouseEvent={handleMouseEvent}
                dragHandleIcon=". . .">
                <ComponentToRender
                    contentDataSet={contentDataSet}
                    activeContent={node}
                    cbMouseEvent={handleMouseEvent}
                    cbKeyboardEvent={handleKeyEvent}
                />
            </DragContainer>
        )
    })}
</div>
```

`isSelected` toggles `.is-selected` on `.drag-container`. Add the CSS rule for the visible ring.

The existing `cbKeyEvent` callback (TextElement-based, fired on content change) is removed from `ContentArea` props in favour of SM's `registerContentRefreshHandler` route. Content edits flow:

```
contentEditable onInput → ContentArea fires "content-area-input" through cbMouseEvent? NO.
```

Cleaner: keep one dedicated input emitter. Add a third callback `cbContentEvent(blockId, innerHTML, trigger)` on `ContentArea` that fires on `onInput` and `onBlur`. WSA routes it to SM via `sm.receiveContentEvent(...)`, which internally fires `_onContentRefresh`. This keeps the strict 1 helper-method-per-event-family pattern.

If that feels like overkill while the rest of the port is in flight, an acceptable interim: ContentArea fires its existing `cbKeyEvent` to WSA, WSA calls `sm.receiveContentEvent` directly. SM still owns the decision (whether to call `_onContentRefresh`). The rule remains: **ContentArea never imports SM, WSA is always the conduit.**

---

## Phase 11 — Final cleanup

- `DragContainerProps` and `ContentAreaProps` in `src/types/types.ts`: add `cbKeyboardEvent`, `isSelected?: boolean`, drop the typed `cbKeyEvent: (updatedElement: TextElement, ...)` signature (replaced by `cbContentEvent`).
- `BlockType` extension point — leave a `// Future: | "canvas-area"` comment beside the `BlockType` definition so the next piece type has an obvious home.
- Delete `backupSelectionList.ts` references — react-dev never had them.
- Delete the placeholder `focusCaret` method from the current SM.

---

## Acceptance checklist

Run each manually before declaring this plan done. Each item maps to a Pieces feature that must survive the port.

1. **Caret place on click** inside any ContentArea — caret lands at the click position, no scroll jump.
2. **Drag** a block via DragHandle from anywhere on the workspace — drop persists in `activeFile.content` order (existing behaviour, regression-check).
3. **Cross-block text drag-select** — mousedown inside block A's text, drag across into block B's text, release. Highlight spans both. `CSS.highlights` is populated.
4. **Shift+click cross-block** — click in A, Shift+click in B. Same highlight.
5. **Shift+Arrow keys** — extend selection one char / one line at a time. Crosses block boundaries.
6. **Cmd+Shift+Arrow keys** — extend to line start/end / document start/end.
7. **Plain arrow keys** with active selection — collapses to start (Left/Up) or end (Right/Down) then moves.
8. **Cmd+A** — first press selects current block; second press escalates to all blocks.
9. **Enter** in a non-empty block — creates new block immediately below; caret lands in the new block. Browser default suppressed.
10. **Backspace** on an empty block — deletes block; caret lands at end of block above. Browser default suppressed.
11. **Tab** — suppressed (no focus tab-out).
12. **Cmd+C** + **Cmd+V** single-block selection — round-trips the formatting (bold, italic, `<br>`).
13. **Cmd+C** + **Cmd+V** cross-block selection — pastes with block boundaries preserved (tiles[0] into the caret block, tiles[1+] as new blocks below).
14. **External paste** (copy from another app) — falls back to plain text, splits on `\n`, each line becomes a `<p>` block.
15. **Rubber-band block select** — mousedown on workspace dead space, drag a rect across multiple blocks, release. `selectedBlockIds` reflects all touched blocks. Cmd-rubber-band unions with existing.
16. **`.is-selected` ring** appears on every selected block via `DragContainer`.
17. **Esc** clears block selection (port `clearSelectedBlocks` if a key handler doesn't already exist — add an `Escape` case to `_handleKeyDown`).
18. **Drag while text selection active** — drag invalidates and clears the highlight; rubber-band does not engage during a drag.
19. **No helper imports another helper.** `rg "from.*SelectionManager" src/draggable` returns nothing. `rg "from.*DragManager" src/selection` returns nothing.
20. **No component imports a helper.** `rg "from.*SelectionManager|from.*DragManager" src/components/workspace-blocks src/draggable/dragContainer src/draggable/dragHandle` returns nothing.

---

## Order of execution

Do phases in the listed order. Each phase is independently testable on its own — do not start a later phase before the previous one is green against the checklist items it touches.

- Phases 1–3 unlock everything else (DOM identity + event channels).
- Phase 4 is a wholesale file replacement of `SelectionManager.ts`. Diff against Pieces line-by-line; only the integration shape changes.
- Phases 5–8 are SM internals; commit after each.
- Phase 10 is the WSA edit — do it last so SM is fully ready when WSA wires it.

When complete, run the 20-item checklist. Anything that fails goes into a follow-up plan in `BuildPlan/`.
