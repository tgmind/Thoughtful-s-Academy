-- ============================================================
-- 041_drop_chapter_description.sql
-- Safely drop description column from chapters table
-- ============================================================

ALTER TABLE public.chapters DROP COLUMN IF EXISTS description;
