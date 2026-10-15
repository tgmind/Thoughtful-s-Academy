import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen, PlayCircle, Heart, Youtube,
  Link as LinkIcon, ChevronLeft, ChevronRight, BookMarked, GraduationCap,
  Sparkles, Globe, Search, X, FolderOpen, Layers, Atom, FlaskConical,
  Dna, Calculator, ArrowRight, Play, School, FileText, Video, Home
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import LiveClassBanner from '../../components/shared/LiveClassBanner'
import MaterialViewerModal from '../../components/shared/MaterialViewerModal'
import { normalizeUrl } from '../../utils/formatters'
import { getYTThumb } from '../../utils/youtube'
import { isGoogleDriveResource } from '../../utils/materialUrl'

// Subject Theme Resolver for Physics Wallah / Premium EdTech Style
function getSubjectTheme(subjectName = '') {
  const s = subjectName.toLowerCase()
  if (s.includes('physic')) {
    return {
      icon: Atom,
      gradient: 'from-indigo-600 via-blue-700 to-slate-900',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      accentBg: 'bg-indigo-600',
      textColor: 'text-indigo-600',
      lightBg: 'bg-indigo-50/60',
    }
  }
  if (s.includes('chem')) {
    return {
      icon: FlaskConical,
      gradient: 'from-emerald-600 via-teal-700 to-slate-900',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      accentBg: 'bg-emerald-600',
      textColor: 'text-emerald-600',
      lightBg: 'bg-emerald-50/60',
    }
  }
  if (s.includes('bio')) {
    return {
      icon: Dna,
      gradient: 'from-rose-600 via-pink-700 to-slate-900',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      accentBg: 'bg-rose-600',
      textColor: 'text-rose-600',
      lightBg: 'bg-rose-50/60',
    }
  }
  if (s.includes('math') || s.includes('calc') || s.includes('alg') || s.includes('geom')) {
    return {
      icon: Calculator,
      gradient: 'from-amber-500 via-orange-600 to-slate-900',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      accentBg: 'bg-amber-600',
      textColor: 'text-amber-600',
      lightBg: 'bg-amber-50/60',
    }
  }
  if (s.includes('eng') || s.includes('lit')) {
    return {
      icon: BookOpen,
      gradient: 'from-purple-600 via-violet-700 to-slate-900',
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
      accentBg: 'bg-purple-600',
      textColor: 'text-purple-600',
      lightBg: 'bg-purple-50/60',
    }
  }
  if (s.includes('sst') || s.includes('soc') || s.includes('geo') || s.includes('hist')) {
    return {
      icon: Globe,
      gradient: 'from-cyan-600 via-sky-700 to-slate-900',
      badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      accentBg: 'bg-cyan-600',
      textColor: 'text-cyan-600',
      lightBg: 'bg-cyan-50/60',
    }
  }
  return {
    icon: BookMarked,
    gradient: 'from-blue-950 via-indigo-900 to-slate-900',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    accentBg: 'bg-blue-950',
    textColor: 'text-blue-950',
    lightBg: 'bg-blue-50/60',
  }
}


function StudyCard({ card, bookmarked, onBookmark, isHighlighted, onWatch, onOpenMaterial, onOpenNotes, className = '' }) {
  const thumb = card.thumbnail_url || getYTThumb(card.url)
  const isVideo = card.type?.startsWith('youtube')
  const hasAttachedNotes = Array.isArray(card.attached_notes) && card.attached_notes.length > 0
  const isPlaylist = card.type === 'youtube_playlist'

  const handleCardClick = () => {
    if (isVideo) {
      onWatch?.(card)
    } else if (onOpenMaterial) {
      onOpenMaterial(card)
    } else {
      window.open(normalizeUrl(card.url), '_blank', 'noopener,noreferrer')
    }
  }

  const handleNotesClick = (e) => {
    e.stopPropagation()
    if (onOpenNotes) {
      onOpenNotes(card)
    } else if (hasAttachedNotes && onOpenMaterial) {
      const firstNote = card.attached_notes[0]
      onOpenMaterial({
        id: firstNote.id,
        title: firstNote.title,
        subject: card.subject,
        url: firstNote.url,
        type: isGoogleDriveResource(firstNote.url) ? 'google_drive' : 'external_link'
      })
    }
  }

  return (
    <div
      id={`card-${card.id}`}
      className={`group relative bg-white rounded-2xl border transition-all duration-300 flex flex-col overflow-hidden shadow-2xs hover:shadow-lg hover:shadow-slate-900/5 hover:-translate-y-0.5 ${className} ${
        isHighlighted
          ? 'border-indigo-400 ring-2 ring-indigo-400/30 shadow-indigo-500/10 shadow-lg scale-[1.01] bg-indigo-50/10'
          : 'border-slate-200/80 hover:border-slate-300'
      }`}
    >
      {/* ─── 1. THUMBNAIL (16:9 HERO VIEWPORT) ─── */}
      <div
        className="relative overflow-hidden aspect-video bg-slate-950 cursor-pointer select-none"
        onClick={handleCardClick}
      >
        {thumb ? (
          <img
            src={thumb}
            alt={card.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out brightness-95 group-hover:brightness-100"
          />
        ) : card.type === 'google_drive' || !isVideo ? (
          /* Soothing EdTech Study Notebook Cover Design */
          <div className="w-full h-full bg-gradient-to-br from-amber-100 via-amber-50 to-yellow-100 relative flex items-center justify-center p-3 sm:p-4 overflow-hidden select-none">
            {/* Ambient soft warm glow */}
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-300/35 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-orange-300/25 rounded-full blur-2xl pointer-events-none" />

            {/* Clean Floating Study Notebook Sheet */}
            <div className="relative z-10 bg-white rounded-xl shadow-md shadow-amber-950/10 p-2.5 sm:p-3 border border-amber-200/90 w-[85%] max-w-[220px] h-[82%] max-h-[125px] flex flex-col justify-between group-hover:scale-105 transition-transform duration-300">
              {/* Paper Header */}
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider shadow-2xs">
                  <FileText className="h-2.5 w-2.5" />
                  <span>CHAPTER NOTES</span>
                </span>
                {card.subject && (
                  <span className="text-[8.5px] font-bold text-amber-900/80 uppercase tracking-tight truncate max-w-[80px]">
                    {card.subject}
                  </span>
                )}
              </div>

              {/* Document Title (Clear, bold, prominent with stationery margin guide) */}
              <div className="my-0.5 pl-1.5 border-l-2 border-amber-400/80">
                <h4 className="text-[11px] sm:text-xs font-bold text-slate-900 tracking-tight leading-snug line-clamp-2">
                  {card.title}
                </h4>
              </div>

              {/* Notebook Ruled Lines */}
              <div className="space-y-1">
                <div className="h-0.5 bg-amber-100/90 rounded-full w-full" />
                <div className="h-0.5 bg-amber-100/90 rounded-full w-3/4" />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center p-3">
            <BookOpen className="h-8 w-8 text-white/30" />
          </div>
        )}

        {/* Video Play Overlay */}
        {isVideo && (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/20 opacity-70 group-hover:opacity-85 transition-opacity duration-300" />
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center text-slate-900 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white transition-all duration-200 shadow-md">
                <Play className="h-4 w-4 fill-current ml-0.5" />
              </div>
            </div>
          </>
        )}

        {/* Subject Label Overlaid Top-Left */}
        {isVideo && card.subject && (
          <span className="absolute top-2 left-2 z-20 backdrop-blur-md bg-slate-950/75 border border-white/15 text-white text-[9px] font-bold px-2 py-0.5 rounded-full select-none shadow-xs">
            {card.subject}
          </span>
        )}

        {/* Minimal Bookmark Button Top-Right */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onBookmark(card.id, bookmarked)
          }}
          title={bookmarked ? 'Remove bookmark' : 'Bookmark card'}
          aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark card'}
          className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all duration-200 z-20 cursor-pointer active:scale-95 ${
            bookmarked
              ? 'bg-rose-500 text-white shadow-md scale-105'
              : 'bg-slate-950/45 text-white/90 hover:bg-slate-950/75 hover:text-white hover:scale-110'
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${bookmarked ? 'fill-current' : ''}`} />
        </button>

        {/* Format Chip Bottom-Right */}
        {isVideo && (
          <span className="absolute bottom-2 right-2 z-20 bg-slate-950/80 backdrop-blur-md text-white text-[8px] sm:text-[8.5px] font-bold px-2 py-0.5 rounded-full border border-white/15 select-none flex items-center gap-1 shadow-xs">
            {isPlaylist ? <Youtube className="h-2.5 w-2.5 text-red-400" /> : <Play className="h-2.5 w-2.5 text-red-400 fill-current" />}
            <span>{isPlaylist ? 'PLAYLIST' : 'VIDEO'}</span>
          </span>
        )}
      </div>

      {/* ─── 2. CARD CONTENT AREA ─── */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div className="space-y-1.5 min-w-0">
          
          {/* Single Compact Meta Row with Visual Format Indicators */}
          <div className="flex items-center justify-between gap-1 text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span className="inline-flex items-center gap-1 truncate">
              {isPlaylist ? (
                <><Youtube className="h-3 w-3 text-red-500 shrink-0" /><span>Playlist</span></>
              ) : isVideo ? (
                <><Video className="h-3 w-3 text-red-500 shrink-0" /><span>Video Lecture</span></>
              ) : (
                <><FileText className="h-3 w-3 text-amber-500 shrink-0" /><span>Chapter Notes</span></>
              )}
            </span>
            {card.is_featured && (
              <span className="inline-flex items-center gap-0.5 text-amber-700 bg-amber-50/90 border border-amber-200/70 px-1.5 py-0.5 rounded-full font-extrabold text-[8px] uppercase tracking-wide">
                <Sparkles className="h-2 w-2 text-amber-500 fill-current" /> Featured
              </span>
            )}
          </div>

          {/* Title (High-contrast, never chops off) */}
          <h3
            onClick={handleCardClick}
            className="font-bold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2 min-h-[2.3rem] sm:min-h-[2.6rem] group-hover:text-blue-600 transition-colors cursor-pointer"
            title={card.title}
          >
            {card.title}
          </h3>

          {/* Description (1 line on mobile) */}
          {card.description && (
            <p className="text-[10.5px] sm:text-xs text-slate-500 line-clamp-1 leading-relaxed">
              {card.description}
            </p>
          )}
        </div>

        {/* ─── 3. UNIFIED ACTION BUTTON ROW ─── */}
        <div className="pt-1">
          {isVideo ? (
            hasAttachedNotes ? (
              /* Duo-Action Row Side-by-Side: Watch + Notes (N) */
              <div className="flex items-center gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => onWatch?.(card)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2 sm:px-2.5 bg-slate-900 hover:bg-blue-600 active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer min-w-0"
                  title="Watch Lecture"
                >
                  <PlayCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="whitespace-nowrap">
                    <span className="sm:hidden">Watch</span>
                    <span className="hidden sm:inline">Watch Lecture</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleNotesClick}
                  className="shrink-0 inline-flex items-center justify-center gap-1 py-2 px-2 sm:px-2.5 bg-amber-50 hover:bg-amber-100/90 active:scale-98 text-amber-950 border border-amber-200/90 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
                  title={`View ${card.attached_notes.length} attached ${card.attached_notes.length === 1 ? 'note' : 'notes'}`}
                >
                  <FileText className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span className="whitespace-nowrap font-extrabold">
                    <span className="sm:hidden">{card.attached_notes.length}</span>
                    <span className="hidden sm:inline">Notes ({card.attached_notes.length})</span>
                  </span>
                </button>
              </div>
            ) : (
              /* Single Full-Width Action: Watch Lecture */
              <button
                type="button"
                onClick={() => onWatch?.(card)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-900 hover:bg-blue-600 active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-2xs group-hover:shadow-xs cursor-pointer"
              >
                <PlayCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Watch Lecture</span>
              </button>
            )
          ) : (
            /* Single Full-Width Action: Open Material */
            <button
              type="button"
              onClick={handleCardClick}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-900 hover:bg-amber-600 active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-2xs group-hover:shadow-xs cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Open Material</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function StudentNotesPlaylistModal({ card, onClose, onOpenMaterial }) {
  const [search, setSearch] = useState('')

  if (!card) return null

  const notes = Array.isArray(card.attached_notes) ? card.attached_notes : []
  const filtered = notes.filter(n =>
    !search.trim() ||
    (n.title && n.title.toLowerCase().includes(search.toLowerCase())) ||
    (n.description && n.description.toLowerCase().includes(search.toLowerCase()))
  )

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] bg-[#f8f9fa] text-slate-900 rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* M3 Modal Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {card.subject || 'Notes'}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {notes.length} {notes.length === 1 ? 'Document' : 'Documents'}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate mt-0.5" title={card.title}>
                {card.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0 cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar if > 2 notes */}
        {notes.length > 2 && (
          <div className="px-4 py-2.5 bg-white/70 border-b border-slate-200/60 shrink-0">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search notes in this playlist..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 rounded-xl border border-transparent focus:border-amber-400 focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>
        )}

        {/* Playlist Items */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              No notes match your search.
            </div>
          ) : (
            filtered.map((note, idx) => {
              const isDrive = isGoogleDriveResource(note.url)
              return (
                <div
                  key={note.id || idx}
                  onClick={() => {
                    onOpenMaterial({
                      id: note.id,
                      title: note.title,
                      subject: card.subject,
                      url: note.url,
                      type: isDrive ? 'google_drive' : 'external_link'
                    })
                  }}
                  className="bg-white hover:bg-amber-50/40 border border-slate-200 hover:border-amber-300 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center shrink-0 group-hover:bg-amber-100/60 group-hover:border-amber-200 transition-colors">
                      <span className="text-[10px] font-black text-slate-700">#{idx + 1}</span>
                      <span className="text-[7.5px] font-extrabold uppercase text-slate-500 group-hover:text-amber-800">
                        {isDrive ? 'PDF' : 'LINK'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-amber-950 truncate">
                        {note.title}
                      </h4>
                      {note.description && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {note.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl bg-slate-100 group-hover:bg-amber-500 text-slate-700 group-hover:text-white font-bold text-xs transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    <span>Open</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="text-[11px] font-medium">Click any document to view in-app</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

const TABS = [
  { id: 'My Batch',   label: 'My Batch',     icon: GraduationCap },
  { id: 'All',        label: 'Free Library', icon: Globe },
  { id: 'Featured',   label: 'Featured',     icon: Sparkles },
  { id: 'Bookmarked', label: 'Bookmarked',   icon: Heart },
]

export default function StudySection() {
  const { user, profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [cards,            setCards]            = useState([])
  const [bookmarks,        setBookmarks]        = useState(new Set())
  const [tab,              setTab]              = useState('My Batch') // Default landing tab
  const [loading,          setLoading]          = useState(true)
  const [liveClass,        setLiveClass]        = useState(null)
  const [liveDismissed,    setLiveDismissed]    = useState(false)
  const [batchId,          setBatchId]          = useState(null)
  const [batchName,        setBatchName]        = useState('')
  const [studentSubjects,  setStudentSubjects]  = useState([])
  const [selectedSubject,  setSelectedSubject]  = useState(null) // null = Subject Hub view
  const [selectedCategory, setSelectedCategory] = useState(null) // null = Category Selection View ('video', 'drive', 'link', 'bookmarked')
  const [searchQuery,      setSearchQuery]      = useState('')
  const [highlightedCardId, setHighlightedCardId] = useState(null)
  const [showSubjectSwitcher, setShowSubjectSwitcher] = useState(false)
  const [viewingMaterial, setViewingMaterial] = useState(null)
  const [notesPlaylistCard, setNotesPlaylistCard] = useState(null)

  const handleOpenNotes = (card) => {
    if (Array.isArray(card?.attached_notes) && card.attached_notes.length === 1) {
      const single = card.attached_notes[0]
      setViewingMaterial({
        id: single.id,
        title: single.title,
        subject: card.subject,
        url: single.url,
        type: isGoogleDriveResource(single.url) ? 'google_drive' : 'external_link'
      })
    } else if (Array.isArray(card?.attached_notes) && card.attached_notes.length > 1) {
      setNotesPlaylistCard(card)
    }
  }

  const handleWatchCard = (card) => {
    const returnSub = selectedSubject || card.subject || ''
    navigate(`/student/watch/${card.id}?returnSubject=${encodeURIComponent(returnSub)}`, {
      state: { card, returnSubject: returnSub }
    })
  }

  // Helper to select subject and category while syncing URL
  const selectSubject = (subj, cat = null) => {
    setSelectedSubject(subj)
    setSelectedCategory(cat)
    if (subj) {
      const catQuery = cat ? `&category=${encodeURIComponent(cat)}` : ''
      navigate(`/student/study?subject=${encodeURIComponent(subj)}${catQuery}`)
    } else {
      navigate('/student/study')
    }
  }

  const selectCategory = (cat) => {
    setSelectedCategory(cat)
    if (selectedSubject) {
      const catQuery = cat ? `&category=${encodeURIComponent(cat)}` : ''
      navigate(`/student/study?subject=${encodeURIComponent(selectedSubject)}${catQuery}`)
    }
  }

  // Parse URL search parameters for direct navigation / back navigation
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const subjParam = params.get('subject')
    const catParam = params.get('category')
    const cardIdParam = params.get('cardId')

    setSelectedSubject(subjParam || null)
    if (subjParam) {
      setTab('My Batch')
    }
    setSelectedCategory(catParam || null)
    setHighlightedCardId(cardIdParam || null)
  }, [location.search])

  // Scroll to targeted card after loading
  useEffect(() => {
    if (!loading && highlightedCardId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`card-${highlightedCardId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [loading, highlightedCardId])

  // Get student batch + subjects + batch name
  useEffect(() => {
    if (!user) return
    supabase.from('student_profiles')
      .select('batch_id, subjects, batches(name)')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setBatchId(data?.batch_id ?? null)
        setBatchName(data?.batches?.name ?? '')
        setStudentSubjects(data?.subjects ?? [])
      })
  }, [user])

  // Fetch live class (realtime)
  useEffect(() => {
    if (!user) return
    let unmounted = false

    const fetchLive = () => {
      let q = supabase.from('live_classes').select('*, profiles!teacher_id(full_name)')
        .eq('is_active', true).order('created_at', { ascending: false }).limit(1)
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

  // Auto-resolve target card subject & category if navigating directly from Dashboard
  useEffect(() => {
    if (highlightedCardId && cards.length > 0) {
      const targetCard = cards.find(c => c.id === highlightedCardId)
      if (targetCard) {
        if (targetCard.subject) {
          setSelectedSubject(targetCard.subject)
        }
        setTab('My Batch')

        // Automatically set category based on target card type
        if (targetCard.type === 'youtube_video' || targetCard.type === 'youtube_playlist') {
          setSelectedCategory('video')
        } else if (targetCard.type === 'google_drive') {
          setSelectedCategory('drive')
        } else if (targetCard.type === 'external_link') {
          setSelectedCategory('link')
        } else {
          setSelectedCategory('video')
        }
      }
    }
  }, [highlightedCardId, cards])

  // Fetch study cards based on tab + batchId
  useEffect(() => {
    if (!user) return

    setLoading(true)
    let query = supabase.from('study_cards').select('*').eq('is_active', true).order('display_order')

    if (searchQuery.trim()) {
      // Searching -> fetch all accessible cards (public OR for student's batch)
      if (batchId) query = query.or(`is_public.eq.true,batch_id.eq.${batchId},batch_ids.cs.{${batchId}}`)
      else         query = query.eq('is_public', true)
    } else if (tab === 'Featured') {
      query = query.eq('is_featured', true)
      if (batchId) {
        query = query.or(`is_public.eq.true,batch_id.eq.${batchId},batch_ids.cs.{${batchId}}`)
      } else {
        query = query.eq('is_public', true)
      }
    } else if (tab === 'My Batch') {
      if (batchId) {
        query = query.or(`batch_id.eq.${batchId},batch_ids.cs.{${batchId}}`)
      } else {
        query = query.or('is_public.eq.true,is_public.eq.false')
      }
    } else if (tab === 'All') {
      // Free Library: strictly public cards allowed on Public/Landing page for student's enrolled batch
      query = query.eq('is_public', true)
      if (batchId) {
        query = query.or(`batch_id.eq.${batchId},batch_ids.cs.{${batchId}}`)
      }
    } else if (tab === 'Bookmarked') {
      if (batchId) query = query.or(`is_public.eq.true,batch_id.eq.${batchId},batch_ids.cs.{${batchId}}`)
      else         query = query.eq('is_public', true)
    }

    query.then(({ data, error }) => {
      if (error && tab === 'All' && batchId) {
        // Fallback: If PostgREST .or() with array query errors, fetch public cards and filter in memory
        supabase.from('study_cards')
          .select('*')
          .eq('is_active', true)
          .eq('is_public', true)
          .order('display_order')
          .then(({ data: fallbackData }) => {
            const matched = (fallbackData ?? []).filter(c =>
              c.is_public && (
                c.batch_id === batchId ||
                (Array.isArray(c.batch_ids) && c.batch_ids.includes(batchId))
              )
            )
            setCards(matched)
            setLoading(false)
          })
      } else {
        setCards(data ?? [])
        setLoading(false)
      }
    })
  }, [tab, batchId, searchQuery, user])

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
      const { error } = await supabase.from('student_bookmarks')
        .upsert({ student_id: user.id, study_card_id: cardId }, { onConflict: 'student_id,study_card_id', ignoreDuplicates: true })
      if (error) { toast.error(error.message); return }
      setBookmarks(s => new Set(s).add(cardId))
      toast.success('Bookmarked!')
    }
  }

  // Helper for case-insensitive count of cards in a subject
  const getSubjectCardCount = (subjName) => {
    if (!subjName) return 0
    const s = subjName.toLowerCase()
    return cards.filter(c => c.subject?.toLowerCase() === s).length
  }

  // Filtered cards list belonging to the currently active subject
  const subjectCards = useMemo(() => {
    if (!selectedSubject) return []
    const s = selectedSubject.toLowerCase()
    return cards.filter(c => c.subject?.toLowerCase() === s)
  }, [cards, selectedSubject])

  // Category counts inside the selected subject workspace
  const subjectCategoryCounts = useMemo(() => {
    const counts = { video: 0, drive: 0, link: 0, bookmarked: 0 }
    subjectCards.forEach(c => {
      if (c.type === 'youtube_video' || c.type === 'youtube_playlist') counts.video++
      else if (c.type === 'google_drive') counts.drive++
      else if (c.type === 'external_link') counts.link++
      if (bookmarks.has(c.id)) counts.bookmarked++
    })
    return counts
  }, [subjectCards, bookmarks])

  // Active cards to render inside the selected category
  const categoryCardsToDisplay = useMemo(() => {
    if (!selectedCategory) return []
    if (selectedCategory === 'video') return subjectCards.filter(c => c.type === 'youtube_video' || c.type === 'youtube_playlist')
    if (selectedCategory === 'drive') return subjectCards.filter(c => c.type === 'google_drive')
    if (selectedCategory === 'link') return subjectCards.filter(c => c.type === 'external_link')
    if (selectedCategory === 'bookmarked') return subjectCards.filter(c => bookmarks.has(c.id))
    return subjectCards
  }, [subjectCards, selectedCategory, bookmarks])

  // Horizontal shelf ref and navigation for compact Recent Batch Uploads
  const recentShelfRef = useRef(null)

  const scrollShelf = (direction) => {
    if (recentShelfRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300
      recentShelfRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  // Strictly the latest top 10 batch uploads of the enrolled batch (sorted by created_at DESC)
  const recentBatchCards = useMemo(() => {
    if (!cards || cards.length === 0) return []
    const batchOnly = batchId
      ? cards.filter(c => c.batch_id === batchId || (Array.isArray(c.batch_ids) && c.batch_ids.includes(batchId)))
      : cards
    const sorted = [...batchOnly].sort((a, b) => {
      if (a.created_at && b.created_at) {
        return new Date(b.created_at) - new Date(a.created_at)
      }
      if (a.id && b.id) return String(b.id).localeCompare(String(a.id))
      return 0
    })
    return sorted.slice(0, 10)
  }, [cards, batchId])

  // Reset subject and category selection when switching away from My Batch tab
  useEffect(() => {
    if (tab !== 'My Batch') {
      setSelectedSubject(null)
      setSelectedCategory(null)
    }
  }, [tab])

  // Filtered cards list with case-insensitive subject & category matching
  const filteredCards = useMemo(() => {
    let list = cards

    // Free Library tab: strictly public cards allowed on Public/Landing page for student's enrolled batch
    if (tab === 'All') {
      list = list.filter(c => {
        if (!c.is_public) return false
        if (batchId) {
          const inBatchId = c.batch_id === batchId
          const inBatchIds = Array.isArray(c.batch_ids) && c.batch_ids.includes(batchId)
          return inBatchId || inBatchIds
        }
        return true
      })
    } else if (tab === 'Bookmarked') {
      list = list.filter(c => bookmarks.has(c.id))
    } else if (tab === 'Featured') {
      list = list.filter(c => {
        if (!c.is_featured) return false
        if (c.is_public) return true
        if (batchId) {
          return c.batch_id === batchId || (Array.isArray(c.batch_ids) && c.batch_ids.includes(batchId))
        }
        return false
      })
    }

    // Only scope by selectedSubject when inside My Batch tab
    if (tab === 'My Batch' && selectedSubject) {
      const s = selectedSubject.toLowerCase()
      list = list.filter(c => c.subject?.toLowerCase() === s)
    }

    if (selectedCategory) {
      if (selectedCategory === 'video') list = list.filter(c => c.type === 'youtube_video' || c.type === 'youtube_playlist')
      else if (selectedCategory === 'drive') list = list.filter(c => c.type === 'google_drive')
      else if (selectedCategory === 'link') list = list.filter(c => c.type === 'external_link')
      else if (selectedCategory === 'bookmarked') list = list.filter(c => bookmarks.has(c.id))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(c =>
        (c.title?.toLowerCase() || '').includes(q) ||
        (c.description?.toLowerCase() || '').includes(q) ||
        (c.subject?.toLowerCase() || '').includes(q)
      )
    }
    return list
  }, [cards, tab, bookmarks, selectedCategory, selectedSubject, searchQuery, batchId])

  const studentName = profile?.full_name?.split(' ')?.[0] || 'Student'

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      {/* Live class banner */}
      {liveClass && !liveDismissed && (
        <LiveClassBanner liveClass={liveClass} onDismiss={() => setLiveDismissed(true)} />
      )}

      {/* ── TOPMOST ACTIVE BATCH INDICATOR CARD (Shown ONLY on Main Study Landing Page, hidden when exploring subject workspace) ── */}
      {batchName && !selectedSubject && (
        <div className="bg-slate-100/90 border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-row items-center justify-between gap-3 sm:gap-6 shadow-xs select-none">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-200/90 text-slate-700 text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
              <School className="h-3.5 w-3.5 text-slate-600 shrink-0" />
              <span>Active Batch</span>
            </div>
            <h2 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {batchName}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 bg-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200/90 shrink-0 shadow-2xs">
            <div className="text-center px-1.5 sm:px-2.5 border-r border-slate-200">
              <p className="text-xs sm:text-lg font-black text-slate-900">{studentSubjects.length}</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Subjects</p>
            </div>
            <div className="text-center px-1.5 sm:px-2.5">
              <p className="text-xs sm:text-lg font-black text-slate-900">{cards.length}</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Lectures</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP EDTECH NAVIGATION HEADER (Shown on Study Landing View only) ── */}
      {!selectedSubject && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-950 text-amber-400 rounded-xl shadow-sm">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-xl font-black text-gray-900 tracking-tight">
                    Welcome back, {studentName}! 👋
                  </h1>
                  <p className="text-xs text-gray-500 font-medium">
                    {batchName ? `Enrolled in ${batchName}` : 'Explore lectures & study material'}
                  </p>
                </div>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search lectures, topics, or notes…"
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-950 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Primary Navigation Segment Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-t border-gray-100 pt-3">
            {TABS.map(t => {
              const Icon = t.icon
              const isActive = tab === t.id && !searchQuery.trim()
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTab(t.id)
                    setSelectedSubject(null)
                    setSelectedCategory(null)
                    setSearchQuery('')
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-950 text-white shadow-md shadow-blue-950/20 scale-[1.02]'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-amber-400' : 'text-gray-400'}`} />
                  <span>{t.label}</span>
                  {t.id === 'My Batch' && batchName && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-900'
                    }`}>
                      {batchName}
                    </span>
                  )}
                  {t.id === 'Bookmarked' && bookmarks.size > 0 && (
                    <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
                    }`}>
                      {bookmarks.size}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── SEARCH RESULTS OVERRIDE ── */}
      {searchQuery.trim() !== '' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-950" /> Search Results for &ldquo;{searchQuery}&rdquo;
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Found {filteredCards.length} {filteredCards.length === 1 ? 'matching item' : 'matching items'}
              </p>
            </div>
            <button
              onClick={() => setSearchQuery('')}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
            >
              Clear Search
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="h-44 bg-gray-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-8 bg-gray-200 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-bold text-gray-800 text-base">No Matching Lectures Found</h3>
              <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
                No study cards match &ldquo;{searchQuery}&rdquo;. Try checking for typos or searching a different term.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-blue-950 text-white text-xs font-bold rounded-xl hover:bg-blue-900 transition-colors"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4">
              {filteredCards.map(c => (
                <StudyCard
                  key={c.id}
                  card={c}
                  bookmarked={bookmarks.has(c.id)}
                  onBookmark={toggleBookmark}
                  isHighlighted={c.id === highlightedCardId}
                  onWatch={handleWatchCard}
                  onOpenMaterial={setViewingMaterial}
                  onOpenNotes={handleOpenNotes}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── MY BATCH VIEW — SUBJECT HUB vs SUBJECT WORKSPACE ── */
        tab === 'My Batch' ? (
          selectedSubject === null ? (
            /* 🎓 SUBJECT HUB (PW-Style Cards Dashboard) */
            <div className="space-y-6">

              {/* Subject Grid Section */}
              {!batchId ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                  <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="font-bold text-gray-800 text-lg">No Batch Assigned</h3>
                  <p className="text-sm text-gray-400 max-w-sm mx-auto mt-1">
                    You aren&apos;t enrolled in a batch currently. Please contact your administrator.
                  </p>
                </div>
              ) : studentSubjects.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                  <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="font-bold text-gray-800 text-lg">No Enrolled Subjects</h3>
                  <p className="text-sm text-gray-400 max-w-sm mx-auto mt-1">
                    Ask your institute admin to add your subjects to your profile.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                      <Layers className="h-5 w-5 text-blue-950" /> Select Subject Workspace
                    </h3>
                    <span className="text-xs text-gray-400 font-medium">Tap subject to open</span>
                  </div>

                  {/* Compact, Flex-Responsive Subject Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {studentSubjects.map(sub => {
                      const theme = getSubjectTheme(sub)
                      const Icon = theme.icon
                      const count = getSubjectCardCount(sub)

                      return (
                        <button
                          key={sub}
                          onClick={() => {
                            selectSubject(sub)
                          }}
                          className={`group text-left bg-gradient-to-br ${theme.gradient} text-white rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-28 sm:h-32 relative overflow-hidden cursor-pointer border border-white/10`}
                        >
                          <div className="flex items-center justify-between relative z-10">
                            <div className="p-2 bg-white/15 backdrop-blur-md rounded-xl border border-white/20 group-hover:scale-110 transition-transform">
                              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                            </div>
                            <span className="text-[10px] font-black bg-white/20 backdrop-blur-md text-white px-2 py-0.5 rounded-full border border-white/20">
                              {count} {count === 1 ? 'Item' : 'Items'}
                            </span>
                          </div>

                          <div className="relative z-10 flex items-center justify-between gap-2 mt-2">
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-base font-black text-white tracking-tight truncate group-hover:text-amber-300 transition-colors">
                                {sub}
                              </h4>
                              <p className="text-[10px] text-white/75 font-medium truncate">
                                Subject Workspace
                              </p>
                            </div>
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 text-white flex items-center justify-center group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors shrink-0">
                              <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ─── SHOWCASE THEATRE: RECENT BATCH UPLOADS (TOP 10 COMPACT REEL) ─── */}
              {recentBatchCards.length > 0 && (
                <section
                  aria-label="Recent Batch Uploads"
                  className="rounded-3xl p-4 sm:p-5 text-white shadow-xl shadow-black/25 border border-white/10 relative overflow-hidden bg-gradient-to-br from-[#121316] via-[#1a1b20] to-[#141518]"
                >
                  {/* Subtle atmospheric ambient glow (Google & Instagram inspired) */}
                  <div className="absolute -top-16 -right-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Header */}
                  <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-3 gap-2">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400/15 to-orange-400/15 border border-amber-400/30 text-amber-300 text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wider mb-1 shadow-2xs">
                        <Sparkles className="h-3 w-3 fill-current text-amber-400" />
                        <span>Latest for your Batch</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                        Recent Batch Uploads
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-400 font-normal line-clamp-1">
                        Latest lessons, chapter notes & materials for your batch
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold text-slate-300 bg-white/10 border border-white/15 px-2.5 py-0.5 rounded-full">
                        {recentBatchCards.length} {recentBatchCards.length === 1 ? 'Upload' : 'Uploads'}
                      </span>

                      {/* Desktop Navigation Chevrons */}
                      <div className="hidden sm:flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => scrollShelf('left')}
                          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
                          title="Previous uploads"
                          aria-label="Scroll left"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollShelf('right')}
                          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
                          title="Next uploads"
                          aria-label="Scroll right"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Snap Reel: Compact, Never Stretches Vertically */}
                  <div className="relative z-10 pt-3">
                    <div
                      ref={recentShelfRef}
                      className="flex gap-3 overflow-x-auto snap-x snap-mandatory py-1 px-0.5 scrollbar-none scroll-smooth -mx-1 sm:mx-0"
                    >
                      {recentBatchCards.map(c => (
                        <div
                          key={c.id}
                          className="w-[165px] sm:w-[195px] md:w-[220px] shrink-0 snap-start flex flex-col"
                        >
                          <StudyCard
                            card={c}
                            bookmarked={bookmarks.has(c.id)}
                            onBookmark={toggleBookmark}
                            isHighlighted={c.id === highlightedCardId}
                            onWatch={handleWatchCard}
                            onOpenMaterial={setViewingMaterial}
                            onOpenNotes={handleOpenNotes}
                            className="h-full"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Subtle Mobile Swipe Cue */}
                    <div className="sm:hidden text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1.5 pt-2 select-none">
                      <ChevronLeft className="h-2.5 w-2.5 text-slate-500" />
                      <span>Swipe horizontally to view all {recentBatchCards.length} uploads</span>
                      <ChevronRight className="h-2.5 w-2.5 text-slate-500" />
                    </div>
                  </div>
                </section>
              )}

            </div>
          ) : (
            /* 📚 SUBJECT WORKSPACE (Opened Subject View) */
            <div className="space-y-6">

              {/* Subject Header & Navigation Bar */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        selectSubject(null)
                      }}
                      className="p-2 sm:p-2.5 rounded-xl bg-gray-100 hover:bg-blue-950 hover:text-white text-gray-700 transition-colors shrink-0 flex items-center gap-1"
                      title="Back to All Subjects"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md">
                          {batchName}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mt-0.5">
                        {selectedSubject}
                      </h2>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider block">Subject Hub</span>
                    <span className="text-xs sm:text-sm font-black text-blue-950 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60 inline-block mt-0.5">
                      {subjectCards.length} {subjectCards.length === 1 ? 'Item' : 'Items'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── MODE A: NO CATEGORY SELECTED -> SHOW THE 4 CATEGORY CARDS ── */}
              {!selectedCategory ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                        Select Content Category
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">
                        Choose a category below to explore lectures, notes, and resources for {selectedSubject}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                    {/* 1. Video Lectures Category Card */}
                    <button
                      onClick={() => selectCategory('video')}
                      className="group relative overflow-hidden rounded-2xl p-4 sm:p-5 text-left transition-all duration-300 bg-red-50/80 hover:bg-red-100/90 border border-red-200/80 hover:border-red-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between h-36 sm:h-44"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="p-2.5 sm:p-3 rounded-xl bg-red-100 text-red-700 shadow-2xs border border-red-200/60">
                          <Youtube className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold bg-white text-red-700 px-2.5 py-1 rounded-full border border-red-200/60 shadow-2xs">
                          {subjectCategoryCounts.video} {subjectCategoryCounts.video === 1 ? 'Video' : 'Videos'}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base sm:text-lg font-black tracking-tight text-slate-900 group-hover:text-red-950 transition-colors flex items-center justify-between">
                          <span>Video Lectures</span>
                          <ArrowRight className="h-4 w-4 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0.5" />
                        </h4>
                        <p className="text-[11px] sm:text-xs text-red-900/60 font-medium mt-0.5 line-clamp-1">
                          Recorded sessions & playlists
                        </p>
                      </div>
                    </button>

                    {/* 2. Notes & Drive Category Card */}
                    <button
                      onClick={() => selectCategory('drive')}
                      className="group relative overflow-hidden rounded-2xl p-4 sm:p-5 text-left transition-all duration-300 bg-amber-50/80 hover:bg-amber-100/90 border border-amber-200/80 hover:border-amber-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between h-36 sm:h-44"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="p-2.5 sm:p-3 rounded-xl bg-amber-100 text-amber-800 shadow-2xs border border-amber-200/60">
                          <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold bg-white text-amber-800 px-2.5 py-1 rounded-full border border-amber-200/60 shadow-2xs">
                          {subjectCategoryCounts.drive} {subjectCategoryCounts.drive === 1 ? 'File' : 'Files'}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base sm:text-lg font-black tracking-tight text-slate-900 group-hover:text-amber-950 transition-colors flex items-center justify-between">
                          <span>Notes & Drive</span>
                          <ArrowRight className="h-4 w-4 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0.5" />
                        </h4>
                        <p className="text-[11px] sm:text-xs text-amber-900/60 font-medium mt-0.5 line-clamp-1">
                          Chapter PDFs & study material
                        </p>
                      </div>
                    </button>

                    {/* 3. External Links Category Card */}
                    <button
                      onClick={() => selectCategory('link')}
                      className="group relative overflow-hidden rounded-2xl p-4 sm:p-5 text-left transition-all duration-300 bg-blue-50/80 hover:bg-blue-100/90 border border-blue-200/80 hover:border-blue-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between h-36 sm:h-44"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="p-2.5 sm:p-3 rounded-xl bg-blue-100 text-blue-700 shadow-2xs border border-blue-200/60">
                          <LinkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold bg-white text-blue-700 px-2.5 py-1 rounded-full border border-blue-200/60 shadow-2xs">
                          {subjectCategoryCounts.link} {subjectCategoryCounts.link === 1 ? 'Link' : 'Links'}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base sm:text-lg font-black tracking-tight text-slate-900 group-hover:text-blue-950 transition-colors flex items-center justify-between">
                          <span>Links & Web</span>
                          <ArrowRight className="h-4 w-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0.5" />
                        </h4>
                        <p className="text-[11px] sm:text-xs text-blue-900/60 font-medium mt-0.5 line-clamp-1">
                          Reference tools & web links
                        </p>
                      </div>
                    </button>

                    {/* 4. Bookmarked Material Category Card */}
                    <button
                      onClick={() => selectCategory('bookmarked')}
                      className="group relative overflow-hidden rounded-2xl p-4 sm:p-5 text-left transition-all duration-300 bg-purple-50/80 hover:bg-purple-100/90 border border-purple-200/80 hover:border-purple-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between h-36 sm:h-44"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="p-2.5 sm:p-3 rounded-xl bg-purple-100 text-purple-700 shadow-2xs border border-purple-200/60">
                          <Heart className="h-5 w-5 sm:h-6 sm:w-6 fill-current" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold bg-white text-purple-700 px-2.5 py-1 rounded-full border border-purple-200/60 shadow-2xs">
                          {subjectCategoryCounts.bookmarked} Saved
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base sm:text-lg font-black tracking-tight text-slate-900 group-hover:text-purple-950 transition-colors flex items-center justify-between">
                          <span>Bookmarked</span>
                          <ArrowRight className="h-4 w-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0.5" />
                        </h4>
                        <p className="text-[11px] sm:text-xs text-purple-900/60 font-medium mt-0.5 line-clamp-1">
                          Your saved items for {selectedSubject}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                /* ── MODE B: CATEGORY IS SELECTED -> SHOW CATEGORY HEADER & MATERIALS GRID ── */
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        onClick={() => selectCategory(null)}
                        className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center gap-1 text-xs font-bold shrink-0"
                        title="Back to Categories"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Categories</span>
                      </button>

                      <div className="h-5 w-px bg-gray-200" />

                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-black text-gray-900">
                          {selectedCategory === 'video' && '🎥 Video Lectures'}
                          {selectedCategory === 'drive' && '📁 Notes & Drive'}
                          {selectedCategory === 'link' && '🔗 Links & Web'}
                          {selectedCategory === 'bookmarked' && '🔖 Bookmarked Material'}
                        </span>
                        <span className="text-xs font-bold text-gray-400">
                          ({categoryCardsToDisplay.length})
                        </span>
                      </div>
                    </div>

                    {/* Quick Category Switcher Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                      {[
                        { id: 'video', label: 'Videos' },
                        { id: 'drive', label: 'Notes' },
                        { id: 'link', label: 'Links' },
                        { id: 'bookmarked', label: 'Bookmarked' },
                      ].map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => selectCategory(cat.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                            selectedCategory === cat.id
                              ? 'bg-blue-950 text-white shadow-2xs'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Study Cards Grid */}
                  {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                          <div className="aspect-video bg-gray-200" />
                          <div className="p-2.5 sm:p-3.5 space-y-2">
                            <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                            <div className="h-3 bg-gray-100 rounded w-1/2" />
                            <div className="h-7 bg-gray-200 rounded-xl" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : categoryCardsToDisplay.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                      <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="font-bold text-gray-800 text-base">No Items Found</h3>
                      <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
                        No content uploaded under this category for {selectedSubject} yet.
                      </p>
                      <button
                        onClick={() => selectCategory(null)}
                        className="mt-4 px-4 py-2 bg-blue-950 text-white text-xs font-bold rounded-xl hover:bg-blue-900 transition-colors"
                      >
                        Back to Categories
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4">
                      {categoryCardsToDisplay.map(c => (
                        <StudyCard
                          key={c.id}
                          card={c}
                          bookmarked={bookmarks.has(c.id)}
                          onBookmark={toggleBookmark}
                          isHighlighted={c.id === highlightedCardId}
                          onWatch={handleWatchCard}
                          onOpenMaterial={setViewingMaterial}
                          onOpenNotes={handleOpenNotes}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )
        ) : (
          /* ── NON-BATCH TABS (Free Library, Featured, Bookmarked) ── */
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div>
                <h2 className="text-lg font-extrabold text-gray-900">
                  {tab === 'All' ? 'Free Library & Public Content' : tab === 'Featured' ? 'Featured Lectures' : 'Bookmarked Material'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {filteredCards.length} {filteredCards.length === 1 ? 'item' : 'items'} available
                  {tab === 'All' && batchName ? ` • ${batchName} Public Content` : ''}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                    <div className="aspect-video bg-gray-200" />
                    <div className="p-2.5 sm:p-3.5 space-y-2">
                      <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-7 bg-gray-200 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-bold text-gray-800 text-base">No Items Found</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {tab === 'Bookmarked'
                    ? 'No bookmarked items yet. Tap the heart icon on any card to save it here.'
                    : tab === 'All'
                    ? `No public resources available for ${batchName || 'your batch'} in the Free Library yet.`
                    : 'No materials available in this section yet.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4">
                {filteredCards.map(c => (
                  <StudyCard
                    key={c.id}
                    card={c}
                    bookmarked={bookmarks.has(c.id)}
                    onBookmark={toggleBookmark}
                    isHighlighted={c.id === highlightedCardId}
                    onWatch={handleWatchCard}
                    onOpenMaterial={setViewingMaterial}
                    onOpenNotes={handleOpenNotes}
                  />
                ))}
              </div>
            )}
          </div>
        )
      )}

      {/* ── Android Recents Style Floating All Subjects Dot (Bottom Right) ── */}
      {selectedSubject && (
        <button
          onClick={() => setShowSubjectSwitcher(true)}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 p-3.5 sm:px-4 sm:py-3 bg-blue-950 hover:bg-indigo-900 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all border border-blue-800/60 flex items-center gap-2 group cursor-pointer"
          title="Subject Switcher"
        >
          <div className="relative flex items-center justify-center">
            <Layers className="h-5 w-5 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
          </div>
          <span className="text-xs font-black tracking-wide hidden sm:inline">Subject Switcher</span>
        </button>
      )}

      {/* ── Android Recents Style Quick Subject Switcher Overlay ── */}
      {showSubjectSwitcher && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-transparent p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowSubjectSwitcher(false)}
        >
          <div
            className="bg-slate-900 text-white rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-700/80 w-full max-w-md sm:max-w-lg p-3.5 sm:p-4 shadow-[0_-12px_40px_rgba(0,0,0,0.6)] sm:shadow-2xl flex flex-col h-[50vh] max-h-[50vh] animate-in slide-in-from-bottom duration-300 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-400/20 text-amber-400 rounded-lg">
                  <Layers className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-white tracking-tight">Subject Switcher</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Tap any subject to jump instantly</p>
                </div>
              </div>
              <button
                onClick={() => setShowSubjectSwitcher(false)}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Close"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Android Recents Cards List (Compact & Scrollable within 50% screen) */}
            <div className="flex-1 overflow-y-auto space-y-1.5 py-2 min-h-0 pr-1">
              {studentSubjects.map(sub => {
                const theme = getSubjectTheme(sub)
                const Icon = theme.icon
                const isCurrent = selectedSubject === sub
                const count = getSubjectCardCount(sub)

                return (
                  <button
                    key={sub}
                    onClick={() => {
                      selectSubject(sub)
                      setShowSubjectSwitcher(false)
                      toast.success(`Switched to ${sub}`)
                    }}
                    className={`w-full py-2 px-3 sm:py-2.5 sm:px-3.5 rounded-xl sm:rounded-2xl border transition-all text-left flex items-center justify-between gap-3 group cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-400/15 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/50 opacity-100'
                        : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 hover:border-slate-600 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-slate-700/60 text-white shrink-0 group-hover:scale-105 transition-transform">
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate tracking-tight">{sub}</h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                          {count} {count === 1 ? 'Item' : 'Items'} available
                        </p>
                      </div>
                    </div>

                    <div className="p-1.5 sm:p-2 rounded-lg bg-slate-700/60 text-white shrink-0 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                      <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Mid-Bottom Minimalistic Home Icon (View All Subjects / Main Hub) */}
            <div className="pt-2 pb-0.5 border-t border-slate-800 flex items-center justify-center shrink-0">
              <button
                onClick={() => {
                  selectSubject(null)
                  setShowSubjectSwitcher(false)
                }}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-800 hover:bg-amber-400 text-amber-300 hover:text-slate-950 border border-slate-700 hover:border-amber-400 shadow-md hover:shadow-amber-400/25 active:scale-90 transition-all flex items-center justify-center cursor-pointer group"
                title="View All Subjects (Main Hub)"
                aria-label="View All Subjects (Main Hub)"
              >
                <Home className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Notes Playlist Modal */}
      {notesPlaylistCard && (
        <StudentNotesPlaylistModal
          card={notesPlaylistCard}
          onClose={() => setNotesPlaylistCard(null)}
          onOpenMaterial={(mat) => setViewingMaterial(mat)}
        />
      )}

      {/* In-App Material Viewer Modal for Drive & External Resources */}
      {viewingMaterial && (
        <MaterialViewerModal
          card={viewingMaterial}
          onClose={() => setViewingMaterial(null)}
        />
      )}

      {/* ── End of Study Section ── */}
    </div>
  )
}
