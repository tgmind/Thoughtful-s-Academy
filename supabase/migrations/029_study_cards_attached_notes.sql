-- ============================================================
-- 029_study_cards_attached_notes.sql
-- Adds attached_notes JSONB column to study_cards table
-- to allow attaching single/multiple Google Drive PDFs and
-- structured Notes Playlists directly to study cards.
-- ============================================================

ALTER TABLE study_cards
  ADD COLUMN IF NOT EXISTS attached_notes JSONB DEFAULT '[]'::jsonb;

-- GIN index for high performance on JSON operations
CREATE INDEX IF NOT EXISTS idx_study_cards_attached_notes 
  ON study_cards USING gin (attached_notes);
