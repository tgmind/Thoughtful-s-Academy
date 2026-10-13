import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play,
  MessageCircle,
  CheckCircle2,
  Clock,
  Trash2,
  Video,
  User,
  Hash,
  Sparkles,
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
}) {
  const navigate = useNavigate()
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  const isPending = doubt.status === 'pending'
  const isAddressed = doubt.status === 'addressed'

  // Format relative or calendar date
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
  const handlePlay = () => {
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

  const handleMessage = () => {
    if (onMessageStudent) {
      onMessageStudent(doubt.student_id)
      return
    }
    const prefix = role === 'admin' ? '/admin' : '/teacher'
    navigate(`${prefix}/messages?student=${doubt.student_id}`)
  }

  return (
    <div
      className={`relative rounded-2xl sm:rounded-3xl border transition-all duration-200 bg-white shadow-xs hover:shadow-md overflow-hidden w-full max-w-full min-w-0 ${
        isPending
          ? 'border-slate-200/90 hover:border-amber-300/80'
          : 'border-emerald-200/90 bg-gradient-to-b from-white to-emerald-50/15'
      }`}
    >
      <div className="p-3.5 sm:p-5 flex flex-col justify-between gap-3 min-w-0">
        {/* ── 1. HEADER: Student Identity & Badges ──────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2.5 min-w-0">
          {/* Identity Info */}
          <div className="flex items-center flex-wrap gap-2 min-w-0">
            {/* Student Avatar / Initials */}
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 font-bold text-xs border border-slate-200">
              {doubt.student_name ? (
                doubt.student_name.slice(0, 2).toUpperCase()
              ) : (
                <User className="h-3.5 w-3.5" />
              )}
            </div>

            {/* Student Name */}
            <span className="font-extrabold text-sm text-slate-900 tracking-tight truncate max-w-[160px] sm:max-w-[240px]">
              {doubt.student_name || 'Student'}
            </span>

            {/* Roll Number Pill */}
            {doubt.roll_number && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80 shrink-0">
                <Hash className="h-3 w-3 text-slate-400" />
                <span>{doubt.roll_number}</span>
              </span>
            )}
          </div>

          {/* Status & Submission Time */}
          <div className="flex items-center flex-wrap gap-2 shrink-0">
            {isPending ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span>Pending Review</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Addressed in Class</span>
              </span>
            )}

            {formattedTime && (
              <span className="text-[11px] text-slate-400 font-medium">
                {formattedTime}
              </span>
            )}
          </div>
        </div>

        {/* ── 2. SUBJECT & BATCH PILLS ─────────────────────────────────────── */}
        <div className="flex items-center flex-wrap gap-1.5 text-[11px] min-w-0">
          <span className="px-2.5 py-0.5 rounded-lg font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
            {doubt.subject || 'General'}
          </span>
          {doubt.batch_name && (
            <span className="px-2.5 py-0.5 rounded-lg font-medium bg-slate-100 text-slate-600 border border-slate-200/70 truncate max-w-[200px] sm:max-w-none">
              {doubt.batch_name}
            </span>
          )}
        </div>

        {/* ── 3. QUESTION TEXT ─────────────────────────────────────────────── */}
        <div className="bg-slate-50/80 rounded-2xl p-3 sm:p-3.5 border border-slate-200/70 min-w-0">
          <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed font-normal whitespace-pre-wrap break-words">
            {doubt.question}
          </p>
        </div>

        {/* ── 4. LECTURE & TIMESTAMP CONTEXT ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 text-xs text-slate-500 pt-0.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Video className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span
              className="font-semibold text-slate-700 truncate text-xs sm:text-[13px]"
              title={doubt.lecture_title}
            >
              {doubt.lecture_title}
            </span>
          </div>

          <div className="self-start sm:self-auto inline-flex items-center gap-1 shrink-0 font-bold text-amber-800 bg-amber-50/90 px-2.5 py-1 rounded-lg border border-amber-200/70 text-[11px]">
            <Clock className="h-3 w-3 text-amber-600 shrink-0" />
            <span>At {formatTimestamp(doubt.timestamp_seconds)}</span>
          </div>
        </div>

        {/* ── 5. RESOLUTION FOOTER (IF ADDRESSED) ──────────────────────────── */}
        {isAddressed && (
          <div className="bg-emerald-50/70 rounded-xl p-2.5 border border-emerald-200/70 flex flex-wrap items-center justify-between gap-1.5 text-xs text-emerald-900 min-w-0">
            <span className="flex items-center gap-1.5 font-semibold text-[11px] truncate">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">
                Addressed by <strong className="font-bold">{doubt.addressed_by_name || 'Educator'}</strong>
              </span>
            </span>
            {formattedAddressedTime && (
              <span className="text-[10px] text-emerald-700 font-medium shrink-0">
                {formattedAddressedTime}
              </span>
            )}
          </div>
        )}

        {/* ── 6. QUICK ACTION BUTTONS STRIP ─────────────────────────────────── */}
        {role === 'student' ? (
          /* Student Action Bar */
          <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
            <button
              type="button"
              onClick={handlePlay}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-blue-950 hover:bg-blue-900 active:scale-98 text-white shadow-xs transition-all cursor-pointer min-h-[42px]"
            >
              <Play className="h-3.5 w-3.5 fill-current text-amber-400 shrink-0" />
              <span>Play at {formatTimestamp(doubt.timestamp_seconds)}</span>
            </button>

            {showConfirmDelete ? (
              <div className="inline-flex items-center justify-between sm:justify-end gap-1.5 bg-rose-50 border border-rose-200 p-1.5 rounded-xl w-full sm:w-auto">
                <span className="text-[11px] font-bold text-rose-700 px-1">
                  Clear doubt?
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => {
                      setShowConfirmDelete(false)
                      onDelete && onDelete(doubt.id)
                    }}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    Yes, clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(false)}
                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 active:scale-98 transition-all cursor-pointer min-h-[38px] self-end sm:self-auto"
                title="Understood via self-study? Delete to clear teacher queue"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                <span>Clear (Self Study)</span>
              </button>
            )}
          </div>
        ) : (
          /* Educator & Admin Action Bar */
          <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
            {/* Play & Message Group */}
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handlePlay}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs bg-blue-950 hover:bg-blue-900 active:scale-98 text-white shadow-xs transition-all cursor-pointer min-h-[42px]"
              >
                <Play className="h-3.5 w-3.5 fill-current text-amber-400 shrink-0" />
                <span>Play at {formatTimestamp(doubt.timestamp_seconds)}</span>
              </button>

              <button
                type="button"
                onClick={handleMessage}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-semibold text-xs border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 active:scale-98 transition-all cursor-pointer min-h-[42px]"
              >
                <MessageCircle className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span>Message Student</span>
              </button>
            </div>

            {/* Resolve & Moderation Group */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {isPending && (
                <button
                  type="button"
                  disabled={isResolving}
                  onClick={() => onMarkAddressed && onMarkAddressed(doubt.id)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 min-h-[42px]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{isResolving ? 'Resolving…' : 'Mark Addressed in Class'}</span>
                </button>
              )}

              {role === 'admin' && (
                <>
                  {showConfirmDelete ? (
                    <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1.5 rounded-xl">
                      <span className="text-[11px] font-bold text-rose-700 px-1">
                        Delete?
                      </span>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => {
                          setShowConfirmDelete(false)
                          onDelete && onDelete(doubt.id)
                        }}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirmDelete(false)}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(true)}
                      className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl font-medium text-xs text-rose-600 hover:bg-rose-50 active:scale-98 transition-all cursor-pointer min-h-[42px]"
                      title="Delete doubt record"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Delete</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
