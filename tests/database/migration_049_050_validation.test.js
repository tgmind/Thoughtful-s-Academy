import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Database Migrations 049 & 050 Validation', () => {
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations')

  it('migration 049 exists and hardens student_profiles UPDATE policy with WITH CHECK', () => {
    const file049 = path.join(migrationsDir, '049_harden_student_profiles_admin_update_rls.sql')
    expect(fs.existsSync(file049)).toBe(true)

    const sql = fs.readFileSync(file049, 'utf8')
    expect(sql).toContain('DROP POLICY IF EXISTS "student_profiles: own update"')
    expect(sql).toContain('CREATE POLICY "student_profiles: own or admin update"')
    expect(sql).toContain('FOR UPDATE')
    expect(sql).toContain('USING (auth.uid() = id OR is_admin())')
    expect(sql).toContain('WITH CHECK (auth.uid() = id OR is_admin())')
  })

  it('migration 050 exists and defines sync_batch_subjects RPC function', () => {
    const file050 = path.join(migrationsDir, '050_sync_batch_subjects_rpc.sql')
    expect(fs.existsSync(file050)).toBe(true)

    const sql = fs.readFileSync(file050, 'utf8')
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.sync_batch_subjects')
    expect(sql).toContain('p_batch_id UUID')
    expect(sql).toContain('p_new_subjects TEXT[]')
    expect(sql).toContain('p_student_ids UUID[] DEFAULT NULL')
    expect(sql).toContain('RETURNS JSONB')
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('is_admin()')
    expect(sql).toContain('COALESCE(subjects, ARRAY[]::TEXT[]) || p_new_subjects')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.sync_batch_subjects')
  })

  it('scripts/migrate.js includes migration 049 and 050 in automated pipeline', () => {
    const migrateJs = fs.readFileSync(path.resolve(process.cwd(), 'scripts/migrate.js'), 'utf8')
    expect(migrateJs).toContain('049_harden_student_profiles_admin_update_rls.sql')
    expect(migrateJs).toContain('050_sync_batch_subjects_rpc.sql')
  })
})
