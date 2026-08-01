import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AuthGate } from './components/AuthGate.tsx'
import { loadRuntimeConfig } from './storage/runtimeConfig.ts'
import './index.css'

// Non-secret deployment configuration is loaded at runtime so the same immutable
// image can serve multiple environments.
loadRuntimeConfig().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AuthGate>
        <App />
      </AuthGate>
    </React.StrictMode>,
  )
})
