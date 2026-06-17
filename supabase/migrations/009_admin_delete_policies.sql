-- ============================================================
-- 009_admin_delete_policies.sql
-- Adds missing DELETE RLS policies so the admin can perform
-- a full data reset from the Settings page.
-- ============================================================

-- profiles: admin can delete any non-admin profile
CREATE POLICY "profiles: admin delete"
  ON profiles FOR DELETE
  USING (is_admin());

-- student_profiles: admin can delete
CREATE POLICY "student_profiles: admin delete"
  ON student_profiles FOR DELETE
  USING (is_admin());

-- teacher_profiles: admin can delete
CREATE POLICY "teacher_profiles: admin delete"
  ON teacher_profiles FOR DELETE
  USING (is_admin());

-- study_cards: admin (and teachers who own the card) can delete
CREATE POLICY "study_cards: admin delete"
  ON study_cards FOR DELETE
  USING (is_admin() OR added_by = auth.uid());

-- messages: admin can delete any message
CREATE POLICY "messages: admin delete"
  ON messages FOR DELETE
  USING (is_admin());

-- fee_records: admin can delete
CREATE POLICY "fee_records: admin delete"
  ON fee_records FOR DELETE
  USING (is_admin());

-- live_classes: admin can delete
CREATE POLICY "live_classes: admin delete"
  ON live_classes FOR DELETE
  USING (is_admin());

-- homework: admin can delete
CREATE POLICY "homework: admin delete"
  ON homework FOR DELETE
  USING (is_admin());

-- homework_submissions: admin can delete
CREATE POLICY "homework_submissions: admin delete"
  ON homework_submissions FOR DELETE
  USING (is_admin());
