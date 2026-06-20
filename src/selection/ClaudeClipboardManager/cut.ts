import type {
    DocShape,
    ContentDataSet,
    LayoutDataSet,
    DatabaseDataSet,
} from "../../types/types"
import { layoutKey, databaseKey } from "../../types/types"
import type { SelectionPoint } from "../ClaudeSelectionManager/selectionState"
import { clipboardStore } from "./clipboardStore"
import { buildSlice } from "./copy"
import { resolveSelectedIds } from "./selectionRange"

// ── cut ───────────────────────────────────────────────────────────────────
// Copy the selection into the buffer (mode "cut", same ids recorded as sourceIds),
// THEN remove the source blocks from the document and return the new shape.
//
// Cut MUTATES (unlike copy): the block disappears immediately (scenario 2). On the
// later paste, mode "cut" makes paste keep the SAME ids — the block is the same
// block, relocated. Because the source is gone now, re-adding the id on paste does
// not collide.
//
// Removal is in lockstep across all three datasets, the same invariant paste honours:
//   contentData   — the TextElement record
//   layoutData    — its LayoutItem (keyed fileId:blockId)
//   file.content  — the ordered id array
//   databaseData  — the DatabaseConfiguration, if the block was a DatabaseArea
// Clipboard does NOT signal LayoutManager (that would breach the shape->shape
// contract). It returns the new shape; LM closes the resulting hole on its own pass,
// relying on file.content staying correctly ordered (which a filter preserves).

// Fills the buffer, removes the source, returns the new shape. Always a fresh shape
// (matches the always-new-shape contract) — a clone when there is nothing to cut.
export function cut(range: SelectionPoint[], shape: DocShape): DocShape {
    const ids = resolveSelectedIds(range, shape)
    if (ids.length === 0) return { ...shape } // nothing selected — fresh identity

    const { slice, orderedIds } = buildSlice(ids, shape)
    clipboardStore.hold(slice, "cut", orderedIds, orderedIds)

    return removeBlocks(orderedIds, shape)
}

// Remove `ids` from contentData + layoutData + databaseData + file.content, all
// shallow-copied first so the input shape is never mutated. Returns the new shape.
function removeBlocks(ids: string[], shape: DocShape): DocShape {
    const fileId = shape.file?.id ?? ""
    const drop = new Set(ids)

    const contentData:  ContentDataSet  = { ...shape.contentData }
    const layoutData:   LayoutDataSet   = { ...shape.layoutData }
    const databaseData: DatabaseDataSet = { ...shape.databaseData }

    for (const id of ids) {
        delete contentData[id]
        delete layoutData[layoutKey(fileId, id)]
        delete databaseData[databaseKey(id)] // identity key; harmless if not a db block
    }

    // Close the id out of the ordered content array. filter preserves order.
    let file = shape.file
    if (file) {
        file = { ...file, content: file.content.filter(id => !drop.has(id)) }
    }

    return { file, contentData, layoutData, databaseData }
}
