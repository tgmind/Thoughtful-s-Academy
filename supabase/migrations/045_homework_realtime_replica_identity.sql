-- ==============================================================================
-- Migration 045: Homework Realtime Replica Identity & Realtime Publication Sync
--
-- Enables REPLICA IDENTITY FULL on public.homework so that Supabase Realtime
-- broadcasts full row context (including batch_id, title, is_active) on DELETE
-- and UPDATE WAL change events. This ensures that student and teacher portal
-- realtime change listeners reliably receive and match change notifications.
-- ==============================================================================

ALTER TABLE public.homework REPLICA IDENTITY FULL;
