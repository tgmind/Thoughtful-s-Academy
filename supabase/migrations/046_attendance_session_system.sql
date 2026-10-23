-- ==============================================================================
-- Migration 046: Teacher & Admin Initiated Attendance Session System
-- ==============================================================================
-- Objective:
-- 1. Replace passive student self-marking with teacher/admin-initiated attentiveness checks.
-- 2. Create `attendance_sessions` table with duration, countdown, and active/closed state.
-- 3. Link `attendance` to `session_id`, drop restrictive single-day unique constraint to allow
--    multiple class sessions per day, and enforce session-level uniqueness.
-- 4. Provide automated server-side finalization (`close_attendance_session` & `check_and_close_expired_sessions`)
--    so all students who missed the attendance window are permanently recorded as 'absent' (immutable).
-- 5. Harden RLS policies: students can ONLY mark 'present' during an active, unexpired session
--    for their enrolled batch, with zero ability to edit or delete attendance records.
-- 6. Enable Realtime WAL streaming for instantaneous student popup display.
-- ==============================================================================

-- 1. Create `attendance_sessions` table
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Lecture Attentiveness Check',
    duration_minutes INT NOT NULL DEFAULT 5 CHECK (duration_minutes >= 1 AND duration_minutes <= 180),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for lightning-fast queries and Realtime filters
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_batch_status 
    ON public.attendance_sessions(batch_id, status);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_expires_at 
    ON public.attendance_sessions(expires_at) 
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_created_by 
    ON public.attendance_sessions(created_by);

-- 2. Alter `attendance` table to link with sessions
ALTER TABLE public.attendance 
    ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE SET NULL;

-- Drop legacy unique constraint that prevented multiple sessions per calendar day
ALTER TABLE public.attendance 
    DROP CONSTRAINT IF EXISTS attendance_student_id_date_key;

-- Ensure single attendance record per student per session
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_student_session 
    ON public.attendance(student_id, session_id) 
    WHERE session_id IS NOT NULL;

-- Retain legacy single-day uniqueness only for manual/non-session entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_student_date_legacy 
    ON public.attendance(student_id, date) 
    WHERE session_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_session_id 
    ON public.attendance(session_id);

-- 3. Stored Procedure: Close attendance session and auto-mark absentees
CREATE OR REPLACE FUNCTION public.close_attendance_session(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session RECORD;
    v_total_students INT := 0;
    v_present_count INT := 0;
    v_absent_count INT := 0;
    v_session_date DATE;
BEGIN
    -- Fetch session record
    SELECT * INTO v_session
    FROM public.attendance_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Attendance session not found');
    END IF;

    -- Derive session calendar date in Indian Standard Time
    v_session_date := (v_session.started_at AT TIME ZONE 'Asia/Kolkata')::date;

    -- Mark session closed if still active
    UPDATE public.attendance_sessions
    SET status = 'closed',
        closed_at = COALESCE(closed_at, now())
    WHERE id = p_session_id;

    -- Insert 'absent' record for all active enrolled students in this batch who did not mark present
    INSERT INTO public.attendance (
        student_id,
        batch_id,
        session_id,
        date,
        status,
        marked_at,
        marked_by
    )
    SELECT 
        sp.id AS student_id,
        v_session.batch_id,
        p_session_id,
        v_session_date,
        'absent' AS status,
        now() AS marked_at,
        v_session.created_by AS marked_by
    FROM public.student_profiles sp
    JOIN public.profiles p ON p.id = sp.id
    WHERE sp.batch_id = v_session.batch_id
      AND p.is_active = true
      AND p.role = 'student'
      AND NOT EXISTS (
          SELECT 1 FROM public.attendance a
          WHERE a.session_id = p_session_id
            AND a.student_id = sp.id
      )
    ON CONFLICT (student_id, session_id) WHERE session_id IS NOT NULL DO NOTHING;

    -- Compute final session summary metrics
    SELECT COUNT(*) INTO v_present_count
    FROM public.attendance
    WHERE session_id = p_session_id AND status = 'present';

    SELECT COUNT(*) INTO v_absent_count
    FROM public.attendance
    WHERE session_id = p_session_id AND status = 'absent';

    SELECT COUNT(*) INTO v_total_students
    FROM public.student_profiles sp
    JOIN public.profiles p ON p.id = sp.id
    WHERE sp.batch_id = v_session.batch_id AND p.is_active = true AND p.role = 'student';

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'batch_id', v_session.batch_id,
        'total_enrolled', v_total_students,
        'marked_present', v_present_count,
        'marked_absent', v_absent_count
    );
END;
$$;

-- 4. Stored Procedure: Scan and close all expired active sessions
CREATE OR REPLACE FUNCTION public.check_and_close_expired_sessions()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    r RECORD;
    v_closed_count INT := 0;
BEGIN
    FOR r IN 
        SELECT id 
        FROM public.attendance_sessions
        WHERE status = 'active'
          AND expires_at <= now()
    LOOP
        PERFORM public.close_attendance_session(r.id);
        v_closed_count := v_closed_count + 1;
    END LOOP;

    RETURN v_closed_count;
END;
$$;

-- 5. Stored Procedure: Student check for live active session
CREATE OR REPLACE FUNCTION public.get_active_session_for_student(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_batch_id UUID;
    v_session RECORD;
    v_att RECORD;
    v_creator_name TEXT;
    v_batch_name TEXT;
    v_seconds_remaining INT;
BEGIN
    -- Housekeeping: close any expired sessions
    PERFORM public.check_and_close_expired_sessions();

    -- Determine student batch
    SELECT batch_id INTO v_batch_id
    FROM public.student_profiles
    WHERE id = p_student_id;

    IF v_batch_id IS NULL THEN
        RETURN jsonb_build_object('has_active_session', false, 'reason', 'no_batch');
    END IF;

    -- Find current active session for this batch
    SELECT * INTO v_session
    FROM public.attendance_sessions
    WHERE batch_id = v_batch_id
      AND status = 'active'
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('has_active_session', false);
    END IF;

    -- Check if student already marked
    SELECT * INTO v_att
    FROM public.attendance
    WHERE session_id = v_session.id
      AND student_id = p_student_id;

    -- Fetch creator and batch metadata
    SELECT full_name INTO v_creator_name FROM public.profiles WHERE id = v_session.created_by;
    SELECT name INTO v_batch_name FROM public.batches WHERE id = v_session.batch_id;

    v_seconds_remaining := GREATEST(0, EXTRACT(EPOCH FROM (v_session.expires_at - now()))::INT);

    RETURN jsonb_build_object(
        'has_active_session', true,
        'session_id', v_session.id,
        'batch_id', v_session.batch_id,
        'batch_name', v_batch_name,
        'title', v_session.title,
        'duration_minutes', v_session.duration_minutes,
        'started_at', v_session.started_at,
        'expires_at', v_session.expires_at,
        'seconds_remaining', v_seconds_remaining,
        'created_by_name', COALESCE(v_creator_name, 'Teacher'),
        'already_marked', (v_att.id IS NOT NULL),
        'marked_status', v_att.status,
        'marked_at', v_att.marked_at
    );
END;
$$;

-- 6. Row Level Security Configuration
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

-- Clean existing policies
DROP POLICY IF EXISTS "attendance_sessions: admin full" ON public.attendance_sessions;
DROP POLICY IF EXISTS "attendance_sessions: teacher manage" ON public.attendance_sessions;
DROP POLICY IF EXISTS "attendance_sessions: student read" ON public.attendance_sessions;

-- Admin: complete authority
CREATE POLICY "attendance_sessions: admin full"
    ON public.attendance_sessions
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Teacher: can read, create, and close sessions for assigned batches
CREATE POLICY "attendance_sessions: teacher manage"
    ON public.attendance_sessions
    FOR ALL
    USING (
        public.is_admin() OR (
            public.get_my_role() = 'teacher' AND (
                created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.batches b
                    WHERE b.id = public.attendance_sessions.batch_id
                      AND (b.teacher_id = auth.uid() OR auth.uid() = ANY(b.teacher_ids))
                )
            )
        )
    )
    WITH CHECK (
        public.is_admin() OR (
            public.get_my_role() = 'teacher' AND (
                created_by = auth.uid() AND
                EXISTS (
                    SELECT 1 FROM public.batches b
                    WHERE b.id = public.attendance_sessions.batch_id
                      AND (b.teacher_id = auth.uid() OR auth.uid() = ANY(b.teacher_ids))
                )
            )
        )
    );

-- Student: can read sessions only for their enrolled batch
CREATE POLICY "attendance_sessions: student read"
    ON public.attendance_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.id = auth.uid()
              AND sp.batch_id = public.attendance_sessions.batch_id
        )
    );

-- Clean and harden policies on `attendance`
DROP POLICY IF EXISTS "attendance: admin full" ON public.attendance;
DROP POLICY IF EXISTS "attendance: student insert own" ON public.attendance;
DROP POLICY IF EXISTS "attendance: student own" ON public.attendance;
DROP POLICY IF EXISTS "attendance: student select own" ON public.attendance;
DROP POLICY IF EXISTS "attendance: student insert active session" ON public.attendance;
DROP POLICY IF EXISTS "attendance: teacher select" ON public.attendance;
DROP POLICY IF EXISTS "attendance: teacher manage" ON public.attendance;

-- Admin: full management
CREATE POLICY "attendance: admin full"
    ON public.attendance
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Teacher: view attendance for their batches
CREATE POLICY "attendance: teacher select"
    ON public.attendance
    FOR SELECT
    USING (
        public.is_admin() OR (
            public.get_my_role() = 'teacher' AND (
                marked_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.batches b
                    WHERE b.id = public.attendance.batch_id
                      AND (b.teacher_id = auth.uid() OR auth.uid() = ANY(b.teacher_ids))
                )
            )
        )
    );

-- Teacher: manual management / adjustments
CREATE POLICY "attendance: teacher manage"
    ON public.attendance
    FOR INSERT
    WITH CHECK (
        public.is_admin() OR (
            public.get_my_role() = 'teacher' AND (
                marked_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.batches b
                    WHERE b.id = public.attendance.batch_id
                      AND (b.teacher_id = auth.uid() OR auth.uid() = ANY(b.teacher_ids))
                )
            )
        )
    );

-- Student: view only their own records
CREATE POLICY "attendance: student select own"
    ON public.attendance
    FOR SELECT
    USING (student_id = auth.uid());

-- Student: can ONLY mark 'present' during an active session for their batch
CREATE POLICY "attendance: student insert active session"
    ON public.attendance
    FOR INSERT
    WITH CHECK (
        student_id = auth.uid()
        AND status = 'present'
        AND session_id IS NOT NULL
        AND EXISTS (
            SELECT 1 
            FROM public.attendance_sessions s
            JOIN public.student_profiles sp ON sp.id = auth.uid()
            WHERE s.id = public.attendance.session_id
              AND s.batch_id = sp.batch_id
              AND s.status = 'active'
              AND now() <= s.expires_at
        )
    );

-- NOTE: No student UPDATE or DELETE policies are granted. Attendance is strictly immutable for students!

-- 7. Realtime Replication Configuration
ALTER TABLE public.attendance_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.attendance REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'attendance_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'attendance'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
    END IF;
END $$;

-- 8. Data API and Stored Procedure Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_sessions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.close_attendance_session(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_and_close_expired_sessions() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_active_session_for_student(UUID) TO authenticated, service_role;
