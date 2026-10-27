-- Migration 052: Dynamic Landing Page Media & Banner Management System
-- Enables administrators to manage, replace, and fine-tune banners, hero deck cards,
-- and mentor cutout portrait with automatic browser-side WebP optimization.

-- 1. Ensure landing-media storage bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('landing-media', 'landing-media', true, 10485760, ARRAY['image/webp', 'image/png', 'image/jpeg'])
  ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/webp', 'image/png', 'image/jpeg'];

-- 2. Storage RLS Policies
DROP POLICY IF EXISTS "landing-media: public read" ON storage.objects;
DROP POLICY IF EXISTS "landing-media: admin upload" ON storage.objects;
DROP POLICY IF EXISTS "landing-media: admin update" ON storage.objects;
DROP POLICY IF EXISTS "landing-media: admin delete" ON storage.objects;

CREATE POLICY "landing-media: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'landing-media');

CREATE POLICY "landing-media: admin upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'landing-media' AND is_admin());

CREATE POLICY "landing-media: admin update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'landing-media' AND is_admin())
  WITH CHECK (bucket_id = 'landing-media' AND is_admin());

CREATE POLICY "landing-media: admin delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'landing-media' AND is_admin());

-- 3. Create landing_media Table
CREATE TABLE IF NOT EXISTS public.landing_media (
  slot_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  section TEXT NOT NULL,
  desktop_url TEXT NOT NULL,
  tablet_url TEXT,
  mobile_url TEXT,
  object_position TEXT NOT NULL DEFAULT '50% 50%',
  alt_text TEXT NOT NULL DEFAULT '',
  aspect_ratio TEXT NOT NULL DEFAULT '4/5',
  is_custom BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.landing_media ENABLE ROW LEVEL SECURITY;

-- 4. Table RLS Policies
DROP POLICY IF EXISTS "landing_media: public read" ON public.landing_media;
DROP POLICY IF EXISTS "landing_media: admin insert" ON public.landing_media;
DROP POLICY IF EXISTS "landing_media: admin update" ON public.landing_media;
DROP POLICY IF EXISTS "landing_media: admin delete" ON public.landing_media;

CREATE POLICY "landing_media: public read"
  ON public.landing_media FOR SELECT
  USING (true);

CREATE POLICY "landing_media: admin insert"
  ON public.landing_media FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "landing_media: admin update"
  ON public.landing_media FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "landing_media: admin delete"
  ON public.landing_media FOR DELETE
  USING (is_admin());

-- 5. Seed Initial Default Slots with Standard Assets
INSERT INTO public.landing_media (slot_id, title, section, desktop_url, tablet_url, mobile_url, object_position, alt_text, aspect_ratio, is_custom)
VALUES
  (
    'hero_card_left',
    'Slide 1 — Left Card (Portrait Deck)',
    'Hero Carousel (Slide 1)',
    '/rupan-left.webp',
    '/rupan-left.webp',
    '/rupan-left.webp',
    '50% 28%',
    'Rupan Sir — Gold Medalist, 1st Convocation MBBU',
    '4/5',
    false
  ),
  (
    'hero_card_center',
    'Slide 1 — Center Card (Brand Emblem)',
    'Hero Carousel (Slide 1)',
    '/mainlogo.jpg',
    '/mainlogo.jpg',
    '/mainlogo.jpg',
    'center center',
    'GRAViTON PHYSICS Emblem',
    '4/5',
    false
  ),
  (
    'hero_card_right',
    'Slide 1 — Right Card (Portrait Deck)',
    'Hero Carousel (Slide 1)',
    '/rupan-right.webp',
    '/rupan-right.webp',
    '/rupan-right.webp',
    '50% 24%',
    'Rupan Sir — NITian & Physics Mentor',
    '4/5',
    false
  ),
  (
    'mentor_slide_hero',
    'Slide 2 — Mentor Portrait Cutout',
    'Hero Carousel (Slide 2 - Mentor)',
    '/rupan.webp',
    '/rupan.webp',
    '/rupan.webp',
    'center bottom',
    'GRAViTON PHYSICS Lead Mentor',
    'contain',
    false
  ),
  (
    'banner_desktop',
    'Panoramic Trust Banner (Desktop & Tablet)',
    'Trust & Methodology Banner',
    '/banner.webp',
    '/banner-1200.webp',
    '/banner-720.webp',
    '50% 20%',
    'GRAViTON PHYSICS Pedagogy & Mentorship',
    '3/1',
    false
  ),
  (
    'banner_mobile',
    'Panoramic Trust Banner (Mobile Art-Directed)',
    'Trust & Methodology Banner',
    '/banner-mobile.webp',
    '/banner-mobile.webp',
    '/banner-mobile-600.webp',
    'center center',
    'GRAViTON PHYSICS Pedagogy & Mentorship Mobile',
    '4/3',
    false
  )
ON CONFLICT (slot_id) DO NOTHING;
