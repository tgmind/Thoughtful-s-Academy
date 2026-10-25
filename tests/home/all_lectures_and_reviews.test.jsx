import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AllLecturesSection from '../../src/components/home/AllLecturesSection'
import StudentReviewsDesktop from '../../src/components/home/StudentReviewsDesktop'

const mockCards = [
  { id: '1', title: 'Newton Laws of Motion', subject: 'Physics', type: 'video', is_featured: false, url: 'https://youtube.com/watch?v=1' },
  { id: '2', title: 'Thermodynamics & Heat', subject: 'Physics', type: 'video', is_featured: false, url: 'https://youtube.com/watch?v=2' },
  { id: '3', title: 'Electrostatics & Gauss Law', subject: 'Physics', type: 'video', is_featured: false, url: 'https://youtube.com/watch?v=3' },
  { id: '4', title: 'Optics & Wave Nature', subject: 'Physics', type: 'video', is_featured: false, url: 'https://youtube.com/watch?v=4' },
  { id: '5', title: 'Rotational Dynamics', subject: 'Physics', type: 'video', is_featured: false, url: 'https://youtube.com/watch?v=5' },
  { id: '6', title: 'Modern Physics & Dual Nature', subject: 'Physics', type: 'video', is_featured: false, url: 'https://youtube.com/watch?v=6' },
]

const mockBatches = [
  { id: 'b1', name: 'Foundation 11th' },
  { id: 'b2', name: 'Target JEE 12th' },
]

describe('All Lectures & Desktop Reviews Suite', () => {
  describe('AllLecturesSection', () => {
    it('renders single unified header and both desktop grid & mobile swipe view', () => {
      render(
        <MemoryRouter>
          <AllLecturesSection
            cards={mockCards}
            visibleCards={mockCards}
            loading={false}
            batches={mockBatches}
            activeBatch="all"
            setActiveBatch={vi.fn()}
            totalCards={6}
            totalPages={1}
            page={1}
            setPage={vi.fn()}
            dynamicPageSize={6}
            getCardWidthClass={() => 'test-card-width'}
          />
        </MemoryRouter>
      )

      expect(screen.getByText('All lectures')).toBeInTheDocument()
      expect(screen.getByText('6 Curated Lessons')).toBeInTheDocument()

      // Desktop section contains all cards
      expect(screen.getAllByText('Newton Laws of Motion').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Modern Physics & Dual Nature').length).toBeGreaterThanOrEqual(1)

      // Mobile swipe section is present for cards 5+
      expect(screen.getByText('More in this Batch')).toBeInTheDocument()
      expect(screen.getByText('+2 more')).toBeInTheDocument()
      expect(screen.getByText(/Swipe horizontally to explore/i)).toBeInTheDocument()
    })

    it('does not display mobile swipe section when total cards <= 4', () => {
      const fourCards = mockCards.slice(0, 4)
      render(
        <MemoryRouter>
          <AllLecturesSection
            cards={fourCards}
            visibleCards={fourCards}
            loading={false}
            batches={mockBatches}
            activeBatch="all"
            setActiveBatch={vi.fn()}
            totalCards={4}
            totalPages={1}
            page={1}
            setPage={vi.fn()}
            dynamicPageSize={4}
            getCardWidthClass={() => 'test-card-width'}
          />
        </MemoryRouter>
      )

      expect(screen.getByText('All lectures')).toBeInTheDocument()
      expect(screen.queryByText('More in this Batch')).not.toBeInTheDocument()
      expect(screen.queryByText(/more$/i)).not.toBeInTheDocument()
    })
  })

  describe('StudentReviewsDesktop', () => {
    it('has no pill badges in the header and uses styled text hierarchy', () => {
      const { container } = render(<StudentReviewsDesktop targetHeight={650} />)

      // Verified text is present as styled typography
      expect(screen.getByText('Verified Feedback')).toBeInTheDocument()
      // Rating is present
      expect(screen.getByText('4.9 / 5')).toBeInTheDocument()

      // Verify that no header child elements have rounded-full pill styling with amber border
      const header = container.querySelector('.bg-gradient-to-r')
      expect(header).toBeInTheDocument()

      // The old pill badge was: "rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30"
      const oldPill = header.querySelector('.bg-amber-400\\/20')
      expect(oldPill).toBeNull()

      // The rating was inside a pill: "px-2 py-0.5 rounded-full bg-white/10"
      const oldRatingPill = header.querySelector('.rounded-full.bg-white\\/10')
      expect(oldRatingPill).toBeNull()
    })

    it('dynamically applies the targetHeight style to match the All Lectures section', () => {
      const { container } = render(<StudentReviewsDesktop targetHeight={640} />)
      const rootDiv = container.firstChild
      expect(rootDiv).toHaveStyle({ height: '640px', maxHeight: '640px' })
    })

    it('adapts cleanly to shorter All Lectures heights without overflowing or exceeding', () => {
      // For a 1-row All Lectures section, targetHeight is around 260px
      const { container } = render(<StudentReviewsDesktop targetHeight={260} />)
      const rootDiv = container.firstChild
      expect(rootDiv).toHaveStyle({ height: '260px', maxHeight: '260px' })

      // The viewport div must have min-h-0 rather than min-h-[300px]
      const viewport = rootDiv.querySelector('.overflow-hidden.bg-white')
      expect(viewport).toBeInTheDocument()
      expect(viewport.className).toContain('min-h-0')
      expect(viewport.className).not.toContain('min-h-[300px]')
    })
  })
})
