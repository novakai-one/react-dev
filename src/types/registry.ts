import CanvasArea from "../components/workspace-blocks/CanvasArea/CanvasArea"
import ContentArea from "../components/workspace-blocks/ContentArea/ContentArea"


export const COMPONENT_REGISTRY = {
    ContentArea,
    CanvasArea,
}

export type ComponentRegistry = typeof COMPONENT_REGISTRY