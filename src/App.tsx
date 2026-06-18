import './App.css'
import Header from './components/header/Header'
import Footer from './components/footer/Footer'
import Editor from './components/Editor'
import LeftPanel from './components/panels/left-panel/LeftPanel'
import RightPanel from './components/panels/right-panel/RightPanel'
import { useEffect } from 'react'
import type { DataSet, MetaData } from './types/types'
import { useDocumentStorage } from './storage/useDocumentStorage'
import { useWorkspaceStore } from './components/store/useWorkspaceStore'
import { SelectionPoint } from './selection/selectionManager/SelectionManager'
import SelectionManager from './selection/selectionManager/SelectionManager'
import { DragManager } from './draggable/dragManager/DragManager'

export default function App() {
  const {saveDocument, loadDocument} = useDocumentStorage();
  const { setActiveFile, setDataSet } = useWorkspaceStore();
  const ds =  loadDocument()
  useEffect(() => {
    if(!ds) return 
    const {files, content} = ds
    setDataSet(files, content)
  }, [])

  
 
  
  const selectionManager = new SelectionManager()
  const dragManager = new DragManager();

  return (
    <div className="app">
      
      <LeftPanel sm={selectionManager} />
      <Editor 
        sm={selectionManager}
        dm={dragManager}
        />
      <RightPanel />
      
    </div>
   
  )
}
