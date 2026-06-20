import type {
    DocShape,
    ContentDataSet,
    LayoutDataSet,
    DatabaseDataSet,
    LayoutItem,
} from "../../types/types"
import { layoutKey, databaseKey } from "../../types/types"
import type { SelectionPoint } from "../ClaudeSelectionManager/selectionState"
import { clipboardStore, type ClipboardSlice } from "./clipboardStore"
import { resolveSelectedIds } from "./selectionRange"

// Selection comes from SM as a `range` (SelectionPoint[]) passed into receiveEvent,
// NOT from the key event — KeyEventData carries one blockId, not the multi-block
// selection. SM's buildRange produces the range; clipboard resolves it to ordered ids.

// ── copy ──────────────────────────────────────────────────────────────────
// Build a DocShape slice from the selected blocks and put it in the buffer.
// Returns void — copy never mutates the document. ClipboardManager owns the
// (always-new) shape return.
//
// Steps (runtime order):
//   1. Resolve the range (SelectionPoint[]) into an ordered id list (selectionRange).
//   2. For each id, IN ORDER: pull its TextElement from shape.contentData.
//   3. Pull that block's LayoutItem from shape.layoutData (keyed fileId:blockId).
//   4. If the block is a DatabaseArea: pull its DatabaseConfiguration too.
//   5. hold the slice + the ordered id list in the buffer, mode "copy".
//
// The ORDERED id list is held alongside the slice. Datasets are unordered
// Records; paste needs the document order to re-emit blocks correctly for LM.

// Shared slice builder — cut.ts reuses this. Pulls the records for `ids` (already
// ordered) out of `shape`. Does NOT touch the buffer or the shape. Returns both
// the slice and the same ordered id list so the caller can hand it to the store.
export function buildSlice(
    ids: string[],
    shape: DocShape,
): { slice: ClipboardSlice; orderedIds: string[] } {
    const contentData:  ContentDataSet  = {}
    const layoutData:   LayoutDataSet   = {}
    const databaseData: DatabaseDataSet = {}

    const fileId = shape.file?.id ?? ""
    const kept: string[] = []

    for (const id of ids) {
        const block = shape.contentData[id]
        if (!block) continue
        contentData[id] = block
        kept.push(id)

        // Placement for this block in the active file.
        const lKey: string = layoutKey(fileId, id)
        const placement: LayoutItem | undefined = shape.layoutData[lKey]
        if (placement) layoutData[lKey] = placement

        // Database config, only for DatabaseArea blocks.
        if (block.component === "DatabaseArea") {
            const dKey: string = databaseKey(id)
            const config = shape.databaseData[dKey]
            if (config) databaseData[dKey] = config
        }
    }

    return { slice: { contentData, layoutData, databaseData }, orderedIds: kept }
}

// Fills the buffer from the SM-built range. Returns nothing — copy never touches
// the document. ClipboardManager owns the (always-new) shape return.
export function copy(range: SelectionPoint[], shape: DocShape): void {
    const ids = resolveSelectedIds(range, shape)
    if (ids.length === 0) return

    const { slice, orderedIds } = buildSlice(ids, shape)
    clipboardStore.hold(slice, "copy", orderedIds, [])
}
