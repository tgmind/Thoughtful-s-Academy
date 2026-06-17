import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Send, ArrowLeft, MessageCircle, Search, Check, CheckCheck, X, Megaphone, Users, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const PALETTE = [
  'bg-violet-500','bg-blue-500','bg-emerald-500','bg-rose-500',
  'bg-amber-500','bg-indigo-500','bg-pink-500','bg-teal-500',
]
const ROLE_BG = { admin: 'bg-purple-600', student: 'bg-blue-500', teacher: 'bg-indigo-500' }

function avatarBg(str = '') {
  const n = [...str].reduce((a, c) => a + c.charCodeAt(0), 0)
  return PALETTE[n % PALETTE.length]
}
function roleBg(role) { return ROLE_BG[role] || 'bg-gray-500' }
function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?'
}
function isSameCalendarDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}
function shortTime(iso) {
  const d = new Date(iso), now = new Date()
  if (isSameCalendarDay(d, now)) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  if (now - d < 604800000) return d.toLocaleDateString('en-IN', { weekday: 'short' })
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
function sepLabel(iso) {
  const d = new Date(iso), now = new Date()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (isSameCalendarDay(d, now))       return 'Today'
  if (isSameCalendarDay(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Resolve the profile ids of all students enrolled in a batch.
async function fetchBatchStudentIds(batchId) {
  const { data } = await supabase.from('student_profiles').select('id').eq('batch_id', batchId)
  return (data ?? []).map(s => s.id)
}

// A "broadcast" is delivered as one direct message per student, all inserted
// in a single statement — so every row shares the same created_at + content.
// Group by that to render one bubble per broadcast (with a recipient count).
function groupBroadcastMessages(msgs) {
  const map = new Map()
  msgs.forEach(m => {
    const key = `${m.created_at}__${m.content}`
    if (!map.has(key)) {
      map.set(key, { id: key, created_by: m.sender_id, created_at: m.created_at, body: m.content, recipients: 0 })
    }
    map.get(key).recipients++
  })
  return [...map.values()].sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export default function TeacherMessages() {
  const { user } = useAuth()

  // Mode toggle
  const [mode, setMode] = useState('direct') // 'direct' | 'broadcast'

  // Direct messaging state
  const [canMsgStudents, setCanMsgStudents] = useState(false)
  const [contacts,  setContacts]  = useState([])
  const [selected,  setSelected]  = useState(null)
  const [messages,  setMessages]  = useState([])
  const [lastMsgs,  setLastMsgs]  = useState({})
  const [unread,    setUnread]    = useState({})
  const [text,      setText]      = useState('')
  const [sending,   setSending]   = useState(false)
  const [showList,  setShowList]  = useState(true)
  const [search,    setSearch]    = useState('')
  const [loading,   setLoading]   = useState(true)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Broadcast state
  const [batches,       setBatches]       = useState([])
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [broadcasts,    setBroadcasts]    = useState([])
  const [bcastText,     setBcastText]     = useState('')
  const [bcastSending,  setBcastSending]  = useState(false)
  const [bcastLoading,  setBcastLoading]  = useState(false)
  const bcastBottomRef = useRef(null)
  const bcastInputRef  = useRef(null)

  // Load contacts + permission
  useEffect(() => {
    if (!user) return
    supabase.from('teacher_profiles')
      .select('can_message_students').eq('id', user.id).maybeSingle()
      .then(async ({ data }) => {
        const ok = data?.can_message_students ?? false
        setCanMsgStudents(ok)
        const queries = [
          supabase.from('profiles').select('id, full_name, role').eq('role', 'admin').eq('is_active', true).order('full_name'),
        ]
        if (ok) queries.push(
          supabase.from('profiles').select('id, full_name, role').eq('role', 'student').eq('is_active', true).order('full_name')
        )
        const results = await Promise.all(queries)
        setContacts([...(results[0].data ?? []), ...(ok ? (results[1].data ?? []) : [])])
        setLoading(false)
      })
  }, [user])

  // Load teacher's own batches for broadcast
  useEffect(() => {
    if (!user) return
    supabase.from('batches')
      .select('id, name, subject')
      .eq('teacher_id', user.id)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setBatches(data ?? []))
  }, [user])

  // Load past broadcasts (sent as direct messages) when a batch is selected
  useEffect(() => {
    if (!selectedBatch || !user) return
    setBcastLoading(true)
    let cancelled = false
    ;(async () => {
      const ids = await fetchBatchStudentIds(selectedBatch.id)
      if (cancelled) return
      if (ids.length === 0) { setBroadcasts([]); setBcastLoading(false); return }
      const { data } = await supabase.from('messages')
        .select('id, content, created_at, sender_id, receiver_id')
        .eq('sender_id', user.id)
        .in('receiver_id', ids)
        .order('created_at')
      if (cancelled) return
      setBroadcasts(groupBroadcastMessages(data ?? []))
      setBcastLoading(false)
    })()
    return () => { cancelled = true }
  }, [selectedBatch, user])

  useEffect(() => {
    bcastBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [broadcasts])

  const sendBroadcast = async () => {
    if (!bcastText.trim() || !selectedBatch || bcastSending) return
    setBcastSending(true)
    const msg = bcastText.trim()
    const ids = await fetchBatchStudentIds(selectedBatch.id)
    if (ids.length === 0) {
      toast.error('No students are enrolled in this batch yet.')
      setBcastSending(false)
      return
    }
    // Deliver as a direct message to every student in the batch
    const { data, error } = await supabase.from('messages')
      .insert(ids.map(id => ({ sender_id: user.id, receiver_id: id, content: msg })))
      .select('id, content, created_at, sender_id, receiver_id')
    if (error) toast.error(error.message)
    else {
      setBroadcasts(b => [...b, ...groupBroadcastMessages(data ?? [])])
      setBcastText('')
      toast.success(`Sent to ${ids.length} student${ids.length !== 1 ? 's' : ''} in ${selectedBatch.name}!`)
      bcastInputRef.current?.focus()
    }
    setBcastSending(false)
  }

  const openBatch = (b) => {
    setSelectedBatch(b)
    setShowList(false)
  }

  const switchMode = (m) => {
    setMode(m)
    setShowList(true)
    setSelected(null)
    setSelectedBatch(null)
  }

  // Direct messaging helpers
  const loadSummary = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(300)
    if (!data) return
    const lm = {}, ur = {}
    data.forEach(m => {
      const other = m.sender_id === user.id ? m.receiver_id : m.sender_id
      if (!lm[other]) lm[other] = m
      if (!m.is_read && m.receiver_id === user.id) ur[other] = (ur[other] || 0) + 1
    })
    setLastMsgs(lm)
    setUnread(ur)
  }, [user])

  useEffect(() => { loadSummary() }, [loadSummary])

  useEffect(() => {
    if (!selected || !user) return
    supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selected.id}),and(sender_id.eq.${selected.id},receiver_id.eq.${user.id})`)
      .order('created_at')
      .then(({ data }) => {
        setMessages(data ?? [])
        supabase.from('messages').update({ is_read: true })
          .eq('receiver_id', user.id).eq('sender_id', selected.id).eq('is_read', false)
          .then(() => setUnread(u => { const n = { ...u }; delete n[selected.id]; return n }))
      })
  }, [selected, user])

  useEffect(() => {
    if (!user) return
    const ch = supabase.channel(`teacher_msgs_${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, ({ new: msg }) => {
        if (msg.sender_id === selected?.id) {
          setMessages(m => m.some(x => x.id === msg.id) ? m : [...m, msg])
          supabase.from('messages').update({ is_read: true }).eq('id', msg.id).then(() => {})
        } else {
          setUnread(u => ({ ...u, [msg.sender_id]: (u[msg.sender_id] || 0) + 1 }))
        }
        setLastMsgs(lm => ({ ...lm, [msg.sender_id]: msg }))
      })
      // Read receipts: my sent messages flip to read live
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `sender_id=eq.${user.id}`,
      }, ({ new: msg }) => {
        setMessages(m => m.map(x => x.id === msg.id ? { ...x, ...msg } : x))
        setLastMsgs(lm => lm[msg.receiver_id]?.id === msg.id
          ? { ...lm, [msg.receiver_id]: { ...lm[msg.receiver_id], ...msg } }
          : lm)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user, selected])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!text.trim() || !selected || sending) return
    setSending(true)
    const { data, error } = await supabase.from('messages')
      .insert({ sender_id: user.id, receiver_id: selected.id, content: text.trim() })
      .select().single()
    if (error) toast.error(error.message)
    else {
      setMessages(m => [...m, data])
      setLastMsgs(lm => ({ ...lm, [selected.id]: data }))
      setText('')
      inputRef.current?.focus()
    }
    setSending(false)
  }

  const openConvo = (c) => {
    setSelected(c)
    setShowList(false)
    setUnread(u => { const n = { ...u }; delete n[c.id]; return n })
  }

  const filteredContacts = useMemo(() => {
    const q = search.toLowerCase()
    return [...contacts]
      .filter(c => !q || c.full_name?.toLowerCase().includes(q) || c.role?.includes(q))
      .sort((a, b) =>
        (lastMsgs[b.id]?.created_at || '').localeCompare(lastMsgs[a.id]?.created_at || '')
      )
  }, [contacts, search, lastMsgs])

  const grouped = useMemo(() => {
    const items = []
    let lastDate = null
    messages.forEach((m, i) => {
      const dk = new Date(m.created_at).toDateString()
      if (dk !== lastDate) {
        items.push({ type: 'sep', label: sepLabel(m.created_at), key: dk })
        lastDate = dk
      }
      const next = messages[i + 1]
      const tail = !next || next.sender_id !== m.sender_id ||
        new Date(next.created_at).toDateString() !== dk
      items.push({ type: 'msg', ...m, tail })
    })
    return items
  }, [messages])

  const bcastGrouped = useMemo(() => {
    const items = []
    let lastDate = null
    broadcasts.forEach(b => {
      const dk = new Date(b.created_at).toDateString()
      if (dk !== lastDate) {
        items.push({ type: 'sep', label: sepLabel(b.created_at), key: dk })
        lastDate = dk
      }
      items.push({ type: 'msg', ...b })
    })
    return items
  }, [broadcasts])

  if (loading) return (
    <div className="flex h-[calc(100vh-8rem)] lg:h-[calc(100vh-5rem)] items-center justify-center rounded-2xl border border-gray-200">
      <p className="text-sm text-gray-400">Loading…</p>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-8rem)] lg:h-[calc(100vh-5rem)] bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">

      {/* ── Sidebar ── */}
      <div className={`${showList ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-80 border-r border-gray-100 flex-shrink-0`}>

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">Messages</h2>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          <button onClick={() => switchMode('direct')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors
              ${mode === 'direct' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <MessageCircle className="h-3.5 w-3.5" /> Direct
          </button>
          <button onClick={() => switchMode('broadcast')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors
              ${mode === 'broadcast' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <Megaphone className="h-3.5 w-3.5" /> Broadcast
          </button>
        </div>

        {mode === 'direct' ? (
          <>
            <div className="px-3 py-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
                <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search"
                  className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredContacts.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-10">
                  {search ? 'No results' : 'No contacts available'}
                </p>
              )}
              {filteredContacts.map(c => {
                const lm  = lastMsgs[c.id]
                const cnt = unread[c.id] || 0
                const mine = lm?.sender_id === user?.id
                return (
                  <button key={c.id} onClick={() => openConvo(c)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                      ${selected?.id === c.id ? 'bg-gray-50' : 'hover:bg-gray-50/70'}`}>
                    <div className={`w-12 h-12 rounded-full ${roleBg(c.role)} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
                      {initials(c.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-sm truncate ${cnt > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
                          {c.full_name}
                        </p>
                        {lm && (
                          <span className={`text-[11px] flex-shrink-0 ${cnt > 0 ? 'text-violet-600 font-medium' : 'text-gray-400'}`}>
                            {shortTime(lm.created_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p className="text-xs text-gray-400 truncate flex-1 flex items-center gap-1 min-w-0">
                          {lm ? (
                            <>
                              {mine && (lm.is_read
                                ? <CheckCheck className="h-3 w-3 text-violet-500 flex-shrink-0" />
                                : <Check className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              )}
                              <span className={`truncate ${cnt > 0 ? 'font-medium text-gray-700' : ''}`}>
                                {lm.content}
                              </span>
                            </>
                          ) : (
                            <span className="capitalize">{c.role}</span>
                          )}
                        </p>
                        {cnt > 0 && (
                          <span className="ml-1 flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
                            {cnt > 99 ? '99+' : cnt}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {!canMsgStudents && (
              <div className="px-4 py-2.5 border-t border-gray-100 bg-amber-50 flex-shrink-0">
                <p className="text-xs text-amber-700">Student messaging is disabled — ask admin to enable it.</p>
              </div>
            )}
          </>
        ) : (
          /* Broadcast sidebar – batch list */
          <div className="flex-1 overflow-y-auto">
            <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Batches</p>
            {batches.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Megaphone className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No batches assigned.</p>
                <p className="text-xs text-gray-300 mt-1">Ask admin to assign you to a batch.</p>
              </div>
            ) : batches.map(b => (
              <button key={b.id} onClick={() => openBatch(b)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors
                  ${selectedBatch?.id === b.id ? 'bg-violet-50' : 'hover:bg-gray-50/70'}`}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Megaphone className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{b.name}</p>
                  {b.subject && <p className="text-xs text-gray-400 truncate">{b.subject}</p>}
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Main area ── */}
      <div className={`${!showList ? 'flex' : 'hidden'} lg:flex flex-col flex-1 min-w-0`}>

        {mode === 'direct' ? (
          /* ── Direct messages area ── */
          !selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-700">Your Messages</p>
              <p className="text-sm text-gray-400">Select a conversation to get started</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <button onClick={() => setShowList(true)}
                  className="lg:hidden -ml-1 p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className={`w-9 h-9 rounded-full ${roleBg(selected.role)} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
                  {initials(selected.full_name)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{selected.full_name}</p>
                  <p className="text-xs text-gray-400 capitalize">{selected.role}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                {messages.length === 0 && (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-sm text-gray-400">No messages yet. Start the conversation!</p>
                  </div>
                )}
                {grouped.map((item) => {
                  if (item.type === 'sep') return (
                    <div key={item.key} className="flex items-center gap-3 my-4">
                      <hr className="flex-1 border-gray-100" />
                      <span className="text-xs text-gray-400">{item.label}</span>
                      <hr className="flex-1 border-gray-100" />
                    </div>
                  )
                  const mine = item.sender_id === user.id
                  return (
                    <div key={item.id}
                      className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'} ${item.tail ? 'mb-3' : 'mb-0.5'}`}>
                      {!mine && (
                        <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-semibold self-end
                          ${item.tail ? roleBg(selected.role) : 'invisible'}`}>
                          {item.tail ? initials(selected.full_name) : ''}
                        </div>
                      )}
                      <div className={`max-w-[68%] lg:max-w-[52%] px-3.5 py-2
                        ${mine
                          ? `bg-gradient-to-br from-violet-500 to-indigo-600 text-white
                             ${item.tail ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl'}`
                          : `bg-gray-100 text-gray-900
                             ${item.tail ? 'rounded-2xl rounded-bl-sm' : 'rounded-2xl'}`
                        }`}>
                        <p className="text-sm break-words leading-relaxed">{item.content}</p>
                        <div className={`flex items-center gap-1 mt-0.5 ${mine ? 'justify-end' : 'justify-start'}`}>
                          <span className={`text-[10px] leading-none ${mine ? 'text-white/60' : 'text-gray-400'}`}>
                            {new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {mine && (item.is_read
                            ? <CheckCheck className="h-3 w-3 text-white/70" />
                            : <Check className="h-3 w-3 text-white/50" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 flex-shrink-0">
                <div className="flex-1 flex items-center bg-gray-100 rounded-2xl px-4 py-2.5">
                  <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                    placeholder="Message…"
                    className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
                  />
                </div>
                <button
                  onClick={send}
                  disabled={sending || !text.trim()}
                  className="w-9 h-9 flex items-center justify-center rounded-full transition-colors flex-shrink-0
                    disabled:text-gray-300 enabled:text-violet-600 enabled:hover:bg-violet-50">
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </>
          )
        ) : (
          /* ── Broadcast area ── */
          !selectedBatch ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center">
                <Megaphone className="h-8 w-8 text-violet-300" />
              </div>
              <p className="font-semibold text-gray-700">Broadcast to a Batch</p>
              <p className="text-sm text-gray-400 max-w-xs">Select a batch from the sidebar to send a message to all its students at once.</p>
            </div>
          ) : (
            <>
              {/* Broadcast header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <button onClick={() => { setShowList(true); setSelectedBatch(null) }}
                  className="lg:hidden -ml-1 p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Megaphone className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{selectedBatch.name}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Users className="h-3 w-3" /> Broadcast to all students in this batch
                  </p>
                </div>
              </div>

              {/* Broadcast history */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {bcastLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-sm text-gray-400">Loading…</p>
                  </div>
                ) : broadcasts.length === 0 ? (
                  <div className="flex flex-col justify-center items-center h-full gap-2 text-center">
                    <Megaphone className="h-10 w-10 text-gray-200" />
                    <p className="text-sm text-gray-400">No broadcasts yet to this batch.</p>
                    <p className="text-xs text-gray-300">Type a message below to send your first broadcast.</p>
                  </div>
                ) : (
                  bcastGrouped.map((item) => {
                    if (item.type === 'sep') return (
                      <div key={item.key} className="flex items-center gap-3 my-4">
                        <hr className="flex-1 border-gray-100" />
                        <span className="text-xs text-gray-400">{item.label}</span>
                        <hr className="flex-1 border-gray-100" />
                      </div>
                    )
                    return (
                      <div key={item.id} className="flex justify-end mb-3">
                        <div className="max-w-[72%] lg:max-w-[56%]">
                          <div className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white px-3.5 py-2.5 rounded-2xl rounded-br-sm">
                            <p className="text-sm break-words leading-relaxed">{item.body}</p>
                          </div>
                          <div className="flex items-center justify-end gap-1.5 mt-1">
                            <span className="text-[10px] text-gray-400">
                              {new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[10px] text-violet-500 font-medium flex items-center gap-0.5">
                              <Users className="h-2.5 w-2.5" /> Sent to {item.recipients} student{item.recipients !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={bcastBottomRef} />
              </div>

              {/* Broadcast compose */}
              <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
                <div className="flex items-end gap-3">
                  <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5">
                    <textarea
                      ref={bcastInputRef}
                      value={bcastText}
                      onChange={e => setBcastText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBroadcast() } }}
                      placeholder={`Broadcast to ${selectedBatch.name}…`}
                      rows={1}
                      className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none resize-none max-h-28"
                    />
                  </div>
                  <button
                    onClick={sendBroadcast}
                    disabled={bcastSending || !bcastText.trim()}
                    className="w-9 h-9 flex items-center justify-center rounded-full transition-colors flex-shrink-0 mb-0.5
                      disabled:text-gray-300 enabled:text-violet-600 enabled:hover:bg-violet-50">
                    <Send className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 pl-1">
                  Students in <span className="font-medium text-gray-500">{selectedBatch.name}</span> will receive this as a direct message. Press Enter to send.
                </p>
              </div>
            </>
          )
        )}
      </div>
    </div>
  )
}
