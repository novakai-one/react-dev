import './App.css'
import Header from './components/header/Header'
import Footer from './components/footer/Footer'
import Editor from './components/Editor'
import LeftPanel from './components/panels/left-panel/LeftPanel'
import RightPanel from './components/panels/right-panel/RightPanel'

export default function App() {
  //script 

  return (
    <div className="app">
      
      <LeftPanel />
      <Editor />
      <RightPanel />
      
    </div>
   
  )
}
