import React from 'react'
import ReactDOM from 'react-dom/client'
import WardManager from './WardManager.jsx'

// iOS Safari only applies :active styles when a touch listener exists.
document.addEventListener('touchstart', () => {}, { passive: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WardManager />
  </React.StrictMode>
)
