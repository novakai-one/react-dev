// pointerGestures.ts
//
// All mouse-driven selection. Two gestures share these handlers:
//   text selection  — press inside a block, drag to extend focus
//   rubber band     — press on empty canvas, drag a box over whole blocks
//
// GestureFlags is the small bit of mouse state that outlives a single event:
//   isDragging        — a block drag owns the mouse; selection paths stand down
//   rubberBandAnchor  — where a rubber-band box started (null when not dragging)
//
// SelectionManager owns one GestureFlags and forwards every mouse trigger here
// through handlePointerEvent. Helpers never attach their own DOM listeners.

import type { MouseEventData } from '../../types/types'
import type { ContentRefreshHandler } from './types'
import type { SelectionState } from './SelectionState'
import type { BlockSelectionStore } from './blockSelectionStore'
import {
    caretPointFromCoordinates,
    readBlockContent,
    coordinatesAreInsideBlock,
} from './domHelpers'


export interface RubberBandAnchor {
    x: number
    y: number
    cmdKey: boolean
}

export interface GestureFlags {
    isDragging: boolean
    rubberBandAnchor: RubberBandAnchor | null
}

export function createGestureFlags(): GestureFlags {
    return { isDragging: false, rubberBandAnchor: null }
}


export interface PointerContext {
    state: SelectionState
    wsaEl: HTMLElement
    blockSelection: BlockSelectionStore
    gesture: GestureFlags
    onContentRefresh: ContentRefreshHandler | null
}


// Routes one mouse trigger to its handler. SelectionManager re-renders the
// highlight afterwards, so handlers only mutate state.
export function handlePointerEvent(trigger: string, mouseData: MouseEventData, ctx: PointerContext): void {
    switch (trigger) {
        case "drag-handle-mouse-down":  markDragStart(ctx);                 break

        case "content-area-mouse-down": contentMouseDown(mouseData, ctx);   break
        case "content-area-mouse-up":   contentMouseUp(mouseData, ctx);     break
        case "content-area-click":      contentClick(mouseData, ctx);       break

        case "workspace-mouse-down":    pageMouseDown(mouseData, ctx);      break
        case "workspace-mouse-move":    pageMouseMove(mouseData, ctx);      break
        case "workspace-mouse-up":      pageMouseUp(mouseData, ctx);        break
    }
}


// A block drag started elsewhere. Invalidate any selection so a stale OS-blue
// range or CSS highlight does not linger while the user drags.
function markDragStart(ctx: PointerContext): void {
    ctx.gesture.isDragging = true
    clearSelection(ctx)
    window.getSelection()?.removeAllRanges()
}


// ── Inside a block ───────────────────────────────────────────────────────────

function contentMouseDown(mouseData: MouseEventData, ctx: PointerContext): void {
    if (mouseData.button !== 0) return
    ctx.state.clearTargetOffset()   // a fresh press drops vertical-column memory

    const point = caretPointFromCoordinates(mouseData.clientX, mouseData.clientY, ctx.wsaEl)
    if (!point) return

    if (mouseData.shiftKey && ctx.state.anchor.isSet) {
        if (!ctx.state.canExtendTo(point)) return
        ctx.state.focus.copyFrom(point)
    } else {
        ctx.state.anchor.copyFrom(point)
        ctx.state.focus.copyFrom(point)
    }
    ctx.state.resolved = null
}

// content-area-mouse-up only refines focus to the release point. The real
// cleanup happens in workspace-mouse-up, which always fires via bubbling.
function contentMouseUp(mouseData: MouseEventData, ctx: PointerContext): void {
    if (mouseData.button !== 0) return
    if (ctx.gesture.isDragging) return
    if (ctx.gesture.rubberBandAnchor) return
    refineFocusTo(mouseData, ctx)
}

// A click means "commit any pending edit in this block". SM hands the live DOM
// text to WSA through the content-refresh callback.
function contentClick(mouseData: MouseEventData, ctx: PointerContext): void {
    const snapshot = readBlockContent(mouseData.blockId, ctx.wsaEl)
    if (!snapshot) return
    ctx.onContentRefresh?.(snapshot.value, mouseData.blockId, snapshot.tag)
}


// ── On the workspace background ──────────────────────────────────────────────

function pageMouseDown(mouseData: MouseEventData, ctx: PointerContext): void {
    if (mouseData.button !== 0) return
    // Ignore presses that landed inside a block — those have their own gestures.
    if (coordinatesAreInsideBlock(mouseData.clientX, mouseData.clientY)) return

    clearSelection(ctx)
    const cmdKey = mouseData.metaKey || mouseData.ctrlKey
    ctx.gesture.rubberBandAnchor = { x: mouseData.clientX, y: mouseData.clientY, cmdKey }

    // A plain press (no Cmd) starts a fresh box, so clear the block selection.
    if (!cmdKey) ctx.blockSelection.apply(new Set(), true)
}

function pageMouseMove(mouseData: MouseEventData, ctx: PointerContext): void {
    if (ctx.gesture.isDragging) return        // a block drag owns the mouse
    if (mouseData.buttons !== 1) return        // primary button not held — hover

    if (ctx.gesture.rubberBandAnchor) {
        updateRubberBand(mouseData.clientX, mouseData.clientY, ctx)
        return
    }
    if (!ctx.state.anchor.isSet) return   // hover with no anchor — nothing to extend
    refineFocusTo(mouseData, ctx)
}

// workspace-mouse-up always fires (bubbling), so it is the single cleanup point.
// Clear isDragging first to stay in step with DragManager's own cleanup.
function pageMouseUp(mouseData: MouseEventData, ctx: PointerContext): void {
    ctx.gesture.isDragging = false

    if (ctx.gesture.rubberBandAnchor) {
        updateRubberBand(mouseData.clientX, mouseData.clientY, ctx)
        ctx.gesture.rubberBandAnchor = null
        return
    }

    if (mouseData.button !== 0) return
    refineFocusTo(mouseData, ctx)
}


// ── Shared steps ─────────────────────────────────────────────────────────────

// Extend focus to the caret under the cursor, if it is a valid same-type point.
function refineFocusTo(mouseData: MouseEventData, ctx: PointerContext): void {
    const point = caretPointFromCoordinates(mouseData.clientX, mouseData.clientY, ctx.wsaEl)
    if (!point) return
    if (!ctx.state.canExtendTo(point)) return
    ctx.state.focus.copyFrom(point)
    ctx.state.resolved = null
}

// Grow the rubber-band box to the cursor and select every block it covers.
// Cmd-drag adds to the existing block selection; a plain drag replaces it.
function updateRubberBand(x: number, y: number, ctx: PointerContext): void {
    const anchor = ctx.gesture.rubberBandAnchor
    if (!anchor) return

    const box = {
        left:   Math.min(anchor.x, x),
        right:  Math.max(anchor.x, x),
        top:    Math.min(anchor.y, y),
        bottom: Math.max(anchor.y, y),
    }
    const overlappingIds = findOverlappingBlockIds(box, ctx.wsaEl)
    ctx.blockSelection.apply(overlappingIds, !anchor.cmdKey)
}

// Block ids whose DragContainer box overlaps the rubber-band box. Hit-tests the
// outer .drag-container (the visual box), not ContentArea's inner Tag.
function findOverlappingBlockIds(
    box: { left: number; right: number; top: number; bottom: number },
    wsaEl: HTMLElement,
): Set<string> {
    const overlappingIds = new Set<string>()
    const blockEls = wsaEl.querySelectorAll<HTMLElement>('.drag-container[data-blockid]')

    blockEls.forEach(el => {
        const blockId = el.getAttribute('data-blockid')
        if (!blockId) return
        const bounds = el.getBoundingClientRect()
        const overlaps =
            bounds.left   < box.right  &&
            bounds.right  > box.left   &&
            bounds.top    < box.bottom &&
            bounds.bottom > box.top
        if (overlaps) overlappingIds.add(blockId)
    })
    return overlappingIds
}

// Wipe the text selection (state + painted highlight) without touching the
// block selection.
function clearSelection(ctx: PointerContext): void {
    ctx.state.clear()
    CSS.highlights.clear()
}
