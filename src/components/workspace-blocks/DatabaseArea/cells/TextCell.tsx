// TextCell — the default cell renderer for every non-typed column ("text",
// "number", "date", "select" for now). Chosen by CELL_REGISTRY for those types
// so DatabaseArea can fan out to one component per type without branching.
//
// It is a thin adapter: it maps the uniform CellProps onto ContentArea's props
// (cell → activeContent) so a cell edits through the exact same contentEditable
// + SelectionManager path as every other block. No logic of its own.

import ContentArea from "../../ContentArea/ContentArea";
import type { CellProps } from "../../../../types/types";

export default function TextCell({
  cell,
  contentDataSet,
  cbMouseEvent,
  cbKeyboardEvent,
  cbLifecycleEvent,
}: CellProps) {
  return (
    <ContentArea
      activeContent={cell}
      contentDataSet={contentDataSet}
      cbMouseEvent={cbMouseEvent}
      cbKeyboardEvent={cbKeyboardEvent}
      cbLifecycleEvent={cbLifecycleEvent}
    />
  );
}
