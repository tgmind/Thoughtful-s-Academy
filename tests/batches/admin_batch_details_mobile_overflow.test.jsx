import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminBatchDetails from '../../src/pages/admin/AdminBatchDetails'

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() =>
        Promise.resolve({
          data: [
            {
              id: 'batch-test-1',
              name: 'Target JEE 2026',
              subject: 'Physics',
              faculty_images: [
                { name: 'Dr. HC Verma', subject: 'Physics', image_url: 'https://example.com/dr-verma.jpg' }
              ],
              detailed_info: '<p>Comprehensive physics batch</p>'
            }
          ],
          error: null
        })
      ),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'card-new', title: 'New Card', is_featured: false },
            error: null
          })
        })
      }),
      or: vi.fn().mockReturnThis()
    }))
  }
}))

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', user_metadata: { full_name: 'Super Admin' } }
  })
}))

describe('AdminBatchDetails - Mobile Viewport Integrity and Overflow Prevention', () => {
  it('applies overflow-x-hidden, min-w-0, and max-w-full to root and section wrappers', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminBatchDetails />
      </MemoryRouter>
    )

    // Wait for batch data to load
    expect(await screen.findByText('Batch Details Editor')).toBeInTheDocument()

    // 1. Root container must have overflow-x-hidden and min-w-0
    const rootContainer = container.querySelector('.max-w-5xl')
    expect(rootContainer).toHaveClass('overflow-x-hidden')
    expect(rootContainer).toHaveClass('min-w-0')
    expect(rootContainer).toHaveClass('max-w-full')

    // 2. RichTextEditor must have min-w-0 and overflow-hidden
    const editorToolbar = container.querySelector('.overflow-x-auto.custom-scrollbar')
    expect(editorToolbar).toBeInTheDocument()
    expect(editorToolbar).toHaveClass('flex-nowrap')
    expect(editorToolbar).toHaveClass('sm:flex-wrap')

    // 3. Faculty inputs must have min-w-0 w-full to avoid input blowout
    const teacherInput = screen.getByPlaceholderText('e.g. Subodh Verma')
    expect(teacherInput).toHaveClass('min-w-0')
    expect(teacherInput).toHaveClass('w-full')

    const driveInput = screen.getByPlaceholderText('https://drive.google.com/file/d/...')
    expect(driveInput).toHaveClass('min-w-0')
    expect(driveInput).toHaveClass('w-full')
  })
})
