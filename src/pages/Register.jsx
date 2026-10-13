import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, Eye, EyeOff, ChevronRight, ChevronLeft } from 'lucide-react'
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
const strengthColors = ['', 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-green-500']

function Field({ name, label, type = 'text', placeholder, required, value, error, onChange, ...rest }) {
  return (
    <div>
      <label htmlFor={name} className="label-base">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        className={`input-base ${error ? 'border-red-400 focus:ring-red-400' : ''}`}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

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
    if (!form.full_name?.trim())         e.full_name         = 'Name is required'
    if (!form.email?.trim())             e.email             = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email     = 'Invalid email'
    if (!form.password)                 e.password          = 'Password is required'
    else if (form.password.length < 8)  e.password          = 'At least 8 characters'
    if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match'
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
    enter: (d) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center:       ()  => ({ x: 0, opacity: 1 }),
    exit:  (d) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-400 rounded-2xl mb-3 shadow-lg">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-display font-bold text-2xl text-white">{INSTITUTE_NAME}</h1>
          <p className="text-navy-200 text-sm mt-1">{INSTITUTE_TAGLINE}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex border-b border-gray-100">
            {['Account Info', 'Batch & Enrollment'].map((label, idx) => (
              <div
                key={label}
                className={`flex-1 py-3 text-center text-sm font-medium transition-colors
                  ${step === idx + 1 ? 'text-navy-900 border-b-2 border-navy-800' : 'text-gray-400'}`}
              >
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs mr-1.5
                  ${step === idx + 1 ? 'bg-navy-800 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {idx + 1}
                </span>
                {label}
              </div>
            ))}
          </div>

          <div className="p-6 overflow-hidden">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                {step === 1 ? (
                  <form onSubmit={(e) => { e.preventDefault(); goNext() }} className="space-y-4">
                    <div className="mb-2">
                      <h2 className="font-display font-bold text-xl text-navy-900">Student Registration</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Create your account to start learning</p>
                    </div>

                    <Field
                      name="full_name"
                      label="Full Name"
                      placeholder="Ravi Kumar"
                      required
                      value={form.full_name}
                      error={errors.full_name}
                      onChange={e => set('full_name', e.target.value)}
                    />
                    <Field
                      name="email"
                      label="Email"
                      type="email"
                      placeholder="you@email.com"
                      required
                      value={form.email}
                      error={errors.email}
                      onChange={e => set('email', e.target.value)}
                    />
                    <Field
                      name="phone"
                      label="Phone Number"
                      placeholder="+91 9876543210"
                      value={form.phone}
                      error={errors.phone}
                      onChange={e => set('phone', e.target.value)}
                    />

                    <div>
                      <label htmlFor="password" className="label-base">
                        Password<span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPw ? 'text' : 'password'}
                          value={form.password || ''}
                          onChange={e => set('password', e.target.value)}
                          placeholder="Min. 8 characters"
                          className={`input-base pr-10 ${errors.password ? 'border-red-400' : ''}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(s => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {form.password && (
                        <div className="mt-1.5 flex gap-1">
                          {[1,2,3,4].map(i => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-colors ${i <= pwStrength ? strengthColors[pwStrength] : 'bg-gray-200'}`}
                            />
                          ))}
                          <span className="text-xs text-gray-500 ml-1">{strengthLabels[pwStrength]}</span>
                        </div>
                      )}
                      {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                    </div>

                    <div>
                      <label htmlFor="confirm_password" className="label-base">
                        Confirm Password<span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <input
                        id="confirm_password"
                        type={showPw ? 'text' : 'password'}
                        value={form.confirm_password || ''}
                        onChange={e => set('confirm_password', e.target.value)}
                        placeholder="Re-enter password"
                        className={`input-base ${errors.confirm_password ? 'border-red-400' : ''}`}
                      />
                      {errors.confirm_password && <p className="mt-1 text-xs text-red-500">{errors.confirm_password}</p>}
                    </div>

                    <button
                      type="submit"
                      className="btn-primary w-full mt-6"
                    >
                      Continue <ChevronRight className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <button
                      type="button"
                      onClick={goBack}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
                    >
                      <ChevronLeft className="h-4 w-4" /> Back to Account Info
                    </button>

                    <div className="mb-2">
                      <h2 className="font-display font-bold text-xl text-navy-900">Batch & Enrollment</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Select your course details</p>
                    </div>

                    <div>
                      <label htmlFor="batch_id" className="label-base">Batch / Class</label>
                      <select
                        id="batch_id"
                        value={form.batch_id || ''}
                        onChange={e => handleBatchChange(e.target.value)}
                        className="input-base"
                      >
                        <option value="">Select your batch…</option>
                        {batches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    {batchSubjects.length > 0 && (
                      <div>
                        <label className="label-base">Subjects</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {batchSubjects.map(sub => {
                            const chosen = (form.subjects || []).includes(sub)
                            return (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => toggleSubject(sub)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-colors
                                  ${chosen
                                    ? 'border-navy-800 bg-amber-50 text-navy-900'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-navy-300'}`}
                              >
                                {chosen ? '✓ ' : ''}{sub}
                              </button>
                            )
                          })}
                        </div>
                        <p className="mt-1 text-xs text-gray-400">Choose the subjects you will study in this batch.</p>
                      </div>
                    )}

                    <Field
                      name="parent_phone"
                      label="Parent's Phone"
                      placeholder="+91 9876543210"
                      value={form.parent_phone}
                      error={errors.parent_phone}
                      onChange={e => set('parent_phone', e.target.value)}
                    />
                    <Field
                      name="date_of_birth"
                      label="Date of Birth"
                      type="date"
                      max={today}
                      value={form.date_of_birth}
                      error={errors.date_of_birth}
                      onChange={e => set('date_of_birth', e.target.value)}
                    />

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary w-full mt-4"
                    >
                      {loading ? <LoadingSpinner size="sm" /> : 'Complete Registration'}
                    </button>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-100 text-center space-y-2">
            <p className="text-xs text-gray-500">
              Faculty / Staff account? Teacher credentials are provided directly by institute administration.
            </p>
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-navy-800 hover:underline">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
