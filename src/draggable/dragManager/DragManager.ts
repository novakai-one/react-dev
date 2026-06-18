// DragManager.ts
// Responsibilities: owns active drag state, moves dragged container via ref (no re-render during drag)
// Receives boundaries from WorkspaceArea, passes final position to CollisionManager on drop

type Position = {
    x: number
    y: number
}

//interesting -> x and y will possibly change depending on where this is called.
type DragBoundaries = {
    minX: number
    minY: number
    maxX: number
    maxY: number
}

type OnDropCallback = (id: string, finalPosition: Position) => void

export default class DragManager {

    private activeRef: React.RefObject<HTMLDivElement | null> | null = null
    private activeId: string | null = null
    private isDragging: boolean = false

    // offset = distance between mouse and top-left corner of container when drag starts
    // without this, container would snap its top-left corner to the mouse position
    private mouseOffset: Position = { x: 0, y: 0 }

    private boundaries: DragBoundaries | null = null
    private onDrop: OnDropCallback | null = null

    // WorkspaceArea calls this on mount to give DragManager its boundaries
    setBoundaries(boundaries: DragBoundaries): void {
        this.boundaries = boundaries
    }

    // WorkspaceArea passes its onDrop handler so DragManager can notify it when drag ends
    setOnDropCallback(callback: OnDropCallback): void {
        this.onDrop = callback
    }

    // Called by DragContainer on mousedown via handle callback
    startDrag(
        id: string,
        ref: React.RefObject<HTMLDivElement | null>,
        event: MouseEvent
    ): void {
        if (!ref.current) return

        const rect = ref.current.getBoundingClientRect()

        this.activeRef = ref
        this.activeId = id
        this.isDragging = true

        // capture how far inside the container the mouse clicked
        this.mouseOffset = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        }

        // attach move + up listeners to window so drag works outside container bounds
        window.addEventListener('mousemove', this.handleMouseMove)
        window.addEventListener('mouseup', this.handleMouseUp)
    }

    // Arrow function so 'this' is always DragManager (not the event target)
    private handleMouseMove = (event: MouseEvent): void => {
        if (!this.isDragging || !this.activeRef?.current) return

        let newX = event.clientX - this.mouseOffset.x
        let newY = event.clientY - this.mouseOffset.y

        // clamp to boundaries if set
        if (this.boundaries) {
            const el = this.activeRef.current
            newX = Math.max(this.boundaries.minX, Math.min(newX, this.boundaries.maxX - el.offsetWidth))
            newY = Math.max(this.boundaries.minY, Math.min(newY, this.boundaries.maxY - el.offsetHeight))
        }

        this.activeRef.current.style.left = `${newX}px`
        this.activeRef.current.style.top = `${newY}px`
    }

    private handleMouseUp = (event: MouseEvent): void => {
        if (!this.isDragging || !this.activeRef?.current || !this.activeId) return

        const rect = this.activeRef.current.getBoundingClientRect()
        const finalPosition: Position = { x: rect.left, y: rect.top }

        // notify WorkspaceArea of final position -> WorkspaceArea passes to CollisionManager
        if (this.onDrop) {
            this.onDrop(this.activeId, finalPosition)
        }

        this.cleanup()
    }

    private cleanup(): void {
        this.activeRef = null
        this.activeId = null
        this.isDragging = false
        this.mouseOffset = { x: 0, y: 0 }

        window.removeEventListener('mousemove', this.handleMouseMove)
        window.removeEventListener('mouseup', this.handleMouseUp)
    }
}