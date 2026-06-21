import type { SelectionState, SelectionPoint } from "./selectionState";
import type { MouseEventData } from "./eventData";
import { pointToPosition } from "./domHelpers";

// Press: set anchor + focus to the clicked point. Collapse to caret.
export function handleMouseDown(
    _state: SelectionState,
    mouseData: MouseEventData,
): SelectionState {
    const point = pointToPosition(mouseData.clientX, mouseData.clientY);
    return { anchor: point, focus: point, mode: "caret" };
}

// Drag: keep anchor, move focus. Becomes a range while the pointer is down. The
// document-level move bridge fires on every mousemove, so an idle move (no button
// held, or no anchor yet) is ignored — only a real drag extends the selection.
export function handleMouseDrag(
    state: SelectionState,
    mouseData: MouseEventData,
): SelectionState {
    if (mouseData.buttons === 0 || !state.anchor) return state;
    const point = pointToPosition(mouseData.clientX, mouseData.clientY);
    return { ...state, focus: point, mode: "range" };
}

// Release: finalise focus at the release point. Mode collapses to caret when the
// release lands on the press point (a plain click), otherwise it stays a range.
// With no anchor (a release that began outside any block) nothing changes.
export function handleMouseUp(
    state: SelectionState,
    mouseData: MouseEventData,
): SelectionState {
    if (!state.anchor) return state;
    const point = pointToPosition(mouseData.clientX, mouseData.clientY);
    const mode  = isSamePoint(state.anchor, point) ? "caret" : "range";
    return { ...state, focus: point, mode };
}

// Two points at the same block + start offset (a release that did not move).
function isSamePoint(anchor: SelectionPoint | null, point: SelectionPoint): boolean {
    if (!anchor) return false;
    return anchor.blockId === point.blockId && anchor.offset === point.offset;
}
