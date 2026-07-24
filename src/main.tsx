import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { loadRuntimeConfig } from './runtime-config'

function RuntimeConfigError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-red-50 text-red-900 flex items-center justify-center p-6">
      <div className="max-w-xl bg-white border border-red-300 rounded-xl shadow-sm p-6">
        <h1 className="text-xl font-semibold mb-3">Configuration Error</h1>
        <p className="text-sm break-words">{message}</p>
      </div>
    </div>
  )
}

try {
  loadRuntimeConfig()

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown runtime configuration error'

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <RuntimeConfigError message={message} />
    </React.StrictMode>,
  )
}
