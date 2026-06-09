import { useWorkspaceStore } from '../store/useWorkspaceStore'
import './workspace.css'
import CanvasArea from '../workspace-interactives/CanvasArea/CanvasArea'
import ContentArea from '../workspace-interactives/ContentArea/ContentArea'
import type { TextElement } from '../../types/types'


//object storing the Component. same as reading ContentArea: ContentArea
const COMPONENT_REGISTRY = {
    ContentArea,
    CanvasArea,
  }

  //Build the node tree 
  //This only does parent/children at the moment -> grandchildren are left out.
  // So now I need to go and find all the nodes remaining and do a recursive search to add them to the children until theres none left.
  function buildTree(nodes: TextElement[]): TextElement[] {
    //This will return only parent and child and any grandchildren and below will be orphaned.
    return nodes
        .filter(node => node.parentId === null) //find top level nodes
        .map(node => ({
            ...node, //Append children to the top level nodes for component recursion later.
            children: nodes.filter(child => child.parentId === node.id) 
        }))
}

export default function WorkspaceArea() {
    const { activeFile } = useWorkspaceStore()
    if(!activeFile) return
    const { fileContents } = activeFile

    const tree = buildTree(fileContents)
    if(!tree) return
    
    //activeFile is the filename on teh side. fileContents is the array of nodes I want to become components.

    //const ComponentToRender = COMPONENT_REGISTRY[activeFile.component]

    const handleKeyEvent = (event: KeyboardEvent, ) => {
        //need to get the id of content.
    }
    
    return (
        <div className="workspace-area">
           {tree.map((node) => {
            const ComponentToRender = COMPONENT_REGISTRY[node.component as keyof typeof COMPONENT_REGISTRY]
            return <ComponentToRender activeContent={node} />
          })}
        </div>
    )
}

