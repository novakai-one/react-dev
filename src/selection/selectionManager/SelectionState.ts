// SelectionState.ts
//
// Holds WHAT is currently selected — nothing about how events change it.
//   anchor       — where the selection started (the fixed end)
//   focus        — where the selection currently ends (the moving end)
//   resolved     — cross-block range, built before highlight rendering
//   targetOffset — remembered column for repeated Shift+Up / Shift+Down
//
// The gesture and keyboard helpers receive this object and mutate it. Keeping
// the four fields plus their plain predicates here means every module reads the
// same questions ("is there an active selection?") from one place.

import { SelectionPoint } from './SelectionPoint'
import type { ResolvedRange } from './types'
import { stripZWS } from './domHelpers'


export class SelectionState {

    anchor:       SelectionPoint      = new SelectionPoint()
    focus:        SelectionPoint      = new SelectionPoint()
    resolved:     ResolvedRange | null = null
    targetOffset: number | null        = null


    // True when anchor and focus sit on the exact same caret position.
    // Node identity matters: a block with <br> lines has multiple text nodes,
    // so two points at the same offset in different nodes are NOT collapsed.
    get isCollapsed(): boolean {
        if (!this.anchor.isSet || !this.focus.isSet) return true
        return (
            this.anchor.blockId === this.focus.blockId &&
            this.anchor.node    === this.focus.node    &&
            this.anchor.offset  === this.focus.offset
        )
    }

    hasActiveSelection(): boolean {
        return this.anchor.isSet && this.focus.isSet && !this.isCollapsed
    }

    // Selection is only valid across points of the same block type.
    get isSameType(): boolean {
        if (!this.anchor.isSet || !this.focus.isSet) return false
        return this.anchor.blockType === this.focus.blockType
    }

    // Can the selection extend to this candidate point? Yes if nothing is
    // anchored yet, otherwise only within the anchor's block type.
    canExtendTo(candidate: SelectionPoint): boolean {
        if (!this.anchor.isSet) return true
        return candidate.blockType === this.anchor.blockType
    }


    // Move the focus to a text node + offset. blockType is "content-area" — the
    // only selectable type today (see BlockType in types.ts).
    setFocusPoint(node: Text, blockId: string, offset: number): void {
        this.focus.node      = node
        this.focus.nodeText  = stripZWS(node.data || '')
        this.focus.blockId   = blockId
        this.focus.blockType = "content-area"
        this.focus.offset    = offset
    }

    // Pin the anchor to a text node + offset. Used by Select All, which sets
    // both ends explicitly rather than dragging focus away from a fixed anchor.
    setAnchorPoint(node: Text, blockId: string, offset: number): void {
        this.anchor.node      = node
        this.anchor.nodeText  = stripZWS(node.data || '')
        this.anchor.blockId   = blockId
        this.anchor.blockType = "content-area"
        this.anchor.offset    = offset
    }

    clearTargetOffset(): void {
        this.targetOffset = null
    }

    // Wipe the selection back to empty. Callers clear the rendered highlight
    // separately (CSS.highlights) — this object never touches the DOM.
    clear(): void {
        this.anchor       = new SelectionPoint()
        this.focus        = new SelectionPoint()
        this.resolved     = null
        this.targetOffset = null
    }
}
