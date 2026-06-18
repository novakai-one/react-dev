import './left-panel.css'
import Panel from '../shared/panel/Panel'
import type {
    FilePanelTile,
    BlockPanelTile,
    PanelTile,
    BlockSpec,
    FileData,
    FilesDataSet,
    ContentDataSet,
    LayoutDataSet,
    LayoutItem,
    TextElement,
} from '../../../types/types'
import { layoutKey } from '../../../types/types'
import { useWorkspaceStore } from '../../../components/store/useWorkspaceStore'
import { useLayoutStore } from '../../../layout/useLayoutStore'
import { useDocumentStorage } from '../../../storage/useDocumentStorage'

// Real, insertable blocks — each maps to a semantic tag rendered by ContentArea.
// (Lists are left out for now: ul/ol need nested <li> children, which the insert
//  flow below doesn't build yet.)
const BLOCK_OPTIONS: BlockPanelTile = {
    type: "blocks",
    tileName: "Blocks",
    panelBody: [
        { id: "block-h1",    block: "Heading 1",  component: "ContentArea", Tag: "h1" },
        { id: "block-h2",    block: "Heading 2",  component: "ContentArea", Tag: "h2" },
        { id: "block-h3",    block: "Heading 3",  component: "ContentArea", Tag: "h3" },
        { id: "block-p",     block: "Paragraph",  component: "ContentArea", Tag: "p" },
        { id: "block-quote", block: "Quote",      component: "ContentArea", Tag: "blockquote" },
    ],
}

// Geometry for a panel-inserted block — placed at the bottom of the canvas.
const NEW_BLOCK_W = 400
const NEW_BLOCK_H = 80
const NEW_BLOCK_X = 50
const NEW_BLOCK_TOP = 50    // y for the very first block on an empty canvas
const NEW_BLOCK_GAP = 16
// Single space so the editable mounts with a caret target (see WorkspaceArea).
const NEW_BLOCK_CONTENT = " "

// File names double as PanelBody keys + click lookups, so a new file needs a
// name no existing file already uses. "Untitled", then "Untitled 2", "3", …
function uniqueFileName(files: FilesDataSet): string {
    const taken = new Set(Object.values(files).map(f => f.fileName))
    if (!taken.has("Untitled")) return "Untitled"
    let n = 2
    while (taken.has(`Untitled ${n}`)) n++
    return `Untitled ${n}`
}

export default function LeftPanel() {
    // Subscribe to files via selector so unrelated store updates don't re-render.
    const files = useWorkspaceStore(s => s.files)
    const setDataSet = useWorkspaceStore(s => s.setDataSet)
    const setActiveFile = useWorkspaceStore(s => s.setActiveFile)
    const leftPanelOpen = useLayoutStore(s => s.leftPanelOpen)
    const { saveDocument } = useDocumentStorage()

    const fileData: FilePanelTile = {
        type: "files",
        tileName: "Files",
        panelBody: files ? Object.values(files) : [],
    }

    const panelData: PanelTile[] = [fileData, BLOCK_OPTIONS]

    // Create a blank file, push it into the store so it shows immediately, then
    // persist. Read content/layouts via getState() (not selectors) so adding a
    // file doesn't re-render LeftPanel on every content edit. Same pattern WSA
    // uses for its structural mutations.
    const handleAddFile = () => {
        const state = useWorkspaceStore.getState()
        const currentFiles = state.files ?? {}
        const content = state.content ?? {}
        const layouts = state.layouts ?? {}

        const newFile: FileData = {
            id: crypto.randomUUID(),
            metaData: { dateCreated: new Date().toISOString() },
            tags: [],
            fileName: uniqueFileName(currentFiles),
            content: [],
        }

        const updatedFiles: FilesDataSet = { ...currentFiles, [newFile.id]: newFile }

        setDataSet(updatedFiles, content, layouts)
        saveDocument(updatedFiles, content, layouts)
        setActiveFile(newFile)
    }

    // Insert a block from the Blocks tile into the active file. Builds a real
    // TextElement + its placement (LayoutItem), appends it to the file's content,
    // then persists — mirroring WorkspaceArea's handleNewBlock, minus the source
    // block (this path appends at the bottom of the canvas instead).
    const handleInsertBlock = (spec: BlockSpec) => {
        const state = useWorkspaceStore.getState()
        const file = state.activeFile
        if (!file) return    // nothing to insert into until a file is open

        const fs = state.files ?? {}
        const ds = state.content ?? {}
        const ls = state.layouts ?? {}

        // Drop the new block below the lowest existing placement on this canvas.
        const bottoms = file.content
            .map(bid => ls[layoutKey(file.id, bid)])
            .filter((p): p is LayoutItem => Boolean(p))
            .map(p => p.y + p.h)
        const y = bottoms.length ? Math.max(...bottoms) + NEW_BLOCK_GAP : NEW_BLOCK_TOP

        const newId = crypto.randomUUID()
        const newBlock: TextElement = {
            id: newId,
            component: spec.component,
            Tag: spec.Tag,
            styles: "",
            classNames: spec.classNames ?? "",
            innerContent: NEW_BLOCK_CONTENT,
            parentId: null,
            children: null,
            files: [],
        }
        const newLayout: LayoutItem = {
            blockId: newId,
            fileId: file.id,
            x: NEW_BLOCK_X, y, w: NEW_BLOCK_W, h: NEW_BLOCK_H,
        }

        const newContent: ContentDataSet = { ...ds, [newId]: newBlock }
        const newLayouts: LayoutDataSet = { ...ls, [layoutKey(file.id, newId)]: newLayout }
        const updatedFile: FileData = { ...file, content: [...file.content, newId] }
        const updatedFiles: FilesDataSet = { ...fs, [file.id]: updatedFile }

        setDataSet(updatedFiles, newContent, newLayouts)
        saveDocument(updatedFiles, newContent, newLayouts)
        setActiveFile(updatedFile)
    }

    return (
        <Panel
            cn="left-panel"
            panelData={panelData}
            open={leftPanelOpen}
            onAddFile={handleAddFile}
            onInsertBlock={handleInsertBlock}
        />
    )
}
