import { useState, useEffect } from 'react'
import { Download, ShieldCheck, Zap, Bell, Smartphone, X, Share, PlusSquare, Sparkles, CheckCircle2, ArrowDown } from 'lucide-react'
import { INSTITUTE_NAME } from '../lib/constants'

function safeGet(key) {
  try { return localStorage.getItem(key) } catch { return null }
}
function safeSet(key, val) {
  try { localStorage.setItem(key, val) } catch (err) { console.debug(err) }
}

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [installSuccess, setInstallSuccess] = useState(false)

  useEffect(() => {
    // 1. Check if app is already running in standalone mode (installed & opened from Home Screen/App Drawer)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')

    if (isStandalone || window.location.search.includes('no_pwa')) {
      setIsInstalled(true)
      safeSet('pwa_app_installed', 'true')
      return
    }

    if (safeGet('pwa_app_installed') === 'true') {
      setIsInstalled(true)
      return
    }

    if ('getInstalledRelatedApps' in navigator) {
      navigator.getInstalledRelatedApps().then(apps => {
        if (apps && apps.length > 0) {
          setIsInstalled(true)
          safeSet('pwa_app_installed', 'true')
        }
      }).catch(() => {})
    }

    // 2. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase()
    const iosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(iosDevice)

    // 3. Handle Chrome/Android/Edge beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)

      // Check if user previously snoozed the prompt (e.g. within last 7 days)
      const snoozeUntil = safeGet('pwa_install_snooze_until')
      if (snoozeUntil && Date.now() < parseInt(snoozeUntil, 10)) {
        return
      }

      // Show popup automatically after 1.5 seconds on mobile / browser load
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1500)

      return () => clearTimeout(timer)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 4. Handle appinstalled event (fired when user completes installation)
    const handleAppInstalled = () => {
      setIsInstalled(true)
      safeSet('pwa_app_installed', 'true')
      setInstallSuccess(true)
      setDeferredPrompt(null)
      setTimeout(() => {
        setIsOpen(false)
      }, 2500)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    // 5. Listen for custom trigger event (e.g. when user clicks "Install App" button in Navbar or Menu)
    const handleCustomOpen = () => {
      setIsOpen(true)
    }
    window.addEventListener('open-pwa-install-prompt', handleCustomOpen)

    // If iOS and not snoozed, auto-show iOS prompt after 2 seconds
    if (iosDevice && !isStandalone) {
      const snoozeUntil = safeGet('pwa_install_snooze_until')
      if (!snoozeUntil || Date.now() >= parseInt(snoozeUntil, 10)) {
        const timer = setTimeout(() => {
          setIsOpen(true)
        }, 2000)
        return () => clearTimeout(timer)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('open-pwa-install-prompt', handleCustomOpen)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIOS) return

      // Smooth fallback if browser delayed beforeinstallprompt
      setIsInstalling(true)
      setTimeout(() => {
        setIsInstalling(false)
        alert("App installer is ready! Tap Chrome menu (⋮) at top right and select 'Add to Home screen' or 'Install App'.")
      }, 500)
      return
    }

    setIsInstalling(true)
    try {
      // Trigger native 1-tap browser install dialog
      deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice

      if (choiceResult.outcome === 'accepted') {
        setInstallSuccess(true)
        safeSet('pwa_app_installed', 'true')
        setDeferredPrompt(null)
        setTimeout(() => setIsOpen(false), 2500)
      } else {
        // User canceled browser prompt, snooze for 2 days
        snoozePrompt(2)
      }
    } catch (err) {
      console.error('PWA install error:', err)
    } finally {
      setIsInstalling(false)
    }
  }

  const snoozePrompt = (days = 7) => {
    const expireTime = Date.now() + days * 24 * 60 * 60 * 1000
    safeSet('pwa_install_snooze_until', expireTime.toString())
    setIsOpen(false)
  }

  if (isInstalled || !isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in transition-all">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all animate-slide-up"
        style={{
          boxShadow: '0 25px 50px -12px rgba(17, 23, 85, 0.4), 0 0 0 1px rgba(245, 158, 11, 0.15)'
        }}
      >
        {/* Close Button */}
        <button
          onClick={() => snoozePrompt(3)}
          className="absolute top-3.5 right-3.5 z-10 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Gradient Top Header */}
        <div className="relative p-6 bg-gradient-to-br from-[#0b0f3d] via-[#111755] to-[#1e2985] text-white">
          <div className="flex items-center gap-4">
            {/* App Icon Container */}
            <div className="relative flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full rounded-[14px] bg-[#0b0f3d] flex items-center justify-center overflow-hidden">
                <img 
                  src="/icons/icon-192.png" 
                  alt={`${INSTITUTE_NAME} Icon`} 
                  className="w-12 h-12 object-contain"
                  onError={(e) => {
                    e.target.onerror = null
                    e.target.src = '/favicon.svg'
                  }}
                />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-[#0b0f3d]"></span>
              </span>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Free Mobile App
              </div>
              <h3 className="text-xl font-extrabold tracking-tight text-white font-display">
                {INSTITUTE_NAME}
              </h3>
              <p className="text-xs text-indigo-200/90 font-medium">
                Official Student &amp; Parent App
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {installSuccess ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">App Installed Successfully!</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {INSTITUTE_NAME} is now on your phone&apos;s <strong>Home Screen &amp; App Drawer</strong>.
              </p>
            </div>
          ) : (
            <>
              {/* Security Banner */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>🔒 100% Safe &amp; Secure • No Play Store download needed</span>
              </div>

              {/* Feature Highlights */}
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                      Superfast Speed &amp; Study Material
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Open live classes, study notes &amp; fees instantly on your phone.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                      Instant Class Alerts
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Get real-time alerts for live classes, homework &amp; announcements.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                      Full-Screen Mobile App
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Runs full screen like any Play Store app directly from your phone screen.
                    </p>
                  </div>
                </div>
              </div>

              {/* iOS Step-by-Step Instructions if on iPhone */}
              {isIOS ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-slate-800 dark:text-slate-200 text-xs space-y-2.5">
                  <p className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 text-sm">
                    <Share className="w-4 h-4 text-blue-500" /> To Install on iPhone / iPad:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300 font-medium text-xs">
                    <li>
                      Tap the <strong className="text-slate-900 dark:text-white">Share button</strong> ( <Share className="w-3.5 h-3.5 inline text-blue-500" /> ) at the bottom of Safari.
                    </li>
                    <li>
                      Scroll down and tap <strong className="text-slate-900 dark:text-white">Add to Home Screen</strong> ( <PlusSquare className="w-3.5 h-3.5 inline text-emerald-500" /> ).
                    </li>
                    <li>Open <strong>{INSTITUTE_NAME}</strong> from your home screen anytime!</li>
                  </ol>
                  <div className="pt-1 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xs animate-bounce gap-1">
                    <ArrowDown className="w-4 h-4" /> Tap Share button below <ArrowDown className="w-4 h-4" />
                  </div>
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2.5">
                {!isIOS && (
                  <button
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="relative w-full py-3.5 px-5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 active:scale-[0.98] shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-75 cursor-pointer"
                  >
                    <Download className="w-5 h-5 text-white group-hover:translate-y-0.5 transition-transform" />
                    <span>{isInstalling ? 'Installing App...' : 'Tap Here to Install App (Free)'}</span>
                  </button>
                )}

                {/* Browser Recommendation Tip */}
                <div className="text-center px-1">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed bg-slate-50 dark:bg-slate-800/60 py-2 px-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    💡 For easiest app installation &amp; best performance, please open this website in <strong>Google Chrome</strong> or <strong>Apple Safari</strong>.
                  </p>
                </div>

                <button
                  onClick={() => snoozePrompt(7)}
                  className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
