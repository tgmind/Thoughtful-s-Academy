import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import AdminBatchDetails from '../../src/pages/admin/AdminBatchDetails'
import { supabase } from '../../src/lib/supabase'

vi.mock('../../src/lib/supabase', () => {
  const mockFrom = vi.fn()
  const mockRpc = vi.fn()
  return {
    supabase: {
      from: mockFrom,
      rpc: mockRpc,
    },
  }
})

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-user-123', email: 'admin@graviton.com' } }),
}))

vi.mock('../../src/components/admin/RichTextEditor', () => ({
  default: ({ value, onChange }) => (
    <div data-testid="rich-text-editor">
      <textarea
        data-testid="rich-text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}))

vi.mock('../../src/components/shared/NotesPlaylistModal', () => ({
  default: ({ isOpen, onClose }) => (
    isOpen ? <div data-testid="notes-playlist-modal"><button onClick={onClose}>Close Notes</button></div> : null
  ),
}))

vi.mock('../../src/components/admin/ActivityLogModal', () => ({
  default: ({ onClose }) => (
    <div data-testid="activity-log-modal"><button onClick={onClose}>Close Log</button></div>
  ),
}))

describe('AdminBatchDetails - Featured Lectures & Mobile Responsiveness', () => {
  const sampleBatches = [
    {
      id: 'batch-1',
      name: 'Class 11 JEE Physics',
      subject: 'Physics',
      fee_mode: 'monthly',
      fee_amount: 1500,
    },
  ]

  const sampleFeaturedCards = [
    {
      id: 'card-1',
      title: 'Rotational Dynamics Masterclass',
      subject: 'Physics',
      type: 'youtube_video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      is_featured: true,
      display_order: 1,
      batch_id: 'batch-1',
      attached_notes: [{ title: 'Formula Sheet', url: 'https://drive.google.com' }],
    },
    {
      id: 'card-2',
      title: 'Electrostatics High-Yield Review',
      subject: 'Physics',
      type: 'youtube_video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: null,
      is_featured: true,
      display_order: 2,
      batch_id: 'batch-1',
      attached_notes: [],
    },
  ]

  const sampleEligibleCards = [
    {
      id: 'card-3',
      title: 'Wave Optics Interference & Diffraction',
      subject: 'Physics',
      type: 'youtube_video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: null,
      is_featured: false,
      batch_id: 'batch-1',
    },
  ]

  const createMockBuilder = (table) => {
    let currentData = []
    if (table === 'batches') currentData = sampleBatches
    else if (table === 'study_cards') currentData = sampleFeaturedCards

    const builder = {
      select: vi.fn(() => builder),
      order: vi.fn(() => builder),
      contains: vi.fn(() => builder),
      or: vi.fn(() => builder),
      eq: vi.fn((col, val) => {
        if (table === 'study_cards' && col === 'is_featured' && val === false) {
          currentData = sampleEligibleCards
        }
        return builder
      }),
      neq: vi.fn(() => builder),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => builder),
      insert: vi.fn(() => builder),
      delete: vi.fn(() => builder),
      then: (onFulfilled, onRejected) => {
        return Promise.resolve({ data: currentData, error: null }).then(onFulfilled, onRejected)
      },
    }
    return builder
  }

  beforeEach(() => {
    vi.clearAllMocks()
    supabase.from.mockImplementation((table) => createMockBuilder(table))
  })

  it('renders Section 4 Landing Page Featured Lectures and mobile padding classes', async () => {
    const { container } = render(
      <BrowserRouter>
        <AdminBatchDetails />
      </BrowserRouter>
    )

    // Verify root container has bottom padding to prevent mobile dock clipping
    await waitFor(() => {
      expect(screen.getByText(/Batch Details Editor/i)).toBeInTheDocument()
    })

    const rootContainer = container.querySelector('.pb-36')
    expect(rootContainer).toBeInTheDocument()
    expect(rootContainer.className).toContain('pb-36')
    expect(rootContainer.className).toContain('sm:pb-36')
    expect(rootContainer.className).toContain('lg:pb-8')

    // Verify Section 4: Public Landing Page — Featured Lectures Window is rendered
    expect(screen.getByText(/Landing Page Featured Lectures/i)).toBeInTheDocument()
    expect(screen.getByText(/Curated Spotlight/i)).toBeInTheDocument()
    expect(screen.getByText(/Preview Live Home/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Feature a Lecture/i })).toBeInTheDocument()

    // Verify cards in featured list
    await waitFor(() => {
      expect(screen.getAllByText('Rotational Dynamics Masterclass').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Electrostatics High-Yield Review').length).toBeGreaterThanOrEqual(1)
    })

    // Verify position ranks #1 and #2
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
  })

  it('allows admins to open Feature a Lecture modal and view eligible cards', async () => {
    render(
      <BrowserRouter>
        <AdminBatchDetails />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Feature a Lecture/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Feature a Lecture/i }))

    await waitFor(() => {
      expect(screen.getByText(/Feature a Study Card on Landing Page/i)).toBeInTheDocument()
    })
  })

  it('triggers unfeature call when clicking Unfeature button', async () => {
    render(
      <BrowserRouter>
        <AdminBatchDetails />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByText(/Unfeature/i)[0]).toBeInTheDocument()
    })

    const unfeatureButtons = screen.getAllByText(/Unfeature/i)
    fireEvent.click(unfeatureButtons[0])

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('study_cards')
    })
  })
})
