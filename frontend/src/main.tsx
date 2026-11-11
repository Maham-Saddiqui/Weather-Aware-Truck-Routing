import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/700.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('The page has no #root element to render into')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
