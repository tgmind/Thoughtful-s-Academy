-- Migration 048: Fix student_profiles RLS to permit Admins to Insert and Upsert
-- Resolves "new row violates row-level security policy for table student_profiles" when an administrator edits student enrollment.

DROP POLICY IF EXISTS "student_profiles: own insert" ON public.student_profiles;
DROP POLICY IF EXISTS "student_profiles: own or admin insert" ON public.student_profiles;

CREATE POLICY "student_profiles: own or admin insert"
  ON public.student_profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR is_admin());
