// ── docShape.ts ───────────────────────────────────────────────────────────────
// DocShape now comes from the canonical document model.
// This file no longer defines its own shape — it re-exports the real one so the
// rest of ClaudeSelectionManager can keep importing from "./docShape" unchanged.

export type {
    DocShape,
    FileData,
    ContentDataSet,
    LayoutDataSet,
    DatabaseDataSet,
    TextElement,
    SelectionSnapshot,
    CaretTarget,
} from "../../../../types/types";

export { emptySelectionSnapshot } from "../../../../types/types";
