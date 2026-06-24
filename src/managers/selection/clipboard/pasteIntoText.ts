import type {
    DocShape,
    ContentDataSet,
    LayoutDataSet,
    DatabaseDataSet,
    TextElement,
    KeyEventData,
} from "../../../types/types"
import { layoutKey } from "../../../model/model"
import type { SelectionPoint } from "../selection/core/selectionState"
import { clipboardStore, type ClipboardSlice } from "./clipboardStore"
import { freshId } from "./ids"
import { insertIndexAfter, bottomEdgeOfAnchor, insertIntoContent } from "./pasteShared"

// ── pasteIntoText.ts ──────────────────────────────────────────────────────────
// Text-selection paste. The caret sits inside `anchorId`'s text. The copied
// selection's offsets live in clipboardStore.range() (stored at copy time). The
// copied block content lives in the buffer slice. No DOM reads — everything comes
// through the range and the buffer.
//
// Single copied block:
//   - copied substring = innerContent sliced by the copy offsets
//   - spliced into the caret block's innerContent at the caret offset
//   - contentData updated; React re-renders. No new blocks.
//
// Multi copied block (caret block = anchorId):
//   - block[0]      : copied substring -> appended into the caret block at caret offset
//   - block[1..n-1] : whole middle blocks (offset -1) -> new blocks after the caret block
//   - block[last]   : copied substring (0 -> end offset) -> new block, sliced content
// Caret lands at the end of the pasted content (SM sets the caret).
//
// PUBLIC INTERFACE: pasteIntoText only. Every other function in this module is
// private to the text-paste concern and reached solely through this entry.

export function pasteIntoText(
    shape: DocShape,
    eventData: unknown,
    anchorId: string | null,
    fileId: string,
): DocShape {
    const slice       = clipboardStore.read()
    const copiedRange = clipboardStore.range()
    if (!anchorId || !slice || copiedRange.length === 0) return { ...shape }

    const caretBlock = shape.contentData[anchorId]
    if (!caretBlock) return { ...shape }

    const caretOffset = readCaretOffset(eventData, caretBlock)

    return copiedRange.length === 1
        ? pasteSingleBlockText(shape, slice, copiedRange, anchorId, caretOffset)
        : pasteMultiBlockText(shape, slice, copiedRange, anchorId, caretOffset, fileId)
}

// Single block: splice the copied substring into the caret block at the caret offset.
function pasteSingleBlockText(
    shape: DocShape,
    slice: ClipboardSlice,
    copiedRange: SelectionPoint[],
    anchorId: string,
    caretOffset: number,
): DocShape {
    const copiedText = selectedTextOf(copiedRange[0], slice)
    const caretBlock = shape.contentData[anchorId]
    const merged     = spliceText(caretBlock.innerContent, copiedText, caretOffset)

    const contentData: ContentDataSet = {
        ...shape.contentData,
        [anchorId]: { ...caretBlock, innerContent: merged },
    }
    return { ...shape, contentData }
}

// Multi block: block[0] into the caret block; middle blocks + a sliced last block
// become new blocks below the caret block.
function pasteMultiBlockText(
    shape: DocShape,
    slice: ClipboardSlice,
    copiedRange: SelectionPoint[],
    anchorId: string,
    caretOffset: number,
    fileId: string,
): DocShape {
    const firstPoint   = copiedRange[0]
    const middlePoints = copiedRange.slice(1, -1)
    const lastPoint    = copiedRange[copiedRange.length - 1]

    // 1. block[0] copied substring -> spliced into the caret block at caret offset.
    const caretBlock = shape.contentData[anchorId]
    const firstText  = selectedTextOf(firstPoint, slice)
    const merged     = spliceText(caretBlock.innerContent, firstText, caretOffset)

    const contentData: ContentDataSet = {
        ...shape.contentData,
        [anchorId]: { ...caretBlock, innerContent: merged },
    }
    const layoutData:   LayoutDataSet   = { ...shape.layoutData }
    const databaseData: DatabaseDataSet = { ...shape.databaseData }

    // 2. middle + last become NEW blocks, stacked below the caret block.
    const insertIdx = insertIndexAfter(anchorId, shape)
    let nextY       = bottomEdgeOfAnchor(anchorId, shape)
    const newIds: string[] = []

    // Middle blocks: whole-block (offset -1) -> full source content, fresh id.
    for (const mp of middlePoints) {
        const source = slice.contentData[mp.blockId]
        if (!source) continue
        const newId = freshId()
        contentData[newId] = newBlockFrom(source, newId, source.innerContent)
        nextY = placeNewBlock(layoutData, slice, mp.blockId, newId, fileId, nextY)
        newIds.push(newId)
    }

    // Last block: only the selected portion (0 -> end offset), fresh id.
    const lastSource = slice.contentData[lastPoint.blockId]
    if (lastSource) {
        const newId    = freshId()
        const lastText = selectedTextOf(lastPoint, slice)
        contentData[newId] = newBlockFrom(lastSource, newId, lastText)
        // placeNewBlock mutates layoutData (the returned value); its numeric
        // return is unused here, so we call for the side effect only.
        placeNewBlock(layoutData, slice, lastPoint.blockId, newId, fileId, nextY)
        newIds.push(newId)
    }

    return {
        ...shape,
        file: insertIntoContent(shape.file, newIds, insertIdx),
        contentData,
        layoutData,
        databaseData,
    }
}

// The caret offset inside the caret block. The collapsed caret travels on the
// paste event the same way the copy offsets travelled on the copy event:
// ContentArea reads it off the live selection and writes it onto KeyEventData.
// Falls back to the end of the block when the event carries no caret (offset -1).
function readCaretOffset(eventData: unknown, caretBlock: TextElement): number {
    const offset = (eventData as KeyEventData)?.offset
    if (offset === undefined || offset < 0) return caretBlock.innerContent.length
    return offset
}

// The copied substring for one selection point, taken from the buffered block
// content (NOT the DOM). A whole-block point (offset -1) returns the full
// content; otherwise the content is sliced by the point's [offset, offsetEnd]
// span. offsetEnd -1 on a non-whole point means "to the end of the block".
function selectedTextOf(point: SelectionPoint, slice: ClipboardSlice): string {
    const block = slice.contentData[point.blockId];
    if (!block) return "";
    const text = block.innerContent;

    if (point.offset < 0) return text;                       // whole block (offset -1)

    const from = clampOffset(point.offset, text.length);
    const to   = point.offsetEnd < 0 ? text.length : clampOffset(point.offsetEnd, text.length);
    return text.slice(Math.min(from, to), Math.max(from, to));
}

// Splice `insert` into `base` at `at`, returning the merged string.
function spliceText(base: string, insert: string, at: number): string {
    const idx = clampOffset(at, base.length)
    return base.slice(0, idx) + insert + base.slice(idx)
}

function clampOffset(offset: number, length: number): number {
    if (offset < 0) return length
    return Math.min(offset, length)
}

// A new content block cloned from a source block, with a fresh id and new text.
// Children stay flat (null) — nested remap is deferred (PLAN.md).
function newBlockFrom(source: TextElement, newId: string, innerContent: string): TextElement {
    return { ...source, id: newId, innerContent }
}

// Copy the source block's placement to the new id, stacked at `y`. Returns the
// next y (below this block). No placement on the source -> y unchanged.
function placeNewBlock(
    layoutData: LayoutDataSet,
    slice: ClipboardSlice,
    sourceId: string,
    newId: string,
    fileId: string,
    y: number,
): number {
    const placement = slice.layoutData[layoutKey(fileId, sourceId)]
    if (!placement) return y
    const placed = { ...placement, blockId: newId, fileId, y }
    layoutData[layoutKey(fileId, newId)] = placed
    return placed.y + placed.h
}
