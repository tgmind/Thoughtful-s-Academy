import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Eye, EyeOff, ArrowRight, ArrowLeft,
  ShieldCheck, Video, BookOpen, MessageSquare, Sparkles,
  User, Mail, Phone, Lock, Calendar, Check
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { INSTITUTE_NAME, INSTITUTE_TAGLINE } from '../lib/constants'
import LoadingSpinner from '../components/shared/LoadingSpinner'

function passwordStrength(pw) {
  let score = 0
  if (pw.length >= 8)           score++
  if (/[A-Z]/.test(pw))        score++
  if (/[0-9]/.test(pw))        score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}

const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong']
const strengthColors = ['', 'bg-red-500', 'bg-amber-500', 'bg-indigo-400', 'bg-emerald-500']

const INITIAL_FORM = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  confirm_password: '',
  batch_id: '',
  subjects: [],
  parent_phone: '',
  date_of_birth: '',
}

export default function Register() {
  const [searchParams]        = useSearchParams()
  const initialBatchId        = searchParams.get('batch') || searchParams.get('id')
  const [step,          setStep]          = useState(1)
  const [batches,       setBatches]       = useState([])
  const [batchSubjects, setBatchSubjects] = useState([])
  const [form,          setForm]          = useState(INITIAL_FORM)
  const [errors,        setErrors]        = useState({})
  const [loading,       setLoading]       = useState(false)
  const [showPw,        setShowPw]        = useState(false)
  const [dir,           setDir]           = useState(1)
  const navigate = useNavigate()

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const toggleSubject = (sub) => {
    setForm(f => {
      const current = Array.isArray(f.subjects) ? f.subjects : []
      const already = current.includes(sub)
      return { ...f, subjects: already ? current.filter(s => s !== sub) : [...current, sub] }
    })
  }

  useEffect(() => {
    let cancelled = false
    supabase
      .from('batches')
      .select('id, name, subjects')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (cancelled) return
        const list = data ?? []
        setBatches(list)
        if (initialBatchId) {
          const found = list.find(b => b.id === initialBatchId)
          if (found) {
            const subs = Array.isArray(found.subjects) ? found.subjects : []
            setBatchSubjects(subs)
            setForm(f => ({ ...f, batch_id: found.id, subjects: subs }))
          }
        }
      })
    return () => { cancelled = true }
  }, [initialBatchId])

  const handleBatchChange = (batchId) => {
    const selected = batches.find(b => b.id === batchId)
    const subs = Array.isArray(selected?.subjects) ? selected.subjects : []
    setBatchSubjects(subs)
    setForm(f => ({
      ...f,
      batch_id: batchId,
      subjects: subs,
    }))
  }

  const validateStep1 = () => {
    const e = {}
    if (!form.full_name?.trim())                 e.full_name         = 'Full name is required'
    if (!form.email?.trim())                     e.email             = 'Email address is required'
    else if (!/\S+@\S+\.\S+/.test(form.email))   e.email             = 'Enter a valid email address'
    if (!form.password)                          e.password          = 'Password is required'
    else if (form.password.length < 8)          e.password          = 'Password must be at least 8 characters'
    if (form.password !== form.confirm_password) e.confirm_password  = 'Passwords do not match'
    return e
  }

  const goNext = () => {
    const errs = validateStep1()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setErrors({})
    setDir(1)
    setStep(2)
  }

  const goBack = () => {
    setDir(-1)
    setStep(1)
  }

  const handleRegister = async (e) => {
    e?.preventDefault()
    const step1Errs = validateStep1()
    if (Object.keys(step1Errs).length) {
      setErrors(step1Errs)
      setStep(1)
      return
    }

    setLoading(true)
    try {
      const email = form.email.trim().toLowerCase()
      // Enforce strictly 'student' role for public signups
      const { data: authData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          data: {
            role:          'student',
            full_name:     form.full_name.trim(),
            phone:         form.phone.trim() || null,
            batch_id:      form.batch_id || null,
            parent_phone:  form.parent_phone || null,
            date_of_birth: form.date_of_birth || null,
            subjects:      form.subjects || [],
          },
        },
      })
      if (signUpErr) throw signUpErr

      const uid = authData.user?.id
      if (!uid) throw new Error('Registration failed — please try again.')

      if (authData.session) {
        // Upsert base student profile
        await supabase.from('profiles').upsert({
          id: uid,
          full_name: form.full_name.trim(),
          email,
          phone: form.phone.trim() || null,
          role: 'student',
        }, { onConflict: 'id', ignoreDuplicates: true })

        // Initialize student metadata and trial period (2 days)
        const trialEndsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        await supabase.from('student_profiles').upsert({
          id:            uid,
          batch_id:      form.batch_id    || null,
          parent_phone:  form.parent_phone || null,
          date_of_birth: form.date_of_birth || null,
          subjects:      Array.isArray(form.subjects) && form.subjects.length > 0 ? form.subjects : [],
          trial_ends_at: trialEndsAt,
        }, { onConflict: 'id' })

        // Notification for admin review
        let batchLabel = ''
        if (form.batch_id) {
          const { data: bData } = await supabase.from('batches').select('name').eq('id', form.batch_id).maybeSingle()
          batchLabel = bData?.name ? ` for ${bData.name}` : ''
        }

        await supabase.from('notifications').insert({
          title: `New student joined: ${form.full_name.trim()}`,
          body:  `${form.full_name.trim()} has self-registered${batchLabel}. Free trial ends in 2 days. Please review and confirm enrollment.`,
          type:  'announcement',
          target_role: 'all',
          is_active: true,
        })
      }

      toast.success('Account created successfully! Admin will be notified.', { duration: 5000 })
      navigate('/login')
    } catch (err) {
      const msg = err.message || 'Registration failed'
      if (msg.includes('already registered')) {
        toast.error('This email is already registered. Try logging in.')
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const pwStrength = passwordStrength(form.password || '')
  const today = new Date().toISOString().split('T')[0]

  const slideVariants = {
    enter: (d) => ({ x: d > 0 ? 30 : -30, opacity: 0 }),
    center:       ()  => ({ x: 0, opacity: 1 }),
    exit:  (d) => ({ x: d > 0 ? -30 : 30, opacity: 0 }),
  }

  return (
    <div className="min-h-screen lg:h-screen flex flex-col lg:flex-row overflow-x-hidden">
      {/* ─── LEFT: Editorial Branding Canvas (Deep Charcoal & Spotlights) ─── */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-8 lg:p-10 xl:p-12 2xl:p-14 relative overflow-hidden text-white border-r border-white/10 shrink-0"
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold shadow-xs shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight block">
                {INSTITUTE_NAME}
              </span>
              <span className="text-[11px] text-[#a1a1aa] tracking-wide block">
                Center for Science &amp; Mathematics
              </span>
            </div>
          </Link>
        </div>

        {/* Narrative Section */}
        <div className="relative z-10 max-w-lg my-auto py-4 lg:py-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white text-xs font-semibold tracking-wide uppercase shadow-2xs backdrop-blur-md mb-3 sm:mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Admissions Open 2025–26</span>
          </div>

          <h1 className="font-extrabold text-3xl lg:text-4xl 2xl:text-[44px] text-white tracking-tight leading-[1.15] mb-3">
            Join the rank of{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-indigo-200 to-white">
              future toppers.
            </span>
          </h1>

          <p className="text-sm xl:text-base text-[#a1a1aa] leading-relaxed mb-6">
            <span className="font-serif italic text-indigo-300 font-normal">
              Empowering Concepts. Building Toppers.
            </span>{' '}
            Register in seconds and unlock a 2-day complimentary trial with daily live lectures, curated DPPs, and 1-on-1 mentorship.
          </p>

          {/* Bento Feature Highlights */}
          <div className="grid grid-cols-3 gap-3 mb-4 sm:mb-5">
            <div className="rounded-xl p-3 bg-white/[0.04] border border-white/10 backdrop-blur-md hover:border-indigo-400/40 hover:bg-white/[0.07] transition-all">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                <Video className="w-4 h-4" />
              </div>
              <p className="text-white font-bold text-sm tracking-tight">Live</p>
              <p className="text-[11px] text-[#a1a1aa] mt-0.5 leading-tight">Daily Interactive</p>
            </div>

            <div className="rounded-xl p-3 bg-white/[0.04] border border-white/10 backdrop-blur-md hover:border-indigo-400/40 hover:bg-white/[0.07] transition-all">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center mb-2">
                <BookOpen className="w-4 h-4" />
              </div>
              <p className="text-white font-bold text-sm tracking-tight">Curated</p>
              <p className="text-[11px] text-[#a1a1aa] mt-0.5 leading-tight">DPPs &amp; Notes</p>
            </div>

            <div className="rounded-xl p-3 bg-white/[0.04] border border-white/10 backdrop-blur-md hover:border-indigo-400/40 hover:bg-white/[0.07] transition-all">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center mb-2">
                <MessageSquare className="w-4 h-4" />
              </div>
              <p className="text-white font-bold text-sm tracking-tight">Direct</p>
              <p className="text-[11px] text-[#a1a1aa] mt-0.5 leading-tight">1-on-1 Mentorship</p>
            </div>
          </div>

          {/* Complimentary Trial Callout */}
          <div className="rounded-xl p-3.5 bg-white/[0.04] border border-white/10 backdrop-blur-md flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-300" />
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-tight">
                2-Day Complimentary Trial
              </p>
              <p className="text-[11px] text-[#a1a1aa] leading-tight">
                Instant enrollment for full course materials. No credit card required.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-[#a1a1aa] border-t border-white/10 pt-4">
          <span>© {new Date().getFullYear()} {INSTITUTE_NAME}</span>
          <Link to="/" className="inline-flex items-center gap-1.5 text-indigo-300 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Website
          </Link>
        </div>
      </div>

      {/* ─── RIGHT: Registration Form (Signature Parchment #f7f4ed Canvas) ─── */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-7 lg:p-8 relative overflow-y-auto bg-[#f7f4ed] min-h-screen lg:min-h-0 lg:h-screen">
        {/* Architectural Dot Matrix Texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(#1c1c1c 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="w-full max-w-[465px] 2xl:max-w-[480px] relative z-10 py-5 sm:py-7">
          {/* Mobile Top Navigation */}
          <div className="flex items-center justify-between mb-5 lg:hidden">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1c1c1c] text-[#fcfbf8] flex items-center justify-center font-bold shadow-xs">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div>
                <span className="font-extrabold text-[#1c1c1c] text-sm block leading-tight">
                  {INSTITUTE_NAME}
                </span>
                <span className="text-[10px] text-[#5f5f5d] block leading-none">
                  Student Portal
                </span>
              </div>
            </Link>

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#d8d3c5] bg-white text-xs font-semibold text-[#1c1c1c] shadow-2xs hover:bg-[#fcfbf8] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#5f5f5d]" />
              <span>Home</span>
            </Link>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-3xl border border-[#e2ddd1] p-6 sm:p-7 lg:p-8 shadow-[0_12px_36px_rgba(28,28,28,0.06),0_1px_2px_rgba(28,28,28,0.04)]">
            
            {/* Step Progression Pills */}
            <div className="flex items-center p-1 rounded-xl bg-[#f7f4ed] border border-[#e2ddd1] mb-5 sm:mb-6">
              <button
                type="button"
                onClick={() => step === 2 && goBack()}
                className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  step === 1
                    ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-xs'
                    : 'text-[#5f5f5d] hover:text-[#1c1c1c]'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                  step === 1 ? 'bg-white/20 text-white' : 'bg-[#e2ddd1] text-[#1c1c1c]'
                }`}>
                  1
                </span>
                <span>Account Info</span>
              </button>

              <button
                type="button"
                onClick={() => step === 1 && goNext()}
                className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  step === 2
                    ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-xs'
                    : 'text-[#5f5f5d] hover:text-[#1c1c1c]'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                  step === 2 ? 'bg-white/20 text-white' : 'bg-[#e2ddd1] text-[#1c1c1c]'
                }`}>
                  2
                </span>
                <span>Batch &amp; Course</span>
              </button>
            </div>

            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: 'easeInOut' }}
              >
                {step === 1 ? (
                  /* ─── STEP 1: Account Info ─── */
                  <form onSubmit={(e) => { e.preventDefault(); goNext() }} className="space-y-3.5 sm:space-y-4">
                    <div className="mb-3 sm:mb-4">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-indigo-50 border border-indigo-200/80 text-indigo-950 shadow-2xs">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Student Enrollment</span>
                        </span>
                        <span className="text-xs text-[#5f5f5d] font-medium">
                          Step 1 of 2
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-[#1c1c1c] tracking-tight">
                        Student Registration
                      </h2>
                      <p className="text-xs sm:text-sm text-[#5f5f5d] mt-1 leading-relaxed">
                        Create your account to start learning and access your batches.
                      </p>
                    </div>

                    {/* Full Name */}
                    <div>
                      <label htmlFor="full_name" className="block text-xs font-bold text-[#1c1c1c] uppercase tracking-wider mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af] pointer-events-none" />
                        <input
                          id="full_name"
                          name="full_name"
                          type="text"
                          value={form.full_name}
                          onChange={e => set('full_name', e.target.value)}
                          placeholder="Ravi Kumar"
                          className={`w-full rounded-xl border ${
                            errors.full_name ? 'border-red-400 bg-red-50/20' : 'border-[#d8d3c5] bg-[#fcfbf8] hover:border-[#1c1c1c]/40'
                          } pl-10 pr-3.5 py-2.5 text-sm text-[#1c1c1c] placeholder:text-[#9ca3af] focus:bg-white focus:border-[#1c1c1c] focus:ring-2 focus:ring-[#1c1c1c]/10 transition-all outline-none`}
                        />
                      </div>
                      {errors.full_name && <p className="mt-1 text-xs text-red-500 font-medium">{errors.full_name}</p>}
                    </div>

                    {/* Email Address */}
                    <div>
                      <label htmlFor="email" className="block text-xs font-bold text-[#1c1c1c] uppercase tracking-wider mb-1.5">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af] pointer-events-none" />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={e => set('email', e.target.value)}
                          placeholder="you@email.com"
                          autoComplete="email"
                          className={`w-full rounded-xl border ${
                            errors.email ? 'border-red-400 bg-red-50/20' : 'border-[#d8d3c5] bg-[#fcfbf8] hover:border-[#1c1c1c]/40'
                          } pl-10 pr-3.5 py-2.5 text-sm text-[#1c1c1c] placeholder:text-[#9ca3af] focus:bg-white focus:border-[#1c1c1c] focus:ring-2 focus:ring-[#1c1c1c]/10 transition-all outline-none`}
                        />
                      </div>
                      {errors.email && <p className="mt-1 text-xs text-red-500 font-medium">{errors.email}</p>}
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label htmlFor="phone" className="block text-xs font-bold text-[#1c1c1c] uppercase tracking-wider mb-1.5">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af] pointer-events-none" />
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={form.phone}
                          onChange={e => set('phone', e.target.value)}
                          placeholder="+91 9876543210"
                          className="w-full rounded-xl border border-[#d8d3c5] bg-[#fcfbf8] hover:border-[#1c1c1c]/40 pl-10 pr-3.5 py-2.5 text-sm text-[#1c1c1c] placeholder:text-[#9ca3af] focus:bg-white focus:border-[#1c1c1c] focus:ring-2 focus:ring-[#1c1c1c]/10 transition-all outline-none"
                        />
                      </div>
                      {errors.phone && <p className="mt-1 text-xs text-red-500 font-medium">{errors.phone}</p>}
                    </div>

                    {/* Password */}
                    <div>
                      <label htmlFor="password" className="block text-xs font-bold text-[#1c1c1c] uppercase tracking-wider mb-1.5">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af] pointer-events-none" />
                        <input
                          id="password"
                          name="password"
                          type={showPw ? 'text' : 'password'}
                          value={form.password || ''}
                          onChange={e => set('password', e.target.value)}
                          placeholder="Min. 8 characters"
                          autoComplete="new-password"
                          className={`w-full rounded-xl border ${
                            errors.password ? 'border-red-400 bg-red-50/20' : 'border-[#d8d3c5] bg-[#fcfbf8] hover:border-[#1c1c1c]/40'
                          } pl-10 pr-10 py-2.5 text-sm text-[#1c1c1c] placeholder:text-[#9ca3af] focus:bg-white focus:border-[#1c1c1c] focus:ring-2 focus:ring-[#1c1c1c]/10 transition-all outline-none`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(s => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#1c1c1c] transition-colors p-1"
                          aria-label={showPw ? 'Hide password' : 'Show password'}
                        >
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      {form.password && (
                        <div className="mt-2 space-y-1">
                          <div className="flex gap-1.5">
                            {[1, 2, 3, 4].map(i => (
                              <div
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-colors ${
                                  i <= pwStrength ? strengthColors[pwStrength] : 'bg-[#e2ddd1]'
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-[#5f5f5d]">
                            Strength: <span className="font-semibold text-[#1c1c1c]">{strengthLabels[pwStrength]}</span>
                          </p>
                        </div>
                      )}
                      {errors.password && <p className="mt-1 text-xs text-red-500 font-medium">{errors.password}</p>}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label htmlFor="confirm_password" className="block text-xs font-bold text-[#1c1c1c] uppercase tracking-wider mb-1.5">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af] pointer-events-none" />
                        <input
                          id="confirm_password"
                          name="confirm_password"
                          type={showPw ? 'text' : 'password'}
                          value={form.confirm_password || ''}
                          onChange={e => set('confirm_password', e.target.value)}
                          placeholder="Re-enter your password"
                          autoComplete="new-password"
                          className={`w-full rounded-xl border ${
                            errors.confirm_password ? 'border-red-400 bg-red-50/20' : 'border-[#d8d3c5] bg-[#fcfbf8] hover:border-[#1c1c1c]/40'
                          } pl-10 pr-3.5 py-2.5 text-sm text-[#1c1c1c] placeholder:text-[#9ca3af] focus:bg-white focus:border-[#1c1c1c] focus:ring-2 focus:ring-[#1c1c1c]/10 transition-all outline-none`}
                        />
                      </div>
                      {errors.confirm_password && <p className="mt-1 text-xs text-red-500 font-medium">{errors.confirm_password}</p>}
                    </div>

                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#1c1c1c] hover:bg-[#2c2c2c] text-[#fcfbf8] font-semibold text-sm transition-all duration-150 shadow-[inset_0px_0.5px_0px_rgba(255,255,255,0.25),inset_0px_0px_0px_0.5px_rgba(0,0,0,0.2),0px_4px_12px_rgba(0,0,0,0.12)] active:scale-[0.98] group cursor-pointer mt-4"
                    >
                      <span>Continue to Batch Details</span>
                      <ArrowRight className="w-4 h-4 text-[#fcfbf8]/60 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </form>
                ) : (
                  /* ─── STEP 2: Batch & Enrollment ─── */
                  <form onSubmit={handleRegister} className="space-y-3.5 sm:space-y-4">
                    <button
                      type="button"
                      onClick={goBack}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5f5f5d] hover:text-[#1c1c1c] transition-colors mb-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Account Info
                    </button>

                    <div className="mb-3 sm:mb-4">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-indigo-50 border border-indigo-200/80 text-indigo-950 shadow-2xs">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Course Selection</span>
                        </span>
                        <span className="text-xs text-[#5f5f5d] font-medium">
                          Step 2 of 2
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-[#1c1c1c] tracking-tight">
                        Batch &amp; Enrollment
                      </h2>
                      <p className="text-xs sm:text-sm text-[#5f5f5d] mt-1 leading-relaxed">
                        Select your class cohort and the subjects you want to prepare for.
                      </p>
                    </div>

                    {/* Batch Selection */}
                    <div>
                      <label htmlFor="batch_id" className="block text-xs font-bold text-[#1c1c1c] uppercase tracking-wider mb-1.5">
                        Target Batch / Cohort
                      </label>
                      <div className="relative">
                        <select
                          id="batch_id"
                          value={form.batch_id || ''}
                          onChange={e => handleBatchChange(e.target.value)}
                          className="w-full rounded-xl border border-[#d8d3c5] bg-[#fcfbf8] hover:border-[#1c1c1c]/40 px-3.5 py-2.5 text-sm text-[#1c1c1c] focus:bg-white focus:border-[#1c1c1c] focus:ring-2 focus:ring-[#1c1c1c]/10 transition-all outline-none font-medium cursor-pointer"
                        >
                          <option value="">Select your batch…</option>
                          {batches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Subject Pills */}
                    {batchSubjects.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-[#f7f4ed] border border-[#e2ddd1]">
                        <label className="block text-xs font-bold text-[#1c1c1c] uppercase tracking-wider mb-2">
                          Available Subjects
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {batchSubjects.map(sub => {
                            const chosen = (form.subjects || []).includes(sub)
                            return (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => toggleSubject(sub)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                                  chosen
                                    ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-xs'
                                    : 'bg-white border border-[#d8d3c5] text-[#5f5f5d] hover:border-[#1c1c1c]'
                                }`}
                              >
                                {chosen && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                                <span>{sub}</span>
                              </button>
                            )
                          })}
                        </div>
                        <p className="mt-2 text-xs text-[#5f5f5d]">
                          Select subjects you will study in this cohort (all enabled by default).
                        </p>
                      </div>
                    )}

                    {/* Parent's Phone */}
                    <div>
                      <label htmlFor="parent_phone" className="block text-xs font-bold text-[#1c1c1c] uppercase tracking-wider mb-1.5">
                        Parent&apos;s Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af] pointer-events-none" />
                        <input
                          id="parent_phone"
                          name="parent_phone"
                          type="tel"
                          value={form.parent_phone}
                          onChange={e => set('parent_phone', e.target.value)}
                          placeholder="+91 9876543210"
                          className="w-full rounded-xl border border-[#d8d3c5] bg-[#fcfbf8] hover:border-[#1c1c1c]/40 pl-10 pr-3.5 py-2.5 text-sm text-[#1c1c1c] placeholder:text-[#9ca3af] focus:bg-white focus:border-[#1c1c1c] focus:ring-2 focus:ring-[#1c1c1c]/10 transition-all outline-none"
                        />
                      </div>
                      {errors.parent_phone && <p className="mt-1 text-xs text-red-500 font-medium">{errors.parent_phone}</p>}
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label htmlFor="date_of_birth" className="block text-xs font-bold text-[#1c1c1c] uppercase tracking-wider mb-1.5">
                        Date of Birth
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af] pointer-events-none" />
                        <input
                          id="date_of_birth"
                          name="date_of_birth"
                          type="date"
                          max={today}
                          value={form.date_of_birth}
                          onChange={e => set('date_of_birth', e.target.value)}
                          className="w-full rounded-xl border border-[#d8d3c5] bg-[#fcfbf8] hover:border-[#1c1c1c]/40 pl-10 pr-3.5 py-2.5 text-sm text-[#1c1c1c] focus:bg-white focus:border-[#1c1c1c] focus:ring-2 focus:ring-[#1c1c1c]/10 transition-all outline-none"
                        />
                      </div>
                      {errors.date_of_birth && <p className="mt-1 text-xs text-red-500 font-medium">{errors.date_of_birth}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#1c1c1c] hover:bg-[#2c2c2c] text-[#fcfbf8] font-semibold text-sm transition-all duration-150 shadow-[inset_0px_0.5px_0px_rgba(255,255,255,0.25),inset_0px_0px_0px_0.5px_rgba(0,0,0,0.2),0px_4px_12px_rgba(0,0,0,0.12)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer mt-4"
                    >
                      {loading ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-indigo-300" />
                          <span>Complete Registration</span>
                          <ArrowRight className="w-4 h-4 text-[#fcfbf8]/60 group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Card Footer */}
            <div className="mt-5 pt-4 border-t border-[#e2ddd1] text-center space-y-1.5">
              <p className="text-[11px] text-[#5f5f5d]">
                Faculty or staff account? Teacher credentials are provided directly by administration.
              </p>
              <p className="text-xs sm:text-sm text-[#5f5f5d]">
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-indigo-700 hover:text-indigo-900 transition-colors">
                  Log in →
                </Link>
              </p>
            </div>
          </div>

          {/* Mobile Micro-Trust Tiles */}
          <div className="grid grid-cols-3 gap-2 mt-5 lg:hidden">
            <div className="p-2.5 rounded-xl bg-white/80 border border-[#e2ddd1] text-center shadow-2xs">
              <Video className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-1" />
              <p className="text-[11px] font-bold text-[#1c1c1c]">Live Classes</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 border border-[#e2ddd1] text-center shadow-2xs">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600 mx-auto mb-1" />
              <p className="text-[11px] font-bold text-[#1c1c1c]">Curated DPPs</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 border border-[#e2ddd1] text-center shadow-2xs">
              <MessageSquare className="w-3.5 h-3.5 text-purple-600 mx-auto mb-1" />
              <p className="text-[11px] font-bold text-[#1c1c1c]">1-on-1 Doubts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
