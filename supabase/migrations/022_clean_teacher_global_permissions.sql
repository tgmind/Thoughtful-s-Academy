-- ============================================================
-- 022_clean_teacher_global_permissions.sql
-- Fixes teacher permissions when unassigned/removed from a batch:
-- 1. Reset auto-granted global permissions in teacher_profiles so batch
--    management is dynamically controlled by active batch assignments (batches.teacher_id).
-- 2. Update study_cards UPDATE, DELETE, SELECT, and INSERT policies to require
--    active batch assignment (batches.teacher_id = auth.uid()).
-- ============================================================

-- 1. Reset auto-granted global permission flags on teacher_profiles
-- (Admins can still explicitly set can_manage_study_cards = true in Teacher Manager if desired)
UPDATE teacher_profiles
SET can_manage_study_cards = false,
    can_manage_homework = false,
    can_drop_live_class = false;

-- 2. Update teacher_can helper function
CREATE OR REPLACE FUNCTION teacher_can(permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN := false;
BEGIN
  IF permission = 'study_cards' THEN
    SELECT (
      COALESCE((SELECT can_manage_study_cards FROM teacher_profiles WHERE id = auth.uid()), false)
      OR EXISTS (SELECT 1 FROM batches WHERE teacher_id = auth.uid() AND is_active = true)
    ) INTO has_perm;
  ELSIF permission = 'homework' THEN
    SELECT (
      COALESCE((SELECT can_manage_homework FROM teacher_profiles WHERE id = auth.uid()), false)
      OR EXISTS (SELECT 1 FROM batches WHERE teacher_id = auth.uid() AND is_active = true)
    ) INTO has_perm;
  ELSIF permission = 'live_class' THEN
    SELECT (
      COALESCE((SELECT can_drop_live_class FROM teacher_profiles WHERE id = auth.uid()), false)
      OR EXISTS (SELECT 1 FROM batches WHERE teacher_id = auth.uid() AND is_active = true)
    ) INTO has_perm;
  ELSIF permission = 'message' THEN
    SELECT COALESCE((SELECT can_message_students FROM teacher_profiles WHERE id = auth.uid()), true) INTO has_perm;
  ELSIF permission = 'view_attendance' THEN
    SELECT COALESCE((SELECT can_view_attendance FROM teacher_profiles WHERE id = auth.uid()), false) INTO has_perm;
  ELSIF permission = 'view_fees' THEN
    SELECT COALESCE((SELECT can_view_fee_records FROM teacher_profiles WHERE id = auth.uid()), false) INTO has_perm;
  END IF;

  RETURN COALESCE(has_perm, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Drop & Recreate study_cards UPDATE policy
DROP POLICY IF EXISTS "study_cards: admin or permitted teacher update" ON study_cards;
CREATE POLICY "study_cards: admin or permitted teacher update"
  ON study_cards FOR UPDATE
  USING (
    is_admin()
    OR (
      COALESCE((SELECT can_manage_study_cards FROM teacher_profiles WHERE id = auth.uid()), false) = true
    )
    OR EXISTS (
      SELECT 1 FROM batches
      WHERE teacher_id = auth.uid()
        AND is_active = true
        AND (id = study_cards.batch_id OR id = ANY(study_cards.batch_ids))
    )
  )
  WITH CHECK (
    is_admin()
    OR (
      COALESCE((SELECT can_manage_study_cards FROM teacher_profiles WHERE id = auth.uid()), false) = true
    )
    OR EXISTS (
      SELECT 1 FROM batches
      WHERE teacher_id = auth.uid()
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
    OR (
      COALESCE((SELECT can_manage_study_cards FROM teacher_profiles WHERE id = auth.uid()), false) = true
    )
    OR EXISTS (
      SELECT 1 FROM batches
      WHERE teacher_id = auth.uid()
        AND is_active = true
        AND (id = study_cards.batch_id OR id = ANY(study_cards.batch_ids))
    )
  );

-- 5. Drop & Recreate study_cards SELECT policy for Teachers and Admins
DROP POLICY IF EXISTS "study_cards: teacher and admin read" ON study_cards;
CREATE POLICY "study_cards: teacher and admin read"
  ON study_cards FOR SELECT
  USING (
    is_admin()
    OR (COALESCE((SELECT can_manage_study_cards FROM teacher_profiles WHERE id = auth.uid()), false) = true)
    OR EXISTS (
      SELECT 1 FROM batches
      WHERE teacher_id = auth.uid()
        AND is_active = true
        AND (id = study_cards.batch_id OR id = ANY(study_cards.batch_ids))
    )
  );
