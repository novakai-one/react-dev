// useWorkspacePointerBridge.ts
//
// Wires document-level mousemove / mouseup to SM and DM while WSA is mounted.
//
// These two MUST be on document, not the workspace div. If the user releases
// the mouse (or drags) outside the workspace, React's onMouseUp on the div
// never fires — DM would stay isDragging=true, SM would stay _isDragging=true,
// and rubber-band selection would spread across the page. mousedown stays
// React-side on the div (the in-workspace gesture entrypoint).
//
// Move / up bail cheaply when nothing is active: SM gates on buttons!==1, DM on
// !isDragging.

import { useEffect } from 'react'
import type SelectionManager from '../../selection/selectionManager/SelectionManager'
import type DragManager from '../../draggable/dragManager/DragManager'
import type { MouseEventData } from '../../types/types'


export function useWorkspacePointerBridge(sm: SelectionManager, dm: DragManager): void {
    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => forwardMouse(e, "workspace-mouse-move", sm, dm)
        const onMouseUp   = (e: MouseEvent) => forwardMouse(e, "workspace-mouse-up", sm, dm)

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup',   onMouseUp)
        return () => {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup',   onMouseUp)
        }
    }, [sm, dm])
}


function forwardMouse(e: MouseEvent, trigger: string, sm: SelectionManager, dm: DragManager): void {
    const data = mouseEventDataFrom(e)
    sm.receiveMouseEvent(data, trigger)
    dm.receiveMouseEvent(data, trigger)
}


// Build the shared MouseEventData shape from a native or React mouse event.
// blockId / blockType are empty here — workspace-level events carry no block.
export function mouseEventDataFrom(e: MouseEvent | React.MouseEvent): MouseEventData {
    return {
        clientX: e.clientX,
        clientY: e.clientY,
        blockId: "",
        blockType: "",
        shiftKey: e.shiftKey,
        metaKey:  e.metaKey,
        ctrlKey:  e.ctrlKey,
        altKey:   e.altKey,
        button:   e.button,
        buttons:  e.buttons,
    }
}
