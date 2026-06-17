-- ============================================================
-- 005_fix_profiles_student_read.sql
-- Allows students to read teacher and admin profiles so the
-- messaging contact list works correctly.
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Drop the old blanket policy
DROP POLICY IF EXISTS "profiles: own read" ON profiles;

-- Recreate with student access to teacher/admin profiles
CREATE POLICY "profiles: own read"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR is_admin()
    OR get_my_role() = 'teacher'
    OR (
      get_my_role() = 'student'
      AND role IN ('teacher', 'admin')
    )
  );
