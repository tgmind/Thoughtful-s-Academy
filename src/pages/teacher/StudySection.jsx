import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen, PlayCircle, Youtube,
  Link as LinkIcon, Sparkles, Globe, Search, X, FolderOpen,
  ArrowRight, Play, School, FileText, Plus, Edit2,
  Trash2, Lock, Eye, EyeOff, ChevronDown, Check,
  Folder, ArrowLeft, Grid, List, Clock, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { normalizeUrl } from '../../utils/formatters'
import { getSubjectTheme, getYTVideoId, getYTPlaylistId, getYTThumb, TYPE_BADGES, EMPTY_CARD_FORM, unionSubjects } from '../../utils/studyHelpers'
import { logActivity } from '../../lib/activityLogger'
import ActivityLogModal from '../../components/shared/ActivityLogModal'
import MaterialViewerModal from '../../components/shared/MaterialViewerModal'
import NotesPlaylistModal from '../../components/shared/NotesPlaylistModal'
import ChapterSchemaAlert from '../../components/study/ChapterSchemaAlert'

// Vibrant aesthetic themes for batch workspace cards
const BATCH_THEMES = [
  {
    cardBg: 'bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-white border-blue-200/90 hover:border-blue-500 hover:shadow-blue-500/10',
    iconBg: 'bg-blue-600 text-white shadow-md shadow-blue-600/30',
    badgeBg: 'bg-white text-blue-700 border-blue-200 shadow-2xs',
    accentColor: 'text-blue-700',
    gradientRim: 'from-blue-500 to-indigo-600',
  },
  {
    cardBg: 'bg-gradient-to-br from-purple-50/90 via-pink-50/50 to-white border-purple-200/90 hover:border-purple-500 hover:shadow-purple-500/10',
    iconBg: 'bg-purple-600 text-white shadow-md shadow-purple-600/30',
    badgeBg: 'bg-white text-purple-700 border-purple-200 shadow-2xs',
    accentColor: 'text-purple-700',
    gradientRim: 'from-purple-500 to-pink-600',
  },
  {
    cardBg: 'bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-white border-emerald-200/90 hover:border-emerald-500 hover:shadow-emerald-500/10',
    iconBg: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30',
    badgeBg: 'bg-white text-emerald-700 border-emerald-200 shadow-2xs',
    accentColor: 'text-emerald-700',
    gradientRim: 'from-emerald-500 to-teal-600',
  },
  {
    cardBg: 'bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-white border-amber-200/90 hover:border-amber-500 hover:shadow-amber-500/10',
    iconBg: 'bg-amber-600 text-white shadow-md shadow-amber-600/30',
    badgeBg: 'bg-white text-amber-800 border-amber-200 shadow-2xs',
    accentColor: 'text-amber-800',
    gradientRim: 'from-amber-500 to-orange-600',
  },
]

// Curated premium dark themes for assigned "My Batches" cards
const DARK_BATCH_THEMES = [
  {
    cardBg: 'bg-gradient-to-br from-slate-950 via-indigo-950/90 to-slate-900 border-indigo-800/60 shadow-xl hover:border-indigo-500/60 hover:shadow-indigo-500/10 text-white',
    gradientRim: 'from-indigo-400 via-blue-400 to-cyan-400',
    iconBg: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40',
    badgeBg: 'bg-indigo-950/90 text-indigo-200 border-indigo-700/60',
    tagBg: 'text-indigo-200 bg-indigo-900/60 border-indigo-700/50',
    btnBg: 'bg-indigo-600 text-white group-hover:bg-indigo-500 shadow-md shadow-indigo-600/30'
  },
  {
    cardBg: 'bg-gradient-to-br from-slate-950 via-emerald-950/90 to-slate-900 border-emerald-800/60 shadow-xl hover:border-emerald-500/60 hover:shadow-emerald-500/10 text-white',
    gradientRim: 'from-emerald-400 via-teal-400 to-cyan-400',
    iconBg: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/40',
    badgeBg: 'bg-emerald-950/90 text-emerald-200 border-emerald-700/60',
    tagBg: 'text-emerald-200 bg-emerald-900/60 border-emerald-700/50',
    btnBg: 'bg-emerald-600 text-white group-hover:bg-emerald-500 shadow-md shadow-emerald-600/30'
  },
  {
    cardBg: 'bg-gradient-to-br from-slate-950 via-purple-950/90 to-slate-900 border-purple-800/60 shadow-xl hover:border-purple-500/60 hover:shadow-purple-500/10 text-white',
    gradientRim: 'from-purple-400 via-pink-400 to-rose-400',
    iconBg: 'bg-purple-600 text-white shadow-md shadow-purple-600/40',
    badgeBg: 'bg-purple-950/90 text-purple-200 border-purple-700/60',
    tagBg: 'text-purple-200 bg-purple-900/60 border-purple-700/50',
    btnBg: 'bg-purple-600 text-white group-hover:bg-purple-500 shadow-md shadow-purple-600/30'
  },
  {
    cardBg: 'bg-gradient-to-br from-slate-950 via-rose-950/90 to-slate-900 border-rose-800/60 shadow-xl hover:border-rose-500/60 hover:shadow-rose-500/10 text-white',
    gradientRim: 'from-rose-400 via-orange-400 to-amber-400',
    iconBg: 'bg-rose-600 text-white shadow-md shadow-rose-600/40',
    badgeBg: 'bg-rose-950/90 text-rose-200 border-rose-700/60',
    tagBg: 'text-rose-200 bg-rose-900/60 border-rose-700/50',
    btnBg: 'bg-rose-600 text-white group-hover:bg-rose-500 shadow-md shadow-rose-600/30'
  },
  {
    cardBg: 'bg-gradient-to-br from-slate-950 via-amber-950/90 to-slate-900 border-amber-800/60 shadow-xl hover:border-amber-500/60 hover:shadow-amber-500/10 text-white',
    gradientRim: 'from-amber-400 via-yellow-400 to-orange-400',
    iconBg: 'bg-amber-600 text-white shadow-md shadow-amber-600/40',
    badgeBg: 'bg-amber-950/90 text-amber-200 border-amber-700/60',
    tagBg: 'text-amber-200 bg-amber-900/60 border-amber-700/50',
    btnBg: 'bg-amber-600 text-white group-hover:bg-amber-500 shadow-md shadow-amber-600/30'
  },
  {
    cardBg: 'bg-gradient-to-br from-slate-950 via-teal-950/90 to-slate-900 border-teal-800/60 shadow-xl hover:border-teal-500/60 hover:shadow-teal-500/10 text-white',
    gradientRim: 'from-teal-400 via-cyan-400 to-blue-400',
    iconBg: 'bg-teal-600 text-white shadow-md shadow-teal-600/40',
    badgeBg: 'bg-teal-950/90 text-teal-200 border-teal-700/60',
    tagBg: 'text-teal-200 bg-teal-900/60 border-teal-700/50',
    btnBg: 'bg-teal-600 text-white group-hover:bg-teal-500 shadow-md shadow-teal-600/30'
  }
]

const FOLDER_TYPES = [
  {
    id: 'video',
    name: 'Video Lectures',
    icon: Youtube,
    cardBg: 'bg-rose-50/80 hover:bg-rose-100/90 border-rose-200/90 hover:border-rose-400 shadow-2xs hover:shadow-md hover:shadow-rose-500/10',
    iconBg: 'bg-rose-600 text-white shadow-sm shadow-rose-600/30',
    badgeBg: 'bg-white/95 text-rose-700 border border-rose-200/90 shadow-2xs font-extrabold',
    descColor: 'text-rose-700/80',
    unitSingular: 'Video',
    unitPlural: 'Videos',
    cardType: 'youtube_video',
    desc: 'Recorded classes & video series'
  },
  {
    id: 'drive',
    name: 'Notes & PDFs',
    icon: FileText,
    cardBg: 'bg-amber-50/80 hover:bg-amber-100/90 border-amber-200/90 hover:border-amber-400 shadow-2xs hover:shadow-md hover:shadow-amber-500/10',
    iconBg: 'bg-amber-600 text-white shadow-sm shadow-amber-600/30',
    badgeBg: 'bg-white/95 text-amber-800 border border-amber-200/90 shadow-2xs font-extrabold',
    descColor: 'text-amber-800/80',
    unitSingular: 'File',
    unitPlural: 'Files',
    cardType: 'google_drive',
    desc: 'Formula sheets & PDF documents'
  },
  {
    id: 'link',
    name: 'Web Links',
    icon: LinkIcon,
    cardBg: 'bg-blue-50/80 hover:bg-blue-100/90 border-blue-200/90 hover:border-blue-400 shadow-2xs hover:shadow-md hover:shadow-blue-500/10',
    iconBg: 'bg-blue-600 text-white shadow-sm shadow-blue-600/30',
    badgeBg: 'bg-white/95 text-blue-700 border border-blue-200/90 shadow-2xs font-extrabold',
    descColor: 'text-blue-700/80',
    unitSingular: 'Link',
    unitPlural: 'Links',
    cardType: 'external_link',
    desc: 'External reference & web tools'
  },
  {
    id: 'public',
    name: 'Public Free',
    icon: Globe,
    cardBg: 'bg-purple-50/80 hover:bg-purple-100/90 border-purple-200/90 hover:border-purple-400 shadow-2xs hover:shadow-md hover:shadow-purple-500/10',
    iconBg: 'bg-purple-600 text-white shadow-sm shadow-purple-600/30',
    badgeBg: 'bg-white/95 text-purple-700 border border-purple-200/90 shadow-2xs font-extrabold',
    descColor: 'text-purple-700/80',
    unitSingular: 'Item',
    unitPlural: 'Items',
    cardType: 'external_link',
    desc: 'Free showcase library content'
  },
]

const TYPE_OPTIONS = [
  { value: 'youtube_video', label: 'YouTube Video', icon: Youtube, color: 'text-red-500', bg: 'bg-red-500/10', desc: 'Single recorded video lecture' },
  { value: 'youtube_playlist', label: 'YouTube Playlist', icon: Youtube, color: 'text-red-500', bg: 'bg-red-500/10', desc: 'Series / playlist of lectures' },
  { value: 'google_drive', label: 'Google Drive / PDF', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10', desc: 'PDF notes, sheets, or docs' },
  { value: 'external_link', label: 'External Link', icon: LinkIcon, color: 'text-blue-500', bg: 'bg-blue-500/10', desc: 'Reference website or web resource' },
]

/** Extract clean domain name for external links */
function getDomainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'external link'
  }
}

/** Custom Dropdown for Card Type Selection in Form */
function CustomCardTypeSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const selected = TYPE_OPTIONS.find(o => o.value === value) || TYPE_OPTIONS[0]
  const SelectedIcon = selected.icon

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 flex items-center justify-between transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1 rounded-md ${selected.bg}`}>
            <SelectedIcon className={`h-3.5 w-3.5 ${selected.color} shrink-0`} />
          </div>
          <span className="truncate">{selected.label}</span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-50 animate-scale-in space-y-1">
            {TYPE_OPTIONS.map(opt => {
              const active = opt.value === value
              const Icon = opt.icon
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer ${active ? 'bg-blue-50 border border-blue-200 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1 rounded-md ${opt.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${opt.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900">{opt.label}</p>
                      <p className="text-[10px] text-slate-500 truncate">{opt.desc}</p>
                    </div>
                  </div>
                  {active && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0 ml-1" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

/** Custom Dropdown for Subject Selection in Form */
function CustomSubjectSelect({ value, onChange, availableSubjects }) {
  const [open, setOpen] = useState(false)
  const [isCustom, setIsCustom] = useState(false)

  if (availableSubjects.length === 0 || isCustom) {
    return (
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Mathematics"
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
        {availableSubjects.length > 0 && (
          <button
            type="button"
            onClick={() => setIsCustom(false)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 cursor-pointer"
          >
            Select list
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 flex items-center justify-between transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      >
        <span className="truncate">{value || 'Select Subject...'}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-50 animate-scale-in space-y-1 max-h-56 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs font-medium cursor-pointer ${!value ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-600'
                }`}
            >
              <span>— Select subject —</span>
              {!value && <Check className="h-3.5 w-3.5 text-blue-600" />}
            </button>
            {availableSubjects.map(sub => {
              const active = sub === value
              const theme = getSubjectTheme(sub)
              const Icon = theme.icon
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => {
                    onChange(sub)
                    setOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${active ? 'bg-blue-50 border border-blue-200 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1 rounded-md ${theme.lightBg}`}>
                      <Icon className={`h-3.5 w-3.5 ${theme.textColor}`} />
                    </div>
                    <span className="truncate">{sub}</span>
                  </div>
                  {active && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                </button>
              )
            })}
            <div className="pt-1.5 border-t border-slate-100 mt-1">
              <button
                type="button"
                onClick={() => {
                  setIsCustom(true)
                  setOpen(false)
                }}
                className="w-full text-center py-1.5 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              >
                + Type Custom Subject
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/** Custom Dropdown for Chapter Selection in Form */
function CustomChapterSelect({ value, chapterId, onChange, availableChapters }) {
  const [open, setOpen] = useState(false)
  const [isCustom, setIsCustom] = useState(false)
  const [customText, setCustomText] = useState('')

  if (isCustom) {
    return (
      <div className="space-y-1.5">
        <div className="relative flex items-center gap-1.5">
          <input
            type="text"
            value={customText}
            onChange={(e) => {
              const text = e.target.value
              setCustomText(text)
              const matched = availableChapters.find(ch => ch.title && ch.title.trim().toLowerCase() === text.trim().toLowerCase())
              if (matched) {
                onChange(matched.title, matched.id)
              } else {
                onChange(text, null)
              }
            }}
            placeholder="Type new chapter name..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <button
            type="button"
            onClick={() => {
              setIsCustom(false)
              setCustomText('')
              onChange('', null)
            }}
            className="text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-2 rounded-xl border border-slate-200 shrink-0 cursor-pointer"
          >
            Cancel
          </button>
        </div>
        <p className="text-[10px] text-slate-400">This chapter will be created automatically upon saving.</p>
      </div>
    )
  }

  const selectedCh = availableChapters.find(ch => ch.id === chapterId || (ch.title && ch.title.toLowerCase() === (value || '').toLowerCase()))
  const displayLabel = selectedCh ? selectedCh.title : (value ? value : 'None / General (No Chapter)')

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 flex items-center justify-between transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-50 animate-scale-in space-y-1 max-h-56 overflow-y-auto">
            {/* None / General option */}
            <button
              type="button"
              onClick={() => {
                onChange('', null)
                setOpen(false)
              }}
              className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                !chapterId && !value ? 'bg-blue-50 font-bold text-blue-900' : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span>None / General (No Chapter)</span>
              {!chapterId && !value && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0 ml-1" />}
            </button>

            {/* List of existing chapters */}
            {availableChapters.map((ch, idx) => {
              const active = ch.id === chapterId || (ch.title && ch.title.toLowerCase() === (value || '').toLowerCase())
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => {
                    onChange(ch.title, ch.id)
                    setOpen(false)
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                    active ? 'bg-blue-50 font-bold text-blue-900' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="truncate">
                    <span className="text-[10px] font-bold text-slate-400 mr-1.5">CH {idx + 1}</span>
                    {ch.title}
                  </span>
                  {active && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0 ml-1" />}
                </button>
              )
            })}

            {/* Create new chapter option */}
            <button
              type="button"
              onClick={() => {
                setIsCustom(true)
                setOpen(false)
              }}
              className="w-full flex items-center gap-1.5 p-2 rounded-lg text-left text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors border-t border-slate-100 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add New Chapter...</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** 
 * Hyper-Realistic Modern Study Card Component
 */
function ManageableStudyCard({
  card,
  canManage,
  isAdmin: _isAdmin,
  onEdit,
  onDelete,
  onToggle,
  onWatch,
  deleting,
  viewMode = 'grid',
  onOpenMaterial,
  onManageNotes
}) {
  const thumb = card.thumbnail_url || getYTThumb(card.url)
  const badgeInfo = TYPE_BADGES[card.type] || TYPE_BADGES.external_link
  const BadgeIcon = badgeInfo.IconComp

  const isVideo = card.type === 'youtube_video' || card.type === 'youtube_playlist'
  const isDrive = card.type === 'google_drive'
  const domain = !isVideo && !isDrive ? getDomainFromUrl(card.url) : null

  if (viewMode === 'list') {
    return (
      <div
        className={`group relative isolate rounded-2xl border transition-all duration-300 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${card.is_featured
            ? 'bg-slate-900/95 border-amber-500/40 shadow-sm hover:border-amber-400'
            : 'bg-white border-slate-200/90 hover:border-blue-400 shadow-2xs hover:shadow-md'
          } ${!card.is_active ? 'opacity-60 grayscale-[25%]' : ''}`}
      >
        {card.is_featured && (
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-rose-500 to-indigo-500 rounded-l-2xl" />
        )}
        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
          <div className="w-16 h-12 rounded-xl bg-slate-950 shrink-0 overflow-hidden relative flex items-center justify-center border border-slate-800">
            {thumb ? (
              <img src={thumb} alt={card.title} className="w-full h-full object-cover" />
            ) : isDrive ? (
              <FileText className="h-5 w-5 text-amber-400" />
            ) : (
              <LinkIcon className="h-5 w-5 text-blue-400" />
            )}
            {isVideo && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Play className="h-3.5 w-3.5 text-white fill-current" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border ${badgeInfo.color}`}>
                <BadgeIcon className="h-2.5 w-2.5" /> {badgeInfo.label}
              </span>
              {card.subject && (
                <span className="text-[8px] font-extrabold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  {card.subject}
                </span>
              )}
              {card.is_featured && (
                <span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase bg-amber-500/10 text-amber-600 border border-amber-300">
                  <Sparkles className="h-2.5 w-2.5 text-amber-500" /> Featured
                </span>
              )}
              {card.is_public && (
                <span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Globe className="h-2.5 w-2.5 text-emerald-600" /> Public
                </span>
              )}
            </div>

            <h4 className={`font-bold text-xs sm:text-sm truncate ${card.is_featured ? 'text-slate-100' : 'text-slate-900'}`}>
              {card.title}
            </h4>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          {canManage && isVideo && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onManageNotes?.(card) }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-95"
              title={card.type === 'youtube_playlist' ? 'Manage Notes Playlist' : 'Attach Notes & PDFs'}
            >
              <FileText className="h-3.5 w-3.5 text-amber-500" />
              <span>
                {card.type === 'youtube_playlist'
                  ? (card.attached_notes?.length > 0 ? `Notes (${card.attached_notes.length})` : 'Notes Playlist')
                  : (card.attached_notes?.length > 0 ? `Notes (${card.attached_notes.length})` : 'Attach Notes')}
              </span>
            </button>
          )}

          {canManage && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={(e) => { e.stopPropagation(); onToggle(card) }}
                title={card.is_active ? 'Hide Card' : 'Publish Card'}
                className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                {card.is_active ? <Eye className="h-3.5 w-3.5 text-emerald-500" /> : <EyeOff className="h-3.5 w-3.5 text-rose-500" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(card) }}
                title="Edit Card"
                className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-blue-500/20 hover:text-blue-600 transition-all cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(card.id) }}
                disabled={deleting === card.id}
                title="Delete Card"
                className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {isVideo ? (
            <button
              onClick={() => onWatch?.(card)}
              className="px-3 py-1.5 bg-blue-950 hover:bg-blue-900 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1"
            >
              <PlayCircle className="h-3.5 w-3.5 text-amber-400" /> Watch
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenMaterial ? onOpenMaterial(card) : window.open(normalizeUrl(card.url), '_blank', 'noopener,noreferrer')}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1"
            >
              <FileText className="h-3.5 w-3.5 text-amber-400" /> Open
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`group relative isolate rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col justify-between ${card.is_featured
          ? 'bg-slate-900/95 border-amber-500/40 shadow-md hover:shadow-amber-500/20 hover:border-amber-400'
          : 'bg-white border-slate-200/90 hover:border-blue-400 shadow-2xs hover:shadow-lg'
        } ${!card.is_active ? 'opacity-60 grayscale-[20%]' : ''}`}
    >
      {/* Top Rim for Featured Cards */}
      {card.is_featured && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500 z-30" />
      )}

      {/* Card Header Media / Thumbnail Graphics */}
      <div className="relative aspect-video w-full bg-slate-950 overflow-hidden select-none">
        {thumb ? (
          <img
            src={thumb}
            alt={card.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out brightness-95 group-hover:brightness-100"
          />
        ) : isDrive ? (
          <div className="w-full h-full bg-gradient-to-br from-amber-100 via-amber-50 to-yellow-100 relative flex items-center justify-center p-3 sm:p-4 overflow-hidden select-none">
            {/* Ambient soft warm glow */}
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-300/35 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-orange-300/25 rounded-full blur-2xl pointer-events-none" />

            {/* Clean Floating Study Notebook Sheet */}
            <div className="relative z-10 bg-white rounded-xl shadow-md shadow-amber-950/10 p-2.5 sm:p-3 border border-amber-200/90 w-[85%] max-w-[220px] h-[82%] max-h-[125px] flex flex-col justify-between group-hover:scale-105 transition-transform duration-300">
              {/* Paper Header / Title Badge (Replaced CHAPTER NOTES with Study Card Title) */}
              <div className="flex items-start">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:py-1 rounded-md bg-amber-500 text-white text-[9.5px] sm:text-[10.5px] font-bold tracking-tight shadow-2xs max-w-full">
                  <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                  <span className="line-clamp-2 leading-tight">{card.title}</span>
                </span>
              </div>

              {/* Notebook Ruled Lines */}
              <div className="space-y-1.5">
                <div className="h-0.5 bg-amber-100/90 rounded-full w-full" />
                <div className="h-0.5 bg-amber-100/90 rounded-full w-4/5" />
                <div className="h-0.5 bg-amber-100/90 rounded-full w-3/5" />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 relative flex items-center justify-center p-4 overflow-hidden">
            <div className="flex flex-col items-center justify-center text-center space-y-1.5 z-10">
              <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 backdrop-blur-md group-hover:scale-110 transition-transform">
                <LinkIcon className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-[9px] font-mono font-bold text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-500/20">
                {domain || 'web resource'}
              </span>
            </div>
          </div>
        )}

        {/* Video Overlay Glow & Play Button */}
        {isVideo && (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="w-10 h-10 bg-red-600/90 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-red-600 transition-all duration-300 shadow-md border border-white/30">
                <Play className="h-4 w-4 text-white fill-current ml-0.5" />
              </div>
            </div>
          </>
        )}

        {/* Management Overlay Buttons */}
        {canManage && (
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-slate-950/85 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-lg">
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(card) }}
              title={card.is_active ? 'Hide Card' : 'Publish Card'}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              {card.is_active ? <Eye className="h-3.5 w-3.5 text-emerald-400" /> : <EyeOff className="h-3.5 w-3.5 text-rose-400" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(card) }}
              title="Edit Card"
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-blue-600/40 transition-all cursor-pointer"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(card.id) }}
              disabled={deleting === card.id}
              title="Delete Card"
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-rose-600/40 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            </button>
          </div>
        )}

        {/* Hidden State Indicator Badge */}
        {!card.is_active && (
          <div className="absolute top-2 left-2 z-20">
            <span className="text-[8px] font-black uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded-md shadow-sm border border-rose-400/30 flex items-center gap-1">
              <EyeOff className="h-2.5 w-2.5" /> Hidden
            </span>
          </div>
        )}

        {/* Subject Pill */}
        {card.subject && (
          <span className="absolute bottom-2 left-2 z-20 bg-slate-950/85 backdrop-blur-md text-slate-200 text-[9px] font-extrabold px-2 py-0.5 rounded-md border border-slate-700 shadow-sm">
            {card.subject}
          </span>
        )}
      </div>

      {/* Card Content Body */}
      <div className="p-3.5 flex flex-col flex-1 justify-between space-y-2.5">
        <div className="space-y-1">
          {/* Badge Chips */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border ${badgeInfo.color}`}>
              <BadgeIcon className="h-2.5 w-2.5" /> {badgeInfo.label}
            </span>

            {card.is_featured && (
              <span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-300">
                <Sparkles className="h-2.5 w-2.5 text-amber-500" /> Featured
              </span>
            )}

            {card.is_public && (
              <span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Globe className="h-2.5 w-2.5 text-emerald-600" /> Public
              </span>
            )}
          </div>

          <h3 className={`font-bold text-xs sm:text-sm leading-snug line-clamp-2 transition-colors ${card.is_featured ? 'text-slate-100 group-hover:text-amber-300' : 'text-slate-900 group-hover:text-blue-950'
            }`}>
            {card.title}
          </h3>

          {card.description && (
            <p className={`text-[11px] line-clamp-2 leading-relaxed ${card.is_featured ? 'text-slate-400' : 'text-slate-500'}`}>
              {card.description}
            </p>
          )}
        </div>

        {/* Action Button & Notes Management */}
        <div className="space-y-2">
          {isVideo && canManage && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onManageNotes?.(card) }}
              className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer active:scale-98"
              title={card.type === 'youtube_playlist' ? 'Create or manage Notes Playlist' : 'Attach Google Drive Notes & PDFs'}
            >
              <FileText className="h-3.5 w-3.5 text-amber-500" />
              <span>
                {card.type === 'youtube_playlist'
                  ? (card.attached_notes?.length > 0 ? `Notes Playlist (${card.attached_notes.length})` : '+ Create Notes Playlist')
                  : (card.attached_notes?.length > 0 ? `Attached Notes (${card.attached_notes.length})` : '+ Attach Notes / PDF')}
              </span>
            </button>
          )}

          {isVideo ? (
            <button
              onClick={() => onWatch?.(card)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 bg-blue-950 hover:bg-blue-900 active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <PlayCircle className="h-3.5 w-3.5 text-amber-400" /> Watch Lecture
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenMaterial ? onOpenMaterial(card) : window.open(normalizeUrl(card.url), '_blank', 'noopener,noreferrer')}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-amber-400" /> Open Material
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StudySection({ isAdmin = false }) {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [hasAccess, setHasAccess] = useState(isAdmin)
  const [loading, setLoading] = useState(true)
  const [batches, setBatches] = useState([])
  const [cards, setCards] = useState([])
  const [chapters, setChapters] = useState([])
  const [isChaptersTableMissing, setIsChaptersTableMissing] = useState(false)

  // Selection & Navigation
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedFolder, setSelectedFolder] = useState(null) // null = directory root, 'video', 'drive', 'link', 'public'
  const [selectedChapter, setSelectedChapter] = useState(null) // null = chapter list view (inside video folder)

  // Chapter Management Modal State
  const [showChapterModal, setShowChapterModal] = useState(false)
  const [chapterForm, setChapterForm] = useState({ title: '', display_order: 1 })
  const [editingChapterId, setEditingChapterId] = useState(null)
  const [savingChapter, setSavingChapter] = useState(false)

  // View & Search Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'

  // Modal Form State
  const [showForm, setShowForm] = useState(false)
  const [notesModalCard, setNotesModalCard] = useState(null)
  const [form, setForm] = useState(EMPTY_CARD_FORM)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [playlistThumb, setPlaylistThumb] = useState(null)
  const [showActivityLog, setShowActivityLog] = useState(false)
  const [viewingMaterial, setViewingMaterial] = useState(null)

  const rolePrefix = isAdmin ? '/admin' : '/teacher'

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      let access = isAdmin
      if (!isAdmin && user) {
        // All authenticated teachers can view the study section
        access = true
      }
      setHasAccess(access)

      if (access) {
        const { data: bData } = await supabase
          .from('batches')
          .select('id, name, subjects, teacher_id, teacher_ids, poster_url, is_active')
          .eq('is_active', true)
          .order('name')
        setBatches(bData || [])

        const { data: cData } = await supabase
          .from('study_cards')
          .select('*')
          .order('display_order')
        setCards(cData || [])

        try {
          const { data: chData, error: chErr } = await supabase
            .from('chapters')
            .select('*')
            .order('display_order')
          if (chErr) {
            if (chErr.code === 'PGRST205' || chErr.message?.includes('schema cache') || chErr.message?.includes('chapters')) {
              setIsChaptersTableMissing(true)
            }
            setChapters([])
          } else {
            setIsChaptersTableMissing(false)
            setChapters(chData || [])
          }
        } catch {
          setIsChaptersTableMissing(true)
          setChapters([])
        }
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load study workspace')
    } finally {
      setLoading(false)
    }
  }, [isAdmin, user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Realtime synchronization for chapters and study_cards across Teacher & Admin sessions
  useEffect(() => {
    if (!user) return
    let unmounted = false

    const channel = supabase.channel(`teacher_study_realtime_${user.id}_${isAdmin ? 'admin' : 'teacher'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chapters' }, (payload) => {
        if (unmounted) return
        if (payload.eventType === 'INSERT') {
          setChapters(prev => {
            if (prev.some(ch => ch.id === payload.new.id)) return prev
            return [...prev, payload.new].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
          })
        } else if (payload.eventType === 'UPDATE') {
          setChapters(prev => prev.map(ch => ch.id === payload.new.id ? payload.new : ch))
          if (payload.new.title) {
            setCards(prev => prev.map(c => c.chapter_id === payload.new.id ? { ...c, chapter: payload.new.title } : c))
          }
        } else if (payload.eventType === 'DELETE') {
          setChapters(prev => prev.filter(ch => ch.id !== payload.old.id))
          setCards(prev => prev.map(c => c.chapter_id === payload.old.id ? { ...c, chapter_id: null, chapter: null } : c))
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_cards' }, (payload) => {
        if (unmounted) return
        if (payload.eventType === 'INSERT') {
          setCards(prev => {
            if (prev.some(c => c.id === payload.new.id)) return prev
            return [...prev, payload.new].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
          })
        } else if (payload.eventType === 'UPDATE') {
          setCards(prev => prev.map(c => c.id === payload.new.id ? payload.new : c))
        } else if (payload.eventType === 'DELETE') {
          setCards(prev => prev.filter(c => c.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      unmounted = true
      supabase.removeChannel(channel)
    }
  }, [user, isAdmin])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const batchParam = params.get('batch')
    const subjParam = params.get('subject')
    const folderParam = params.get('folder')
    const chapterParam = params.get('chapter')

    if (batchParam && batches.length > 0) {
      const batch = batches.find(b => b.id === batchParam)
      if (batch) {
        setSelectedBatch(batch)
        if (subjParam) setSelectedSubject(subjParam)
        if (folderParam) {
          setSelectedFolder(folderParam)
          setSelectedChapter(chapterParam || null)
        } else {
          setSelectedFolder(null)
          setSelectedChapter(null)
        }
      }
    }
  }, [location.search, batches])

  // YouTube oEmbed & Playlist Thumbnail Auto-Fetcher
  useEffect(() => {
    if (!form.url.trim()) {
      setPlaylistThumb(null)
      return
    }

    const trimmed = form.url.trim()
    const listId = getYTPlaylistId(trimmed)
    if (listId) {
      if (form.type !== 'youtube_playlist') {
        setForm(f => ({ ...f, type: 'youtube_playlist' }))
      }
    } else if (getYTVideoId(trimmed)) {
      if (form.type !== 'youtube_video' && form.type !== 'youtube_playlist') {
        setForm(f => ({ ...f, type: 'youtube_video' }))
      }
    } else if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
      if (form.type !== 'google_drive') {
        setForm(f => ({ ...f, type: 'google_drive' }))
      }
    }

    if (form.type !== 'youtube_playlist' && form.type !== 'youtube_video') {
      setPlaylistThumb(null)
      return
    }

    const controller = new AbortController()
    fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(trimmed)}&format=json`,
      { signal: controller.signal }
    )
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.thumbnail_url) setPlaylistThumb(d.thumbnail_url)
        if (d?.title) {
          setForm(f => f.title.trim() ? f : { ...f, title: d.title })
        }
      })
      .catch(() => { })
    return () => controller.abort()
  }, [form.url, form.type])

  const selectBatch = (batch) => {
    setSelectedBatch(batch)
    setSelectedSubject(null)
    setSelectedFolder(null)
    setSelectedChapter(null)
    setSearchQuery('')
    navigate(`${rolePrefix}/study?batch=${batch.id}`)
  }

  const selectSubject = (subj) => {
    setSelectedSubject(subj)
    setSelectedFolder(null)
    setSelectedChapter(null)
    setSearchQuery('')
    navigate(`${rolePrefix}/study?batch=${selectedBatch.id}&subject=${encodeURIComponent(subj)}`)
  }

  const openFolder = (folderId) => {
    setSelectedFolder(folderId)
    setSelectedChapter(null)
    setSearchQuery('')
    if (folderId) {
      navigate(`${rolePrefix}/study?batch=${selectedBatch.id}&subject=${encodeURIComponent(selectedSubject)}&folder=${encodeURIComponent(folderId)}`)
    } else {
      navigate(`${rolePrefix}/study?batch=${selectedBatch.id}&subject=${encodeURIComponent(selectedSubject)}`)
    }
  }

  const openChapter = (chapterId) => {
    setSelectedChapter(chapterId)
    setSearchQuery('')
    if (chapterId) {
      navigate(`${rolePrefix}/study?batch=${selectedBatch.id}&subject=${encodeURIComponent(selectedSubject)}&folder=video&chapter=${encodeURIComponent(chapterId)}`)
    } else {
      navigate(`${rolePrefix}/study?batch=${selectedBatch.id}&subject=${encodeURIComponent(selectedSubject)}&folder=video`)
    }
  }

  const _goBackToBatches = () => {
    setSelectedBatch(null)
    setSelectedSubject(null)
    setSelectedFolder(null)
    setSelectedChapter(null)
    setSearchQuery('')
    navigate(`${rolePrefix}/study`)
  }

  const _goBackToSubjects = () => {
    setSelectedSubject(null)
    setSelectedFolder(null)
    setSelectedChapter(null)
    setSearchQuery('')
    navigate(`${rolePrefix}/study?batch=${selectedBatch.id}`)
  }

  const goBackStep = () => {
    if (selectedChapter) {
      openChapter(null)
    } else if (selectedFolder) {
      setSelectedFolder(null)
      setSelectedChapter(null)
      if (selectedBatch && selectedSubject) {
        navigate(`${rolePrefix}/study?batch=${selectedBatch.id}&subject=${encodeURIComponent(selectedSubject)}`)
      } else if (selectedBatch) {
        navigate(`${rolePrefix}/study?batch=${selectedBatch.id}`)
      } else {
        navigate(`${rolePrefix}/study`)
      }
    } else if (selectedSubject) {
      setSelectedSubject(null)
      setSelectedFolder(null)
      setSelectedChapter(null)
      if (selectedBatch) {
        navigate(`${rolePrefix}/study?batch=${selectedBatch.id}`)
      } else {
        navigate(`${rolePrefix}/study`)
      }
    } else if (selectedBatch) {
      setSelectedBatch(null)
      setSelectedSubject(null)
      setSelectedFolder(null)
      setSelectedChapter(null)
      setSearchQuery('')
      navigate(`${rolePrefix}/study`)
    }
  }

  const handleWatchCard = (card) => {
    const returnSub = selectedSubject || card.subject || ''
    const returnCh = selectedChapter || card.chapter_id || card.chapter || ''
    const chParam = returnCh ? `&returnChapter=${encodeURIComponent(returnCh)}` : ''
    navigate(`${rolePrefix}/watch/${card.id}?returnSubject=${encodeURIComponent(returnSub)}${chParam}`, {
      state: { card, returnSubject: returnSub, returnChapter: returnCh }
    })
  }

  const openCreateChapter = () => {
    setChapterForm({
      title: '',
      display_order: batchSubjectChapters.length > 0 ? Math.max(...batchSubjectChapters.map(c => c.display_order || 0)) + 1 : 1
    })
    setEditingChapterId(null)
    setShowChapterModal(true)
  }

  const openEditChapter = (ch) => {
    const order = ch.isVirtual || ch.display_order === 999
      ? (batchSubjectChapters.length > 0 ? Math.max(...batchSubjectChapters.filter(c => !c.isVirtual && c.display_order !== 999).map(c => c.display_order || 0), 0) + 1 : 1)
      : (ch.display_order || 0)
    setChapterForm({
      title: ch.title,
      display_order: order
    })
    setEditingChapterId(ch.id)
    setShowChapterModal(true)
  }

  const saveChapter = async () => {
    if (!chapterForm.title.trim()) {
      toast.error('Chapter title is required')
      return
    }
    if (!selectedBatch || !selectedSubject) {
      toast.error('Batch and subject are required')
      return
    }

    setSavingChapter(true)
    const payload = {
      title: chapterForm.title.trim(),
      display_order: parseInt(chapterForm.display_order, 10) || 0,
      batch_id: selectedBatch.id,
      subject: selectedSubject,
    }

    const isVirtualEdit = editingChapterId && String(editingChapterId).startsWith('virtual_')
    const isLocalEdit = editingChapterId && String(editingChapterId).startsWith('ch_local_')

    // Graceful offline/unmigrated fallback if chapters table is not yet created in Supabase
    if (isChaptersTableMissing || isLocalEdit) {
      if (editingChapterId) {
        const updated = { ...payload, id: editingChapterId, updated_at: new Date().toISOString() }
        setChapters(prev => prev.map(ch => ch.id === editingChapterId ? updated : ch))
        setCards(prev => prev.map(c => c.chapter_id === editingChapterId ? { ...c, chapter: updated.title } : c))
        toast('Chapter updated in temporary session. Run migration 031 in Supabase for permanent persistence.', { icon: 'ℹ️' })
      } else {
        const clientChapter = {
          ...payload,
          id: `ch_local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          created_by: user?.id,
          created_at: new Date().toISOString()
        }
        setChapters(prev => [...prev, clientChapter])
        toast('Chapter created in temporary session. Run migration 031 in Supabase for permanent persistence.', { icon: 'ℹ️' })
      }
      setShowChapterModal(false)
      setSavingChapter(false)
      return
    }

    try {
      if (editingChapterId && !isVirtualEdit) {
        // Check for duplicate chapter name in same batch & subject
        const duplicate = batchSubjectChapters.find(ch =>
          ch.id !== editingChapterId &&
          ch.title?.trim().toLowerCase() === payload.title.toLowerCase()
        )
        if (duplicate) {
          toast.error(`A chapter titled "${duplicate.title}" already exists for this subject.`)
          setSavingChapter(false)
          return
        }

        const { data, error } = await supabase
          .from('chapters')
          .update(payload)
          .eq('id', editingChapterId)
          .select()
          .maybeSingle()
        if (error) {
          if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
            setIsChaptersTableMissing(true)
            const updated = { ...payload, id: editingChapterId, updated_at: new Date().toISOString() }
            setChapters(prev => prev.map(ch => ch.id === editingChapterId ? updated : ch))
            toast('Saved in local session. Run migration 031 in Supabase for permanent persistence.', { icon: 'ℹ️' })
            setShowChapterModal(false)
            return
          }
          throw error
        }
        setChapters(prev => prev.map(ch => ch.id === editingChapterId ? data : ch))
        if (data?.title) {
          setCards(prev => prev.map(c => c.chapter_id === editingChapterId ? { ...c, chapter: data.title } : c))
          await supabase.from('study_cards').update({ chapter: data.title }).eq('chapter_id', editingChapterId)
        }
        logActivity({
          batchId: selectedBatch.id,
          user,
          userName: user?.user_metadata?.full_name,
          userRole: isAdmin ? 'admin' : 'teacher',
          actionType: 'update',
          entityType: 'chapter',
          entityTitle: data.title,
          details: `Subject: ${selectedSubject} • Chapter updated`
        })
        toast.success('Chapter updated successfully')
      } else if (isVirtualEdit) {
        // Converting/promoting virtual chapter into canonical database chapter
        const oldVirtualTitle = editingChapterId.replace('virtual_', '')
        const { data, error } = await supabase
          .from('chapters')
          .insert({ ...payload, created_by: user.id })
          .select()
          .maybeSingle()
        if (error) throw error
        setChapters(prev => [...prev.filter(ch => ch.id !== editingChapterId), data])
        setCards(prev => prev.map(c => (!c.chapter_id && c.chapter?.trim().toLowerCase() === oldVirtualTitle.trim().toLowerCase()) ? { ...c, chapter_id: data.id, chapter: data.title } : c))
        await supabase.from('study_cards')
          .update({ chapter_id: data.id, chapter: data.title })
          .eq('batch_id', selectedBatch.id)
          .ilike('chapter', oldVirtualTitle)
        if (selectedChapter === editingChapterId) {
          setSelectedChapter(data.id)
        }
        logActivity({
          batchId: selectedBatch.id,
          user,
          userName: user?.user_metadata?.full_name,
          userRole: isAdmin ? 'admin' : 'teacher',
          actionType: 'create',
          entityType: 'chapter',
          entityTitle: data.title,
          details: `Subject: ${selectedSubject} • Promoted virtual chapter to database`
        })
        toast.success('Chapter saved and linked to database')
      } else {
        // Create new chapter
        const duplicate = batchSubjectChapters.find(ch =>
          ch.title?.trim().toLowerCase() === payload.title.toLowerCase()
        )
        if (duplicate) {
          toast.error(`A chapter titled "${duplicate.title}" already exists for this subject.`)
          setSavingChapter(false)
          return
        }

        const { data, error } = await supabase
          .from('chapters')
          .insert({ ...payload, created_by: user.id })
          .select()
          .maybeSingle()
        if (error) {
          if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
            setIsChaptersTableMissing(true)
            const clientChapter = {
              ...payload,
              id: `ch_local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              created_by: user?.id,
              created_at: new Date().toISOString()
            }
            setChapters(prev => [...prev, clientChapter])
            toast('Saved in local session. Run migration 031 in Supabase for permanent persistence.', { icon: 'ℹ️' })
            setShowChapterModal(false)
            return
          }
          throw error
        }
        setChapters(prev => [...prev, data])
        logActivity({
          batchId: selectedBatch.id,
          user,
          userName: user?.user_metadata?.full_name,
          userRole: isAdmin ? 'admin' : 'teacher',
          actionType: 'create',
          entityType: 'chapter',
          entityTitle: data.title,
          details: `Subject: ${selectedSubject} • New chapter created`
        })
        toast.success('Chapter created successfully')
      }
      setShowChapterModal(false)
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to save chapter')
    } finally {
      setSavingChapter(false)
    }
  }

  const deleteChapter = async (chapterId) => {
    const chToDelete = chapters.find(c => c.id === chapterId)
    if (!window.confirm(`Are you sure you want to delete "${chToDelete?.title || 'this chapter'}"? Any lectures in this chapter will be preserved and moved to General Lectures.`)) {
      return
    }

    if (isChaptersTableMissing || String(chapterId).startsWith('ch_local_') || String(chapterId).startsWith('virtual_')) {
      setChapters(prev => prev.filter(c => c.id !== chapterId))
      setCards(prev => prev.map(c => {
        if (c.chapter_id === chapterId) return { ...c, chapter_id: null, chapter: null }
        if (chToDelete?.title && c.chapter?.trim().toLowerCase() === chToDelete.title.trim().toLowerCase()) return { ...c, chapter_id: null, chapter: null }
        return c
      }))
      if (selectedChapter === chapterId) {
        setSelectedChapter(null)
      }
      toast.success('Chapter removed')
      return
    }

    try {
      // Disassociate study cards in DB first so cards remain safely preserved in General Lectures
      await supabase
        .from('study_cards')
        .update({ chapter_id: null, chapter: null })
        .eq('chapter_id', chapterId)

      const { error } = await supabase.from('chapters').delete().eq('id', chapterId)
      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          setIsChaptersTableMissing(true)
          setChapters(prev => prev.filter(c => c.id !== chapterId))
          setCards(prev => prev.map(c => c.chapter_id === chapterId ? { ...c, chapter_id: null, chapter: null } : c))
          if (selectedChapter === chapterId) setSelectedChapter(null)
          toast.success('Chapter removed')
          return
        }
        throw error
      }

      setChapters(prev => prev.filter(c => c.id !== chapterId))
      setCards(prev => prev.map(c => c.chapter_id === chapterId ? { ...c, chapter_id: null, chapter: null } : c))
      if (selectedChapter === chapterId) {
        setSelectedChapter(null)
      }
      logActivity({
        batchId: selectedBatch?.id,
        user,
        userName: user?.user_metadata?.full_name,
        userRole: isAdmin ? 'admin' : 'teacher',
        actionType: 'delete',
        entityType: 'chapter',
        entityTitle: chToDelete?.title || 'Chapter',
        details: `Subject: ${selectedSubject} • Chapter deleted`
      })
      toast.success('Chapter deleted')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to delete chapter')
    }
  }

  const isBatchTeacher = (batch, userId) => {
    if (!batch || !userId) return false
    if (batch.teacher_id === userId) return true
    if (Array.isArray(batch.teacher_ids) && batch.teacher_ids.includes(userId)) return true
    return false
  }

  const canManageBatch = (batch) => {
    if (isAdmin) return true
    if (isBatchTeacher(batch, user?.id)) return true
    return false
  }

  const canManageCard = (card, batch) => {
    if (isAdmin) return true
    if (isBatchTeacher(selectedBatch, user?.id)) return true
    if (isBatchTeacher(batch, user?.id)) return true

    const cardBatches = getCardBatchIds(card)
    const isTeacherOfAnyCardBatch = batches.some(b => isBatchTeacher(b, user?.id) && cardBatches.includes(b.id))
    if (isTeacherOfAnyCardBatch) return true

    return false
  }

  const selectableBatches = useMemo(() => {
    if (isAdmin) return batches
    return batches.filter(b => isBatchTeacher(b, user?.id))
  }, [batches, isAdmin, user?.id])

  const openAddForm = (presetType = 'external_link') => {
    let type = presetType
    if (selectedFolder === 'video') type = 'youtube_video'
    else if (selectedFolder === 'drive') type = 'google_drive'
    else if (selectedFolder === 'link') type = 'external_link'

    const activeChObj = (selectedChapter && selectedChapter !== 'general')
      ? chapters.find(ch => ch.id === selectedChapter)
      : null

    setForm({
      ...EMPTY_CARD_FORM,
      batch_ids: selectedBatch ? [selectedBatch.id] : [],
      subject: selectedSubject || '',
      type,
      chapter_id: activeChObj?.id || null,
      chapter: activeChObj?.title || '',
      display_order: cards.length > 0 ? Math.max(...cards.map(c => c.display_order || 0)) + 10 : 10
    })
    setEditing(null)
    setShowForm(true)
  }

  const editCard = (card) => {
    const canonicalCh = card.chapter_id ? chapters.find(ch => ch.id === card.chapter_id) : null
    setForm({
      title: card.title,
      description: card.description || '',
      type: card.type,
      url: card.url,
      is_public: card.is_public,
      batch_ids: card.batch_ids || (card.batch_id ? [card.batch_id] : []),
      subject: card.subject || '',
      chapter_id: card.chapter_id || null,
      chapter: canonicalCh?.title || card.chapter || '',
      display_order: card.display_order || 0,
      is_featured: card.is_featured || false,
    })
    setEditing(card.id)
    setShowForm(true)
  }

  const save = async () => {
    if (!form.title.trim() || !form.url.trim()) { toast.error('Title and URL are required'); return }
    if (!form.is_public && form.batch_ids.length === 0) { toast.error('Select at least one target batch or public option'); return }
    if (form.batch_ids.length > 0 && !form.subject.trim()) { toast.error('Subject is required when a batch is selected'); return }

    if (!isAdmin && form.batch_ids.length > 0) {
      const allowed = form.batch_ids.every(bId => {
        const b = batches.find(x => x.id === bId)
        return isBatchTeacher(b, user?.id)
      })
      if (!allowed) {
        toast.error('You can only add or edit content for your assigned batches.')
        return
      }
    }

    const thumb = getYTThumb(form.url.trim()) || playlistThumb
    setSaving(true)

    let finalChapterId = form.chapter_id || null
    let finalChapterName = form.chapter ? form.chapter.trim() : null

    // If teacher typed/selected a chapter name and it doesn't have an ID yet, check if it matches an existing DB chapter first
    if (finalChapterName && !finalChapterId && form.batch_ids.length > 0 && form.subject) {
      const match = chapters.find(ch =>
        (ch.batch_id === form.batch_ids[0] || !ch.batch_id) &&
        ch.subject?.toLowerCase() === form.subject.toLowerCase() &&
        ch.title?.trim().toLowerCase() === finalChapterName.toLowerCase()
      )
      if (match) {
        finalChapterId = match.id
        finalChapterName = match.title
      } else {
        try {
          if (!isChaptersTableMissing) {
            const { data: newCh, error: chErr } = await supabase
              .from('chapters')
              .insert({
                title: finalChapterName,
                subject: form.subject,
                batch_id: form.batch_ids[0],
                created_by: user.id
              })
              .select()
              .maybeSingle()
            if (!chErr && newCh) {
              finalChapterId = newCh.id
              finalChapterName = newCh.title
              setChapters(prev => [...prev, newCh])
            } else if (chErr && (chErr.code === 'PGRST205' || chErr.message?.includes('schema cache'))) {
              setIsChaptersTableMissing(true)
              const localCh = {
                id: `ch_local_${Date.now()}`,
                title: finalChapterName,
                subject: form.subject,
                batch_id: form.batch_ids[0],
                created_by: user.id
              }
              finalChapterId = localCh.id
              setChapters(prev => [...prev, localCh])
            }
          } else {
            const localCh = {
              id: `ch_local_${Date.now()}`,
              title: finalChapterName,
              subject: form.subject,
              batch_id: form.batch_ids[0],
              created_by: user.id
            }
            finalChapterId = localCh.id
            setChapters(prev => [...prev, localCh])
          }
        } catch (err) {
          console.warn('Could not auto-create chapter:', err)
        }
      }
    } else if (finalChapterId) {
      const canonicalCh = chapters.find(ch => ch.id === finalChapterId)
      if (canonicalCh) {
        finalChapterName = canonicalCh.title
      }
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      type: form.type,
      url: form.url.trim(),
      thumbnail_url: thumb || null,
      is_public: form.is_public,
      batch_id: form.batch_ids[0] || null,
      batch_ids: form.batch_ids,
      subject: form.batch_ids.length > 0 ? (form.subject || null) : null,
      chapter_id: finalChapterId,
      chapter: finalChapterName,
      display_order: form.display_order,
      is_featured: form.is_featured,
    }

    try {
      if (editing) {
        let { data, error } = await supabase
          .from('study_cards')
          .update(payload)
          .eq('id', editing)
          .select()
          .maybeSingle()

        // Fallback retry if chapter_id or chapter column does not exist on remote database
        if (error && (error.code === '42703' || error.message?.includes('chapter'))) {
          const cleanPayload = { ...payload }
          delete cleanPayload.chapter_id
          delete cleanPayload.chapter
          const retryRes = await supabase
            .from('study_cards')
            .update(cleanPayload)
            .eq('id', editing)
            .select()
            .maybeSingle()
          data = retryRes.data
          error = retryRes.error
        }

        if (error) throw error
        setCards(c => c.map(x => x.id === editing ? data : x))

        logActivity({
          batchId: data.batch_id,
          batchIds: data.batch_ids,
          user,
          userName: user?.user_metadata?.full_name,
          userRole: isAdmin ? 'admin' : 'teacher',
          actionType: 'update',
          entityType: 'study_card',
          entityTitle: data.title,
          details: `${data.subject || ''} · ${data.folder || ''}`
        })
      } else {
        let { data, error } = await supabase
          .from('study_cards')
          .insert({ ...payload, added_by: user.id, is_active: true })
          .select()
          .maybeSingle()

        // Fallback retry if chapter_id or chapter column does not exist on remote database
        if (error && (error.code === '42703' || error.message?.includes('chapter'))) {
          const cleanPayload = { ...payload }
          delete cleanPayload.chapter_id
          delete cleanPayload.chapter
          const retryRes = await supabase
            .from('study_cards')
            .insert({ ...cleanPayload, added_by: user.id, is_active: true })
            .select()
            .maybeSingle()
          data = retryRes.data
          error = retryRes.error
        }

        if (error) throw error
        setCards(c => [...c, data])

        logActivity({
          batchId: data.batch_id,
          batchIds: data.batch_ids,
          user,
          userName: user?.user_metadata?.full_name,
          userRole: isAdmin ? 'admin' : 'teacher',
          actionType: 'create',
          entityType: 'study_card',
          entityTitle: data.title,
          details: `${data.subject || ''} · ${data.folder || ''}`
        })
      }

      setShowForm(false)
      toast.success(editing ? 'Study Card Updated!' : 'Study Card Created!')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to save card')
    } finally {
      setSaving(false)
    }
  }

  const removeCard = async (id) => {
    const cardToDelete = cards.find(x => x.id === id)
    if (cardToDelete) {
      const cardBatch = batches.find(b => getCardBatchIds(cardToDelete).includes(b.id))
      if (!canManageCard(cardToDelete, cardBatch || {})) {
        toast.error('You do not have permission to delete cards in this batch.')
        return
      }
    }
    if (!window.confirm('Delete this study card permanently?')) return
    setDeleting(id)
    try {
      const { error } = await supabase.from('study_cards').delete().eq('id', id)
      if (error) throw error
      setCards(c => c.filter(x => x.id !== id))
      toast.success('Card removed')

      if (cardToDelete) {
        logActivity({
          batchId: cardToDelete.batch_id,
          batchIds: cardToDelete.batch_ids,
          user,
          userName: user?.user_metadata?.full_name,
          userRole: isAdmin ? 'admin' : 'teacher',
          actionType: 'delete',
          entityType: 'study_card',
          entityTitle: cardToDelete.title,
          details: `${cardToDelete.subject || ''} · ${cardToDelete.folder || ''}`
        })
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to delete card')
    } finally {
      setDeleting(null)
    }
  }

  const toggleVisibility = async (card) => {
    const cardBatch = batches.find(b => getCardBatchIds(card).includes(b.id))
    if (!canManageCard(card, cardBatch || {})) {
      toast.error('You do not have permission to modify cards in this batch.')
      return
    }
    try {
      const { data, error } = await supabase
        .from('study_cards')
        .update({ is_active: !card.is_active })
        .eq('id', card.id)
        .select()
        .maybeSingle()

      if (error) throw error

      setCards(c => c.map(x => x.id === card.id ? data : x))
      toast.success(data.is_active ? 'Card published' : 'Card hidden')

      logActivity({
        batchId: data.batch_id,
        batchIds: data.batch_ids,
        user,
        userName: user?.user_metadata?.full_name,
        userRole: isAdmin ? 'admin' : 'teacher',
        actionType: 'toggle_visibility',
        entityType: 'study_card',
        entityTitle: data.title,
        details: data.is_active ? 'Card published to batch' : 'Card hidden from students'
      })
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to update visibility')
    }
  }

  const getCardBatchIds = (card) => {
    if (Array.isArray(card.batch_ids) && card.batch_ids.length > 0) return card.batch_ids
    if (card.batch_id) return [card.batch_id]
    return []
  }

  // Cards for currently selected batch
  const batchCards = useMemo(() => {
    if (!selectedBatch) return cards
    return cards.filter(c => getCardBatchIds(c).includes(selectedBatch.id))
  }, [cards, selectedBatch])

  // Cards for currently selected subject inside batch
  const subjectCards = useMemo(() => {
    if (!selectedSubject) return batchCards
    const s = selectedSubject.toLowerCase()
    return batchCards.filter(c => c.subject?.toLowerCase() === s)
  }, [batchCards, selectedSubject])

  // Subject Folder Item Counts
  const folderCounts = useMemo(() => {
    const video = subjectCards.filter(c => c.type === 'youtube_video' || c.type === 'youtube_playlist').length
    const drive = subjectCards.filter(c => c.type === 'google_drive').length
    const link = subjectCards.filter(c => c.type === 'external_link').length
    const publics = subjectCards.filter(c => c.is_public).length
    const all = subjectCards.length
    return { video, drive, link, publics, all }
  }, [subjectCards])

  // Batch & Subject video cards
  const batchSubjectVideoCards = useMemo(() => {
    return subjectCards.filter(c => c.type === 'youtube_video' || c.type === 'youtube_playlist')
  }, [subjectCards])

  // Batch & Subject specific chapters (DB chapters + legacy virtual chapters strictly derived from orphaned cards)
  const batchSubjectChapters = useMemo(() => {
    if (!selectedBatch || !selectedSubject) return []
    const s = selectedSubject.toLowerCase()
    const dbChapters = chapters.filter(ch => (ch.batch_id === selectedBatch.id || !ch.batch_id) && ch.subject?.toLowerCase() === s)
    const existingTitles = new Set(dbChapters.map(ch => (ch.title || '').trim().toLowerCase()))
    const existingIds = new Set(dbChapters.map(ch => ch.id))

    const virtualChapters = []
    batchSubjectVideoCards.forEach(card => {
      // If card already has a valid chapter_id, NEVER generate a virtual chapter
      if (card.chapter_id && existingIds.has(card.chapter_id)) {
        return
      }
      const chName = card.chapter?.trim()
      if (!card.chapter_id && chName && !existingTitles.has(chName.toLowerCase())) {
        existingTitles.add(chName.toLowerCase())
        virtualChapters.push({
          id: `virtual_${chName}`,
          title: chName,
          subject: selectedSubject,
          batch_id: selectedBatch.id,
          display_order: 999,
          isVirtual: true,
        })
      }
    })
    return [...dbChapters, ...virtualChapters]
  }, [chapters, selectedBatch, selectedSubject, batchSubjectVideoCards])

  // Unassigned video cards
  const unassignedVideos = useMemo(() => {
    const knownIds = new Set(batchSubjectChapters.map(ch => ch.id))
    const knownTitles = new Set(batchSubjectChapters.map(ch => (ch.title || '').trim().toLowerCase()))
    return batchSubjectVideoCards.filter(c => {
      if (!c.chapter_id && !c.chapter) return true
      if (c.chapter_id) return !knownIds.has(c.chapter_id)
      if (c.chapter) return !knownTitles.has(c.chapter.trim().toLowerCase())
      return false
    })
  }, [batchSubjectVideoCards, batchSubjectChapters])

  // Active chapter object
  const activeChapterObj = useMemo(() => {
    if (!selectedChapter) return null
    if (selectedChapter === 'general') {
      return { id: 'general', title: 'General & Introductory Lectures' }
    }
    const found = batchSubjectChapters.find(ch => ch.id === selectedChapter || ch.title?.toLowerCase() === selectedChapter.toLowerCase())
    if (found) return found
    return { id: selectedChapter, title: selectedChapter }
  }, [selectedChapter, batchSubjectChapters])

  // Videos belonging to active chapter
  const activeChapterVideos = useMemo(() => {
    if (!selectedChapter) return []
    if (selectedChapter === 'general') return unassignedVideos
    return batchSubjectVideoCards.filter(c => {
      // 1. Strict primary match by chapter_id
      if (c.chapter_id && activeChapterObj?.id) {
        return c.chapter_id === activeChapterObj.id
      }
      // 2. Fallback title match ONLY for legacy cards without chapter_id
      if (!c.chapter_id && c.chapter && activeChapterObj?.title) {
        return c.chapter.trim().toLowerCase() === activeChapterObj.title.trim().toLowerCase()
      }
      return false
    })
  }, [selectedChapter, unassignedVideos, batchSubjectVideoCards, activeChapterObj])

  // Count videos inside a specific chapter
  const getChapterVideoCount = (ch) => {
    if (!ch) return 0
    return batchSubjectVideoCards.filter(c => {
      if (c.chapter_id && ch.id) {
        return c.chapter_id === ch.id
      }
      if (!c.chapter_id && c.chapter && ch.title) {
        return c.chapter.trim().toLowerCase() === ch.title.trim().toLowerCase()
      }
      return false
    }).length
  }

  // Split batches into Assigned ("My Batches") vs Other Batches
  const myBatches = useMemo(() => {
    if (isAdmin) return batches
    return batches.filter(b => isBatchTeacher(b, user?.id))
  }, [batches, isAdmin, user?.id])

  const otherBatches = useMemo(() => {
    if (isAdmin) return []
    return batches.filter(b => !isBatchTeacher(b, user?.id))
  }, [batches, isAdmin, user?.id])

  // Processed Cards list after applying Search Query and Selected Folder filter
  const processedCards = useMemo(() => {
    let pool = [...subjectCards]

    // Apply folder scoping if selected
    if (selectedFolder === 'video') {
      pool = pool.filter(c => c.type === 'youtube_video' || c.type === 'youtube_playlist')
    } else if (selectedFolder === 'drive') {
      pool = pool.filter(c => c.type === 'google_drive')
    } else if (selectedFolder === 'link') {
      pool = pool.filter(c => c.type === 'external_link')
    } else if (selectedFolder === 'public') {
      pool = pool.filter(c => c.is_public)
    }

    // Apply Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      pool = pool.filter(c =>
        (c.title?.toLowerCase() || '').includes(q) ||
        (c.description?.toLowerCase() || '').includes(q) ||
        (c.subject?.toLowerCase() || '').includes(q)
      )
    }

    pool.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    return pool
  }, [subjectCards, selectedFolder, searchQuery])

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="font-bold text-slate-700 dark:text-slate-300">Loading Study Workspace…</p>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-3">
        <Lock className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-slate-500 text-xs max-w-sm mx-auto">
          You don&apos;t have permission to manage study cards. Contact system administrator.
        </p>
      </div>
    )
  }

  /** Render Grid or List of Cards */
  const renderCardList = (cardsList) => (
    <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4' : 'space-y-2.5'}>
      {cardsList.map(card => {
        const cardBatch = batches.find(b => getCardBatchIds(card).includes(b.id))
        return (
          <ManageableStudyCard
            key={card.id}
            card={card}
            canManage={canManageCard(card, cardBatch || {})}
            isAdmin={isAdmin}
            onEdit={editCard}
            onDelete={removeCard}
            onToggle={toggleVisibility}
            onWatch={handleWatchCard}
            deleting={deleting}
            viewMode={viewMode}
            onOpenMaterial={setViewingMaterial}
            onManageNotes={setNotesModalCard}
          />
        )
      })}
    </div>
  )

  /** Render Grid or List of Batches */
  const renderBatchList = (batchList, isMyBatchList = false) => {
    if (viewMode === 'list') {
      return (
        <div className="space-y-2.5">
          {batchList.map((batch, idx) => {
            const count = cards.filter(c => getCardBatchIds(c).includes(batch.id)).length
            const lightTheme = BATCH_THEMES[idx % BATCH_THEMES.length]
            const darkTheme = DARK_BATCH_THEMES[idx % DARK_BATCH_THEMES.length]
            const isMyBatch = isMyBatchList || isBatchTeacher(batch, user?.id)

            return (
              <button
                key={batch.id}
                onClick={() => selectBatch(batch)}
                className={`w-full group text-left rounded-2xl border p-3.5 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer relative overflow-hidden ${
                  isMyBatch
                    ? darkTheme.cardBg
                    : lightTheme.cardBg
                }`}
              >
                <div className={`absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b ${
                  isMyBatch ? darkTheme.gradientRim : lightTheme.gradientRim
                }`} />
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    isMyBatch ? darkTheme.iconBg : lightTheme.iconBg
                  }`}>
                    <School className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`text-sm font-black truncate ${
                        isMyBatch ? 'text-white group-hover:text-white/90' : 'text-slate-900 group-hover:text-blue-900'
                      }`}>
                        {batch.name}
                      </h3>
                      {isMyBatch ? (
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${darkTheme.badgeBg}`}>
                          My Batch • Full Access
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                          View Only
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[11px] font-semibold ${isMyBatch ? 'text-slate-400' : 'text-slate-500'}`}>
                        {batch.subjects?.length || 0} Modules:
                      </span>
                      {(batch.subjects || []).slice(0, 4).map(sub => (
                        <span key={sub} className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
                          isMyBatch
                            ? darkTheme.tagBg
                            : 'text-slate-700 bg-white/90 border-slate-200/80'
                        }`}>
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className={`flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 shrink-0 ${
                  isMyBatch ? 'border-slate-800/60' : 'border-slate-200/60'
                }`}>
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                    isMyBatch
                      ? darkTheme.badgeBg
                      : lightTheme.badgeBg
                  }`}>
                    {count} {count === 1 ? 'Card' : 'Cards'}
                  </span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                    isMyBatch
                      ? darkTheme.btnBg
                      : 'bg-slate-900 text-white group-hover:bg-blue-600'
                  }`}>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {batchList.map((batch, idx) => {
          const count = cards.filter(c => getCardBatchIds(c).includes(batch.id)).length
          const lightTheme = BATCH_THEMES[idx % BATCH_THEMES.length]
          const darkTheme = DARK_BATCH_THEMES[idx % DARK_BATCH_THEMES.length]
          const isMyBatch = isMyBatchList || isBatchTeacher(batch, user?.id)

          return (
            <button
              key={batch.id}
              onClick={() => selectBatch(batch)}
              className={`group text-left rounded-3xl border p-4 sm:p-5 shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between min-h-[165px] cursor-pointer relative overflow-hidden ${
                isMyBatch
                  ? darkTheme.cardBg
                  : lightTheme.cardBg
              }`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                isMyBatch
                  ? darkTheme.gradientRim
                  : lightTheme.gradientRim
              }`} />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2.5 rounded-2xl group-hover:scale-105 transition-transform ${
                    isMyBatch
                      ? darkTheme.iconBg
                      : lightTheme.iconBg
                  }`}>
                    <School className="h-4.5 w-4.5" />
                  </div>
                  {isMyBatch ? (
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${darkTheme.badgeBg}`}>
                      My Batch • Full Access
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      View Only
                    </span>
                  )}
                </div>
                <span className={`text-[10px] sm:text-xs font-black px-3 py-1 rounded-full border ${
                  isMyBatch
                    ? darkTheme.badgeBg
                    : lightTheme.badgeBg
                }`}>
                  {count} {count === 1 ? 'Card' : 'Cards'}
                </span>
              </div>
              <div className="mt-3.5 space-y-3">
                <div>
                  <h3 className={`text-base sm:text-lg font-black tracking-tight leading-snug truncate transition-colors ${
                    isMyBatch
                      ? 'text-white group-hover:text-white/90'
                      : 'text-slate-900 group-hover:text-blue-900'
                  }`}>
                    {batch.name}
                  </h3>
                  <p className={`text-xs font-semibold truncate mt-0.5 ${
                    isMyBatch ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {batch.subjects?.length || 0} Subject Modules Available
                  </p>
                </div>
                <div className={`flex items-center justify-between gap-2 pt-2 border-t ${
                  isMyBatch ? 'border-slate-800/80' : 'border-slate-200/60'
                }`}>
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    {(batch.subjects || []).slice(0, 3).map(sub => (
                      <span
                        key={sub}
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg border shadow-2xs ${
                          isMyBatch
                            ? darkTheme.tagBg
                            : 'text-slate-700 bg-white/90 border-slate-200/80'
                        }`}
                      >
                        {sub}
                      </span>
                    ))}
                    {(batch.subjects || []).length > 3 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isMyBatch ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-white/60'
                      }`}>
                        +{(batch.subjects.length - 3)}
                      </span>
                    )}
                  </div>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 shadow-2xs shrink-0 ${
                    isMyBatch
                      ? darkTheme.btnBg
                      : 'bg-slate-900 text-white group-hover:bg-blue-600'
                  }`}>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  /** Render Grid or List of Subjects */
  const renderSubjectList = (subjectList) => {
    if (viewMode === 'list') {
      return (
        <div className="space-y-2">
          {subjectList.map(sub => {
            const count = batchCards.filter(c => c.subject?.toLowerCase() === sub.toLowerCase()).length
            const theme = getSubjectTheme(sub)
            const Icon = theme.icon
            return (
              <button
                key={sub}
                onClick={() => selectSubject(sub)}
                className={`w-full group text-left bg-gradient-to-r ${theme.gradient} text-white rounded-2xl p-3 shadow-2xs hover:shadow-md transition-all duration-300 flex items-center justify-between gap-3 cursor-pointer border border-white/10`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl shrink-0">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="text-sm font-black text-white truncate">{sub}</h4>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-black bg-white/20 backdrop-blur-md text-white px-2.5 py-1 rounded-full border border-white/20">
                    {count} Cards
                  </span>
                  <ArrowRight className="h-4 w-4 text-white/80 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            )
          })}
        </div>
      )
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {subjectList.map(sub => {
          const count = batchCards.filter(c => c.subject?.toLowerCase() === sub.toLowerCase()).length
          const theme = getSubjectTheme(sub)
          const Icon = theme.icon
          return (
            <button
              key={sub}
              onClick={() => selectSubject(sub)}
              className={`group text-left bg-gradient-to-br ${theme.gradient} text-white rounded-3xl p-4 shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between min-h-[130px] relative overflow-hidden cursor-pointer border border-white/10`}
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="p-2 bg-white/15 backdrop-blur-md rounded-xl border border-white/20">
                  <Icon className="h-4.5 w-4.5 text-white" />
                </div>
                <span className="text-[10px] font-black bg-white/20 backdrop-blur-md text-white px-2.5 py-0.5 rounded-full border border-white/20">
                  {count} Cards
                </span>
              </div>
              <div className="relative z-10 flex items-center justify-between gap-1.5 mt-3">
                <h4 className="text-xs sm:text-base font-black text-white tracking-tight truncate group-hover:text-amber-300 transition-colors">
                  {sub}
                </h4>
                <ArrowRight className="h-4 w-4 text-white/80 shrink-0 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  /** Render Grid or List of Content Folders */
  const renderFolderList = () => {
    if (viewMode === 'list') {
      return (
        <div className="space-y-2">
          {FOLDER_TYPES.map(folder => {
            const Icon = folder.icon
            const count = folderCounts[folder.id]
            const unitName = count === 1 ? folder.unitSingular : folder.unitPlural
            return (
              <button
                key={folder.id}
                onClick={() => openFolder(folder.id)}
                className={`w-full group text-left rounded-2xl border p-3 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 cursor-pointer ${folder.cardBg}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-xl ${folder.iconBg} shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-slate-900 truncate">{folder.name}</h4>
                    <p className={`text-[10px] font-semibold truncate ${folder.descColor}`}>{folder.desc}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
                  <span className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full shadow-2xs ${folder.badgeBg}`}>
                    {count} {unitName}
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            )
          })}
        </div>
      )
    }

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {FOLDER_TYPES.map(folder => {
          const Icon = folder.icon
          const count = folderCounts[folder.id]
          const unitName = count === 1 ? folder.unitSingular : folder.unitPlural
          return (
            <button
              key={folder.id}
              onClick={() => openFolder(folder.id)}
              className={`group text-left rounded-3xl border p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[135px] cursor-pointer ${folder.cardBg}`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-2xl ${folder.iconBg} group-hover:scale-110 transition-transform`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full shadow-2xs ${folder.badgeBg}`}>
                  {count} {unitName}
                </span>
              </div>
              <div className="mt-3">
                <h4 className="text-xs sm:text-base font-black text-slate-900 truncate tracking-tight">
                  {folder.name}
                </h4>
                <p className={`text-[10px] sm:text-xs font-semibold truncate ${folder.descColor}`}>
                  {folder.desc}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  const activeFolderObj = FOLDER_TYPES.find(f => f.id === selectedFolder)

  return (
    <div className="w-full space-y-4 pb-28 sm:pb-12 text-slate-900 min-w-0 overflow-x-hidden">

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* COMPACT STACKED-HIERARCHY HEADER BAR                                      */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 sm:p-4 space-y-2.5 sm:space-y-3 transition-all">
        {/* Tier 1: Circular Back Button & Context Hierarchy Breadcrumb + Non-Truncating Count Badge */}
        <div className="flex items-center justify-between gap-2.5 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {(selectedBatch || selectedSubject || selectedFolder || selectedChapter) && (
              <button
                type="button"
                onClick={goBackStep}
                className="w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 flex items-center justify-center transition-all cursor-pointer border border-slate-200/90 shadow-2xs shrink-0"
                title={
                  selectedChapter
                    ? 'Back to Chapters'
                    : selectedFolder
                    ? 'Back to Content Folders'
                    : selectedSubject
                    ? 'Back to Subjects'
                    : 'Back to Batches'
                }
              >
                <ArrowLeft className="h-4.5 w-4.5 text-slate-800" />
              </button>
            )}

            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-blue-600 block truncate">
                {selectedChapter
                  ? `${activeFolderObj?.name || 'Video Lectures'} • ${selectedSubject}`
                  : selectedFolder 
                  ? `${selectedSubject} • ${selectedBatch?.name}`
                  : selectedSubject 
                  ? selectedBatch?.name 
                  : selectedBatch 
                  ? 'Workspace' 
                  : 'Study Workspace'}
              </span>
            </div>
          </div>

          {/* Dedicated Non-Truncating Count Badges */}
          {selectedFolder === 'video' && !selectedChapter && (
            <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/80 shrink-0 whitespace-nowrap shadow-2xs">
              {(() => {
                const totalCh = batchSubjectChapters.length + (unassignedVideos.length > 0 || batchSubjectChapters.length === 0 ? 1 : 0)
                const totalVids = batchSubjectVideoCards.length
                return `(${totalCh} ${totalCh === 1 ? 'Chapter' : 'Chapters'} • ${totalVids} ${totalVids === 1 ? 'Video' : 'Videos'})`
              })()}
            </span>
          )}
          {selectedChapter && (
            <span className="text-[10px] sm:text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200/80 shrink-0 whitespace-nowrap shadow-2xs">
              ({activeChapterVideos.length} {activeChapterVideos.length === 1 ? 'Video' : 'Videos'})
            </span>
          )}
          {selectedFolder && selectedFolder !== 'video' && (
            <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/80 shrink-0 whitespace-nowrap shadow-2xs">
              ({processedCards.length} {processedCards.length === 1 ? 'Item' : 'Items'})
            </span>
          )}
        </div>

        {/* Tier 2: Full Title & Responsive Action CTAs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4 pt-0.5">
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug break-words line-clamp-2 min-w-0 flex-1">
            {selectedChapter
              ? (activeChapterObj?.title || 'Chapter Lectures')
              : selectedFolder === 'video'
              ? `${selectedSubject} Video Chapters`
              : selectedFolder 
              ? (activeFolderObj?.name || 'Folder Material')
              : selectedSubject 
              ? selectedSubject 
              : selectedBatch 
              ? selectedBatch.name 
              : 'All Batches'}
          </h2>

          {canManageBatch(selectedBatch) && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
              {selectedFolder === 'video' && !selectedChapter ? (
                <>
                  <button
                    type="button"
                    onClick={openCreateChapter}
                    className="flex-1 sm:flex-none px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Chapter</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openAddForm('video')}
                    className="flex-1 sm:flex-none px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs border border-blue-400/30"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Video</span>
                  </button>
                </>
              ) : selectedFolder === 'video' && selectedChapter ? (
                <button
                  type="button"
                  onClick={() => openAddForm('video')}
                  className="w-full sm:w-auto px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs border border-blue-400/30"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Video to Chapter</span>
                </button>
              ) : selectedFolder ? (
                <button
                  type="button"
                  onClick={() => openAddForm(activeFolderObj?.cardType || 'external_link')}
                  className="w-full sm:w-auto px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs border border-blue-400/30"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Study Card</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openAddForm('external_link')}
                  className="w-full sm:w-auto px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs border border-blue-400/30"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Study Card</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Row 2: Full-Width Search Input & View Mode Toggle */}
        <div className="flex items-center justify-between gap-2 min-w-0 pt-1 border-t border-slate-100">
          <div className="relative flex-1 min-w-0">
            <Search className="h-3 w-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={selectedFolder === 'video' ? 'Search chapters or lectures...' : 'Search cards...'}
              className="w-full pl-7 pr-6 py-1 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-[11px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-2xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
              title="Grid View"
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-2xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
              title="List View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 24-Hour Activity Log Audit Trail Button */}
          {selectedBatch && canManageBatch(selectedBatch) && (
            <button
              type="button"
              onClick={() => setShowActivityLog(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200/90 text-slate-700 hover:text-blue-900 hover:bg-slate-50 text-xs font-bold rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
              title="View recent 24-hour activity audit trail for this batch"
            >
              <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="hidden sm:inline">Activity Log</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700">24h</span>
            </button>
          )}
        </div>

      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* CONTENT CANVAS                                                           */}
      {/* ───────────────────────────────────────────────────────────────────────── */}

      {/* Global Search Results Overlay view if user is typing search query */}
      {searchQuery.trim() ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <Search className="h-4 w-4 text-blue-600" />
              Search Results for &quot;{searchQuery}&quot;
            </h3>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
              {processedCards.length} Matches Found
            </span>
          </div>

          {processedCards.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-6 space-y-2">
              <Search className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No study cards match your search criteria</p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          ) : (
            renderCardList(processedCards)
          )}
        </div>
      ) : !selectedBatch ? (
        /* LEVEL 0: BATCHES OVERVIEW */
        <div className="space-y-6">
          {/* SECTION 1: MY BATCHES (Top priority assigned batches with darkish/greyish cards) */}
          {myBatches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-amber-500" /> My Batches
                </h2>
                <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {myBatches.length} Assigned {myBatches.length === 1 ? 'Batch' : 'Batches'}
                </span>
              </div>
              {renderBatchList(myBatches, true)}
            </div>
          )}

          {/* SECTION 2: OTHER BATCHES (Light cards, view only) */}
          {otherBatches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <School className="h-4.5 w-4.5 text-blue-600" />
                  {myBatches.length > 0 ? 'Other Institute Batches' : 'All Institute Batches'}
                </h2>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                  {otherBatches.length} View Only
                </span>
              </div>
              {renderBatchList(otherBatches, false)}
            </div>
          )}
        </div>
      ) : selectedBatch && !selectedSubject ? (
        /* LEVEL 1: SUBJECTS OVERVIEW */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
              <BookOpen className="h-4.5 w-4.5 text-indigo-600" /> {selectedBatch.name} Subjects
            </h2>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
              {(selectedBatch.subjects || []).length} Modules
            </span>
          </div>

          {renderSubjectList(selectedBatch.subjects || [])}
        </div>
      ) : (
        /* LEVEL 2: SUBJECT LEVEL (ROOT DIRECTORY vs OPENED FOLDER) */
        <div className="space-y-4 min-w-0">

          {!selectedFolder ? (
            /* ROOT FOLDER DIRECTORY: 4 CLEAN VISUAL FOLDERS ONLY */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                  <Folder className="h-4 w-4 text-amber-500" />
                  {selectedSubject} Content Folders
                </h3>
                <span className="text-[11px] font-bold text-slate-500">
                  {subjectCards.length} Total Items
                </span>
              </div>

              {renderFolderList()}
            </div>
          ) : selectedFolder === 'video' ? (
            /* OPENED FOLDER: VIDEO LECTURES WITH CHAPTER ARCHITECTURE */
            !selectedChapter ? (
              /* CHAPTER LIST VIEW FOR VIDEO LECTURES */
              <div className="space-y-4">
                {isChaptersTableMissing && (
                  <ChapterSchemaAlert
                    isAdmin={isAdmin}
                    onRetry={fetchData}
                  />
                )}

                {batchSubjectChapters.length === 0 && unassignedVideos.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
                    <BookOpen className="h-10 w-10 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">No chapters or video lectures added yet for {selectedSubject}</p>
                    {canManageBatch(selectedBatch) && (
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={openCreateChapter}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Plus className="h-3.5 w-3.5" /> Create First Chapter
                        </button>
                        <button
                          type="button"
                          onClick={() => openAddForm('video')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Video Lecture
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                    {batchSubjectChapters.map((ch, idx) => {
                      const videoCount = getChapterVideoCount(ch)
                      const chapterNum = String(idx + 1).padStart(2, '0')
                      return (
                        <div
                          key={ch.id}
                          onClick={() => openChapter(ch.id)}
                          className="group relative bg-white rounded-2xl border border-slate-200/90 sm:hover:border-slate-300 p-4 shadow-2xs sm:hover:shadow-md transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50/90 to-blue-50/90 border border-indigo-200/70 flex flex-col items-center justify-center shrink-0 transition-transform duration-200 shadow-2xs">
                              <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500">
                                CH
                              </span>
                              <span className="text-sm font-black text-indigo-700 leading-none">
                                {chapterNum}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center flex-wrap gap-1.5">
                                <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100/80 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                  Chapter {idx + 1}
                                </span>
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {videoCount} {videoCount === 1 ? 'Lecture' : 'Lectures'}
                                </span>
                              </div>
                              <h4 className="text-sm sm:text-base font-bold text-slate-900 sm:group-hover:text-indigo-600 transition-colors line-clamp-2 break-words mt-1 leading-snug">
                                {ch.title}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {canManageBatch(selectedBatch) && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openEditChapter(ch)
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                  title="Edit Chapter"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteChapter(ch.id)
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Delete Chapter"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                            <div className="w-8 h-8 rounded-full bg-slate-100/80 text-slate-400 sm:group-hover:text-slate-600 sm:group-hover:bg-slate-200/80 flex items-center justify-center transition-all ml-1">
                              <ChevronRight className="h-4 w-4 sm:group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {/* Fallback Chapter: General & Introductory Lectures */}
                    {(unassignedVideos.length > 0 || batchSubjectChapters.length === 0) && (
                      <div
                        onClick={() => openChapter('general')}
                        className="group relative bg-white rounded-2xl border border-dashed border-slate-300 sm:hover:border-amber-400/80 p-4 shadow-2xs sm:hover:shadow-md transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="w-12 h-12 rounded-2xl bg-amber-50/90 border border-amber-200/70 flex flex-col items-center justify-center shrink-0 transition-transform duration-200 shadow-2xs">
                            <Folder className="h-5 w-5 text-amber-600 transition-colors" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100/80 border border-amber-200/80 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                General
                              </span>
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                {unassignedVideos.length} {unassignedVideos.length === 1 ? 'Lecture' : 'Lectures'}
                              </span>
                            </div>
                            <h4 className="text-sm sm:text-base font-bold text-slate-900 sm:group-hover:text-amber-700 transition-colors line-clamp-2 break-words mt-1 leading-snug">
                              General & Introductory Lectures
                            </h4>
                          </div>
                        </div>

                        <div className="w-8 h-8 rounded-full bg-slate-100/80 text-slate-400 sm:group-hover:text-slate-600 sm:group-hover:bg-slate-200/80 flex items-center justify-center transition-all shrink-0 ml-1">
                          <ChevronRight className="h-4 w-4 sm:group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* CHAPTER SPECIFIC LECTURES VIEW */
              <div className="space-y-4">
                {activeChapterVideos.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
                    <FolderOpen className="h-10 w-10 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">No video lectures in this chapter yet</p>
                    {canManageBatch(selectedBatch) && (
                      <button
                        type="button"
                        onClick={() => openAddForm('video')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Plus className="h-4 w-4" /> Add Lecture
                      </button>
                    )}
                  </div>
                ) : (
                  renderCardList(activeChapterVideos)
                )}
              </div>
            )
          ) : (
            /* OPENED FOLDER VIEW: NON-VIDEO FOLDERS LIST */
            <div className="space-y-3">
              {processedCards.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
                  <FolderOpen className="h-10 w-10 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No study material available in this folder</p>
                  {canManageBatch(selectedBatch) && (
                    <button
                      onClick={() => openAddForm(activeFolderObj?.cardType || 'external_link')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Plus className="h-4 w-4" /> Add Study Card
                    </button>
                  )}
                </div>
              ) : (
                renderCardList(processedCards)
              )}
            </div>
          )}

        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* ADD / EDIT STUDY CARD MODAL                                              */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-scale-in text-slate-900 z-[100000]">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 shrink-0">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                  {editing ? 'Edit Study Card' : 'Create New Study Card'}
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                  Configure card title, YouTube / Google Drive URLs, and target batches.
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              <div className="flex flex-col md:flex-row gap-5">

                {/* Form Controls Column */}
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Card Title *
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                      placeholder="e.g. Chapter 1: Electric Charges & Fields"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
                      placeholder="Brief overview or topic notes"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Card Type *
                      </label>
                      <CustomCardTypeSelect
                        value={form.type}
                        onChange={(newType) => setForm(f => ({ ...f, type: newType }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Subject Module
                      </label>
                      <CustomSubjectSelect
                        value={form.subject}
                        onChange={(newSub) => setForm(f => ({ ...f, subject: newSub }))}
                        availableSubjects={unionSubjects(batches, form.batch_ids)}
                      />
                    </div>
                  </div>

                  {(form.type === 'youtube_video' || form.type === 'youtube_playlist') && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Chapter (Optional)
                      </label>
                      <CustomChapterSelect
                        value={form.chapter}
                        chapterId={form.chapter_id}
                        onChange={(chTitle, chId) => setForm(f => ({ ...f, chapter: chTitle, chapter_id: chId }))}
                        availableChapters={
                          form.subject
                            ? chapters.filter(ch => (form.batch_ids.length === 0 || form.batch_ids.includes(ch.batch_id)) && ch.subject?.toLowerCase() === form.subject.toLowerCase())
                            : chapters
                        }
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Content URL *
                    </label>
                    <input
                      type="url"
                      value={form.url}
                      onChange={(e) => setForm(f => ({ ...f, url: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                      placeholder="https://youtu.be/... or https://drive.google.com/..."
                    />
                  </div>

                  {/* Featured Card Switch */}
                  <div className="pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.is_featured}
                        onChange={(e) => setForm(f => ({ ...f, is_featured: e.target.checked }))}
                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Highlight as Featured Card
                      </span>
                    </label>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Visibility & Target Batches
                    </label>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-slate-50">
                      <label className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${form.is_public ? 'bg-emerald-50' : 'hover:bg-slate-100/80'}`}>
                        <input
                          type="checkbox"
                          checked={form.is_public}
                          onChange={(e) => setForm(f => ({ ...f, is_public: e.target.checked }))}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <Globe className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Make Public Resource</p>
                          <p className="text-[10px] text-slate-500">Visible to all student visitors in Free Library</p>
                        </div>
                      </label>

                      {selectableBatches.map(batch => {
                        const checked = form.batch_ids.includes(batch.id)
                        return (
                          <label key={batch.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-blue-50' : 'hover:bg-slate-100/80'}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setForm(f => {
                                  const next = checked ? f.batch_ids.filter(id => id !== batch.id) : [...f.batch_ids, batch.id]
                                  return { ...f, batch_ids: next }
                                })
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-900">{batch.name}</p>
                              <p className="text-[10px] text-slate-500">Enrolled batch students</p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                </div>

                {/* Live Card Preview Column */}
                <div className="w-full md:w-64 shrink-0 bg-slate-50 rounded-2xl p-3 border border-slate-200 flex flex-col justify-between space-y-2">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                      Live Preview Card
                    </span>
                    <div className="pointer-events-none">
                      <ManageableStudyCard
                        card={{
                          ...form,
                          id: 'preview',
                          is_active: true,
                          thumbnail_url: getYTThumb(form.url) || playlistThumb
                        }}
                        canManage={false}
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer Action Bar */}
            <div className="px-4 sm:px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setShowForm(false)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-200/80 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving...' : editing ? 'Update Card' : 'Save Card'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showActivityLog && selectedBatch && (
        <ActivityLogModal
          batchId={selectedBatch.id}
          batchName={selectedBatch.name}
          onClose={() => setShowActivityLog(false)}
        />
      )}

      {/* In-App Material Viewer Modal for Drive & External Resources */}
      {viewingMaterial && (
        <MaterialViewerModal
          card={viewingMaterial}
          onClose={() => setViewingMaterial(null)}
        />
      )}

      {/* Notes Playlist Modal for Educators/Admins */}
      {notesModalCard && (
        <NotesPlaylistModal
          isOpen={Boolean(notesModalCard)}
          onClose={() => setNotesModalCard(null)}
          card={notesModalCard}
          onSaveSuccess={(updated) => {
            setCards(prev => prev.map(c => c.id === updated.id ? updated : c))
            setNotesModalCard(null)
          }}
        />
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* CREATE / EDIT CHAPTER MODAL                                              */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {showChapterModal && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-scale-in text-slate-900 z-[100000]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 shrink-0">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                  {editingChapterId ? 'Edit Chapter' : 'Create New Chapter'}
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                  {selectedSubject} • {selectedBatch?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowChapterModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Chapter Title *
                </label>
                <input
                  type="text"
                  value={chapterForm.title}
                  onChange={(e) => setChapterForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  placeholder="e.g. Electric Charges and Fields"
                  autoFocus
                />
              </div>


              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={chapterForm.display_order}
                  onChange={(e) => setChapterForm(f => ({ ...f, display_order: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  placeholder="1, 2, 3..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowChapterModal(false)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-200/80 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveChapter}
                disabled={savingChapter}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {savingChapter ? 'Saving...' : editingChapterId ? 'Update Chapter' : 'Save Chapter'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

