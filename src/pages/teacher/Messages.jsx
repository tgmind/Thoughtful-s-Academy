import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Send,
  ArrowLeft,
  MessageCircle,
  Search,
  Check,
  CheckCheck,
  X,
  Megaphone,
  Users,
  ChevronRight,
  Paperclip,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  avatarBg,
  initials,
  shortTime,
  sepLabel,
  renderMessageContent,
} from '../../utils/messageUtils'

const ROLE_BG = { teacher: 'bg-indigo-500', student: 'bg-blue-500', admin: 'bg-violet-600' }
function roleBg(role) {
  return ROLE_BG[role] || avatarBg(role)
}

// Resolve the profile ids of all students enrolled in a batch.
async function fetchBatchStudentIds(batchId) {
  const { data } = await supabase.from('student_profiles').select('id').eq('batch_id', batchId)
  return (data ?? []).map((s) => s.id)
}

// Group broadcast messages by timestamp + body to render single bubble with recipient count
function groupBroadcastMessages(msgs) {
  const map = new Map()
  msgs.forEach((m) => {
    const key = `${m.created_at}__${m.content}`
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        created_by: m.sender_id,
        created_at: m.created_at,
        body: m.content,
        recipients: 0,
        batch_id: m.batch_id,
      })
    }
    map.get(key).recipients++
  })
  return [...map.values()].sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export default function TeacherMessages() {
  const { user } = useAuth()
  const location = useLocation()

  // Mode toggle
  const [mode, setMode] = useState('direct') // 'direct' | 'broadcast'

  // Direct messaging state
  const [canMsgStudents, setCanMsgStudents] = useState(false)
  const [contacts, setContacts] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [lastMsgs, setLastMsgs] = useState({})
  const [unread, setUnread] = useState({})
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showList, setShowList] = useState(true)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const isNearBottomRef = useRef(true)

  // Broadcast state
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [broadcasts, setBroadcasts] = useState([])
  const [bcastText, setBcastText] = useState('')
  const [bcastSending, setBcastSending] = useState(false)
  const [bcastLoading, setBcastLoading] = useState(false)
  const [batchSearch, setBatchSearch] = useState('')

  const bcastBottomRef = useRef(null)
  const bcastInputRef = useRef(null)
  const isBcastNearBottomRef = useRef(true)

  // Load contacts + permission
  useEffect(() => {
    if (!user) return
    supabase
      .from('teacher_profiles')
      .select('can_message_students')
      .eq('id', user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        const ok = data?.can_message_students ?? false
        setCanMsgStudents(ok)
        const queries = [
          supabase
            .from('profiles')
            .select('id, full_name, role')
            .in('role', ['admin', 'teacher'])
            .neq('id', user.id)
            .eq('is_active', true)
            .order('full_name'),
        ]
        if (ok) {
          queries.push(
            supabase
              .from('profiles')
              .select('id, full_name, role')
              .eq('role', 'student')
              .eq('is_active', true)
              .order('full_name')
          )
        }
        const results = await Promise.all(queries)
        setContacts([...(results[0].data ?? []), ...(ok ? results[1].data ?? [] : [])])
        setLoading(false)
      })
  }, [user])

  const selectedRef = useRef(selected)
  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  // Auto-select contact if query param ?student= or ?contact= is passed in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const targetId = params.get('student') || params.get('contact')
    if (!targetId || !user) return

    // Guard: already selected
    if (selectedRef.current?.id === targetId) return

    const found = contacts.find((c) => c.id === targetId)
    if (found) {
      setMode('direct')
      setSelected(found)
      setShowList(false)
    } else {
      supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', targetId)
        .maybeSingle()
        .then(({ data }) => {
          if (data && selectedRef.current?.id !== data.id) {
            setContacts((prev) => (prev.some((c) => c.id === data.id) ? prev : [...prev, data]))
            setMode('direct')
            setSelected(data)
            setShowList(false)
          }
        })
    }
  }, [contacts, location.search, user])

  // Load teacher's batches for broadcast
  useEffect(() => {
    if (!user) return
    supabase
      .from('batches')
      .select('id, name, subject')
      .or(`teacher_id.eq.${user.id},teacher_ids.cs.{${user.id}}`)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setBatches(data ?? []))
  }, [user])

  // Load past broadcasts strictly matching batch_id and is_broadcast=true
  useEffect(() => {
    if (!selectedBatch || !user) return
    setBcastLoading(true)
    let cancelled = false
    isBcastNearBottomRef.current = true

    ;(async () => {
      const { data } = await supabase
        .from('messages')
        .select('id, content, created_at, sender_id, receiver_id, batch_id, is_broadcast')
        .eq('batch_id', selectedBatch.id)
        .eq('is_broadcast', true)
        .order('created_at')

      if (cancelled) return
      setBroadcasts(groupBroadcastMessages(data ?? []))
      setBcastLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [selectedBatch, user])

  // Realtime subscription for broadcast messages in active batch
  useEffect(() => {
    if (!selectedBatch || mode !== 'broadcast') return
    const ch = supabase
      .channel(`teacher_bcast_${selectedBatch.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `batch_id=eq.${selectedBatch.id}`,
        },
        ({ new: newMsg }) => {
          if (!newMsg.is_broadcast) return
          setBroadcasts((b) => {
            const key = `${newMsg.created_at}__${newMsg.content}`
            const exists = b.find((x) => x.id === key)
            if (exists) {
              return b.map((x) =>
                x.id === key ? { ...x, recipients: x.recipients + 1 } : x
              )
            }
            return [
              ...b,
              {
                id: key,
                created_by: newMsg.sender_id,
                created_at: newMsg.created_at,
                body: newMsg.content,
                recipients: 1,
                batch_id: newMsg.batch_id,
              },
            ]
          })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [selectedBatch, mode])

  // Smart scroll for broadcast
  const handleBcastScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    isBcastNearBottomRef.current = scrollHeight - (scrollTop + clientHeight) < 120
  }

  useEffect(() => {
    if (isBcastNearBottomRef.current) {
      bcastBottomRef.current?.scrollIntoView?.({ behavior: 'smooth' })
    }
  }, [broadcasts])

  const sendBroadcast = async () => {
    if (!bcastText.trim() || !selectedBatch || bcastSending) return

    if (!canMsgStudents) {
      toast.error('You do not have permission to message students.')
      return
    }

    setBcastSending(true)
    const msg = bcastText.trim()
    const ids = await fetchBatchStudentIds(selectedBatch.id)
    if (ids.length === 0) {
      toast.error('No students are enrolled in this batch yet.')
      setBcastSending(false)
      return
    }

    const payload = ids.map((id) => ({
      sender_id: user.id,
      receiver_id: id,
      content: msg,
      batch_id: selectedBatch.id,
      is_broadcast: true,
    }))

    const { data, error } = await supabase
      .from('messages')
      .insert(payload)
      .select('id, content, created_at, sender_id, receiver_id, batch_id, is_broadcast')

    if (error) {
      toast.error(error.message)
    } else {
      isBcastNearBottomRef.current = true
      setBroadcasts((b) => [...b, ...groupBroadcastMessages(data ?? [])])
      setBcastText('')
      toast.success(
        `Sent to ${ids.length} student${ids.length !== 1 ? 's' : ''} in ${selectedBatch.name}!`
      )
      setTimeout(() => bcastBottomRef.current?.scrollIntoView?.({ behavior: 'smooth' }), 50)
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

    // 1. Exact unread counts
    const { data: unreadRows } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('receiver_id', user.id)
      .eq('is_read', false)

    const ur = {}
    ;(unreadRows || []).forEach((r) => {
      ur[r.sender_id] = (ur[r.sender_id] || 0) + 1
    })
    setUnread(ur)

    // 2. Recent direct messages
    const { data: recentMsgs } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(300)

    const lm = {}
    ;(recentMsgs || []).forEach((m) => {
      const other = m.sender_id === user.id ? m.receiver_id : m.sender_id
      // Prioritize 1-on-1 direct message for conversation preview
      if (!lm[other] || (lm[other].is_broadcast && !m.is_broadcast)) {
        lm[other] = m
      }
    })
    setLastMsgs(lm)

    // 3. Ensure contacts with existing history are never missing (even if canMsgStudents is false)
    const partnerIds = Array.from(new Set([...Object.keys(ur), ...Object.keys(lm)])).filter(Boolean)
    if (partnerIds.length > 0) {
      setContacts((prev) => {
        const known = new Set(prev.map((c) => c.id))
        const missing = partnerIds.filter((id) => !known.has(id))
        if (missing.length === 0) return prev

        supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', missing)
          .then(({ data: extraProfiles }) => {
            if (extraProfiles?.length) {
              setContacts((current) => {
                const curKnown = new Set(current.map((c) => c.id))
                const toAdd = extraProfiles.filter((p) => !curKnown.has(p.id))
                return toAdd.length > 0 ? [...current, ...toAdd] : current
              })
            }
          })
        return prev
      })
    }
  }, [user])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    if (!selected || !user) return
    let cancelled = false
    isNearBottomRef.current = true

    supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${selected.id}),and(sender_id.eq.${selected.id},receiver_id.eq.${user.id})`
      )
      .order('created_at')
      .then(({ data }) => {
        if (cancelled) return
        setMessages(data ?? [])
        supabase
          .from('messages')
          .update({ is_read: true })
          .eq('receiver_id', user.id)
          .eq('sender_id', selected.id)
          .eq('is_read', false)
          .then(() => {
            if (cancelled) return
            setUnread((u) => {
              const n = { ...u }
              delete n[selected.id]
              return n
            })
          })
      })
    return () => {
      cancelled = true
    }
  }, [selected, user])

  // Realtime synchronization for teacher direct messages
  useEffect(() => {
    if (!user) return
    const ch = supabase
      .channel(`teacher_msgs_sync_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        ({ new: msg }) => {
          if (msg.sender_id === selectedRef.current?.id) {
            setMessages((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]))
            supabase.from('messages').update({ is_read: true }).eq('id', msg.id).then(() => {})
          } else {
            setUnread((u) => ({ ...u, [msg.sender_id]: (u[msg.sender_id] || 0) + 1 }))
          }
          setLastMsgs((lm) => ({ ...lm, [msg.sender_id]: msg }))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        ({ new: msg }) => {
          if (msg.sender_id === user.id) {
            setMessages((m) => m.map((x) => (x.id === msg.id ? { ...x, ...msg } : x)))
            setLastMsgs((lm) =>
              lm[msg.receiver_id]?.id === msg.id
                ? { ...lm, [msg.receiver_id]: { ...lm[msg.receiver_id], ...msg } }
                : lm
            )
          } else if (msg.receiver_id === user.id) {
            setMessages((m) => m.map((x) => (x.id === msg.id ? { ...x, ...msg } : x)))
            if (msg.is_read) {
              setUnread((u) => {
                const cur = u[msg.sender_id]
                if (!cur) return u
                const next = cur - 1
                if (next <= 0) {
                  const copy = { ...u }
                  delete copy[msg.sender_id]
                  return copy
                }
                return { ...u, [msg.sender_id]: next }
              })
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
        },
        ({ old: msg }) => {
          if (!msg?.id) return
          setMessages((m) => m.filter((x) => x.id !== msg.id))
          loadSummary()
        }
      )
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [user, loadSummary])

  // Smart auto-scroll for direct messages
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    isNearBottomRef.current = scrollHeight - (scrollTop + clientHeight) < 120
  }

  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' })
    }
  }, [messages])

  const send = async () => {
    if (!text.trim() || !selected || sending) return

    // If selected is a student and teacher lacks permission, block send
    if (selected.role === 'student' && !canMsgStudents) {
      toast.error('You do not have permission to message students.')
      return
    }

    setSending(true)
    const content = text.trim()
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: selected.id,
        content,
        is_broadcast: false,
      })
      .select()
      .maybeSingle()

    if (error) {
      toast.error(error.message)
    } else {
      isNearBottomRef.current = true
      setMessages((m) => [...m, data])
      setLastMsgs((lm) => ({ ...lm, [selected.id]: data }))
      setText('')
      setTimeout(() => bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' }), 50)
      inputRef.current?.focus()
    }
    setSending(false)
  }

  const openConvo = (c) => {
    setSelected(c)
    setShowList(false)
    setUnread((u) => {
      const n = { ...u }
      delete n[c.id]
      return n
    })
  }

  const filteredContacts = useMemo(() => {
    const q = search.toLowerCase()
    return [...contacts]
      .filter(
        (c) =>
          !q ||
          (c.full_name?.toLowerCase() || '').includes(q) ||
          (c.role?.toLowerCase() || '').includes(q)
      )
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
      const tail =
        !next ||
        next.sender_id !== m.sender_id ||
        Boolean(next.is_broadcast) !== Boolean(m.is_broadcast) ||
        new Date(next.created_at).toDateString() !== dk
      items.push({ type: 'msg', ...m, tail })
    })
    return items
  }, [messages])

  const bcastGrouped = useMemo(() => {
    const items = []
    let lastDate = null
    broadcasts.forEach((b) => {
      const dk = new Date(b.created_at).toDateString()
      if (dk !== lastDate) {
        items.push({ type: 'sep', label: sepLabel(b.created_at), key: dk })
        lastDate = dk
      }
      items.push({ type: 'msg', ...b })
    })
    return items
  }, [broadcasts])

  if (loading) {
    return (
      <div className="flex flex-1 min-h-0 h-[calc(100dvh-7.5rem)] lg:h-[calc(100dvh-5.5rem)] items-center justify-center rounded-2xl border border-gray-200">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 min-h-0 h-[calc(100dvh-7.5rem)] lg:h-[calc(100dvh-5.5rem)] bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* ── Sidebar ── */}
      <div
        className={`${
          showList ? 'flex' : 'hidden'
        } lg:flex flex-col w-full lg:w-80 border-r border-gray-100 flex-shrink-0`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">Messages</h2>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => switchMode('direct')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
              mode === 'direct'
                ? 'text-violet-600 border-b-2 border-violet-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <MessageCircle className="h-3.5 w-3.5" /> Direct
          </button>
          <button
            onClick={() => switchMode('broadcast')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
              mode === 'broadcast'
                ? 'text-violet-600 border-b-2 border-violet-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
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
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search contacts"
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
              {filteredContacts.map((c) => {
                const lm = lastMsgs[c.id]
                const cnt = unread[c.id] || 0
                const mine = lm?.sender_id === user?.id
                return (
                  <button
                    key={c.id}
                    onClick={() => openConvo(c)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      selected?.id === c.id ? 'bg-violet-50/50' : 'hover:bg-gray-50/70'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-full ${roleBg(
                        c.role
                      )} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}
                    >
                      {initials(c.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-sm truncate ${
                            cnt > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'
                          }`}
                        >
                          {c.full_name}
                        </p>
                        {lm && (
                          <span
                            className={`text-[11px] flex-shrink-0 ${
                              cnt > 0 ? 'text-violet-600 font-medium' : 'text-gray-400'
                            }`}
                          >
                            {shortTime(lm.created_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p className="text-xs text-gray-400 truncate flex-1 flex items-center gap-1 min-w-0">
                          {lm ? (
                            <>
                              {mine &&
                                (lm.is_read ? (
                                  <CheckCheck className="h-3 w-3 text-violet-500 flex-shrink-0" />
                                ) : (
                                  <Check className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                ))}
                              {lm.is_broadcast && (
                                <Megaphone className="h-3 w-3 text-amber-500 flex-shrink-0" />
                              )}
                              <span
                                className={`truncate ${
                                  cnt > 0 ? 'font-medium text-gray-700' : ''
                                }`}
                              >
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
          </>
        ) : (
          /* Broadcast sidebar: list of batches */
          <>
            <div className="px-3 py-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
                <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  placeholder="Search batches"
                  className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
                />
                {batchSearch && (
                  <button
                    onClick={() => setBatchSearch('')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {batches.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">
                  No assigned batches found.
                </div>
              ) : (
                batches
                  .filter((b) =>
                    !batchSearch ||
                    b.name?.toLowerCase().includes(batchSearch.toLowerCase()) ||
                    b.subject?.toLowerCase().includes(batchSearch.toLowerCase())
                  )
                  .map((b) => {
                    const isSel = selectedBatch?.id === b.id
                    return (
                      <button
                        key={b.id}
                        onClick={() => openBatch(b)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-gray-50 transition-colors ${
                          isSel ? 'bg-violet-50/60' : 'hover:bg-gray-50/70'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-xs">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm truncate font-semibold ${
                              isSel ? 'text-violet-900' : 'text-gray-800'
                            }`}
                          >
                            {b.name}
                          </p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {b.subject || 'All Subjects'}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      </button>
                    )
                  })
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Main Area ── */}
      <div className={`${!showList ? 'flex' : 'hidden'} lg:flex flex-col flex-1 min-w-0`}>
        {mode === 'direct' ? (
          !selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-700">Direct Messages</p>
              <p className="text-sm text-gray-400">Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              {/* Direct header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0 bg-white">
                <button
                  onClick={() => setShowList(true)}
                  className="lg:hidden -ml-1 p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                  aria-label="Back to contacts"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div
                  className={`w-9 h-9 rounded-full ${roleBg(
                    selected.role
                  )} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}
                >
                  {initials(selected.full_name)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                    {selected.full_name}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">{selected.role}</p>
                </div>
              </div>

              {/* Direct messages */}
              <div
                className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5"
                onScroll={handleScroll}
              >
                {messages.length === 0 && (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
                  </div>
                )}

                {grouped.map((item) => {
                  if (item.type === 'sep') {
                    return (
                      <div key={item.key} className="flex items-center gap-3 my-4">
                        <hr className="flex-1 border-gray-100" />
                        <span className="text-xs text-gray-400">{item.label}</span>
                        <hr className="flex-1 border-gray-100" />
                      </div>
                    )
                  }

                  const mine = item.sender_id === user.id
                  return (
                    <div
                      key={item.id}
                      className={`flex items-end gap-2 ${
                        mine ? 'justify-end' : 'justify-start'
                      } ${item.tail ? 'mb-3' : 'mb-0.5'}`}
                    >
                      {!mine && (
                        <div
                          className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-semibold self-end ${
                            item.tail ? roleBg(selected.role) : 'invisible'
                          }`}
                        >
                          {item.tail ? initials(selected.full_name) : ''}
                        </div>
                      )}

                      <div
                        className={`max-w-[75%] lg:max-w-[60%] px-3.5 py-2 ${
                          mine
                            ? `bg-gradient-to-br from-violet-500 to-indigo-600 text-white ${
                                item.tail ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl'
                              }`
                            : `bg-gray-100 text-gray-900 ${
                                item.tail ? 'rounded-2xl rounded-bl-sm' : 'rounded-2xl'
                              }`
                        }`}
                      >
                        {item.is_broadcast && (
                          <div
                            className={`inline-flex items-center gap-1 mb-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                              mine
                                ? 'bg-white/20 text-white'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            <Megaphone className="h-3 w-3" />
                            <span>Broadcast Announcement</span>
                          </div>
                        )}

                        <div className="text-sm break-words leading-relaxed whitespace-pre-wrap">
                          {renderMessageContent(item.content, mine)}
                        </div>

                        {item.attachment_url && (
                          <div>
                            <a
                              href={item.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                mine
                                  ? 'bg-white/20 hover:bg-white/30 text-white'
                                  : 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-xs'
                              }`}
                            >
                              <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate max-w-[200px]">View Attachment</span>
                              <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-70" />
                            </a>
                          </div>
                        )}

                        <div
                          className={`flex items-center gap-1 mt-0.5 ${
                            mine ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <span
                            className={`text-[10px] leading-none ${
                              mine ? 'text-white/60' : 'text-gray-400'
                            }`}
                          >
                            {new Date(item.created_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {mine &&
                            (item.is_read ? (
                              <CheckCheck className="h-3 w-3 text-white/70" />
                            ) : (
                              <Check className="h-3 w-3 text-white/50" />
                            ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Direct input */}
              {selected.role === 'student' && !canMsgStudents ? (
                <div className="flex items-center gap-2 px-4 py-3 border-t border-amber-200 bg-amber-50 text-amber-800 text-xs font-medium">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600" />
                  <span>Student messaging permission is currently disabled by administrator.</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 flex-shrink-0 bg-white">
                  <div className="flex-1 flex items-center bg-gray-100 rounded-2xl px-4 py-2.5">
                    <input
                      ref={inputRef}
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          send()
                        }
                      }}
                      placeholder={`Message ${selected.full_name}…`}
                      className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
                    />
                  </div>
                  <button
                    onClick={send}
                    disabled={sending || !text.trim()}
                    className="w-9 h-9 flex items-center justify-center rounded-full transition-colors flex-shrink-0 disabled:text-gray-300 enabled:text-violet-600 enabled:hover:bg-violet-50"
                    aria-label="Send message"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              )}
            </>
          )
        ) : /* ── Broadcast area ── */
        !selectedBatch ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
            <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center">
              <Megaphone className="h-8 w-8 text-violet-400" />
            </div>
            <p className="font-semibold text-gray-700">Broadcast to a Batch</p>
            <p className="text-sm text-gray-400 max-w-xs">
              Select a batch from the sidebar to send an announcement to all enrolled students at once.
            </p>
          </div>
        ) : (
          <>
            {/* Broadcast header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0 bg-white">
              <button
                onClick={() => {
                  setShowList(true)
                  setSelectedBatch(null)
                }}
                className="lg:hidden -ml-1 p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                aria-label="Back to batches"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-xs">
                <Megaphone className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                  {selectedBatch.name}
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <Users className="h-3 w-3" /> Broadcast to all enrolled students
                </p>
              </div>
            </div>

            {/* Broadcast history */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4"
              onScroll={handleBcastScroll}
            >
              {bcastLoading ? (
                <div className="flex justify-center items-center h-full">
                  <p className="text-sm text-gray-400">Loading broadcasts…</p>
                </div>
              ) : broadcasts.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-full gap-2 text-center">
                  <Megaphone className="h-10 w-10 text-gray-200" />
                  <p className="text-sm text-gray-400">No broadcasts sent to this batch yet.</p>
                  <p className="text-xs text-gray-300">
                    Type a message below to broadcast to all students in {selectedBatch.name}.
                  </p>
                </div>
              ) : (
                bcastGrouped.map((item) => {
                  if (item.type === 'sep') {
                    return (
                      <div key={item.key} className="flex items-center gap-3 my-4">
                        <hr className="flex-1 border-gray-100" />
                        <span className="text-xs text-gray-400">{item.label}</span>
                        <hr className="flex-1 border-gray-100" />
                      </div>
                    )
                  }
                  return (
                    <div key={item.id} className="flex justify-end mb-3">
                      <div className="max-w-[75%] lg:max-w-[60%]">
                        <div className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white px-3.5 py-2.5 rounded-2xl rounded-br-sm shadow-xs">
                          <p className="text-sm break-words leading-relaxed whitespace-pre-wrap">
                            {renderMessageContent(item.body, true)}
                          </p>
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          <span className="text-[10px] text-gray-400">
                            {new Date(item.created_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="text-[10px] text-violet-600 font-medium flex items-center gap-0.5">
                            <Users className="h-2.5 w-2.5" /> Sent to {item.recipients} student
                            {item.recipients !== 1 ? 's' : ''}
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
            {!canMsgStudents ? (
              <div className="flex items-center gap-2 px-4 py-3 border-t border-amber-200 bg-amber-50 text-amber-800 text-xs font-medium">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600" />
                <span>
                  Messaging students is disabled by administrator. Contact admin to broadcast to this batch.
                </span>
              </div>
            ) : (
              <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0 bg-white">
                <div className="flex items-end gap-3">
                  <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5">
                    <textarea
                      ref={bcastInputRef}
                      value={bcastText}
                      onChange={(e) => setBcastText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendBroadcast()
                        }
                      }}
                      placeholder={`Broadcast message to all students in ${selectedBatch.name}…`}
                      rows={1}
                      className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none resize-none max-h-28"
                    />
                  </div>
                  <button
                    onClick={sendBroadcast}
                    disabled={bcastSending || !bcastText.trim()}
                    className="w-9 h-9 flex items-center justify-center rounded-full transition-colors flex-shrink-0 mb-0.5 disabled:text-gray-300 enabled:text-violet-600 enabled:hover:bg-violet-50"
                    aria-label="Send broadcast"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 pl-1">
                  Enrolled students in <span className="font-medium text-gray-600">{selectedBatch.name}</span> will receive this announcement.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
