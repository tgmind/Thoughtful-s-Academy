import { useState, useEffect } from 'react'
import { Smartphone, Download } from 'lucide-react'

export default function InstallHeaderButton({ className = '' }) {
  const [isHidden, setIsHidden] = useState(false)

  useEffect(() => {
    // 1. Check if running inside installed standalone app mode
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')

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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md shadow-amber-500/20 hover:shadow-amber-500/40 transition-all active:scale-95 cursor-pointer ${className}`}
      title="Install Thoughtful's Academy Mobile App"
    >
      <Smartphone className="w-3.5 h-3.5 text-white" />
      <span>Install App</span>
      <Download className="w-3 h-3 text-white/80" />
    </button>
  )
}
