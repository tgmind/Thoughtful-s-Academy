import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { initVersionWatcher } from './utils/versionManager'

// 1. Self-healing for stale dynamic imports after a new Netlify deployment
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    const key = 'vite_chunk_reload_stamp'
    const last = sessionStorage.getItem(key)
    const now = Date.now()
    // Prevent infinite reload loops: only reload if at least 10s passed since last auto-reload
    if (!last || now - parseInt(last, 10) > 10000) {
      sessionStorage.setItem(key, now.toString())
      window.location.reload()
    }
  })

  // 2. Handle Service Worker controller takeover when clientsClaim() fires
  if ('serviceWorker' in navigator) {
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        // Only auto-reload if the user is not actively editing forms
        const isEditing = document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
        if (!isEditing) {
          window.location.reload()
        }
      }
    })
  }

  // 3. Initialize background version checker for instant update detection
  initVersionWatcher()

  // 4. Dynamic Preconnect to configured Supabase Gateway (zero secret exposure in source HTML)
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    if (supabaseUrl) {
      const origin = new URL(supabaseUrl).origin
      if (!document.querySelector(`link[href="${origin}"]`)) {
        const preconnectLink = document.createElement('link')
        preconnectLink.rel = 'preconnect'
        preconnectLink.href = origin
        preconnectLink.crossOrigin = ''
        const dnsPrefetchLink = document.createElement('link')
        dnsPrefetchLink.rel = 'dns-prefetch'
        dnsPrefetchLink.href = origin
        document.head.appendChild(preconnectLink)
        document.head.appendChild(dnsPrefetchLink)
      }
    }
  } catch {
    // Non-blocking performance optimization
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:   1000 * 60 * 2,  // 2 minutes
      retry:       1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
)
