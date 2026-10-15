import { useState } from 'react'
import { Database, Copy, Check, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const MIGRATION_SQL = `-- ============================================================
-- 032_realtime_and_messaging_hardening.sql
-- Run in Supabase SQL Editor to enable batch broadcasts & realtime
-- ============================================================

-- 1. Ensure columns exist on public.messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_broadcast BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_messages_broadcast
  ON public.messages(batch_id, is_broadcast, created_at)
  WHERE is_broadcast = true;

CREATE INDEX IF NOT EXISTS idx_messages_unread_pair
  ON public.messages(receiver_id, sender_id)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_messages_direct_filter
  ON public.messages(sender_id, receiver_id, is_broadcast, created_at);

-- 2. Safely register all essential realtime tables in supabase_realtime publication
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'messages',
    'notifications',
    'notification_reads',
    'doubts',
    'live_classes',
    'homework',
    'homework_submissions',
    'fee_records'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      END IF;
    END IF;
  END LOOP;
END $$;

-- 3. Enable REPLICA IDENTITY FULL for tables with RLS and realtime row-level filtering
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    ALTER TABLE public.messages REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    ALTER TABLE public.notifications REPLICA IDENTITY FULL;
  END IF;
END $$;
`

export default function MessagesSchemaAlert({ onRetry }) {
  const [copied, setCopied] = useState(false)
  const [checking, setChecking] = useState(false)
  const [showSql, setShowSql] = useState(false)

  const copySql = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(MIGRATION_SQL)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = MIGRATION_SQL
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      toast.success('Migration SQL copied to clipboard!')
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast.error('Could not copy directly to clipboard')
    }
  }

  const handleCheck = async () => {
    setChecking(true)
    if (onRetry) {
      await onRetry()
    }
    setTimeout(() => setChecking(false), 800)
  }

  return (
    <div className="mx-2 my-3 sm:mx-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 shadow-sm backdrop-blur-xs animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 shrink-0 mt-0.5 sm:mt-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Database Setup Required for Batch Broadcasts</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/60 font-semibold">
                Migration 032 / 030
              </span>
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Direct messaging continues to operate normally with automatic backward compatibility. To enable batch broadcast announcements and live realtime sync, execute this migration in your Supabase SQL editor.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={copySql}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-700 active:scale-95 shadow-sm transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied SQL!' : 'Copy Migration SQL'}</span>
          </button>

          <button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:scale-95 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Check if database columns are ready"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-amber-600' : ''}`} />
            <span className="hidden sm:inline">Check Connection</span>
          </button>
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-amber-500/15 flex items-center justify-between text-[11px] text-slate-500">
        <span>Go to <strong>Supabase Dashboard &rarr; SQL Editor</strong> &rarr; Paste and Run</span>
        <button
          type="button"
          onClick={() => setShowSql(!showSql)}
          className="text-amber-800 hover:text-amber-950 font-medium underline underline-offset-2 cursor-pointer"
        >
          {showSql ? 'Hide SQL Code' : 'View SQL Snippet'}
        </button>
      </div>

      {showSql && (
        <div className="mt-2 relative">
          <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
            {MIGRATION_SQL}
          </pre>
        </div>
      )}
    </div>
  )
}
