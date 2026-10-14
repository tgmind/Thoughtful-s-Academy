import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom'
import {
  ArrowLeft, BookOpen, Heart, Maximize2, Minimize2,
  ListVideo, Sparkles, PlayCircle, ExternalLink,
  ChevronRight, Layers, Clock, Search, Radio,
  ShieldCheck, CheckCircle2, Send, HelpCircle,
  FileText, Keyboard, X, LogIn, Trash2,
  AlertCircle, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { normalizeUrl } from '../../utils/formatters'
import {
  getYTPlaylistId,
  getYTVideoId,
  resolveYouTubeMedia,
  fetchPlaylistItems,
  getLectureProgress
} from '../../utils/youtube'
import ProtectedVideoPlayer from '../../components/shared/ProtectedVideoPlayer'
import {
  createDoubt,
  fetchStudentDoubtsForLecture,
  deleteDoubt,
  subscribeToDoubts,
  getDoubtEligibility,
  DOUBT_ELIGIBILITY_STATUS,
} from '../../services/doubtService'

function formatSeconds(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00'
  const s = Math.floor(seconds)
  const hrs = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

export default function WatchLecture() {
  const { cardId: paramCardId } = useParams()
  const [searchParams] = useSearchParams()
  const cardId = paramCardId || searchParams.get('cardId') || searchParams.get('id')
  const timestampParam = parseInt(searchParams.get('t') || searchParams.get('timestamp') || '0', 10)
  const initialSeekSeconds = !isNaN(timestampParam) && timestampParam > 0 ? timestampParam : 0

  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, loading: authLoading } = useAuth()
  const rolePrefix = profile?.role === 'admin' ? '/admin' : profile?.role === 'teacher' ? '/teacher' : '/student'
  const isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin'
  const [studentProfile, setStudentProfile] = useState(null)
  const [studentProfileLoading, setStudentProfileLoading] = useState(false)
  const [studentProfileError, setStudentProfileError] = useState(null)
  const [cardBatchName, setCardBatchName] = useState(location.state?.card?.batches?.name || '')

  const cinemaStageRef = useRef(null)
  const queueScrollRef = useRef(null)

  const stateCard = location.state?.card
  const isMatchingCard = stateCard && (!cardId || stateCard.id === cardId)
  const [card, setCard] = useState(isMatchingCard ? stateCard : null)
  const [loading, setLoading] = useState(!isMatchingCard && !!cardId)
  const [relatedCards, setRelatedCards] = useState([])
  const [notesResources, setNotesResources] = useState([])
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [bookmarkLoading, setBookmarkLoading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Current Video Playback Time for Timestamps & Doubts
  const [playbackTime, setPlaybackTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)

  // Active Classroom Tab: 'curriculum' | 'notes' | 'doubts'
  const [activeTab, setActiveTab] = useState(() => (initialSeekSeconds > 0 ? 'doubts' : 'notes'))

  // Doubt submission states
  const [doubtText, setDoubtText] = useState('')
  const [doubtSending, setDoubtSending] = useState(false)
  const [recentDoubts, setRecentDoubts] = useState([])
  const [educatorLectureDoubts, setEducatorLectureDoubts] = useState([])
  const [educatorDoubtsLoading, setEducatorDoubtsLoading] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)

  // Playlist State
  const [playlistItems, setPlaylistItems] = useState([])
  const [playlistLoading, setPlaylistLoading] = useState(false)
  const [activeVideoIndex, setActiveVideoIndex] = useState(0)
  const [playlistSearch, setPlaylistSearch] = useState('')
  const [dynamicTitle, setDynamicTitle] = useState('')
  const [discoveredListId, setDiscoveredListId] = useState(null)

  // Authoritative Doubt Eligibility State Machine
  const eligibilityStatus = getDoubtEligibility({
    authLoading,
    user,
    profile,
    studentProfile,
    studentProfileLoading,
    studentProfileError,
    card,
    cardLoading: loading,
  })
  const canAskDoubt = eligibilityStatus === DOUBT_ELIGIBILITY_STATUS.STUDENT_ELIGIBLE

  const effectivePlaylistId = card?.url ? (getYTPlaylistId(card.url) || discoveredListId) : discoveredListId
  const hasMultipleLectures = Boolean(
    (card?.type === 'youtube_playlist' || !!effectivePlaylistId) &&
    playlistItems &&
    playlistItems.length > 1
  )

  // Default tab synchronization: On single video, 'curriculum' vanishes, so default to notes/doubts.
  useEffect(() => {
    if (!hasMultipleLectures && activeTab === 'curriculum') {
      setActiveTab(initialSeekSeconds > 0 ? 'doubts' : 'notes')
    }
  }, [hasMultipleLectures, activeTab, initialSeekSeconds])

  useEffect(() => {
    if (hasMultipleLectures && activeTab === 'notes' && !initialSeekSeconds) {
      setActiveTab('curriculum')
    }
  }, [hasMultipleLectures, initialSeekSeconds])

  // Fetch card details if not passed in matching navigation state
  useEffect(() => {
    if (!cardId) return
    if (location.state?.card && location.state.card.id === cardId) {
      setCard(location.state.card)
      setLoading(false)
      return
    }
    let active = true

    setLoading(true)
    supabase
      .from('study_cards')
      .select('*, batches:batch_id(name)')
      .eq('id', cardId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) {
          setCard(data ?? null)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [cardId, location.state?.card])

  // Synchronize authoritative batch name for current card
  useEffect(() => {
    if (card?.batches?.name) {
      setCardBatchName(card.batches.name)
    } else if (card?.batch_id) {
      supabase
        .from('batches')
        .select('name')
        .eq('id', card.batch_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.name) setCardBatchName(data.name)
        })
    } else if (Array.isArray(card?.batch_ids) && card.batch_ids[0]) {
      supabase
        .from('batches')
        .select('name')
        .eq('id', card.batch_ids[0])
        .maybeSingle()
        .then(({ data }) => {
          if (data?.name) setCardBatchName(data.name)
        })
    } else {
      setCardBatchName('')
    }
  }, [card?.batch_id, card?.batch_ids, card?.batches?.name])

  // Multi-tier playlist hydration on card load
  useEffect(() => {
    if (!card) return
    const { isPlaylist: isPl, playlistId: lId, videoId: initVid } = resolveYouTubeMedia(card.url, card.thumbnail_url, card.type)

    if (isPl || lId || card.type === 'youtube_playlist') {
      setPlaylistLoading(true)
      fetchPlaylistItems(lId, initVid, card.title).then((result) => {
        const items = Array.isArray(result) ? result : []
        const discoveredId = result?.discoveredListId || items.discoveredListId || null
        if (discoveredId && !lId) {
          setDiscoveredListId(discoveredId)
        }
        if (items && items.length > 0) {
          setPlaylistItems(items)
        }
        setPlaylistLoading(false)
      }).catch(() => {
        setPlaylistLoading(false)
      })
    } else {
      setPlaylistItems([])
      setPlaylistLoading(false)
    }
  }, [card])

  // Fetch subject notes & PDFs
  useEffect(() => {
    if (!card?.subject) return
    supabase
      .from('study_cards')
      .select('*')
      .eq('is_active', true)
      .eq('subject', card.subject)
      .in('type', ['google_drive', 'external_link'])
      .limit(6)
      .then(({ data }) => {
        setNotesResources(data ?? [])
      })
  }, [card?.subject])

  // Fetch student profile for authoritative batch and roll number
  const fetchStudentProfile = useCallback(async (uid) => {
    if (!uid) {
      setStudentProfile(null)
      setStudentProfileLoading(false)
      setStudentProfileError(null)
      return
    }

    setStudentProfileLoading(true)
    setStudentProfileError(null)

    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('roll_number, batch_id, subjects, batches(id, name)')
        .eq('id', uid)
        .maybeSingle()

      if (error) throw error
      setStudentProfile(data ?? { batch_id: null, roll_number: null, batches: null, subjects: [] })
    } catch (err) {
      setStudentProfileError(err)
    } finally {
      setStudentProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.id && profile?.role === 'student') {
      fetchStudentProfile(user.id)
    } else {
      setStudentProfile(null)
      setStudentProfileLoading(false)
      setStudentProfileError(null)
    }
  }, [user?.id, profile?.role, fetchStudentProfile])

  // Fetch recent doubts for this lecture & student via doubtService (only for enrolled students)
  useEffect(() => {
    if (!user?.id || !card?.id || !canAskDoubt) {
      setRecentDoubts([])
      return
    }

    let active = true
    const loadStudentDoubts = () => {
      fetchStudentDoubtsForLecture(user.id, card.id)
        .then((data) => {
          if (active) setRecentDoubts(data ?? [])
        })
        .catch(() => {
          if (active) setRecentDoubts([])
        })
    }

    loadStudentDoubts()

    const unsubscribe = subscribeToDoubts((payload) => {
      if (!active) return
      if (payload?.new?.study_card_id === card.id || payload?.old?.study_card_id === card.id) {
        loadStudentDoubts()
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [user?.id, card?.id, canAskDoubt])

  // Fetch educator doubts for this lecture (for teachers and admins)
  useEffect(() => {
    if (!user?.id || !card?.id || !isTeacherOrAdmin) {
      setEducatorLectureDoubts([])
      return
    }
    let active = true

    const loadEducatorDoubts = () => {
      setEducatorDoubtsLoading(true)
      supabase
        .from('doubts')
        .select('*')
        .eq('study_card_id', card.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (active) {
            setEducatorLectureDoubts(!error && data ? data : [])
            setEducatorDoubtsLoading(false)
          }
        })
        .catch(() => {
          if (active) setEducatorDoubtsLoading(false)
        })
    }

    loadEducatorDoubts()

    const unsubscribe = subscribeToDoubts((payload) => {
      if (!active) return
      if (payload?.new?.study_card_id === card.id || payload?.old?.study_card_id === card.id) {
        loadEducatorDoubts()
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [user?.id, card?.id, isTeacherOrAdmin])

  // Educator resolve doubt handler
  const handleEducatorMarkAddressed = async (doubtId) => {
    try {
      const { markDoubtAddressed } = await import('../../services/doubtService')
      await markDoubtAddressed(doubtId, user.id, profile?.full_name || 'Educator')
      setEducatorLectureDoubts((prev) =>
        prev.map((d) => (d.id === doubtId ? { ...d, status: 'addressed', addressed_by_name: profile?.full_name || 'Educator' } : d))
      )
      toast.success('Doubt marked as addressed in class!')
    } catch (err) {
      toast.error(err.message || 'Failed to update doubt')
    }
  }

  // Synchronize full playlist if discovered directly by in-app player instance
  const handlePlaylistSync = useCallback((discoveredVideoIds) => {
    if (!Array.isArray(discoveredVideoIds) || discoveredVideoIds.length === 0) return
    setPlaylistItems((prev) => {
      if (prev.length >= discoveredVideoIds.length && prev.some(p => p.title && !p.title.startsWith('Lecture #'))) {
        return prev
      }
      return discoveredVideoIds.map((vid, idx) => {
        const existing = prev.find(p => p.videoId === vid || p.index === idx)
        if (existing && existing.title && !existing.title.startsWith('Lecture #')) {
          return existing
        }
        return {
          index: idx,
          videoId: vid,
          title: existing?.title || `Lecture #${idx + 1}`,
          thumb: existing?.thumb || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        }
      })
    })
  }, [])

  // Synchronize index when YouTube player auto-advances
  const handleIndexChange = useCallback((newIndex) => {
    if (typeof newIndex === 'number' && newIndex >= 0) {
      setActiveVideoIndex((prev) => (prev === newIndex ? prev : newIndex))
    }
  }, [])

  // Synchronize dynamic title when player reports active video title
  const handleVideoTitleChange = useCallback((title, vid) => {
    if (title) {
      setDynamicTitle((prev) => (prev === title ? prev : title))
      setPlaylistItems((prev) => {
        const existing = prev.find((item) => item.videoId === vid)
        if (existing && existing.title === title) return prev
        if (!existing) return prev
        return prev.map((item) =>
          item.videoId === vid ? { ...item, title } : item
        )
      })
    }
  }, [])

  // Time tracker from player
  const handleTimeUpdate = useCallback((cur, dur) => {
    if (typeof cur === 'number') setPlaybackTime(cur)
    if (typeof dur === 'number' && dur > 0) setVideoDuration(dur)
  }, [])

  // Auto-scroll active lecture into view in queue drawer
  useEffect(() => {
    if (!queueScrollRef.current) return
    const activeEl = queueScrollRef.current.querySelector(`[data-queue-index="${activeVideoIndex}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeVideoIndex])

  // Fetch bookmark status for current user
  useEffect(() => {
    if (!user || !cardId) return
    supabase
      .from('student_bookmarks')
      .select('id')
      .eq('student_id', user.id)
      .eq('study_card_id', cardId)
      .maybeSingle()
      .then(({ data }) => setIsBookmarked(!!data))
  }, [user, cardId])

  // Fetch related video lectures from same subject
  useEffect(() => {
    if (!card?.subject) return
    supabase
      .from('study_cards')
      .select('*')
      .eq('is_active', true)
      .eq('subject', card.subject)
      .neq('id', card.id)
      .or('type.eq.youtube_video,type.eq.youtube_playlist')
      .limit(6)
      .then(({ data }) => setRelatedCards(data ?? []))
  }, [card?.subject, card?.id])

  // Landscape Cinema Fullscreen Toggle
  const handleFullscreen = useCallback(async () => {
    const el = cinemaStageRef.current
    if (!el) return

    if (!document.fullscreenElement) {
      try {
        await el.requestFullscreen()
        try {
          await screen.orientation?.lock?.('landscape')
        } catch { /* Fallback */ }
      } catch { /* Fallback */ }
    } else {
      try { screen.orientation?.unlock?.() } catch { /* Fallback */ }
      document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  // Sync fullscreen state
  useEffect(() => {
    const handler = () => {
      const isFull = !!document.fullscreenElement
      setIsFullscreen(isFull)
      if (!isFull) {
        try { screen.orientation?.unlock?.() } catch { /* Fallback */ }
      }
    }
    document.addEventListener('fullscreenchange', handler)
    return () => {
      document.removeEventListener('fullscreenchange', handler)
      try { screen.orientation?.unlock?.() } catch { /* Fallback */ }
    }
  }, [])

  // Toggle Bookmark
  const toggleBookmark = async () => {
    if (!user || bookmarkLoading || !card) return
    setBookmarkLoading(true)

    if (isBookmarked) {
      const { error } = await supabase
        .from('student_bookmarks')
        .delete()
        .eq('student_id', user.id)
        .eq('study_card_id', card.id)

      if (!error) {
        setIsBookmarked(false)
        toast.success('Removed from bookmarks')
      } else {
        toast.error(error.message)
      }
    } else {
      const { error } = await supabase
        .from('student_bookmarks')
        .upsert(
          { student_id: user.id, study_card_id: card.id },
          { onConflict: 'student_id,study_card_id', ignoreDuplicates: true }
        )

      if (!error) {
        setIsBookmarked(true)
        toast.success('Saved to bookmarks!')
      } else {
        toast.error(error.message)
      }
    }
    setBookmarkLoading(false)
  }

  // Submit Doubt to Doubt Resolution Hub
  const handleSendDoubt = async (e) => {
    e.preventDefault()
    if (!canAskDoubt) {
      toast.error('Doubt submission is exclusively available for enrolled students.')
      return
    }
    if (!doubtText.trim()) {
      toast.error('Please type your question or doubt.')
      return
    }

    setDoubtSending(true)
    try {
      const timestampTag = formatSeconds(playbackTime)
      const lectureTitle = dynamicTitle || card?.title || 'Lecture'
      const newDoubt = await createDoubt({
        student_id: user.id,
        student_name: profile?.full_name || 'Student',
        roll_number: studentProfile?.roll_number || null,
        batch_id: studentProfile?.batch_id || card?.batch_id || (card?.batch_ids?.[0] ?? null),
        batch_name: studentProfile?.batches?.name || null,
        subject: card?.subject || 'General',
        study_card_id: card?.id || null,
        lecture_title: lectureTitle,
        video_url: currentVideoId ? `https://www.youtube.com/watch?v=${currentVideoId}` : (card?.url || null),
        timestamp_seconds: Math.floor(playbackTime),
        question: doubtText.trim(),
      })

      toast.success(`Doubt recorded at ${timestampTag}! Visible in Doubt Resolution Hub.`)
      setDoubtText('')
      if (newDoubt) {
        setRecentDoubts((prev) => [newDoubt, ...prev])
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit doubt.')
    } finally {
      setDoubtSending(false)
    }
  }

  // Handle student deleting a recent doubt (self-study resolution)
  const handleDeleteRecentDoubt = async (doubtId) => {
    try {
      await deleteDoubt(doubtId, user.id, false)
      setRecentDoubts((prev) => prev.filter((d) => d.id !== doubtId))
      toast.success('Doubt cleared! Great job solving it on your own.')
    } catch (err) {
      toast.error(err.message || 'Failed to delete doubt.')
    }
  }

  const handleGoBack = () => {
    if (document.fullscreenElement) {
      try { screen.orientation?.unlock?.() } catch { /* Fallback */ }
      document.exitFullscreen?.().catch(() => {})
    }
    const returnSubject = location.state?.returnSubject || searchParams.get('returnSubject') || card?.subject || ''
    if (window.history.length > 1 && window.history.state?.idx > 0) {
      navigate(-1)
    } else if (user && returnSubject) {
      navigate(`${rolePrefix}/study?subject=${encodeURIComponent(returnSubject)}&category=video`, { replace: true })
    } else if (user) {
      navigate(`${rolePrefix}/study`, { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3 shadow-md" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Loading Classroom…</p>
      </div>
    )
  }

  if (!card) {
    if (!user) {
      return (
        <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-6 text-center">
          <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm mb-3">
            <ShieldCheck className="h-10 w-10 text-indigo-600" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Enrolled Student Access Required</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mb-5">
            This lecture is reserved for enrolled students. Please sign in to verify your enrollment and access the classroom.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <LogIn className="h-4 w-4" /> Sign In to Watch
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm mb-3">
          <BookOpen className="h-10 w-10 text-slate-400" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Lecture Not Found or Restricted</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mb-5">
          The requested video lecture could not be loaded or is restricted to other enrolled batches.
        </p>
        <button
          onClick={() => navigate(`${rolePrefix}/study`)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Study Portal
        </button>
      </div>
    )
  }

  // Guard against unauthenticated viewing of private study cards passed via routing state
  if (!card.is_public && !user) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm mb-3">
          <ShieldCheck className="h-10 w-10 text-indigo-600" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Enrolled Student Access Required</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mb-5">
          This lecture is part of an enrolled batch curriculum. Please sign in with your student account to continue.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <LogIn className="h-4 w-4" /> Sign In to Watch
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </button>
        </div>
      </div>
    )
  }

  const listId = hasMultipleLectures ? effectivePlaylistId : null
  const singleVideoId = card?.url ? getYTVideoId(card.url) : null
  const isDriveDoc = card?.type === 'drive' || card?.type === 'google_drive' || card?.url?.includes('drive.google.com')

  // Resolve active video ID
  let currentVideoId = singleVideoId
  if (hasMultipleLectures && playlistItems.length > 0 && playlistItems[activeVideoIndex]?.videoId) {
    currentVideoId = playlistItems[activeVideoIndex].videoId
  }

  const activePlaylistItem = playlistItems[activeVideoIndex]
  const currentTitle = activePlaylistItem?.title || card.title

  const filteredPlaylistItems = playlistItems.filter((item) =>
    (item.title?.toLowerCase() || '').includes(playlistSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-800 flex flex-col font-sans select-none overflow-x-hidden">

      {/* ─── 1. APPLE-GRADE MINIMAL LIGHT HEADER ─────────────────────────────── */}
      <header className="flex-shrink-0 h-12 sm:h-14 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-3 sm:px-6 flex items-center justify-between gap-3 z-30 sticky top-0 shadow-2xs">
        {/* Left Section: Back Arrow + Subject Badge + Title */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            onClick={handleGoBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center shrink-0 cursor-pointer border border-slate-200/80 active:scale-95"
            title="Back to portal"
          >
            <ArrowLeft className="h-4 w-4 text-indigo-600" />
          </button>

          {card.subject && (
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-lg shrink-0">
              {card.subject}
            </span>
          )}

          <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate min-w-0 flex-1 tracking-tight">
            {dynamicTitle || currentTitle}
          </h1>
        </div>

        {/* Right Section: Keyboard Shortcuts, Protected Badge & Bookmark */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Keyboard Shortcuts Trigger Button */}
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95"
            title="Keyboard Shortcuts"
          >
            <Keyboard className="h-3.5 w-3.5 text-slate-600" />
            <span className="text-[11px]">Shortcuts</span>
          </button>

          {/* Protected Classroom security badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black shadow-2xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Protected</span>
          </div>

          <button
            onClick={toggleBookmark}
            disabled={bookmarkLoading}
            className={`p-1.5 sm:px-3 sm:py-1.5 rounded-xl font-bold text-xs transition-all border flex items-center gap-1 cursor-pointer active:scale-95 ${
              isBookmarked
                ? 'bg-rose-500 border-rose-600 text-white shadow-xs'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title={isBookmarked ? 'Bookmarked' : 'Bookmark'}
          >
            <Heart className={`h-4 w-4 ${isBookmarked ? 'fill-current text-white' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </header>

      {/* ─── 2. RESPONSIVE MAIN WORKSPACE (PHYSICS WALLAH BENCHMARK DUAL-PANE) ── */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-2.5 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">

        {/* LEFT / MAIN COLUMN: CINEMA VIDEO STAGE (7 or 8 COLS) */}
        <div className="lg:col-span-8 space-y-3.5">

          {/* SECURE CINEMA STAGE */}
          <div
            ref={cinemaStageRef}
            className={`relative w-full ${
              isFullscreen
                ? 'fixed inset-0 z-[99999] w-screen h-screen bg-black flex items-center justify-center'
                : 'aspect-video rounded-3xl overflow-hidden shadow-2xl border border-slate-800/90 bg-black flex items-center justify-center ring-1 ring-slate-900/10'
            }`}
          >
            {isDriveDoc ? (
              <iframe
                src={card.url.replace(/\/view(\?.*)?$/, '/preview').replace(/\/edit(\?.*)?$/, '/preview')}
                title={card.title}
                className="w-full h-full border-0 relative z-10 block bg-slate-900"
              />
            ) : (
              <ProtectedVideoPlayer
                key={card.id}
                videoId={currentVideoId || (playlistItems[activeVideoIndex]?.videoId ?? '')}
                playlistId={hasMultipleLectures ? listId : null}
                title={dynamicTitle || currentTitle}
                subject={card.subject}
                isPlaylist={hasMultipleLectures}
                playlistItems={hasMultipleLectures ? playlistItems : []}
                activeVideoIndex={hasMultipleLectures ? activeVideoIndex : 0}
                onPrevVideo={() => setActiveVideoIndex((prev) => Math.max(0, prev - 1))}
                onNextVideo={() => setActiveVideoIndex((prev) => Math.min(Math.max(0, playlistItems.length - 1), prev + 1))}
                onPlaylistSync={handlePlaylistSync}
                onIndexChange={handleIndexChange}
                onVideoTitleChange={handleVideoTitleChange}
                onTimeUpdate={handleTimeUpdate}
                isFullscreen={isFullscreen}
                onToggleFullscreen={handleFullscreen}
                initialSeekSeconds={initialSeekSeconds}
              />
            )}
          </div>

          {/* CONTROLS STRIP (Full Screen + Context-Aware Actions) */}
          {isTeacherOrAdmin ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={handleFullscreen}
                className="py-2.5 sm:py-3 px-4 bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-950 hover:from-blue-900 hover:to-indigo-800 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md border border-indigo-900/50 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Exit Full Screen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Landscape Cinema</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate(profile?.role === 'admin' ? '/admin/doubts' : '/teacher/doubts')}
                className="py-2.5 sm:py-3 px-4 bg-white hover:bg-indigo-50 text-indigo-950 font-extrabold text-xs sm:text-sm rounded-2xl shadow-sm border border-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <HelpCircle className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Manage Doubts Hub</span>
              </button>
            </div>
          ) : canAskDoubt ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={handleFullscreen}
                className="py-2.5 sm:py-3 px-4 bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-950 hover:from-blue-900 hover:to-indigo-800 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md border border-indigo-900/50 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Exit Full Screen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Landscape Cinema</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('doubts')}
                className="py-2.5 sm:py-3 px-4 bg-white hover:bg-amber-50 text-amber-900 font-extrabold text-xs sm:text-sm rounded-2xl shadow-sm border border-amber-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <HelpCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Ask Doubt at {formatSeconds(playbackTime)}</span>
              </button>
            </div>
          ) : (
            /* Public / Demo viewer: full-width cinema with no doubt-asking button */
            <div className="flex w-full">
              <button
                type="button"
                onClick={handleFullscreen}
                className="w-full py-2.5 sm:py-3 px-4 bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-950 hover:from-blue-900 hover:to-indigo-800 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md border border-indigo-900/50 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Exit Full Screen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Landscape Cinema</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* LECTURE DETAILS & OVERVIEW CARD */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
                  {dynamicTitle || currentTitle}
                </h2>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                  {card.created_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {new Date(card.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Thoughtful&apos;s Academy Classroom
                  </span>
                </div>
              </div>

              {card.type === 'external_link' && (
                <a
                  href={normalizeUrl(card.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-indigo-600 text-white text-xs font-extrabold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open Resource
                </a>
              )}
            </div>

            {/* Description / Summary */}
            {card.description && (
              <div className="space-y-1.5 pt-1">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Lecture Highlights &amp; Outline</h4>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60 font-sans">
                  {card.description}
                </p>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: MULTI-TAB ACADEMIC HUB (PW & UNACADEMY STYLE) (4 COLS) */}
        <div className="lg:col-span-4 space-y-3.5">

          {/* ACADEMIC TAB SWITCHER */}
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-1">
            {hasMultipleLectures && (
              <button
                type="button"
                onClick={() => setActiveTab('curriculum')}
                className={`flex-1 py-2 px-1 text-center rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'curriculum'
                    ? 'bg-blue-950 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <ListVideo className="h-3.5 w-3.5" />
                <span>Lectures</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-2 px-1 text-center rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'notes'
                  ? 'bg-blue-950 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Notes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('doubts')}
              className={`flex-1 py-2 px-1 text-center rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'doubts'
                  ? 'bg-amber-500 text-blue-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Doubts</span>
            </button>
          </div>

          {/* TAB 1: CURRICULUM QUEUE (ONLY RENDERED FOR MULTI-VIDEO PLAYLISTS) */}
          {activeTab === 'curriculum' && hasMultipleLectures && (
            <div className="bg-slate-950 rounded-3xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[520px]">
              {/* Header */}
              <div className="p-4 border-b border-slate-800/90 bg-slate-900/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-400/15 text-amber-400 border border-amber-400/30">
                      <ListVideo className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">
                        Course Curriculum
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        {playlistItems.length} lectures in syllabus
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black bg-amber-400/15 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                    {activeVideoIndex + 1} / {playlistItems.length}
                  </span>
                </div>

                {/* Search */}
                {playlistItems.length > 3 && (
                  <div className="relative pt-1">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-[calc(50%+2px)] -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={playlistSearch}
                      onChange={(e) => setPlaylistSearch(e.target.value)}
                      placeholder="Search lecture name or topic..."
                      className="w-full bg-slate-900 text-xs text-white placeholder-slate-500 pl-7 pr-2.5 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}
              </div>

              {/* Lecture List */}
              <div ref={queueScrollRef} className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
                {playlistLoading ? (
                  <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                    <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-[11px] font-semibold">Loading lectures…</p>
                  </div>
                ) : filteredPlaylistItems.length > 0 ? (
                  filteredPlaylistItems.map((item) => {
                    const isActive = item.index === activeVideoIndex
                    const progress = item.videoId ? getLectureProgress(item.videoId) : null
                    const isCompleted = progress?.completed
                    return (
                      <button
                        key={item.index}
                        data-queue-index={item.index}
                        onClick={() => setActiveVideoIndex(item.index)}
                        className={`w-full p-2.5 rounded-2xl text-left transition-all flex items-center gap-3 group cursor-pointer border ${
                          isActive
                            ? 'bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border-amber-400 shadow-xl ring-2 ring-amber-400/30 scale-[1.01]'
                            : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="relative w-16 h-10 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-700">
                          {item.thumb ? (
                            <img src={item.thumb} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400 text-[10px] font-black">
                              #{item.index + 1}
                            </div>
                          )}
                          <span
                            className={`absolute bottom-0.5 left-0.5 text-[8px] font-black px-1 rounded ${
                              isActive ? 'bg-amber-400 text-slate-950' : 'bg-slate-950/90 text-white'
                            }`}
                          >
                            #{item.index + 1}
                          </span>
                          {isActive && (
                            <div className="absolute inset-0 bg-amber-400/20 backdrop-blur-xs flex items-center justify-center text-amber-300">
                              <Radio className="h-3.5 w-3.5 animate-pulse text-amber-400" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <h4
                            className={`text-xs font-bold line-clamp-2 transition-colors ${
                              isActive ? 'text-amber-300 font-extrabold' : 'text-slate-200 group-hover:text-amber-300'
                            }`}
                          >
                            {item.title}
                          </h4>
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-400 mt-0.5 bg-amber-400/10 px-1.5 py-0.2 rounded">
                              <Radio className="h-2 w-2 animate-spin" /> Playing Now
                            </span>
                          ) : isCompleted ? (
                            <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-0.5 mt-0.5">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Completed
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400 mt-0.5 block">
                              {progress?.time ? `Resume at ${Math.floor(progress.time / 60)}m` : 'Tap to watch'}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                    <p>No lectures match &quot;{playlistSearch}&quot;</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CLASS NOTES & FORMULAS (PW STYLE) */}
          {activeTab === 'notes' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-4 sm:p-5 space-y-4 h-[520px] overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Chapter Notes &amp; Formulas
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Handwritten notes &amp; reference sheets for {card.subject || 'this lecture'}
                  </p>
                </div>
              </div>


              {/* Downloadable / Cloud Drive Notes in this Subject */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Subject Materials ({notesResources.length})
                </span>

                {notesResources.length > 0 ? (
                  notesResources.map(n => (
                    <a
                      key={n.id}
                      href={normalizeUrl(n.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/80 hover:border-emerald-200 rounded-2xl transition-all flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="text-[8px] font-black uppercase text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                          {n.type === 'google_drive' ? 'PDF NOTES' : 'RESOURCE'}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 truncate mt-0.5 group-hover:text-emerald-800">
                          {n.title}
                        </h4>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                    </a>
                  ))
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100 p-4">
                    <FileText className="h-7 w-7 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-600">Notes will be uploaded shortly</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Your educator uploads handwritten notes after lecture delivery.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DOUBT RESOLUTION HUB (ROLE & CONTEXT SPECIFIC) */}
          {activeTab === 'doubts' && (
            eligibilityStatus === DOUBT_ELIGIBILITY_STATUS.INITIALIZING ||
            eligibilityStatus === DOUBT_ELIGIBILITY_STATUS.LOADING_ENROLLMENT ? (
              /* 1. INITIALIZING / LOADING ENROLLMENT STATE */
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 h-[520px] flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-700">Verifying Classroom Credentials…</p>
                <p className="text-[10px] text-slate-400">Loading student profile and batch authorization</p>
              </div>
            ) : eligibilityStatus === DOUBT_ELIGIBILITY_STATUS.ERROR ? (
              /* 2. RECOVERABLE ENROLLMENT VERIFICATION ERROR */
              <div className="bg-white rounded-3xl border border-rose-200 shadow-md p-6 h-[520px] flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <p className="text-xs font-black text-slate-900">Unable to Verify Enrollment</p>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  {studentProfileError?.message || 'A network error occurred while verifying your batch enrollment.'}
                </p>
                <button
                  type="button"
                  onClick={() => user?.id && fetchStudentProfile(user.id)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry Verification
                </button>
              </div>
            ) : isTeacherOrAdmin ? (
              /* 3. EDUCATOR VIEW (TEACHER & ADMIN REVIEW QUEUE) */
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-4 sm:p-5 space-y-4 h-[520px] overflow-y-auto custom-scrollbar flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                        <HelpCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Lecture Doubts Queue
                        </h3>
                        <p className="text-[10px] text-slate-500 font-semibold">
                          Student questions submitted for this specific lecture
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2.5 py-0.5 rounded-full">
                      Educator Review
                    </span>
                  </div>

                  {/* Link to Full Educator Doubts Section */}
                  <div className="p-3 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-2xl flex items-center justify-between gap-2 shadow-xs">
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold truncate">Doubt Resolution Hub</p>
                      <p className="text-[10px] text-slate-300">View and manage all doubts across your assigned batches</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(profile?.role === 'admin' ? '/admin/doubts' : '/teacher/doubts')}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-blue-950 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer"
                    >
                      Open Hub →
                    </button>
                  </div>

                  {/* List of doubts on this lecture */}
                  {educatorDoubtsLoading ? (
                    <div className="py-10 text-center text-xs text-slate-400 space-y-2">
                      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-[11px] font-semibold">Loading student doubts…</p>
                    </div>
                  ) : educatorLectureDoubts.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-0.5">
                      {educatorLectureDoubts.map((d) => (
                        <div key={d.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                          <div className="flex items-center justify-between text-[11px] gap-2">
                            <span className="font-extrabold text-slate-900 truncate">
                              {d.student_name} {d.roll_number ? `• Roll #${d.roll_number}` : ''}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              d.status === 'addressed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {d.status === 'addressed' ? 'Addressed' : 'Pending'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 leading-relaxed font-normal bg-white p-2.5 rounded-xl border border-slate-200/60 whitespace-pre-wrap break-words">
                            {d.question}
                          </p>
                          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 pt-0.5">
                            <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70">
                              ▶ At {formatSeconds(d.timestamp_seconds || 0)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const msgPath = profile?.role === 'admin' ? '/admin/messages' : '/teacher/messages'
                                  navigate(`${msgPath}?student=${d.student_id}`)
                                }}
                                className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-bold transition-all cursor-pointer"
                              >
                                Message
                              </button>
                              {d.status !== 'addressed' && (
                                <button
                                  type="button"
                                  onClick={() => handleEducatorMarkAddressed(d.id)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all cursor-pointer"
                                >
                                  Mark Addressed
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-1.5">
                      <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">No Student Doubts for this Lecture</p>
                      <p className="text-[10px] text-slate-400">Questions submitted by enrolled students will automatically appear here.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : canAskDoubt ? (
              /* B. ENROLLED STUDENT VIEW (SUBMISSION FORM + RECENT DOUBTS) */
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-4 sm:p-5 space-y-4 h-[520px] overflow-y-auto custom-scrollbar flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                      <HelpCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Doubt Resolution Hub
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Ask your educator directly at this exact lecture timestamp
                      </p>
                    </div>
                  </div>

                  {/* Current Timestamp Indicator */}
                  <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-extrabold text-amber-900">Current Playback Time:</span>
                    </div>
                    <span className="px-2.5 py-0.5 bg-amber-400 text-blue-950 font-black text-xs rounded-full shadow-2xs">
                      {formatSeconds(playbackTime)}{videoDuration > 0 ? ` / ${formatSeconds(videoDuration)}` : ''}
                    </span>
                  </div>

                  {/* Doubt Form */}
                  <form onSubmit={handleSendDoubt} className="space-y-2.5">
                    <label htmlFor="doubt-textarea" className="block text-[11px] font-extrabold text-slate-700">
                      Your Question / Doubt:
                    </label>
                    <textarea
                      id="doubt-textarea"
                      rows={4}
                      value={doubtText}
                      onChange={(e) => setDoubtText(e.target.value)}
                      placeholder={`e.g., At ${formatSeconds(playbackTime)}, why did we take this formula step? Please explain...`}
                      className="w-full text-xs p-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all placeholder-slate-400 resize-none font-sans"
                    />
                    <button
                      type="submit"
                      disabled={doubtSending || !doubtText.trim()}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-blue-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
                    >
                      {doubtSending ? (
                        <span>Sending to Educator…</span>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>Send Doubt at {formatSeconds(playbackTime)}</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Recent Doubts List */}
                  {recentDoubts.length > 0 && (
                    <div className="pt-2 space-y-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Your Doubts for this Lecture ({recentDoubts.length})
                        </span>
                        <Link
                          to="/student/doubts"
                          className="text-[10px] font-bold text-amber-700 hover:text-amber-800 underline flex items-center gap-0.5"
                        >
                          All Doubts →
                        </Link>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                        {recentDoubts.map((d) => (
                          <div key={d.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs space-y-1.5">
                            <p className="font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                              {d.question || d.content}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                                ▶ {formatSeconds(d.timestamp_seconds || 0)}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className={d.status === 'addressed' || d.is_read ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                                  {d.status === 'addressed' || d.is_read ? '✓ Addressed' : 'Pending'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecentDoubt(d.id)}
                                  className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                                  title="Clear doubt (resolved by self-study)"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : eligibilityStatus === DOUBT_ELIGIBILITY_STATUS.STUDENT_NOT_ENROLLED ? (
              /* 5. AUTHENTICATED STUDENT NOT ENROLLED IN LECTURE BATCH */
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-4 sm:p-5 space-y-4 h-[520px] overflow-y-auto custom-scrollbar flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                        <HelpCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Doubt Resolution Hub
                        </h3>
                        <p className="text-[10px] text-slate-500">
                          Interactive Timestamped Q&amp;A with Educators
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
                      Batch Feature
                    </span>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl border border-slate-800 shadow-md space-y-3">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-xs font-extrabold uppercase tracking-wide">Reserved for Batch Students</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                      Direct doubt clearance with expert faculty at exact video timestamps is exclusively available for students enrolled in this lecture&apos;s batch curriculum.
                    </p>
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1 text-[11px] text-slate-300">
                      <p><strong className="text-white">Your Enrolled Batch:</strong> {studentProfile?.batches?.name || 'No batch currently assigned'}</p>
                      {cardBatchName && <p><strong className="text-amber-300">Lecture Batch:</strong> {cardBatchName}</p>}
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/70 text-center space-y-2">
                    <p className="text-xs font-extrabold text-amber-950">
                      Want doubt solving in your batch?
                    </p>
                    <p className="text-[10px] text-amber-800 leading-tight">
                      You can explore your enrolled curriculum in the Study Portal or view existing doubts in your Doubt Hub.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => navigate('/student/study')}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        My Study Portal
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/student/doubts')}
                        className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-black rounded-xl transition-all cursor-pointer"
                      >
                        My Doubts Hub
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* 6. UNAUTHENTICATED PUBLIC & DEMO VISITOR PROMOTIONAL GATE */
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-4 sm:p-5 space-y-4 h-[520px] overflow-y-auto custom-scrollbar flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                        <HelpCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Doubt Resolution Hub
                        </h3>
                        <p className="text-[10px] text-slate-500">
                          Interactive Timestamped Q&amp;A with Educators
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
                      Enrolled Feature
                    </span>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl border border-slate-800 shadow-md space-y-3">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-xs font-extrabold uppercase tracking-wide">Reserved for Enrolled Students</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                      Direct doubt clearance with expert faculty at exact video timestamps is exclusively available for enrolled students in Thoughtful&apos;s Academy batches.
                    </p>
                    <ul className="text-[11px] text-slate-300 space-y-1.5 pt-1">
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span>Ask questions at any exact second of video playback</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span>Dedicated teacher review and classroom explanation</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span>Direct 1-on-1 messaging with your assigned subject faculty</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/70 text-center space-y-2">
                    <p className="text-xs font-extrabold text-amber-950">
                      Want personalized doubt solving?
                    </p>
                    <p className="text-[10px] text-amber-800 leading-tight">
                      Join an enrolled batch or sign in to your student account to activate doubt submission.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => navigate('/register')}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        Enroll in Batch
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`)}
                        className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-black rounded-xl transition-all cursor-pointer"
                      >
                        Sign In
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* MORE LECTURES IN SAME SUBJECT */}
          {relatedCards.length > 0 && (
            <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-indigo-700" /> Related in {card.subject}
                </h3>
                <Link
                  to={`${rolePrefix}/study?subject=${encodeURIComponent(card.subject || '')}&category=video`}
                  className="text-[10px] text-indigo-700 hover:underline flex items-center gap-0.5 font-bold"
                >
                  View all <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-1.5">
                {relatedCards.slice(0, 3).map((rc) => (
                  <button
                    key={rc.id}
                    onClick={() => {
                      setCard(rc)
                      navigate(`${rolePrefix}/watch/${rc.id}`, { state: { card: rc }, replace: true })
                    }}
                    className="w-full p-2.5 bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-200 transition-all rounded-xl text-left flex items-center justify-between gap-2.5 group cursor-pointer"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600">
                        {rc.title}
                      </h4>
                    </div>
                    <PlayCircle className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

      </main>

      {/* ─── 3. APPLE-GRADE KEYBOARD SHORTCUTS MODAL ───────────────────────── */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Keyboard className="h-4 w-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">Player Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { key: 'Space / K', action: 'Play / Pause Video' },
                { key: 'J / ←',     action: 'Rewind 10 seconds' },
                { key: 'L / →',     action: 'Forward 10 seconds' },
                { key: 'F',         action: 'Toggle Landscape Fullscreen' },
                { key: 'M',         action: 'Mute / Unmute Audio' },
                { key: '< / >',     action: 'Decrease / Increase Speed' },
                { key: '0 - 9',     action: 'Jump to 0% - 90% of lecture' },
              ].map(s => (
                <div key={s.key} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <kbd className="px-2 py-1 bg-white rounded-lg border border-slate-200 font-mono text-[11px] font-bold text-slate-800 shadow-2xs">
                    {s.key}
                  </kbd>
                  <span className="text-slate-600 font-medium">{s.action}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowShortcutsModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
