import { useState, useEffect } from 'react'
import { Smartphone, Download } from 'lucide-react'
import { INSTITUTE_NAME } from '../lib/constants'

export default function InstallHeaderButton({ className = '' }) {
  const [isHidden, setIsHidden] = useState(false)

  useEffect(() => {
    // 1. Check if running inside installed standalone app mode
    const standalone =
      (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true ||
      document.referrer?.includes('android-app://')

    if (standalone) {
      setIsHidden(true)
      return
    }

    // 2. On Chrome/Android, check if related app/WebAPK is already installed on phone
    if ('getInstalledRelatedApps' in navigator) {
      navigator.getInstalledRelatedApps().then(relatedApps => {
        if (relatedApps && relatedApps.length > 0) {
          setIsHidden(true)
        }
      }).catch(() => {})
    }

    try {
      if (localStorage.getItem('pwa_app_installed') === 'true') {
        setIsHidden(true)
      }
    } catch (err) {
      console.debug(err)
    }
  }, [])

  if (isHidden) return null

  const handleClick = () => {
    window.dispatchEvent(new Event('open-pwa-install-prompt'))
  }

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-xs shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all active:scale-95 cursor-pointer shrink-0 ${className}`}
      title={`Install ${INSTITUTE_NAME} Mobile App`}
    >
      <Smartphone className="w-3.5 h-3.5 text-white shrink-0" />
      <span className="hidden xs:inline">Install App</span>
      <span className="xs:hidden font-semibold">App</span>
      <Download className="w-3 h-3 text-white/80 shrink-0" />
    </button>
  )
}
