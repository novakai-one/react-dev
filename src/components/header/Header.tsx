import './header.css'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { useLayoutStore } from '../../layout/useLayoutStore'

// Sidebar glyph (à la Obsidian / Claude desktop): a panel outline with one
// column divided off. `side` puts the divider+fill on the left or right; `open`
// fills that column so the icon reflects whether the panel is showing.
function SidebarIcon({ side, open }: { side: "left" | "right"; open: boolean }) {
    const lineX = side === "left" ? 6 : 10
    const fillX = side === "left" ? 2.2 : 10
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            {open && (
                <rect x={fillX} y="2.6" width="3.8" height="10.8" rx="1" fill="currentColor" opacity="0.22" />
            )}
            <rect x="1.6" y="2.6" width="12.8" height="10.8" rx="2.4" stroke="currentColor" strokeWidth="1.3" />
            <line x1={lineX} y1="2.6" x2={lineX} y2="13.4" stroke="currentColor" strokeWidth="1.3" />
        </svg>
    )
}

export default function Header() {
    const activeFile = useWorkspaceStore(s => s.activeFile)

    const leftPanelOpen = useLayoutStore(s => s.leftPanelOpen)
    const rightPanelOpen = useLayoutStore(s => s.rightPanelOpen)
    const toggleLeftPanel = useLayoutStore(s => s.toggleLeftPanel)
    const toggleRightPanel = useLayoutStore(s => s.toggleRightPanel)

    return (
        <header className="header">
            <div className="header-group">
                <button
                    type="button"
                    className="sidebar-toggle"
                    aria-label={leftPanelOpen ? "Collapse left sidebar" : "Expand left sidebar"}
                    aria-pressed={leftPanelOpen}
                    title="Toggle left sidebar"
                    onClick={toggleLeftPanel}
                >
                    <SidebarIcon side="left" open={leftPanelOpen} />
                </button>
                <span className="header-crumb">Workspace</span>
                <span className="header-sep">/</span>
                <span className="header-title">{activeFile?.fileName ?? "Untitled"}</span>
            </div>

            <div className="header-group">
                <button
                    type="button"
                    className="sidebar-toggle"
                    aria-label={rightPanelOpen ? "Collapse right sidebar" : "Expand right sidebar"}
                    aria-pressed={rightPanelOpen}
                    title="Toggle right sidebar"
                    onClick={toggleRightPanel}
                >
                    <SidebarIcon side="right" open={rightPanelOpen} />
                </button>
            </div>
        </header>
    )
}
