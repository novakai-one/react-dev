import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { useDocumentStorage } from '../../storage/useDocumentStorage'
import { COMPONENT_REGISTRY, type ComponentRegistryKey } from '../../types/registry'
import type {
    TextElement,
    ContentDataSet,
    FilesDataSet,
    FileData,
    MouseEventData,
    KeyEventData,
    LifecycleEventData,
} from '../../types/types'
import type SelectionManager from '../../selection/selectionManager/SelectionManager'
// ClipboardBlockData stays on SM (it's a helper-owned payload, not a shared component type).
import type { ClipboardBlockData } from '../../selection/selectionManager/SelectionManager'
import type DragManager from '../../draggable/dragManager/DragManager'
import DragContainer from '../../draggable/dragContainer/DragContainer'
import './workspace.css'


interface WorkspaceAreaProps {
    sm: SelectionManager,
    dm: DragManager,
}

// Defaults for blocks created from Enter / paste (pixels — react-dev is not grid based).
const NEW_BLOCK_DEFAULT_W = 400
const NEW_BLOCK_DEFAULT_H = 80
const NEW_BLOCK_DEFAULT_X = 50
const NEW_BLOCK_VERTICAL_GAP = 16   // pixels between source and new block

// Single space so the editable mounts with a text node (caret target). Pure
// "" would render a child-less element, defeating min-height and confusing
// caretPositionFromPoint until focusBlockStart fixes it up.
const NEW_BLOCK_CONTENT = " "


function buildRoots(nodes: TextElement[]): TextElement[] {
    return nodes.filter(node => node.parentId === null)
}


export default function WorkspaceArea({ sm, dm }: WorkspaceAreaProps) {
    // Selectors instead of a full-state destructure — keeps WSA out of the
    // re-render loop when unrelated fields change.
    const activeFile      = useWorkspaceStore(s => s.activeFile)
    const files           = useWorkspaceStore(s => s.files)
    const contentDataSet  = useWorkspaceStore(s => s.content)
    const setContent      = useWorkspaceStore(s => s.setContent)
    const setActiveFile   = useWorkspaceStore(s => s.setActiveFile)
    const setDataSet      = useWorkspaceStore(s => s.setDataSet)
    const { saveDocument, saveContentData } = useDocumentStorage()
    const wsaRef = useRef<HTMLDivElement>(null)

    // After Enter inserts a new block, this carries the id we need to focus
    // once React has committed the new contentEditable to the DOM. Cleared
    // by the useEffect below as soon as it lands the caret.
    const pendingFocusRef = useRef<string | null>(null)


    // ── SM: workspace element on mount, block order whenever it changes ──

    useEffect(() => {
        sm.setWorkspaceEl(wsaRef.current)
    }, [sm])

    useEffect(() => {
        if (!activeFile) return
        sm.setBlockOrder(activeFile.content)
    }, [sm, activeFile])

    // ── Focus the freshly-created block once it's in the DOM ─────────────
    //
    // Parent effects fire AFTER children, so by the time this runs:
    //  1. React has committed the new block's contentEditable to the DOM
    //  2. ContentArea's mount effect has set innerText (clearing/seeding)
    // focusBlockStart can safely call editable.focus() and place the caret.
    // Using rAF here would be racy under StrictMode and concurrent rendering.
    useEffect(() => {
        if (!pendingFocusRef.current) return
        sm.focusBlockStart(pendingFocusRef.current)
        pendingFocusRef.current = null
    }, [sm, activeFile])


    // ── Block selection store (SM is the source of truth) ───────────────

    const selectedBlockIds = useSyncExternalStore(sm.subscribe, sm.getSelectedBlocksSnapshot)


    // ── Structural callbacks: SM decides; WSA mutates store + persists ──
    //
    // Bodies read latest state via useWorkspaceStore.getState() to dodge stale
    // closures. SM fires these synchronously inside its own gesture handlers.

    useEffect(() => {

        const handleNewBlock = (sourceValue: string, sourceBlockId: string, sourceTag: TextElement['Tag']) => {
            const state = useWorkspaceStore.getState()
            const file  = state.activeFile
            const ds    = state.content
            const fs    = state.files
            if (!file || !ds || !fs) return

            const sourceEl = ds[sourceBlockId]
            if (!sourceEl) return

            // Save source's edits first.
            const updatedSource: TextElement = {
                ...sourceEl,
                innerContent: sourceValue,
                Tag: sourceTag,
            }

            // Build the new block immediately below the source.
            const newId = crypto.randomUUID()
            const sourceLayout = sourceEl.layout?.layoutData
            const newY = (sourceLayout?.y ?? NEW_BLOCK_DEFAULT_X) + (sourceLayout?.h ?? NEW_BLOCK_DEFAULT_H) + NEW_BLOCK_VERTICAL_GAP
            const newX = sourceLayout?.x ?? NEW_BLOCK_DEFAULT_X

            const newBlock: TextElement = {
                id: newId,
                component: "ContentArea",
                Tag: sourceTag,
                styles: "",
                classNames: "",
                innerContent: NEW_BLOCK_CONTENT,
                layout: { layoutData: { x: newX, y: newY, w: NEW_BLOCK_DEFAULT_W, h: NEW_BLOCK_DEFAULT_H } },
                parentId: null,
                children: null,
                files: [],
            }

            const newDataSet: ContentDataSet = { ...ds, [sourceBlockId]: updatedSource, [newId]: newBlock }

            // Insert directly after source in document order.
            const sourceIdx = file.content.indexOf(sourceBlockId)
            const newContent = sourceIdx === -1
                ? [...file.content, newId]
                : [...file.content.slice(0, sourceIdx + 1), newId, ...file.content.slice(sourceIdx + 1)]

            const updatedFile: FileData = { ...file, content: newContent }
            const updatedFiles: FilesDataSet = { ...fs, [file.id]: updatedFile }

            // Stash the new block's id so the focus effect can pick it up after
            // React commits. See pendingFocusRef declaration for the why.
            pendingFocusRef.current = newId

            saveDocument(updatedFiles, newDataSet)
            setDataSet(updatedFiles, newDataSet)
            setActiveFile(updatedFile)
        }

        const handleDeleteBlock = (blockId: string) => {
            const state = useWorkspaceStore.getState()
            const file  = state.activeFile
            const ds    = state.content
            const fs    = state.files
            if (!file || !ds || !fs) return

            const newDataSet: ContentDataSet = { ...ds }
            delete newDataSet[blockId]

            const newContent = file.content.filter(id => id !== blockId)
            const updatedFile: FileData = { ...file, content: newContent }
            const updatedFiles: FilesDataSet = { ...fs, [file.id]: updatedFile }

            saveDocument(updatedFiles, newDataSet)
            setDataSet(updatedFiles, newDataSet)
            setActiveFile(updatedFile)
        }

        const handleContentRefresh = (value: string, blockId: string, tag: TextElement['Tag']) => {
            const state = useWorkspaceStore.getState()
            const ds    = state.content
            if (!ds) return
            const el = ds[blockId]
            if (!el) return

            // Skip writes that wouldn't change anything — avoids storm-of-saves on click.
            if (el.innerContent === value && el.Tag === tag) return

            const updated: TextElement = { ...el, innerContent: value, Tag: tag }
            const newDataSet: ContentDataSet = { ...ds, [blockId]: updated }
            saveContentData(newDataSet)
            setContent(newDataSet)
        }

        const handlePastedBlocks = (anchorBlockId: string, blocks: ClipboardBlockData[]) => {
            const state = useWorkspaceStore.getState()
            const file  = state.activeFile
            const ds    = state.content
            const fs    = state.files
            if (!file || !ds || !fs) return

            const anchorEl = ds[anchorBlockId]
            if (!anchorEl) return

            const anchorLayout = anchorEl.layout?.layoutData
            const baseX = anchorLayout?.x ?? NEW_BLOCK_DEFAULT_X
            let   nextY = (anchorLayout?.y ?? NEW_BLOCK_DEFAULT_X) + (anchorLayout?.h ?? NEW_BLOCK_DEFAULT_H) + NEW_BLOCK_VERTICAL_GAP

            const newBlocks: TextElement[] = blocks.map(b => {
                const id = crypto.randomUUID()
                const layout = b.layout ?? { x: baseX, y: nextY, w: NEW_BLOCK_DEFAULT_W, h: NEW_BLOCK_DEFAULT_H }
                nextY = layout.y + layout.h + NEW_BLOCK_VERTICAL_GAP
                const tag = (b.tag as TextElement['Tag']) || 'p'
                const block: TextElement = {
                    id,
                    component: "ContentArea",
                    Tag: tag,
                    styles: "",
                    classNames: "",
                    innerContent: b.html,
                    layout: { layoutData: layout },
                    parentId: null,
                    children: null,
                    files: [],
                }
                return block
            })

            const newDataSet: ContentDataSet = { ...ds }
            for (const b of newBlocks) newDataSet[b.id] = b

            const anchorIdx = file.content.indexOf(anchorBlockId)
            const insertIds = newBlocks.map(b => b.id)
            const newContent = anchorIdx === -1
                ? [...file.content, ...insertIds]
                : [...file.content.slice(0, anchorIdx + 1), ...insertIds, ...file.content.slice(anchorIdx + 1)]

            const updatedFile: FileData = { ...file, content: newContent }
            const updatedFiles: FilesDataSet = { ...fs, [file.id]: updatedFile }

            saveDocument(updatedFiles, newDataSet)
            setDataSet(updatedFiles, newDataSet)
            setActiveFile(updatedFile)
        }

        sm.registerNewBlockHandler(handleNewBlock)
        sm.registerDeleteBlockHandler(handleDeleteBlock)
        sm.registerContentRefreshHandler(handleContentRefresh)
        sm.registerPastedBlocksHandler(handlePastedBlocks)
    }, [sm, saveDocument, saveContentData, setContent, setDataSet, setActiveFile])


    // ── Document-level mouse listeners ───────────────────────────────────
    //
    // Move + up MUST be on document, not the workspace div. If the user releases
    // the mouse (or drags) outside the workspace, React's onMouseUp on the div
    // never fires — DM stays in isDragging=true and SM stays in _isDragging=true.
    // Rubber-band selection would also spread across the page.
    //
    // The workspace's onMouseDown stays React-side (it's the gesture entrypoint
    // for in-workspace clicks). Move/up bail cheaply when nothing is active:
    // SM gates on buttons!==1, DM gates on !isDragging.

    useEffect(() => {
        const dataFromNative = (e: MouseEvent): MouseEventData => ({
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
        })

        const onDocMouseMove = (e: MouseEvent) => {
            const data = dataFromNative(e)
            sm.receiveMouseEvent(data, "workspace-mouse-move")
            dm.receiveMouseEvent(data, "workspace-mouse-move")
        }
        const onDocMouseUp = (e: MouseEvent) => {
            const data = dataFromNative(e)
            sm.receiveMouseEvent(data, "workspace-mouse-up")
            dm.receiveMouseEvent(data, "workspace-mouse-up")
        }
        document.addEventListener('mousemove', onDocMouseMove)
        document.addEventListener('mouseup',   onDocMouseUp)
        return () => {
            document.removeEventListener('mousemove', onDocMouseMove)
            document.removeEventListener('mouseup',   onDocMouseUp)
        }
    }, [sm, dm])


    // ── DragManager: drop callback (existing — unchanged shape) ──────────

    useEffect(() => {
        dm.setWorkspaceEl(wsaRef.current)
        dm.setOnDropCallback((id, finalLocal) => {
            if (!contentDataSet || !activeFile || !files) return
            const el = contentDataSet[id]
            if (!el) return

            const updated: TextElement = {
                ...el,
                layout: {
                    dragContainerProps: el.layout?.dragContainerProps,
                    layoutData: {
                        w: el.layout?.layoutData.w ?? 0,
                        h: el.layout?.layoutData.h ?? 0,
                        x: finalLocal.x,
                        y: finalLocal.y,
                    },
                },
            }
            const newDataSet: ContentDataSet = { ...contentDataSet, [id]: updated }

            // Re-order content keys by top-left position (y first, then x).
            const orderedKeys = [...activeFile.content].sort((keyA, keyB) => {
                const a = newDataSet[keyA]?.layout?.layoutData
                const b = newDataSet[keyB]?.layout?.layoutData
                const ay = a?.y ?? 50, ax = a?.x ?? 50
                const by = b?.y ?? 50, bx = b?.x ?? 50
                return (ay - by) || (ax - bx)
            })

            const updatedFile = { ...activeFile, content: orderedKeys }
            const updatedFiles = { ...files, [activeFile.id]: updatedFile }

            saveDocument(updatedFiles, newDataSet)
            setContent(newDataSet)
            setActiveFile(updatedFile)
        })
    }, [dm, contentDataSet, activeFile, files, saveDocument, setContent, setActiveFile])


    // ── Conduit: every event from every component flows through these ───
    // WSA is the ONLY place that knows about both SM and DM.

    const handleMouseEvent = (mouseData: MouseEventData, trigger: string) => {
        sm.receiveMouseEvent(mouseData, trigger)
        dm.receiveMouseEvent(mouseData, trigger)
    }

    const handleKeyEvent = (keyData: KeyEventData, trigger: string) => {
        sm.receiveKeyEvent(keyData, trigger)
    }

    const handleLifecycleEvent = (lifecycleData: LifecycleEventData, trigger: string) => {
        sm.receiveLifecycleEvent(lifecycleData, trigger)
    }


    // WSA root's own DOM events — build the shared MouseEventData here, never inline in JSX.
    const handleWorkspaceMouseEvent = (e: React.MouseEvent, trigger: string) => {
        const mouseData: MouseEventData = {
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
        handleMouseEvent(mouseData, trigger)
    }


    // Resolve roots only when the document is loaded. The workspace <div> ALWAYS
    // renders so wsaRef attaches on first commit — SM.setWorkspaceEl(wsaRef.current)
    // would otherwise capture `null` and every key/mouse handler would bail
    // (every SM receive* method early-returns on !_wsaEl).
    const roots: TextElement[] = activeFile && contentDataSet
        ? buildRoots(activeFile.content.map(id => contentDataSet[id]).filter(Boolean))
        : []


    return (
        <div className="workspace-area"
            ref={wsaRef}
            //mousedown only — workspace-mouse-move/up live on document so they
            //fire even when the cursor leaves the workspace mid-gesture.
            onMouseDown={(event) => handleWorkspaceMouseEvent(event, "workspace-mouse-down")}>

            {contentDataSet && roots.map((node) => {
                const ComponentToRender = COMPONENT_REGISTRY[node.component as ComponentRegistryKey]
                const isSelected = selectedBlockIds.has(node.id)
                return (
                    <DragContainer key={node.id}
                        id={node.id}
                        layoutData={node.layout?.layoutData}
                        isSelected={isSelected}
                        cbMouseEvent={handleMouseEvent}>
                        <ComponentToRender
                            contentDataSet={contentDataSet}
                            activeContent={node}
                            cbMouseEvent={handleMouseEvent}
                            cbKeyboardEvent={handleKeyEvent}
                            cbLifecycleEvent={handleLifecycleEvent}
                        />
                    </DragContainer>
                )
            })}
        </div>
    )
}
