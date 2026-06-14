//use markup to fill in content.

import { useRef, type HTMLElementType, type KeyboardEventHandler } from 'react'
import './content-area.css'
import type { ContentDataSet, TextElement } from '../../../types/types'


interface ContentAreaProps {
    activeContent: TextElement,
    contentDataSet: ContentDataSet,
    cbKeyEvent: (updatedElement: TextElement, trigger: string) => void
}


export default function ContentArea( {activeContent, contentDataSet, cbKeyEvent }: ContentAreaProps) {
    const {Tag, innerContent, id, classNames, children} = activeContent

    
    //Pass all events up to workspace -> Leave ContentArea dumb regarding decisions.
    const handleKeyEvent = (e: React.KeyboardEvent<Element>, trigger: string) => {
        const target = e.currentTarget as HTMLElement 
        const updatedElement: TextElement = {
         ...activeContent, innerContent: target.innerText
        }

        cbKeyEvent(updatedElement, trigger)
        
    }

    //const contentRef = useRef<HTMLParagraphElement | HTMLHeadingElement | HTMLSpanElement>(null);

    return (
        <div className="content-area">
            <Tag 
            //ref={contentRef}
            id={id}
            className={classNames}
            contentEditable={true}
            onKeyUp={(event) => handleKeyEvent(event, "keyUp")}
            
            >
                {innerContent}
                {children?.map((child) => {
                    const childNode = contentDataSet[child]
                    return <ContentArea 
                        activeContent={childNode}
                        contentDataSet={contentDataSet} 
                        cbKeyEvent={cbKeyEvent}
                        />
                })}
            </Tag>
        </div>
    )
}