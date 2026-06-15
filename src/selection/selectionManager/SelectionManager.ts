export type MouseEventData = {
    clientX: number,
    clientY: number,
    blockId: string,
    blockType: string,
}

export type SelectionPointParams = {
    blockType: string,
    blockId: string,
    childNodeIndex: number,
    node: Text | HTMLBRElement | null,
    offset: number,
}

export class SelectionPoint {
    blockType: string = "";
    blockId: string = "";
    childNodeIndex: number = 0;
    node: Text | HTMLBRElement | null = null;
    offset: number = 0;
}

export default class SelectionManager {

    //Caret is just a collapsed selection -> anchor and focus point at the same spot.
    //When we extend to ranges later, anchor and focus will diverge.
    anchor: SelectionPoint = new SelectionPoint();
    focus: SelectionPoint = new SelectionPoint();


    //Public entry point -> Workspace calls this. CA does not talk to SM directly.
    receiveMouseEvent = (mouseData: MouseEventData, trigger: string): void => {

        const point = this._buildSelectionPoint(mouseData)
        if(!point) return

        //Click collapses to a caret -> anchor and focus are the same point.
        //Later: drag/shift-click will set focus separately from anchor.
        if(trigger === "click") {
            this._setCaret(point)
        }
    }


    //Take raw mouse coords + the block's own identity and turn it into a SelectionPoint.
    //childNodeIndex is what lets us re-find the text node after a re-render.
    private _buildSelectionPoint = (mouseData: MouseEventData): SelectionPoint | null => {
        const { clientX, clientY, blockId, blockType } = mouseData

        const caretPosition = document.caretPositionFromPoint(clientX, clientY)
        if(!caretPosition) return null

        const node = caretPosition.offsetNode as Text | HTMLBRElement
        if(!node) return null

        const parent = node.parentNode
        if(!parent) return null

        //Index of this text node inside its parent's childNodes.
        //After re-render the node ref dies, but we can climb back to it via blockId -> childNodeIndex.
        const childNodes = Array.from(parent.childNodes)
        const childNodeIndex = childNodes.indexOf(node as ChildNode)

        const offset = caretPosition.offset

        const point: SelectionPoint = {
            blockType,
            blockId,
            childNodeIndex,
            node,
            offset,
        }
        return point
    }


    private _setCaret = (point: SelectionPoint): void => {
        this.anchor = point
        this.focus = point
    }


    //Place the browser's caret at the stored point.
    //Called after re-render once we've resolved the node again.
    focusCaret = (): void => {
        const node = this.anchor.node
        if(!node) return
        node.normalize()
        const offset = this.anchor.offset

        const range = document.createRange()
        range.setStart(node, offset)
        range.setEnd(node, offset)
        range.collapse()

        const browserSelection = window.getSelection()
        browserSelection?.removeAllRanges()
        browserSelection?.addRange(range)
    }
}