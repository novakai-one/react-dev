// Component registry — the single source of truth for which React components
// can render a TextElement. TextElement.component is keyed against this map.
// Add new block components here and in TextElement['component'] in types.ts.

import CanvasArea from "../components/workspace-blocks/CanvasArea/CanvasArea"
import ContentArea from "../components/workspace-blocks/ContentArea/ContentArea"

export const COMPONENT_REGISTRY = {
    ContentArea,
    CanvasArea,
} as const

export type ComponentRegistryKey = keyof typeof COMPONENT_REGISTRY
