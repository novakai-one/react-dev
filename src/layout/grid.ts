// ── Grid ──────────────────────────────────────────────────────────────────
// Single source of truth for the document grid. The page is ruled into square
// cells one paragraph-line tall; every block top snaps to a grid line. CM and
// LM (collision / layout managers) will read these helpers so the geometry math
// has exactly one definition.
//
// GRID_UNIT is 26px because body `p` is 16px at a whole-number 26px line-height
// (see content-area.css) — one rendered line == one grid row, and cells are
// square. Keep this in lockstep with the p line-height: if one changes, both do.

export const GRID_UNIT = 26                 // px — one paragraph line; square cells

// Left gutter for the single-column page. Matches the drag-container right
// gutter so the page-width block is symmetric. Lives here (not as a local const
// in DragContainer) so WSA + future CM/LM share one number.
export const PAGE_X = 56

// Nearest grid line — used when snapping a dropped/created block's top.
export const snapToGrid = (px: number): number =>
    Math.round(px / GRID_UNIT) * GRID_UNIT

// Round UP to the next grid line — used when a measured height must cover whole
// rows (a block that's 1.2 rows tall occupies 2 rows).
export const snapUpToGrid = (px: number): number =>
    Math.ceil(px / GRID_UNIT) * GRID_UNIT

// Height in whole rows (min 1) — the integer view CM/LM prefer.
export const rowsForHeight = (px: number): number =>
    Math.max(1, Math.round(px / GRID_UNIT))

// Inverse of rowsForHeight.
export const heightForRows = (rows: number): number =>
    rows * GRID_UNIT
