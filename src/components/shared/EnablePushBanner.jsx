import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { enablePush, pushSupported, pushConfigured, pushPermission } from '../../utils/push'

const DISMISS_KEY = 'push_banner_dismissed'

// A slim, dismissible prompt asking the user to turn on push alerts. It only
// appears when push is supported + configured and permission hasn't been
// decided yet. Tapping "Enable" subscribes the device so the user gets alerts
// even when the app is closed (and can open the PWA to check).
export default function EnablePushBanner() {
  const { user } = useAuth()
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) { setShow(false); return }
    const dismissed = localStorage.getItem(DISMISS_KEY) === '1'
    setShow(pushSupported() && pushConfigured() && pushPermission() === 'default' && !dismissed)
  }, [user])

  if (!show) return null

  const onEnable = async () => {
    setBusy(true)
    const res = await enablePush(user.id)
    setBusy(false)
    if (res === 'granted') {
      toast.success("Alerts on! You'll be notified even when the app is closed.")
      setShow(false)
    } else if (res === 'denied') {
      toast.error('Notifications are blocked. You can re-enable them in your browser settings.')
      localStorage.setItem(DISMISS_KEY, '1')
      setShow(false)
    } else {
      // 'default' (dismissed the prompt) / 'error' / 'unsupported' — hide quietly.
      setShow(false)
    }
  }

  const onDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setShow(false)
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <Bell className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-amber-900">Turn on alerts</p>
        <p className="text-xs text-amber-700">Get notified about messages, live classes and announcements even when the app is closed.</p>
      </div>
      <button
        onClick={onEnable}
        disabled={busy}
        className="flex-shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-60">
        {busy ? 'Enabling…' : 'Enable'}
      </button>
      <button onClick={onDismiss} className="flex-shrink-0 p-1 text-amber-500 hover:text-amber-700" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
