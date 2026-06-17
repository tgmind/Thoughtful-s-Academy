-- ============================================================
-- 008_study_cards_multi_batch.sql
-- Replaces single batch_id with is_public + batch_ids[]
-- so a card can be visible publicly AND/OR to multiple batches.
-- ============================================================

-- 1. Add new columns
ALTER TABLE study_cards
  ADD COLUMN IF NOT EXISTS is_public  BOOLEAN   DEFAULT false,
  ADD COLUMN IF NOT EXISTS batch_ids  UUID[]    DEFAULT '{}';

-- 2. Migrate existing data
--    batch_id IS NULL  → is_public = true,  batch_ids = '{}'
--    batch_id NOT NULL → is_public = false, batch_ids = ARRAY[batch_id]
UPDATE study_cards
SET is_public = true,  batch_ids = '{}'
WHERE batch_id IS NULL;

UPDATE study_cards
SET is_public = false, batch_ids = ARRAY[batch_id]
WHERE batch_id IS NOT NULL;

-- 3. Drop old RLS policies that use batch_id
DROP POLICY IF EXISTS "study_cards: public read"   ON study_cards;
DROP POLICY IF EXISTS "study_cards: enrolled read" ON study_cards;
DROP POLICY IF EXISTS "study_cards: admin read all" ON study_cards;

-- 4. New policies

-- Public cards — visible to everyone (unauthenticated homepage visitors too)
CREATE POLICY "study_cards: public read"
  ON study_cards FOR SELECT
  USING (is_active = true AND is_public = true);

-- Batch-restricted cards — enrolled students, teachers, admins
CREATE POLICY "study_cards: enrolled read"
  ON study_cards FOR SELECT
  USING (
    is_active = true
    AND array_length(batch_ids, 1) > 0
    AND (
      is_admin()
      OR get_my_role() = 'teacher'
      OR EXISTS (
        SELECT 1 FROM student_profiles sp
        WHERE sp.id = auth.uid()
          AND sp.batch_id = ANY(study_cards.batch_ids)
      )
    )
  );

-- Admins see all cards regardless of active/visibility
CREATE POLICY "study_cards: admin read all"
  ON study_cards FOR SELECT
  USING (is_admin());
