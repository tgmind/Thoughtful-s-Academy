import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { STUDENT_REVIEWS } from '../../src/components/home/studentReviewsData'
import StudentReviewsDesktop from '../../src/components/home/StudentReviewsDesktop'
import StudentReviewsMobile from '../../src/components/home/StudentReviewsMobile'

describe('Student Reviews Feature Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('provides at least 10 high-quality Indian student reviews covering key physics themes', () => {
    expect(STUDENT_REVIEWS.length).toBeGreaterThanOrEqual(10)

    const topics = STUDENT_REVIEWS.map(r => `${r.review} ${r.batch} ${r.highlight} ${r.examBadge}`.toLowerCase())
    const fullText = topics.join(' ')

    // Verify key subject matter requested
    expect(fullText).toContain('physics')
    expect(fullText).toContain('11')
    expect(fullText).toContain('12')
    expect(fullText).toContain('jee')
    expect(fullText).toContain('neet')
    expect(fullText).toContain('concept clarity')
    expect(fullText).toContain('hybrid')
    expect(fullText).toContain('doubt')
    expect(fullText).toContain('interactive')

    // Verify each review has required metadata
    STUDENT_REVIEWS.forEach(review => {
      expect(review.name).toBeTruthy()
      expect(review.review.length).toBeGreaterThan(20)
      expect(review.rating).toBe(5)
      expect(review.highlight).toBeTruthy()
    })
  })

  it('renders Desktop vertical reviews and pauses on mouse hover without responding to clicks', () => {
    const { container } = render(<StudentReviewsDesktop />)

    // Header elements
    expect(screen.getByText('Student Reviews')).toBeInTheDocument()
    expect(screen.getByText('4.9 / 5')).toBeInTheDocument()
    expect(screen.getByText('Auto-scrolling Reviews')).toBeInTheDocument()

    // Verify student name is rendered
    expect(screen.getAllByText(STUDENT_REVIEWS[0].name).length).toBeGreaterThanOrEqual(1)

    // Locate the root interactive container
    const reviewRegion = screen.getByRole('region', { name: /Student Testimonials/i })

    // Hover pauses scrolling
    fireEvent.mouseEnter(reviewRegion)
    expect(screen.getByText('Paused on Hover')).toBeInTheDocument()

    // Advance timer while paused - index should not advance
    act(() => {
      vi.advanceTimersByTime(3500)
    })
    expect(screen.getByText('Paused on Hover')).toBeInTheDocument()

    // Mouse leave resumes scrolling
    fireEvent.mouseLeave(reviewRegion)
    expect(screen.getByText('Auto-scrolling Reviews')).toBeInTheDocument()

    // Mouse click has no side effects (prevented)
    const clickEvent = fireEvent.click(reviewRegion)
    expect(clickEvent).toBe(false) // click default is prevented
  })

  it('renders Mobile horizontal rolling cards and supports touch pause & next/prev navigation', () => {
    render(<StudentReviewsMobile />)

    // Header elements
    expect(screen.getByText('What Our Students Say')).toBeInTheDocument()
    expect(screen.getByText(/Real feedback from Class 11, 12, JEE & NEET cohorts/i)).toBeInTheDocument()

    // Verify arrow buttons exist
    const prevBtn = screen.getByRole('button', { name: /Previous review/i })
    const nextBtn = screen.getByRole('button', { name: /Next review/i })
    expect(prevBtn).toBeInTheDocument()
    expect(nextBtn).toBeInTheDocument()

    // Click next review
    fireEvent.click(nextBtn)
    expect(screen.getByText('Paused')).toBeInTheDocument()

    // Auto roll status indicator resumes after inactivity
    act(() => {
      vi.advanceTimersByTime(5500)
    })
    expect(screen.getByText('Auto-rolling')).toBeInTheDocument()
  })
})
