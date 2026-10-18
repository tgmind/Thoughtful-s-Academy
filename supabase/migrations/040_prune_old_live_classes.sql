-- ============================================================================
-- Migration 040: Auto-prune old live classes beyond the 20 most recent past entries
-- ============================================================================

-- 1. Initial cleanup: If there are more than 20 past inactive live classes, prune older ones
DELETE FROM public.live_classes
WHERE is_active = false
  AND id NOT IN (
    SELECT id
    FROM public.live_classes
    WHERE is_active = false
    ORDER BY created_at DESC, id DESC
    LIMIT 20
  );

-- 2. Trigger function to prune old inactive live classes beyond 20 entries
-- SECURITY DEFINER ensures teachers (who have UPDATE but not DELETE RLS) can end classes
-- without hitting permission errors when older rows are auto-pruned.
CREATE OR REPLACE FUNCTION public.prune_old_live_classes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.live_classes
  WHERE is_active = false
    AND id NOT IN (
      SELECT id
      FROM public.live_classes
      WHERE is_active = false
      ORDER BY created_at DESC, id DESC
      LIMIT 20
    );
  RETURN NULL;
END;
$$;

-- 3. Trigger on INSERT or UPDATE of live_classes
DROP TRIGGER IF EXISTS trg_prune_old_live_classes ON public.live_classes;

CREATE TRIGGER trg_prune_old_live_classes
AFTER INSERT OR UPDATE ON public.live_classes
FOR EACH STATEMENT
EXECUTE FUNCTION public.prune_old_live_classes();
