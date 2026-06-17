import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, GraduationCap, Lock, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { INSTITUTE_NAME } from '../lib/constants'
import LoadingSpinner from '../components/shared/LoadingSpinner'

// Landing page for the "reset password" email link.
// Supabase (detectSessionInUrl) establishes a recovery session from the
// URL fragment and fires a PASSWORD_RECOVERY auth event. We then let the
// user set a new password via supabase.auth.updateUser().
export default function ResetPassword() {
  const [ready,    setReady]    = useState(false)   // recovery session detected
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [done,     setDone]     = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true

    // If the recovery session is already present (or arrives via the URL),
    // we can proceed. onAuthStateChange catches the PASSWORD_RECOVERY event.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) { setReady(true); setChecking(false) }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' || session) { setReady(true) }
      setChecking(false)
    })

    // Stop the spinner even if no event ever arrives (expired/invalid link)
    const t = setTimeout(() => { if (active) setChecking(false) }, 2500)

    return () => { active = false; subscription.unsubscribe(); clearTimeout(t) }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setDone(true)
    toast.success('Password updated! Please log in.')
    await supabase.auth.signOut()
    setTimeout(() => navigate('/login'), 1500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-400 rounded-2xl mb-3 shadow-lg">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-display font-bold text-2xl text-white">{INSTITUTE_NAME}</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {checking ? (
            <div className="py-10 flex flex-col items-center gap-3">
              <LoadingSpinner />
              <p className="text-sm text-gray-500">Verifying your reset link…</p>
            </div>
          ) : done ? (
            <div className="py-6 text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="font-display font-bold text-xl text-navy-900">Password updated</h2>
              <p className="text-gray-500 text-sm mt-1">Redirecting you to login…</p>
            </div>
          ) : !ready ? (
            <div className="py-6 text-center">
              <h2 className="font-display font-bold text-xl text-navy-900 mb-2">Link expired or invalid</h2>
              <p className="text-gray-500 text-sm mb-6">
                This password reset link is no longer valid. Please request a new one from the login page.
              </p>
              <button onClick={() => navigate('/login')} className="btn-primary w-full">
                Back to login
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-display font-bold text-2xl text-navy-900">Set a new password</h2>
              <p className="text-gray-500 text-sm mt-1 mb-6">Choose a strong password you haven't used before.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="label-base">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="new-password"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                      className="input-base pl-10 pr-10"
                    />
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="confirm-password" className="label-base">Confirm Password</label>
                  <input
                    id="confirm-password"
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className="input-base"
                  />
                </div>
                <button type="submit" disabled={saving} className="btn-primary w-full">
                  {saving ? <LoadingSpinner size="sm" /> : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
