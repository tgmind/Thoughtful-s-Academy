import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, BookOpen, ShieldCheck, Eye, EyeOff, ChevronRight, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { INSTITUTE_NAME, INSTITUTE_TAGLINE } from '../lib/constants'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const ADMIN_CODE = import.meta.env.VITE_ADMIN_CODE

function passwordStrength(pw) {
  let score = 0
  if (pw.length >= 8)                score++
  if (/[A-Z]/.test(pw))             score++
  if (/[0-9]/.test(pw))             score++
  if (/[^A-Za-z0-9]/.test(pw))      score++
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
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`input-base ${error ? 'border-red-400 focus:ring-red-400' : ''}`}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function RoleStep({ selected, onChange }) {
  const roles = [
    {
      key:   'student',
      icon:  <GraduationCap className="h-8 w-8" />,
      title: 'Student',
      desc:  'Access lectures, track attendance, pay fees and message teachers.',
    },
    {
      key:   'teacher',
      icon:  <BookOpen className="h-8 w-8" />,
      title: 'Teacher',
      desc:  'Manage study cards, drop live classes and communicate with students.',
    },
    {
      key:   'admin',
      icon:  <ShieldCheck className="h-8 w-8" />,
      title: 'Admin',
      desc:  'Full control over the institute — students, teachers, fees and more.',
      requiresCode: true,
    },
  ]

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-6">Choose the account type you need.</p>
      {roles.map(r => (
        <button
          key={r.key}
          type="button"
          onClick={() => onChange(r.key)}
          className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150
            ${selected === r.key
              ? 'border-navy-800 bg-amber-50'
              : 'border-gray-200 hover:border-navy-300 bg-white'
            }`}
        >
          <span className={`p-2 rounded-lg ${selected === r.key ? 'bg-navy-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {r.icon}
          </span>
          <div>
            <p className="font-semibold text-gray-900">{r.title}</p>
            <p className="text-sm text-gray-500 mt-0.5">{r.desc}</p>
            {r.requiresCode && (
              <p className="text-xs text-amber-600 mt-1 font-medium">⚠ Requires admin invite code</p>
            )}
          </div>
          {selected === r.key && (
            <span className="ml-auto text-navy-800">
              <ChevronRight className="h-5 w-5" />
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

function DetailsForm({ role, batches, onSubmit, loading }) {
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirm_password: '',
    phone: '', batch_id: '', parent_phone: '',
    date_of_birth: '', subjects: [], subject: '', qualification: '', admin_code: '',
  })
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState({})
  const [batchSubjects, setBatchSubjects] = useState([])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const onBatchChange = async (batchId) => {
    set('batch_id', batchId)
    set('subjects', [])
    if (!batchId) { setBatchSubjects([]); return }
    const { data } = await supabase.from('batches').select('subjects').eq('id', batchId).maybeSingle()
    setBatchSubjects(data?.subjects ?? [])
  }

  const toggleSubject = (sub) => {
    setForm(f => {
      const already = f.subjects.includes(sub)
      return { ...f, subjects: already ? f.subjects.filter(s => s !== sub) : [...f.subjects, sub] }
    })
  }

  const validate = () => {
    const e = {}
    if (!form.full_name.trim())         e.full_name         = 'Name is required'
    if (!form.email.trim())             e.email             = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email     = 'Invalid email'
    if (!form.password)                 e.password          = 'Password is required'
    else if (form.password.length < 8)  e.password          = 'At least 8 characters'
    if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match'
    if (role === 'admin') {
      if (!ADMIN_CODE) e.admin_code = 'Admin registration is disabled (VITE_ADMIN_CODE not set)'
      else if (form.admin_code !== ADMIN_CODE) e.admin_code = 'Incorrect admin code'
    }
    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    onSubmit(form)
  }

  const pwStrength = passwordStrength(form.password)
  const today = new Date().toISOString().split('T')[0]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field name="full_name" label="Full Name" placeholder="Ravi Kumar" required
        value={form.full_name} error={errors.full_name} onChange={e => set('full_name', e.target.value)} />
      <Field name="email" label="Email" placeholder="you@email.com" required
        value={form.email} error={errors.email} onChange={e => set('email', e.target.value)} />
      <Field name="phone" label="Phone Number" placeholder="+91 9876543210"
        value={form.phone} error={errors.phone} onChange={e => set('phone', e.target.value)} />

      <div>
        <label htmlFor="password" className="label-base">
          Password<span className="text-red-500 ml-0.5">*</span>
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPw ? 'text' : 'password'}
            value={form.password}
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
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= pwStrength ? strengthColors[pwStrength] : 'bg-gray-200'}`} />
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
          value={form.confirm_password}
          onChange={e => set('confirm_password', e.target.value)}
          placeholder="Re-enter password"
          className={`input-base ${errors.confirm_password ? 'border-red-400' : ''}`}
        />
        {errors.confirm_password && <p className="mt-1 text-xs text-red-500">{errors.confirm_password}</p>}
      </div>

      {role === 'student' && (
        <>
          <div>
            <label htmlFor="batch_id" className="label-base">Batch / Class</label>
            <select
              id="batch_id"
              value={form.batch_id}
              onChange={e => onBatchChange(e.target.value)}
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
                  const chosen = form.subjects.includes(sub)
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
          <Field name="parent_phone" label="Parent's Phone" placeholder="+91 9876543210"
            value={form.parent_phone} error={errors.parent_phone} onChange={e => set('parent_phone', e.target.value)} />
          <Field name="date_of_birth" label="Date of Birth" type="date" max={today}
            value={form.date_of_birth} error={errors.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
        </>
      )}

      {role === 'teacher' && (
        <>
          <Field name="subject" label="Subject" placeholder="e.g. Mathematics, Physics"
            value={form.subject} error={errors.subject} onChange={e => set('subject', e.target.value)} />
          <Field name="qualification" label="Qualification" placeholder="e.g. M.Sc. Physics"
            value={form.qualification} error={errors.qualification} onChange={e => set('qualification', e.target.value)} />
        </>
      )}

      {role === 'admin' && (
        <div>
          <label htmlFor="admin_code" className="label-base">
            Admin Invite Code<span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            id="admin_code"
            type="password"
            value={form.admin_code}
            onChange={e => set('admin_code', e.target.value)}
            placeholder="Enter the secret admin code"
            className={`input-base ${errors.admin_code ? 'border-red-400' : ''}`}
          />
          {errors.admin_code && <p className="mt-1 text-xs text-red-500">{errors.admin_code}</p>}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
        {loading ? <LoadingSpinner size="sm" /> : 'Create Account'}
      </button>
    </form>
  )
}

export default function Register() {
  const [step,    setStep]    = useState(1)
  const [role,    setRole]    = useState('')
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase
      .from('batches')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setBatches(data ?? []))
  }, [])

  const handleRegister = async (form) => {
    setLoading(true)
    try {
      const email = form.email.trim().toLowerCase()
      const { data: authData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          data: {
            role,
            full_name:     form.full_name.trim(),
            phone:         form.phone.trim() || null,
            batch_id:      form.batch_id || null,
            parent_phone:  form.parent_phone || null,
            date_of_birth: form.date_of_birth || null,
            subjects:      form.subjects,
            subject:       form.subject || null,
            qualification: form.qualification || null,
          },
        },
      })
      if (signUpErr) throw signUpErr

      const uid = authData.user?.id
      if (!uid) throw new Error('Registration failed — please try again.')

      if (authData.session) {
        await supabase.from('profiles').upsert({
          id: uid, full_name: form.full_name.trim(), email,
          phone: form.phone.trim() || null, role,
        }, { onConflict: 'id', ignoreDuplicates: true })

        if (role === 'student') {
          await supabase.from('student_profiles').upsert({
            id:            uid,
            batch_id:      form.batch_id    || null,
            parent_phone:  form.parent_phone || null,
            date_of_birth: form.date_of_birth || null,
            subjects:      form.subjects.length > 0 ? form.subjects : [],
          }, { onConflict: 'id', ignoreDuplicates: true })
        } else if (role === 'teacher') {
          await supabase.from('teacher_profiles').upsert({
            id:            uid,
            subject:       form.subject       || null,
            qualification: form.qualification || null,
          }, { onConflict: 'id', ignoreDuplicates: true })
        }
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

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ?  60 : -60, opacity: 0 }),
    center:        ()  => ({ x: 0,              opacity: 1 }),
    exit:  (dir) => ({ x: dir > 0 ? -60 :  60, opacity: 0 }),
  }
  const [dir, setDir] = useState(1)

  const goNext = () => { setDir(1);  setStep(2) }
  const goBack = () => { setDir(-1); setStep(1) }

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
            {['Choose Role', 'Your Details'].map((label, idx) => (
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
                  <>
                    <h2 className="font-display font-bold text-xl text-navy-900 mb-1">Create an account</h2>
                    <RoleStep selected={role} onChange={setRole} />
                    <button
                      type="button"
                      disabled={!role}
                      onClick={goNext}
                      className="btn-primary w-full mt-6"
                    >
                      Continue <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={goBack}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
                    >
                      <ChevronLeft className="h-4 w-4" /> Back
                    </button>
                    <h2 className="font-display font-bold text-xl text-navy-900 mb-4 capitalize">
                      {role} Details
                    </h2>
                    <DetailsForm
                      role={role}
                      batches={batches}
                      onSubmit={handleRegister}
                      loading={loading}
                    />
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <p className="text-center text-sm text-gray-500 pb-6 px-6">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-navy-800 hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
