import './panel-header.css'
import PanelHeaderTile from '../panel-header-tile/PanelHeaderTile'

interface PanelHeaderProps {
    cn: string,
    panelOpen: boolean,
    tileNames: string[],
    handleTileClicked: (tileName: string) => void,
    selectedTile: string,
}

export default function PanelHeader({
    cn,
    panelOpen,
    tileNames,
    handleTileClicked,
    selectedTile,
}: PanelHeaderProps) {
    return (
        <div className={`panel-header ${cn}-header panel-open-${panelOpen}`}>
            {tileNames.map((tileName) => (
                <PanelHeaderTile
                    key={tileName}
                    cn={cn}
                    tileName={tileName}
                    handleClick={handleTileClicked}
                    isSelected={tileName === selectedTile}
                />
            ))}
        </div>
    )
}
