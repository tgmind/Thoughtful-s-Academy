-- ==============================================================================
-- Migration 044: Homework Visibility & RLS Hardening
--
-- Fixes RLS violation ("new row violates row-level security policy for table 'homework'")
-- when teachers or administrators toggle homework visibility (is_active) or update
-- homework details.
--
-- Root Cause:
-- The previous SELECT policy ("homework: all read active" in migration 035) placed
-- (is_active = true) at the outer level, wrapping is_admin() and get_my_role() = 'teacher'.
-- When is_active was toggled to false, PostgREST's UPDATE ... RETURNING clause failed
-- because the updated row with is_active = false violated the table's SELECT policy.
--
-- Fix:
-- 1. Redefines the SELECT policy ("homework: select accessible") so is_admin() and
--    teachers can read all homework (both active and hidden), while students are strictly
--    confined to is_active = true with active batch fee status.
-- 2. Hardens the UPDATE policy ("homework: admin or own teacher update") to ensure
--    both admins and batch-assigned teachers can update homework.
-- 3. Hardens the DELETE policy ("homework: teacher delete own") to support batch-assigned
--    teachers alongside original authors.
-- ==============================================================================

-- 1. Redefine SELECT policy on homework
DROP POLICY IF EXISTS "homework: all read active" ON public.homework;
DROP POLICY IF EXISTS "homework: select accessible" ON public.homework;

CREATE POLICY "homework: select accessible"
  ON public.homework FOR SELECT
  USING (
    is_admin()
    OR get_my_role() = 'teacher'
    OR (
      is_active = true
      AND (
        batch_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.student_profiles sp
          WHERE sp.id = auth.uid()
            AND sp.batch_id = homework.batch_id
            AND public.is_batch_access_active(auth.uid(), homework.batch_id)
        )
      )
    )
  );

-- 2. Redefine UPDATE policy on homework
DROP POLICY IF EXISTS "homework: admin or own teacher update" ON public.homework;

CREATE POLICY "homework: admin or own teacher update"
  ON public.homework FOR UPDATE
  USING (
    is_admin()
    OR (
      get_my_role() = 'teacher'
      AND public.teacher_can('homework')
      AND (
        teacher_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.batches b
          WHERE b.id = homework.batch_id
            AND (b.teacher_id = auth.uid() OR auth.uid() = ANY(b.teacher_ids))
        )
      )
    )
  )
  WITH CHECK (
    is_admin()
    OR (
      get_my_role() = 'teacher'
      AND public.teacher_can('homework')
      AND (
        teacher_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.batches b
          WHERE b.id = homework.batch_id
            AND (b.teacher_id = auth.uid() OR auth.uid() = ANY(b.teacher_ids))
        )
      )
    )
  );

-- 3. Redefine DELETE policy on homework for teachers
DROP POLICY IF EXISTS "homework: teacher delete own" ON public.homework;

CREATE POLICY "homework: teacher delete own"
  ON public.homework FOR DELETE
  USING (
    get_my_role() = 'teacher'
    AND public.teacher_can('homework')
    AND (
      teacher_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.batches b
        WHERE b.id = homework.batch_id
          AND (b.teacher_id = auth.uid() OR auth.uid() = ANY(b.teacher_ids))
      )
    )
  );
