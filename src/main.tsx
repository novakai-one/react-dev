import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './lib/traceProbe' // DEV-ONLY state tracer. Remove this line + src/lib/traceProbe.ts to fully uninstall.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
