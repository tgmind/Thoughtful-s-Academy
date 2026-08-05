-- ============================================================
-- 017_batch_poster.sql
-- Adds a poster_url column to batches for homepage display.
-- Run in: Supabase Dashboard → SQL Editor → New query
-- Safe to re-run — uses IF NOT EXISTS / ALTER ... ADD COLUMN IF NOT EXISTS
-- ============================================================

ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS poster_url TEXT;

-- Optional: add a comment for clarity
COMMENT ON COLUMN batches.poster_url IS
  'Google Drive sharable image link for the batch poster shown on the homepage.';
