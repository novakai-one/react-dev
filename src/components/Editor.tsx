//editor wraps panels & workspace
import './editor.css'
import Header from "./header/Header"
import Footer from "./footer/Footer"
import WorkspaceArea from "./workspace/WorkspaceArea"
import type SelectionManager from "../selection/selectionManager/SelectionManager"
import type DragManager from "../draggable/dragManager/DragManager"
interface EditorProps {
    sm: SelectionManager,
    dm: DragManager
}
export default function Editor ({sm, dm}: EditorProps) {

    return(
        <div className="editor">           
            
            <Header />
            <WorkspaceArea 
                sm={sm}
                dm={dm}
                />  
            <Footer />
            
        </div>
    )
}