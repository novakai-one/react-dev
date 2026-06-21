import { useEffect, useRef, useState } from 'react'
import type {
    ContentDataSet,
    TextElement,
    MouseEventData,
    KeyEventData,
    LifecycleEventData,
} from '../../../types/types'
import './content-area.css'


// Per-tag hint shown in an empty block so freshly-added blocks are visible and
// the user knows where to type. Plain <p> gets the generic prompt.
const PLACEHOLDERS: Record<string, string> = {
    h1: 'Heading 1',
    h2: 'Heading 2',
    h3: 'Heading 3',
    blockquote: 'Quote',
    p:  'Write something…',
}


// The caret's character offset inside `blockEl`'s text. Read here, in the block
// that owns the contentEditable, so the offset travels on the KeyEventData and no
// downstream module touches the DOM. Returns -1 when there is no caret in scope.
function readCaretOffset(blockEl: HTMLElement | null): number {
    if (!blockEl) return -1
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return -1

    const caretRange = selection.getRangeAt(0)
    if (!blockEl.contains(caretRange.startContainer)) return -1

    const offsetRange = caretRange.cloneRange()
    offsetRange.selectNodeContents(blockEl)
    offsetRange.setEnd(caretRange.startContainer, caretRange.startOffset)
    return offsetRange.toString().length
}


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

    // Drives the empty-block placeholder. Tracked in React (not via :empty) because
    // focusing an empty editable injects a zero-length text node, which would
    // defeat the :empty selector. Leaf blocks only — a block with nested children
    // is never "empty".
    const isLeaf = !children || children.length === 0
    const [isEmpty, setIsEmpty] = useState(isLeaf && innerContent.trim() === '')

    // Seed AND re-sync the editable from the committed model text.
    //
    // Runs on mount and on every change to innerContent (the store value). The
    // guard `current.innerText !== innerContent` makes this a no-op during normal
    // typing: the keystroke already put that text in the DOM, so DOM and store
    // match and nothing is rewritten. It writes only when the model changed the
    // text out from under the DOM:
    //   - a range delete cut a span from THIS (same-id) block
    //   - any other programmatic edit set new text
    // The old mount-only effect ran once, so a same-id edit never re-seeded and
    // the model change stayed invisible. innerText (not innerHTML) keeps the SM
    // read/write round-trip consistent.
    useEffect(() => {
        if (!contentRef.current) return
        if (contentRef.current.innerText === innerContent) return
        contentRef.current.innerText = innerContent
    }, [innerContent])

    // Keep the placeholder in sync as the user types. textContent (not innerText)
    // is the cheap read here; we only care whether anything is there.
    // Also fires the lifecycle conduit with "content-area-input" so BlockManager
    // commits the live text to the store on every keystroke.
    const handleInput = () => {
        if (!isLeaf) return
        const text = contentRef.current?.textContent ?? ''
        setIsEmpty(text.length === 0)
        handleLifecycleEvent("content-area-input")
    }


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
            nativeEvent: e,
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
            offset:    readCaretOffset(contentRef.current),
            nativeEvent: e,
        }
        cbKeyboardEvent(keyData, trigger)
    }

    const handleLifecycleEvent = (trigger: string) => {
        console.log(trigger) //to get around Supabase error
        // Lifecycle events carry no DOM event reference — SM reads th
        // e live DOM itself.
         //commented out 19th June to see if anything breaks. Seems unnecessary
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
                data-empty={isEmpty ? "true" : undefined}
                data-placeholder={PLACEHOLDERS[Tag as string] ?? PLACEHOLDERS.p}
                className={classNames}
                contentEditable={true}
                suppressContentEditableWarning={true}
                onInput={handleInput}
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
