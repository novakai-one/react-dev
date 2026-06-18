import './left-panel.css'
import Panel from '../shared/panel/Panel'
import type { FilePanelTile, BlockPanelTile, PanelTile, FileData, FilesDataSet } from '../../../types/types'
import { useWorkspaceStore } from '../../../components/store/useWorkspaceStore'
import { useDocumentStorage } from '../../../storage/useDocumentStorage'

// Hard-coded for now until a real block-type registry exists. Promote to a
// shared constant or pull from a registry once block-creation flows land.
const BLOCK_OPTIONS: BlockPanelTile = {
    type: "blocks",
    tileName: "Blocks",
    panelBody: [
        { id: "block-1", block: "Header" },
        { id: "block-2", block: "Callout" },
        { id: "block-3", block: "Quote" },
    ],
}

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

    return <Panel cn="left-panel" panelData={panelData} onAddFile={handleAddFile} />
}
