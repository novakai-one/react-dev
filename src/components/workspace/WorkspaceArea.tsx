import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { useDocumentStorage } from "../../storage/useDocumentStorage";
import {
  COMPONENT_REGISTRY,
  type ComponentRegistryKey,
} from "../../types/registry";
import type {
  TextElement,
  MouseEventData,
  KeyEventData,
  LifecycleEventData,
  FilesDataSet,
  DocShape,
} from "../../types/types";
import { layoutKey } from "../../types/types";
import type { NewSelectionManager } from "../../selection/NewSelectionManager/NEWSelectionManager";
import type DragManager from "../../draggable/dragManager/DragManager";
import type BlockManager from "../workspace-blocks/blockCreator/blockManager";
import type LayoutManager from "../../layout/layoutManager";
import DragContainer from "../../draggable/dragContainer/DragContainer";
import WorkspaceEmptyState from "./WorkspaceEmptyState";
import {
  useWorkspacePointerBridge,
  mouseEventDataFrom,
} from "./useWorkspacePointerBridge";
import { usePanelEventBridge } from "./usePanelEventBridge";
import "./workspace.css";

interface WorkspaceAreaProps {
  sm: NewSelectionManager;
  dm: DragManager;
  bm: BlockManager;
  lm: LayoutManager;
}

function buildRoots(nodes: TextElement[]): TextElement[] {
  return nodes.filter((node) => node.parentId === null);
}

// Put the caret inside a contentEditable at its start or end. Used after a
// structural change re-renders, so the freshly created block is focused and
// ready to type into. Pure DOM — the only place WSA writes the native caret.
function placeCaret(el: HTMLElement, edge: "start" | "end"): void {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(edge === "start"); // true = collapse to start
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export default function WorkspaceArea({ sm, dm, bm, lm }: WorkspaceAreaProps) {
  // Selectors instead of a full-state destructure — keeps WSA out of the
  // re-render loop when unrelated fields change.
  const activeFile = useWorkspaceStore((s) => s.activeFile);
  const contentDataSet = useWorkspaceStore((s) => s.content);
  const layouts = useWorkspaceStore((s) => s.layouts);
  const setDataSet = useWorkspaceStore((s) => s.setDataSet);
  const { saveDocument } = useDocumentStorage();
  const wsaRef = useRef<HTMLDivElement>(null);

  // Which blocks are selected. SM writes the selection snapshot into the
  // committed shape; WSA reads the block-id list straight off the store and
  // passes the flag down to each DragContainer. No SM subscription.
  //21st June -> potential fix here at some stage. WSA only one setting and subscribing.
  const selectedBlockIds = useWorkspaceStore(
    (s) => s.selection.selectedBlockIds,
  );

  // Caret target after a structural change (Enter create, Backspace delete).
  // BlockManager sets it; this component places the caret once the new DOM has
  // rendered, then clears it. selectedBlockIds is the block-highlight channel —
  // it carries no caret, so focus lives here, not there.
  const pendingFocus = useWorkspaceStore((s) => s.pendingFocus);
  const setPendingFocus = useWorkspaceStore((s) => s.setPendingFocus);

  // needs to be renamed into a named function to describe intent not just useLayoutEffect.
  useLayoutEffect(() => {
    if (!pendingFocus) return;
    const editable = wsaRef.current?.querySelector<HTMLElement>(
      `[data-blockid="${pendingFocus.id}"][contenteditable="true"]`,
    );
    if (editable) placeCaret(editable, pendingFocus.edge);
    setPendingFocus(null);
  }, [pendingFocus, setPendingFocus]);

  // ── Commit: write the shape back, let React diff ─────────────────────────
  // If no helper changed anything the references match the store and we skip
  // the write.
  const commit = useCallback(
    (shape: DocShape): void => {
      const state = useWorkspaceStore.getState();
      if (!shape.file || !state.files) return;

      const docUnchanged =
        shape.contentData === state.content &&
        shape.layoutData === state.layouts &&
        shape.databaseData === state.databases;
      const selectionUnchanged = shape.selection === state.selection;

      // Nothing moved at all — no document edit and no selection change. Skip.
      if (docUnchanged && selectionUnchanged) return;

      // Selection-only change (e.g. a caret move): write just the snapshot so
      // WSA's selected-block flags update without a document write.
      if (docUnchanged) {
        state.setSelection(shape.selection);
        return;
      }

      const updatedFiles: FilesDataSet = {
        ...state.files,
        [shape.file.id]: shape.file,
      };
      saveDocument(
        updatedFiles,
        shape.contentData,
        shape.layoutData,
        shape.databaseData,
      );
      setDataSet(
        updatedFiles,
        shape.contentData,
        shape.layoutData,
        shape.databaseData,
      );
      // activeFile drives the rendered root list. setDataSet refreshes files and
      // content but not activeFile, so without this the stale activeFile.content
      // omits a freshly created block id (create never renders) while a deleted
      // id survives only because its content entry is gone (filter drops it).
      state.setActiveFile(shape.file);
      state.setSelection(shape.selection);
    },
    [saveDocument, setDataSet],
  );

  // ── The conduit: one router, one uniform shape, every helper ─────────────
  // WSA reads its rendered store state into a DocShape, threads it through
  // every helper in a fixed order, and commits whatever comes out. WSA makes
  // NO decisions.
  const route = useCallback(
    (
      channel: "mouse" | "key" | "lifecycle",
      data: MouseEventData | KeyEventData | LifecycleEventData,
      trigger: string,
    ): void => {
      const state = useWorkspaceStore.getState();
      if (!state.content) return;

      let shape: DocShape = {
        file: state.activeFile,
        contentData: state.content,
        layoutData: state.layouts ?? {},
        databaseData: state.databases ?? {},
        selection: state.selection,
      };

      if (channel === "mouse") {
        const d = data as MouseEventData;
        shape = bm.receiveMouseEvent(d, trigger, shape);
        shape = sm.receiveMouseEvent(d, trigger, shape);
        shape = dm.receiveMouseEvent(d, trigger, shape);
        shape = lm.receiveMouseEvent(d, trigger, shape);
      } else if (channel === "key") {
        const d = data as KeyEventData;
        shape = bm.receiveKeyEvent(d, trigger, shape);
        shape = sm.receiveKeyEvent(d, trigger, shape);
        shape = dm.receiveKeyEvent(d, trigger, shape);
        shape = lm.receiveKeyEvent(d, trigger, shape);
      } else {
        const d = data as LifecycleEventData;
        shape = bm.receiveLifecycleEvent(d, trigger, shape);
        shape = sm.receiveLifecycleEvent(d, trigger, shape);
        shape = dm.receiveLifecycleEvent(d, trigger, shape);
        shape = lm.receiveLifecycleEvent(d, trigger, shape);
      }

      commit(shape);
    },
    [bm, sm, dm, lm, commit],
  );

  // ── Hand the workspace element to the helpers that query the DOM ─────────
  //19th June -> need to check as these might be redundant now that everything flows back through WSA.
  useEffect(() => {
    sm.setWorkspaceEl(wsaRef.current);
    bm.setWorkspaceEl(wsaRef.current);
    dm.setWorkspaceEl(wsaRef.current);
  }, [sm, bm, dm]);

  // ── Document-level mouse move/up bridge (see hook for why on document) ────
  // The bridge forwards those two triggers straight into the same router.

  const forwardMouse = useCallback(
    (data: MouseEventData, trigger: string) => route("mouse", data, trigger),
    [route],
  );
  useWorkspacePointerBridge(forwardMouse);

  // ── Sibling-panel mouse bridge (LeftPanel reaches the router across the gap) ─
  // A panel click can't bubble to the workspace div, so LeftPanel dispatches its
  // mouse gesture through a store; this hook registers WSA's same router as the
  // handler. WSA stays the sole router — the panel insert flows through the same
  // route('mouse', …) every canvas click uses. WSA imports the hook, never the
  // store, so the conduit rule holds.
  usePanelEventBridge(forwardMouse);

  // ── Thin DOM-event adapters: shape the native event, hand to the router ──
  // No logic beyond shaping. A block's own handlers fire with that block's id;
  // the workspace root fires for canvas events.

  const handleMouseEvent = useCallback(
    (data: MouseEventData, trigger: string) => route("mouse", data, trigger),
    [route],
  );

  const handleKeyEvent = useCallback(
    (data: KeyEventData, trigger: string) => route("key", data, trigger),
    [route],
  );

  const handleLifecycleEvent = useCallback(
    (data: LifecycleEventData, trigger: string) =>
      route("lifecycle", data, trigger),
    [route],
  );

  const handleWorkspaceMouseEvent = (e: React.MouseEvent, trigger: string) => {
    handleMouseEvent(mouseEventDataFrom(e), trigger);
  };

  // Background click → "workspace-click" tagged with the active file id. The
  // target guard is DOM event routing (this handler owns only the canvas, not
  // its children), not a gesture decision — BlockManager owns the create guards.
  const handleWorkspaceClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    const fileId = useWorkspaceStore.getState().activeFile?.id ?? "";
    handleMouseEvent(
      { ...mouseEventDataFrom(e), blockId: fileId },
      "workspace-click",
    );
  };

  // Resolve roots only when the document is loaded. The workspace <div> ALWAYS
  // renders so wsaRef attaches on first commit.
  const roots: TextElement[] =
    activeFile && contentDataSet
      ? buildRoots(
          activeFile.content.map((id) => contentDataSet[id]).filter(Boolean),
        )
      : [];

  return (
    <div
      className="workspace-area"
      ref={wsaRef}
      onMouseDown={(event) =>
        handleWorkspaceMouseEvent(event, "workspace-mouse-down")
      }
      onClick={handleWorkspaceClick}
    >
      {roots.length === 0 && <WorkspaceEmptyState />}

      {contentDataSet &&
        roots.map((node) => {
          const ComponentToRender =
            COMPONENT_REGISTRY[node.component as ComponentRegistryKey];
          const isSelected = selectedBlockIds.includes(node.id);
          return (
            <DragContainer
              key={node.id}
              id={node.id}
              layoutData={
                activeFile
                  ? layouts?.[layoutKey(activeFile.id, node.id)]
                  : undefined
              }
              isSelected={isSelected}
              dm={dm}
              cbMouseEvent={handleMouseEvent}
            >
              <ComponentToRender
                contentDataSet={contentDataSet}
                activeContent={node}
                cbMouseEvent={handleMouseEvent}
                cbKeyboardEvent={handleKeyEvent}
                cbLifecycleEvent={handleLifecycleEvent}
              />
            </DragContainer>
          );
        })}
    </div>
  );
}
