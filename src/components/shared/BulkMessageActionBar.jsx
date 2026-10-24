import { Star, CheckSquare, X, BookmarkCheck, BookmarkX } from 'lucide-react'

/**
 * Sleek toolbar for bulk message management.
 * Provides intuitive, high-efficiency batch starring / unstarring.
 */
export default function BulkMessageActionBar({
  selectedCount = 0,
  totalCount = 0,
  onSelectAll = () => {},
  onDeselectAll = () => {},
  onKeepSelected = () => {},
  onUnkeepSelected = () => {},
  onCancel = () => {},
  loading = false,
}) {
  const isAllSelected = totalCount > 0 && selectedCount === totalCount

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 text-white rounded-xl shadow-md border border-violet-500/30 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={isAllSelected ? onDeselectAll : onSelectAll}
          className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
          title={isAllSelected ? 'Deselect all messages' : 'Select all messages in this conversation'}
        >
          <CheckSquare className="h-3.5 w-3.5" />
          <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
        </button>

        <span className="text-xs font-medium text-violet-100 truncate">
          <strong className="text-white font-bold">{selectedCount}</strong> of {totalCount} selected
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onKeepSelected}
          disabled={selectedCount === 0 || loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Keep selected messages permanently (will not expire after 3 months)"
        >
          <Star className="h-3.5 w-3.5 fill-amber-900 text-amber-900" />
          <span className="hidden sm:inline">Keep Selected</span>
          <span className="sm:hidden">Keep</span>
        </button>

        <button
          onClick={onUnkeepSelected}
          disabled={selectedCount === 0 || loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Remove kept status (will expire after 3 months)"
        >
          <BookmarkX className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Unkeep</span>
        </button>

        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg text-violet-200 hover:text-white hover:bg-white/20 transition-colors ml-1"
          title="Exit selection mode"
          aria-label="Exit selection mode"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
