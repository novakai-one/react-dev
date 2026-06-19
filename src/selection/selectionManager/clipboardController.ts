// clipboardController.ts
//
// Clipboard input/output and the in-memory fallback. The pure payload and
// plain-text builders live in clipboard.ts; this owns the side effects:
// navigator.clipboard reads/writes, the Firefox fallback copy, and inserting
// pasted HTML at the live caret.
//
// In-memory fallback: some browsers block clipboard.read() (Firefox). We keep
// the last copied blocks here and trust them only when the native plain text
// still matches — otherwise the user copied something else in between and we
// treat the native clipboard as a plain-text paste.

import type { ClipboardBlockData, PastedBlocksHandler } from './types'
import { CLIPBOARD_CUSTOM_TYPE } from './types'
import type { SelectionState } from './SelectionState'
import { buildClipboardBlocks, computeSelectedText } from './clipboard'
import { buildResolvedRange } from './highlightRenderer'
import { blockIdFromNode } from './domHelpers'


export class ClipboardController {

    private _internal: { blocks: ClipboardBlockData[]; plainText: string } | null = null


    // Plain-text of the current selection. Empty when nothing is selected.
    selectedText(state: SelectionState): string {
        if (!state.hasActiveSelection()) return ""
        return computeSelectedText(state.anchor, state.focus, state.resolved)
    }


    // Copy the selection as both structured blocks and plain text.
    copy = async (state: SelectionState, blockOrder: string[], wsaEl: HTMLElement | null): Promise<void> => {
        if (!wsaEl) return
        if (!state.hasActiveSelection()) return

        // Cross-block selections need a resolved range before the builders run.
        if (state.anchor.blockId !== state.focus.blockId && !state.resolved) {
            state.resolved = buildResolvedRange(state.anchor, state.focus, blockOrder, wsaEl)
        }

        const blocks = buildClipboardBlocks(state.anchor, state.focus, state.resolved, wsaEl)
        if (blocks.length === 0) return

        const plainText = this.selectedText(state)
        this._internal = { blocks, plainText }   // keep for the Firefox fallback

        await this._writeToClipboard(blocks, plainText)
    }


    // Read the clipboard, preferring our structured format, then the validated
    // in-memory copy, then a plain-text split into <p> blocks.
    paste = async (): Promise<ClipboardBlockData[]> => {
        const structured = await this._readStructured()
        if (structured) return structured

        try {
            const nativePlainText = await navigator.clipboard.readText()

            const inMemoryValid = this._internal && nativePlainText === this._internal.plainText
            if (inMemoryValid) return this._internal!.blocks

            if (!nativePlainText) return []
            return nativePlainText.split('\n').map(line => ({ html: line, tag: 'p' }))
        } catch (err) {
            console.error('Clipboard read failed:', err)
            return []
        }
    }


    // Insert HTML at the live browser caret. Returns the block id that received
    // the insertion, or null when there is no active caret.
    insertAtCaret = (html: string, wsaEl: HTMLElement | null): string | null => {
        if (!wsaEl) return null
        const browserSelection = window.getSelection()
        if (!browserSelection || browserSelection.rangeCount === 0) return null

        const range   = browserSelection.getRangeAt(0)
        const blockId = blockIdFromNode(range.startContainer, wsaEl)
        range.deleteContents()

        if (html) insertHtmlIntoRange(html, range, browserSelection)
        return blockId
    }


    // Paste at the caret: the first block lands inline; any extra blocks are
    // handed to WSA to create as new blocks below.
    pasteAtCaret = (wsaEl: HTMLElement | null, onPastedBlocks: PastedBlocksHandler | null): void => {
        this.paste().then(blocks => {
            if (blocks.length === 0) return
            const anchorBlockId = this.insertAtCaret(blocks[0].html, wsaEl)
            if (blocks.length > 1 && anchorBlockId) {
                onPastedBlocks?.(anchorBlockId, blocks.slice(1))
            }
        })
    }


    // ── Private I/O ──────────────────────────────────────────────────────────

    private async _writeToClipboard(blocks: ClipboardBlockData[], plainText: string): Promise<void> {
        const structuredBlob = new Blob([JSON.stringify(blocks)], { type: CLIPBOARD_CUSTOM_TYPE })
        const plainBlob      = new Blob([plainText],              { type: 'text/plain' })

        try {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/plain':            plainBlob,
                    [CLIPBOARD_CUSTOM_TYPE]: structuredBlob,
                })
            ])
        } catch {
            try {
                await navigator.clipboard.writeText(plainText)
            } catch (err) {
                console.error('Clipboard write failed:', err)
            }
        }
    }

    private async _readStructured(): Promise<ClipboardBlockData[] | null> {
        try {
            const items = await navigator.clipboard.read()
            for (const item of items) {
                if (item.types.includes(CLIPBOARD_CUSTOM_TYPE)) {
                    const blob = await item.getType(CLIPBOARD_CUSTOM_TYPE)
                    return JSON.parse(await blob.text()) as ClipboardBlockData[]
                }
            }
        } catch {
            // clipboard.read() blocked (Firefox) — caller falls back to plain text.
        }
        return null
    }
}


// Replace the range contents with parsed HTML and drop the caret just after the
// last inserted node.
function insertHtmlIntoRange(html: string, range: Range, browserSelection: Selection): void {
    const wrapper = document.createElement('div')
    wrapper.innerHTML = html

    const fragment = document.createDocumentFragment()
    while (wrapper.firstChild) fragment.appendChild(wrapper.firstChild)

    const lastInsertedNode = fragment.lastChild
    range.insertNode(fragment)

    if (lastInsertedNode) {
        range.setStartAfter(lastInsertedNode)
        range.collapse(true)
        browserSelection.removeAllRanges()
        browserSelection.addRange(range)
    }
}
