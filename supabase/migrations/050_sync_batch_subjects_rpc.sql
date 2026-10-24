-- Migration 050: Batch Subject Multi-Student Sync Engine
-- Provides atomic, high-performance database function to sync newly added batch subjects
-- to all enrolled students or a selective student roster.

CREATE OR REPLACE FUNCTION public.sync_batch_subjects(
  p_batch_id UUID,
  p_new_subjects TEXT[],
  p_student_ids UUID[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INT := 0;
BEGIN
  -- 1. Security check: Admin role required
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only administrators can sync batch subjects.';
  END IF;

  -- 2. Input validation
  IF p_batch_id IS NULL OR p_new_subjects IS NULL OR array_length(p_new_subjects, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid arguments: batch_id and at least one subject are required.',
      'updated_count', 0
    );
  END IF;

  -- 3. Execute bulk update
  IF p_student_ids IS NULL OR array_length(p_student_ids, 1) IS NULL THEN
    -- Update all students currently enrolled in this batch
    WITH updated AS (
      UPDATE public.student_profiles
      SET subjects = ARRAY(
        SELECT DISTINCT elem
        FROM unnest(COALESCE(subjects, ARRAY[]::TEXT[]) || p_new_subjects) AS elem
        WHERE elem IS NOT NULL AND trim(elem) <> ''
      )
      WHERE batch_id = p_batch_id
      RETURNING id
    )
    SELECT count(*) INTO v_updated_count FROM updated;
  ELSE
    -- Update only selected students in this batch
    WITH updated AS (
      UPDATE public.student_profiles
      SET subjects = ARRAY(
        SELECT DISTINCT elem
        FROM unnest(COALESCE(subjects, ARRAY[]::TEXT[]) || p_new_subjects) AS elem
        WHERE elem IS NOT NULL AND trim(elem) <> ''
      )
      WHERE batch_id = p_batch_id AND id = ANY(p_student_ids)
      RETURNING id
    )
    SELECT count(*) INTO v_updated_count FROM updated;
  END IF;

  -- 4. Return result summary
  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'synced_subjects', p_new_subjects,
    'updated_count', v_updated_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_batch_subjects(UUID, TEXT[], UUID[]) TO authenticated;
