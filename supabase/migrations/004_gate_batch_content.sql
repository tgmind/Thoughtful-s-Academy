-- ============================================================
-- 004_gate_batch_content.sql
-- Gates batch/role-specific content behind login + enrollment.
--
-- STUDY CARDS:
--   batch_id = NULL → public (shown on homepage, no login needed)
--   batch_id = X    → enrolled students in that batch only
--
-- NOTIFICATIONS:
--   target_role='all', target_batch_id=NULL → public (homepage)
--   target_role='student'                   → logged-in students
--   target_role='teacher'                   → logged-in teachers
--   target_batch_id = X                     → students in that batch
--
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Drop existing catch-all read policy
DROP POLICY IF EXISTS "study_cards: all read active"      ON study_cards;
DROP POLICY IF EXISTS "study_cards: public read"          ON study_cards;
DROP POLICY IF EXISTS "study_cards: enrolled read"        ON study_cards;
DROP POLICY IF EXISTS "study_cards: admin read all"       ON study_cards;

-- 1. Public cards (no batch) — visible to everyone, including
--    unauthenticated visitors on the homepage.
CREATE POLICY "study_cards: public read"
  ON study_cards FOR SELECT
  USING (is_active = true AND batch_id IS NULL);

-- 2. Batch-specific cards — visible only to enrolled students,
--    teachers, and admins.
CREATE POLICY "study_cards: enrolled read"
  ON study_cards FOR SELECT
  USING (
    is_active = true
    AND batch_id IS NOT NULL
    AND (
      is_admin()
      OR get_my_role() = 'teacher'
      OR EXISTS (
        SELECT 1 FROM student_profiles sp
        WHERE sp.id = auth.uid()
          AND sp.batch_id = study_cards.batch_id
      )
    )
  );

-- 3. Admins can see ALL cards (including inactive) for management.
CREATE POLICY "study_cards: admin read all"
  ON study_cards FOR SELECT
  USING (is_admin());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

DROP POLICY IF EXISTS "notifications: all read active"  ON notifications;
DROP POLICY IF EXISTS "notifications: public read"      ON notifications;
DROP POLICY IF EXISTS "notifications: student read"     ON notifications;
DROP POLICY IF EXISTS "notifications: teacher read"     ON notifications;

-- Helper expression used in every notification policy
-- (active, not future-scheduled, not expired)
-- We inline it since SQL functions can't be used in USING expressions
-- with dynamic table columns easily.

-- 1. Truly public announcements — visible on homepage, no login.
--    Must target 'all' roles AND have no batch restriction.
CREATE POLICY "notifications: public read"
  ON notifications FOR SELECT
  USING (
    is_active = true
    AND target_role = 'all'
    AND target_batch_id IS NULL
    AND (scheduled_at IS NULL OR scheduled_at <= NOW())
    AND (expires_at   IS NULL OR expires_at   >= NOW())
  );

-- 2. Student-targeted notifications — logged-in students only.
--    Respects batch targeting: if target_batch_id is set, only
--    students enrolled in that batch see it.
CREATE POLICY "notifications: student read"
  ON notifications FOR SELECT
  USING (
    is_active = true
    AND get_my_role() = 'student'
    AND target_role IN ('student', 'all')
    AND (
      target_batch_id IS NULL
      OR target_batch_id IN (
        SELECT batch_id FROM student_profiles WHERE id = auth.uid()
      )
    )
    AND (scheduled_at IS NULL OR scheduled_at <= NOW())
    AND (expires_at   IS NULL OR expires_at   >= NOW())
  );

-- 3. Teacher-targeted notifications — logged-in teachers only.
CREATE POLICY "notifications: teacher read"
  ON notifications FOR SELECT
  USING (
    is_active = true
    AND get_my_role() = 'teacher'
    AND target_role IN ('teacher', 'all')
    AND (scheduled_at IS NULL OR scheduled_at <= NOW())
    AND (expires_at   IS NULL OR expires_at   >= NOW())
  );
