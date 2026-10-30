import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HeroCarouselDesktop from '../../src/components/home/HeroCarouselDesktop'
import HeroCarouselMobile from '../../src/components/home/HeroCarouselMobile'
import GravitonHeroMobile from '../../src/components/home/GravitonHeroMobile'

const mockHeroDeckItems = [
  { id: 'einstein', index: 0, isInitial: false },
  { id: 'graviton', index: 1, isInitial: true },
  { id: 'feynman', index: 2, isInitial: false },
]

describe('Hero Carousel — Fast Cadence & Unidirectional Right-to-Left Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Desktop: mounts with Slide 1 (GRAViTON PHYSICS) active and displays institute headline', () => {
    render(
      <MemoryRouter>
        <HeroCarouselDesktop
          instituteName="GRAViTON PHYSICS"
          heroActiveCard="graviton"
          activeDesktopCard="graviton"
          heroDeckItems={mockHeroDeckItems}
          handleSelectHeroCard={vi.fn()}
          handleDeckActivity={vi.fn()}
          handleDeckMouseLeave={vi.fn()}
        />
      </MemoryRouter>
    )

    // Slide 1 elements present
    expect(screen.getAllByText(/Empowering Concepts. Building Toppers./i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/GRAViTON PHYSICS/i).length).toBeGreaterThan(0)

    // Visual segment indicator dock: Segment 0 active
    const academyTabs = screen.getAllByRole('tab', { name: /Slide 1: Institute Overview/i })
    expect(academyTabs[0].getAttribute('aria-selected')).toBe('true')
  })

  it('Desktop: automatically transitions to Slide 2 after 4500ms interval', () => {
    render(
      <MemoryRouter>
        <HeroCarouselDesktop
          instituteName="GRAViTON PHYSICS"
          heroActiveCard="graviton"
          activeDesktopCard="graviton"
          heroDeckItems={mockHeroDeckItems}
          handleSelectHeroCard={vi.fn()}
          handleDeckActivity={vi.fn()}
          handleDeckMouseLeave={vi.fn()}
        />
      </MemoryRouter>
    )

    const mentorTabs = screen.getAllByRole('tab', { name: /Slide 2: Meet Your Mentor/i })
    expect(mentorTabs[0].getAttribute('aria-selected')).toBe('false')

    // Advance timer by 4500ms (fast cadence)
    act(() => {
      vi.advanceTimersByTime(4500)
    })

    // Now Slide 2 is active
    expect(mentorTabs[0].getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('heading', { name: /Meet Your Mentor/i })).toBeInTheDocument()
    expect(screen.getByAltText(/GRAViTON PHYSICS Lead Mentor/i)).toBeInTheDocument()
  })

  it('Desktop: seamless right-to-left loop returns to Slide 1 after another 4500ms', () => {
    render(
      <MemoryRouter>
        <HeroCarouselDesktop
          instituteName="GRAViTON PHYSICS"
          heroActiveCard="graviton"
          activeDesktopCard="graviton"
          heroDeckItems={mockHeroDeckItems}
          handleSelectHeroCard={vi.fn()}
          handleDeckActivity={vi.fn()}
          handleDeckMouseLeave={vi.fn()}
        />
      </MemoryRouter>
    )

    // 1st transition -> Slide 2 (4500ms)
    act(() => {
      vi.advanceTimersByTime(4500)
    })
    const mentorTabs = screen.getAllByRole('tab', { name: /Slide 2: Meet Your Mentor/i })
    expect(mentorTabs[0].getAttribute('aria-selected')).toBe('true')

    // 2nd transition -> Slide 1 (4500ms)
    act(() => {
      vi.advanceTimersByTime(4500)
    })
    const academyTabs = screen.getAllByRole('tab', { name: /Slide 1: Institute Overview/i })
    expect(academyTabs[0].getAttribute('aria-selected')).toBe('true')
  })

  it('Desktop: pauses auto-rotation on mouse hover and resumes on mouse leave when pauseOnHover is enabled', () => {
    const { container } = render(
      <MemoryRouter>
        <HeroCarouselDesktop
          instituteName="GRAViTON PHYSICS"
          heroActiveCard="graviton"
          activeDesktopCard="graviton"
          heroDeckItems={mockHeroDeckItems}
          handleSelectHeroCard={vi.fn()}
          handleDeckActivity={vi.fn()}
          handleDeckMouseLeave={vi.fn()}
          pauseOnHover={true}
        />
      </MemoryRouter>
    )

    const carouselSection = container.querySelector('section')

    // Mouse enter: should pause
    fireEvent.mouseEnter(carouselSection)
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    // Still on Slide 1 because it was paused
    const academyTabs = screen.getAllByRole('tab', { name: /Slide 1: Institute Overview/i })
    expect(academyTabs[0].getAttribute('aria-selected')).toBe('true')

    // Mouse leave: should resume
    fireEvent.mouseLeave(carouselSection)
    act(() => {
      vi.advanceTimersByTime(4500)
    })

    const mentorTabs = screen.getAllByRole('tab', { name: /Slide 2: Meet Your Mentor/i })
    expect(mentorTabs[0].getAttribute('aria-selected')).toBe('true')
  })

  it('Desktop: continuously auto-rotates without stopping on hover by default', () => {
    const { container } = render(
      <MemoryRouter>
        <HeroCarouselDesktop
          instituteName="GRAViTON PHYSICS"
          heroActiveCard="graviton"
          activeDesktopCard="graviton"
          heroDeckItems={mockHeroDeckItems}
          handleSelectHeroCard={vi.fn()}
          handleDeckActivity={vi.fn()}
          handleDeckMouseLeave={vi.fn()}
        />
      </MemoryRouter>
    )

    const carouselSection = container.querySelector('section')

    // Mouse enter on generic banner area: should NOT pause by default
    fireEvent.mouseEnter(carouselSection)
    act(() => {
      vi.advanceTimersByTime(4500)
    })

    // Auto-advances to Slide 2 continuously
    const mentorTabs = screen.getAllByRole('tab', { name: /Slide 2: Meet Your Mentor/i })
    expect(mentorTabs[0].getAttribute('aria-selected')).toBe('true')
  })

  it('Desktop: pauses auto-rotation when hovering over any of the CTA buttons ("Explore All Batches", "Login", "Register Free") and resumes when pointer moves away', () => {
    render(
      <MemoryRouter>
        <HeroCarouselDesktop
          instituteName="GRAViTON PHYSICS"
          heroActiveCard="graviton"
          activeDesktopCard="graviton"
          heroDeckItems={mockHeroDeckItems}
          handleSelectHeroCard={vi.fn()}
          handleDeckActivity={vi.fn()}
          handleDeckMouseLeave={vi.fn()}
        />
      </MemoryRouter>
    )

    // Starts on Slide 1
    const academyTabs = screen.getAllByRole('tab', { name: /Slide 1: Institute Overview/i })
    expect(academyTabs[0].getAttribute('aria-selected')).toBe('true')

    // Hover mouse pointer over "Explore All Batches" button
    const exploreBtn = screen.getAllByRole('link', { name: /Explore All Batches/i })[0]
    fireEvent.mouseEnter(exploreBtn)

    // Advance timer past 4500ms
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    // Carousel MUST remain paused on Slide 1 while hovering CTA button
    expect(academyTabs[0].getAttribute('aria-selected')).toBe('true')

    // Pointer moves away from the button
    fireEvent.mouseLeave(exploreBtn)

    // Natural sliding resumes and advances to Slide 2 after 4500ms
    act(() => {
      vi.advanceTimersByTime(4500)
    })

    const mentorTabs = screen.getAllByRole('tab', { name: /Slide 2: Meet Your Mentor/i })
    expect(mentorTabs[0].getAttribute('aria-selected')).toBe('true')
  })

  it('Desktop: pauses auto-rotation when hovering over any of the 3 hero cards and resumes when pointer moves away', () => {
    render(
      <MemoryRouter>
        <HeroCarouselDesktop
          instituteName="GRAViTON PHYSICS"
          heroActiveCard="graviton"
          activeDesktopCard="graviton"
          heroDeckItems={mockHeroDeckItems}
          handleSelectHeroCard={vi.fn()}
          handleDeckActivity={vi.fn()}
          handleDeckMouseLeave={vi.fn()}
        />
      </MemoryRouter>
    )

    // Starts on Slide 1
    const academyTabs = screen.getAllByRole('tab', { name: /Slide 1: Institute Overview/i })
    expect(academyTabs[0].getAttribute('aria-selected')).toBe('true')

    // Hover mouse pointer over the left card (Convocation portrait)
    const cardImg = screen.getAllByAltText(/Rupan Sir — Gold Medalist/i)[0]
    const cardEl = cardImg.closest('.cursor-pointer') || cardImg
    fireEvent.mouseEnter(cardEl)

    // Advance timer past 4500ms
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    // Carousel MUST remain paused on Slide 1 while hovering hero card
    expect(academyTabs[0].getAttribute('aria-selected')).toBe('true')

    // Pointer moves away from the card
    fireEvent.mouseLeave(cardEl)

    // Natural sliding resumes and advances to Slide 2
    act(() => {
      vi.advanceTimersByTime(4500)
    })

    const mentorTabs = screen.getAllByRole('tab', { name: /Slide 2: Meet Your Mentor/i })
    expect(mentorTabs[0].getAttribute('aria-selected')).toBe('true')
  })

  it('Desktop: supports manual slide switching via modern visual indicator segments', () => {
    render(
      <MemoryRouter>
        <HeroCarouselDesktop
          instituteName="GRAViTON PHYSICS"
          heroActiveCard="graviton"
          activeDesktopCard="graviton"
          heroDeckItems={mockHeroDeckItems}
          handleSelectHeroCard={vi.fn()}
          handleDeckActivity={vi.fn()}
          handleDeckMouseLeave={vi.fn()}
        />
      </MemoryRouter>
    )

    const mentorTab = screen.getAllByRole('tab', { name: /Slide 2: Meet Your Mentor/i })[0]
    fireEvent.click(mentorTab)

    expect(mentorTab.getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('heading', { name: /Meet Your Mentor/i })).toBeInTheDocument()
  })

  it('Desktop: scrolling down upon landing intercepts scroll and transitions to Slide 2, unlocking subsequent scrolls once revealed', () => {
    window.scrollY = 0

    render(
      <MemoryRouter>
        <HeroCarouselDesktop
          instituteName="GRAViTON PHYSICS"
          heroActiveCard="graviton"
          activeDesktopCard="graviton"
          heroDeckItems={mockHeroDeckItems}
          handleSelectHeroCard={vi.fn()}
          handleDeckActivity={vi.fn()}
          handleDeckMouseLeave={vi.fn()}
        />
      </MemoryRouter>
    )

    // Initial state: Slide 1 active
    const mentorTabs = screen.getAllByRole('tab', { name: /Slide 2: Meet Your Mentor/i })
    expect(mentorTabs[0].getAttribute('aria-selected')).toBe('false')

    // 1. User scrolls down upon landing on page
    const firstWheelEvent = new WheelEvent('wheel', { deltaY: 120, cancelable: true, bubbles: true })
    act(() => {
      window.dispatchEvent(firstWheelEvent)
    })

    // Downward scroll must be intercepted (default prevented) to avoid skipping hero
    expect(firstWheelEvent.defaultPrevented).toBe(true)

    // Slide 2 is now transitioning/active
    expect(mentorTabs[0].getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('heading', { name: /Meet Your Mentor/i })).toBeInTheDocument()

    // 2. Momentum wheel ticks during transition (~700ms) are absorbed
    const momentumWheelEvent = new WheelEvent('wheel', { deltaY: 80, cancelable: true, bubbles: true })
    act(() => {
      window.dispatchEvent(momentumWheelEvent)
    })
    expect(momentumWheelEvent.defaultPrevented).toBe(true)

    // 3. Fast-forward past transition completion (750ms)
    act(() => {
      vi.advanceTimersByTime(800)
    })

    // 4. Once Slide 2 has appeared, subsequent downward scrolls are NOT prevented
    const subsequentWheelEvent = new WheelEvent('wheel', { deltaY: 100, cancelable: true, bubbles: true })
    act(() => {
      window.dispatchEvent(subsequentWheelEvent)
    })
    expect(subsequentWheelEvent.defaultPrevented).toBe(false)
  })

  it('Mobile: renders dedicated mobile layout and transitions automatically with 4500ms cadence', () => {
    render(
      <MemoryRouter>
        <HeroCarouselMobile
          instituteName="GRAViTON PHYSICS"
          heroActiveCard="graviton"
          mobileHeroCard="graviton"
          heroDeckItems={mockHeroDeckItems}
          handleSelectHeroCard={vi.fn()}
          handleDeckActivity={vi.fn()}
        />
      </MemoryRouter>
    )

    // Starts on Slide 1
    const mobileAcademyTab = screen.getAllByRole('tab', { name: /Slide 1: Institute Overview/i })[0]
    expect(mobileAcademyTab.getAttribute('aria-selected')).toBe('true')

    // Advances to Slide 2
    act(() => {
      vi.advanceTimersByTime(4500)
    })

    const mobileMentorTab = screen.getAllByRole('tab', { name: /Slide 2: Meet Your Mentor/i })[0]
    expect(mobileMentorTab.getAttribute('aria-selected')).toBe('true')
  })

  it('Mobile: supports touch swipe left to advance right-to-left to personal mentor slide', () => {
    const { container } = render(
      <MemoryRouter>
        <HeroCarouselMobile
          instituteName="GRAViTON PHYSICS"
          heroActiveCard="graviton"
          mobileHeroCard="graviton"
          heroDeckItems={mockHeroDeckItems}
          handleSelectHeroCard={vi.fn()}
          handleDeckActivity={vi.fn()}
        />
      </MemoryRouter>
    )

    const section = container.querySelector('section')

    // Simulate swipe left
    fireEvent.touchStart(section, { touches: [{ clientX: 200 }] })
    fireEvent.touchMove(section, { touches: [{ clientX: 100 }] })
    fireEvent.touchEnd(section)

    const mobileMentorTab = screen.getAllByRole('tab', { name: /Slide 2: Meet Your Mentor/i })[0]
    expect(mobileMentorTab.getAttribute('aria-selected')).toBe('true')
  })

  it('Mobile: hero cards stay static without levitating animation loop and trigger tap-to-show', () => {
    const handleSelectCard = vi.fn()
    render(
      <MemoryRouter>
        <GravitonHeroMobile
          instituteName="GRAViTON PHYSICS"
          heroActiveCard="graviton"
          mobileHeroCard="graviton"
          heroDeckItems={mockHeroDeckItems}
          handleSelectHeroCard={handleSelectCard}
          handleDeckActivity={vi.fn()}
        />
      </MemoryRouter>
    )

    // Tap on the flanking left card (Gold Medalist)
    const leftCardImg = screen.getByAltText(/Rupan Sir — Gold Medalist/i)
    fireEvent.click(leftCardImg.closest('div[class*="cursor-pointer"]'))
    expect(handleSelectCard).toHaveBeenCalledWith('einstein')

    // Tap on the flanking right card (NITian & Physics Mentor)
    const rightCardImg = screen.getByAltText(/Rupan Sir — NITian & Physics Mentor/i)
    fireEvent.click(rightCardImg.closest('div[class*="cursor-pointer"]'))
    expect(handleSelectCard).toHaveBeenCalledWith('feynman')

    // Tap on center card
    const centerCardImg = screen.getByAltText(/GRAViTON PHYSICS Emblem|Logo/i)
    fireEvent.click(centerCardImg.closest('div[class*="cursor-pointer"]'))
    expect(handleSelectCard).toHaveBeenCalledWith('graviton')
  })

  it('Desktop: hero cards feature compositor-accelerated floating buoyancy classes synchronized across Slide 0 and Slide 2 (Clone)', () => {
    const { container } = render(
      <MemoryRouter>
        <HeroCarouselDesktop
          instituteName="GRAViTON PHYSICS"
          heroActiveCard="graviton"
          activeDesktopCard="graviton"
          heroDeckItems={mockHeroDeckItems}
          handleSelectHeroCard={vi.fn()}
          handleDeckActivity={vi.fn()}
          handleDeckMouseLeave={vi.fn()}
        />
      </MemoryRouter>
    )

    // Initial state: Slide 0 has left, center, and right floating classes
    expect(container.querySelectorAll('.hero-card-float-left').length).toBe(1)
    expect(container.querySelectorAll('.hero-card-float-center').length).toBe(1)
    expect(container.querySelectorAll('.hero-card-float-right').length).toBe(1)

    // Advance to transition (Slide 2 clone mounts alongside Slide 0)
    act(() => {
      vi.advanceTimersByTime(4500)
    })

    // Both Slide 0 and Slide 2 Clone feature floating buoyancy classes in lockstep
    const floatLeftCards = container.querySelectorAll('.hero-card-float-left')
    const floatCenterCards = container.querySelectorAll('.hero-card-float-center')
    const floatRightCards = container.querySelectorAll('.hero-card-float-right')

    expect(floatLeftCards.length).toBeGreaterThanOrEqual(2)
    expect(floatCenterCards.length).toBeGreaterThanOrEqual(2)
    expect(floatRightCards.length).toBeGreaterThanOrEqual(2)

    // Verify Slide 2 (Clone) is mounted and aria-hidden for seamless snap transition
    const cloneWrapper = container.querySelector('[aria-hidden="true"] .hero-card-float-center')
    expect(cloneWrapper).not.toBeNull()
  })
})
