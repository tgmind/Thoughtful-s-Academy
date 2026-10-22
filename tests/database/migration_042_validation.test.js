import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

/**
 * Migration 042 Validation Suite
 * Verification of explicit Data API grants and automatic default privileges
 * for Supabase Oct 30 Data API Exposure changes.
 */

describe('Migration 042: Data API Grants & Default Privileges Validation', () => {
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations')
  const migration042Path = path.join(migrationsDir, '042_grant_data_api_access.sql')
  const migration042Sql = fs.readFileSync(migration042Path, 'utf8')
  const migrateScriptPath = path.resolve(process.cwd(), 'scripts/migrate.js')
  const migrateScriptContent = fs.readFileSync(migrateScriptPath, 'utf8')

  it('verifies migration 042 exists and is registered in scripts/migrate.js', () => {
    expect(fs.existsSync(migration042Path)).toBe(true)
    expect(migrateScriptContent).toContain('042_grant_data_api_access.sql')
  })

  describe('Explicit Table & Role Grants', () => {
    it('verifies explicit SELECT, INSERT, UPDATE, DELETE grants for authenticated role on public schema', () => {
      expect(migration042Sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;')
    })

    it('verifies explicit ALL grant for service_role on public schema', () => {
      expect(migration042Sql).toContain('GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;')
    })

    it('verifies public/anon grants for batches, chapters, study_cards, and qr_settings', () => {
      expect(migration042Sql).toContain('GRANT SELECT ON public.batches TO anon;')
      expect(migration042Sql).toContain('GRANT SELECT ON public.chapters TO anon;')
      expect(migration042Sql).toContain('GRANT SELECT ON public.study_cards TO anon;')
      expect(migration042Sql).toContain('GRANT SELECT ON public.qr_settings TO anon;')
    })

    it('verifies sequence and function execution privileges', () => {
      expect(migration042Sql).toContain('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;')
      expect(migration042Sql).toContain('GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;')
      expect(migration042Sql).toContain('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;')
    })
  })

  describe('Automatic Default Privileges for Future Tables', () => {
    it('verifies ALTER DEFAULT PRIVILEGES for current role on future tables, sequences, and functions', () => {
      expect(migration042Sql).toContain('ALTER DEFAULT PRIVILEGES IN SCHEMA public')
      expect(migration042Sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;')
      expect(migration042Sql).toContain('GRANT ALL ON TABLES TO service_role;')
    })

    it('verifies ALTER DEFAULT PRIVILEGES for role postgres to ensure automated migrations inherit grants', () => {
      expect(migration042Sql).toContain('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public')
      expect(migration042Sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;')
      expect(migration042Sql).toContain('GRANT ALL ON TABLES TO service_role;')
    })
  })
})
