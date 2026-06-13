import './left-panel.css'
import Panel from '../shared/panel/Panel'
import type { TextFile, TextElement, MetaData, FilePanelPiece, PiecesPanelPiece, PanelPiece } from '../../../types/types'

export default function LeftPanel() {
    const cn: string = "left-panel"

    //boilerplate starting data.

    type DataSet = {
        content: Record<string, TextElement>
    }
    const dataSet: DataSet = {
        content: {
            1: { id: "1", component: "ContentArea", Tag: "h1", styles: "", classNames: "title", innerContent: "My Document", parentId: null, children: null },
            2: { id: "2", component: "ContentArea", Tag: "p", styles: "", classNames: "body-text", innerContent: "This is an introductory paragraph.", parentId: null, children: null},
            3: { id: "3", component: "ContentArea", Tag: "h2", styles: "", classNames: "section-heading", innerContent: "Section One", parentId: null, children: null },
            4: { id: "4", component: "ContentArea", Tag: "p", styles: "", classNames: "body-text", innerContent: "Content under section one.", parentId: null, children: null },
            5: { id: "5", component: "ContentArea", Tag: "ul", styles: "", classNames: "list", innerContent: "", parentId: null, children: ["6", "7"]},
            6: { id: "6", component: "ContentArea", Tag: "li", styles: "", classNames: "list-item", innerContent: "First item", parentId: "5", children: null },
            7: { id: "7", component: "ContentArea", Tag: "li", styles: "", classNames: "list-item", innerContent: "Second item", parentId: "5", children: null }
        }
    }

    const startingMetaData: MetaData = {
        dateCreated: "2026-06-09",
        author: "Chris",
        lastEdited: "2026-06-09 2:41am",
    }

    const initialFileData: FilePanelPiece = {
        kind: "files",
        tileName: "Files",
        panelBody: [{ id: "file-1", component:"ContentArea", fileName: "first file", fileContents: initialElements, metaData: startingMetaData, tags: [""] }]
    }

    const piecesPanelData: PiecesPanelPiece = {
        kind: "pieces",
        tileName: "Pieces",
        panelBody: [{ id: "piece-1", piece: "Header" }, { id: "piece-2", piece: "Callout" }, { id: "piece-3", piece: "Quote" }]
    }

    const leftPanelData: PanelPiece[] = [initialFileData, piecesPanelData]

    return (
        <Panel
            cn={cn}
            panelData={leftPanelData}
        />
    )
}