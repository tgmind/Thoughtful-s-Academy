import { useState } from 'react'
import { Database, Copy, Check, RefreshCw, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DoubtSchemaAlert({ isAdmin = false, onRetry }) {
  const [copied, setCopied] = useState(false)

  const handleCopySqlLocation = () => {
    const text = `supabase/migrations/028_doubt_resolution_hub.sql`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      toast.success('Migration file path copied to clipboard!')
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="rounded-3xl border border-amber-300 bg-amber-50/90 p-5 sm:p-6 shadow-xs text-amber-950 space-y-3.5 my-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
          <Database className="h-5 w-5" />
        </div>
        <div className="space-y-1 min-w-0">
          <h3 className="font-extrabold text-sm sm:text-base text-amber-950">
            {isAdmin
              ? 'Database Migration Required: 028_doubt_resolution_hub.sql'
              : 'Doubt Hub System Maintenance'}
          </h3>
          <p className="text-xs sm:text-sm text-amber-800/90 leading-relaxed">
            {isAdmin ? (
              <>
                The dedicated <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono text-xs font-bold text-amber-900">public.doubts</code> table has not been created in your Supabase database yet. Please run migration{' '}
                <strong className="font-bold">028_doubt_resolution_hub.sql</strong> in your Supabase SQL Editor to enable shared persistence, RLS, and realtime synchronization.
              </>
            ) : (
              'The Doubt Resolution system database is being initialized by your academy administrator. Please check back in a few moments.'
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2.5 pt-1">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-800 hover:bg-amber-900 active:scale-95 text-white shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Check Database Connection</span>
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={handleCopySqlLocation}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-900 active:scale-95 transition-all cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Path Copied!' : 'Copy Migration 028 Path'}</span>
          </button>
        )}
      </div>
    </div>
  )
}
