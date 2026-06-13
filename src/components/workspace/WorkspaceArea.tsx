//Workspace area gets the content from store.

import { useWorkspaceStore } from '../store/useWorkspaceStore'
import './workspace.css'
import CanvasArea from '../workspace-interactives/CanvasArea/CanvasArea'
import ContentArea from '../workspace-interactives/ContentArea/ContentArea'
import type { TextElement } from '../../types/types'


//object storing the Component. key/value same lookup value so collapses to single word. ContentArea: ContentArea
const COMPONENT_REGISTRY = {
    ContentArea,
    CanvasArea,
  }

  //Each node will be turned into a UI component.

  //Build the node tree 
  //This only does parent/children at the moment -> grandchildren are left out.
  // So now I need to go and find all the nodes remaining and do a recursive search to add them to the children until theres none left.
  function buildTree(nodes: TextElement[]): TextElement[] {
    return nodes
        .filter(node => node.parentId === null) //find top level nodes
        .map(node => ({
            ...node, //Append children to the top level nodes for component recursion later.
            children: nodes.filter(child => child.parentId === node.id) 
        }))
}

function buildRoots(nodes: TextElement[])

//I need to get the keys for the Record content and then map through the keys 
//I could also use Object.entries() to get the key values out in one go.

export default function WorkspaceArea() {
    const { activeFile } = useWorkspaceStore()
    //active File has type TextFile. It has file metadata and fileContents which has all the page content (nodes)
    if(!activeFile) return
    //The content to be displayed on workspace.
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
            {/* {tree.map((node) => {
            const ComponentToRender = COMPONENT_REGISTRY[node.component as keyof typeof COMPONENT_REGISTRY]
            return <ComponentToRender activeContent={node} />
          })} */}
           {fileContents.map((node) => {
            const ComponentToRender = COMPONENT_REGISTRY[node.component as keyof typeof COMPONENT_REGISTRY]
            return <ComponentToRender activeContent={node} />
           })}
        </div>
    )
}

