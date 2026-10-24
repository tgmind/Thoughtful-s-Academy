import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play,
  MessageCircle,
  CheckCircle2,
  Trash2,
  Video,
  User,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { formatTimestamp } from '../../services/doubtService'

export default function DoubtCard({
  doubt,
  role = 'student', // 'student' | 'teacher' | 'admin'
  onMarkAddressed,
  onDelete,
  onPlayVideo,
  onMessageStudent,
  isResolving = false,
  isDeleting = false,
  defaultExpanded = undefined,
}) {
  const navigate = useNavigate()
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  const isPending = doubt.status === 'pending'
  const isAddressed = doubt.status === 'addressed'

  // Only pending doubts are shown in full scale by default.
  // Addressed doubts start compact & collapsed to eliminate clutter.
  const [isExpanded, setIsExpanded] = useState(
    defaultExpanded !== undefined ? defaultExpanded : isPending
  )

  // Format relative or calendar dates
  const createdDate = doubt.created_at ? new Date(doubt.created_at) : null
  const formattedTime = createdDate
    ? createdDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  const addressedDate = doubt.addressed_at ? new Date(doubt.addressed_at) : null
  const formattedAddressedTime = addressedDate
    ? addressedDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  // Navigation handlers
  const handlePlay = (e) => {
    e?.stopPropagation()
    if (onPlayVideo) {
      onPlayVideo(doubt)
      return
    }
    const prefix = role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/student'
    if (doubt.study_card_id) {
      navigate(`${prefix}/watch/${doubt.study_card_id}?t=${doubt.timestamp_seconds || 0}`)
    } else if (doubt.video_url) {
      window.open(doubt.video_url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleMessage = (e) => {
    e?.stopPropagation()
    if (onMessageStudent) {
      onMessageStudent(doubt.student_id)
      return
    }
    const prefix = role === 'admin' ? '/admin' : '/teacher'
    navigate(`${prefix}/messages?student=${doubt.student_id}`)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE A: ADDRESSED & COMPACT (COLLAPSED BY DEFAULT, EXPANDABLE ON DEMAND)
  // ═══════════════════════════════════════════════════════════════════════════
  if (isAddressed && !isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        className="group relative rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50/90 shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer overflow-hidden p-3 sm:p-4 w-full"
      >
        {/* Tier 1: Identity & Status Bar */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-xs text-slate-900 tracking-tight truncate">
                {doubt.student_name || 'Student'}
              </span>
              {doubt.roll_number && (
                <span className="text-[11px] font-mono text-slate-400 font-medium whitespace-nowrap">
                  #<span>{doubt.roll_number}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
              <span>Addressed in Class</span>
            </span>
            <div className="p-1 rounded-lg text-slate-400 group-hover:text-slate-600 transition-colors">
              <ChevronDown className="h-4 w-4 shrink-0" />
            </div>
          </div>
        </div>

        {/* Tier 2: Question Summary & Context Line */}
        <div className="mt-1.5 pl-8 min-w-0">
          <p className="text-xs text-slate-600 font-normal truncate italic">
            "{doubt.question}"
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium truncate mt-0.5">
            <span className="font-bold text-indigo-700 shrink-0">{doubt.subject || 'General'}</span>
            {doubt.batch_name && (
              <>
                <span>•</span>
                <span className="truncate">{doubt.batch_name}</span>
              </>
            )}
            {doubt.addressed_by_name && (
              <>
                <span>•</span>
                <span className="text-emerald-700 font-semibold truncate">
                  by <span>{doubt.addressed_by_name}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE B: FULL-SCALE CARD
  // PENDING DOUBTS HIGHLIGHTED WITH YELLOW BACKGROUND & YELLOW DASHED BORDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div
      className={`group relative rounded-2xl sm:rounded-3xl transition-all duration-200 overflow-hidden w-full max-w-full min-w-0 ${
        isPending
          ? 'bg-amber-50/85 border-2 border-dashed border-amber-400 shadow-[0_2px_12px_rgba(245,158,11,0.12)] hover:border-amber-500'
          : 'bg-white border border-slate-200/90 shadow-xs hover:shadow-sm'
      }`}
    >
      <div className="p-3.5 sm:p-5 flex flex-col justify-between gap-3.5 min-w-0">
        {/* ── 1. HEADER: Dedicated Two-Row Architecture (Zero Overlapping) ── */}
        <div className={`pb-3 border-b min-w-0 ${isPending ? 'border-amber-200/80' : 'border-slate-100'}`}>
          {/* Row 1: Status Pill (Left) & Actions (Right) */}
          <div className="flex items-center justify-between gap-2 min-w-0 mb-2">
            {/* Status Pill */}
            <div>
              {isPending ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span>Pending Review</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Addressed in Class</span>
                </span>
              )}
            </div>

            {/* Header Actions: Delete (Admin) & Collapse (Addressed) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {role === 'admin' && onDelete && (
                showConfirmDelete ? (
                  <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded-xl">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => {
                        setShowConfirmDelete(false)
                        onDelete(doubt.id)
                      }}
                      className="px-2.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                      title="Confirm permanent deletion"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(false)}
                      className="px-1.5 py-0.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                    title="Delete Doubt Record"
                    aria-label="Delete Doubt"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )
              )}

              {/* Collapse button for expanded addressed card */}
              {isAddressed && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                  title="Collapse Doubt Card"
                  aria-label="Collapse Doubt"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Student Identity & Academic Metadata (Full Width!) */}
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
            <div
              className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 font-black text-xs shadow-2xs mt-0.5 ${
                isPending
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-slate-100 text-slate-700 border border-slate-200/90'
              }`}
            >
              {doubt.student_name ? (
                doubt.student_name.slice(0, 2).toUpperCase()
              ) : (
                <User className="h-3.5 w-3.5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
                <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight truncate">
                  {doubt.student_name || 'Student'}
                </h3>
                {doubt.roll_number && (
                  <span className="text-xs font-mono text-slate-400 font-semibold whitespace-nowrap">
                    #<span>{doubt.roll_number}</span>
                  </span>
                )}
              </div>

              {/* Academic Metadata: Subject • Batch • Date */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium flex-wrap min-w-0 pt-0.5">
                <span className="font-bold text-indigo-700 shrink-0">
                  {doubt.subject || 'General'}
                </span>
                {doubt.batch_name && (
                  <span className="inline-flex items-center gap-1.5 truncate max-w-[160px] sm:max-w-none">
                    <span className="text-slate-300 shrink-0">•</span>
                    <span className="text-slate-600 truncate">{doubt.batch_name}</span>
                  </span>
                )}
                {formattedTime && (
                  <span className="inline-flex items-center gap-1.5 shrink-0">
                    <span className="text-slate-300 shrink-0">•</span>
                    <span className="text-slate-400 font-normal">{formattedTime}</span>
                  </span>
                )}
              </div>

              {/* If Addressed: Resolution attribution line */}
              {isAddressed && doubt.addressed_by_name && (
                <p className="text-[11px] text-emerald-700 font-medium mt-1">
                  Addressed by <strong className="font-bold text-emerald-950">{doubt.addressed_by_name}</strong>
                  {formattedAddressedTime && <span className="text-emerald-600/80"> • {formattedAddressedTime}</span>}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── 2. QUESTION TEXT (HERO EDITORIAL CONTENT) ────────────────────── */}
        <div
          className={`rounded-2xl p-3.5 sm:p-4 border ${
            isPending
              ? 'bg-white/95 border-amber-200/90 shadow-2xs'
              : 'bg-slate-50/80 border-slate-200/70'
          }`}
        >
          <p className="text-xs sm:text-sm text-slate-900 leading-relaxed font-normal whitespace-pre-wrap break-words">
            {doubt.question}
          </p>
        </div>

        {/* ── 3. LECTURE TITLE (Clean, No Repeated Timestamp) ──────────────── */}
        <div className="bg-slate-100/70 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-slate-600 min-w-0">
          <Video className={`h-4 w-4 shrink-0 ${isPending ? 'text-amber-600' : 'text-slate-500'}`} />
          <span
            className="font-bold text-slate-800 truncate text-xs sm:text-[13px] flex-1 min-w-0"
            title={doubt.lecture_title}
          >
            {doubt.lecture_title}
          </span>
        </div>

        {/* ── 4. ACTION BUTTONS STRIP (FRAMER-STYLE PILLS, ZERO COLLISION) ── */}
        {role === 'student' ? (
          /* Student Action Bar */
          <div
            className={`pt-2.5 border-t grid grid-cols-2 gap-2.5 min-w-0 ${
              isPending ? 'border-amber-200/80' : 'border-slate-100'
            }`}
          >
            <button
              type="button"
              onClick={handlePlay}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-full font-bold text-xs bg-blue-950 hover:bg-blue-900 active:scale-[0.98] text-white shadow-xs transition-all cursor-pointer min-h-[42px] whitespace-nowrap"
            >
              <Play className="h-3.5 w-3.5 fill-current text-amber-400 shrink-0" />
              <span>Play at {formatTimestamp(doubt.timestamp_seconds)}</span>
            </button>

            {showConfirmDelete ? (
              <div className="inline-flex items-center justify-between gap-1 bg-rose-50 border border-rose-200 p-1 rounded-full px-2">
                <span className="text-[11px] font-bold text-rose-700 truncate">
                  Clear doubt?
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => {
                      setShowConfirmDelete(false)
                      onDelete && onDelete(doubt.id)
                    }}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(false)}
                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-full text-xs font-bold border border-slate-200 cursor-pointer"
                  >
                    No
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full font-bold text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/80 active:scale-[0.98] transition-all cursor-pointer min-h-[42px] whitespace-nowrap"
                title="Understood via self-study? Delete to clear teacher queue"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                <span>Clear (Self Study)</span>
              </button>
            )}
          </div>
        ) : (
          /* Educator & Admin Action Bar */
          <div
            className={`pt-2.5 border-t flex flex-col gap-2.5 min-w-0 ${
              isPending ? 'border-amber-200/80' : 'border-slate-100'
            }`}
          >
            {/* Primary Action: Mark Addressed (Full Width prominent Framer Pill) */}
            {isPending && onMarkAddressed && (
              <button
                type="button"
                disabled={isResolving}
                onClick={() => onMarkAddressed(doubt.id)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full font-black text-xs bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-xs transition-all cursor-pointer min-h-[44px] disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{isResolving ? 'Marking as Addressed…' : 'Mark Addressed in Class'}</span>
              </button>
            )}

            {/* Navigation & Communication: Dedicated 50/50 Grid (Never truncates!) */}
            <div className="grid grid-cols-2 gap-2.5 w-full min-w-0">
              <button
                type="button"
                onClick={handlePlay}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full font-bold text-xs bg-blue-950 hover:bg-blue-900 active:scale-[0.98] text-white shadow-xs transition-all cursor-pointer min-h-[42px] whitespace-nowrap"
              >
                <Play className="h-3.5 w-3.5 fill-current text-amber-400 shrink-0" />
                <span>Play at {formatTimestamp(doubt.timestamp_seconds)}</span>
              </button>

              <button
                type="button"
                onClick={handleMessage}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full font-bold text-xs bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-2xs active:scale-[0.98] transition-all cursor-pointer min-h-[42px] whitespace-nowrap"
              >
                <MessageCircle className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span>Message Student</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
