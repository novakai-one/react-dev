import './panel-header-tile.css'

interface PanelHeaderTileProps {
    cn: string,
    tileName: string,
    handleClick: (tileName: string) => void,
    isSelected: boolean,
}

export default function PanelHeaderTile({ cn, tileName, handleClick, isSelected }: PanelHeaderTileProps) {
    return (
        <div
            className={`${cn} panel-header-tile ${isSelected ? "selected-tile" : ""}`}
            onClick={() => handleClick(tileName)}
        >
            {tileName}
        </div>
    )
}
