import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { registerServiceWorker } from './pwa'
import { applyTheme, getInitialTheme } from './utils/theme'

// Initialize theme (defaults to clean, crisp light theme)
applyTheme(getInitialTheme())

registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
