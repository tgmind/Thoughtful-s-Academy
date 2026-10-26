import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BannerMethodologySection from '../../src/components/home/BannerMethodologySection'

describe('Banner & Methodology Overlay Section', () => {
  it('renders the panoramic physics mentorship banner with high-performance responsive WebP sources', () => {
    const { container } = render(
      <MemoryRouter>
        <BannerMethodologySection />
      </MemoryRouter>
    )

    // Check banner image and picture sources
    const img = screen.getByAltText(/GRAViTON PHYSICS Pedagogy & Mentorship/i)
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('decoding', 'async')
    expect(img).toHaveAttribute('width', '2172')
    expect(img).toHaveAttribute('height', '724')

    const picture = container.querySelector('picture')
    expect(picture).toBeInTheDocument()

    const sources = picture.querySelectorAll('source')
    expect(sources.length).toBeGreaterThanOrEqual(2)

    // Desktop source
    const desktopSource = Array.from(sources).find(s => s.getAttribute('srcset')?.includes('banner-1200.webp'))
    expect(desktopSource).toBeTruthy()
    expect(desktopSource.getAttribute('srcset')).toContain('banner-720.webp')
    expect(desktopSource.getAttribute('srcset')).toContain('banner-1200.webp')
    expect(desktopSource.getAttribute('srcset')).toContain('banner.webp')

    // Mobile source
    const mobileSource = Array.from(sources).find(s => s.getAttribute('srcset')?.includes('banner-mobile.webp'))
    expect(mobileSource).toBeTruthy()
    expect(mobileSource.getAttribute('srcset')).toContain('banner-mobile-600.webp')
  })

  it('renders stylized experience headline with highlighted NITian and Goldmedalist distinctions', () => {
    render(
      <MemoryRouter>
        <BannerMethodologySection />
      </MemoryRouter>
    )

    // Check stylized experience headline
    expect(screen.getAllByRole('heading', { name: /6\+ Years of Teaching Experience/i }).length).toBeGreaterThanOrEqual(1)

    // Check highlighted NITian and Goldmedalist badges
    expect(screen.getAllByText(/NITian/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Goldmedalist/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/brings the best learning experience right to your fingertips/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders all four color-accented methodology cards overlapping the banner bottom margin', () => {
    const { container } = render(
      <MemoryRouter>
        <BannerMethodologySection />
      </MemoryRouter>
    )

    // 1. Live & Recorded Classes
    expect(screen.getByText(/Live & Recorded Classes/i)).toBeInTheDocument()
    expect(screen.getByText(/Attend daily interactive lectures live/i)).toBeInTheDocument()

    // 2. Personal Doubt Support
    expect(screen.getByText(/Personal Doubt Support/i)).toBeInTheDocument()
    expect(screen.getByText(/Message your educator directly or ask doubts/i)).toBeInTheDocument()

    // 3. Handwritten Notes & DPPs
    expect(screen.getByText(/Handwritten Notes & DPPs/i)).toBeInTheDocument()
    expect(screen.getByText(/Concise formula sheets, chapter notes/i)).toBeInTheDocument()

    // 4. Consistency & Attendance
    expect(screen.getByText(/Consistency & Attendance/i)).toBeInTheDocument()
    expect(screen.getByText(/Daily streak tracking, attendance gauges/i)).toBeInTheDocument()

    // Verify negative top margin for bottom margin overlap (not covering entire banner)
    const overlayContainer = container.querySelector('.-mt-6, .-mt-8, .-mt-10, .-mt-12, .-mt-16, .-mt-20, .-mt-24')
    expect(overlayContainer).toBeInTheDocument()
  })
})
