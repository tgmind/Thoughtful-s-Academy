import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

/**
 * Migration 048 Validation Suite
 * Verification of student_profiles admin insert RLS policy:
 * - Drops legacy restrictive student_profiles: own insert
 * - Creates student_profiles: own or admin insert with check (auth.uid() = id OR is_admin())
 */

describe('Migration 048: Student Profiles Admin Insert RLS Validation', () => {
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations')
  const migration048Path = path.join(migrationsDir, '048_fix_student_profiles_admin_insert_rls.sql')
  const migration048Sql = fs.readFileSync(migration048Path, 'utf8')
  const migrateScriptPath = path.resolve(process.cwd(), 'scripts/migrate.js')
  const migrateScriptContent = fs.readFileSync(migrateScriptPath, 'utf8')

  it('verifies migration 048 exists and is registered in scripts/migrate.js', () => {
    expect(fs.existsSync(migration048Path)).toBe(true)
    expect(migrateScriptContent).toContain('048_fix_student_profiles_admin_insert_rls.sql')
  })

  describe('student_profiles INSERT RLS Policy', () => {
    it('drops legacy restrictive own insert policy', () => {
      expect(migration048Sql).toContain('DROP POLICY IF EXISTS "student_profiles: own insert"')
    })

    it('creates own or admin insert policy permitting admin insert/upsert', () => {
      expect(migration048Sql).toContain('CREATE POLICY "student_profiles: own or admin insert"')
      expect(migration048Sql).toContain('ON public.student_profiles FOR INSERT')
      expect(migration048Sql).toContain('auth.uid() = id OR is_admin()')
    })
  })
})
