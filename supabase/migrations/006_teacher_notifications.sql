-- Allow teachers to INSERT, UPDATE, DELETE, and SELECT their own notifications.
-- The existing "notifications: teacher read" policy already covers SELECT for
-- active notifications targeted to teachers; this new policy adds write access
-- and allows teachers to see their own notifications (including inactive ones)
-- for management purposes. RLS policies are OR-combined for SELECT, so both apply.

DROP POLICY IF EXISTS "notifications: teacher manage own" ON notifications;

CREATE POLICY "notifications: teacher manage own"
  ON notifications FOR ALL
  USING     (get_my_role() = 'teacher' AND created_by = auth.uid())
  WITH CHECK (get_my_role() = 'teacher' AND created_by = auth.uid());
