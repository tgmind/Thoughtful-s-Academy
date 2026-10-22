import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

/**
 * Migration 044 Validation Suite
 * Verification of homework visibility and RLS hardening:
 * - SELECT policy allows admin and teacher to read both active and inactive homework
 * - UPDATE policy allows admin and batch-assigned teachers to update
 * - DELETE policy allows admin and batch-assigned teachers to delete
 */

describe('Migration 044: Homework Visibility & RLS Hardening Validation', () => {
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations')
  const migration044Path = path.join(migrationsDir, '044_homework_visibility_and_rls.sql')
  const migration044Sql = fs.readFileSync(migration044Path, 'utf8')
  const migrateScriptPath = path.resolve(process.cwd(), 'scripts/migrate.js')
  const migrateScriptContent = fs.readFileSync(migrateScriptPath, 'utf8')

  it('verifies migration 044 exists and is registered in scripts/migrate.js', () => {
    expect(fs.existsSync(migration044Path)).toBe(true)
    expect(migrateScriptContent).toContain('044_homework_visibility_and_rls.sql')
  })

  describe('Homework Visibility & SELECT RLS', () => {
    it('drops legacy restrictive homework: all read active policy', () => {
      expect(migration044Sql).toContain('DROP POLICY IF EXISTS "homework: all read active" ON public.homework;')
    })

    it('creates homework: select accessible policy permitting admin and teacher regardless of is_active', () => {
      expect(migration044Sql).toContain('CREATE POLICY "homework: select accessible"')
      expect(migration044Sql).toContain('ON public.homework FOR SELECT')
      expect(migration044Sql).toContain('is_admin()')
      expect(migration044Sql).toContain("get_my_role() = 'teacher'")
      expect(migration044Sql).toContain('is_active = true')
    })
  })

  describe('Homework UPDATE & DELETE Policies', () => {
    it('hardens UPDATE policy to allow admin and batch-assigned teachers', () => {
      expect(migration044Sql).toContain('CREATE POLICY "homework: admin or own teacher update"')
      expect(migration044Sql).toContain('ON public.homework FOR UPDATE')
      expect(migration044Sql).toContain("public.teacher_can('homework')")
      expect(migration044Sql).toContain('b.teacher_id = auth.uid() OR auth.uid() = ANY(b.teacher_ids)')
    })

    it('hardens DELETE policy for batch-assigned teachers', () => {
      expect(migration044Sql).toContain('CREATE POLICY "homework: teacher delete own"')
      expect(migration044Sql).toContain('ON public.homework FOR DELETE')
    })
  })
})
