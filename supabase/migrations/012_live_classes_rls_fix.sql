-- ============================================================
-- 012_live_classes_rls_fix.sql
--
-- The old SELECT policy filtered by is_active = true.
-- When a teacher ends a class (is_active → false), Supabase
-- realtime evaluates the NEW row against the student's RLS —
-- it fails, so the UPDATE event is never delivered, and the
-- student keeps seeing the class as live.
--
-- Fix: allow all authenticated users to read live_classes.
-- Students' queries already filter is_active = true in code,
-- so ended classes are never shown. But realtime UPDATE events
-- are now delivered, letting fetchLive clear the banner.
-- ============================================================

DROP POLICY IF EXISTS "live_classes: all read active"      ON live_classes;
DROP POLICY IF EXISTS "live_classes: authenticated read"   ON live_classes;

CREATE POLICY "live_classes: authenticated read"
  ON live_classes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Ensure live_classes delivers postgres_changes events to subscribers.
-- supabase_realtime publication must include this table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'live_classes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE live_classes;
  END IF;
END $$;
