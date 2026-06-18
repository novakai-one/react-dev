import './left-panel.css'
import Panel from '../shared/panel/Panel'
import type { FilePanelTile, BlockPanelTile, PanelTile } from '../../../types/types'
import { useWorkspaceStore } from '../../../components/store/useWorkspaceStore'

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

export default function LeftPanel() {
    // Subscribe to files via selector so unrelated store updates don't re-render.
    const files = useWorkspaceStore(s => s.files)

    const fileData: FilePanelTile = {
        type: "files",
        tileName: "Files",
        panelBody: files ? Object.values(files) : [],
    }

    const panelData: PanelTile[] = [fileData, BLOCK_OPTIONS]

    return <Panel cn="left-panel" panelData={panelData} />
}
