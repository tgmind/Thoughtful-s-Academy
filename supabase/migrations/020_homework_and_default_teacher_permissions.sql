-- ============================================================
-- 020_homework_and_default_teacher_permissions.sql
--
-- Adds can_manage_homework column to teacher_profiles.
-- Sets default permission for new teachers:
--   - Salary (always open)
--   - Messages (can_message_students = true by default)
--   - All other permissions (can_manage_study_cards, can_manage_homework,
--     can_drop_live_class, can_view_attendance, can_view_fee_records) = false by default.
-- Update teacher_can helper function and RLS policies for homework.
-- ============================================================

ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS can_manage_homework BOOLEAN DEFAULT false;
ALTER TABLE teacher_profiles ALTER COLUMN can_message_students SET DEFAULT true;

-- Update helper: check teacher permission flag
CREATE OR REPLACE FUNCTION teacher_can(permission TEXT)
RETURNS BOOLEAN AS $$
  SELECT CASE
    WHEN permission = 'study_cards'      THEN can_manage_study_cards
    WHEN permission = 'homework'         THEN can_manage_homework
    WHEN permission = 'live_class'       THEN can_drop_live_class
    WHEN permission = 'message'          THEN can_message_students
    WHEN permission = 'view_attendance'  THEN can_view_attendance
    WHEN permission = 'view_fees'        THEN can_view_fee_records
    ELSE false
  END
  FROM teacher_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS Policy updates for homework table to enforce permission check for teachers
DROP POLICY IF EXISTS "homework: admin or teacher insert" ON homework;
CREATE POLICY "homework: admin or teacher insert"
  ON homework FOR INSERT
  WITH CHECK (is_admin() OR (get_my_role() = 'teacher' AND teacher_can('homework')));

DROP POLICY IF EXISTS "homework: admin or own teacher update" ON homework;
CREATE POLICY "homework: admin or own teacher update"
  ON homework FOR UPDATE
  USING      (is_admin() OR (get_my_role() = 'teacher' AND teacher_id = auth.uid() AND teacher_can('homework')))
  WITH CHECK (is_admin() OR (get_my_role() = 'teacher' AND teacher_id = auth.uid() AND teacher_can('homework')));

DROP POLICY IF EXISTS "homework: teacher delete own" ON homework;
CREATE POLICY "homework: teacher delete own"
  ON homework FOR DELETE
  USING (get_my_role() = 'teacher' AND teacher_id = auth.uid() AND teacher_can('homework'));

DROP POLICY IF EXISTS "submissions: teacher or admin grade" ON homework_submissions;
CREATE POLICY "submissions: teacher or admin grade"
  ON homework_submissions FOR UPDATE
  USING      (is_admin() OR (get_my_role() = 'teacher' AND teacher_can('homework')))
  WITH CHECK (is_admin() OR (get_my_role() = 'teacher' AND teacher_can('homework')));
