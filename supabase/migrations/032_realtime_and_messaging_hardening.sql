-- ============================================================
-- 032_realtime_and_messaging_hardening.sql
-- Consolidated Realtime, Messaging, Notifications & Chapters Hardening
-- ============================================================

-- 1. Ensure columns exist on public.messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_broadcast BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_messages_broadcast
  ON public.messages(batch_id, is_broadcast, created_at)
  WHERE is_broadcast = true;

CREATE INDEX IF NOT EXISTS idx_messages_unread_pair
  ON public.messages(receiver_id, sender_id)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_messages_direct_filter
  ON public.messages(sender_id, receiver_id, is_broadcast, created_at);

-- 2. Ensure chapters table exists
CREATE TABLE IF NOT EXISTS public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chapters_batch_subject
  ON public.chapters(batch_id, subject, display_order);

ALTER TABLE public.study_cards
  ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chapter TEXT,
  ADD COLUMN IF NOT EXISTS attached_notes JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_study_cards_chapter_id
  ON public.study_cards(chapter_id);

CREATE INDEX IF NOT EXISTS idx_study_cards_attached_notes
  ON public.study_cards USING gin (attached_notes);

-- 3. Safely register all essential realtime tables in supabase_realtime publication
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'messages',
    'notifications',
    'notification_reads',
    'doubts',
    'live_classes',
    'homework',
    'homework_submissions',
    'fee_records'
  ];
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

-- 4. Enable REPLICA IDENTITY FULL for tables with RLS and realtime row-level filtering
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    ALTER TABLE public.messages REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    ALTER TABLE public.notifications REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'doubts') THEN
    ALTER TABLE public.doubts REPLICA IDENTITY FULL;
  END IF;
END $$;
