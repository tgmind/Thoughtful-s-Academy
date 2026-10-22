import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

/**
 * Migration 043 Validation Suite
 * Verification of unified homework completion system schema refactoring:
 * - drive_link nullable and default null
-- student delete policy for undo
-- student insert policy with batch and self-grading protection
-- replica identity full on homework_submissions
 */

describe('Migration 043: Homework Completion System Validation', () => {
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations')
  const migration043Path = path.join(migrationsDir, '043_homework_completion_system.sql')
  const migration043Sql = fs.readFileSync(migration043Path, 'utf8')
  const migrateScriptPath = path.resolve(process.cwd(), 'scripts/migrate.js')
  const migrateScriptContent = fs.readFileSync(migrateScriptPath, 'utf8')

  it('verifies migration 043 exists and is registered in scripts/migrate.js', () => {
    expect(fs.existsSync(migration043Path)).toBe(true)
    expect(migrateScriptContent).toContain('043_homework_completion_system.sql')
  })

  describe('In-Place Schema Refactoring', () => {
    it('verifies drive_link DROP NOT NULL and SET DEFAULT NULL', () => {
      expect(migration043Sql).toContain('ALTER COLUMN drive_link DROP NOT NULL')
      expect(migration043Sql).toContain('ALTER COLUMN drive_link SET DEFAULT NULL')
    })

    it('verifies student DELETE policy for Undo action', () => {
      expect(migration043Sql).toContain('DROP POLICY IF EXISTS "submissions: student delete own" ON public.homework_submissions;')
      expect(migration043Sql).toContain('CREATE POLICY "submissions: student delete own"')
      expect(migration043Sql).toContain('ON public.homework_submissions FOR DELETE')
      expect(migration043Sql).toContain('USING (auth.uid() = student_id);')
    })

    it('verifies hardened student INSERT policy with fee gate and self-grade protection', () => {
      expect(migration043Sql).toContain('DROP POLICY IF EXISTS "submissions: student insert" ON public.homework_submissions;')
      expect(migration043Sql).toContain('CREATE POLICY "submissions: student insert"')
      expect(migration043Sql).toContain('(auth.uid() = student_id)')
      expect(migration043Sql).toContain('(grade IS NULL)')
      expect(migration043Sql).toContain('(feedback IS NULL)')
      expect(migration043Sql).toContain('public.is_batch_access_active(auth.uid(), h.batch_id)')
    })

    it('verifies composite indexes and REPLICA IDENTITY FULL', () => {
      expect(migration043Sql).toContain('idx_homework_submissions_student_hw')
      expect(migration043Sql).toContain('idx_homework_submissions_hw_created')
      expect(migration043Sql).toContain('ALTER TABLE public.homework_submissions REPLICA IDENTITY FULL;')
    })
  })
})
