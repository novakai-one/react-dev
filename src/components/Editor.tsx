//editor wraps panels & workspace
import "./editor.css";
import Header from "./header/Header";
import Footer from "./footer/Footer";
import WorkspaceArea from "./workspace/WorkspaceArea";
import type { NewSelectionManager } from "../utils/selection/selection/NEWSelectionManager"
import type DragManager from "../utils/draggable/dragManager/DragManager";
import type BlockManager from "./blocks/blockManager/blockManager";
import type LayoutManager from "../utils/layout/layoutManager";
interface EditorProps {
  sm: NewSelectionManager;
  dm: DragManager;
  bm: BlockManager;
  lm: LayoutManager;
}
export default function Editor({ sm, dm, bm, lm }: EditorProps) {
  return (
    <div className="editor">
      <Header />
      <WorkspaceArea sm={sm} dm={dm} bm={bm} lm={lm} />
      <Footer />
    </div>
  );
}
