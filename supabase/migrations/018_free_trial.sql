-- ============================================================
-- 018_free_trial.sql
-- Adds free trial tracking to student_profiles.
-- Run in: Supabase Dashboard → SQL Editor → New query
-- Safe to re-run — uses ADD COLUMN IF NOT EXISTS
-- ============================================================

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Index for fast expiry queries on admin dashboard
CREATE INDEX IF NOT EXISTS idx_sp_trial_ends ON student_profiles(trial_ends_at);

COMMENT ON COLUMN student_profiles.trial_ends_at IS
  'Set to NOW() + 2 days on student registration. NULL = no trial (manually enrolled by admin).';
