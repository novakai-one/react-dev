import type {
    ContentDataSet,
    LayoutDataSet,
    DatabaseDataSet,
    LayoutItem,
    TextElement,
    DatabaseConfiguration,
} from "../../types/types"
import { layoutKey, databaseKey } from "../../types/types"
import type { ClipboardSlice } from "./clipboardStore"

// ── ids ───────────────────────────────────────────────────────────────────
// Re-key a slice for paste into `fileId`, returning the slice + an old->new idMap.
//
// TWO MODES, driven by `preserveIds`:
//   COPY (preserveIds false, default) — mint a NEW id for every block. Paste is a
//     fresh block that never collides with the source. (Scenarios 1 & 3: copy →
//     new block id; source stays put.)
//   CUT  (preserveIds true) — KEEP every id. The pasted block IS the source block,
//     moved to a new place/file. idMap is identity. Layout is still re-keyed to the
//     target fileId so the SAME block id lands on the new canvas. (Scenario 2: cut
//     → same block id, relocated.) NOTE: cut MUST remove the source first, or the
//     same id ends up in content twice — see cut deletion (PLAN.md, coupled).
//
// Returns:
//   slice  — the same three datasets, re-keyed and with rewritten id fields.
//   idMap  — old id -> new id (identity in cut mode), for remapping references that
//            point at these blocks (children[], database cell ids) in a later pass.
//
// Project id factory: raw crypto.randomUUID(), matching blockManager.ts and
// databaseFactory.ts (no prefix), so pasted ids are indistinguishable from blocks
// created any other way.
function newId(): string {
    return crypto.randomUUID()
}

export interface RegenResult {
    slice: ClipboardSlice,
    idMap: Record<string, string>,
}

export interface RegenOptions {
    // CUT keeps ids (same block moved); COPY (default) mints new ones.
    preserveIds?: boolean,
}

export function regenerateIds(
    slice: ClipboardSlice,
    fileId: string,
    opts: RegenOptions = {},
): RegenResult {
    const preserveIds = opts.preserveIds ?? false
    const idMap: Record<string, string> = {}

    // 1. Decide the new id for every content block first, so later passes can look
    //    references up in idMap. CUT: identity (same id). COPY: a fresh id.
    for (const oldId of Object.keys(slice.contentData)) {
        idMap[oldId] = preserveIds ? oldId : newId()
    }

    // 2. Rebuild contentData under the new ids, rewriting the block's own id.
    //    children[] remap is a PLACEHOLDER — flat blocks only today (children
    //    is null), so nested remap is deferred. See PLAN.md.
    const contentData: ContentDataSet = {}
    for (const [oldId, block] of Object.entries(slice.contentData)) {
        const newKey = idMap[oldId]
        const rebuilt: TextElement = { ...block, id: newKey }
        // TODO: if rebuilt.children, map each child id through idMap.
        contentData[newKey] = rebuilt
    }

    // 3. Rebuild layoutData. Re-key by (fileId, newId) and rewrite blockId.
    const layoutData: LayoutDataSet = {}
    for (const item of Object.values(slice.layoutData)) {
        const placement = item as LayoutItem
        const newKey = idMap[placement.blockId]
        if (!newKey) continue
        const rebuilt: LayoutItem = { ...placement, blockId: newKey, fileId }
        layoutData[layoutKey(fileId, newKey)] = rebuilt
    }

    // 4. Rebuild databaseData. Key is the block id, so re-key under the new id
    //    and rewrite config.id. Cell ids inside rows point at content blocks —
    //    remapping those is a PLACEHOLDER (cells reference TextElement ids that
    //    are NOT part of this slice unless the cells were also selected).
    const databaseData: DatabaseDataSet = {}
    for (const [oldId, config] of Object.entries(slice.databaseData)) {
        const newKey = idMap[oldId]
        if (!newKey) continue
        const c = config as DatabaseConfiguration
        const rebuilt: DatabaseConfiguration = { ...c, id: newKey }
        // TODO: remap rebuilt.rows[*].cells through idMap where cell ids were copied.
        databaseData[databaseKey(newKey)] = rebuilt
    }

    return { slice: { contentData, layoutData, databaseData }, idMap }
}
