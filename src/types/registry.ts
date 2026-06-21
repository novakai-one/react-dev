// Component registry — the single source of truth for which React components
// can render a TextElement. TextElement.component is keyed against this map.
// Add new block components here and in TextElement['component'] in types.ts.

import CanvasArea from "../components/blocks/CanvasArea/CanvasArea"
import ContentArea from "../components/blocks/ContentArea/ContentArea"
import DatabaseArea from "../components/blocks/DatabaseArea/DatabaseArea"

export const COMPONENT_REGISTRY = {
    ContentArea,
    CanvasArea,
    DatabaseArea,
} as const

export type ComponentRegistryKey = keyof typeof COMPONENT_REGISTRY
