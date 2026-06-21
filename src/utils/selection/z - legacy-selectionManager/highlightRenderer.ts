// highlightRenderer.ts
//
// Turns the current selection into painted highlight ranges via the CSS Custom
// Highlight API. Two shapes of selection, two collectors:
//   single block  → collectSingleBlockRanges (anchor and focus in one block)
//   cross block   → collectCrossBlockRanges (uses the pre-built ResolvedRange)
//
// buildResolvedRange flattens a cross-block selection into { start, middle[],
// end } in document order. Call it before renderSelectionHighlight for any
// selection that spans more than one block.
//
// ZWS rule: Range endpoints use node.length (raw), never nodeText.length. See
// domHelpers.ts.

import { SelectionPoint } from './SelectionPoint'
import type { ResolvedRange } from './types'
import type { SelectionState } from './SelectionState'
import {
    stripZWS,
    getFirstTextNodeForBlock,
    getLastTextNodeForBlock,
} from './domHelpers'


// Paints the selection. Clears any previous highlight first, then sets the new
// one. Does nothing when there is no active, same-type selection.
export function renderSelectionHighlight(state: SelectionState, wsaEl: HTMLElement): void {
    CSS.highlights.clear()
    if (!state.hasActiveSelection()) return

    const isSingleBlock = state.anchor.blockId === state.focus.blockId
    const ranges = isSingleBlock
        ? collectSingleBlockRanges(state.anchor, state.focus)
        : collectCrossBlockRanges(state.resolved, wsaEl)

    if (ranges.length > 0) {
        CSS.highlights.set("highlight", new Highlight(...ranges))
    }
}


// One block, so at most one range. Anchor and focus may live in the same text
// node or in two different <br> lines of the same block.
function collectSingleBlockRanges(anchor: SelectionPoint, focus: SelectionPoint): Range[] {
    if (!anchor.node || !focus.node) return []

    if (anchor.node === focus.node) {
        const startOffset = Math.min(anchor.offset, focus.offset)
        const endOffset   = Math.max(anchor.offset, focus.offset)
        if (startOffset === endOffset) return []   // collapsed — nothing to paint
        return [rangeBetween(anchor.node, startOffset, anchor.node, endOffset)]
    }

    // Two text nodes in one block: order them by document position so start
    // really comes before end.
    const anchorIsBeforeFocus = pointIsBefore(anchor.node, focus.node)
    const [startNode, startOffset, endNode, endOffset] = anchorIsBeforeFocus
        ? [anchor.node, anchor.offset, focus.node, focus.offset]
        : [focus.node,  focus.offset,  anchor.node, anchor.offset]
    return [rangeBetween(startNode, startOffset, endNode, endOffset)]
}


// Many blocks: one range for the partial start block, one per fully-covered
// middle block, one for the partial end block.
function collectCrossBlockRanges(resolved: ResolvedRange | null, wsaEl: HTMLElement): Range[] {
    if (!resolved) return []
    const ranges: Range[] = []

    // Start block: from the caret offset to the end of the block.
    if (resolved.start.node) {
        const lastNode = getLastTextNodeForBlock(resolved.start.blockId, wsaEl) ?? resolved.start.node
        ranges.push(rangeBetween(resolved.start.node, resolved.start.offset, lastNode, lastNode.length))
    }

    // Middle blocks: covered end to end.
    for (const middle of resolved.middle) {
        if (!middle.node) continue
        const lastNode = getLastTextNodeForBlock(middle.blockId, wsaEl) ?? middle.node
        ranges.push(rangeBetween(middle.node, 0, lastNode, lastNode.length))
    }

    // End block: from the start of the block to the caret offset.
    if (resolved.end.node) {
        const firstNode = getFirstTextNodeForBlock(resolved.end.blockId, wsaEl) ?? resolved.end.node
        ranges.push(rangeBetween(firstNode, 0, resolved.end.node, resolved.end.offset))
    }

    return ranges
}


// Flattens a cross-block selection into document order: the start point, every
// fully-covered block in between, and the end point. Returns null if either
// endpoint block is missing from the order list.
export function buildResolvedRange(
    anchor: SelectionPoint,
    focus: SelectionPoint,
    blockOrder: string[],
    wsaEl: HTMLElement,
): ResolvedRange | null {
    const anchorIdx = blockOrder.indexOf(anchor.blockId)
    const focusIdx  = blockOrder.indexOf(focus.blockId)
    if (anchorIdx === -1 || focusIdx === -1) return null

    const [startPoint, endPoint] = anchorIdx <= focusIdx
        ? [anchor, focus]
        : [focus,  anchor]

    const startIdx = Math.min(anchorIdx, focusIdx)
    const endIdx   = Math.max(anchorIdx, focusIdx)

    const middle = collectMiddlePoints(blockOrder, startIdx, endIdx, wsaEl)

    return {
        start:  startPoint.clone(),
        middle,
        end:    endPoint.clone(),
        type:   "content-area",
    }
}


// One SelectionPoint per fully-covered block strictly between start and end.
// offset is the raw node length (Range endpoint, ZWS rule).
function collectMiddlePoints(
    blockOrder: string[],
    startIdx: number,
    endIdx: number,
    wsaEl: HTMLElement,
): SelectionPoint[] {
    const points: SelectionPoint[] = []
    for (let i = startIdx + 1; i < endIdx; i++) {
        const blockId  = blockOrder[i]
        const textNode = getFirstTextNodeForBlock(blockId, wsaEl)
        if (!textNode) continue

        const point = new SelectionPoint()
        point.node      = textNode
        point.nodeText  = stripZWS(textNode.data || '')
        point.blockId   = blockId
        point.blockType = "content-area"
        point.offset    = textNode.length
        points.push(point)
    }
    return points
}


function rangeBetween(startNode: Text, startOffset: number, endNode: Text, endOffset: number): Range {
    const range = new Range()
    range.setStart(startNode, startOffset)
    range.setEnd(endNode, endOffset)
    return range
}

// True when `a` comes before `b` in document order.
function pointIsBefore(a: Text, b: Text): boolean {
    return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
}
