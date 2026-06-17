import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, GraduationCap, Mail, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { INSTITUTE_NAME, INSTITUTE_TAGLINE } from '../lib/constants'
import LoadingSpinner from '../components/shared/LoadingSpinner'

export default function Login() {
  const [email,         setEmail]         = useState('')
  const [password,      setPassword]      = useState('')
  const [showPw,        setShowPw]        = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [resetMode,     setResetMode]     = useState(false)
  const [resetEmail,    setResetEmail]    = useState('')
  const [resetLoading,  setResetLoading]  = useState(false)
  const [errors,        setErrors]        = useState({})
  const navigate = useNavigate()

  // ---- Login submit ----------------------------------------
  const handleLogin = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!email.trim())    errs.email    = 'Email is required'
    if (!password)        errs.password = 'Password is required'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email:    email.trim().toLowerCase(),
        password,
      })
      if (error) throw error

      // Fetch profile to get role
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileErr) throw profileErr
      if (!profile) {
        // Auth succeeded but no profile row exists — treat as incomplete account
        await supabase.auth.signOut()
        toast.error('Your account setup is incomplete. Please contact the institute.')
        return
      }
      if (!profile.is_active) {
        await supabase.auth.signOut()
        navigate('/account-suspended')
        return
      }

      toast.success('Welcome back!')
      navigate(`/${profile.role}/dashboard`)
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('Invalid login credentials')) {
        toast.error('Incorrect email or password.')
      } else if (msg.includes('Email not confirmed')) {
        toast.error('Please confirm your email first. Check your inbox.')
      } else {
        toast.error(msg || 'Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ---- Password reset --------------------------------------
  const handleReset = async (e) => {
    e.preventDefault()
    if (!resetEmail.trim()) {
      toast.error('Enter your email address.')
      return
    }
    setResetLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(
      resetEmail.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` }
    )
    setResetLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password reset link sent! Check your inbox.', { duration: 5000 })
      setResetMode(false)
    }
  }

  // ---- Render ---------------------------------------------
  return (
    <div className="min-h-screen flex">
      {/* Left — branding panel (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-navy-900 via-navy-800 to-indigo-900 p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-16 w-96 h-96 rounded-full bg-brand-400/10" />
        <div className="absolute top-1/2 right-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-400 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-bold text-white text-lg">{INSTITUTE_NAME}</span>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="font-display font-bold text-4xl text-white leading-tight mb-4">
            Your path to<br />
            <span className="text-brand-400">academic excellence</span><br />
            starts here.
          </h2>
          <p className="text-navy-200 text-lg">{INSTITUTE_TAGLINE}</p>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { label: 'Students', value: '40K+' },
              { label: 'Teachers', value: '100+' },
              { label: 'Batches',  value: '50+'  },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
                <p className="font-display font-bold text-2xl text-white">{s.value}</p>
                <p className="text-navy-200 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-navy-300 text-sm">
          © {new Date().getFullYear()} {INSTITUTE_NAME}
        </p>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-navy-800 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-bold text-navy-900">{INSTITUTE_NAME}</span>
          </div>

          {resetMode ? (
            // ---- Forgot password form ----
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="font-display font-bold text-2xl text-navy-900">Reset Password</h2>
              <p className="text-gray-500 text-sm mt-1 mb-6">
                Enter your email and we'll send a reset link.
              </p>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="label-base">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="input-base pl-10"
                    />
                  </div>
                </div>
                <button type="submit" disabled={resetLoading} className="btn-primary w-full">
                  {resetLoading ? <LoadingSpinner size="sm" /> : 'Send Reset Link'}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setResetMode(false)}
                className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700"
              >
                ← Back to login
              </button>
            </div>
          ) : (
            // ---- Main login form ----
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="font-display font-bold text-2xl text-navy-900">Welcome back</h2>
              <p className="text-gray-500 text-sm mt-1 mb-6">
                Log in to your account to continue.
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="label-base">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      autoComplete="email"
                      className={`input-base pl-10 ${errors.email ? 'border-red-400' : ''}`}
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="label-base mb-0">Password</label>
                    <button
                      type="button"
                      onClick={() => setResetMode(true)}
                      className="text-xs text-navy-700 hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Your password"
                      autoComplete="current-password"
                      className={`input-base pl-10 pr-10 ${errors.password ? 'border-red-400' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <LoadingSpinner size="sm" /> : 'Log In'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Don't have an account?{' '}
                <Link to="/register" className="font-semibold text-navy-800 hover:underline">
                  Register now
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
