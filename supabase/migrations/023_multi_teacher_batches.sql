-- ============================================================
-- 023_multi_teacher_batches.sql
-- Add multi-teacher support to batches (teacher_ids UUID[])
-- ============================================================

-- 1. Add teacher_ids array column to batches table if not exists
ALTER TABLE batches
ADD COLUMN IF NOT EXISTS teacher_ids UUID[] DEFAULT '{}';

-- 2. Populate teacher_ids array from existing single teacher_id column
UPDATE batches
SET teacher_ids = ARRAY[teacher_id]
WHERE teacher_id IS NOT NULL
  AND (teacher_ids IS NULL OR array_length(teacher_ids, 1) IS NULL);

-- 3. Drop & Recreate study_cards UPDATE policy
DROP POLICY IF EXISTS "study_cards: admin or permitted teacher update" ON study_cards;
CREATE POLICY "study_cards: admin or permitted teacher update"
  ON study_cards FOR UPDATE
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM batches
      WHERE (teacher_id = auth.uid() OR auth.uid() = ANY(teacher_ids))
        AND is_active = true
        AND (id = study_cards.batch_id OR id = ANY(study_cards.batch_ids))
    )
  )
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM batches
      WHERE (teacher_id = auth.uid() OR auth.uid() = ANY(teacher_ids))
        AND is_active = true
        AND (id = study_cards.batch_id OR id = ANY(study_cards.batch_ids))
    )
  );

-- 4. Drop & Recreate study_cards DELETE policy
DROP POLICY IF EXISTS "study_cards: admin delete" ON study_cards;
CREATE POLICY "study_cards: admin delete"
  ON study_cards FOR DELETE
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM batches
      WHERE (teacher_id = auth.uid() OR auth.uid() = ANY(teacher_ids))
        AND is_active = true
        AND (id = study_cards.batch_id OR id = ANY(study_cards.batch_ids))
    )
  );

-- 5. Drop & Recreate study_cards INSERT policy
DROP POLICY IF EXISTS "study_cards: admin or permitted teacher insert" ON study_cards;
CREATE POLICY "study_cards: admin or permitted teacher insert"
  ON study_cards FOR INSERT
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM batches
      WHERE (teacher_id = auth.uid() OR auth.uid() = ANY(teacher_ids))
        AND is_active = true
    )
  );
