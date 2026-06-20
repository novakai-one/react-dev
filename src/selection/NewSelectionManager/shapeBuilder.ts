// ── shapeBuilder.ts ───────────────────────────────────────────────────────────
// Produces the new DocShape SM returns to WSA.
// Applies the selection-driven document edit (deleting the selected text span),
// then returns a new object. Does NOT call setters — returning the shape is what
// lets React diff downstream.
//
// Only ONE edit lives here: deleting the currently selected text. Insertion at
// the caret is the clipboard's job (pasteIntoText), and structural create/delete
// is BlockManager's, so this module owns nothing but range deletion.

import type { DocShape, ContentDataSet, TextElement } from "./docShape";
import type { SelectionState, SelectionPoint } from "./selectionState";
import { orderedSelectionRange } from "./range";

// Build the new shape. When `deleteSelection` is set and the selection spans real
// text, the selected span is cut from every affected block; otherwise the shape
// passes through with fresh top-level identity for React to diff.
export function buildShape(
    shape: DocShape,
    state: SelectionState,
    deleteSelection = false,
): DocShape {
    if (!deleteSelection) return passThrough(shape);
    if (!isTextSelection(state)) return passThrough(shape);

    const order = shape.file?.content ?? [];
    const span  = orderedSelectionRange(state, order);
    if (span.length === 0) return passThrough(shape);

    return deleteSpan(shape, span);
}


// ── Edit: delete the selected span ───────────────────────────────────────────

// Removes each point's selected text from its block. Whole-block points clear the
// block's text entirely; edge points cut only their [offset, offsetEnd] slice.
function deleteSpan(shape: DocShape, span: SelectionPoint[]): DocShape {
    const contentData: ContentDataSet = { ...shape.contentData };

    for (const point of span) {
        const block = contentData[point.blockId];
        if (!block) continue;
        contentData[point.blockId] = withTextRemoved(block, point);
    }

    return { ...shape, contentData };
}

// A copy of the block with the point's selected text removed from innerContent.
function withTextRemoved(block: TextElement, point: SelectionPoint): TextElement {
    if (point.offset < 0) return { ...block, innerContent: "" };   // whole block

    const text = block.innerContent;
    const from = clampOffset(point.offset, text.length);
    const to   = point.offsetEnd < 0 ? text.length : clampOffset(point.offsetEnd, text.length);
    const cut  = text.slice(0, Math.min(from, to)) + text.slice(Math.max(from, to));
    return { ...block, innerContent: cut };
}


// ── Internal glue ──────────────────────────────────────────────────────────────

// A non-collapsed selection that sits in text (anchor and focus both set, and not
// the same caret position).
function isTextSelection(state: SelectionState): boolean {
    if (!state.anchor || !state.focus) return false;
    const sameSpot = state.anchor.blockId === state.focus.blockId
        && state.anchor.offset === state.focus.offset;
    return !sameSpot;
}

function passThrough(shape: DocShape): DocShape {
    return { ...shape };
}

function clampOffset(offset: number, length: number): number {
    if (offset < 0) return length;
    return Math.min(offset, length);
}
