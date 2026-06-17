-- ============================================================
-- 011_teacher_fee_records_rls.sql
-- Grants SELECT on fee_records to teachers who have the
-- can_view_fee_records permission (via teacher_can helper).
-- ============================================================

-- Drop if it exists (idempotent re-run)
DROP POLICY IF EXISTS "fee_records: teacher view" ON fee_records;

-- Teachers with can_view_fee_records = true can read all fee records
CREATE POLICY "fee_records: teacher view"
  ON fee_records FOR SELECT
  USING (teacher_can('view_fees'));
