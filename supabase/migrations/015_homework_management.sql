-- ============================================================
-- 015_homework_management.sql
--
-- Completes the homework feature. The tables, the student read/
-- submit flow, and the INSERT + admin-DELETE policies already
-- existed, but three pieces were missing, so homework was never
-- usable end to end:
--   1. Teachers couldn't EDIT or DEACTIVATE their own homework
--      (no UPDATE policy existed at all).
--   2. Teachers couldn't DELETE their own homework (only admins).
--   3. Nobody could GRADE submissions (no UPDATE policy on
--      homework_submissions) — so the grade/feedback a student
--      sees could never be written.
--
-- This migration adds those policies and enables realtime on
-- homework so students see newly-assigned work instantly.
--
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Teachers update their own homework; admins update any.
DROP POLICY IF EXISTS "homework: admin or own teacher update" ON homework;
CREATE POLICY "homework: admin or own teacher update"
  ON homework FOR UPDATE
  USING      (is_admin() OR (get_my_role() = 'teacher' AND teacher_id = auth.uid()))
  WITH CHECK (is_admin() OR (get_my_role() = 'teacher' AND teacher_id = auth.uid()));

-- 2. Teachers delete their own homework (admin DELETE already
--    exists from migration 009).
DROP POLICY IF EXISTS "homework: teacher delete own" ON homework;
CREATE POLICY "homework: teacher delete own"
  ON homework FOR DELETE
  USING (get_my_role() = 'teacher' AND teacher_id = auth.uid());

-- 3. Teachers and admins can grade submissions (set grade/feedback).
--    Students keep INSERT-only via the existing policy; this adds
--    UPDATE for staff. SELECT is already allowed for teacher/admin.
DROP POLICY IF EXISTS "submissions: teacher or admin grade" ON homework_submissions;
CREATE POLICY "submissions: teacher or admin grade"
  ON homework_submissions FOR UPDATE
  USING      (is_admin() OR get_my_role() = 'teacher')
  WITH CHECK (is_admin() OR get_my_role() = 'teacher');

-- 4. Deliver homework + submission changes over realtime so a
--    student's Study page shows new assignments instantly and
--    reflects a grade/feedback the moment the teacher saves it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'homework'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE homework;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'homework_submissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE homework_submissions;
  END IF;
END $$;
