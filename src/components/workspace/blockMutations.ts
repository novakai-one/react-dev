// blockMutations.ts
//
// Pure store transforms behind the structural gestures. Each takes the current
// document slices plus the gesture inputs and returns the NEXT slices — it does
// not persist or touch React. WorkspaceArea reads the latest state, calls one
// of these, then saves + sets the result.
//
//   createBlockBelow   — Enter: split a new block below the source
//   deleteBlock        — Backspace on empty: remove a block, close the hole
//   insertPastedBlocks — paste: stack pasted blocks below the anchor
//   createBlockAtY     — click empty canvas: drop a fresh block on that row
//   applyDrop          — drag end: move a placement, re-resolve + re-order
//
// "Placement" (x/y/w/h) is per file, so a drop moves only the LayoutItem; the
// block's content is untouched.

import { snapToGrid, GRID_UNIT, PAGE_X, rowsForHeight, heightForRows } from '../../layout/grid'
import { collapseAfterDelete } from '../../layout/layoutManager'
import { layoutKey } from '../../types/types'
import type {
    TextElement,
    ContentDataSet,
    FilesDataSet,
    FileData,
    LayoutDataSet,
    LayoutItem,
} from '../../types/types'
import type { ClipboardBlockData } from '../../selection/selectionManager/SelectionManager'
import {
    measuredBlockHeight,
    measuredItemsForFile,
    resolveFileCollisions,
    orderByPosition,
    NEW_BLOCK_DEFAULT_W,
    NEW_BLOCK_DEFAULT_H,
    NEW_BLOCK_DEFAULT_X,
    NEW_BLOCK_VERTICAL_GAP,
    NEW_BLOCK_CONTENT,
} from './workspaceLayout'


// The next document slices after a content + layout change.
export interface WorkspaceWrite {
    files:       FilesDataSet
    dataSet:     ContentDataSet
    layouts:     LayoutDataSet
    updatedFile: FileData
}

// The next slices after a layout-only change (content text is untouched).
export interface LayoutWrite {
    files:       FilesDataSet
    layouts:     LayoutDataSet
    updatedFile: FileData
}

// The document slices every transform reads from.
export interface DocumentSlices {
    file:    FileData
    dataSet: ContentDataSet
    files:   FilesDataSet
    layouts: LayoutDataSet
}


// ── Enter: a new block directly below the source ─────────────────────────────

export function createBlockBelow(
    doc: DocumentSlices,
    sourceValue: string,
    sourceBlockId: string,
    sourceTag: TextElement['Tag'],
): (WorkspaceWrite & { focusStartId: string }) | null {
    const sourceEl = doc.dataSet[sourceBlockId]
    if (!sourceEl) return null

    const updatedSource: TextElement = { ...sourceEl, innerContent: sourceValue, Tag: sourceTag }

    // Position comes from the source's PLACEMENT in this file, not the block.
    const newId = crypto.randomUUID()
    const sourceLayout = doc.layouts[layoutKey(doc.file.id, sourceBlockId)]
    const sourceH = measuredBlockHeight(sourceBlockId, sourceLayout?.h ?? NEW_BLOCK_DEFAULT_H)
    const newY = snapToGrid((sourceLayout?.y ?? NEW_BLOCK_DEFAULT_X) + sourceH + NEW_BLOCK_VERTICAL_GAP)
    const newX = sourceLayout?.x ?? NEW_BLOCK_DEFAULT_X

    const newBlock = makeContentBlock(newId, sourceTag, NEW_BLOCK_CONTENT)

    // h starts at one grid row (an empty block is one line tall) so the
    // collision pass doesn't over-push using the stale 80px default.
    const newLayout: LayoutItem = {
        blockId: newId, fileId: doc.file.id,
        x: newX, y: newY, w: NEW_BLOCK_DEFAULT_W, h: GRID_UNIT,
    }

    const newDataSet: ContentDataSet = { ...doc.dataSet, [sourceBlockId]: updatedSource, [newId]: newBlock }
    const newContent = insertAfter(doc.file.content, sourceBlockId, [newId])

    // A block wedged between two existing blocks overlaps the one below —
    // resolve so everything below slides down to make room.
    const newLayouts = resolveFileCollisions(
        doc.file.id, newContent, { ...doc.layouts, [layoutKey(doc.file.id, newId)]: newLayout }, newId,
    )

    return { ...writeFor(doc, newContent, newDataSet, newLayouts), focusStartId: newId }
}


// ── Backspace on an empty block: remove it and pull the rest up ──────────────

export function deleteBlock(
    doc: DocumentSlices,
    blockId: string,
): (WorkspaceWrite & { focusEndId: string | null }) | null {
    const newDataSet: ContentDataSet = { ...doc.dataSet }
    delete newDataSet[blockId]

    // Measure the hole BEFORE removing the block (still in the DOM — Backspace
    // runs synchronously). Everything below is pulled up by this height.
    const deletedLayout = doc.layouts[layoutKey(doc.file.id, blockId)]
    const deletedY = deletedLayout?.y ?? 0
    const deletedH = heightForRows(rowsForHeight(measuredBlockHeight(blockId, deletedLayout?.h ?? GRID_UNIT)))

    const strippedLayouts: LayoutDataSet = { ...doc.layouts }
    delete strippedLayouts[layoutKey(doc.file.id, blockId)]

    // Land the caret on the previous block in document order (none if first).
    const deletedIdx = doc.file.content.indexOf(blockId)
    const focusEndId = deletedIdx > 0 ? doc.file.content[deletedIdx - 1] : null

    const newContent = doc.file.content.filter(id => id !== blockId)

    const collapsed = collapseAfterDelete(
        measuredItemsForFile(doc.file.id, newContent, strippedLayouts),
        deletedY, deletedH, NEW_BLOCK_VERTICAL_GAP,
    )
    const newLayouts: LayoutDataSet = { ...strippedLayouts }
    for (const item of collapsed) newLayouts[layoutKey(doc.file.id, item.blockId)] = item

    return { ...writeFor(doc, newContent, newDataSet, newLayouts), focusEndId }
}


// ── Paste: stack the pasted blocks below the anchor block ────────────────────

export function insertPastedBlocks(
    doc: DocumentSlices,
    anchorBlockId: string,
    blocks: ClipboardBlockData[],
): WorkspaceWrite | null {
    const anchorEl = doc.dataSet[anchorBlockId]
    if (!anchorEl) return null

    const anchorLayout = doc.layouts[layoutKey(doc.file.id, anchorBlockId)]
    const baseX = anchorLayout?.x ?? NEW_BLOCK_DEFAULT_X
    const anchorH = measuredBlockHeight(anchorBlockId, anchorLayout?.h ?? NEW_BLOCK_DEFAULT_H)
    let   nextY = snapToGrid((anchorLayout?.y ?? NEW_BLOCK_DEFAULT_X) + anchorH + NEW_BLOCK_VERTICAL_GAP)

    const newLayouts: LayoutDataSet = { ...doc.layouts }

    const newBlocks: TextElement[] = blocks.map(b => {
        const id = crypto.randomUUID()
        const geom = b.layout ?? { x: baseX, y: nextY, w: NEW_BLOCK_DEFAULT_W, h: NEW_BLOCK_DEFAULT_H }
        nextY = snapToGrid(geom.y + geom.h + NEW_BLOCK_VERTICAL_GAP)
        const tag = (b.tag as TextElement['Tag']) || 'p'
        newLayouts[layoutKey(doc.file.id, id)] = { blockId: id, fileId: doc.file.id, ...geom }
        return makeContentBlock(id, tag, b.html)
    })

    const newDataSet: ContentDataSet = { ...doc.dataSet }
    for (const b of newBlocks) newDataSet[b.id] = b

    const insertIds = newBlocks.map(b => b.id)
    const newContent = insertAfter(doc.file.content, anchorBlockId, insertIds)

    // The pasted group is stacked without internal overlap, but its tail can
    // land on the first pre-existing block below. Resolve per pasted id so the
    // cascade pushes everything below down.
    let resolvedLayouts = newLayouts
    for (const id of insertIds) {
        resolvedLayouts = resolveFileCollisions(doc.file.id, newContent, resolvedLayouts, id)
    }

    return writeFor(doc, newContent, newDataSet, resolvedLayouts)
}


// ── Click empty canvas: a fresh empty paragraph on that row ──────────────────

export function createBlockAtY(
    doc: DocumentSlices,
    y: number,
): WorkspaceWrite & { focusStartId: string } {
    const newId = crypto.randomUUID()
    const newBlock = makeContentBlock(newId, "p", "")
    const newLayout: LayoutItem = {
        blockId: newId, fileId: doc.file.id,
        x: PAGE_X, y, w: NEW_BLOCK_DEFAULT_W, h: GRID_UNIT,
    }

    const newContent = [...doc.file.content, newId]
    const newLayouts = resolveFileCollisions(
        doc.file.id, newContent, { ...doc.layouts, [layoutKey(doc.file.id, newId)]: newLayout }, newId,
    )
    const orderedKeys = orderByPosition(newContent, doc.file.id, newLayouts, 0)

    const newDataSet: ContentDataSet = { ...doc.dataSet, [newId]: newBlock }
    return { ...writeFor(doc, orderedKeys, newDataSet, newLayouts), focusStartId: newId }
}


// ── Drag end: move one placement, re-resolve, re-order ───────────────────────

export function applyDrop(
    slices: { file: FileData; files: FilesDataSet; layouts: LayoutDataSet },
    blockId: string,
    finalLocal: { x: number; y: number },
): LayoutWrite {
    const key  = layoutKey(slices.file.id, blockId)
    const prev = slices.layouts[key]

    // A drop only moves a PLACEMENT. y snaps to the grid; x stays where it
    // landed (x is locked upstream — see DragManager.lockX).
    const updated: LayoutItem = {
        blockId, fileId: slices.file.id,
        w: prev?.w ?? 0, h: prev?.h ?? 0,
        x: finalLocal.x, y: snapToGrid(finalLocal.y),
        resizable: prev?.resizable, draggable: prev?.draggable, locked: prev?.locked,
    }
    const droppedLayouts: LayoutDataSet = { ...slices.layouts, [key]: updated }

    // Resolve the overlap the drop caused, then re-order document keys by
    // top-left position so reading order tracks the new layout.
    const newLayouts = resolveFileCollisions(slices.file.id, slices.file.content, droppedLayouts, blockId)
    const orderedKeys = orderByPosition(slices.file.content, slices.file.id, newLayouts, 50)

    const updatedFile: FileData = { ...slices.file, content: orderedKeys }
    const updatedFiles: FilesDataSet = { ...slices.files, [slices.file.id]: updatedFile }
    return { files: updatedFiles, layouts: newLayouts, updatedFile }
}


// ── Shared builders ──────────────────────────────────────────────────────────

function makeContentBlock(id: string, tag: TextElement['Tag'], innerContent: string): TextElement {
    return {
        id, component: "ContentArea", Tag: tag,
        styles: "", classNames: "", innerContent,
        parentId: null, children: null, files: [],
    }
}

// Insert ids directly after anchorId in document order (appends if not found).
function insertAfter(content: string[], anchorId: string, ids: string[]): string[] {
    const idx = content.indexOf(anchorId)
    if (idx === -1) return [...content, ...ids]
    return [...content.slice(0, idx + 1), ...ids, ...content.slice(idx + 1)]
}

// Bundle the updated file + files map with the new content/layout slices.
function writeFor(
    doc: DocumentSlices,
    newContent: string[],
    dataSet: ContentDataSet,
    layouts: LayoutDataSet,
): WorkspaceWrite {
    const updatedFile: FileData = { ...doc.file, content: newContent }
    const updatedFiles: FilesDataSet = { ...doc.files, [doc.file.id]: updatedFile }
    return { files: updatedFiles, dataSet, layouts, updatedFile }
}
