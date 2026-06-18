/*
responsibilities; Dragging. Resizing. Positioning.
Does not control the content layout e.g. columns. This is beyond scope.

*/

import './drag-container.css'
import DragHandle from '../dragHandle/DragHandle'
import {useRef} from 'react'
import type { DragContainerProps } from '../../types/types'


export default function DragContainer(props: DragContainerProps) {
    const dragRef = useRef<HTMLDivElement>(null)
    const { dragHandleIcon, children } = props

    
    const handleClick = (e: React.MouseEvent) => {
        
        if(!dragRef.current) return
        console.log(dragRef.current.getBoundingClientRect())
        let currentX = dragRef.current.style.x;
        currentX = '200px';
        console.dir(dragRef.current)
        dragRef.current.style.left="500px"
    }

    

    return (
        <div className="drag-container" id="1"
            ref={dragRef}
            onClick={handleClick}>
            <DragHandle id="1">
                {dragHandleIcon}
            </DragHandle>
            {children}
        </div>
    )
}