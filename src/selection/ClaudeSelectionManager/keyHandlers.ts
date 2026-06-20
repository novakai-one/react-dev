// ── keyHandlers.ts ────────────────────────────────────────────────────────────
// Pure keyboard logic.
// Selection state in -> new selection state out.
// No DOM writes. No setters. No re-render.

import type { SelectionState } from "./selectionState";
import { collapse } from "./selectionState";
import type { KeyEventData } from "./eventData";

// Plain arrow: collapse to a single caret, then move it.
// Placeholder: caret movement math added during migration.
export function handleArrow(
    state: SelectionState,
    keyData: KeyEventData,
): SelectionState {
    return collapse(state);
}

// Shift arrow: keep anchor, move focus. Becomes a range.
// Placeholder: focus movement math added during migration.
export function handleShiftArrow(
    state: SelectionState,
    keyData: KeyEventData,
): SelectionState {
    return { ...state, mode: "range" };
}

// Select all: whole-document multi-block selection.
// Placeholder: anchor/focus span set during migration.
export function handleSelectAll(
    state: SelectionState,
    keyData: KeyEventData,
): SelectionState {
    return { ...state, mode: "multi-block" };
}
