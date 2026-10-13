-- ============================================================
-- 026_security_and_integrity_hardening.sql
-- Thoughtful's Academy Security Hardening & Integrity Fixes
--
-- Phase 3 Hardening Updates:
-- 1. SEC-001: Enforce role integrity in handle_new_user() (strictly 'student' for public signups)
-- 2. SEC-003: Prevent privilege escalation via BEFORE INSERT OR UPDATE triggers on profiles and teacher_profiles
-- 3. SEC-003: Restrict teacher_profiles insertion exclusively to administrators
-- 4. SEC-003: Ensure all SECURITY DEFINER functions have explicit search_path = public
-- 5. SEC-003: Restrict student INSERT on fee_records to pending status with unverified fields
-- 6. SEC-003: Restrict student INSERT on homework_submissions (prevent self-grading/feedback)
-- 7. DATA-001: Cascade cleanup of auth.users when profiles are deleted by admin
-- 8. DATA-002: Concurrency-safe student roll number assignment via pg_advisory_xact_lock and unique index
-- ============================================================

-- ── 1. HARDENED HANDLE_NEW_USER (SEC-001, DATA-002) ─────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta          JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role        TEXT  := 'student'; -- Public signups are strictly students. Teacher/Admin provisioning requires server-authorized workflows.
  v_full_name   TEXT  := COALESCE(NULLIF(meta->>'full_name', ''), split_part(NEW.email, '@', 1));
  v_subjects    TEXT[];
  v_batch_id    UUID;
  v_seq         INT;
  v_year        TEXT;
  v_batch_pref  TEXT;
  v_roll_number TEXT := NULL;
BEGIN
  -- Base profile row: Always provisioned as 'student'
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (NEW.id, v_full_name, NEW.email, NULLIF(meta->>'phone', ''), v_role)
  ON CONFLICT (id) DO NOTHING;

  -- Extract enrolled subjects if present
  SELECT COALESCE(array_agg(value), '{}')
    INTO v_subjects
    FROM jsonb_array_elements_text(COALESCE(meta->'subjects', '[]'::jsonb)) AS value;

  v_batch_id := NULLIF(meta->>'batch_id', '')::uuid;

  -- Concurrency-safe Roll Number Generation
  IF v_batch_id IS NOT NULL THEN
    -- Serialize roll-number generation per batch to prevent race condition duplicates
    PERFORM pg_advisory_xact_lock(hashtext(v_batch_id::text));

    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

    -- Get a short 3-letter prefix of the batch name (e.g. "JEE Mains" -> "JEE")
    SELECT UPPER(SUBSTRING(REPLACE(name, ' ', ''), 1, 3)) INTO v_batch_pref
    FROM public.batches WHERE id = v_batch_id;

    -- Use MAX sequence number to ensure monotonic increments even if prior rows were deleted
    SELECT COALESCE(MAX(SUBSTRING(roll_number FROM '[0-9]+$')::int), 0) + 1
    INTO v_seq
    FROM public.student_profiles
    WHERE batch_id = v_batch_id
      AND roll_number LIKE (v_year || '-' || COALESCE(v_batch_pref, 'B') || '-%');

    IF v_seq IS NULL OR v_seq < 1 THEN
      SELECT COUNT(*) + 1 INTO v_seq
      FROM public.student_profiles WHERE batch_id = v_batch_id;
    END IF;

    -- Format: YYYY-PREFIX-001 (e.g., 2025-JEE-001)
    v_roll_number := v_year || '-' || COALESCE(v_batch_pref, 'B') || '-' || LPAD(v_seq::text, 3, '0');
  END IF;

  INSERT INTO public.student_profiles (id, batch_id, roll_number, parent_phone, date_of_birth, subjects)
  VALUES (
    NEW.id,
    v_batch_id,
    v_roll_number,
    NULLIF(meta->>'parent_phone', ''),
    NULLIF(meta->>'date_of_birth', '')::date,
    v_subjects
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Physical unique constraint to prevent duplicate roll numbers at database level
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_profiles_roll_number
  ON public.student_profiles(roll_number)
  WHERE roll_number IS NOT NULL;


-- ── 2. PREVENT PRIVILEGE ESCALATION VIA TRIGGERS (SEC-003) ───────────────────

-- 2a. Profiles: Prevent unauthorized role changes or direct role injection on INSERT
CREATE OR REPLACE FUNCTION public.enforce_profile_role_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Cannot alter profile user ID';
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF NOT is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only institute administrators can modify user roles';
      END IF;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.role IS DISTINCT FROM 'student' THEN
      IF NOT is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Non-administrators cannot create non-student profiles';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_role_integrity ON public.profiles;
CREATE TRIGGER trg_enforce_profile_role_integrity
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_role_integrity();


-- 2b. Teacher Profiles: Prevent salary or permission tampering by teachers on INSERT or UPDATE
CREATE OR REPLACE FUNCTION public.enforce_teacher_profile_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Cannot alter teacher profile ID';
    END IF;

    IF (
      NEW.salary_amount IS DISTINCT FROM OLD.salary_amount OR
      NEW.can_manage_study_cards IS DISTINCT FROM OLD.can_manage_study_cards OR
      NEW.can_manage_homework IS DISTINCT FROM OLD.can_manage_homework OR
      NEW.can_drop_live_class IS DISTINCT FROM OLD.can_drop_live_class OR
      NEW.can_message_students IS DISTINCT FROM OLD.can_message_students OR
      NEW.can_view_attendance IS DISTINCT FROM OLD.can_view_attendance OR
      NEW.can_view_fee_records IS DISTINCT FROM OLD.can_view_fee_records
    ) THEN
      IF NOT is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only institute administrators can modify teacher compensation or permissions';
      END IF;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NOT is_admin() THEN
      IF (
        COALESCE(NEW.salary_amount, 0) <> 0 OR
        COALESCE(NEW.can_manage_study_cards, false) OR
        COALESCE(NEW.can_manage_homework, false) OR
        COALESCE(NEW.can_drop_live_class, false) OR
        COALESCE(NEW.can_message_students, false) OR
        COALESCE(NEW.can_view_attendance, false) OR
        COALESCE(NEW.can_view_fee_records, false)
      ) THEN
        RAISE EXCEPTION 'Unauthorized: Only institute administrators can configure teacher compensation or permissions';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_teacher_profile_integrity ON public.teacher_profiles;
CREATE TRIGGER trg_enforce_teacher_profile_integrity
  BEFORE INSERT OR UPDATE ON public.teacher_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_teacher_profile_integrity();


-- ── 3. HARDENED RLS POLICIES & SEARCH PATH DEFENSES (SEC-003) ─────────────────

-- 3a. Secure search_path on critical SECURITY DEFINER helper functions
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.teacher_can(permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  has_perm BOOLEAN := false;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher') THEN
    RETURN false;
  END IF;

  CASE permission
    WHEN 'study_cards'       THEN
      SELECT COALESCE((SELECT can_manage_study_cards FROM public.teacher_profiles WHERE id = auth.uid()), false) INTO has_perm;
    WHEN 'homework'          THEN
      SELECT COALESCE((SELECT can_manage_homework FROM public.teacher_profiles WHERE id = auth.uid()), false) INTO has_perm;
    WHEN 'live_class'        THEN
      SELECT COALESCE((SELECT can_drop_live_class FROM public.teacher_profiles WHERE id = auth.uid()), false) INTO has_perm;
    WHEN 'attendance'        THEN
      SELECT COALESCE((SELECT can_view_attendance FROM public.teacher_profiles WHERE id = auth.uid()), false) INTO has_perm;
    WHEN 'view_fees'         THEN
      SELECT COALESCE((SELECT can_view_fee_records FROM public.teacher_profiles WHERE id = auth.uid()), false) INTO has_perm;
    WHEN 'message_students'  THEN
      SELECT COALESCE((SELECT can_message_students FROM public.teacher_profiles WHERE id = auth.uid()), false) INTO has_perm;
    ELSE
      has_perm := false;
  END CASE;

  RETURN COALESCE(has_perm, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_homework_graded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hw_title TEXT;
BEGIN
  IF NEW.grade IS NOT NULL AND (OLD.grade IS NULL OR OLD.grade <> NEW.grade) THEN
    SELECT title INTO hw_title FROM public.homework WHERE id = NEW.homework_id;
    INSERT INTO public.notifications (
      title,
      body,
      type,
      target_role,
      target_user_id,
      is_active
    ) VALUES (
      'Homework Graded',
      'Your submission for "' || COALESCE(hw_title, 'Homework') || '" has been graded: ' || NEW.grade,
      'homework',
      'student',
      NEW.student_id,
      true
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 3b. Teacher Profiles: Restrict INSERT exclusively to administrators
DROP POLICY IF EXISTS "teacher_profiles: own insert" ON public.teacher_profiles;
DROP POLICY IF EXISTS "teacher_profiles: admin insert" ON public.teacher_profiles;
CREATE POLICY "teacher_profiles: admin insert"
  ON public.teacher_profiles FOR INSERT
  WITH CHECK (is_admin());

-- 3c. Fee records: Students can only insert records in 'pending' status with null verification fields
DROP POLICY IF EXISTS "fee_records: student insert" ON public.fee_records;
CREATE POLICY "fee_records: student insert"
  ON public.fee_records FOR INSERT
  WITH CHECK (
    auth.uid() = student_id
    AND (status = 'pending' OR status IS NULL)
    AND verified_by IS NULL
    AND verified_at IS NULL
  );

-- 3d. Homework submissions: Students cannot self-assign grades or feedback
DROP POLICY IF EXISTS "submissions: student insert" ON public.homework_submissions;
CREATE POLICY "submissions: student insert"
  ON public.homework_submissions FOR INSERT
  WITH CHECK (
    auth.uid() = student_id
    AND grade IS NULL
    AND feedback IS NULL
  );


-- ── 4. PREVENT ORPHANED AUTH USERS ON PROFILE DELETION (DATA-001) ────────────
CREATE OR REPLACE FUNCTION public.handle_profile_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  -- Only clean up if row still exists in auth.users (prevents infinite recursion on auth cascade)
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.id) THEN
    DELETE FROM auth.users WHERE id = OLD.id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;
CREATE TRIGGER on_profile_deleted
  AFTER DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_deleted();
