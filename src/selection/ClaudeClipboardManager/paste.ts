import type {
    DocShape,
    ContentDataSet,
    LayoutDataSet,
    DatabaseDataSet,
    LayoutItem,
    DatabaseConfiguration,
    KeyEventData,
} from "../../types/types"
import { layoutKey, databaseKey } from "../../types/types"
import { clipboardStore, type ClipboardSlice } from "./clipboardStore"
import { regenerateIds } from "./ids"

// ── paste ─────────────────────────────────────────────────────────────────
// Merge the held buffer slice into shape and return a NEW shape. Clipboard owns
// WHERE the blocks land. Clipboard does NOT fix collisions — LayoutManager does
// that downstream. Clipboard's contract to LM: the emitted blocks are in correct
// document order, because LM positions them relying on that order.
//
// Steps (runtime order):
//   1. Read the held slice + ordered ids. If none, return shape unchanged.
//   2. Regenerate ids so pasted blocks never collide with the source.
//   3. Find the anchor row's bottom edge — pasted blocks stack from there.
//   4. Walk the ordered ids: place each block directly below the previous one
//      (next y = prev y + prev h, NO gap), in order.
//   5. Append the ordered pasted ids to the file's content array, in order.
//   6. If mode was "cut", remove the source blocks.   <-- PLACEHOLDER (LM's job)
//   7. return the new shape.
//
// shape is immutable: every dataset + the file is shallow-copied before write so
// React's diff sees new identities.

// Anchor reader. Paste stacks below this row. `blockId` is the block under the
// caret at paste time — CONFIRMED field: KeyEventData.blockId (cmd+v fires a
// key-down whose blockId is the focused block).
function readAnchorId(eventData: unknown): string | null {
    const e = eventData as KeyEventData
    return e?.blockId ?? null
}

// The y a pasted block stacks from: directly below the anchor's bottom edge.
// anchor y=20 h=20  ->  first paste y = 40. No gap.
function anchorBottom(anchorId: string | null, shape: DocShape): number {
    if (!anchorId) return 0
    const fileId = shape.file?.id ?? ""
    const placement = shape.layoutData[layoutKey(fileId, anchorId)]
    return placement ? placement.y + placement.h : 0
}

export function paste(
    eventData: unknown,
    _reactEvent: React.SyntheticEvent | null,
    shape: DocShape,
): DocShape {
    const slice: ClipboardSlice | null = clipboardStore.read()
    if (!slice) return shape

    const fileId = shape.file?.id ?? ""
    const orderedOldIds = clipboardStore.orderedIds()

    // 2. Re-key for paste. MODE decides ids:
    //    COPY -> mint NEW ids (fresh block; source untouched). Scenarios 1 & 3.
    //    CUT  -> KEEP ids (same block, moved). Scenario 2. (Cut must have removed
    //            the source already, or the id lands in content twice — PLAN.md.)
    //    Layout is re-keyed to this fileId either way, so the block lands on the
    //    active canvas (supports cut/copy ACROSS files — scenario 3).
    const preserveIds = clipboardStore.mode() === "cut"
    const { slice: fresh, idMap } = regenerateIds(slice, fileId, { preserveIds })
    const orderedNewIds = orderedOldIds
        .map(oldId => idMap[oldId])
        .filter((id): id is string => Boolean(id))

    // 3. Stack origin.
    let cursorY = anchorBottom(readAnchorId(eventData), shape)

    // 4. Shallow copies — originals never mutated.
    const contentData:  ContentDataSet  = { ...shape.contentData }
    const layoutData:   LayoutDataSet   = { ...shape.layoutData }
    const databaseData: DatabaseDataSet = { ...shape.databaseData }

    // Walk in document order. Each block: copy content, place directly below the
    // previous block's bottom edge.
    for (const newId of orderedNewIds) {
        const block = fresh.contentData[newId]
        if (!block) continue
        contentData[newId] = block

        const placement = fresh.layoutData[layoutKey(fileId, newId)]
        if (placement) {
            const placed: LayoutItem = {
                ...placement,
                fileId,
                y: cursorY,
            }
            cursorY = placed.y + placed.h // next block sits directly below
            layoutData[layoutKey(fileId, newId)] = placed
        }

        // Database config for this block, if any.
        const config: DatabaseConfiguration | undefined =
            fresh.databaseData[databaseKey(newId)]
        if (config) databaseData[databaseKey(newId)] = config
    }

    // 5. Append the ordered pasted ids to the END of the file's content array.
    // CONFIRMED rule: paste appends at end (caret lands after the appended ids —
    // normal editor behaviour; caret placement itself is SM's job). The pasted
    // ids keep their own document order.
    let file = shape.file
    if (file) {
        file = { ...file, content: [...file.content, ...orderedNewIds] }
    }

    // No cut cleanup here: in cut mode the source was already removed by cut() at
    // cut time (scenario 2), so the kept ids do not collide with anything in shape.

    return {
        file,
        contentData,
        layoutData,
        databaseData,
    }
}
