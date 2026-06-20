// ── range.ts ──────────────────────────────────────────────────────────────────
// Flattens a selection (anchor/focus) into the ordered list of SelectionPoints
// it spans, using blockOrder (shape.file.content) as the document order.
//
// Pure. No DOM reads. No state. No setters.
//
// Ends carry their real offset. Middle blocks are whole-block: offset -1 marks
// "no partial offset, take the entire block".

import type { SelectionState, SelectionPoint } from "./selectionState";

export function orderedSelectionRange(
    selection: SelectionState,
    order: string[],
): SelectionPoint[] {
    const { anchor, focus } = selection;
    if (!anchor) return [];
    if (!focus) return [anchor];

    const anchorIdx = order.indexOf(anchor.blockId);
    const focusIdx  = order.indexOf(focus.blockId);

    // Either end missing from the order list: fall back to the raw two points.
    if (anchorIdx === -1 || focusIdx === -1) return [anchor, focus];

    const startIdx = Math.min(anchorIdx, focusIdx);
    const endIdx   = Math.max(anchorIdx, focusIdx);

    const points: SelectionPoint[] = [];
    for (let i = startIdx; i <= endIdx; i++) {
        const blockId = order[i];
        if (blockId === anchor.blockId)      points.push(anchor);
        else if (blockId === focus.blockId)  points.push(focus);
        else                                 points.push({ blockId, offset: -1 });
    }
    return points;
}
