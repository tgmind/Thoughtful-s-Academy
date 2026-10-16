-- ============================================================
-- 034_messaging_architecture_and_profiles_rls.sql
-- Forensic fix & hardening for Messaging Architecture:
-- 1. Permits students to read active teacher & admin profiles
--    resolving "No contacts available" in student messages.
-- 2. Makes receiver_id in messages nullable for true batch broadcasts.
-- 3. Introduces SECURITY DEFINER can_send_message() to eliminate
--    recursive RLS subquery failures during message insertion.
-- 4. Extends messages SELECT policy so enrolled batch students can
--    read broadcasts sent to their assigned batch.
-- ============================================================

-- 1. Ensure students can read active teacher and admin profiles
DROP POLICY IF EXISTS "profiles: own read" ON public.profiles;
CREATE POLICY "profiles: own read"
  ON public.profiles FOR SELECT
  USING (
    -- User can always read their own profile
    auth.uid() = id
    -- Admins can read all profiles
    OR is_admin()
    -- Teachers can read all profiles
    OR get_my_role() = 'teacher'
    -- Students can read active teachers and admins
    OR (
      get_my_role() = 'student'
      AND role IN ('teacher', 'admin')
    )
  );

-- 2. Make receiver_id nullable on public.messages for flexible batch broadcasts
ALTER TABLE public.messages ALTER COLUMN receiver_id DROP NOT NULL;

-- 3. Robust, non-recursive message validation function
CREATE OR REPLACE FUNCTION public.can_send_message(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_is_broadcast BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_sender_role TEXT;
  v_receiver_role TEXT;
BEGIN
  -- Sender must be the authenticated user
  IF p_sender_id IS DISTINCT FROM auth.uid() THEN
    RETURN FALSE;
  END IF;

  -- Resolve sender role securely
  SELECT role INTO v_sender_role FROM public.profiles WHERE id = p_sender_id;

  -- Admins can send direct or broadcast messages to anyone
  IF v_sender_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Students can only send direct messages to teachers or admins
  IF v_sender_role = 'student' THEN
    IF COALESCE(p_is_broadcast, false) = true OR p_receiver_id IS NULL THEN
      RETURN FALSE;
    END IF;
    SELECT role INTO v_receiver_role FROM public.profiles WHERE id = p_receiver_id;
    RETURN v_receiver_role IN ('teacher', 'admin');
  END IF;

  -- Teachers
  IF v_sender_role = 'teacher' THEN
    -- Broadcasts: allowed if teacher_can('message_students')
    IF COALESCE(p_is_broadcast, false) = true THEN
      RETURN teacher_can('message_students');
    END IF;

    -- Direct messages
    IF p_receiver_id IS NULL THEN
      RETURN FALSE;
    END IF;

    SELECT role INTO v_receiver_role FROM public.profiles WHERE id = p_receiver_id;
    IF v_receiver_role IN ('teacher', 'admin') THEN
      RETURN TRUE;
    ELSIF v_receiver_role = 'student' THEN
      RETURN teacher_can('message_students');
    ELSE
      RETURN FALSE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_send_message(UUID, UUID, BOOLEAN) TO authenticated;

-- 4. Harden messages INSERT policy using can_send_message()
DROP POLICY IF EXISTS "messages: authenticated insert" ON public.messages;
CREATE POLICY "messages: authenticated insert"
  ON public.messages FOR INSERT
  WITH CHECK (
    can_send_message(sender_id, receiver_id, is_broadcast)
  );

-- 5. Harden messages SELECT policy:
-- Senders, receivers, admins, teachers of the batch, and enrolled students of the batch
DROP POLICY IF EXISTS "messages: sender or receiver" ON public.messages;
CREATE POLICY "messages: sender or receiver"
  ON public.messages FOR SELECT
  USING (
    auth.uid() = sender_id
    OR auth.uid() = receiver_id
    OR is_admin()
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
  );

-- 6. Ensure messages table is part of the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
