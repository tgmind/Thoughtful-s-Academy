import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RefreshCw, X } from 'lucide-react'

export default function AppUpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    // Check if previously snoozed in this browser session
    const isSnoozed = sessionStorage.getItem('pwa_update_snoozed') === 'true'

    const handleUpdate = () => {
      if (!isSnoozed) {
        setUpdateAvailable(true)
      }
    }

    window.addEventListener('app-new-version-available', handleUpdate)

    return () => {
      window.removeEventListener('app-new-version-available', handleUpdate)
    }
  }, [])

  const handleApplyUpdate = () => {
    setIsUpdating(true)
    sessionStorage.removeItem('pwa_update_snoozed')
    // Smooth reload to fetch the latest index.html and fresh bundles.
    // Preserves all Supabase session tokens in localStorage.
    setTimeout(() => {
      window.location.reload()
    }, 150)
  }

  const handleDismiss = () => {
    sessionStorage.setItem('pwa_update_snoozed', 'true')
    setUpdateAvailable(false)
  }

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-50 max-w-sm w-[calc(100%-1.5rem)] sm:w-auto"
        >
          <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl border border-slate-700/80 shadow-[0_12px_40px_rgba(0,0,0,0.35)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <span>New Version Available</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                </p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  Update published to Netlify. Refresh to view changes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleApplyUpdate}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                <span>{isUpdating ? 'Updating…' : 'Refresh'}</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 text-slate-400 hover:text-slate-200 transition-colors rounded-lg"
                title="Dismiss for now"
                aria-label="Dismiss update notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
