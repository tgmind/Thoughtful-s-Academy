import { Clock } from 'lucide-react'

/**
 * WhatsApp-style minimalistic message retention notice pill.
 * Highly optimized for mobile devices: single-line, zero overflow, compact.
 */
export default function MessageRetentionNotice({
  onViewKept = null,
  isKeptFilterActive = false,
  keptCount = 0,
  className = '',
}) {
  const isClickable = Boolean(onViewKept && keptCount > 0)

  return (
    <div className={`flex justify-center my-1 px-1 sm:px-2 ${className}`}>
      <button
        type="button"
        onClick={isClickable ? onViewKept : undefined}
        disabled={!isClickable}
        className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-medium border shadow-2xs text-center whitespace-nowrap transition-all ${
          isClickable
            ? 'cursor-pointer bg-slate-100/90 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 border-slate-200/70 active:scale-98'
            : 'cursor-default bg-slate-100/80 text-slate-600 border-slate-200/60'
        }`}
        title={
          isClickable
            ? isKeptFilterActive
              ? 'Click to show all messages'
              : `Click to view ${keptCount} starred message${keptCount !== 1 ? 's' : ''}`
            : 'Messages delete after 90 days. Star important messages to keep them permanently.'
        }
      >
        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-slate-400 flex-shrink-0" />
        <span>
          Messages delete after 90 days ·{' '}
          <strong className="font-semibold text-slate-700">Star to keep</strong>
        </span>
        {keptCount > 0 && (
          <span
            className={`ml-0.5 inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full transition-colors ${
              isKeptFilterActive
                ? 'bg-amber-200 text-amber-900'
                : 'bg-amber-100/90 text-amber-800'
            }`}
          >
            ⭐ {keptCount}
          </span>
        )}
      </button>
    </div>
  )
}
