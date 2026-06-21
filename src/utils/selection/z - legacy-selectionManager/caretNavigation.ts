// caretNavigation.ts
//
// Moving a single caret with the plain Arrow keys, and dropping the caret into
// a block after a structural change (focusBlockStart / focusBlockEnd).
//
// Every move updates focus, copies focus onto anchor (so the selection stays
// collapsed), then writes the caret back to the browser. The keyboard-driven
// SELECTION extends (Shift / Cmd+Shift) live in selectionExtend.ts.
//
// CaretContext bundles the selection state plus the document layout each move
// needs to step across text nodes and blocks.

import type { SelectionState } from './SelectionState'
import {
    snapshotBrowserCaret,
    pushCaretToDOM,
    findEditableForBlock,
    getFirstTextNodeForBlock,
    getLastTextNodeForBlock,
    getPrevTextNodeInBlock,
    getNextTextNodeInBlock,
} from './domHelpers'


export interface CaretContext {
    state: SelectionState
    blockOrder: string[]
    wsaEl: HTMLElement
}


// ── Focus a block after a structural change ──────────────────────────────────

// Place the caret at the START of a block's text. Called after Enter creates a
// new block. Creates an empty text node if the editable has none, so the caret
// has somewhere to land.
export function focusBlockStart(state: SelectionState, blockId: string, wsaEl: HTMLElement): void {
    const editable = findEditableForBlock(blockId, wsaEl)
    if (!editable) return
    editable.focus()

    const textNode = firstTextNodeOrCreate(editable)
    state.setFocusPoint(textNode, blockId, 0)
    state.anchor.copyFrom(state.focus)
    pushCaretToDOM(state.focus)
}

// Place the caret at the END of a block's text. Called after Backspace deletes
// an empty block, so focus falls onto the previous block where the user is
// heading rather than nowhere.
export function focusBlockEnd(state: SelectionState, blockId: string, wsaEl: HTMLElement): void {
    const editable = findEditableForBlock(blockId, wsaEl)
    if (!editable) return
    editable.focus()

    const textNode = getLastTextNodeForBlock(blockId, wsaEl) ?? appendEmptyTextNode(editable)
    state.setFocusPoint(textNode, blockId, textNode.length)
    state.anchor.copyFrom(state.focus)
    pushCaretToDOM(state.focus)
}


// ── Plain Arrow keys ─────────────────────────────────────────────────────────
// Left / Right collapse an active selection and stop. Up / Down collapse but
// keep moving, so the caret steps one line past the collapsed edge.

export function arrowRight(ctx: CaretContext, blockId: string): void {
    ctx.state.clearTargetOffset()
    if (ctx.state.hasActiveSelection()) { collapseToEnd(ctx.state); return }
    if (!seedCaretIfFocusUnset(ctx.state, blockId)) return
    moveCaretRight(ctx)
}

export function arrowLeft(ctx: CaretContext, blockId: string): void {
    ctx.state.clearTargetOffset()
    if (ctx.state.hasActiveSelection()) { collapseToStart(ctx.state); return }
    if (!seedCaretIfFocusUnset(ctx.state, blockId)) return
    moveCaretLeft(ctx)
}

export function arrowUp(ctx: CaretContext, blockId: string): void {
    if (ctx.state.hasActiveSelection()) collapseToStart(ctx.state)
    if (!seedCaretIfFocusUnset(ctx.state, blockId)) return
    moveCaretUp(ctx)
}

export function arrowDown(ctx: CaretContext, blockId: string): void {
    if (ctx.state.hasActiveSelection()) collapseToEnd(ctx.state)
    if (!seedCaretIfFocusUnset(ctx.state, blockId)) return
    moveCaretDown(ctx)
}


// ── Caret movement bodies ────────────────────────────────────────────────────

function moveCaretRight(ctx: CaretContext): void {
    const { state } = ctx
    if (!state.focus.node) return

    // Step within the current text node.
    if (state.focus.offset < state.focus.node.length) {
        state.focus.offset++
        syncAnchorToFocus(state)
        return
    }

    // Step to the next text node in the same block (across a <br> line).
    const nextInBlock = getNextTextNodeInBlock(state.focus.node)
    if (nextInBlock) {
        state.setFocusPoint(nextInBlock, state.focus.blockId, 0)
        syncAnchorToFocus(state)
        return
    }

    // Step to the start of the next block.
    const nextBlockId = blockAfter(ctx, state.focus.blockId)
    if (!nextBlockId) return
    const firstNode = getFirstTextNodeForBlock(nextBlockId, ctx.wsaEl)
    if (!firstNode) return
    state.setFocusPoint(firstNode, nextBlockId, 0)
    syncAnchorToFocus(state)
}

function moveCaretLeft(ctx: CaretContext): void {
    const { state } = ctx
    if (!state.focus.node) return

    if (state.focus.offset > 0) {
        state.focus.offset--
        syncAnchorToFocus(state)
        return
    }

    const prevInBlock = getPrevTextNodeInBlock(state.focus.node)
    if (prevInBlock) {
        state.setFocusPoint(prevInBlock, state.focus.blockId, prevInBlock.length)
        syncAnchorToFocus(state)
        return
    }

    const prevBlockId = blockBefore(ctx, state.focus.blockId)
    if (!prevBlockId) return
    const lastNode = getLastTextNodeForBlock(prevBlockId, ctx.wsaEl)
    if (!lastNode) return
    state.setFocusPoint(lastNode, prevBlockId, lastNode.length)
    syncAnchorToFocus(state)
}

function moveCaretUp(ctx: CaretContext): void {
    const { state } = ctx
    if (!state.focus.node) return

    // Up keeps the column: clamp the current offset to the target line length.
    const prevInBlock = getPrevTextNodeInBlock(state.focus.node)
    if (prevInBlock) {
        state.setFocusPoint(prevInBlock, state.focus.blockId, Math.min(state.focus.offset, prevInBlock.length))
        syncAnchorToFocus(state)
        return
    }

    const prevBlockId = blockBefore(ctx, state.focus.blockId)
    if (!prevBlockId) return
    const lastNode = getLastTextNodeForBlock(prevBlockId, ctx.wsaEl)
    if (!lastNode) return
    state.setFocusPoint(lastNode, prevBlockId, Math.min(state.focus.offset, lastNode.length))
    syncAnchorToFocus(state)
}

function moveCaretDown(ctx: CaretContext): void {
    const { state } = ctx
    if (!state.focus.node) return

    const nextInBlock = getNextTextNodeInBlock(state.focus.node)
    if (nextInBlock) {
        state.setFocusPoint(nextInBlock, state.focus.blockId, Math.min(state.focus.offset, nextInBlock.length))
        syncAnchorToFocus(state)
        return
    }

    const nextBlockId = blockAfter(ctx, state.focus.blockId)
    if (!nextBlockId) return
    const firstNode = getFirstTextNodeForBlock(nextBlockId, ctx.wsaEl)
    if (!firstNode) return
    state.setFocusPoint(firstNode, nextBlockId, Math.min(state.focus.offset, firstNode.length))
    syncAnchorToFocus(state)
}


// ── Collapse an active selection onto one edge ───────────────────────────────

function collapseToEnd(state: SelectionState): void {
    const isSingleBlock = state.anchor.blockId === state.focus.blockId
    if (isSingleBlock) {
        const endOffset = Math.max(state.anchor.offset, state.focus.offset)
        state.anchor.offset = endOffset
        state.focus.offset  = endOffset
    } else {
        const endPoint = state.resolved ? state.resolved.end : state.focus
        state.anchor.copyFrom(endPoint)
        state.focus.copyFrom(endPoint)
    }
    state.resolved = null
    CSS.highlights.clear()
    pushCaretToDOM(state.focus)
}

function collapseToStart(state: SelectionState): void {
    const isSingleBlock = state.anchor.blockId === state.focus.blockId
    if (isSingleBlock) {
        const startOffset = Math.min(state.anchor.offset, state.focus.offset)
        state.anchor.offset = startOffset
        state.focus.offset  = startOffset
    } else {
        const startPoint = state.resolved ? state.resolved.start : state.anchor
        state.anchor.copyFrom(startPoint)
        state.focus.copyFrom(startPoint)
    }
    state.resolved = null
    CSS.highlights.clear()
    pushCaretToDOM(state.focus)
}


// ── Small shared steps ───────────────────────────────────────────────────────

// Copy focus onto anchor (keeping the selection collapsed) and write the caret
// back to the browser.
function syncAnchorToFocus(state: SelectionState): void {
    state.anchor.copyFrom(state.focus)
    pushCaretToDOM(state.focus)
}

// Seed anchor+focus from the live browser caret when no focus is set yet.
// Returns false when there is no caret to read (caller should bail).
function seedCaretIfFocusUnset(state: SelectionState, blockId: string): boolean {
    if (state.focus.isSet) return true
    const caret = snapshotBrowserCaret(blockId)
    if (!caret) return false
    state.anchor.copyFrom(caret)
    state.focus.copyFrom(caret)
    return true
}

function blockAfter(ctx: CaretContext, blockId: string): string | null {
    const idx = ctx.blockOrder.indexOf(blockId)
    if (idx === -1 || idx === ctx.blockOrder.length - 1) return null
    return ctx.blockOrder[idx + 1]
}

function blockBefore(ctx: CaretContext, blockId: string): string | null {
    const idx = ctx.blockOrder.indexOf(blockId)
    if (idx <= 0) return null
    return ctx.blockOrder[idx - 1]
}

function firstTextNodeOrCreate(editable: HTMLElement): Text {
    const existing = Array.from(editable.childNodes).find(n => n.nodeType === Node.TEXT_NODE) as Text | undefined
    return existing ?? appendEmptyTextNode(editable)
}

function appendEmptyTextNode(editable: HTMLElement): Text {
    const textNode = document.createTextNode('')
    editable.appendChild(textNode)
    return textNode
}
