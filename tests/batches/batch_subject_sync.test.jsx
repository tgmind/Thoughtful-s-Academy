import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BatchSubjectSyncModal from '../../src/components/admin/BatchSubjectSyncModal'
import { supabase } from '../../src/lib/supabase'

vi.mock('../../src/lib/supabase', () => {
  const mockRpc = vi.fn()
  const mockFrom = vi.fn()
  return {
    supabase: {
      from: mockFrom,
      rpc: mockRpc,
    },
  }
})

describe('Batch Subject Multi-Student Sync Engine', () => {
  const sampleBatch = {
    id: 'batch-class-10-id',
    name: 'Class 10 Foundation',
    subjects: ['Mathematics', 'Science'],
  }

  const sampleStudents = [
    {
      id: 'student-1',
      roll_number: 'R-101',
      subjects: ['Mathematics'],
      profiles: { full_name: 'Aarav Sharma', email: 'aarav@example.com' },
    },
    {
      id: 'student-2',
      roll_number: 'R-102',
      subjects: ['Mathematics', 'Science'],
      profiles: { full_name: 'Diya Patel', email: 'diya@example.com' },
    },
    {
      id: 'student-3',
      roll_number: 'R-103',
      subjects: [],
      profiles: { full_name: 'Rohan Verma', email: 'rohan@example.com' },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    supabase.from.mockImplementation((table) => {
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        update: vi.fn(() => builder),
        then: (resolve) => {
          if (table === 'student_profiles') {
            resolve({ data: sampleStudents, error: null })
          } else {
            resolve({ data: [], error: null })
          }
        },
      }
      return builder
    })

    supabase.rpc.mockResolvedValue({
      data: { success: true, updated_count: 3 },
      error: null,
    })
  })

  it('renders modal when open with batch name, added subjects, and enrolled count', async () => {
    render(
      <BatchSubjectSyncModal
        isOpen={true}
        onClose={vi.fn()}
        batch={sampleBatch}
        addedSubjects={['English', 'Computers']}
        onSyncComplete={vi.fn()}
      />
    )

    expect(screen.getByText('Sync New Subjects to Students')).toBeInTheDocument()
    expect(screen.getAllByText('Class 10 Foundation').length).toBeGreaterThan(0)
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('Computers')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('All Enrolled Students')).toBeInTheDocument()
      expect(screen.getByText('Enroll All 3 Students')).toBeInTheDocument()
    })
  })

  it('syncs all students by calling sync_batch_subjects RPC with p_student_ids = null', async () => {
    const handleComplete = vi.fn()
    const handleClose = vi.fn()

    render(
      <BatchSubjectSyncModal
        isOpen={true}
        onClose={handleClose}
        batch={sampleBatch}
        addedSubjects={['Coding']}
        onSyncComplete={handleComplete}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Enroll All 3 Students')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Enroll All 3 Students'))

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('sync_batch_subjects', {
        p_batch_id: 'batch-class-10-id',
        p_new_subjects: ['Coding'],
        p_student_ids: null,
      })
      expect(handleComplete).toHaveBeenCalledWith(3)
      expect(handleClose).toHaveBeenCalled()
    })
  })

  it('switches to selective mode, allows search and checkbox toggling, and syncs selected IDs', async () => {
    const handleComplete = vi.fn()
    const handleClose = vi.fn()

    render(
      <BatchSubjectSyncModal
        isOpen={true}
        onClose={handleClose}
        batch={sampleBatch}
        addedSubjects={['Social Studies']}
        onSyncComplete={handleComplete}
      />
    )

    // Switch to selective mode
    await waitFor(() => {
      expect(screen.getByText('Select Specific Students')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Select Specific Students'))

    // Verify student roster is displayed
    await waitFor(() => {
      expect(screen.getByText('Aarav Sharma')).toBeInTheDocument()
      expect(screen.getByText('Diya Patel')).toBeInTheDocument()
      expect(screen.getByText('Rohan Verma')).toBeInTheDocument()
    })

    // Search filter
    const searchInput = screen.getByPlaceholderText(/search by student name/i)
    fireEvent.change(searchInput, { target: { value: 'Aarav' } })

    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument()
    expect(screen.queryByText('Diya Patel')).not.toBeInTheDocument()

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } })
    expect(screen.getByText('Diya Patel')).toBeInTheDocument()

    // Click "Clear" selection
    fireEvent.click(screen.getByText('Clear'))
    expect(screen.getByText('Enroll 0 Selected Students').closest('button')).toBeDisabled()

    // Select Diya Patel
    fireEvent.click(screen.getByText('Diya Patel'))
    expect(screen.getByText('Enroll 1 Selected Students').closest('button')).not.toBeDisabled()

    // Click Enroll
    fireEvent.click(screen.getByText('Enroll 1 Selected Students').closest('button'))

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('sync_batch_subjects', {
        p_batch_id: 'batch-class-10-id',
        p_new_subjects: ['Social Studies'],
        p_student_ids: ['student-2'],
      })
      expect(handleClose).toHaveBeenCalled()
    })
  })

  it('invokes onClose when Skip / Keep Batch Only is clicked without triggering RPC', async () => {
    const handleClose = vi.fn()

    render(
      <BatchSubjectSyncModal
        isOpen={true}
        onClose={handleClose}
        batch={sampleBatch}
        addedSubjects={['Economics']}
        onSyncComplete={vi.fn()}
      />
    )

    const skipButton = screen.getByText('Skip / Keep Batch Only')
    fireEvent.click(skipButton)

    expect(handleClose).toHaveBeenCalled()
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('falls back gracefully to direct student_profiles update if RPC fails', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'RPC temporary failure' },
    })

    const handleComplete = vi.fn()
    const handleClose = vi.fn()

    render(
      <BatchSubjectSyncModal
        isOpen={true}
        onClose={handleClose}
        batch={sampleBatch}
        addedSubjects={['Art']}
        onSyncComplete={handleComplete}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Enroll All 3 Students')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Enroll All 3 Students'))

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalled()
      // Fallback updates student_profiles directly
      expect(supabase.from).toHaveBeenCalledWith('student_profiles')
      expect(handleComplete).toHaveBeenCalledWith(3)
      expect(handleClose).toHaveBeenCalled()
    })
  })

  it('allows admin to toggle specific subjects and only syncs the chosen subjects', async () => {
    const handleComplete = vi.fn()
    const handleClose = vi.fn()

    render(
      <BatchSubjectSyncModal
        isOpen={true}
        onClose={handleClose}
        batch={sampleBatch}
        addedSubjects={['Physics', 'Chemistry', 'Extras']}
        onSyncComplete={handleComplete}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Physics')).toBeInTheDocument()
      expect(screen.getByText('Chemistry')).toBeInTheDocument()
      expect(screen.getByText('Extras')).toBeInTheDocument()
      expect(screen.getByText('3 of 3 selected')).toBeInTheDocument()
    })

    // Click 'Extras' to deselect it
    fireEvent.click(screen.getByText('Extras'))

    await waitFor(() => {
      expect(screen.getByText('2 of 3 selected')).toBeInTheDocument()
    })

    // Click Enroll All 3 Students
    fireEvent.click(screen.getByText('Enroll All 3 Students'))

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('sync_batch_subjects', {
        p_batch_id: 'batch-class-10-id',
        p_new_subjects: ['Physics', 'Chemistry'],
        p_student_ids: null,
      })
      expect(handleClose).toHaveBeenCalled()
    })
  })

  describe('Subject Addition & Roster Merge Logic', () => {
    it('accurately identifies only newly added subjects when editing a batch', () => {
      const existingSubjects = ['Maths', 'Physics']
      const updatedSubjects = ['Maths', 'Physics', 'Biology', 'Chemistry']
      const addedSubjects = updatedSubjects.filter((s) => !existingSubjects.includes(s))

      expect(addedSubjects).toEqual(['Biology', 'Chemistry'])
    })

    it('returns empty array when no new subjects are added (or removed only)', () => {
      const existingSubjects = ['Maths', 'Physics', 'Chemistry']
      const updatedSubjects = ['Maths', 'Physics']
      const addedSubjects = updatedSubjects.filter((s) => !existingSubjects.includes(s))

      expect(addedSubjects).toEqual([])
    })

    it('merges new subjects idempotently into existing student subjects without duplicates', () => {
      const studentSubjects = ['Maths', 'Science']
      const newBatchSubjects = ['Science', 'French', 'Coding']

      const merged = Array.from(new Set([...studentSubjects, ...newBatchSubjects]))
      expect(merged).toEqual(['Maths', 'Science', 'French', 'Coding'])
    })

    it('handles student with null or empty subjects correctly', () => {
      const studentSubjects = null
      const newBatchSubjects = ['English', 'History']

      const merged = Array.from(new Set([...(studentSubjects || []), ...newBatchSubjects]))
      expect(merged).toEqual(['English', 'History'])
    })
  })
})
