import { useState, useEffect, useMemo } from 'react'
import { ClipboardList, ExternalLink, CheckCircle2, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { normalizeUrl } from '../../utils/formatters'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dueLabel(due) {
  const today = todayISO()
  const d = new Date(due + 'T00:00:00')
  const nice = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  if (due < today)  return { text: `Overdue · ${nice}`, cls: 'text-red-600' }
  if (due === today) return { text: 'Due today', cls: 'text-red-600' }
  return { text: `Due ${nice}`, cls: 'text-amber-600' }
}

const TABS = ['To Do', 'Submitted']

export default function StudentHomework() {
  const { user } = useAuth()
  const [batchId,    setBatchId]    = useState(null)
  const [batchReady, setBatchReady] = useState(false)
  const [homework,   setHomework]   = useState([])
  const [subs,       setSubs]       = useState({})   // homework_id -> submission row
  const [links,      setLinks]      = useState({})   // homework_id -> draft link
  const [submitting, setSubmitting] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState('To Do')

  // Resolve the student's batch first.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase.from('student_profiles').select('batch_id').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setBatchId(data?.batch_id ?? null)
        setBatchReady(true)
      })
    return () => { cancelled = true }
  }, [user])

  // Load homework + submissions and keep them live.
  useEffect(() => {
    if (!user || !batchReady) return
    if (!batchId) { setHomework([]); setSubs({}); setLoading(false); return }
    let cancelled = false

    const loadHomework = () => {
      supabase.from('homework').select('*').eq('batch_id', batchId).eq('is_active', true)
        .order('created_at', { ascending: false })
        .then(({ data }) => { if (!cancelled) setHomework(data ?? []) })
    }
    const loadSubs = () => {
      supabase.from('homework_submissions').select('homework_id, drive_link, submitted_at, grade, feedback')
        .eq('student_id', user.id)
        .then(({ data }) => {
          if (cancelled) return
          const map = {}
          ;(data ?? []).forEach(s => { map[s.homework_id] = s })
          setSubs(map)
        })
    }

    setLoading(true)
    Promise.all([
      supabase.from('homework').select('*').eq('batch_id', batchId).eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('homework_submissions').select('homework_id, drive_link, submitted_at, grade, feedback').eq('student_id', user.id),
    ]).then(([hw, sb]) => {
      if (cancelled) return
      setHomework(hw.data ?? [])
      const map = {}
      ;(sb.data ?? []).forEach(s => { map[s.homework_id] = s })
      setSubs(map)
      setLoading(false)
    })

    const channel = supabase.channel(`student_homework_${user.id}_${batchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework', filter: `batch_id=eq.${batchId}` }, loadHomework)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework_submissions', filter: `student_id=eq.${user.id}` }, loadSubs)
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [user, batchId, batchReady])

  const submit = async (hwId) => {
    if (submitting) return
    const link = links[hwId]?.trim()
    if (!link) { toast.error('Paste your work link first'); return }
    setSubmitting(hwId)
    const { data, error } = await supabase.from('homework_submissions')
      .insert({ homework_id: hwId, student_id: user.id, drive_link: normalizeUrl(link) })
      .select('homework_id, drive_link, submitted_at, grade, feedback')
      .single()
    setSubmitting(null)
    if (error) {
      if (error.code === '23505') {
        toast.error('You have already submitted this homework.')
        // Sync the existing submission so the UI corrects itself.
        const { data: existing } = await supabase.from('homework_submissions')
          .select('homework_id, drive_link, submitted_at, grade, feedback')
          .eq('homework_id', hwId).eq('student_id', user.id).maybeSingle()
        if (existing) setSubs(s => ({ ...s, [hwId]: existing }))
      } else {
        toast.error(error.message)
      }
      return
    }
    setSubs(s => ({ ...s, [hwId]: data }))
    setLinks(l => ({ ...l, [hwId]: '' }))
    toast.success('Submitted!')
  }

  const { todo, submitted } = useMemo(() => {
    const td = [], sd = []
    homework.forEach(h => (subs[h.id] ? sd : td).push(h))
    // To Do: soonest due first (no due date last). Submitted: most recent first.
    td.sort((a, b) => {
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
      if (a.due_date) return -1
      if (b.due_date) return 1
      return (b.created_at || '').localeCompare(a.created_at || '')
    })
    sd.sort((a, b) => (subs[b.id]?.submitted_at || '').localeCompare(subs[a.id]?.submitted_at || ''))
    return { todo: td, submitted: sd }
  }, [homework, subs])

  const list = tab === 'To Do' ? todo : submitted

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  // No batch assigned → nothing to show.
  if (!batchId) return (
    <div className="space-y-6 pb-20 lg:pb-0 max-w-2xl">
      <h2 className="font-bold text-lg text-gray-900">Homework</h2>
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-100">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <ClipboardList className="h-7 w-7 text-gray-300" />
        </div>
        <h3 className="font-bold text-gray-600 text-lg mb-1">No Batch Assigned</h3>
        <p className="text-sm text-gray-400 max-w-xs">You'll see homework here once an admin enrolls you in a batch.</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-5 pb-20 lg:pb-0 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg text-gray-900">Homework</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map(t => {
          const count = t === 'To Do' ? todo.length : submitted.length
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${tab === t ? 'bg-blue-950 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {t === 'To Do' ? <Clock className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {t}
              <span className={tab === t ? 'text-blue-300' : 'text-gray-400'}>{count}</span>
            </button>
          )
        })}
      </div>

      {list.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <ClipboardList className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {tab === 'To Do' ? 'Nothing due right now. You\'re all caught up! 🎉' : 'No submitted homework yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(hw => {
            const sub = subs[hw.id]
            const due = hw.due_date ? dueLabel(hw.due_date) : null
            return (
              <div key={hw.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{hw.title}</h3>
                    {hw.description && <p className="text-sm text-gray-500 mt-0.5">{hw.description}</p>}
                    {due && <p className={`text-xs mt-1 font-medium ${due.cls}`}>{due.text}</p>}
                  </div>
                  <a href={normalizeUrl(hw.drive_link)} target="_blank" rel="noopener noreferrer"
                    className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors">
                    <ExternalLink className="h-3.5 w-3.5" /> Assignment
                  </a>
                </div>

                {sub ? (
                  <div className="mt-3 bg-green-50 rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 text-green-700 flex-wrap">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Submitted</span>
                      <span className="text-xs text-green-600">
                        {new Date(sub.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {sub.drive_link && (
                        <a href={normalizeUrl(sub.drive_link)} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline">View your work</a>
                      )}
                      {sub.grade && <span className="ml-auto font-bold text-green-800">Grade: {sub.grade}</span>}
                    </div>
                    {sub.feedback && (
                      <p className="text-gray-600 mt-1.5 text-xs">
                        <span className="font-semibold text-gray-700">Feedback:</span> {sub.feedback}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <input type="url" placeholder="Paste your Google Drive / work link…"
                      value={links[hw.id] || ''}
                      onChange={e => setLinks(l => ({ ...l, [hw.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') submit(hw.id) }}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" />
                    <button onClick={() => submit(hw.id)} disabled={submitting === hw.id}
                      className="px-4 py-1.5 bg-blue-950 text-white text-sm font-semibold rounded-lg hover:bg-blue-900 disabled:opacity-50 transition-colors">
                      {submitting === hw.id ? 'Submitting…' : 'Submit'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
