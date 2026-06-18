// ── LayoutManager ───────────────────────────────────────────────────────────
// Keeps the document tidy after structural changes: pulls blocks up to fill the
// hole a deleted block left behind. Pure functions, no state, no DOM, no store —
// WSA is the only caller (it measures the deleted rect and persists the result).
//
// Single-column assumption (same as CollisionManager): a full-width delete pulls
// EVERYTHING below up by the vacated height. When x unlocks, restrict the pull
// to blocks whose x-range overlaps the deleted column.

import type { LayoutItem } from '../types/types'
import { snapToGrid } from './grid'


/**
 * After a block at `deletedY` (height `deletedH`) is removed, raise every block
 * below it by the vacated height + the gap that sat beneath it, so the doc
 * closes the hole. Results snap back to the grid. Inputs are not mutated.
 *
 * `items` is the REMAINING placements for one file (the deleted one already
 * dropped). Only blocks strictly below the deleted top move.
 */
export function collapseAfterDelete(
    items: LayoutItem[],
    deletedY: number,
    deletedH: number,
    gap: number,
): LayoutItem[] {
    const shift = deletedH + gap
    if (shift <= 0) return items.map(i => ({ ...i }))

    return items.map(item => {
        if (item.y <= deletedY) return { ...item }
        return { ...item, y: snapToGrid(Math.max(deletedY, item.y - shift)) }
    })
}
