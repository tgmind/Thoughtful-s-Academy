import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Clock, PlusCircle, Edit3, Trash2, Eye, EyeOff, ShieldCheck, UserCheck, RefreshCw, Filter } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function ActivityLogModal({ batchId, batchName, onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState('all')

  const fetchLogs = useCallback(async () => {
    if (!batchId) return
    setLoading(true)
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('batch_id', batchId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setLogs(data)
      } else {
        setLogs([])
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err)
    } finally {
      setLoading(false)
    }
  }, [batchId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const filteredLogs = logs.filter(log => {
    if (filterAction === 'all') return true
    if (filterAction === 'create') return log.action_type === 'create'
    if (filterAction === 'update') return log.action_type === 'update'
    if (filterAction === 'delete') return log.action_type === 'delete'
    if (filterAction === 'visibility') return log.action_type === 'toggle_visibility'
    return true
  })

  const formatTime = (isoStr) => {
    if (!isoStr) return ''
    const date = new Date(isoStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatExactDate = (isoStr) => {
    if (!isoStr) return ''
    const date = new Date(isoStr)
    return date.toLocaleString([], {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActionBadge = (actionType, details) => {
    if (actionType === 'create') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          <PlusCircle className="h-3 w-3 shrink-0" /> Added Card
        </span>
      )
    }
    if (actionType === 'update') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
          <Edit3 className="h-3 w-3 shrink-0" /> Modified Card
        </span>
      )
    }
    if (actionType === 'delete') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
          <Trash2 className="h-3 w-3 shrink-0" /> Deleted Card
        </span>
      )
    }
    if (actionType === 'toggle_visibility') {
      const isHidden = details?.toLowerCase().includes('hidden')
      return isHidden ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
          <EyeOff className="h-3 w-3 shrink-0" /> Card Hidden
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
          <Eye className="h-3 w-3 shrink-0" /> Card Published
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
        {actionType}
      </span>
    )
  }

  const modalJSX = (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-fade-in"
    >
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90dvh] border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Batch Activity Log</h3>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                  Recent 24h
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate max-w-xs sm:max-w-md">
                Audit trail for <span className="font-bold text-slate-700">{batchName || 'Batch'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              title="Refresh logs"
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Action Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
            <Filter className="h-3 w-3" /> Filter:
          </span>
          {[
            { id: 'all', label: `All (${logs.length})` },
            { id: 'create', label: 'Added' },
            { id: 'update', label: 'Modified' },
            { id: 'visibility', label: 'Visibility' },
            { id: 'delete', label: 'Deleted' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterAction(f.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterAction === f.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Log List */}
        <div className="p-6 space-y-3 overflow-y-auto flex-1 bg-slate-50/50">
          {loading ? (
            <div className="py-16 text-center space-y-2">
              <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Fetching 24-hour activity audit trail…</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 p-6 space-y-2">
              <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Clock className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">No activity recorded in the last 24 hours</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                All changes, card additions, edits, visibility toggles, and deletions in this batch will be automatically audited here.
              </p>
            </div>
          ) : (
            filteredLogs.map(log => {
              const isAdminDoer = log.user_role === 'admin'
              const initials = (log.user_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

              return (
                <div
                  key={log.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition-all flex items-start gap-3.5 group"
                >
                  {/* Doer Avatar */}
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs ${
                    isAdminDoer
                      ? 'bg-purple-600 text-white ring-2 ring-purple-100'
                      : 'bg-blue-600 text-white ring-2 ring-blue-100'
                  }`}>
                    {initials}
                  </div>

                  {/* Main Event Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {log.user_name}
                        </span>
                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          isAdminDoer
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {isAdminDoer ? <ShieldCheck className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                          {isAdminDoer ? 'Admin' : 'Teacher'}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400 shrink-0" title={formatExactDate(log.created_at)}>
                        {formatTime(log.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      {getActionBadge(log.action_type, log.details)}
                      <span className="font-bold text-xs text-slate-800 truncate max-w-full">
                        {log.entity_title}
                      </span>
                    </div>

                    {log.details && (
                      <p className="text-xs text-slate-500 font-normal line-clamp-2 pt-0.5">
                        {log.details}
                      </p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Authorized Admin & Assigned Teacher View
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalJSX, document.body)
}
