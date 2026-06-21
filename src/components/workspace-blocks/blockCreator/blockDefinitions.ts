// ── Block definitions ─────────────────────────────────────────────────────────
// The catalog of blocks a user can insert from the panel — the single source of
// truth shared by the side that LISTS them (LeftPanel renders the Blocks tile)
// and the side that CREATES them (BlockManager resolves a panel click's block id
// back to its spec). Same role COMPONENT_REGISTRY plays for rendering: one map,
// two readers, no drift.
//
// Each entry maps a stable id to the component + semantic tag it renders as.
// Lists (ul/ol) are left out for now — they need nested <li> children the insert
// flow doesn't build yet.

import type { BlockSpec } from "../../../types/types";

export const BLOCK_DEFINITIONS: BlockSpec[] = [
  { id: "block-h1", block: "Heading 1", component: "ContentArea", Tag: "h1" },
  { id: "block-h2", block: "Heading 2", component: "ContentArea", Tag: "h2" },
  { id: "block-h3", block: "Heading 3", component: "ContentArea", Tag: "h3" },
  { id: "block-p", block: "Paragraph", component: "ContentArea", Tag: "p" },
  {
    id: "block-quote",
    block: "Quote",
    component: "ContentArea",
    Tag: "blockquote",
  },
  {
    id: "block-database",
    block: "Database",
    component: "DatabaseArea",
    Tag: "div",
  },
];

// Resolve a panel click's carried block id back to its full spec. Returns
// undefined for an unknown id so the caller can pass the gesture through.
export function findBlockDefinition(id: string): BlockSpec | undefined {
  return BLOCK_DEFINITIONS.find((definition) => definition.id === id);
}
