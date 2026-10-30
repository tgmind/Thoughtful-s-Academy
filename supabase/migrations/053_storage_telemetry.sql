-- Migration 053: Real-Time Supabase Storage Telemetry & Usage Analytics
-- Enables administrators to inspect real-time storage consumption, remaining free storage,
-- project quota, and bucket breakdowns for transparent media operations.

CREATE OR REPLACE FUNCTION public.get_storage_telemetry()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_total_bytes bigint := 0;
  v_landing_bytes bigint := 0;
  v_landing_files int := 0;
  v_total_files int := 0;
  v_quota_bytes bigint := 1073741824; -- 1 GB standard Supabase project quota
  v_remaining_bytes bigint := 0;
  v_percent_used numeric := 0;
  v_buckets jsonb;
BEGIN
  -- Aggregate overall storage consumption
  SELECT coalesce(sum(
    CASE 
      WHEN metadata->>'size' ~ '^[0-9]+$' THEN (metadata->>'size')::bigint 
      ELSE 0 
    END
  ), 0), count(*)
    INTO v_total_bytes, v_total_files
    FROM storage.objects;

  -- Aggregate dedicated landing-media bucket
  SELECT coalesce(sum(
    CASE 
      WHEN metadata->>'size' ~ '^[0-9]+$' THEN (metadata->>'size')::bigint 
      ELSE 0 
    END
  ), 0), count(*)
    INTO v_landing_bytes, v_landing_files
    FROM storage.objects
   WHERE bucket_id = 'landing-media';

  v_remaining_bytes := GREATEST(0, v_quota_bytes - v_total_bytes);
  v_percent_used := ROUND((v_total_bytes::numeric / v_quota_bytes::numeric) * 100, 2);

  -- Aggregate bucket breakdown
  SELECT jsonb_agg(
    jsonb_build_object(
      'bucket_id', b.id,
      'name', b.name,
      'public', b.public,
      'file_count', coalesce(s.file_count, 0),
      'bytes', coalesce(s.total_bytes, 0)
    )
  )
  INTO v_buckets
  FROM storage.buckets b
  LEFT JOIN (
    SELECT bucket_id, count(*) as file_count, sum(
      CASE 
        WHEN metadata->>'size' ~ '^[0-9]+$' THEN (metadata->>'size')::bigint 
        ELSE 0 
      END
    ) as total_bytes
    FROM storage.objects
    GROUP BY bucket_id
  ) s ON s.bucket_id = b.id;

  RETURN jsonb_build_object(
    'total_bytes', v_total_bytes,
    'total_files', v_total_files,
    'landing_media_bytes', v_landing_bytes,
    'landing_media_files', v_landing_files,
    'other_bytes', v_total_bytes - v_landing_bytes,
    'quota_bytes', v_quota_bytes,
    'remaining_bytes', v_remaining_bytes,
    'percent_used', v_percent_used,
    'buckets', coalesce(v_buckets, '[]'::jsonb),
    'as_of', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_storage_telemetry() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_storage_telemetry() TO anon;
