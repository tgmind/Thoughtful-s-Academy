-- ============================================================
-- 033_chapters_realtime_and_sync.sql
-- Chapters & Study Cards Realtime Synchronization & Integrity
-- ============================================================

-- 1. Safely register chapters and study_cards in supabase_realtime publication
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY['chapters', 'study_cards'];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      END IF;
    END IF;
  END LOOP;
END $$;

-- 2. Enable REPLICA IDENTITY FULL for complete change payloads in Realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chapters') THEN
    ALTER TABLE public.chapters REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'study_cards') THEN
    ALTER TABLE public.study_cards REPLICA IDENTITY FULL;
  END IF;
END $$;

-- 3. Automatic Synchronization Function and Trigger for Chapter Renaming and Deletion
CREATE OR REPLACE FUNCTION public.sync_chapter_title_to_cards()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.title IS DISTINCT FROM OLD.title THEN
      UPDATE public.study_cards
      SET chapter = NEW.title
      WHERE chapter_id = NEW.id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.study_cards
    SET chapter = NULL,
        chapter_id = NULL
    WHERE chapter_id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_chapter_title_to_cards ON public.chapters;
CREATE TRIGGER trg_sync_chapter_title_to_cards
  AFTER UPDATE OF title OR DELETE ON public.chapters
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_chapter_title_to_cards();

-- 4. Idempotent Data Reconciliation
-- A. Synchronize existing study cards whose chapter string is out of sync with their canonical chapter title
UPDATE public.study_cards sc
SET chapter = ch.title
FROM public.chapters ch
WHERE sc.chapter_id = ch.id
  AND (sc.chapter IS DISTINCT FROM ch.title);

-- B. Reconcile legacy cards where chapter_id is NULL but chapter string matches a valid chapter in the same batch & subject
UPDATE public.study_cards sc
SET chapter_id = ch.id,
    chapter = ch.title
FROM public.chapters ch
WHERE sc.chapter_id IS NULL
  AND sc.chapter IS NOT NULL
  AND (sc.batch_id = ch.batch_id OR ch.batch_id = ANY(sc.batch_ids))
  AND LOWER(TRIM(sc.subject)) = LOWER(TRIM(ch.subject))
  AND LOWER(TRIM(sc.chapter)) = LOWER(TRIM(ch.title));
