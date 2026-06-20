import type { DocShape } from "../../types/types"
import type { SelectionPoint } from "../ClaudeSelectionManager/selectionState"

// ── selectionRange ────────────────────────────────────────────────────────
// One job: turn the SM-built `range` (a SelectionPoint[]) into an ORDERED list of
// the selected block ids, using FileData.content[] as the source of order.
//
// SM owns selection. Its `buildRange` expands the current selection into the full
// set of selected points and passes that array to clipboard. Each point:
//   { elementId, offset }   — elementId is the block id.
//
// Clipboard does NOT trust the array's incoming order. It re-orders the ids by their
// index in file.content (the reliable document order — the same array LM positions
// against), dedupes, and drops any id not present in this file's content.
//
//   file.content:  [ A, B, C, D, E ]      (the reliable order)
//   range:         [ {D}, {B}, {C} ]      (any order, may repeat)
//        -> ids in content: D@3, B@1, C@2
//        -> sorted by index: B, C, D
//
// Block count (1 / 2 / many) falls out of the returned length — it is not a flag.

export function resolveSelectedIds(
    range: SelectionPoint[],
    shape: DocShape,
): string[] {
    if (!range || range.length === 0) return []
    if (!shape.file) return []

    const order = shape.file.content
    const seen = new Set<string>()
    const indexed: { id: string; idx: number }[] = []

    for (const point of range) {
        const id = point?.elementId
        if (!id || seen.has(id)) continue
        seen.add(id)

        const idx = order.indexOf(id)
        if (idx === -1) continue // not a block in this file's content — skip it

        indexed.push({ id, idx })
    }

    // Document order, driven by file.content. LM relies on this being correct.
    indexed.sort((a, b) => a.idx - b.idx)
    return indexed.map(e => e.id)
}
