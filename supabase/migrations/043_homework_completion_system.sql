-- ==============================================================================
-- Migration 043: Unified Homework Completion System
--
-- Refactors the existing public.homework_submissions table in-place into the
-- single authoritative completion tracking model without creating parallel tables.
--
-- Key changes:
-- 1. Drops NOT NULL constraint on drive_link (defaults to NULL) so students can
--    mark homework done without submitting external Google Drive links.
-- 2. Deprecates grade and feedback columns (columns remain nullable for historical
--    records, but are no longer required or modified by the application).
-- 3. Adds student DELETE policy ("submissions: student delete own") allowing
--    students to undo their completion status (move back from Done to To Do).
-- 4. Hardens student INSERT policy to support null drive_link while preserving
--    student ownership, grade/feedback protection, and active batch fee access.
-- 5. Configures REPLICA IDENTITY FULL on public.homework_submissions so Supabase
--    Realtime DELETE payloads contain full row context for client subscriptions.
-- ==============================================================================

-- 1. Make drive_link nullable with DEFAULT NULL
ALTER TABLE public.homework_submissions
  ALTER COLUMN drive_link DROP NOT NULL,
  ALTER COLUMN drive_link SET DEFAULT NULL;

-- 2. Student DELETE policy (Undo action)
DROP POLICY IF EXISTS "submissions: student delete own" ON public.homework_submissions;
CREATE POLICY "submissions: student delete own"
  ON public.homework_submissions FOR DELETE
  USING (auth.uid() = student_id);

-- 3. Student INSERT policy (Mark as Done action)
-- Enforces:
--   - student owns the submission (auth.uid() = student_id)
--   - students cannot self-grade or self-feedback
--   - student is enrolled in the assignment's batch with active fee/access status
DROP POLICY IF EXISTS "submissions: student insert" ON public.homework_submissions;
CREATE POLICY "submissions: student insert"
  ON public.homework_submissions FOR INSERT
  WITH CHECK (
    (auth.uid() = student_id)
    AND (grade IS NULL)
    AND (feedback IS NULL)
    AND EXISTS (
      SELECT 1 FROM public.homework h
      JOIN public.student_profiles sp ON sp.id = auth.uid()
      WHERE h.id = homework_submissions.homework_id
        AND (
          h.batch_id IS NULL
          OR (sp.batch_id = h.batch_id AND public.is_batch_access_active(auth.uid(), h.batch_id))
        )
    )
  );

-- 4. Ensure optimal performance indexes are present
CREATE INDEX IF NOT EXISTS idx_homework_submissions_student_hw
  ON public.homework_submissions (student_id, homework_id);

CREATE INDEX IF NOT EXISTS idx_homework_submissions_hw_created
  ON public.homework_submissions (homework_id, submitted_at DESC);

-- 5. Enable REPLICA IDENTITY FULL for complete change payloads in Realtime subscriptions
ALTER TABLE public.homework_submissions REPLICA IDENTITY FULL;
