// ── CollisionManager ────────────────────────────────────────────────────────
// Resolves block overlaps after a drop / insert. Pure functions, no state, no
// DOM, no store — WSA is the only caller (it measures heights and feeds them in,
// then persists the result). This keeps the conduit rule intact and makes the
// algorithm trivially testable.
//
// Ported from React-Pieces' CollisionManager, reduced to 1-D vertical: react-dev
// is single-column (x locked, full page-width), so two blocks collide iff their
// vertical ranges overlap. When x/resize land, swap `collidesVertically` for a
// full 2-D AABB test — nothing else changes.
//
// Model (verbatim intent from the reference):
//   1. Find the first block whose y-range overlaps the moved block.
//   2. Pin whichever of the two is closest to the top-left — it never moves.
//   3. Push distance = the exact y-overlap (pinned bottom − pushed top), NOT a
//      block height. Using a height would open a gap; the overlap stacks flush.
//   4. Shift every block at or below the pin (y >= pin.y, except the pin) down
//      by that distance. Everything above the pin is untouched; existing gaps
//      below are carried down intact — the doc "looks the same, with a block
//      wedged in".
//   5. Iterate: one push can create a new overlap further down. Cap at 50.

import type { LayoutItem } from '../types/types'


// Vertical overlap test. (a and b are different blocks — callers skip self.)
function collidesVertically(a: LayoutItem, b: LayoutItem): boolean {
    return a.y < b.y + b.h && a.y + a.h > b.y
}


// First block in the list that overlaps `moved` (excluding itself).
function firstCollision(items: LayoutItem[], moved: LayoutItem): LayoutItem | null {
    for (const item of items) {
        if (item.blockId === moved.blockId) continue
        if (collidesVertically(item, moved)) return item
    }
    return null
}


// The block closest to the top-left becomes the pin (never moves). Lower y wins;
// tie → lower x; tie → the moved block (the one the user just acted on).
function pinnedOf(moved: LayoutItem, hit: LayoutItem): LayoutItem {
    if (moved.y !== hit.y) return moved.y < hit.y ? moved : hit
    if (moved.x !== hit.x) return moved.x < hit.x ? moved : hit
    return moved
}


const MAX_PASSES = 50


/**
 * Resolve every overlap caused by `movedBlockId`, iteratively.
 *
 * `items` is the placement list for ONE file, each with an ACCURATE height
 * (WSA measures from the DOM before calling — stored h is unreliable). Returns a
 * new array; inputs are not mutated.
 */
export function resolveCollisions(items: LayoutItem[], movedBlockId: string): LayoutItem[] {
    let layout = items.map(i => ({ ...i }))

    for (let pass = 0; pass < MAX_PASSES; pass++) {
        // Refresh the moved block each pass — it may have been the pushed (not
        // pinned) item on a prior pass and changed y.
        const moved = layout.find(i => i.blockId === movedBlockId)
        if (!moved) break

        const hit = firstCollision(layout, moved)
        if (!hit) break

        const pin    = pinnedOf(moved, hit)
        const pushed = pin.blockId === moved.blockId ? hit : moved
        const dist   = (pin.y + pin.h) - pushed.y
        if (dist <= 0) break    // safety — nothing to push

        layout = layout.map(item => {
            if (item.blockId === pin.blockId) return item   // pin never moves
            if (item.y >= pin.y) return { ...item, y: item.y + dist }
            return item
        })
    }

    return layout
}
