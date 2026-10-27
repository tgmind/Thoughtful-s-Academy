import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RefreshCw, X, ArrowUpCircle } from 'lucide-react'
import { getUpdateInfo, subscribeToUpdates, applyAppUpdate } from '../../utils/versionManager'

export default function AppUpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    const handleUpdate = (detail) => {
      const info = detail || {}
      setUpdateInfo(info)

      // Check if this specific version was snoozed in this browser session
      const snoozedVersion = sessionStorage.getItem('pwa_snoozed_version')
      const isSnoozed = sessionStorage.getItem('pwa_update_snoozed') === 'true'

      // If snoozed without a specific version, or snoozed on this exact version, suppress
      if (isSnoozed && (!info.remoteVersion || snoozedVersion === info.remoteVersion)) {
        return
      }

      setUpdateAvailable(true)
    }

    // Check if an update was already detected before this component mounted
    const existing = getUpdateInfo()
    if (existing?.updateAvailable) {
      handleUpdate(existing)
    }

    // Subscribe to versionManager store directly
    const unsubscribe = subscribeToUpdates((info) => {
      if (info?.updateAvailable) {
        handleUpdate(info)
      }
    })

    // Also listen to window CustomEvent for external dispatches
    const handleCustomEvent = (e) => {
      handleUpdate(e.detail)
    }
    window.addEventListener('app-new-version-available', handleCustomEvent)

    return () => {
      unsubscribe()
      window.removeEventListener('app-new-version-available', handleCustomEvent)
    }
  }, [])

  const handleApplyUpdate = () => {
    setIsUpdating(true)
    sessionStorage.removeItem('pwa_update_snoozed')
    sessionStorage.removeItem('pwa_snoozed_version')
    // Smooth reload to fetch the latest index.html and fresh bundles.
    // Preserves all Supabase session tokens in localStorage.
    setTimeout(() => {
      applyAppUpdate()
    }, 150)
  }

  const handleDismiss = () => {
    if (updateInfo?.remoteVersion) {
      sessionStorage.setItem('pwa_snoozed_version', updateInfo.remoteVersion)
    }
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
          className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-[9999] max-w-sm sm:max-w-md w-[calc(100%-1.5rem)] sm:w-auto"
        >
          <div className="bg-[#0f1117]/95 backdrop-blur-xl text-white p-3.5 sm:p-4 rounded-2xl border border-sky-500/30 shadow-[0_16px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(14,165,233,0.15)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 via-indigo-500 to-indigo-700 flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/20 border border-white/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 tracking-tight">
                  <span>New Version Available</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                </p>
                <p className="text-[11px] text-slate-300 truncate mt-0.5 font-medium">
                  Update published to Netlify. Refresh to view changes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleApplyUpdate}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer disabled:opacity-50 border border-white/10"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                <span>{isUpdating ? 'Updating…' : 'Refresh'}</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
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
