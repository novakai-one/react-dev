// selectionExtend.ts
//
// Growing a selection from the keyboard. The anchor stays put; only focus moves.
//   Shift+Arrow        — extend one character / one line
//   Cmd+Shift+Left/Right — extend to the line edge
//   Cmd+Shift+Up/Down    — extend to the document edge
//   Cmd+A              — select current block, then the whole document
//
// Up / Down remember the column the user started on (state.targetOffset) so a
// run of presses tracks a straight vertical line instead of drifting.
//
// Every extend leaves state.resolved null; the highlight pipeline rebuilds it.

import type { SelectionState } from './SelectionState'
import type { CaretContext } from './caretNavigation'
import {
    stripZWS,
    snapshotBrowserCaret,
    getFirstTextNodeForBlock,
    getLastTextNodeForBlock,
    getPrevTextNodeInBlock,
    getNextTextNodeInBlock,
} from './domHelpers'


// ── Shift+Left / Shift+Right — one character ─────────────────────────────────

export function shiftArrowRight(ctx: CaretContext, blockId: string): void {
    const { state } = ctx
    state.clearTargetOffset()
    ensureAnchorIsSet(state, blockId)
    if (state.focus.offset < state.focus.nodeText.length) state.focus.offset++
    state.resolved = null
}

export function shiftArrowLeft(ctx: CaretContext, blockId: string): void {
    const { state } = ctx
    state.clearTargetOffset()
    ensureAnchorIsSet(state, blockId)
    if (state.focus.offset > 0) state.focus.offset--
    state.resolved = null
}


// ── Cmd+Shift+Left / Right — to the line edge ────────────────────────────────

export function cmdShiftArrowRight(ctx: CaretContext, blockId: string): void {
    const { state } = ctx
    state.clearTargetOffset()
    ensureAnchorIsSet(state, blockId)
    if (state.focus.node) state.focus.offset = state.focus.node.length
    state.resolved = null
}

export function cmdShiftArrowLeft(ctx: CaretContext, blockId: string): void {
    const { state } = ctx
    state.clearTargetOffset()
    ensureAnchorIsSet(state, blockId)
    state.focus.offset = 0
    state.resolved     = null
}


// ── Cmd+Shift+Up / Down — to the document edge ───────────────────────────────

export function cmdShiftArrowUp(ctx: CaretContext, blockId: string): void {
    const { state } = ctx
    ensureAnchorIsSet(state, blockId)
    const firstBlockId = ctx.blockOrder[0]
    if (!firstBlockId) return
    const firstNode = getFirstTextNodeForBlock(firstBlockId, ctx.wsaEl)
    if (!firstNode) return
    state.setFocusPoint(firstNode, firstBlockId, 0)
    state.resolved = null
}

export function cmdShiftArrowDown(ctx: CaretContext, blockId: string): void {
    const { state } = ctx
    ensureAnchorIsSet(state, blockId)
    const lastBlockId = ctx.blockOrder[ctx.blockOrder.length - 1]
    if (!lastBlockId) return
    const lastNode = getLastTextNodeForBlock(lastBlockId, ctx.wsaEl)
    if (!lastNode) return
    state.setFocusPoint(lastNode, lastBlockId, lastNode.length)
    state.resolved = null
}


// ── Shift+Up / Shift+Down — one line, remembering the column ──────────────────

export function shiftArrowUp(ctx: CaretContext, blockId: string): void {
    const { state } = ctx
    ensureAnchorIsSet(state, blockId)
    if (!state.anchor.isSet) return

    rememberColumn(state)
    const focusNode = state.focus.node
    const focusBlockIdx = ctx.blockOrder.indexOf(state.focus.blockId)
    if (focusBlockIdx === -1) return

    // Already on the very first line: clamp the selection to the document start.
    const isFirstLineOfFirstBlock = focusBlockIdx === 0 && focusNode && !getPrevTextNodeInBlock(focusNode)
    if (isFirstLineOfFirstBlock) {
        state.targetOffset = 0
        extendFocusToNode(state, state.focus.blockId, focusNode!)
        return
    }

    // Previous line within the same block.
    const prevInBlock = focusNode ? getPrevTextNodeInBlock(focusNode) : null
    if (prevInBlock) {
        extendFocusToNode(state, state.focus.blockId, prevInBlock)
        return
    }

    // Last line of the block above.
    const blockAboveId = ctx.blockOrder[focusBlockIdx - 1]
    const lastNodeAbove = getLastTextNodeForBlock(blockAboveId, ctx.wsaEl)
    if (!lastNodeAbove) return
    extendFocusToNode(state, blockAboveId, lastNodeAbove)
}

export function shiftArrowDown(ctx: CaretContext, blockId: string): void {
    const { state } = ctx
    ensureAnchorIsSet(state, blockId)
    if (!state.anchor.isSet) return

    rememberColumn(state)
    const focusNode = state.focus.node
    const focusBlockIdx = ctx.blockOrder.indexOf(state.focus.blockId)
    if (focusBlockIdx === -1) return

    // Already on the very last line: clamp the selection to the document end.
    const isLastLineOfLastBlock =
        focusBlockIdx === ctx.blockOrder.length - 1 && focusNode && !getNextTextNodeInBlock(focusNode)
    if (isLastLineOfLastBlock) {
        state.targetOffset = focusNode!.length
        extendFocusToNode(state, state.focus.blockId, focusNode!)
        return
    }

    // Next line within the same block.
    const nextInBlock = focusNode ? getNextTextNodeInBlock(focusNode) : null
    if (nextInBlock) {
        extendFocusToNode(state, state.focus.blockId, nextInBlock)
        return
    }

    // First line of the block below.
    const blockBelowId = ctx.blockOrder[focusBlockIdx + 1]
    const firstNodeBelow = getFirstTextNodeForBlock(blockBelowId, ctx.wsaEl)
    if (!firstNodeBelow) return
    extendFocusToNode(state, blockBelowId, firstNodeBelow)
}


// ── Cmd+A — current block first, then the whole document ─────────────────────

export function selectAll(ctx: CaretContext, blockId: string): void {
    const { state } = ctx
    state.clearTargetOffset()

    const currentTextNode = getFirstTextNodeForBlock(blockId, ctx.wsaEl)
    if (!currentTextNode) return
    const currentText = stripZWS(currentTextNode.data || '')

    if (currentBlockFullySelected(state, blockId, currentText) && ctx.blockOrder.length > 1) {
        selectWholeDocument(ctx)
    } else {
        state.setAnchorPoint(currentTextNode, blockId, 0)
        state.setFocusPoint(currentTextNode, blockId, currentTextNode.length)
    }
    state.resolved = null
}

function selectWholeDocument(ctx: CaretContext): void {
    const { state } = ctx
    const firstBlockId = ctx.blockOrder[0]
    const lastBlockId  = ctx.blockOrder[ctx.blockOrder.length - 1]
    const firstNode = getFirstTextNodeForBlock(firstBlockId, ctx.wsaEl)
    const lastNode  = getLastTextNodeForBlock(lastBlockId, ctx.wsaEl)
    if (!firstNode || !lastNode) return

    state.setAnchorPoint(firstNode, firstBlockId, 0)
    state.setFocusPoint(lastNode, lastBlockId, lastNode.length)
}

function currentBlockFullySelected(state: SelectionState, blockId: string, currentText: string): boolean {
    return (
        state.anchor.blockId === blockId &&
        state.focus.blockId  === blockId &&
        state.anchor.offset  === 0 &&
        state.focus.offset   >= currentText.length
    )
}


// ── Shared steps ─────────────────────────────────────────────────────────────

// Seed both ends from the live browser caret when nothing is anchored yet, so a
// Shift press has a fixed point to extend away from.
function ensureAnchorIsSet(state: SelectionState, blockId: string): void {
    if (state.anchor.isSet) return
    const caret = snapshotBrowserCaret(blockId)
    if (!caret) return
    state.anchor.copyFrom(caret)
    state.focus.copyFrom(caret)
}

// Capture the starting column on the first vertical press of a run.
function rememberColumn(state: SelectionState): void {
    if (state.targetOffset === null) state.targetOffset = state.focus.offset
}

// Move focus to a node, landing on the remembered column clamped to that line.
function extendFocusToNode(state: SelectionState, targetBlockId: string, textNode: Text): void {
    const targetText = stripZWS(textNode.data || '')
    const desiredOffset = state.targetOffset ?? state.focus.offset
    state.setFocusPoint(textNode, targetBlockId, Math.min(desiredOffset, targetText.length))
    state.resolved = null
}
