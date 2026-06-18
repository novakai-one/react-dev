import type { ReactNode } from "react"


// ── Event family payloads ────────────────────────────────────────────────
// Co-located here (not in SelectionManager.ts) so components and DragManager
// can fill the shapes without importing SM. Keeps the "no helper imports
// another helper" invariant clean: DM and components depend only on types.
//
// Three channels, one shape per family:
//   - MouseEventData      — clicks, drag, hover, rubber-band
//   - KeyEventData        — keydown / keyup; modifiers included; nativeEvent for preventDefault
//   - LifecycleEventData  — blur (and future focus / input)
//
// SM owns every preventDefault. The Component → WSA → SM chain MUST stay
// synchronous (React 19 removed event pooling, but setTimeout / Promise.then
// would still break preventDefault).

export type MouseEventData = {
    clientX: number,
    clientY: number,
    blockId: string,
    blockType: string,
    shiftKey: boolean,
    metaKey: boolean,
    ctrlKey: boolean,
    altKey: boolean,
    button: number,
    buttons: number,
}

export type KeyEventData = {
    key: string,
    shiftKey: boolean,
    metaKey: boolean,
    ctrlKey: boolean,
    altKey: boolean,
    blockId: string,
    blockType: string,
    nativeEvent: React.KeyboardEvent,
}

export type LifecycleEventData = {
    blockId: string,
    blockType: string,
}


// ── Document model ───────────────────────────────────────────────────────

export interface MetaData {
    dateCreated: string,
    author?: string,
    lastEdited?: string,
}

// One renderable block in the document.
// component selects the React component to render (see workspace-blocks/).
// Tag selects the HTML element for ContentArea blocks.
// children: a flat list of child block ids — supports future nesting; currently null.
// layout: optional during initial placement, present once the block is laid out.
export interface TextElement {
    id: string,
    component: "ContentArea" | "CanvasArea",
    Tag: "h1" | "h2" | "h3" | "h4" | "h5" | "p" | "span" | "ol" | "ul" | "li" | "div",
    styles: string,
    classNames: string,
    innerContent: string,
    layout?: { layoutData: LayoutData, dragContainerProps?: DragContainerProps },
    parentId: string | null,
    children: string[] | null,
    files: string[],
}


// ── Panel tile shapes ────────────────────────────────────────────────────

export type PanelTile = FilePanelTile | BlockPanelTile

export interface FilePanelTile {
    type: "files",
    tileName: "Files",
    panelBody: FileData[],
}

export interface BlockPanelTile {
    type: "blocks",
    tileName: "Blocks",
    panelBody: { id: string, block: string }[],
}


// ── Document containers ──────────────────────────────────────────────────

export type ContentDataSet = Record<string, TextElement>
export type FilesDataSet   = Record<string, FileData>

export type FileData = {
    id: string,
    metaData: MetaData,
    tags: string[],
    fileName: string,
    content: string[],   // ordered list of block ids — looked up in ContentDataSet
}

export type DataSet = {
    files: FilesDataSet,
    content: ContentDataSet,
}


// ── Layout / drag-container ──────────────────────────────────────────────

export interface LayoutData {
    x: number,
    y: number,
    w: number,
    h: number,
}

export interface DragContainerProps {
    id: string,
    children: ReactNode,
    // The conduit — DragContainer forwards raw mouse data + trigger, never decides.
    cbMouseEvent: (mouseData: MouseEventData, trigger: string) => void,
    // SM-owned block-selection flag — WSA passes the value off useSyncExternalStore.
    isSelected?: boolean,
    // Saved x/y/w/h. Optional only while a block is first being placed.
    layoutData?: LayoutData,
}
