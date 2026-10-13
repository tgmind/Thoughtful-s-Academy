import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DoubtCard from '../../src/components/doubts/DoubtCard'

describe('DoubtCard Component Tests', () => {
  const mockDoubt = {
    id: 'doubt-123',
    student_id: 'student-456',
    student_name: 'Ananya Sharma',
    roll_number: '104',
    subject: 'Physics',
    batch_name: 'Class 12 JEE Elite',
    lecture_title: 'Newtonian Dynamics Part 3',
    timestamp_seconds: 145,
    question: 'Why did the friction force flip direction in the second free body diagram?',
    status: 'pending',
    created_at: new Date().toISOString(),
  }

  it('renders student identity, roll number, and question correctly', () => {
    render(
      <MemoryRouter>
        <DoubtCard doubt={mockDoubt} role="student" />
      </MemoryRouter>
    )

    expect(screen.getByText('Ananya Sharma')).toBeInTheDocument()
    expect(screen.getByText('104')).toBeInTheDocument()
    expect(screen.getByText('Physics')).toBeInTheDocument()
    expect(screen.getByText('Class 12 JEE Elite')).toBeInTheDocument()
    expect(screen.getByText('Newtonian Dynamics Part 3')).toBeInTheDocument()
    expect(screen.getByText(/Why did the friction force flip direction/)).toBeInTheDocument()
    expect(screen.getByText('Pending Review')).toBeInTheDocument()
    expect(screen.getByText('Play at 2:25')).toBeInTheDocument()
  })

  it('renders self-study delete button for student and triggers confirmation', () => {
    const onDeleteMock = vi.fn()
    render(
      <MemoryRouter>
        <DoubtCard doubt={mockDoubt} role="student" onDelete={onDeleteMock} />
      </MemoryRouter>
    )

    const clearBtn = screen.getByText('Clear (Self Study)')
    expect(clearBtn).toBeInTheDocument()

    fireEvent.click(clearBtn)
    expect(screen.getByText('Clear doubt?')).toBeInTheDocument()

    const confirmYes = screen.getByRole('button', { name: /Yes/i })
    fireEvent.click(confirmYes)
    expect(onDeleteMock).toHaveBeenCalledWith('doubt-123')
  })

  it('renders educator actions (Message Student and Mark Addressed) for teacher role', () => {
    const onMarkAddressedMock = vi.fn()
    render(
      <MemoryRouter>
        <DoubtCard doubt={mockDoubt} role="teacher" onMarkAddressed={onMarkAddressedMock} />
      </MemoryRouter>
    )

    expect(screen.getByText('Message Student')).toBeInTheDocument()
    const markBtn = screen.getByRole('button', { name: /Mark Addressed/i })
    expect(markBtn).toBeInTheDocument()

    fireEvent.click(markBtn)
    expect(onMarkAddressedMock).toHaveBeenCalledWith('doubt-123')
  })

  it('renders addressed details when doubt is resolved', () => {
    const addressedDoubt = {
      ...mockDoubt,
      status: 'addressed',
      addressed_by_name: 'Subodh Sir',
      addressed_at: new Date().toISOString(),
    }

    render(
      <MemoryRouter>
        <DoubtCard doubt={addressedDoubt} role="student" />
      </MemoryRouter>
    )

    expect(screen.getByText('Addressed in Class')).toBeInTheDocument()
    expect(screen.getByText('Subodh Sir')).toBeInTheDocument()
  })
})
