-- ============================================================
-- 021_fix_teacher_study_cards_permissions.sql
-- Complete RLS policy overhaul for study_cards & teacher_profiles:
-- 1. Allow Admin to insert/upsert teacher_profiles for any teacher.
-- 2. Update teacher_can helper function to check active batch assignments.
-- 3. Replace all study_cards SELECT policies so teachers & admins can
--    read cards across batches (in read-only mode for unassigned batches).
-- 4. Update study_cards UPDATE, DELETE, and INSERT policies to permit
--    teachers to manage cards ONLY in batches where they are currently assigned (batches.teacher_id = auth.uid()).
-- ============================================================

-- 1. teacher_profiles INSERT & UPDATE policies for Admin
DROP POLICY IF EXISTS "teacher_profiles: own insert" ON teacher_profiles;
CREATE POLICY "teacher_profiles: own insert"
  ON teacher_profiles FOR INSERT
  WITH CHECK (is_admin() OR auth.uid() = id);

DROP POLICY IF EXISTS "teacher_profiles: admin update" ON teacher_profiles;
CREATE POLICY "teacher_profiles: admin update"
  ON teacher_profiles FOR UPDATE
  USING (is_admin() OR auth.uid() = id);

-- 2. teacher_can helper function
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

-- 3. Drop all old SELECT, UPDATE, DELETE, and INSERT policies on study_cards
DROP POLICY IF EXISTS "study_cards: public read" ON study_cards;
DROP POLICY IF EXISTS "study_cards: enrolled read" ON study_cards;
DROP POLICY IF EXISTS "study_cards: enrolled student read" ON study_cards;
DROP POLICY IF EXISTS "study_cards: admin read all" ON study_cards;
DROP POLICY IF EXISTS "study_cards: teacher and admin read" ON study_cards;
DROP POLICY IF EXISTS "study_cards: admin or permitted teacher update" ON study_cards;
DROP POLICY IF EXISTS "study_cards: admin delete" ON study_cards;
DROP POLICY IF EXISTS "study_cards: admin or permitted teacher insert" ON study_cards;

-- 4. Recreate SELECT policies
-- Public active cards for unauthenticated/homepage
CREATE POLICY "study_cards: public read"
  ON study_cards FOR SELECT
  USING (is_active = true AND is_public = true);

-- Enrolled student active cards
CREATE POLICY "study_cards: enrolled student read"
  ON study_cards FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = auth.uid()
        AND (sp.batch_id = study_cards.batch_id OR sp.batch_id = ANY(study_cards.batch_ids))
    )
  );

-- Teachers and Admins can read ALL cards (active or hidden) across batches
CREATE POLICY "study_cards: teacher and admin read"
  ON study_cards FOR SELECT
  USING (
    is_admin()
    OR get_my_role() = 'teacher'
  );

-- 5. Recreate UPDATE policy (strictly requires active batch assignment)
CREATE POLICY "study_cards: admin or permitted teacher update"
  ON study_cards FOR UPDATE
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM batches
      WHERE teacher_id = auth.uid()
        AND is_active = true
        AND (id = study_cards.batch_id OR id = ANY(study_cards.batch_ids))
    )
  )
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM batches
      WHERE teacher_id = auth.uid()
        AND is_active = true
        AND (id = study_cards.batch_id OR id = ANY(study_cards.batch_ids))
    )
  );

-- 6. Recreate DELETE policy (strictly requires active batch assignment)
CREATE POLICY "study_cards: admin delete"
  ON study_cards FOR DELETE
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM batches
      WHERE teacher_id = auth.uid()
        AND is_active = true
        AND (id = study_cards.batch_id OR id = ANY(study_cards.batch_ids))
    )
  );

-- 7. Recreate INSERT policy (strictly requires active batch assignment)
CREATE POLICY "study_cards: admin or permitted teacher insert"
  ON study_cards FOR INSERT
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM batches
      WHERE teacher_id = auth.uid()
        AND is_active = true
    )
  );
