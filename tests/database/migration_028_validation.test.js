import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

/**
 * Migration 028 Validation Suite
 * Forensic verification of doubts table, columns, indexes, RLS policies, and realtime publication.
 */

describe('Migration 028: Doubt Resolution Hub Schema Validation', () => {
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations')
  const migration028Path = path.join(migrationsDir, '028_doubt_resolution_hub.sql')
  const migration028Sql = fs.readFileSync(migration028Path, 'utf8')

  it('verifies that migration 028 file exists and contains CREATE TABLE public.doubts', () => {
    expect(fs.existsSync(migration028Path)).toBe(true)
    expect(migration028Sql).toContain('CREATE TABLE IF NOT EXISTS public.doubts')
  })

  describe('Table Columns & Data Integrity', () => {
    it('verifies primary key and foreign key references', () => {
      expect(migration028Sql).toContain('id UUID PRIMARY KEY DEFAULT gen_random_uuid()')
      expect(migration028Sql).toContain('student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE')
      expect(migration028Sql).toContain('batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL')
      expect(migration028Sql).toContain('study_card_id UUID REFERENCES public.study_cards(id) ON DELETE SET NULL')
      expect(migration028Sql).toContain('addressed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL')
    })

    it('verifies snapshot fields for stable historical queries', () => {
      expect(migration028Sql).toContain('student_name TEXT NOT NULL')
      expect(migration028Sql).toContain('roll_number TEXT')
      expect(migration028Sql).toContain('batch_name TEXT')
      expect(migration028Sql).toContain('subject TEXT NOT NULL')
      expect(migration028Sql).toContain('lecture_title TEXT NOT NULL')
      expect(migration028Sql).toContain('video_url TEXT')
      expect(migration028Sql).toContain('timestamp_seconds INTEGER NOT NULL DEFAULT 0')
      expect(migration028Sql).toContain('question TEXT NOT NULL')
      expect(migration028Sql).toContain("status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'addressed'))")
      expect(migration028Sql).toContain('addressed_by_name TEXT')
      expect(migration028Sql).toContain('addressed_at TIMESTAMPTZ')
      expect(migration028Sql).toContain('created_at TIMESTAMPTZ DEFAULT NOW()')
      expect(migration028Sql).toContain('updated_at TIMESTAMPTZ DEFAULT NOW()')
    })
  })

  describe('Performance Indexing', () => {
    it('verifies all required indexes exist for sub-millisecond query paths', () => {
      expect(migration028Sql).toContain('CREATE INDEX IF NOT EXISTS idx_doubts_student_status')
      expect(migration028Sql).toContain('(student_id, status)')

      expect(migration028Sql).toContain('CREATE INDEX IF NOT EXISTS idx_doubts_batch_status')
      expect(migration028Sql).toContain('(batch_id, status)')

      expect(migration028Sql).toContain('CREATE INDEX IF NOT EXISTS idx_doubts_subject_status')
      expect(migration028Sql).toContain('(subject, status)')

      expect(migration028Sql).toContain('CREATE INDEX IF NOT EXISTS idx_doubts_status_created')
      expect(migration028Sql).toContain('(status, created_at DESC)')

      expect(migration028Sql).toContain('CREATE INDEX IF NOT EXISTS idx_doubts_study_card_id')
      expect(migration028Sql).toContain('(study_card_id)')

      expect(migration028Sql).toContain('CREATE INDEX IF NOT EXISTS idx_doubts_created_at')
      expect(migration028Sql).toContain('(created_at DESC)')
    })
  })

  describe('Row-Level Security (RLS) Enforcement', () => {
    it('verifies RLS is enabled on public.doubts', () => {
      expect(migration028Sql).toContain('ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;')
    })

    it('verifies student RLS policies (select own, insert own, delete own for self-study)', () => {
      expect(migration028Sql).toContain('CREATE POLICY "doubts: student select own"')
      expect(migration028Sql).toContain('USING (auth.uid() = student_id)')

      expect(migration028Sql).toContain('CREATE POLICY "doubts: student insert own"')
      expect(migration028Sql).toContain('auth.uid() = student_id')
      expect(migration028Sql).toContain("status = 'pending'")

      expect(migration028Sql).toContain('CREATE POLICY "doubts: student delete own"')
      expect(migration028Sql).toContain('USING (auth.uid() = student_id)')
    })

    it('verifies teacher RLS policies for assigned batches & subjects and address mutation', () => {
      expect(migration028Sql).toContain('CREATE POLICY "doubts: teacher select assigned"')
      expect(migration028Sql).toContain("get_my_role() = 'teacher'")
      expect(migration028Sql).toContain('CREATE POLICY "doubts: teacher update addressed"')
      expect(migration028Sql).toContain("status = 'addressed'")
      expect(migration028Sql).toContain('addressed_by = auth.uid()')
    })

    it('verifies admin full access policies', () => {
      expect(migration028Sql).toContain('CREATE POLICY "doubts: admin select all"')
      expect(migration028Sql).toContain('USING (is_admin())')
      expect(migration028Sql).toContain('CREATE POLICY "doubts: admin update all"')
      expect(migration028Sql).toContain('CREATE POLICY "doubts: admin delete all"')
    })
  })

  describe('Authoritative Triggers & Immutability Hardening', () => {
    it('verifies trg_doubts_insert_integrity enforces student identity and batch assignment', () => {
      expect(migration028Sql).toContain('CREATE TRIGGER trg_doubts_insert_integrity')
      expect(migration028Sql).toContain('enforce_doubt_insert_integrity()')
      expect(migration028Sql).toContain('SECURITY DEFINER')
      expect(migration028Sql).toContain('SET search_path = public, pg_temp')
    })

    it('verifies trg_doubts_mutation_rules enforces column-level immutability and valid lifecycle transitions', () => {
      expect(migration028Sql).toContain('CREATE TRIGGER trg_doubts_mutation_rules')
      expect(migration028Sql).toContain('enforce_doubt_mutation_rules()')
      expect(migration028Sql).toContain('Immutable doubt fields (student identity, lecture, question, timestamp, batch) cannot be modified.')
    })

    it('verifies table grants for authenticated role', () => {
      expect(migration028Sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.doubts TO authenticated;')
    })
  })

  describe('Realtime Publication', () => {
    it('verifies publication addition to supabase_realtime', () => {
      expect(migration028Sql).toContain("pubname = 'supabase_realtime' AND tablename = 'doubts'")
      expect(migration028Sql).toContain('ALTER PUBLICATION supabase_realtime ADD TABLE public.doubts;')
    })
  })
})
