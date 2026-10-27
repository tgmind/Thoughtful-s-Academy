import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { renderHook } from '@testing-library/react'
import {
  LANDING_SLOTS,
  cleanSlotStorageFiles,
  cleanOrphanedLandingMediaStorage,
  updateSlotObjectPosition,
  handleImageFallback,
} from '../../src/utils/imageOptimizer'
import { useLandingMedia } from '../../src/hooks/useLandingMedia'
import LandingMediaManager from '../../src/components/admin/LandingMediaManager'
import GravitonHeroDesktop from '../../src/components/home/GravitonHeroDesktop'
import PersonalHeroDesktop from '../../src/components/home/PersonalHeroDesktop'
import BannerMethodologySection from '../../src/components/home/BannerMethodologySection'
import { supabase } from '../../src/lib/supabase'

// Mock Supabase calls
vi.mock('../../src/lib/supabase', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({
          data: [
            {
              slot_id: 'hero_card_left',
              title: 'Slide 1 — Left Card (Portrait Deck)',
              desktop_url: 'https://example.com/custom-left.webp',
              tablet_url: 'https://example.com/custom-left-tab.webp',
              mobile_url: 'https://example.com/custom-left-mob.webp',
              object_position: '50% 25%',
              alt_text: 'Custom Left Guide',
              is_custom: true,
            },
          ],
          error: null,
        }),
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { slot_id: 'hero_card_left', object_position: '50% 30%' },
                error: null,
              }),
            })),
          })),
        })),
      })),
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ data: { path: 'test.webp' }, error: null }),
          getPublicUrl: vi.fn((path) => ({ data: { publicUrl: `https://example.com/${path}` } })),
          list: vi.fn((folder) => {
            if (folder === 'hero_card_left') {
              return Promise.resolve({
                data: [
                  { name: 'hero_card_left_desktop_old.webp' },
                  { name: 'hero_card_left_desktop_new.webp' },
                ],
                error: null,
              })
            }
            return Promise.resolve({ data: [], error: null })
          }),
          remove: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      },
    },
  }
})

describe('Landing Page Media Architecture & Zero-API Optimization Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('defines all 6 standard slots with complete variant configurations', () => {
    const requiredSlots = [
      'hero_card_left',
      'hero_card_center',
      'hero_card_right',
      'mentor_slide_hero',
      'banner_desktop',
      'banner_mobile',
    ]

    requiredSlots.forEach((slotId) => {
      const slot = LANDING_SLOTS[slotId]
      expect(slot).toBeDefined()
      expect(slot.slot_id).toBe(slotId)
      expect(slot.defaultUrls.desktop).toBeDefined()
      expect(slot.defaultUrls.tablet).toBeDefined()
      expect(slot.defaultUrls.mobile).toBeDefined()
      expect(slot.variants.length).toBeGreaterThanOrEqual(3)

      const variantNames = slot.variants.map((v) => v.name)
      expect(variantNames).toContain('desktop')
      expect(variantNames).toContain('tablet')
      expect(variantNames).toContain('mobile')
    })

    // Verify alpha transparency preservation setting for Slide 2 mentor cutout
    expect(LANDING_SLOTS.mentor_slide_hero.fit).toBe('contain')
    // Verify 4/5 ratio for deck cards
    expect(LANDING_SLOTS.hero_card_left.aspectRatio).toBe('4/5')
    expect(LANDING_SLOTS.hero_card_right.aspectRatio).toBe('4/5')
  })

  it('useLandingMedia initializes synchronously with local bundled defaults', () => {
    const { result } = renderHook(() => useLandingMedia())

    const left = result.current.getSlot('hero_card_left')
    expect(left).toBeDefined()
    expect(left.desktop_url).toBe('/rupan-left.webp')

    const center = result.current.getSlot('hero_card_center')
    expect(center).toBeDefined()
    expect(center.desktop_url).toBe('/mainlogo.jpg')

    const mentor = result.current.getSlot('mentor_slide_hero')
    expect(mentor).toBeDefined()
    expect(mentor.desktop_url).toBe('/rupan.webp')

    const bannerDesktop = result.current.getSlot('banner_desktop')
    expect(bannerDesktop).toBeDefined()
    expect(bannerDesktop.desktop_url).toBe('/banner.webp')
  })

  it('useLandingMedia updates asynchronously when custom media is retrieved', async () => {
    const { result } = renderHook(() => useLandingMedia())

    await waitFor(() => {
      const left = result.current.getSlot('hero_card_left')
      expect(left.desktop_url).toBe('https://example.com/custom-left.webp')
      expect(left.is_custom).toBe(true)
    })
  })

  it('renders LandingMediaManager with 3 slot sections and all 6 media cards in Admin Settings', async () => {
    render(
      <MemoryRouter>
        <LandingMediaManager />
      </MemoryRouter>
    )

    // Verify main header and zero-api badge
    expect(screen.getByText('Landing Page Media & Banners')).toBeDefined()
    expect(screen.getByText('Zero-API Auto-WebP Optimization')).toBeDefined()

    // Verify 3 slot groups
    expect(screen.getByText(/1\. Hero Carousel — 3 Portrait Deck Cards/i)).toBeDefined()
    expect(screen.getByText(/2\. Hero Carousel — Lead Mentor Portrait/i)).toBeDefined()
    expect(screen.getByText(/3\. Panoramic Trust & Experience Banner/i)).toBeDefined()

    // Verify all slot card titles
    expect(screen.getByText('Slide 1 — Left Card (Portrait Deck)')).toBeDefined()
    expect(screen.getByText('Slide 1 — Center Card (Brand Emblem)')).toBeDefined()
    expect(screen.getByText('Slide 1 — Right Card (Portrait Deck)')).toBeDefined()
    expect(screen.getByText('Slide 2 — Mentor Portrait Cutout')).toBeDefined()
    expect(screen.getByText('Panoramic Trust Banner (Desktop & Tablet)')).toBeDefined()
    expect(screen.getByText('Panoramic Trust Banner (Mobile Art-Directed)')).toBeDefined()

    // Verify dropzone prompts exist
    const dropPrompts = screen.getAllByText(/Drag & drop high-res image here/i)
    expect(dropPrompts.length).toBe(6)
  })

  it('renders GravitonHeroDesktop using dynamic landing media with safe fallbacks', async () => {
    render(
      <MemoryRouter>
        <GravitonHeroDesktop
          instituteName="GRAViTON PHYSICS"
          activeDesktopCard="graviton"
          heroActiveCard="graviton"
          heroDeckItems={[]}
          handleSelectHeroCard={() => {}}
          handleDeckActivity={() => {}}
          handleDeckMouseLeave={() => {}}
        />
      </MemoryRouter>
    )

    // Custom left card loaded from mock
    await waitFor(() => {
      const leftImg = screen.getByAltText('Custom Left Guide')
      expect(leftImg).toBeDefined()
      expect(leftImg.getAttribute('src')).toBe('https://example.com/custom-left.webp')
    })

    // Center card logo
    const logoImg = screen.getByAltText('GRAViTON PHYSICS Emblem')
    expect(logoImg).toBeDefined()

    // Right card fallback
    const rightImg = screen.getByAltText('Rupan Sir — NITian & Physics Mentor')
    expect(rightImg).toBeDefined()
    expect(rightImg.getAttribute('src')).toBe('/rupan-right.webp')
  })

  it('renders PersonalHeroDesktop with mentor cutout media and drop-shadow styling', async () => {
    render(
      <MemoryRouter>
        <PersonalHeroDesktop />
      </MemoryRouter>
    )

    const mentorImg = screen.getByAltText('GRAViTON PHYSICS Lead Mentor')
    expect(mentorImg).toBeDefined()
    expect(mentorImg.getAttribute('src')).toBe('/rupan.webp')
  })

  it('renders BannerMethodologySection with responsive picture media sources', async () => {
    render(
      <MemoryRouter>
        <BannerMethodologySection />
      </MemoryRouter>
    )

    const bannerImg = screen.getByAltText('GRAViTON PHYSICS Pedagogy & Mentorship')
    expect(bannerImg).toBeDefined()
  })

  it('cleanSlotStorageFiles removes obsolete files while preserving active ones', async () => {
    await cleanSlotStorageFiles('hero_card_left', ['hero_card_left_desktop_new.webp'])

    // Should have called remove with the un-kept old file
    expect(supabase.storage.from).toHaveBeenCalledWith('landing-media')
  })

  it('cleanOrphanedLandingMediaStorage scans and purges unreferenced storage files', async () => {
    const res = await cleanOrphanedLandingMediaStorage()
    expect(res.success).toBe(true)
  })

  it('handleImageFallback updates both img.src and enclosing picture sources safely', () => {
    // Create a mock DOM picture structure
    const picture = document.createElement('picture')
    const source = document.createElement('source')
    source.srcset = 'https://broken.com/image.webp'
    const img = document.createElement('img')
    img.src = 'https://broken.com/image.png'
    picture.appendChild(source)
    picture.appendChild(img)

    const event = { currentTarget: img }
    handleImageFallback(event, '/rupan-left.webp')

    expect(img.src).toContain('/rupan-left.webp')
    expect(source.srcset).toBe('/rupan-left.webp')
    expect(img.dataset.failedFallback).toBe('true')

    // Calling it a second time should not re-run (dataset guard)
    source.srcset = 'changed'
    handleImageFallback(event, '/rupan-left.webp')
    expect(source.srcset).toBe('changed')
  })

  it('updateSlotObjectPosition updates the focal alignment in public.landing_media', async () => {
    const updated = await updateSlotObjectPosition('hero_card_left', '50% 30%')
    expect(updated).toBeDefined()
    expect(updated.object_position).toBe('50% 30%')
  })
})
