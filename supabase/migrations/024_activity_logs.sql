-- ============================================================
-- 024_activity_logs.sql
-- Create activity_logs table for tracking batch-level actions
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL DEFAULT 'teacher',
  action_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'toggle_visibility'
  entity_type TEXT NOT NULL DEFAULT 'study_card', -- 'study_card', 'homework', 'live_class', 'batch'
  entity_title TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast 24-hour querying per batch
CREATE INDEX IF NOT EXISTS idx_activity_logs_batch_created ON activity_logs (batch_id, created_at DESC);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Admins or assigned teachers of the batch
DROP POLICY IF EXISTS "activity_logs: admin or batch teacher select" ON activity_logs;
CREATE POLICY "activity_logs: admin or batch teacher select"
  ON activity_logs FOR SELECT
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM batches
      WHERE (teacher_id = auth.uid() OR auth.uid() = ANY(teacher_ids))
        AND id = activity_logs.batch_id
    )
  );

-- INSERT policy: Authenticated teachers or admins
DROP POLICY IF EXISTS "activity_logs: authenticated insert" ON activity_logs;
CREATE POLICY "activity_logs: authenticated insert"
  ON activity_logs FOR INSERT
  WITH CHECK (
    is_admin()
    OR get_my_role() = 'teacher'
  );
