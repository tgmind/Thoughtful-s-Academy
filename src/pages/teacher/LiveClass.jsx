import { useState, useEffect } from 'react'
import { Video, Lock, Square, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { normalizeUrl } from '../../utils/formatters'
import CustomSelect from '../../components/ui/CustomSelect'

const PLATFORMS = [
  { value: 'zoom',        label: '🎥 Zoom'         },
  { value: 'google_meet', label: '📹 Google Meet'  },
  { value: 'other',       label: '🔗 Other'        },
]

const EMPTY = { title:'', platform:'zoom', join_url:'', password:'', batch_id:'' }

export default function LiveClass({ isAdmin = false }) {
  const { user } = useAuth()
  const [allowed,     setAllowed]     = useState(isAdmin)
  const [active,      setActive]      = useState(null)
  const [past,        setPast]        = useState([])
  const [batches,     setBatches]     = useState([])
  const [form,        setForm]        = useState(EMPTY)
  const [saving,      setSaving]      = useState(false)
  const [ending,      setEnding]      = useState(false)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    let channel = null

    // Reload active + recent classes from the DB.
    const loadClasses = async () => {
      let activeQuery = supabase.from('live_classes').select('*, batches(name), profiles!teacher_id(full_name)').eq('is_active', true).order('created_at', { ascending: false }).limit(1)
      let pastQuery = supabase.from('live_classes').select('*, batches(name), profiles!teacher_id(full_name)').eq('is_active', false).order('created_at', { ascending: false }).limit(10)

      if (!isAdmin) {
        // Fetch batches assigned to this teacher
        const { data: bList } = await supabase.from('batches').select('id').or(`teacher_id.eq.${user.id},teacher_ids.cs.{${user.id}}`)
        const assignedBatchIds = (bList ?? []).map(b => b.id)
        
        let filterOrStr = `teacher_id.eq.${user.id},batch_id.is.null`
        if (assignedBatchIds.length > 0) {
          filterOrStr += `,batch_id.in.(${assignedBatchIds.join(',')})`
        }

        activeQuery = activeQuery.or(filterOrStr)
        pastQuery = pastQuery.or(filterOrStr)
      }

      const [a, p] = await Promise.all([activeQuery, pastQuery])
      if (cancelled) return
      setActive(a.data?.[0] ?? null)
      setPast(p.data ?? [])
    }

    const permCheck = isAdmin
      ? Promise.resolve(true)
      : supabase.from('teacher_profiles').select('can_drop_live_class').eq('id', user.id).maybeSingle()
          .then(({ data: p }) => p?.can_drop_live_class ?? false)
          .catch(() => false)

    permCheck.then(async (ok) => {
      if (cancelled) return
      setAllowed(ok)
      if (!ok) { setLoading(false); return }

      // For non-admin teachers, restrict batch selection to assigned batches
      let bQuery = supabase.from('batches').select('id, name').eq('is_active', true).order('name')
      if (!isAdmin) {
        bQuery = bQuery.or(`teacher_id.eq.${user.id},teacher_ids.cs.{${user.id}}`)
      }
      const { data: b } = await bQuery
      if (cancelled) return
      setBatches(b ?? [])
      await loadClasses()
      if (cancelled) return
      setLoading(false)

      if (cancelled) return
      const channelConfig = { event: '*', schema: 'public', table: 'live_classes' }

      channel = supabase
        .channel(`lc_manage_${user.id}_${Date.now()}`)
        .on('postgres_changes', channelConfig, loadClasses)
        .subscribe()
    })

    return () => { cancelled = true; if (channel) supabase.removeChannel(channel) }
  }, [user, isAdmin])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const goLive = async () => {
    if (saving) return
    const title = form.title.trim()
    const joinUrl = normalizeUrl(form.join_url)
    if (!title || !form.join_url.trim()) { toast.error('Title and join URL are required'); return }

    // If another teacher's class is active for this batch, prevent duplicate class
    if (active && active.teacher_id !== user.id) {
      const hostName = active.profiles?.full_name || 'another teacher'
      const batchTitle = active.batches?.name || 'this batch'
      toast.error(`A live class for ${batchTitle} is already in progress by ${hostName}.`)
      return
    }

    setSaving(true)
    // Guarantee a single active class per teacher: end any existing active ones first.
    const { error: endErr } = await supabase.from('live_classes')
      .update({ is_active: false }).eq('teacher_id', user.id).eq('is_active', true)
    if (endErr) { setSaving(false); toast.error(endErr.message); return }
    const { data, error } = await supabase.from('live_classes').insert({
      title,
      platform:   form.platform,
      join_url:   joinUrl,
      password:   form.password.trim() || null,
      batch_id:   form.batch_id || null,
      teacher_id: user.id,
      is_active:  true,
    }).select('*, batches(name), profiles!teacher_id(full_name)').maybeSingle()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setActive(data)
    setForm(EMPTY)
    toast.success('🔴 Live class is now active! Students can see it.')
  }

  const endClass = async () => {
    if (!active || ending || active.teacher_id !== user.id) return
    setEnding(true)
    const ended = active
    const { error } = await supabase.from('live_classes').update({ is_active: false }).eq('id', ended.id)
    setEnding(false)
    if (error) { toast.error(error.message); return }
    setPast(p => [{ ...ended, is_active: false }, ...p.filter(x => x.id !== ended.id)])
    setActive(null)
    toast.success('Class ended.')
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  if (!allowed) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <Lock className="h-8 w-8 text-gray-400" />
      </div>
      <h2 className="font-bold text-xl text-gray-700">Permission Required</h2>
      <p className="text-gray-500 mt-2">Ask your admin to enable live class management.</p>
    </div>
  )

  const isHost = active && active.teacher_id === user.id
  const hostName = active?.profiles?.full_name || 'Teacher'
  const batchName = active?.batches?.name || 'All Batches'

  return (
    <div className="space-y-6 pb-20 lg:pb-0 max-w-2xl">

      {/* Active class banner / notification */}
      {active && (
        isHost ? (
          /* Host Teacher Console (Started by current user) */
          <div className="bg-gradient-to-r from-red-600 to-red-500 rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <span className="font-bold uppercase tracking-wide text-xs">Live Class Active (Hosted by You)</span>
            </div>
            <h2 className="font-bold text-xl">{active.title}</h2>
            <p className="text-red-100 text-sm mt-1">{batchName}</p>
            {active.password && (
              <p className="text-sm mt-1">Password: <span className="font-mono bg-white/20 px-2 py-0.5 rounded">{active.password}</span></p>
            )}
            <div className="flex gap-3 mt-4">
              <a href={normalizeUrl(active.join_url)} target="_blank" rel="noopener noreferrer"
                className="px-5 py-2 bg-white text-red-600 font-bold rounded-xl text-sm hover:bg-red-50 transition-colors">
                Join Class →
              </a>
              <button onClick={endClass} disabled={ending}
                className="flex items-center gap-2 px-5 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl text-sm transition-colors">
                <Square className="h-4 w-4 fill-current" /> {ending ? 'Ending…' : 'End Class'}
              </button>
            </div>
          </div>
        ) : (
          /* Admin / Co-Teacher Informational Message Banner (Started by another teacher) */
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-5 text-white border border-indigo-900/60 shadow-lg space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                <span className="font-black text-xs text-red-400 uppercase tracking-wider bg-red-950/80 px-2.5 py-0.5 rounded-full border border-red-800/60">
                  🔴 Live Class In Progress
                </span>
              </div>
              <span className="text-[11px] text-gray-400 font-medium">
                Started {new Date(active.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div>
              <h3 className="font-black text-lg text-white leading-snug">{active.title}</h3>
              <p className="text-xs text-indigo-200 mt-1">
                Batch: <span className="font-bold text-white">{batchName}</span>
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 text-xs space-y-1">
              <p className="text-gray-200">
                Conducted by: <span className="font-bold text-amber-300">{hostName}</span>
              </p>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                ℹ️ Admins and co-teachers do not need to join this live class. Students are attending the live session.
              </p>
            </div>
          </div>
        )
      )}

      {/* Drop link form */}
      {!active && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Video className="h-5 w-5 text-red-500" /> Drop a Live Class Link
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Class Title <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Physics — Chapter 9 Live Revision"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Platform</label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map(p => (
                <button key={p.value} type="button" onClick={() => set('platform', p.value)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-colors
                    ${form.platform === p.value ? 'border-blue-950 bg-blue-50 text-blue-950' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Join URL <span className="text-red-500">*</span></label>
            <input value={form.join_url} onChange={e => set('join_url', e.target.value)} placeholder="https://zoom.us/j/… or meet.google.com/…"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password (optional)</label>
              <input value={form.password} onChange={e => set('password', e.target.value)} placeholder="Meeting password"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Batch</label>
              <CustomSelect
                value={form.batch_id}
                onChange={val => set('batch_id', val)}
                options={[
                  { value: '', label: 'All Batches' },
                  ...batches.map(b => ({ value: b.id, label: b.name }))
                ]}
              />
            </div>
          </div>
          <button onClick={goLive} disabled={saving}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-base flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
            {saving ? 'Going Live…' : <><span className="w-3 h-3 bg-white rounded-full animate-pulse" /> GO LIVE 🔴</>}
          </button>
        </div>
      )}

      {/* Past classes */}
      {past.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Past Classes</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {past.map(c => (
              <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{c.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {c.batches?.name || 'All'} · {new Date(c.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                  </p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-medium capitalize">{c.platform.replace('_',' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
