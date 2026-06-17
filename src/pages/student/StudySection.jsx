import { useState, useEffect } from 'react'
import { BookOpen, PlayCircle, ExternalLink, Heart, Youtube, Link as LinkIcon, ChevronLeft, FlaskConical, Atom, Calculator, Globe, Microscope, BookMarked } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import LiveClassBanner from '../../components/shared/LiveClassBanner'
import { normalizeUrl } from '../../utils/formatters'

// Colour palette for subject tiles (cycles if more than 6 subjects)
const SUBJECT_COLORS = [
  { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   icon: 'text-blue-400'   },
  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  icon: 'text-green-400'  },
  { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', icon: 'text-purple-400' },
  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-800',  icon: 'text-amber-400'  },
  { bg: 'bg-rose-50',   border: 'border-rose-200',   text: 'text-rose-800',   icon: 'text-rose-400'   },
  { bg: 'bg-teal-50',   border: 'border-teal-200',   text: 'text-teal-800',   icon: 'text-teal-400'   },
]

function getYTVideoId(url) {
  const match = url?.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([^#&?/]{11})/)
  return match?.[1] ?? null
}

function getYTThumb(url) {
  const id = getYTVideoId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

function getYTWatchUrl(url) {
  const id = getYTVideoId(url)
  return id ? `https://www.youtube.com/watch?v=${id}` : url
}

const TYPE_BADGES = {
  youtube_video:    { label: 'YouTube', color: 'bg-red-100 text-red-700',    icon: <Youtube className="h-3 w-3" /> },
  youtube_playlist: { label: 'Playlist', color: 'bg-red-100 text-red-700',   icon: <Youtube className="h-3 w-3" /> },
  google_drive:     { label: 'Drive',    color: 'bg-blue-100 text-blue-700', icon: <ExternalLink className="h-3 w-3" /> },
  external_link:    { label: 'Link',     color: 'bg-gray-100 text-gray-700', icon: <LinkIcon className="h-3 w-3" /> },
}

function StudyCard({ card, bookmarked, onBookmark }) {
  const thumb = card.thumbnail_url || getYTThumb(card.url)
  const badge = TYPE_BADGES[card.type] || TYPE_BADGES.external_link
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col">
      <div className="relative">
        {thumb
          ? <img src={thumb} alt={card.title} loading="lazy" className="w-full h-40 object-cover" />
          : <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-blue-300" />
            </div>
        }
        {(card.type === 'youtube_video' || card.type === 'youtube_playlist') && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
              <PlayCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-1 mb-1">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
            {badge.icon} {badge.label}
          </span>
          <button onClick={() => onBookmark(card.id, bookmarked)}
            className={`p-1 rounded-full transition-colors ${bookmarked ? 'text-red-500 hover:text-red-700' : 'text-gray-300 hover:text-red-400'}`}>
            <Heart className={`h-4 w-4 ${bookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 flex-1">{card.title}</h3>
        {card.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>}
        <a href={card.type === 'youtube_video' ? getYTWatchUrl(card.url) : normalizeUrl(card.url)} target="_blank" rel="noopener noreferrer"
          className="mt-3 block text-center py-1.5 bg-blue-950 hover:bg-blue-900 text-white text-xs font-semibold rounded-lg transition-colors">
          {card.type?.startsWith('youtube') ? '▶ Watch' : '→ Open'}
        </a>
      </div>
    </div>
  )
}

const TABS = ['All', 'My Batch', 'Featured', 'Bookmarked']

export default function StudySection() {
  const { user } = useAuth()
  const [cards,            setCards]            = useState([])
  const [bookmarks,        setBookmarks]        = useState(new Set())
  const [tab,              setTab]              = useState('All')
  const [loading,          setLoading]          = useState(true)
  const [liveClass,        setLiveClass]        = useState(null)
  const [liveDismissed,    setLiveDismissed]    = useState(false)
  const [batchId,          setBatchId]          = useState(null)
  const [studentSubjects,  setStudentSubjects]  = useState([])
  const [selectedSubject,  setSelectedSubject]  = useState(null) // null = show subject grid

  // Get student batch + subjects
  useEffect(() => {
    if (!user) return
    supabase.from('student_profiles').select('batch_id, subjects').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        setBatchId(data?.batch_id ?? null)
        setStudentSubjects(data?.subjects ?? [])
      })
  }, [user])

  // Fetch live class (realtime) — filtered to student's batch
  useEffect(() => {
    if (!user) return
    let unmounted = false

    const fetchLive = () => {
      let q = supabase.from('live_classes').select('*, profiles!teacher_id(full_name)')
        .eq('is_active', true).order('created_at', { ascending: false }).limit(1)
      // All-batch classes + the student's own batch only.
      if (batchId) q = q.or(`batch_id.is.null,batch_id.eq.${batchId}`)
      else         q = q.is('batch_id', null)
      q.then(({ data }) => { if (!unmounted) setLiveClass(data?.[0] ?? null) })
    }

    fetchLive()
    setLiveDismissed(false)

    const channel = supabase.channel(`live_classes_study_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_classes' },
        (payload) => {
          if (unmounted) return
          // Class ended or deleted: clear immediately without a DB round-trip
          if (
            payload.eventType === 'DELETE' ||
            (payload.eventType === 'UPDATE' && !payload.new?.is_active)
          ) {
            setLiveClass(null)
          } else {
            fetchLive()
          }
        }
      )
      .subscribe()

    return () => {
      unmounted = true
      supabase.removeChannel(channel)
    }
  }, [user, batchId])

  // Fetch cards — for My Batch we only fetch when a subject is selected
  useEffect(() => {
    if (!user) return
    // When on My Batch tab with no subject selected, we show the subject grid — no card fetch needed
    if (tab === 'My Batch' && selectedSubject === null) { setCards([]); setLoading(false); return }

    setLoading(true)
    let query = supabase.from('study_cards').select('*').eq('is_active', true).order('display_order')
    if (tab === 'Featured') {
      query = query.eq('is_featured', true)
    } else if (tab === 'My Batch') {
      // selectedSubject is set — cards that include this batch AND match the subject
      if (batchId) query = query.contains('batch_ids', [batchId]).eq('subject', selectedSubject)
      else         query = query.eq('is_public', false).eq('id', '00000000-0000-0000-0000-000000000000') // empty
    } else if (tab === 'All' || tab === 'Bookmarked') {
      // public cards OR cards for this batch
      if (batchId) query = query.or(`is_public.eq.true,batch_ids.cs.{${batchId}}`)
      else         query = query.eq('is_public', true)
    }
    query.then(({ data }) => { setCards(data ?? []); setLoading(false) })
  }, [tab, batchId, selectedSubject, user])

  // Fetch bookmarks
  useEffect(() => {
    if (!user) return
    supabase.from('student_bookmarks').select('study_card_id').eq('student_id', user.id)
      .then(({ data }) => setBookmarks(new Set((data ?? []).map(b => b.study_card_id))))
  }, [user])

  const toggleBookmark = async (cardId, isBookmarked) => {
    if (isBookmarked) {
      const { error } = await supabase.from('student_bookmarks').delete().eq('student_id', user.id).eq('study_card_id', cardId)
      if (error) { toast.error(error.message); return }
      setBookmarks(s => { const n = new Set(s); n.delete(cardId); return n })
      toast.success('Removed from bookmarks')
    } else {
      // ignoreDuplicates: a fast double-tap or a stale UI must not error out.
      const { error } = await supabase.from('student_bookmarks')
        .upsert({ student_id: user.id, study_card_id: cardId }, { onConflict: 'student_id,study_card_id', ignoreDuplicates: true })
      if (error) { toast.error(error.message); return }
      setBookmarks(s => new Set(s).add(cardId))
      toast.success('Bookmarked!')
    }
  }

  const displayCards = tab === 'Bookmarked' ? cards.filter(c => bookmarks.has(c.id)) : cards

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      {/* Live class banner */}
      {liveClass && !liveDismissed && (
        <LiveClassBanner liveClass={liveClass} onDismiss={() => setLiveDismissed(true)} />
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap items-center">
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); setSelectedSubject(null) }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${tab === t ? 'bg-blue-950 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {t}
          </button>
        ))}
        {tab === 'My Batch' && selectedSubject && (
          <button onClick={() => setSelectedSubject(null)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 ml-1">
            <ChevronLeft className="h-4 w-4" /> All Subjects
          </button>
        )}
      </div>

      {/* My Batch — subject breadcrumb */}
      {tab === 'My Batch' && selectedSubject && (
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <span>My Batch</span>
          <span>›</span>
          <span className="font-semibold text-gray-900">{selectedSubject}</span>
        </div>
      )}

      {/* My Batch — subject tile grid (shown when no subject is selected) */}
      {tab === 'My Batch' && selectedSubject === null ? (
        !batchId ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <BookOpen className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">You are not enrolled in a batch yet. Contact admin.</p>
          </div>
        ) : studentSubjects.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <BookOpen className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No subjects chosen yet. Contact admin to update your enrollment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {studentSubjects.map((sub, i) => {
              const col = SUBJECT_COLORS[i % SUBJECT_COLORS.length]
              return (
                <button key={sub} onClick={() => setSelectedSubject(sub)}
                  className={`${col.bg} ${col.border} border-2 rounded-2xl p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all`}>
                  <BookMarked className={`h-7 w-7 ${col.icon} mb-3`} />
                  <p className={`font-bold text-base ${col.text}`}>{sub}</p>
                  <p className="text-xs text-gray-400 mt-1">Tap to view lectures</p>
                </button>
              )
            })}
          </div>
        )
      ) : (
        /* Cards grid — used for All, Featured, Bookmarked, and My Batch after subject is selected */
        loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-40 bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : displayCards.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <BookOpen className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {tab === 'Bookmarked'
                ? 'No bookmarks yet. Heart a lecture to save it here.'
                : tab === 'My Batch'
                  ? `No study cards for ${selectedSubject} yet.`
                  : 'No lectures here yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayCards.map(c => (
              <StudyCard key={c.id} card={c} bookmarked={bookmarks.has(c.id)} onBookmark={toggleBookmark} />
            ))}
          </div>
        )
      )}

    </div>
  )
}
