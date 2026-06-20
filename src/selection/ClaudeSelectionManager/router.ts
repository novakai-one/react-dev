// ── router.ts ─────────────────────────────────────────────────────────────────
// Reads trigger, picks one handler, returns new selection state.
// Pure. No DOM writes. No setters. No re-render.

import type { SelectionState } from "./selectionState";
import type { MouseEventData, KeyEventData, LifecycleEventData } from "./eventData";
import {
    handleMouseDown,
    handleMouseDrag,
    handleMouseUp,
} from "./mouseHandlers";
import {
    handleArrow,
    handleShiftArrow,
    handleSelectAll,
} from "./keyHandlers";
import {
    handleBlur,
} from "./lifecycleHandlers";

// Mouse: trigger -> one mouse handler.
export function routeMouse(
    state: SelectionState,
    mouseData: MouseEventData,
    trigger: string,
): SelectionState {
    switch (trigger) {
        case "mousedown": return handleMouseDown(state, mouseData);
        case "mousemove": return handleMouseDrag(state, mouseData);
        case "mouseup":   return handleMouseUp(state, mouseData);
        default:          return state;
    }
}

// Key: trigger -> one key handler.
export function routeKey(
    state: SelectionState,
    keyData: KeyEventData,
    trigger: string,
): SelectionState {
    switch (trigger) {
        case "arrow":      return handleArrow(state, keyData);
        case "shiftArrow": return handleShiftArrow(state, keyData);
        case "selectAll":  return handleSelectAll(state, keyData);
        default:           return state;
    }
}

// Lifecycle: trigger -> one lifecycle handler.
export function routeLifecycle(
    state: SelectionState,
    lifecycleData: LifecycleEventData,
    trigger: string,
): SelectionState {
    switch (trigger) {
        case "blur": return handleBlur(state, lifecycleData);
        default:     return state;
    }
}
