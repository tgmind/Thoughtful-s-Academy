import { useState } from 'react'
import { Database, Copy, Check, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const MIGRATION_SQL = `-- ============================================================
-- 031_subject_chapters.sql
-- Introduce chapters table and study_cards chapter association
-- ============================================================

-- 1. Create chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  batch_id      UUID REFERENCES batches(id) ON DELETE CASCADE,
  subject       TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  display_order INTEGER DEFAULT 0,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chapters_batch_subject ON chapters(batch_id, subject);
CREATE INDEX IF NOT EXISTS idx_chapters_display_order ON chapters(display_order);

-- 2. Add chapter linkage to study_cards
ALTER TABLE study_cards
  ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chapter TEXT;

CREATE INDEX IF NOT EXISTS idx_study_cards_chapter_id ON study_cards(chapter_id);
CREATE INDEX IF NOT EXISTS idx_study_cards_chapter ON study_cards(chapter);

-- 3. Row Level Security Policies for chapters
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- Read accessible to public/landing visitors, enrolled students, teachers, and admins
DROP POLICY IF EXISTS "chapters: read accessible" ON chapters;
CREATE POLICY "chapters: read accessible"
  ON chapters FOR SELECT
  USING (
    is_admin()
    OR get_my_role() = 'teacher'
    OR (
      batch_id IS NULL
      OR EXISTS (
        SELECT 1 FROM student_profiles sp
        WHERE sp.id = auth.uid()
          AND (sp.batch_id = chapters.batch_id OR chapters.batch_id = ANY(sp.batch_ids))
      )
    )
    OR auth.role() = 'anon'
  );

-- Teachers and Admins can insert
DROP POLICY IF EXISTS "chapters: admin or permitted teacher insert" ON chapters;
CREATE POLICY "chapters: admin or permitted teacher insert"
  ON chapters FOR INSERT
  WITH CHECK (
    is_admin()
    OR teacher_can('study_cards')
    OR EXISTS (
      SELECT 1 FROM batches
      WHERE (teacher_id = auth.uid() OR auth.uid() = ANY(teacher_ids))
        AND is_active = true
        AND id = chapters.batch_id
    )
  );

-- Teachers and Admins can update
DROP POLICY IF EXISTS "chapters: admin or permitted teacher update" ON chapters;
CREATE POLICY "chapters: admin or permitted teacher update"
  ON chapters FOR UPDATE
  USING (
    is_admin()
    OR teacher_can('study_cards')
    OR EXISTS (
      SELECT 1 FROM batches
      WHERE (teacher_id = auth.uid() OR auth.uid() = ANY(teacher_ids))
        AND is_active = true
        AND id = chapters.batch_id
    )
  );

-- Teachers and Admins can delete
DROP POLICY IF EXISTS "chapters: admin or permitted teacher delete" ON chapters;
CREATE POLICY "chapters: admin or permitted teacher delete"
  ON chapters FOR DELETE
  USING (
    is_admin()
    OR teacher_can('study_cards')
    OR EXISTS (
      SELECT 1 FROM batches
      WHERE (teacher_id = auth.uid() OR auth.uid() = ANY(teacher_ids))
        AND is_active = true
        AND id = chapters.batch_id
    )
  );
`

export default function ChapterSchemaAlert({ isAdmin = false, onRetry }) {
  const [copied, setCopied] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const handleCopySql = () => {
    navigator.clipboard.writeText(MIGRATION_SQL).then(() => {
      setCopied(true)
      toast.success('Migration 031 SQL copied to clipboard! Paste it into Supabase SQL Editor.')
      setTimeout(() => setCopied(false), 3000)
    }).catch(() => {
      toast.error('Failed to copy SQL to clipboard')
    })
  }

  const handleRetry = async () => {
    if (!onRetry) return
    setRetrying(true)
    try {
      await onRetry()
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50/95 p-4 sm:p-5 shadow-xs text-amber-950 space-y-3 my-2 animate-in fade-in duration-200">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
          <Database className="h-5 w-5" />
        </div>
        <div className="space-y-1 min-w-0">
          <h3 className="font-extrabold text-sm sm:text-base text-amber-950 flex items-center gap-2">
            <span>Database Setup Required: Chapter Management</span>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
              Migration 031
            </span>
          </h3>
          <p className="text-xs sm:text-sm text-amber-800/90 leading-relaxed">
            {isAdmin ? (
              <>
                The <code className="bg-amber-100/90 px-1.5 py-0.5 rounded font-mono text-xs font-bold text-amber-950">public.chapters</code> table and associated columns have not been initialized in your Supabase database yet. Run migration <strong className="font-bold">031_subject_chapters.sql</strong> in your Supabase SQL Editor to enable persistent chapter organization, drag-and-drop ordering, and security policies.
              </>
            ) : (
              'The Chapter-based video lectures system is being initialized. You can still create and organize chapters in this temporary session while database tables are applied.'
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleCopySql}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-800 hover:bg-amber-900 active:scale-95 text-white shadow-xs transition-all cursor-pointer"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? 'SQL Copied to Clipboard!' : 'Copy Migration 031 SQL'}</span>
        </button>

        {onRetry && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-900 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} />
            <span>{retrying ? 'Checking...' : 'Check Database Connection'}</span>
          </button>
        )}
      </div>
    </div>
  )
}
