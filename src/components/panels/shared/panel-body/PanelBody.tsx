import './panel-body.css'
import PanelBodyItem from './PanelBodyItem'

interface PanelBodyProps {
    cn: string,
    panelSubItem: string[],
    selectedBodyItem: string,
    handleBodyItemClick: (name: string) => void,
}

// panelSubItem: the list of submenu items rendered (file names or block names).
// selectedBodyItem: name of the currently active item — drives the .isSelected style.
export default function PanelBody({
    cn,
    panelSubItem,
    selectedBodyItem,
    handleBodyItemClick,
}: PanelBodyProps) {
    return (
        <div className={`${cn} panel-body`}>
            {panelSubItem.map((item, i) => (
                <PanelBodyItem
                    key={item}
                    cn={cn}
                    cn2={i}
                    isSelected={item === selectedBodyItem}
                    handleClick={handleBodyItemClick}
                >
                    {item}
                </PanelBodyItem>
            ))}
        </div>
    )
}
