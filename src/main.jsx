import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

window.addEventListener('error', (event) => {
  console.error('Global error captured:', event.error || event.message, event)
  const message = event.error?.message || event.message || 'Unknown error'
  document.body.innerHTML = `<div style="padding:24px;font-family:system-ui;color:#111;background:#fff;"><h1>Runtime error detected</h1><pre style="white-space:pre-wrap;word-break:break-word;">${message}</pre></div>`
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection captured:', event.reason, event)
  const reason = event.reason?.message || String(event.reason)
  document.body.innerHTML = `<div style="padding:24px;font-family:system-ui;color:#111;background:#fff;"><h1>Unhandled promise rejection</h1><pre style="white-space:pre-wrap;word-break:break-word;">${reason}</pre></div>`
})

console.log('main.jsx loaded, mounting React app')
createRoot(document.getElementById('root')).render(
 
    <App />
  
)
