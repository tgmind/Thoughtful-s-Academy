-- Migration 051: Dynamic Social Media Links System
-- Allows administrators to manage, create, edit, reorder, and toggle social media buttons
-- displayed on the public landing page (YouTube, WhatsApp, Telegram, Instagram, Playstore, etc.)

CREATE TABLE IF NOT EXISTS public.social_media_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for performant querying by landing page
CREATE INDEX IF NOT EXISTS idx_social_media_links_active_order 
  ON public.social_media_links (is_active, display_order ASC, created_at ASC);

-- Enable Row Level Security
ALTER TABLE public.social_media_links ENABLE ROW LEVEL SECURITY;

-- 1. Public read policy (anyone can view social links)
DROP POLICY IF EXISTS "social_media_links: public read" ON public.social_media_links;
CREATE POLICY "social_media_links: public read"
  ON public.social_media_links FOR SELECT
  USING (true);

-- 2. Admin insert policy
DROP POLICY IF EXISTS "social_media_links: admin insert" ON public.social_media_links;
CREATE POLICY "social_media_links: admin insert"
  ON public.social_media_links FOR INSERT
  WITH CHECK (is_admin());

-- 3. Admin update policy
DROP POLICY IF EXISTS "social_media_links: admin update" ON public.social_media_links;
CREATE POLICY "social_media_links: admin update"
  ON public.social_media_links FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- 4. Admin delete policy
DROP POLICY IF EXISTS "social_media_links: admin delete" ON public.social_media_links;
CREATE POLICY "social_media_links: admin delete"
  ON public.social_media_links FOR DELETE
  USING (is_admin());

-- Seed default initial social channels for GRAViTON PHYSICS
INSERT INTO public.social_media_links (platform, title, url, display_order, is_active)
SELECT 'youtube', 'YouTube', 'https://www.youtube.com/@GRAViTONPHYSICS', 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.social_media_links WHERE platform = 'youtube');

INSERT INTO public.social_media_links (platform, title, url, display_order, is_active)
SELECT 'whatsapp', 'WhatsApp', 'https://wa.me/', 2, true
WHERE NOT EXISTS (SELECT 1 FROM public.social_media_links WHERE platform = 'whatsapp');

INSERT INTO public.social_media_links (platform, title, url, display_order, is_active)
SELECT 'telegram', 'Telegram', 'https://t.me/', 3, true
WHERE NOT EXISTS (SELECT 1 FROM public.social_media_links WHERE platform = 'telegram');

INSERT INTO public.social_media_links (platform, title, url, display_order, is_active)
SELECT 'instagram', 'Instagram', 'https://instagram.com/', 4, true
WHERE NOT EXISTS (SELECT 1 FROM public.social_media_links WHERE platform = 'instagram');

INSERT INTO public.social_media_links (platform, title, url, display_order, is_active)
SELECT 'playstore', 'Play Store', 'https://play.google.com/store/apps', 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.social_media_links WHERE platform = 'playstore');
