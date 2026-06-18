import { useState } from "react"
import PanelHeader from "../panel-header/PanelHeader"
import PanelBody from "../panel-body/PanelBody"
import PanelToggle from "../panel-toggle/PanelToggle"
import { useWorkspaceStore } from "../../../store/useWorkspaceStore"
import type { PanelTile, FileData } from '../../../../types/types'
import './panel.css'

export interface PanelProps {
    cn: string,
    panelData: PanelTile[],
    // Optional — when provided AND the Files tile is selected, the panel shows a
    // "new file" action. Kept optional so the right panel (no files) stays unchanged.
    onAddFile?: () => void,
}

export default function Panel({ cn, panelData, onAddFile }: PanelProps) {

    const setActiveFile = useWorkspaceStore(s => s.setActiveFile)

    const tileNames: string[] = panelData.map(panel => panel.tileName)

    // First tile (Files) is selected by default — this is the home view on load.
    const [selectedTile, setSelectedTile] = useState<string>(tileNames[0])
    const [panelOpen, setPanelOpen] = useState<boolean>(true)
    const [selectedBodyItem, setSelectedBodyItem] = useState<string>("")

    const handleTileClicked = (tileName: string) => setSelectedTile(tileName)
    const handleToggleClick = () => setPanelOpen(prev => !prev)

    const selectedPanelTile = panelData.find(item => item.tileName === selectedTile)
    if (!selectedPanelTile) return null

    // The list of body items rendered under the selected tile (file names or block names).
    const panelBody: string[] = selectedPanelTile.type === "files"
        ? selectedPanelTile.panelBody.map(f => f.fileName)
        : selectedPanelTile.panelBody.map(b => b.block)

    // Body click — activates a file when the Files tile is current; block tile is read-only for now.
    const handleBodyItemClick = (name: string) => {
        setSelectedBodyItem(name)
        if (selectedPanelTile.type === "files") {
            const file: FileData | undefined = selectedPanelTile.panelBody.find(f => f.fileName === name)
            if (file) setActiveFile(file)
        }
    }

    return (
        <div className={`panel ${cn} panel-open-${panelOpen}`}>
            <div className="left-panel-header-container">
                <PanelToggle
                    cn={cn}
                    handleClick={handleToggleClick}
                    panelOpen={panelOpen}
                />
                <PanelHeader
                    cn={cn}
                    panelOpen={panelOpen}
                    tileNames={tileNames}
                    handleTileClicked={handleTileClicked}
                    selectedTile={selectedTile}
                />
            </div>
            {panelOpen && selectedPanelTile.type === "files" && onAddFile && (
                <button
                    type="button"
                    className={`${cn} panel-add-file`}
                    onClick={onAddFile}
                >
                    <span className="panel-add-file-icon" aria-hidden="true">+</span>
                    New file
                </button>
            )}
            <PanelBody
                cn={cn}
                panelSubItem={panelBody}
                selectedBodyItem={selectedBodyItem}
                handleBodyItemClick={handleBodyItemClick}
            />
        </div>
    )
}
