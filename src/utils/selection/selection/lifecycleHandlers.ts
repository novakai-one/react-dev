// ── lifecycleHandlers.ts ──────────────────────────────────────────────────────
// Pure lifecycle logic (blur now; focus / input later).
// Selection state in -> new selection state out.
// No DOM writes. No setters. No re-render.

import type { SelectionState } from "./selectionState";
import type { LifecycleEventData } from "./eventData";

// Blur: a block lost focus. Selection is intentionally PERSISTED across blur —
// committing the block's edited text is BlockManager's concern (content-area-blur
// flows there), not the selection's, so SM leaves anchor/focus untouched.
export function handleBlur(
    state: SelectionState,
    _lifecycleData: LifecycleEventData,
): SelectionState {
    return state;
}
