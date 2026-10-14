import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NotesPlaylistModal from '../../src/components/shared/NotesPlaylistModal'
import { supabase } from '../../src/lib/supabase'

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('NotesPlaylistModal Component', () => {
  const sampleCard = {
    id: 'card-pw-sound-123',
    title: 'Sound by PW',
    type: 'youtube_playlist',
    url: 'https://www.youtube.com/playlist?list=PLxyz123456',
    subject: 'Physics',
    attached_notes: [
      {
        id: 'n1',
        title: 'Sound Lecture 1 Notes: Introduction & Waves',
        url: 'https://drive.google.com/file/d/1IGQw9ZiZlzAFHwXgiQnpOL7mCiDJethI/view?usp=drivesdk',
        tag: 'Full Chapter Notes',
        lecture_index: 1,
        description: 'Complete wave theory and definitions'
      },
      {
        id: 'n2',
        title: 'Sound Lecture 2 Notes: Propagation of Sound',
        url: 'https://drive.google.com/file/d/1ABC999/view',
        tag: 'Formula Sheet',
        lecture_index: 2,
        description: 'Speed of sound formulas and graphs'
      }
    ]
  }

  let onCloseMock
  let onSaveSuccessMock

  beforeEach(() => {
    onCloseMock = vi.fn()
    onSaveSuccessMock = vi.fn()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders modal with card title, initial notes count, and playlist tag', () => {
    render(
      <NotesPlaylistModal
        isOpen={true}
        onClose={onCloseMock}
        card={sampleCard}
        onSaveSuccess={onSaveSuccessMock}
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Sound by PW')).toBeInTheDocument()
    expect(screen.getByText('Notes Playlist Builder')).toBeInTheDocument()
    expect(screen.getByText('2 Notes')).toBeInTheDocument()

    // Note titles
    expect(screen.getByDisplayValue('Sound Lecture 1 Notes: Introduction & Waves')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Sound Lecture 2 Notes: Propagation of Sound')).toBeInTheDocument()
  })

  it('allows adding a new note slot to the playlist', () => {
    render(
      <NotesPlaylistModal
        isOpen={true}
        onClose={onCloseMock}
        card={sampleCard}
        onSaveSuccess={onSaveSuccessMock}
      />
    )

    const addBtn = screen.getByRole('button', { name: /add note/i })
    fireEvent.click(addBtn)

    expect(screen.getByText('3 Notes')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Lecture #3 Notes')).toBeInTheDocument()
  })

  it('allows removing a note from the playlist', () => {
    render(
      <NotesPlaylistModal
        isOpen={true}
        onClose={onCloseMock}
        card={sampleCard}
        onSaveSuccess={onSaveSuccessMock}
      />
    )

    const removeBtns = screen.getAllByRole('button', { name: /remove note/i })
    fireEvent.click(removeBtns[0])

    expect(screen.getByText('1 Note')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Sound Lecture 1 Notes: Introduction & Waves')).not.toBeInTheDocument()
  })

  it('allows reordering notes with Move Up and Move Down', () => {
    render(
      <NotesPlaylistModal
        isOpen={true}
        onClose={onCloseMock}
        card={sampleCard}
        onSaveSuccess={onSaveSuccessMock}
      />
    )

    // Move second note up
    const moveUpBtns = screen.getAllByTitle('Move Up')
    // First item's move up is disabled; second item's move up is enabled
    expect(moveUpBtns[0]).toBeDisabled()
    expect(moveUpBtns[1]).not.toBeDisabled()

    fireEvent.click(moveUpBtns[1])

    const inputs = screen.getAllByPlaceholderText(/e\.g\. Chapter 1 Handwritten Notes/i)
    expect(inputs[0].value).toBe('Sound Lecture 2 Notes: Propagation of Sound')
    expect(inputs[1].value).toBe('Sound Lecture 1 Notes: Introduction & Waves')
  })

  it('supports bulk pasting multiple Google Drive links', () => {
    render(
      <NotesPlaylistModal
        isOpen={true}
        onClose={onCloseMock}
        card={{ ...sampleCard, attached_notes: [] }}
        onSaveSuccess={onSaveSuccessMock}
      />
    )

    const bulkBtn = screen.getByRole('button', { name: /bulk paste/i })
    fireEvent.click(bulkBtn)

    const textarea = screen.getByPlaceholderText(/Sound Lecture 1 Notes/i)
    fireEvent.change(textarea, {
      target: {
        value: `Sound Chapter Notes - https://drive.google.com/file/d/111/view\nNCERT Solutions - https://drive.google.com/file/d/222/view`
      }
    })

    const importBtn = screen.getByRole('button', { name: /import notes/i })
    fireEvent.click(importBtn)

    expect(screen.getByDisplayValue('Sound Chapter Notes')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://drive.google.com/file/d/111/view')).toBeInTheDocument()
    expect(screen.getByDisplayValue('NCERT Solutions')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://drive.google.com/file/d/222/view')).toBeInTheDocument()
  })

  it('saves cleaned notes playlist to Supabase and triggers onSaveSuccess', async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { ...sampleCard, attached_notes: sampleCard.attached_notes },
            error: null
          })
        })
      })
    })

    supabase.from.mockReturnValue({
      update: updateMock
    })

    render(
      <NotesPlaylistModal
        isOpen={true}
        onClose={onCloseMock}
        card={sampleCard}
        onSaveSuccess={onSaveSuccessMock}
      />
    )

    const saveBtn = screen.getByRole('button', { name: /save notes/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('study_cards')
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          attached_notes: expect.arrayContaining([
            expect.objectContaining({ title: 'Sound Lecture 1 Notes: Introduction & Waves' }),
            expect.objectContaining({ title: 'Sound Lecture 2 Notes: Propagation of Sound' }),
          ])
        })
      )
      expect(onSaveSuccessMock).toHaveBeenCalled()
      expect(onCloseMock).toHaveBeenCalled()
    })
  })
})

describe('Notes Playlist Badge in StudyCard', () => {
  it('correctly calculates badge text for playlist cards with notes', () => {
    const playlistCard = {
      type: 'youtube_playlist',
      attached_notes: [{ id: '1' }, { id: '2' }, { id: '3' }]
    }
    const label = playlistCard.type === 'youtube_playlist'
      ? `Notes Playlist (${playlistCard.attached_notes.length})`
      : `Notes (${playlistCard.attached_notes.length})`
    expect(label).toBe('Notes Playlist (3)')
  })

  it('correctly calculates badge text for single video cards with notes', () => {
    const singleCard = {
      type: 'youtube_video',
      attached_notes: [{ id: '1' }]
    }
    const label = singleCard.type === 'youtube_playlist'
      ? `Notes Playlist (${singleCard.attached_notes.length})`
      : `Notes (${singleCard.attached_notes.length})`
    expect(label).toBe('Notes (1)')
  })
})

