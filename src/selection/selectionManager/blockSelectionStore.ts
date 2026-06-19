// blockSelectionStore.ts
//
// The set of block ids selected by a rubber-band drag (the boxes drawn around
// whole blocks, separate from text selection). Shaped for React's
// useSyncExternalStore: subscribe + getSnapshot.
//
// Snapshot stability: getSnapshot returns the same Set reference until a
// mutation replaces it with a new Set, so React only re-renders on real change.
// Methods are arrow-bound so SelectionManager can hand subscribe / getSnapshot
// straight to useSyncExternalStore without losing `this`.

export class BlockSelectionStore {

    private _selectedIds: ReadonlySet<string> = new Set()
    private _listeners: Set<() => void> = new Set()


    subscribe = (listener: () => void): (() => void) => {
        this._listeners.add(listener)
        return () => { this._listeners.delete(listener) }
    }

    getSnapshot = (): ReadonlySet<string> => this._selectedIds

    // Empty the selection. No-op (and no re-render) when already empty.
    clear = (): void => {
        if (this._selectedIds.size === 0) return
        this._selectedIds = new Set()
        this._emit()
    }

    // Replace the whole selection, or add to it when replace is false (Cmd-drag
    // keeps the previous boxes and adds the newly covered ones).
    apply(blockIds: ReadonlySet<string>, replace: boolean): void {
        const next = replace ? new Set(blockIds) : new Set(this._selectedIds)
        if (!replace) blockIds.forEach(id => next.add(id))
        this._selectedIds = next
        this._emit()
    }

    private _emit(): void {
        this._listeners.forEach(listener => listener())
    }
}
