// ── caretNavigation.ts ────────────────────────────────────────────────────────
// Plain caret movement (no Shift). Collapses any range, then moves the caret one
// unit in the requested direction. Standard text-editor behaviour.
//
// Pure: selection state in -> new selection state out.
// No DOM writes. No setters. No re-render. (Reads block text via domHelpers.)
//
// blockOrder (shape.file.content) is the source of truth for crossing block
// boundaries — e.g. ArrowLeft at offset 0 moves to the end of the previous block.

import type { SelectionState, SelectionPoint } from "../core/selectionState";
import { collapse } from "../core/selectionState";
import type { KeyEventData } from "../event-handlers/eventData";
import { getElementText } from "../event-handlers/domHelpers";

// ArrowLeft: one character left. At offset 0, jump to the end of the previous block.
export function arrowLeft(state: SelectionState, key: KeyEventData, blockOrder: string[]): SelectionState {
    const here = caretFrom(state, key);
    if (here.offset > 0) return caretAt(here.blockId, here.offset - 1);

    const previous = previousBlock(here.blockId, blockOrder);
    if (!previous) return caretAt(here.blockId, 0);
    return caretAt(previous, blockTextLength(previous));
}

// ArrowRight: one character right. At the block end, jump to the start of the next block.
export function arrowRight(state: SelectionState, key: KeyEventData, blockOrder: string[]): SelectionState {
    const here   = caretFrom(state, key);
    const length = blockTextLength(here.blockId);
    if (here.offset < length) return caretAt(here.blockId, here.offset + 1);

    const next = nextBlock(here.blockId, blockOrder);
    if (!next) return caretAt(here.blockId, length);
    return caretAt(next, 0);
}

// ArrowUp: move to the previous block, keeping the column offset (clamped).
// Visual-line granularity is deferred — block-to-block is the functional default.
export function arrowUp(state: SelectionState, key: KeyEventData, blockOrder: string[]): SelectionState {
    const here     = caretFrom(state, key);
    const previous = previousBlock(here.blockId, blockOrder);
    if (!previous) return caretAt(here.blockId, 0);
    return caretAt(previous, clampToBlock(previous, here.offset));
}

// ArrowDown: move to the next block, keeping the column offset (clamped).
export function arrowDown(state: SelectionState, key: KeyEventData, blockOrder: string[]): SelectionState {
    const here = caretFrom(state, key);
    const next = nextBlock(here.blockId, blockOrder);
    if (!next) return caretAt(here.blockId, clampToBlock(here.blockId, here.offset));
    return caretAt(next, clampToBlock(next, here.offset));
}


// ── Internal glue ──────────────────────────────────────────────────────────────

// The caret to move from: a collapsed range uses its focus; otherwise the live
// caret offset off the key event (the block the keystroke fired in).
function caretFrom(state: SelectionState, key: KeyEventData): SelectionPoint {
    const collapsed = collapse(state);
    if (collapsed.focus) return collapsed.focus;
    return { blockId: key.blockId, offset: caretOffsetOf(key), offsetEnd: caretOffsetOf(key) };
}

function caretOffsetOf(key: KeyEventData): number {
    return key.offset < 0 ? 0 : key.offset;
}

// A new collapsed-caret state at one block + offset.
function caretAt(blockId: string, offset: number): SelectionState {
    const point: SelectionPoint = { blockId, offset, offsetEnd: offset };
    return { anchor: point, focus: point, mode: "caret" };
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
