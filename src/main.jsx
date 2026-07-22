import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AppProvider } from './store.jsx'
import AuthGate from './sections/Auth.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </AppProvider>
  </StrictMode>,
)
