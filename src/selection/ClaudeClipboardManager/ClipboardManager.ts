import type { DocShape, KeyEventData } from "../../types/types"
import type { SelectionPoint } from "../ClaudeSelectionManager/selectionState"
import type { ClipboardMode } from "./clipboardStore"
import { copy } from "./copy"
import { cut } from "./cut"
import { paste } from "./paste"

// ── ClipboardManager ──────────────────────────────────────────────────────
// Helper class used BY SelectionManager. Not called by WSA directly.
//
// Single public method: receiveEvent. Like every other helper, plus one extra arg
// (range) that only clipboard needs:
//   receiveEvent(eventData, reactEvent, trigger, shape, range) -> shape
//
// IMPORTANT — trigger words are EVENTS, not commands. SM routes raw events to
// clipboard (e.g. "content-area-key-down"). There is no "clipboard-copy" trigger.
// Clipboard reads the KeyEventData itself, detects the keystroke (cmd/ctrl + c/x/v)
// and DECIDES the command. This decision is 100% internal — SM does not know
// whether clipboard copied, and that is not SM's job.
//
// SHAPE CONTRACT: receiveEvent returns a NEW shape 100% of the time, exactly like
// SelectionManager.receiveKeyEvent (always returns buildShape). copy / cut and any
// non-paste path make no document change but still hand back a fresh top-level
// DocShape (same dataset refs, new identity). Only paste rebuilds the datasets.
//
// SELECTION SOURCE: a key event (KeyEventData) carries ONE blockId, not the
// multi-block selection. SM owns selection — its `buildRange` produces a `range`
// (SelectionPoint[]) which SM passes as the LAST argument to receiveEvent. copy/cut
// resolve that range to ordered block ids. paste ignores range (it pastes the buffer
// at the caret). range defaults to [] so the manager works standalone (copy/cut then
// no-op).
//
// The buffer (held slice + mode) lives in clipboardStore, not on this instance, so
// the held data survives even if SM rebuilds the manager. (Lifetime decision — PLAN.md.)

type ClipboardCommand = "copy" | "cut" | "paste"

// Only key-DOWN events can carry a clipboard keystroke. Gate on the suffix so the
// component prefix (content-area / workspace-area / database-cell / …) does not
// matter — cmd+c fires wherever a block is focused.
function isKeyDownTrigger(trigger: string): boolean {
    return trigger.endsWith("-key-down")
}

// Map a key event to a clipboard command, or null if it is not one. metaKey (mac
// cmd) OR ctrlKey (win/linux) is the platform modifier. Nothing else matches.
function detectCommand(trigger: string, eventData: unknown): ClipboardCommand | null {
    if (!isKeyDownTrigger(trigger)) return null

    const e = eventData as KeyEventData
    const platformMod = e?.metaKey || e?.ctrlKey
    if (!platformMod) return null

    switch (e.key?.toLowerCase()) {
        case "c": return "copy"
        case "x": return "cut"
        case "v": return "paste"
        default:  return null
    }
}

// New top-level shape, same dataset references. Used by every non-paste path so the
// return is always a fresh identity (matches SM's always-new-shape contract).
function cloneShape(shape: DocShape): DocShape {
    return {
        file:         shape.file,
        contentData:  shape.contentData,
        layoutData:   shape.layoutData,
        databaseData: shape.databaseData,
    }
}

export class ClipboardManager {
    // The one public method. Clipboard detects the command from the key event, then
    // runs the matching path. paste and cut return their own new shape; copy and the
    // no-command path fall through to a fresh clone of the input shape.
    //
    // `range` is SM's built selection (SelectionPoint[]); only copy/cut read it.
    receiveEvent(
        eventData: unknown,
        reactEvent: React.SyntheticEvent | null,
        trigger: string,
        shape: DocShape,
        range: SelectionPoint[] = [],
    ): DocShape {
        switch (detectCommand(trigger, eventData)) {
            case "copy":
                // Fills the buffer from the range. No document change.
                copy(range, shape)
                break

            case "cut":
                // Fills the buffer AND removes the source — returns its own new shape.
                return cut(range, shape)

            case "paste":
                // Merges the buffer at the caret — returns its own new shape.
                return paste(eventData, reactEvent, shape)

            default:
                // Not a clipboard keystroke. No change.
                break
        }

        // copy / non-command: no document change, but always a new shape.
        return cloneShape(shape)
    }
}

// Re-export the mode type so SM can read it if needed without importing the store.
export type { ClipboardMode }
