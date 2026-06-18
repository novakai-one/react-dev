# Drag & Drop — Build Plan v2 (react-dev)

> **One rule, no exceptions:** every mouse event follows ONE path.
> WSA owns the DOM listeners → forwards raw `(mouseData, trigger)` to the helpers → **the helper decides.**
> DragManager attaches NO listeners of its own. It receives events and checks its own state.
> Same rail as SelectionManager. Drag is just another passenger.

```
                    ┌─────────────── WorkspaceArea (the ONLY conduit) ───────────────┐
 mousedown(handle) ─┤                                                                │
 mousemove(wsa)    ─┤  handleMouseEvent(mouseData, trigger)                          │
 mouseup(wsa)      ─┤        │                                                       │
                    │        ├──▶ sm.receiveMouseEvent(mouseData, trigger)           │
                    │        └──▶ dm.receiveMouseEvent(mouseData, trigger)           │
                    └────────────────────────────────────────────────────────────────┘
                                         │
                       dm checks its own isDragging + measures live → moves / drops
```

Triggers (the whole vocabulary for now):
```
"drag-handle-mouse-down"   ← fired by DragHandle
"workspace-mouse-move"     ← fired by WSA root
"workspace-mouse-up"       ← fired by WSA root
```

---

## PHASE 1 — Rewrite DragManager as a pure receiver (no window listeners)

**File:** `src/draggable/dragManager/DragManager.ts`

Strip out `startDrag`, the `window.addEventListener` calls, and the standalone
`handleMouseMove`/`handleMouseUp`. Replace the public surface with ONE entry point
that mirrors SelectionManager:

```ts
// public — the only thing WSA calls
receiveMouseEvent(mouseData, trigger) {
    if (trigger === "drag-handle-mouse-down") this.beginDrag(mouseData)
    if (trigger === "workspace-mouse-move")   this.moveActive(mouseData)
    if (trigger === "workspace-mouse-up")     this.endDrag(mouseData)
}

// WSA hands DM the workspace element ONCE (mount). DM measures it live itself.
setWorkspaceEl(el) { this.workspaceEl = el }
setOnDropCallback(cb) { this.onDrop = cb }
```

Private state (DM owns all of it): `activeEl`, `activeId`, `isDragging`, `mouseOffset`, `workspaceEl`, `onDrop`.

```
beginDrag(mouseData):
    el = document.elementFromPoint(mouseData.clientX, mouseData.clientY)?.closest('.drag-container')
    if (!el) return
    this.activeEl = el
    this.activeId = el.id
    rect = el.getBoundingClientRect()
    this.mouseOffset = { x: clientX - rect.left, y: clientY - rect.top }
    this.isDragging = true

moveActive(mouseData):
    if (!this.isDragging || !this.activeEl) return        // ← the guard: DM decides
    ws = this.workspaceEl.getBoundingClientRect()          // ← live measure, every move
    localX = clientX - this.mouseOffset.x - ws.left
    localY = clientY - this.mouseOffset.y - ws.top
    clamp localX → [0, ws.width  - activeEl.offsetWidth]
    clamp localY → [0, ws.height - activeEl.offsetHeight]
    this.activeEl.style.left = localX + "px"
    this.activeEl.style.top  = localY + "px"
    this.lastLocal = { x: localX, y: localY }              // remember for drop

endDrag(mouseData):
    if (!this.isDragging) return
    if (this.onDrop) this.onDrop(this.activeId, this.lastLocal)
    this.cleanup()                                          // reset state, no listeners to remove
```

> **Coordinate note (the bug that bites):** `.drag-container` is absolute inside the
> `position:relative` `.workspace-area`, so `style.left` is measured from the workspace,
> NOT the viewport. That's why we subtract `ws.left/ws.top`. Live-measuring the workspace
> rect every move also means scroll/resize never makes it stale.

✅ **Done when:** DM compiles with one public `receiveMouseEvent` and zero `addEventListener`.

---

## PHASE 2 — WSA owns the listeners + forwards everything

**File:** `src/components/workspace/WorkspaceArea.tsx`

- Add a ref to the root: `<div className="workspace-area" ref={wsaRef} ...>`.
- On mount (`useEffect`, once): `dm.setWorkspaceEl(wsaRef.current)` and register the drop handler (Phase 4).
- Put all three listeners on the root div, each building `mouseData` the **same way ContentArea already does** and routing through the one conduit:

```tsx
<div className="workspace-area" ref={wsaRef}
     onMouseMove={(e) => handleMouseEvent(toMouseData(e), "workspace-mouse-move")}
     onMouseUp={(e)   => handleMouseEvent(toMouseData(e), "workspace-mouse-up")}>
```

- Extend the existing conduit to also tell DM (it already tells SM):

```tsx
const handleMouseEvent = (mouseData, trigger) => {
    sm.receiveMouseEvent(mouseData, trigger)
    dm.receiveMouseEvent(mouseData, trigger)   // ← same call, same shape. DM ignores what's not its trigger.
}
```

> Reuse ContentArea's existing `mouseData` builder so the shape stays identical across SM and DM.
> Do NOT invent a drag-specific payload.

✅ **Done when:** moving the mouse over the workspace logs move events arriving at DM (which ignores them until a drag is active).

---

## PHASE 3 — Handle + Container forward the down event (no special path)

**File:** `src/draggable/dragHandle/DragHandle.tsx`
- Type props: `{ id: string; onHandleMouseDown: (mouseData) => void }`.
- `onMouseDown={(e) => onHandleMouseDown(toMouseData(e))}` on the root `.drag-handle`.
- Drop the `any`.

**File:** `src/draggable/dragContainer/DragContainer.tsx`
- Delete the test `handleClick` (hardcoded `left=500px`).
- Receive `cbMouseEvent` (the conduit) + `id` + `layoutData` as props.
- Pass down to the handle — container just forwards, never decides:

```tsx
<DragHandle id={id}
    onHandleMouseDown={(mouseData) => cbMouseEvent(mouseData, "drag-handle-mouse-down")} />
```

- Use real `id` (not `"1"`).

✅ **Done when:** mousedown on the handle reaches DM's `beginDrag`, then moving the mouse drags the block and mouseup drops it — all through the single conduit.

---

## PHASE 4 — Persist layout on drop + fix types

**File:** `src/components/workspace/WorkspaceArea.tsx` (inside the mount `useEffect`)

```ts
dm.setOnDropCallback((id, finalLocal) => {
    const el = contentDataSet[id]
    const updated = { ...el, layout: { ...el.layout,
        layoutData: { ...el.layout?.layoutData, x: finalLocal.x, y: finalLocal.y } } }
    const newDataSet = { ...contentDataSet, [id]: updated }
    saveContentData(newDataSet)
    setContent(newDataSet)
})
```
(`finalLocal` is already workspace-local from Phase 1 — store it straight in.)

**File:** `src/types/types.ts`
- `DragContainerProps.id`: `number` → `string`.
- `DragContainerProps.children`: `COMPONENT_REGISTRY` → `React.ReactNode`.
- Add `cbMouseEvent` + `layoutData` to `DragContainerProps`; drop `onDragStart` if you ever added it.

✅ **Done when:** drop a block, refresh — `contentDataSet[id].layout.layoutData` has the new x/y.

---

## PHASE 5 — Render blocks from data + apply saved position

**File:** `src/components/workspace/WorkspaceArea.tsx`
- Delete the test `<button>` and hardcoded `<DragContainer>`.
- Wrap each root node:

```tsx
{roots.map((node) => {
    const Comp = COMPONENT_REGISTRY[node.component]
    return (
        <DragContainer key={node.id} id={node.id}
            layoutData={node.layout?.layoutData}
            cbMouseEvent={handleMouseEvent} dragHandleIcon=". . .">
            <Comp contentDataSet={contentDataSet} activeContent={node}
                  cbKeyEvent={handleKeyEvent} cbMouseEvent={handleMouseEvent} />
        </DragContainer>
    )
})}
```

**File:** `src/draggable/dragContainer/DragContainer.tsx`
- Position from data: `style={{ left: layoutData?.x ?? 50, top: layoutData?.y ?? 50 }}`.

**File:** `drag-container.css`
- Remove hardcoded `top:50px; left:50px;` (inline style owns position). Keep `position:absolute`.

✅ **Done when:** every root block renders at its saved spot and each drags independently.

---

## PHASE 6 — Order by top-left

**File:** WSA, inside the `onDrop` callback after saving layout.
- Sort the active file's content keys by position: `(a.y - b.y) || (a.x - b.x)`.
- Write the sorted key array back to `activeFile.content` and persist the file.

✅ **Done when:** dragging a block above another reorders `activeFile.content`.

---

## PHASE 7 — Cleanup
- Remove `console.dir(sm)` and any test logs.
- `npm run build` → 0 type errors.

---

## What changed from v1 (and why)
```
v1 (wrong)                          v2 (this)
─────────────────────────           ─────────────────────────────
Handle → DM directly                Handle → WSA → DM   (one rail)
DM self-attaches window listeners   WSA owns listeners, forwards to DM
DM.startDrag(id, ref, event)        DM.receiveMouseEvent(mouseData, trigger)
move bypasses WSA                   move goes through WSA (SM needs it too)
```
The v1 shortcut would've forced a second, parallel event system the moment SelectionManager
needed move data. v2 keeps one flow → new features (collision, resize, marquee) all plug into
the same `receiveMouseEvent` without touching the wiring.

## Out of scope (next milestone)
- CollisionManager — plugs into DM's `onDrop`, same rail.
- Resize, touch/pointer events.
- Dragging while cursor leaves the workspace entirely (add window-level forwarding later — still through WSA).