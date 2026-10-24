import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Eye, EyeOff, GraduationCap, Mail, Lock,
  ArrowRight, ArrowLeft, ShieldCheck, Video,
  BookOpen, MessageSquare, Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { INSTITUTE_NAME, INSTITUTE_TAGLINE } from '../lib/constants'
import LoadingSpinner from '../components/shared/LoadingSpinner'

export default function Login() {
  const { user, profile: authProfile, loading: authLoading, refreshProfile } = useAuth()
  const [email,         setEmail]         = useState('')
  const [password,      setPassword]      = useState('')
  const [showPw,        setShowPw]        = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [resetMode,     setResetMode]     = useState(false)
  const [resetEmail,    setResetEmail]    = useState('')
  const [resetLoading,  setResetLoading]  = useState(false)
  const [errors,        setErrors]        = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && user && authProfile?.role && authProfile?.is_active) {
      navigate(`/${authProfile.role}/dashboard`, { replace: true })
    }
  }, [user, authProfile, authLoading, navigate])

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

      await refreshProfile()
      toast.success('Welcome back!')
      navigate(`/${profile.role}/dashboard`, { replace: true })
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

  return (
    <div className="min-h-screen lg:h-screen flex flex-col lg:flex-row overflow-x-hidden">
      {/* ─── LEFT: Editorial Branding Canvas (Deep Charcoal & Spotlights) ─── */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-6 lg:p-8 xl:p-10 2xl:p-12 relative overflow-hidden text-white border-r border-white/10 shrink-0"
        style={{
          background: 'radial-gradient(ellipse 90% 70% at 20% 0%, rgba(99, 102, 241, 0.18) 0%, rgba(30, 27, 75, 0.14) 40%, transparent 75%), linear-gradient(180deg, #09090b 0%, #111115 50%, #09090b 100%)',
        }}
      >
        {/* Architectural Dot Matrix Texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.045]"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Ambient Spotlights */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold shadow-xs shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <span className="font-extrabold text-white text-sm tracking-tight block">
                {INSTITUTE_NAME}
              </span>
              <span className="text-[10px] text-[#a1a1aa] tracking-wide block">
                Center for Science &amp; Mathematics
              </span>
            </div>
          </Link>
        </div>

        {/* Hero Narrative */}
        <div className="relative z-10 max-w-md 2xl:max-w-lg my-auto py-3 lg:py-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-white text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase shadow-2xs backdrop-blur-md mb-2.5 sm:mb-3.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Student &amp; Faculty Portal</span>
          </div>

          <h1 className="font-extrabold text-2xl lg:text-3xl 2xl:text-4xl text-white tracking-tight leading-[1.15] mb-2.5">
            Your path to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-indigo-200 to-white">
              academic excellence
            </span>{' '}
            starts here.
          </h1>

          <p className="text-xs sm:text-sm text-[#a1a1aa] leading-relaxed mb-4 2xl:mb-6">
            <span className="font-serif italic text-indigo-300 font-normal">
              Empowering Concepts. Building Toppers.
            </span>{' '}
            {INSTITUTE_TAGLINE}
          </p>

          {/* Bento Feature Highlights */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            <div className="rounded-xl p-2.5 bg-white/[0.04] border border-white/10 backdrop-blur-md hover:border-indigo-400/40 hover:bg-white/[0.07] transition-all">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1.5">
                <Video className="w-3.5 h-3.5" />
              </div>
              <p className="text-white font-bold text-xs tracking-tight">Live</p>
              <p className="text-[10px] text-[#a1a1aa] mt-0.5 leading-tight">Daily Classes</p>
            </div>

            <div className="rounded-xl p-2.5 bg-white/[0.04] border border-white/10 backdrop-blur-md hover:border-indigo-400/40 hover:bg-white/[0.07] transition-all">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center mb-1.5">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <p className="text-white font-bold text-xs tracking-tight">Smart</p>
              <p className="text-[10px] text-[#a1a1aa] mt-0.5 leading-tight">Study Cards</p>
            </div>

            <div className="rounded-xl p-2.5 bg-white/[0.04] border border-white/10 backdrop-blur-md hover:border-indigo-400/40 hover:bg-white/[0.07] transition-all">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center mb-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <p className="text-white font-bold text-xs tracking-tight">Instant</p>
              <p className="text-[10px] text-[#a1a1aa] mt-0.5 leading-tight">1-on-1 Doubts</p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-[#a1a1aa] border-t border-white/10 pt-3">
          <span>© {new Date().getFullYear()} {INSTITUTE_NAME}</span>
          <Link to="/" className="inline-flex items-center gap-1.5 text-indigo-300 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Website
          </Link>
        </div>
      </div>

      {/* ─── RIGHT: Form Area (Signature Parchment #f7f4ed Canvas) ─── */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-6 xl:p-8 relative overflow-y-auto bg-[#f7f4ed]">
        {/* Architectural Dot Matrix Texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(#1c1c1c 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="w-full max-w-[380px] 2xl:max-w-[400px] relative z-10 py-3 sm:py-5">
          {/* Mobile Top Navigation */}
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1c1c1c] text-[#fcfbf8] flex items-center justify-center font-bold shadow-xs">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div>
                <span className="font-extrabold text-[#1c1c1c] text-xs block leading-tight">
                  {INSTITUTE_NAME}
                </span>
                <span className="text-[9px] text-[#5f5f5d] block leading-none">
                  Student Portal
                </span>
              </div>
            </Link>

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#d8d3c5] bg-white text-[11px] font-semibold text-[#1c1c1c] shadow-2xs hover:bg-[#fcfbf8] transition-colors"
            >
              <ArrowLeft className="w-3 h-3 text-[#5f5f5d]" />
              <span>Home</span>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {resetMode ? (
              /* ── Reset Password Card ── */
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#e2ddd1] p-5 sm:p-6 lg:p-6 shadow-[0_8px_30px_rgba(28,28,28,0.05),0_1px_2px_rgba(28,28,28,0.03)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-indigo-50 border border-indigo-200/80 text-indigo-950 shadow-2xs">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>Account Recovery</span>
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-extrabold text-[#1c1c1c] tracking-tight">
                  Reset Password
                </h2>
                <p className="text-[11px] sm:text-xs text-[#5f5f5d] mt-0.5 mb-3.5 sm:mb-4 leading-snug">
                  Enter your registered email address and we&apos;ll send you a secure password reset link.
                </p>

                <form onSubmit={handleReset} className="space-y-2.5 sm:space-y-3">
                  <div>
                    <label htmlFor="reset-email" className="block text-[10px] sm:text-[11px] font-bold text-[#1c1c1c] uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9ca3af]" />
                      <input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={e => setResetEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="w-full rounded-xl border border-[#d8d3c5] bg-[#fcfbf8] hover:border-[#1c1c1c]/40 pl-8.5 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm text-[#1c1c1c] placeholder:text-[#9ca3af] focus:bg-white focus:border-[#1c1c1c] focus:ring-1.5 focus:ring-[#1c1c1c]/10 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1c1c1c] hover:bg-[#2c2c2c] text-[#fcfbf8] font-semibold text-xs sm:text-sm transition-all duration-150 shadow-[inset_0px_0.5px_0px_rgba(255,255,255,0.25),inset_0px_0px_0px_0.5px_rgba(0,0,0,0.2),0px_3px_10px_rgba(0,0,0,0.1)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
                  >
                    {resetLoading ? <LoadingSpinner size="sm" /> : 'Send Reset Link'}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => setResetMode(false)}
                  className="mt-3.5 w-full text-center text-xs font-semibold text-[#5f5f5d] hover:text-[#1c1c1c] transition-colors inline-flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to login
                </button>
              </div>
            ) : (
              /* ── Main Login Card ── */
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#e2ddd1] p-5 sm:p-6 lg:p-6 shadow-[0_8px_30px_rgba(28,28,28,0.05),0_1px_2px_rgba(28,28,28,0.03)]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-indigo-50 border border-indigo-200/80 text-indigo-950 shadow-2xs">
                    <ShieldCheck className="w-3 h-3 text-indigo-600" />
                    <span>Verified Access</span>
                  </span>
                  <span className="text-[10px] text-[#5f5f5d] font-medium hidden sm:inline">
                    Secure 256-bit
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-extrabold text-[#1c1c1c] tracking-tight">
                  Welcome back
                </h2>
                <p className="text-[11px] sm:text-xs text-[#5f5f5d] mt-0.5 mb-3.5 sm:mb-4 leading-snug">
                  Log in to access your classes, study cards, and live batches.
                </p>

                <form onSubmit={handleLogin} className="space-y-2.5 sm:space-y-3">
                  <div>
                    <label htmlFor="email" className="block text-[10px] sm:text-[11px] font-bold text-[#1c1c1c] uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9ca3af]" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        autoComplete="email"
                        className={`w-full rounded-xl border ${
                          errors.email ? 'border-red-400 bg-red-50/20' : 'border-[#d8d3c5] bg-[#fcfbf8] hover:border-[#1c1c1c]/40'
                        } pl-8.5 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm text-[#1c1c1c] placeholder:text-[#9ca3af] focus:bg-white focus:border-[#1c1c1c] focus:ring-1.5 focus:ring-[#1c1c1c]/10 transition-all outline-none`}
                      />
                    </div>
                    {errors.email && <p className="mt-0.5 text-[11px] text-red-500 font-medium">{errors.email}</p>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="password" className="block text-[10px] sm:text-[11px] font-bold text-[#1c1c1c] uppercase tracking-wider">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setResetMode(true)}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9ca3af]" />
                      <input
                        id="password"
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Your password"
                        autoComplete="current-password"
                        className={`w-full rounded-xl border ${
                          errors.password ? 'border-red-400 bg-red-50/20' : 'border-[#d8d3c5] bg-[#fcfbf8] hover:border-[#1c1c1c]/40'
                        } pl-8.5 pr-8.5 py-1.5 sm:py-2 text-xs sm:text-sm text-[#1c1c1c] placeholder:text-[#9ca3af] focus:bg-white focus:border-[#1c1c1c] focus:ring-1.5 focus:ring-[#1c1c1c]/10 transition-all outline-none`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(s => !s)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#1c1c1c] transition-colors p-0.5"
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                      >
                        {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {errors.password && <p className="mt-0.5 text-[11px] text-red-500 font-medium">{errors.password}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1c1c1c] hover:bg-[#2c2c2c] text-[#fcfbf8] font-semibold text-xs sm:text-sm transition-all duration-150 shadow-[inset_0px_0.5px_0px_rgba(255,255,255,0.25),inset_0px_0px_0px_0.5px_rgba(0,0,0,0.2),0px_3px_10px_rgba(0,0,0,0.1)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer mt-2"
                  >
                    {loading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <span>Log In</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#fcfbf8]/60 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-3.5 sm:mt-4 pt-3 sm:pt-3.5 border-t border-[#e2ddd1] text-center">
                  <p className="text-xs text-[#5f5f5d]">
                    Don&apos;t have an account?{' '}
                    <Link to="/register" className="font-bold text-indigo-700 hover:text-indigo-900 transition-colors">
                      Register now →
                    </Link>
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Mobile Micro-Trust Tiles */}
          <div className="grid grid-cols-3 gap-2 mt-4 lg:hidden">
            <div className="p-2 rounded-xl bg-white/80 border border-[#e2ddd1] text-center shadow-2xs">
              <Video className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-[#1c1c1c]">Live Classes</p>
            </div>
            <div className="p-2 rounded-xl bg-white/80 border border-[#e2ddd1] text-center shadow-2xs">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-[#1c1c1c]">Smart Notes</p>
            </div>
            <div className="p-2 rounded-xl bg-white/80 border border-[#e2ddd1] text-center shadow-2xs">
              <MessageSquare className="w-3.5 h-3.5 text-purple-600 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-[#1c1c1c]">1-on-1 Doubts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
