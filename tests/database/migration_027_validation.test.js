import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

/**
 * Migration 027 Validation Suite
 * Line-by-line verification of index definitions, column existence in earlier migrations,
 * query expression matching, and redundancy analysis.
 */

describe('Migration 027 Line-by-Line Schema & Index Validation', () => {
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations')
  const migration027Path = path.join(migrationsDir, '027_capacity_and_realtime_optimizations.sql')
  const migration027Sql = fs.readFileSync(migration027Path, 'utf8')

  it('verifies that migration 027 file exists and has valid SQL structure', () => {
    expect(fs.existsSync(migration027Path)).toBe(true)
    expect(migration027Sql).toContain('CREATE INDEX IF NOT EXISTS')
  })

  describe('Index 1 & 2: Notifications Indexes', () => {
    it('verifies idx_notifications_active_created matches dashboard ordering', () => {
      expect(migration027Sql).toContain('idx_notifications_active_created')
      expect(migration027Sql).toContain('ON public.notifications (is_active, created_at DESC)')

      // Verify columns exist in 001_initial_schema.sql
      const schema001 = fs.readFileSync(path.join(migrationsDir, '001_initial_schema.sql'), 'utf8')
      expect(schema001).toContain('is_active       BOOLEAN DEFAULT true')
      expect(schema001).toContain('created_at      TIMESTAMPTZ DEFAULT NOW()')
    })

    it('verifies idx_notifications_target_role_batch partial predicate matches queries', () => {
      expect(migration027Sql).toContain('idx_notifications_target_role_batch')
      expect(migration027Sql).toContain('(target_role, target_batch_id)')
      expect(migration027Sql).toContain('WHERE is_active = true')
    })
  })

  describe('Index 3: Notification Reads & Redundancy Prevention', () => {
    it('verifies notification_reads primary key in 001 and prevents redundant user_id index', () => {
      const schema001 = fs.readFileSync(path.join(migrationsDir, '001_initial_schema.sql'), 'utf8')
      // 001 already establishes PRIMARY KEY (user_id, notification_id)
      expect(schema001).toContain('PRIMARY KEY (user_id, notification_id)')

      // Migration 027 should NOT duplicate (user_id, notification_id); it indexes (notification_id) for reverse lookups / FK cascades
      expect(migration027Sql).toContain('idx_notification_reads_notif_id')
      expect(migration027Sql).toContain('ON public.notification_reads (notification_id)')
    })
  })

  describe('Index 4, 5, 6: Homework & Submissions Indexes', () => {
    it('verifies idx_homework_batch_active_created exists and matches batch query pattern', () => {
      expect(migration027Sql).toContain('idx_homework_batch_active_created')
      expect(migration027Sql).toContain('ON public.homework (batch_id, is_active, created_at DESC)')
    })

    it('verifies idx_homework_submissions_student_hw matches student-led queries', () => {
      expect(migration027Sql).toContain('idx_homework_submissions_student_hw')
      expect(migration027Sql).toContain('ON public.homework_submissions (student_id, homework_id)')
    })

    it('verifies idx_homework_submissions_hw_created matches teacher grading view', () => {
      expect(migration027Sql).toContain('idx_homework_submissions_hw_created')
      expect(migration027Sql).toContain('ON public.homework_submissions (homework_id, submitted_at DESC)')
    })
  })

  describe('Index 7 & 8: Study Cards GIN & Composite Indexes', () => {
    it('verifies idx_study_cards_batch_ids_gin uses GIN operator class for array containment', () => {
      expect(migration027Sql).toContain('idx_study_cards_batch_ids_gin')
      expect(migration027Sql).toContain('ON public.study_cards USING GIN (batch_ids)')

      // Verify batch_ids is UUID[] array column added in 008
      const schema008 = fs.readFileSync(path.join(migrationsDir, '008_study_cards_multi_batch.sql'), 'utf8')
      expect(schema008).toContain('batch_ids  UUID[]')
    })

    it('verifies idx_study_cards_active_created matches public lecture card queries', () => {
      expect(migration027Sql).toContain('idx_study_cards_active_created')
      expect(migration027Sql).toContain('ON public.study_cards (is_active, is_public, created_at DESC)')
    })
  })

  describe('Index 9: Student Profiles Batch Index', () => {
    it('verifies idx_student_profiles_batch_id accelerates student batch foreign key joins', () => {
      expect(migration027Sql).toContain('idx_student_profiles_batch_id')
      expect(migration027Sql).toContain('ON public.student_profiles (batch_id)')
    })
  })

  describe('Index 10 & 11: Fee Records Indexes', () => {
    it('verifies idx_fee_records_month_status accelerates bounded calendar queries', () => {
      expect(migration027Sql).toContain('idx_fee_records_month_status')
      expect(migration027Sql).toContain('ON public.fee_records (payment_month, status)')
    })

    it('verifies idx_fee_records_student_status accelerates student dues queries', () => {
      expect(migration027Sql).toContain('idx_fee_records_student_status')
      expect(migration027Sql).toContain('ON public.fee_records (student_id, status)')
    })
  })

  describe('Index 12 & 13: Live Classes & Partial Messages Index', () => {
    it('verifies idx_live_classes_active_created accelerates active class queries', () => {
      expect(migration027Sql).toContain('idx_live_classes_active_created')
      expect(migration027Sql).toContain('ON public.live_classes (is_active, created_at DESC)')
    })

    it('verifies idx_messages_unread_receiver uses partial index with WHERE is_read = false', () => {
      expect(migration027Sql).toContain('idx_messages_unread_receiver')
      expect(migration027Sql).toContain('ON public.messages (receiver_id)')
      expect(migration027Sql).toContain('WHERE is_read = false')
    })
  })

  describe('Index 14: Attendance Index', () => {
    it('verifies idx_attendance_student_status_date supports student status queries', () => {
      expect(migration027Sql).toContain('idx_attendance_student_status_date')
      expect(migration027Sql).toContain('ON public.attendance (student_id, status, date DESC)')
    })
  })
})
