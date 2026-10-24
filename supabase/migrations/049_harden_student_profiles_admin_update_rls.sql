-- Migration 049: Harden student_profiles UPDATE policy for Admins and Students
-- Ensures both USING and WITH CHECK explicitly permit admin updates and upserts.

DROP POLICY IF EXISTS "student_profiles: own update" ON public.student_profiles;
DROP POLICY IF EXISTS "student_profiles: own or admin update" ON public.student_profiles;

CREATE POLICY "student_profiles: own or admin update"
  ON public.student_profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin())
  WITH CHECK (auth.uid() = id OR is_admin());
