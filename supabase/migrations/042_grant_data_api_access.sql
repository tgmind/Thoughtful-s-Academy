-- ============================================================================
-- Migration 042: Explicit Data API Grants and Automatic Default Privileges
-- Supabase Oct 30 Data API Exposure Hardening
-- ============================================================================

-- 1. Explicitly grant permissions on all existing tables in public schema
--    to 'authenticated' (for logged-in students, teachers, admins via supabase-js)
--    and 'service_role' (for Edge Functions, Webhooks, backend administration).
--    Row Level Security (RLS) continues to strictly enforce row-level authorization.

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- 2. Explicitly grant permissions on specific public-facing tables to 'anon' (unauthenticated users)
--    for landing page previews, course catalogs, free study materials, and QR code settings.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'batches') THEN
    GRANT SELECT ON public.batches TO anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chapters') THEN
    GRANT SELECT ON public.chapters TO anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'study_cards') THEN
    GRANT SELECT ON public.study_cards TO anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'qr_settings') THEN
    GRANT SELECT ON public.qr_settings TO anon;
  END IF;
END $$;

-- 3. Explicitly grant sequence and function execution privileges
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- 4. Future-proofing: Configure DEFAULT PRIVILEGES for any new tables, sequences,
--    and functions created in public. This guarantees you never have to manually
--    worry about missing grants when adding new migrations or tables in the future.

-- Current role default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;

-- Explicitly ensure default privileges for the 'postgres' role
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    BEGIN
      ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
      ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
        GRANT ALL ON TABLES TO service_role;
      ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
        GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
      ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
        GRANT ALL ON SEQUENCES TO service_role;
      ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
        GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not set default privileges for role postgres: %', SQLERRM;
    END;
  END IF;
END $$;
