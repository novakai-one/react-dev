export interface SelectionPoint {
    blockId: string;
    offset: number;
}

export type SelectionMode = "caret" | "range" | "multi-block";

export interface SelectionState {
    anchor: SelectionPoint | null;
    focus:  SelectionPoint | null;
    mode:   SelectionMode;
    // direction: "forward" | "backward // needs to be wired in. //would reduce chance of error and confusion wondering if ordering has already happened -> currently risky as SM builds range and deals with it using same names so confusing.
}

// Starting selection: nothing selected.
export function emptySelection(): SelectionState {
    return { anchor: null, focus: null, mode: "caret" };
}

// Range -> caret. Collapses focus onto anchor.
export function collapse(state: SelectionState): SelectionState {
    return { ...state, focus: state.anchor, mode: "caret" };
}
