-- ============================================================
-- 047_message_retention_and_starred.sql
-- Automatic 3-Month Message Retention & High-Performance Kept/Starred System
-- 
-- 1. Adds `is_starred`, `starred_at`, and `starred_by` columns to public.messages
-- 2. Creates optimized indexes for 90-day retention cleaning and starred lookups
-- 3. Hardens RLS UPDATE policies so message participants can star/keep messages
-- 4. Creates `clean_expired_messages()` function to purge unstarred messages older than 90 days
-- 5. Configures pg_cron job for automatic daily cleanup with zero manual intervention
-- 6. Creates `toggle_keep_messages()` RPC for atomic single and bulk starring
-- ============================================================

-- 1. Add keep/starred tracking columns to public.messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_starred BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS starred_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS starred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Partial indexes for retention cleanup & starred filtering
CREATE INDEX IF NOT EXISTS idx_messages_retention
  ON public.messages(created_at)
  WHERE is_starred = false;

CREATE INDEX IF NOT EXISTS idx_messages_starred
  ON public.messages(is_starred, created_at DESC)
  WHERE is_starred = true;

CREATE INDEX IF NOT EXISTS idx_messages_thread_starred
  ON public.messages(sender_id, receiver_id, is_starred, created_at DESC);

-- 3. Update RLS UPDATE policy so senders, receivers, admins, and enrolled batch members can update is_starred & is_read
DROP POLICY IF EXISTS "messages: mark read" ON public.messages;
DROP POLICY IF EXISTS "messages: update" ON public.messages;

CREATE POLICY "messages: update"
  ON public.messages FOR UPDATE
  USING (
    -- Direct message sender or receiver
    auth.uid() = sender_id
    OR auth.uid() = receiver_id
    -- Admin has full access
    OR is_admin()
    -- Broadcast batch teacher or enrolled student
    OR (
      is_broadcast = true
      AND batch_id IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.batches b
          WHERE b.id = messages.batch_id
            AND (b.teacher_id = auth.uid() OR auth.uid() = ANY(b.teacher_ids))
        )
        OR EXISTS (
          SELECT 1 FROM public.student_profiles sp
          WHERE sp.id = auth.uid()
            AND sp.batch_id = messages.batch_id
        )
      )
    )
  )
  WITH CHECK (
    -- Maintain same participant boundaries
    auth.uid() = sender_id
    OR auth.uid() = receiver_id
    OR is_admin()
    OR (
      is_broadcast = true
      AND batch_id IS NOT NULL
    )
  );

-- 4. Database Function: clean_expired_messages()
-- Purges all messages older than 90 days (3 months) that are NOT starred/kept.
-- Returns the count of deleted rows.
CREATE OR REPLACE FUNCTION public.clean_expired_messages()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  DELETE FROM public.messages
  WHERE created_at < (NOW() - INTERVAL '90 days')
    AND COALESCE(is_starred, false) = false;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clean_expired_messages() TO authenticated, service_role;

-- 5. Database RPC: toggle_keep_messages()
-- Enables bulk or single message starring/unstarring atomically.
-- Checks that the user is authorized to view each message.
CREATE OR REPLACE FUNCTION public.toggle_keep_messages(
  p_message_ids UUID[],
  p_keep BOOLEAN
)
RETURNS TABLE (
  id UUID,
  is_starred BOOLEAN,
  starred_at TIMESTAMPTZ,
  starred_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_admin BOOLEAN := is_admin();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  UPDATE public.messages m
  SET is_starred = p_keep,
      starred_at = CASE WHEN p_keep THEN NOW() ELSE NULL END,
      starred_by = CASE WHEN p_keep THEN v_user_id ELSE NULL END
  WHERE m.id = ANY(p_message_ids)
    AND (
      v_is_admin
      OR m.sender_id = v_user_id
      OR m.receiver_id = v_user_id
      OR (
        m.is_broadcast = true
        AND m.batch_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1 FROM public.batches b
            WHERE b.id = m.batch_id
              AND (b.teacher_id = v_user_id OR v_user_id = ANY(b.teacher_ids))
          )
          OR EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.id = v_user_id
              AND sp.batch_id = m.batch_id
          )
        )
      )
    )
  RETURNING m.id, m.is_starred, m.starred_at, m.starred_by;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_keep_messages(UUID[], BOOLEAN) TO authenticated, service_role;

-- 6. Automatic pg_cron job for daily cleanup (runs at 03:00 UTC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule existing job if already registered
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'clean_expired_messages_daily';

    -- Schedule daily run at 03:00 AM UTC
    PERFORM cron.schedule(
      'clean_expired_messages_daily',
      '0 3 * * *',
      'SELECT public.clean_expired_messages();'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron registration skipped or notice: %', SQLERRM;
END $$;

-- 7. Ensure messages table has REPLICA IDENTITY FULL for real-time UPDATE delivery
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Ensure table is part of supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
