//use markup to fill in content.

import { useRef, type HTMLElementType } from 'react'
import './content-area.css'
import type { ContentDataSet, TextElement } from '../../../types/types'


interface ContentAreaProps {
    activeContent: TextElement,
    contentDataSet: ContentDataSet
}


export default function ContentArea( {activeContent, contentDataSet }: ContentAreaProps) {
    const {Tag, innerContent, id, classNames, children} = activeContent
    
    const handleKeyEvent = (event: React.KeyboardEvent) => {
        //on key event update the stored saved data.
        //give this back to whoever called it.
    }

    //const contentRef = useRef<HTMLParagraphElement | HTMLHeadingElement | HTMLSpanElement>(null);

    return (
        <div className="content-area">
            <Tag 
            //ref={contentRef}
            id={id}
            className={classNames}
            contentEditable={true}
            onKeyUp={handleKeyEvent}
            >
                {innerContent}
                {children?.map((child) => {
                    const childNode = contentDataSet[child]
                    return <ContentArea 
                        activeContent={childNode}
                        contentDataSet={contentDataSet} />
                })}
            </Tag>
        </div>
    )
}