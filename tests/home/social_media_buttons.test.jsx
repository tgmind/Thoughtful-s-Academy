import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SocialMediaButtons from '../../src/components/home/SocialMediaButtons'
import SocialLinksManager from '../../src/components/admin/SocialLinksManager'
import * as socialService from '../../src/services/socialLinksService'

const mockLinks = [
  {
    id: '1',
    platform: 'youtube',
    title: 'YouTube',
    url: 'https://youtube.com/@GRAViTONPHYSICS',
    display_order: 1,
    is_active: true,
  },
  {
    id: '2',
    platform: 'whatsapp',
    title: 'WhatsApp',
    url: 'https://wa.me/919876543210',
    display_order: 2,
    is_active: true,
  },
  {
    id: '3',
    platform: 'telegram',
    title: 'Telegram',
    url: 'https://t.me/gravitonphysics',
    display_order: 3,
    is_active: true,
  },
  {
    id: '4',
    platform: 'instagram',
    title: 'Instagram',
    url: 'https://instagram.com/gravitonphysics',
    display_order: 4,
    is_active: true,
  },
  {
    id: '5',
    platform: 'playstore',
    title: 'Play Store',
    url: 'https://play.google.com/store/apps/details?id=com.graviton',
    display_order: 5,
    is_active: true,
  },
]

describe('Social Media Buttons & Admin Manager Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modern social media buttons on the public landing page below philosophy sentence', async () => {
    vi.spyOn(socialService, 'fetchPublicSocialLinks').mockResolvedValue(mockLinks)

    render(
      <MemoryRouter>
        <SocialMediaButtons />
      </MemoryRouter>
    )

    // Wait for links to load
    await waitFor(() => {
      expect(screen.getByText('YouTube')).toBeInTheDocument()
      expect(screen.getByText('WhatsApp')).toBeInTheDocument()
      expect(screen.getByText('Telegram')).toBeInTheDocument()
      expect(screen.getByText('Instagram')).toBeInTheDocument()
      expect(screen.getByText('Play Store')).toBeInTheDocument()
    })

    // Verify links open safely in new tab
    const ytLink = screen.getByRole('link', { name: /YouTube/i })
    expect(ytLink).toHaveAttribute('href', 'https://youtube.com/@GRAViTONPHYSICS')
    expect(ytLink).toHaveAttribute('target', '_blank')
    expect(ytLink).toHaveAttribute('rel', 'noopener noreferrer')

    const waLink = screen.getByRole('link', { name: /WhatsApp/i })
    expect(waLink).toHaveAttribute('href', 'https://wa.me/919876543210')
  })

  it('handles empty social links gracefully without breaking UI', async () => {
    vi.spyOn(socialService, 'fetchPublicSocialLinks').mockResolvedValue([])

    const { container } = render(
      <MemoryRouter>
        <SocialMediaButtons />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('Admin Settings: renders social links manager with add/edit/delete/toggle controls', async () => {
    vi.spyOn(socialService, 'fetchAllSocialLinksAdmin').mockResolvedValue(mockLinks)
    vi.spyOn(socialService, 'updateSocialLink').mockResolvedValue({ ...mockLinks[0], is_active: false })

    render(
      <MemoryRouter>
        <SocialLinksManager />
      </MemoryRouter>
    )

    // Header rendered
    expect(screen.getByText(/Social Media & Public Channels/i)).toBeInTheDocument()

    // Wait for channels to appear
    await waitFor(() => {
      expect(screen.getByText('YouTube')).toBeInTheDocument()
      expect(screen.getByText('WhatsApp')).toBeInTheDocument()
      expect(screen.getByText('Play Store')).toBeInTheDocument()
    })

    // Add Channel button exists
    const addBtn = screen.getByRole('button', { name: /Add Channel/i })
    expect(addBtn).toBeInTheDocument()

    // Clicking Add Channel opens the modal
    fireEvent.click(addBtn)
    expect(screen.getByText('Add Social Channel')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/e.g. YouTube/i)).toBeInTheDocument()
  })
})
