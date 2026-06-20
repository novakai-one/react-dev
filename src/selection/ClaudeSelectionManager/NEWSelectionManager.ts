// ── Module layout ────────────────────────────────────────────────────────────
//   docShape          — re-exports canonical DocShape + member types
//   eventData         — re-exports canonical MouseEventData / KeyEventData / LifecycleEventData
//   selectionState    — SelectionPoint / SelectionState / SelectionMode + transforms
//   domHelpers        — the ONLY place that reads/writes the DOM
//   mouseHandlers     — pure mouse gesture logic
//   keyHandlers       — pure keyboard logic
//   lifecycleHandlers — pure lifecycle logic (blur; future focus / input)
//   router            — trigger -> one handler (mouse / key / lifecycle)
//   shapeBuilder      — builds the new DocShape returned to WSA
//   NewSelectionManager — state + delegation (this file)
//
// Design boundary:
//   No module triggers a re-render directly.
//   No module changes a stateful value that triggers re-render.
//   SM: shape in -> new shape out, 100% of the time.
//
// Event channels (canonical contract): three families, one entry point each.
//   The full event reaches SM so SM can own preventDefault (KeyEventData carries
//   nativeEvent). WSA will be wired to hand the event through in a later step.

import type { DocShape } from "./docShape";
import type { MouseEventData, KeyEventData, LifecycleEventData } from "./eventData";
import type { SelectionState } from "./selectionState";
import { emptySelection } from "./selectionState";
import { routeMouse, routeKey, routeLifecycle } from "./router";
import { buildShape } from "./shapeBuilder";


// ─────────────────────────────────────────────────────────────────────────────
// NewSelectionManager
// Holds selection state. Delegates routing, handling, and shape building to modules.
// Selection state lives here, in a private field, never inside DocShape.
// ─────────────────────────────────────────────────────────────────────────────

export class NewSelectionManager {

    // ── Private selection state ──────────────────────────────────────────────
    private selection: SelectionState = emptySelection();


    // ── Public entry points ──────────────────────────────────────────────────
    // WSA catches the raw event, packs it, sets the trigger, passes the shape.
    // Three channels, identical contract: (eventData, trigger, shape) -> shape.

    public receiveMouseEvent = (
        mouseData: MouseEventData,
        trigger: string,
        shape: DocShape,
    ): DocShape => {
        this.selection = routeMouse(this.selection, mouseData, trigger);
        return buildShape(shape, this.selection);
    };

    public receiveKeyEvent = (
        keyData: KeyEventData,
        trigger: string,
        shape: DocShape,
    ): DocShape => {
        this.selection = routeKey(this.selection, keyData, trigger);
        return buildShape(shape, this.selection);
    };

    public receiveLifecycleEvent = (
        lifecycleData: LifecycleEventData,
        trigger: string,
        shape: DocShape,
    ): DocShape => {
        this.selection = routeLifecycle(this.selection, lifecycleData, trigger);
        return buildShape(shape, this.selection);
    };
}
