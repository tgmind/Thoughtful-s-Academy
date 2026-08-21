-- ============================================================
-- 025_tests.sql  ·  Cleanup / Remove Test Section
-- ============================================================

-- ── 1. Drop Realtime Publication ──────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'tests'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE tests;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'test_attempts'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE test_attempts;
  END IF;
END $$;

-- ── 2. Drop Tables ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS test_attempts CASCADE;
DROP TABLE IF EXISTS tests CASCADE;

-- ── 3. Drop Column from teacher_profiles ──────────────────────────────────────
ALTER TABLE teacher_profiles
  DROP COLUMN IF EXISTS can_manage_tests;
