import { BookOpen, Atom, FlaskConical, Dna, Calculator, Globe, BookMarked, Youtube, FileText, Link as LinkIcon } from 'lucide-react'

// ──────────────────────────────────────────────────────────────────────────────
// Shared Study Section Utilities
// Used by Student, Teacher and Admin study portals for consistent theming
// ──────────────────────────────────────────────────────────────────────────────

/** Subject Theme Resolver — Physics Wallah / Premium EdTech Style */
export function getSubjectTheme(subjectName = '') {
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

export { getYTVideoId, getYTPlaylistId, getYTThumb, isValidPlaylistId } from './youtube'

/** Card type badge configuration */
export const TYPE_BADGES = {
  youtube_video:    { label: 'Video Lecture', color: 'bg-red-50 text-red-700 border-red-200',        IconComp: Youtube },
  youtube_playlist: { label: 'Playlist',      color: 'bg-red-50 text-red-700 border-red-200',        IconComp: Youtube },
  google_drive:     { label: 'Notes / Drive', color: 'bg-amber-50 text-amber-800 border-amber-300',  IconComp: FileText },
  external_link:    { label: 'Link',          color: 'bg-blue-50 text-blue-700 border-blue-200',    IconComp: LinkIcon },
}

/** Card type options for forms */
export const CARD_TYPES = [
  { value: 'youtube_video',    label: 'YouTube Video'    },
  { value: 'youtube_playlist', label: 'YouTube Playlist' },
  { value: 'google_drive',     label: 'Google Drive'     },
  { value: 'external_link',    label: 'External Link'    },
]

/** Empty form template for Add Card modal */
export const EMPTY_CARD_FORM = {
  title: '', description: '', type: 'youtube_video', url: '',
  is_public: false, batch_ids: [], subject: '', display_order: 0, is_featured: false,
  chapter_id: null, chapter: '',
}

/** Returns unique union of subjects across all or selected batch objects */
export function unionSubjects(batches = [], selectedIds = null) {
  const set = new Set()
  if (!selectedIds || selectedIds.length === 0) {
    (batches || []).forEach(b => (b?.subjects ?? []).forEach(s => set.add(s)))
  } else {
    (batches || []).filter(b => selectedIds.includes(b.id)).forEach(b => (b?.subjects ?? []).forEach(s => set.add(s)))
  }
  return [...set].sort()
}
