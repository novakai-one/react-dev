// ── highlightRenderer.ts ──────────────────────────────────────────────────────
// Paints the selection using the CSS Custom Highlight API.
//
// IMPORTANT — why this does NOT cause a re-render:
//   CSS.highlights is a browser-level paint registry, not React state. Writing
//   to it changes pixels, not the component tree. No setter is called, no shape
//   is emitted, no stateful value changes. Blocks are never told they are
//   highlighted — they render their content and stay dumb. So this module is the
//   one place allowed to "draw" without touching the React/shape contract.
//
// Contract: read selection state + the block order, build a Range, paint it.
// Returns void. Never returns a shape. Never calls a setter.

import type { SelectionState, SelectionPoint } from "./selectionState";
import { blockElementById, textNodeAtOffset } from "./domHelpers";

// Name registered with CSS.highlights — the matching ::highlight(name) lives in CSS.
const HIGHLIGHT_NAME = "doc-selection";

// Entry point. Called after every selection-changing event.
// blockOrder is the ordered block-id list (shape.file.content), the single
// source of truth for document order — no DOM order reads.
export function renderSelectionHighlight(
    state: SelectionState,
    blockOrder: string[],
    wsaEl: HTMLElement | null,
): void {
    if (!wsaEl) return;

    // Nothing meaningful selected -> clear any existing paint and stop.
    if (state.anchor === null || state.focus === null || state.mode === "caret") {
        clearHighlight();
        return;
    }

    const range = buildResolvedRange(state.anchor, state.focus, blockOrder, wsaEl);
    if (range === null) {
        clearHighlight();
        return;
    }

    paintRange(range);
}

// Flattens a possibly cross-block anchor->focus pair into one DOM Range spanning
// the start boundary (first in document order) to the end boundary. Returns null
// when either boundary cannot be resolved to a text node.
export function buildResolvedRange(
    anchor: SelectionPoint,
    focus: SelectionPoint,
    blockOrder: string[],
    _wsaEl: HTMLElement,
): Range | null {
    const start = earlierInDocument(anchor, focus, blockOrder);
    const end   = laterInDocument(anchor, focus, blockOrder);

    const startBoundary = boundaryFor(start);
    const endBoundary   = boundaryFor(end);
    if (!startBoundary || !endBoundary) return null;

    const range = document.createRange();
    range.setStart(startBoundary.node, startBoundary.offset);
    range.setEnd(endBoundary.node, endBoundary.offset);
    return range;
}

// Registers the range under the highlight name. The actual colour comes from
// the ::highlight(doc-selection) rule in CSS, not from here.
function paintRange(range: Range): void {
    CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(range));
}

// Removes this module's highlight only. Does not stomp other highlights.
export function clearHighlight(): void {
    CSS.highlights.delete(HIGHLIGHT_NAME);
}


// ── Internal glue ──────────────────────────────────────────────────────────────

// Resolves a selection point to its DOM boundary (text node + node offset). A
// whole-block point (offset -1) anchors at the start of the block's text.
function boundaryFor(point: SelectionPoint): { node: Text; offset: number } | null {
    const blockEl = blockElementById(point.blockId);
    if (!blockEl) return null;
    const logicalOffset = point.offset < 0 ? 0 : point.offset;
    return textNodeAtOffset(blockEl, logicalOffset);
}

// The point that appears FIRST in document order.
function earlierInDocument(a: SelectionPoint, b: SelectionPoint, order: string[]): SelectionPoint {
    return order.indexOf(a.blockId) <= order.indexOf(b.blockId) ? a : b;
}

// The point that appears LAST in document order.
function laterInDocument(a: SelectionPoint, b: SelectionPoint, order: string[]): SelectionPoint {
    return order.indexOf(a.blockId) <= order.indexOf(b.blockId) ? b : a;
}
