import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DashboardShell from '../../src/components/layout/DashboardShell'
import { BookOpen, LayoutDashboard, Users, BookUser, CreditCard } from 'lucide-react'

// Mock AuthContext
vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', email: 'admin@thoughtful.edu' },
    profile: { id: 'admin-1', full_name: 'Super Admin', role: 'admin' },
    signOut: vi.fn(),
  }),
}))

// Mock useNavBadges
vi.mock('../../src/hooks/useNavBadges', () => ({
  useNavBadges: () => ({
    '/admin/study': true, // simulate a badge on study
  }),
}))

describe('Mobile Nav Dock UI Hardening Suite', () => {
  const ADMIN_NAV = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Students', path: '/admin/students', icon: <Users className="h-4 w-4" /> },
    { label: 'Teachers', path: '/admin/teachers', icon: <BookUser className="h-4 w-4" /> },
    { label: 'Fees', path: '/admin/fees', icon: <CreditCard className="h-4 w-4" /> },
    { label: 'Study Cards', shortLabel: 'Study', path: '/admin/study', icon: <BookOpen className="h-4 w-4" /> },
    { label: 'Batch Details', shortLabel: 'Details', path: '/admin/batch-details', icon: <BookOpen className="h-4 w-4" /> },
  ]

  it('renders shortLabel in secondary active launcher without truncation or clipping', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/admin/study']}>
        <DashboardShell navItems={ADMIN_NAV} pageTitle="Admin Panel" />
      </MemoryRouter>
    )

    // Find the mobile nav bar
    const mobileNav = container.querySelector('nav.lg\\:hidden')
    expect(mobileNav).toBeInTheDocument()

    // On mobile dock, the active secondary item should display "Study" instead of truncated "Study Ca..."
    const activeLabel = Array.from(mobileNav.querySelectorAll('span.text-\\[10px\\]')).find(el => el.textContent.trim() === 'Study')
    expect(activeLabel).toBeInTheDocument()
    expect(activeLabel.className).toContain('truncate')
    expect(activeLabel.className).not.toContain('max-w-[56px]')
  })

  it('preserves full label in desktop navigation and in more-sheet modal', () => {
    render(
      <MemoryRouter initialEntries={['/admin/study']}>
        <DashboardShell navItems={ADMIN_NAV} pageTitle="Admin Panel" />
      </MemoryRouter>
    )

    // Desktop nav should display the full "Study Cards"
    const desktopLabels = screen.getAllByText('Study Cards')
    expect(desktopLabels.length).toBeGreaterThan(0)

    // Open the bottom sheet modal
    const moreBtn = screen.getByLabelText('Open portal modules')
    fireEvent.click(moreBtn)

    // The modal should display full "Study Cards" and "Batch Details"
    expect(screen.getByText('All Portal Modules')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Study Cards/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Batch Details/i })).toBeInTheDocument()
  })

  it('applies dark ring styling to active tab badge to avoid visual clash', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/admin/study']}>
        <DashboardShell navItems={ADMIN_NAV} pageTitle="Admin Panel" />
      </MemoryRouter>
    )

    const activeSecondaryDot = container.querySelector('nav.lg\\:hidden span.ring-blue-950')
    expect(activeSecondaryDot).toBeInTheDocument()
  })

  it('configures main content viewport with smooth touch momentum scrolling and mobile scrollbar containment', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/admin/study']}>
        <DashboardShell navItems={ADMIN_NAV} pageTitle="Admin Panel" />
      </MemoryRouter>
    )

    const main = container.querySelector('main')
    expect(main).toBeInTheDocument()
    expect(main.className).toContain('overflow-y-auto')
    expect(main.className).toContain('overflow-x-hidden')
    expect(main.className).toContain('overscroll-contain')
    expect(main.className).toContain('[-webkit-overflow-scrolling:touch]')
    expect(main.className).toContain('no-scrollbar')
  })
})
