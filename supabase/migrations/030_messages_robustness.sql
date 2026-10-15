-- ============================================================
-- 030_messages_robustness.sql
-- Robust messaging: batch broadcast isolation, optimized indexes,
-- and hardened RLS permissions across Student, Teacher, and Admin
-- ============================================================

-- 1. Add batch_id and is_broadcast columns to messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_broadcast BOOLEAN NOT NULL DEFAULT false;

-- 2. Indexes for fast broadcast queries and instant unread count lookups
CREATE INDEX IF NOT EXISTS idx_messages_broadcast
  ON public.messages(batch_id, is_broadcast, created_at)
  WHERE is_broadcast = true;

CREATE INDEX IF NOT EXISTS idx_messages_unread_pair
  ON public.messages(receiver_id, sender_id)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_messages_direct_filter
  ON public.messages(sender_id, receiver_id, is_broadcast, created_at);

-- 3. Harden messages SELECT policy:
-- Users can read messages where:
-- - They are the sender or receiver
-- - Or they are admin
-- - Or it's a broadcast to a batch they teach (as primary or co-teacher)
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
      AND EXISTS (
        SELECT 1 FROM public.batches b
        WHERE b.id = messages.batch_id
          AND (b.teacher_id = auth.uid() OR auth.uid() = ANY(b.teacher_ids))
      )
    )
  );

-- 4. Harden messages INSERT policy:
-- - Admins can insert any message (direct or broadcast)
-- - Students can insert direct messages only to teachers or admins (cannot message other students, cannot broadcast)
-- - Teachers can message admins or other teachers anytime
-- - Teachers can message students (direct or broadcast) ONLY IF teacher_can('message_students')
DROP POLICY IF EXISTS "messages: authenticated insert" ON public.messages;
CREATE POLICY "messages: authenticated insert"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      -- Admins have full access
      is_admin()
      OR
      -- Students can only send direct messages to teachers/admins
      (
        get_my_role() = 'student'
        AND is_broadcast = false
        AND receiver_id IN (
          SELECT id FROM public.profiles WHERE role IN ('teacher', 'admin')
        )
      )
      OR
      -- Teachers
      (
        get_my_role() = 'teacher'
        AND (
          -- Messaging admin or fellow teacher
          receiver_id IN (
            SELECT id FROM public.profiles WHERE role IN ('teacher', 'admin')
          )
          OR
          -- Messaging student(s) requiring permission
          (
            receiver_id IN (
              SELECT id FROM public.profiles WHERE role = 'student'
            )
            AND teacher_can('message_students')
          )
        )
      )
    )
  );

-- 5. Harden messages DELETE policy:
-- - Admins can delete any message (moderation)
-- - Senders can delete/retract their own messages or batch broadcasts
DROP POLICY IF EXISTS "messages: admin delete" ON public.messages;
DROP POLICY IF EXISTS "messages: delete" ON public.messages;
CREATE POLICY "messages: delete"
  ON public.messages FOR DELETE
  USING (
    is_admin()
    OR auth.uid() = sender_id
  );

