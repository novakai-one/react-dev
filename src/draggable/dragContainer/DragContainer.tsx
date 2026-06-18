// DragContainer — absolutely-positioned wrapper around one block.
// Owns: position (via inline style from saved layout), the drag handle, and the
// block-level selection ring (via .is-selected toggled from WSA / SM store).
// Does NOT own content layout (columns, nesting) — that's the inner ContentArea.

import DragHandle from '../dragHandle/DragHandle'
import type { DragContainerProps } from '../../types/types'
import './drag-container.css'


export default function DragContainer({
    id,
    children,
    cbMouseEvent,
    layoutData,
    isSelected,
}: DragContainerProps) {
    // Position comes from saved layout. Inline style owns left/top so it can
    // update mid-drag without React reconciliation. CSS owns position:absolute.
    // Fallback 50/50 covers the brief window before a block has a saved layout.
    const style: React.CSSProperties = {
        left: layoutData?.x ?? 50,
        top:  layoutData?.y ?? 50,
    }

    const className = `drag-container${isSelected ? " is-selected" : ""}`

    return (
        <div
            className={className}
            id={id}
            data-blockid={id}
            style={style}
        >
            {/* Container hands the conduit straight down — never decides, never wraps. */}
            <DragHandle id={id} cbMouseEvent={cbMouseEvent} />
            {children}
        </div>
    )
}
