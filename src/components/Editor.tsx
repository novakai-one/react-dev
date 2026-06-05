//editor wraps panels & workspace 
import Middle from "./workspace/Middle"
import LeftPanel from "./panels/LeftPanel"
import RightPanel from "./panels/RightPanel"
import './editor.css'

export default function Editor () {

    return(
        <div className="editor">           
            <LeftPanel />
            <Middle />
            <RightPanel />
            
        </div>
    )
}