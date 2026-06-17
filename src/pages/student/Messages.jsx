import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Send, ArrowLeft, MessageCircle, Search, Check, CheckCheck, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const PALETTE = [
  'bg-violet-500','bg-blue-500','bg-emerald-500','bg-rose-500',
  'bg-amber-500','bg-indigo-500','bg-pink-500','bg-teal-500',
]
function avatarBg(str = '') {
  const n = [...str].reduce((a, c) => a + c.charCodeAt(0), 0)
  return PALETTE[n % PALETTE.length]
}
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

export default function Messages() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [lastMsgs, setLastMsgs] = useState({})
  const [unread,   setUnread]   = useState({})
  const [text,     setText]     = useState('')
  const [sending,  setSending]  = useState(false)
  const [showList, setShowList] = useState(true)
  const [search,   setSearch]   = useState('')
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Load contacts: active teachers + admins
  useEffect(() => {
    supabase.from('profiles')
      .select('id, full_name, role')
      .in('role', ['teacher', 'admin'])
      .eq('is_active', true)
      .order('role')
      .then(({ data }) => setContacts(data ?? []))
  }, [])

  // Load last-message preview + unread counts for sidebar
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

  // Load full conversation when a contact is selected
  useEffect(() => {
    if (!selected || !user) return
    supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selected.id}),and(sender_id.eq.${selected.id},receiver_id.eq.${user.id})`)
      .order('created_at')
      .then(({ data }) => {
        setMessages(data ?? [])
        // Mark incoming messages as read
        supabase.from('messages').update({ is_read: true })
          .eq('receiver_id', user.id).eq('sender_id', selected.id).eq('is_read', false)
          .then(() => setUnread(u => { const n = { ...u }; delete n[selected.id]; return n }))
      })
  }, [selected, user])

  // Realtime: incoming messages
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel(`student_msgs_${user.id}`)
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

  // Group messages by date + compute tail (last in consecutive group)
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

  return (
    <div className="flex h-[calc(100vh-8rem)] lg:h-[calc(100vh-5rem)] bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">

      {/* ── Sidebar ── */}
      <div className={`${showList ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-80 border-r border-gray-100 flex-shrink-0`}>

        <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">Direct Messages</h2>
        </div>

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
              {search ? 'No results' : 'No teachers or admins found'}
            </p>
          )}
          {filteredContacts.map(c => {
            const lm   = lastMsgs[c.id]
            const cnt  = unread[c.id] || 0
            const mine = lm?.sender_id === user?.id
            return (
              <button key={c.id} onClick={() => openConvo(c)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                  ${selected?.id === c.id ? 'bg-gray-50' : 'hover:bg-gray-50/70'}`}>
                <div className={`w-12 h-12 rounded-full ${avatarBg(c.full_name)} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
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
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <button onClick={() => setShowList(true)}
                className="lg:hidden -ml-1 p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className={`w-9 h-9 rounded-full ${avatarBg(selected.full_name)} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
                {initials(selected.full_name)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{selected.full_name}</p>
                <p className="text-xs text-gray-400 capitalize">{selected.role}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <div className="flex justify-center items-center h-full">
                  <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
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

                    {/* Received avatar — only on last message in group */}
                    {!mine && (
                      <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-semibold self-end
                        ${item.tail ? avatarBg(selected.full_name) : 'invisible'}`}>
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

            {/* Input */}
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
        )}
      </div>
    </div>
  )
}
