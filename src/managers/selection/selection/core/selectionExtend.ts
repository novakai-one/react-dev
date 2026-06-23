// ── selectionExtend.ts ────────────────────────────────────────────────────────
// Shift and Cmd/Ctrl+Shift movement — extends the selection instead of moving a
// caret. Anchor stays put; focus moves; the pair becomes a range. Plus Select All.
// Standard text-editor behaviour.
//
// Pure: selection state in -> new selection state out.
// No DOM writes. No setters. No re-render. (Reads block text via domHelpers.)

import type { SelectionState, SelectionPoint } from "./selectionState";
import type { KeyEventData } from "../event-handlers/eventData";
import { getElementText } from "../event-handlers/domHelpers";

// ── Shift + Arrow: extend by one character / block edge ──────────────────────

export function shiftArrowLeft(state: SelectionState, key: KeyEventData, blockOrder: string[]): SelectionState {
    const { anchor, focus } = extendEnds(state, key);
    if (focus.offset > 0) return rangeBetween(anchor, movedTo(focus, focus.offset - 1));

    const previous = previousBlock(focus.blockId, blockOrder);
    if (!previous) return rangeBetween(anchor, focus);
    return rangeBetween(anchor, pointAt(previous, blockTextLength(previous)));
}

export function shiftArrowRight(state: SelectionState, key: KeyEventData, blockOrder: string[]): SelectionState {
    const { anchor, focus } = extendEnds(state, key);
    const length = blockTextLength(focus.blockId);
    if (focus.offset < length) return rangeBetween(anchor, movedTo(focus, focus.offset + 1));

    const next = nextBlock(focus.blockId, blockOrder);
    if (!next) return rangeBetween(anchor, focus);
    return rangeBetween(anchor, pointAt(next, 0));
}

export function shiftArrowUp(state: SelectionState, key: KeyEventData, blockOrder: string[]): SelectionState {
    const { anchor, focus } = extendEnds(state, key);
    const previous = previousBlock(focus.blockId, blockOrder);
    if (!previous) return rangeBetween(anchor, movedTo(focus, 0));
    return rangeBetween(anchor, pointAt(previous, clampToBlock(previous, focus.offset)));
}

export function shiftArrowDown(state: SelectionState, key: KeyEventData, blockOrder: string[]): SelectionState {
    const { anchor, focus } = extendEnds(state, key);
    const next = nextBlock(focus.blockId, blockOrder);
    if (!next) return rangeBetween(anchor, movedTo(focus, blockTextLength(focus.blockId)));
    return rangeBetween(anchor, pointAt(next, clampToBlock(next, focus.offset)));
}

// ── Cmd/Ctrl + Shift + Arrow: extend by line / document edge ──────────────────

export function cmdShiftArrowLeft(state: SelectionState, key: KeyEventData, _blockOrder: string[]): SelectionState {
    const { anchor, focus } = extendEnds(state, key);
    return rangeBetween(anchor, movedTo(focus, 0));   // to the start of the focus block
}

export function cmdShiftArrowRight(state: SelectionState, key: KeyEventData, _blockOrder: string[]): SelectionState {
    const { anchor, focus } = extendEnds(state, key);
    return rangeBetween(anchor, movedTo(focus, blockTextLength(focus.blockId)));   // to the end
}

export function cmdShiftArrowUp(state: SelectionState, key: KeyEventData, blockOrder: string[]): SelectionState {
    const { anchor } = extendEnds(state, key);
    const firstBlock = blockOrder[0];
    if (!firstBlock) return state;
    return rangeBetween(anchor, pointAt(firstBlock, 0));   // to the start of the document
}

export function cmdShiftArrowDown(state: SelectionState, key: KeyEventData, blockOrder: string[]): SelectionState {
    const { anchor } = extendEnds(state, key);
    const lastBlock = blockOrder[blockOrder.length - 1];
    if (!lastBlock) return state;
    return rangeBetween(anchor, pointAt(lastBlock, blockTextLength(lastBlock)));   // to the end of the document
}

// ── Select All ────────────────────────────────────────────────────────────────

// Anchor at the first block's start, focus at the last block's end — the whole
// document. Mode is multi-block so the renderer and clipboard treat it as a
// block-spanning selection.
export function selectAll(state: SelectionState, _key: KeyEventData, blockOrder: string[]): SelectionState {
    const firstBlock = blockOrder[0];
    const lastBlock  = blockOrder[blockOrder.length - 1];
    if (!firstBlock || !lastBlock) return state;

    const anchor = pointAt(firstBlock, 0);
    const focus  = pointAt(lastBlock, blockTextLength(lastBlock));
    return { anchor, focus, mode: "multi-block" };
}


// ── Internal glue ──────────────────────────────────────────────────────────────

// The anchor/focus to extend from. An existing range keeps its anchor and moves
// its focus; a fresh extend pins the anchor at the live caret (off the key event)
// and moves from there.
function extendEnds(state: SelectionState, key: KeyEventData): { anchor: SelectionPoint; focus: SelectionPoint } {
    if (state.anchor && state.focus) return { anchor: state.anchor, focus: state.focus };
    const caret = pointAt(key.blockId, caretOffsetOf(key));
    return { anchor: caret, focus: caret };
}

function caretOffsetOf(key: KeyEventData): number {
    return key.offset < 0 ? 0 : key.offset;
}

// A range from a fixed anchor to a moved focus. Mode follows whether the two ends
// sit in the same block.
function rangeBetween(anchor: SelectionPoint, focus: SelectionPoint): SelectionState {
    const mode = anchor.blockId === focus.blockId ? "range" : "multi-block";
    return { anchor, focus, mode };
}

function movedTo(point: SelectionPoint, offset: number): SelectionPoint {
    return { blockId: point.blockId, offset, offsetEnd: offset };
}

function pointAt(blockId: string, offset: number): SelectionPoint {
    return { blockId, offset, offsetEnd: offset };
}

function blockTextLength(blockId: string): number {
    return getElementText(blockId).length;
}

function clampToBlock(blockId: string, offset: number): number {
    return Math.min(offset, blockTextLength(blockId));
}

function previousBlock(blockId: string, order: string[]): string | null {
    const index = order.indexOf(blockId);
    return index > 0 ? order[index - 1] : null;
}

function nextBlock(blockId: string, order: string[]): string | null {
    const index = order.indexOf(blockId);
    return index >= 0 && index < order.length - 1 ? order[index + 1] : null;
}
