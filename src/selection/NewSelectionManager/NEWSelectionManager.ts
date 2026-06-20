//to be built -> post-block creation needs a way to focus caret. 
//to be checked -> Sm should run SM methods first then CM then needs to update range after CM in case it changed.
//-> Need to have a way of identifying selectedBlock
//New SM needs to have uniform shape for events -> It should not be deciding what goes to CM and what does not.
//Needs to follow same pattern as wsa where it routes uniformly regardless of teh event type.

import type { DocShape } from "./docShape";
import type { MouseEventData, KeyEventData, LifecycleEventData } from "./eventData";
import type { SelectionState } from "./selectionState";
import { emptySelection } from "./selectionState";
import { routeMouse, routeKey, routeLifecycle } from "./router";
import { renderSelectionHighlight } from "./highlightRenderer";
import { ClipboardManager } from "../ClaudeClipboardManager/ClipboardManager";
import { buildShape } from "./shapeBuilder";
import { orderedSelectionRange } from "./range";


export class NewSelectionManager {

    private selection: SelectionState = emptySelection();   
    private wsaEl: HTMLElement | null = null;
    private clipboard = new ClipboardManager();
    public setWorkspaceEl = (el: HTMLElement | null): void => {
        this.wsaEl = el;
    };
    // ── Public entry points (called only by WSA) ─────────────────────────────
    // Three channels, identical contract: (eventData, trigger, shape) -> shape.
    // Uniform body for all three: build range -> clipboard -> route -> paint ->
    // shape. SM does NOT decide whether an event is a clipboard event; it threads
    // every event through the clipboard, which no-ops when the trigger is not a
    // clipboard keystroke (mirrors how WSA threads every event through every
    // helper).
    public receiveMouseEvent = (
        mouseData: MouseEventData,
        trigger: string,
        shape: DocShape,
    ): DocShape => {
        const order = this.blockOrder(shape);
        const range = orderedSelectionRange(this.selection, order);
        const afterClipboard = this.clipboard.receiveEvent(mouseData, null, trigger, shape, range);

        this.selection = routeMouse(this.selection, mouseData, trigger, order);
        this.applyHighlights(order);
        return buildShape(afterClipboard, this.selection);
    };

    public receiveKeyEvent = (
        keyData: KeyEventData,
        trigger: string,
        shape: DocShape,
    ): DocShape => {
        const order = this.blockOrder(shape);
        const range = orderedSelectionRange(this.selection, order);
        const afterClipboard = this.clipboard.receiveEvent(keyData, null, trigger, shape, range);

        this.selection = routeKey(this.selection, keyData, trigger, order);
        this.applyHighlights(order);
        return buildShape(afterClipboard, this.selection);
    };

    public receiveLifecycleEvent = (
        lifecycleData: LifecycleEventData,
        trigger: string,
        shape: DocShape,
    ): DocShape => {
        const order = this.blockOrder(shape);
        const range = orderedSelectionRange(this.selection, order);
        const afterClipboard = this.clipboard.receiveEvent(lifecycleData, null, trigger, shape, range);

        this.selection = routeLifecycle(this.selection, lifecycleData, trigger);
        this.applyHighlights(order);
        return buildShape(afterClipboard, this.selection);
    };


    // ── Internal glue ────────────────────────────────────────────────────────

    // Single source of truth for document order: the active file's block-id list. //
    private blockOrder(shape: DocShape): string[] {
        return shape.file?.content ?? [];
    }

    // Paint the selection highlight. CSS.highlights only — no state, no re-render.
    private applyHighlights(order: string[]): void {
        renderSelectionHighlight(this.selection, order, this.wsaEl);
    }
}
