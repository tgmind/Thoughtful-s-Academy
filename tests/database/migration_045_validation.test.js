import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

/**
 * Migration 045 Validation Suite
 * Verification of REPLICA IDENTITY FULL on public.homework
 */

describe('Migration 045: Homework Realtime Replica Identity Validation', () => {
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations')
  const migration045Path = path.join(migrationsDir, '045_homework_realtime_replica_identity.sql')
  const migration045Sql = fs.readFileSync(migration045Path, 'utf8')
  const migrateScriptPath = path.resolve(process.cwd(), 'scripts/migrate.js')
  const migrateScriptContent = fs.readFileSync(migrateScriptPath, 'utf8')

  it('verifies migration 045 exists and is registered in scripts/migrate.js', () => {
    expect(fs.existsSync(migration045Path)).toBe(true)
    expect(migrateScriptContent).toContain('045_homework_realtime_replica_identity.sql')
  })

  it('verifies ALTER TABLE public.homework REPLICA IDENTITY FULL', () => {
    expect(migration045Sql).toContain('ALTER TABLE public.homework REPLICA IDENTITY FULL;')
  })
})
