import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MaterialViewerModal from '../../src/components/shared/MaterialViewerModal'
import {
  parseGoogleResource,
  isGoogleDriveResource,
  getMaterialEmbedUrl,
  getMaterialDownloadUrl,
  downloadMaterialFile
} from '../../src/utils/materialUrl'

describe('Material URL Utilities', () => {
  const sampleDriveUrl = 'https://drive.google.com/file/d/1IGQw9ZiZlzAFHwXgiQnpOL7mCiDJethI/view?usp=drivesdk'
  const sampleDocUrl = 'https://docs.google.com/document/d/1ABCXYZ_123-docId/edit'
  const sampleSheetUrl = 'https://docs.google.com/spreadsheets/d/1SHEET_id-456/edit#gid=0'
  const sampleSlideUrl = 'https://docs.google.com/presentation/d/1SLIDE_id-789/edit'

  describe('parseGoogleResource', () => {
    it('correctly extracts file ID and kind from standard Google Drive URL', () => {
      const res = parseGoogleResource(sampleDriveUrl)
      expect(res.kind).toBe('drive_file')
      expect(res.id).toBe('1IGQw9ZiZlzAFHwXgiQnpOL7mCiDJethI')
    })

    it('correctly parses Google Docs URL', () => {
      const res = parseGoogleResource(sampleDocUrl)
      expect(res.kind).toBe('doc')
      expect(res.id).toBe('1ABCXYZ_123-docId')
    })

    it('correctly parses Google Sheets URL', () => {
      const res = parseGoogleResource(sampleSheetUrl)
      expect(res.kind).toBe('sheet')
      expect(res.id).toBe('1SHEET_id-456')
    })

    it('correctly parses Google Presentation URL', () => {
      const res = parseGoogleResource(sampleSlideUrl)
      expect(res.kind).toBe('presentation')
      expect(res.id).toBe('1SLIDE_id-789')
    })

    it('handles query parameter ID format', () => {
      const res = parseGoogleResource('https://drive.google.com/open?id=1paramId_999')
      expect(res.kind).toBe('drive_file')
      expect(res.id).toBe('1paramId_999')
    })

    it('returns nulls for non-Google URLs', () => {
      const res = parseGoogleResource('https://example.com/notes.pdf')
      expect(res.id).toBeNull()
      expect(res.kind).toBeNull()
    })
  })

  describe('isGoogleDriveResource', () => {
    it('returns true when type is google_drive', () => {
      expect(isGoogleDriveResource('https://anything.com', 'google_drive')).toBe(true)
    })

    it('returns true for drive.google.com URLs', () => {
      expect(isGoogleDriveResource(sampleDriveUrl)).toBe(true)
    })

    it('returns true for docs.google.com URLs', () => {
      expect(isGoogleDriveResource(sampleDocUrl)).toBe(true)
    })

    it('returns false for generic links', () => {
      expect(isGoogleDriveResource('https://khanacademy.org', 'external_link')).toBe(false)
    })
  })

  describe('getMaterialEmbedUrl', () => {
    it('converts drive URL to isolated /preview URL', () => {
      const embed = getMaterialEmbedUrl(sampleDriveUrl)
      expect(embed).toBe('https://drive.google.com/file/d/1IGQw9ZiZlzAFHwXgiQnpOL7mCiDJethI/preview')
    })

    it('converts doc URL to /preview URL', () => {
      const embed = getMaterialEmbedUrl(sampleDocUrl)
      expect(embed).toBe('https://docs.google.com/document/d/1ABCXYZ_123-docId/preview')
    })

    it('converts sheet URL to /preview URL', () => {
      const embed = getMaterialEmbedUrl(sampleSheetUrl)
      expect(embed).toBe('https://docs.google.com/spreadsheets/d/1SHEET_id-456/preview')
    })

    it('preserves generic web URLs', () => {
      const embed = getMaterialEmbedUrl('https://example.com/page')
      expect(embed).toBe('https://example.com/page')
    })
  })

  describe('getMaterialDownloadUrl', () => {
    it('creates direct download stream URL for Google Drive file', () => {
      const download = getMaterialDownloadUrl(sampleDriveUrl)
      expect(download).toBe('https://drive.usercontent.google.com/download?id=1IGQw9ZiZlzAFHwXgiQnpOL7mCiDJethI&export=download&confirm=t')
    })

    it('creates PDF export URL for Google Docs', () => {
      const download = getMaterialDownloadUrl(sampleDocUrl)
      expect(download).toBe('https://docs.google.com/document/d/1ABCXYZ_123-docId/export?format=pdf')
    })
  })

  describe('downloadMaterialFile', () => {
    it('initiates direct download without setting target=_blank', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network fallback'))
      const appendChildSpy = vi.spyOn(document.body, 'appendChild')
      const removeChildSpy = vi.spyOn(document.body, 'removeChild')

      await downloadMaterialFile(sampleDriveUrl, 'Sample Chapter Note')

      // Ensure elements added to DOM for download never have target="_blank"
      const createdAnchors = appendChildSpy.mock.calls
        .map(call => call[0])
        .filter(el => el.tagName === 'A')

      createdAnchors.forEach(a => {
        expect(a.getAttribute('target')).toBeNull()
      })

      fetchSpy.mockRestore()
      appendChildSpy.mockRestore()
      removeChildSpy.mockRestore()
    })
  })
})

describe('MaterialViewerModal Component - PDF & Protected Notes', () => {
  const samplePdfCard = {
    id: '740baede-5e68-451c-87ec-10f833f69fd8',
    title: 'Class 9 Mathematics Practice Workbook 1',
    type: 'google_drive',
    url: 'https://drive.google.com/file/d/1IGQw9ZiZlzAFHwXgiQnpOL7mCiDJethI/view?usp=drivesdk',
    subject: 'Maths'
  }

  let onCloseMock

  beforeEach(() => {
    onCloseMock = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders title, subject subtitle, and iframe with /preview for Google Drive PDF', () => {
    render(<MaterialViewerModal card={samplePdfCard} onClose={onCloseMock} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Class 9 Mathematics Practice Workbook 1')).toBeInTheDocument()
    expect(screen.getByText('Maths')).toBeInTheDocument()
    expect(screen.getByText('Notes')).toBeInTheDocument()

    const iframe = document.querySelector('iframe')
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveAttribute('src', 'https://drive.google.com/file/d/1IGQw9ZiZlzAFHwXgiQnpOL7mCiDJethI/preview')
  })

  it('renders transparent mask over viewer and neutralizes redirect button without visible shield overlay', () => {
    render(<MaterialViewerModal card={samplePdfCard} onClose={onCloseMock} />)

    // Verify visible text and grey shield are completely absent
    expect(screen.queryByText('Protected Reader')).not.toBeInTheDocument()
    expect(screen.queryByText('Protected')).not.toBeInTheDocument()

    // Blocker is present and completely transparent
    const blocker = screen.getByTestId('drive-redirect-blocker')
    expect(blocker).toBeInTheDocument()
    expect(blocker.querySelector('svg')).toBeNull()
    expect(blocker).toHaveClass('pointer-events-auto')
    expect(blocker).toHaveClass('bg-transparent')

    // Mask container allows full touch pass-through (pointer-events-none) across the viewer
    const maskContainer = blocker.parentElement
    expect(maskContainer).toHaveClass('pointer-events-none')
    expect(maskContainer).toHaveClass('absolute')
    expect(maskContainer).toHaveClass('inset-0')

    // Clicking/tapping redirect blocker stops propagation and prevents default
    const clickEvt = new MouseEvent('click', { bubbles: true, cancelable: true })
    const stopPropagationSpy = vi.spyOn(clickEvt, 'stopPropagation')
    const preventDefaultSpy = vi.spyOn(clickEvt, 'preventDefault')
    blocker.dispatchEvent(clickEvt)

    expect(stopPropagationSpy).toHaveBeenCalled()
    expect(preventDefaultSpy).toHaveBeenCalled()

    // Touch events on the redirect blocker are also intercepted
    const touchStartEvt = new TouchEvent('touchstart', { bubbles: true, cancelable: true })
    const touchPreventSpy = vi.spyOn(touchStartEvt, 'preventDefault')
    blocker.dispatchEvent(touchStartEvt)
    expect(touchPreventSpy).toHaveBeenCalled()
  })

  it('prevents browser print (Ctrl+P) and save (Ctrl+S) inside protected viewer', () => {
    render(<MaterialViewerModal card={samplePdfCard} onClose={onCloseMock} />)

    const printEvt = new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, bubbles: true, cancelable: true })
    const preventDefaultSpy = vi.spyOn(printEvt, 'preventDefault')
    window.dispatchEvent(printEvt)
    expect(preventDefaultSpy).toHaveBeenCalled()

    const saveEvt = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true })
    const preventDefaultSaveSpy = vi.spyOn(saveEvt, 'preventDefault')
    window.dispatchEvent(saveEvt)
    expect(preventDefaultSaveSpy).toHaveBeenCalled()
  })

  it('calls onClose when Close button is clicked or Escape is pressed', () => {
    render(<MaterialViewerModal card={samplePdfCard} onClose={onCloseMock} />)

    const closeBtn = screen.getByLabelText('Close')
    fireEvent.click(closeBtn)
    expect(onCloseMock).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCloseMock).toHaveBeenCalledTimes(2)
  })
})

describe('MaterialViewerModal Component', () => {
  const sampleDocCard = {
    id: 'doc-1',
    title: 'Chapter 1 Theory Notes',
    type: 'google_drive',
    url: 'https://docs.google.com/document/d/1ABCXYZ_123-docId/edit',
    subject: 'Physics'
  }

  let onCloseMock

  beforeEach(() => {
    onCloseMock = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders modal dialog with document title and subject badge for documents', () => {
    render(<MaterialViewerModal card={sampleDocCard} onClose={onCloseMock} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Chapter 1 Theory Notes')).toBeInTheDocument()
    expect(screen.getByText('Physics')).toBeInTheDocument()
    expect(screen.getByText('Google Doc')).toBeInTheDocument()
  })

  it('renders iframe with the restricted in-app /preview URL for Google Docs', () => {
    render(<MaterialViewerModal card={sampleDocCard} onClose={onCloseMock} />)

    const iframe = document.querySelector('iframe')
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveAttribute('src', 'https://docs.google.com/document/d/1ABCXYZ_123-docId/preview')
  })

  it('renders the manual Download button and triggers direct download without target=_blank', async () => {
    const appendChildSpy = vi.spyOn(document.body, 'appendChild')

    render(<MaterialViewerModal card={sampleDocCard} onClose={onCloseMock} />)

    const downloadBtn = screen.getByRole('button', { name: /download/i })
    expect(downloadBtn).toBeInTheDocument()

    fireEvent.click(downloadBtn)

    const createdAnchors = appendChildSpy.mock.calls
      .map(call => call[0])
      .filter(el => el.tagName === 'A')

    createdAnchors.forEach(a => {
      expect(a.getAttribute('target')).toBeNull()
    })

    appendChildSpy.mockRestore()
  })

  it('calls onClose when close button is clicked', () => {
    render(<MaterialViewerModal card={sampleDocCard} onClose={onCloseMock} />)

    const closeBtn = screen.getByLabelText('Close')
    fireEvent.click(closeBtn)
    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape key is pressed', () => {
    render(<MaterialViewerModal card={sampleDocCard} onClose={onCloseMock} />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })

  it('dismisses loading indicator when iframe finishes loading', () => {
    render(<MaterialViewerModal card={sampleDocCard} onClose={onCloseMock} />)

    expect(screen.getByText(/Opening study material in protected view/i)).toBeInTheDocument()

    const iframe = document.querySelector('iframe')
    fireEvent.load(iframe)

    expect(screen.queryByText(/Opening study material in protected view/i)).not.toBeInTheDocument()
  })

  it('does not render maximize/fullscreen button to maximize readable area by default', () => {
    render(<MaterialViewerModal card={sampleDocCard} onClose={onCloseMock} />)

    expect(screen.queryByLabelText('Toggle fullscreen')).not.toBeInTheDocument()
  })
})
