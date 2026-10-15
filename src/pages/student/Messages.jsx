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
  Paperclip,
  ExternalLink,
  Trash2,
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

export default function StudentMessages() {
  const { user } = useAuth()
  const location = useLocation()
  const [contacts, setContacts] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [lastMsgs, setLastMsgs] = useState({})
  const [unread, setUnread] = useState({})
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showList, setShowList] = useState(true)
  const [search, setSearch] = useState('')

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const isNearBottomRef = useRef(true)
  const selectedRef = useRef(selected)

  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  // Load contacts: active teachers + admins
  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('role', ['teacher', 'admin'])
      .eq('is_active', true)
      .order('role')
      .then(({ data }) => setContacts(data ?? []))
  }, [])

  // Auto-select contact if query param ?teacher=, ?admin=, or ?contact= is passed in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const targetId = params.get('teacher') || params.get('admin') || params.get('contact')
    if (!targetId || !user) return

    // Guard: already selected
    if (selectedRef.current?.id === targetId) return

    const found = contacts.find((c) => c.id === targetId)
    if (found) {
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
            setSelected(data)
            setShowList(false)
          }
        })
    }
  }, [contacts, location.search, user])

  // Load last-message preview + unread counts for sidebar
  const loadSummary = useCallback(async () => {
    if (!user) return

    // 1. Exact unread counts per sender
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

    // 2. Recent messages for previews
    const { data: recentMsgs } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(300)

    const lm = {}
    ;(recentMsgs || []).forEach((m) => {
      const other = m.sender_id === user.id ? m.receiver_id : m.sender_id
      if (!lm[other]) lm[other] = m
    })
    setLastMsgs(lm)

    // 3. Ensure contacts with existing history are never missing from sidebar
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

  // Load full conversation when a contact is selected
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
        // Mark incoming messages as read
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

  // Realtime synchronization: INSERT, UPDATE, DELETE
  useEffect(() => {
    if (!user) return
    const ch = supabase
      .channel(`student_msgs_sync_${user.id}_${Date.now()}`)
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

          // Ensure sender is present in contacts sidebar
          setContacts((prev) => {
            if (prev.some((c) => c.id === msg.sender_id)) return prev
            supabase
              .from('profiles')
              .select('id, full_name, role')
              .eq('id', msg.sender_id)
              .maybeSingle()
              .then(({ data: newProfile }) => {
                if (newProfile) {
                  setContacts((current) =>
                    current.some((c) => c.id === newProfile.id) ? current : [newProfile, ...current]
                  )
                }
              })
            return prev
          })
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

  // Smart auto-scroll: only scrolls to bottom if user is already near the bottom
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
    setSending(true)
    const content = text.trim()
    const insertPayload = {
      sender_id: user.id,
      receiver_id: selected.id,
      content,
      is_broadcast: false,
    }

    let { data, error } = await supabase
      .from('messages')
      .insert(insertPayload)
      .select()
      .maybeSingle()

    // Automatic fallback if is_broadcast is not in schema cache or does not exist
    if (
      error &&
      (error.code === '42703' ||
        error.code === 'PGRST204' ||
        error.message?.includes('is_broadcast') ||
        error.message?.includes('schema cache'))
    ) {
      delete insertPayload.is_broadcast
      const retry = await supabase
        .from('messages')
        .insert(insertPayload)
        .select()
        .maybeSingle()
      data = retry.data
      error = retry.error
    }

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

  const deleteMessage = async (msgId) => {
    if (!window.confirm('Delete this message?')) return
    const { error } = await supabase.from('messages').delete().eq('id', msgId)
    if (error) {
      toast.error(error.message)
    } else {
      setMessages((m) => m.filter((x) => x.id !== msgId))
      toast.success('Message deleted')
      loadSummary()
    }
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

  // Group messages by date + compute tail
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

  return (
    <div className="flex flex-1 min-h-0 h-[calc(100dvh-12rem)] sm:h-[calc(100dvh-12.5rem)] lg:h-[calc(100dvh-5.5rem)] bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* ── Sidebar ── */}
      <div
        className={`${
          showList ? 'flex' : 'hidden'
        } lg:flex flex-col w-full lg:w-80 border-r border-gray-100 flex-shrink-0`}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">Direct Messages</h2>
        </div>

        <div className="px-3 py-2 flex-shrink-0">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teachers or admins"
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
              {search ? 'No results found' : 'No contacts available'}
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
                  className={`w-12 h-12 rounded-full ${avatarBg(
                    c.full_name
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
      </div>

      {/* ── Chat area ── */}
      <div className={`${!showList ? 'flex' : 'hidden'} lg:flex flex-col flex-1 min-w-0`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-700">Your Messages</p>
            <p className="text-sm text-gray-400">Select a conversation to get started</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0 bg-white">
              <button
                onClick={() => setShowList(true)}
                className="lg:hidden -ml-1 p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                aria-label="Back to contacts"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div
                className={`w-9 h-9 rounded-full ${avatarBg(
                  selected.full_name
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

            {/* Messages container */}
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
                    className={`group flex items-end gap-2 ${
                      mine ? 'justify-end' : 'justify-start'
                    } ${item.tail ? 'mb-3' : 'mb-0.5'}`}
                  >
                    {!mine && (
                      <div
                        className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-semibold self-end ${
                          item.tail ? avatarBg(selected.full_name) : 'invisible'
                        }`}
                      >
                        {item.tail ? initials(selected.full_name) : ''}
                      </div>
                    )}

                    {mine && !item.is_broadcast && (
                      <button
                        onClick={() => deleteMessage(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-rose-500 transition-opacity"
                        title="Delete message"
                        aria-label="Delete message"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
                          <span>Announcement</span>
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

            {/* Input area */}
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
                  placeholder="Type a message…"
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
          </>
        )}
      </div>
    </div>
  )
}
