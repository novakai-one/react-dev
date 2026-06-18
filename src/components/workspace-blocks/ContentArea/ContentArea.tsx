import { useEffect, useRef } from 'react'
import type {
    ContentDataSet,
    TextElement,
    MouseEventData,
    KeyEventData,
    LifecycleEventData,
} from '../../../types/types'
import './content-area.css'


interface ContentAreaProps {
    activeContent: TextElement,
    contentDataSet: ContentDataSet,
    cbMouseEvent:     (mouseData: MouseEventData, trigger: string) => void,
    cbKeyboardEvent:  (keyData: KeyEventData, trigger: string) => void,
    cbLifecycleEvent: (lifecycleData: LifecycleEventData, trigger: string) => void,
}


export default function ContentArea({
    activeContent,
    contentDataSet,
    cbMouseEvent,
    cbKeyboardEvent,
    cbLifecycleEvent,
}: ContentAreaProps) {
    const { Tag, innerContent, id, classNames, children, component } = activeContent
    const contentRef = useRef<HTMLElement>(null)

    // Seed the editable on mount. innerText (not innerHTML) is mandatory:
    // SM persists via innerText too, so the round-trip stays consistent. Using
    // innerHTML here would render saved <br> tags as literal text on the next
    // mount. See SelectionManager._readBlockContent for the symmetric read.
    useEffect(() => {
        if (!contentRef.current) return
        contentRef.current.innerText = innerContent
    }, [])


    // Mouse, keyboard, lifecycle bodies — built in the body, never inline in
    // JSX. ContentArea stays dumb: it just shapes the payload and forwards.
    // SM owns every decision (and every preventDefault).
    const handleMouseEvent = (e: React.MouseEvent, trigger: string) => {
        const mouseData: MouseEventData = {
            clientX:  e.clientX,
            clientY:  e.clientY,
            blockId:  id,
            blockType: component,
            shiftKey: e.shiftKey,
            metaKey:  e.metaKey,
            ctrlKey:  e.ctrlKey,
            altKey:   e.altKey,
            button:   e.button,
            buttons:  e.buttons,
        }
        cbMouseEvent(mouseData, trigger)
    }

    const handleKeyboardEvent = (e: React.KeyboardEvent, trigger: string) => {
        // nativeEvent is the live React event — SM owns preventDefault, so the
        // chain CA → WSA → SM must stay synchronous (no setTimeout / Promise.then).
        const keyData: KeyEventData = {
            key:       e.key,
            shiftKey:  e.shiftKey,
            metaKey:   e.metaKey,
            ctrlKey:   e.ctrlKey,
            altKey:    e.altKey,
            blockId:   id,
            blockType: component,
            nativeEvent: e,
        }
        cbKeyboardEvent(keyData, trigger)
    }

    const handleLifecycleEvent = (trigger: string) => {
        // Lifecycle events carry no DOM event reference — SM reads the live DOM itself.
        const lifecycleData: LifecycleEventData = {
            blockId:   id,
            blockType: component,
        }
        cbLifecycleEvent(lifecycleData, trigger)
    }


    return (
        <div className="content-area">
            <Tag
                ref={contentRef as React.Ref<never>}
                id={id}
                data-blockid={id}
                className={classNames}
                contentEditable={true}
                suppressContentEditableWarning={true}
                onMouseDown={(event) => handleMouseEvent(event, "content-area-mouse-down")}
                onMouseUp={(event)   => handleMouseEvent(event, "content-area-mouse-up")}
                onClick={(event)     => handleMouseEvent(event, "content-area-click")}
                onKeyDown={(event)   => handleKeyboardEvent(event, "keydown")}
                onKeyUp={(event)     => handleKeyboardEvent(event, "keyup")}
                onBlur={()           => handleLifecycleEvent("content-area-blur")}
            >
                {children?.map((child) => {
                    const childNode = contentDataSet[child]
                    return (
                        <ContentArea
                            key={child}
                            activeContent={childNode}
                            contentDataSet={contentDataSet}
                            cbMouseEvent={cbMouseEvent}
                            cbKeyboardEvent={cbKeyboardEvent}
                            cbLifecycleEvent={cbLifecycleEvent}
                        />
                    )
                })}
            </Tag>
        </div>
    )
}
