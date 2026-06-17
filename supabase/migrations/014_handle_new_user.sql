CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta          JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role        TEXT  := COALESCE(meta->>'role', 'student');
  v_full_name   TEXT  := COALESCE(NULLIF(meta->>'full_name', ''), split_part(NEW.email, '@', 1));
  v_subjects    TEXT[];
  v_batch_id    UUID;
  v_seq         INT;
  v_year        TEXT;
  v_batch_pref  TEXT;
  v_roll_number TEXT := NULL;
BEGIN
  IF v_role NOT IN ('student', 'teacher', 'admin') THEN
    v_role := 'student';
  END IF;

  -- Base profile row
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (NEW.id, v_full_name, NEW.email, NULLIF(meta->>'phone', ''), v_role)
  ON CONFLICT (id) DO NOTHING;

  IF v_role = 'student' THEN
    SELECT COALESCE(array_agg(value), '{}')
      INTO v_subjects
      FROM jsonb_array_elements_text(COALESCE(meta->'subjects', '[]'::jsonb)) AS value;

    v_batch_id := NULLIF(meta->>'batch_id', '')::uuid;

    -- Generate automated Roll Number if a batch is selected
    IF v_batch_id IS NOT NULL THEN
      v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
      
      -- Get a short 3-letter prefix of the batch name (e.g. "JEE Mains" -> "JEE")
      SELECT UPPER(SUBSTRING(REPLACE(name, ' ', ''), 1, 3)) INTO v_batch_pref
      FROM public.batches WHERE id = v_batch_id;

      -- Count current students in this batch
      SELECT COUNT(*) + 1 INTO v_seq
      FROM public.student_profiles WHERE batch_id = v_batch_id;

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

  ELSIF v_role = 'teacher' THEN
    INSERT INTO public.teacher_profiles (id, subject, qualification)
    VALUES (
      NEW.id,
      NULLIF(meta->>'subject', ''),
      NULLIF(meta->>'qualification', '')
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
