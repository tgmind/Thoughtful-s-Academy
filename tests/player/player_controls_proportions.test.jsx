import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProtectedVideoPlayer from '../../src/components/shared/ProtectedVideoPlayer'

describe('ProtectedVideoPlayer: Controls Proportions and Spacing', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    window.YT = {
      Player: vi.fn().mockImplementation((_id, _config) => {
        return {
          seekTo: vi.fn(),
          playVideo: vi.fn(),
          pauseVideo: vi.fn(),
          getCurrentTime: () => 120,
          getDuration: () => 1800,
          getPlayerState: () => 1,
          getVideoLoadedFraction: () => 0.5,
          destroy: vi.fn(),
        }
      }),
      PlayerState: {
        PLAYING: 1,
        PAUSED: 2,
        BUFFERING: 3,
        ENDED: 0,
      },
    }
  })

  it('renders player controls with enhanced button sizes and comfortable spacing', () => {
    const onToggleFullscreen = vi.fn()

    render(
      <ProtectedVideoPlayer
        videoId="test-video-size"
        title="Physics Vectors"
        isFullscreen={false}
        onToggleFullscreen={onToggleFullscreen}
      />
    )

    // Play/Pause button
    const playPauseBtn = screen.getByRole('button', { name: /^Play$|^Pause$/i })
    expect(playPauseBtn).toBeInTheDocument()
    expect(playPauseBtn).toHaveClass('p-1.5')
    expect(playPauseBtn).toHaveClass('sm:p-2')

    // Eye button (clean board view)
    const eyeBtn = screen.getByLabelText('Toggle clean board view')
    expect(eyeBtn).toBeInTheDocument()
    expect(eyeBtn).toHaveClass('p-1.5')
    expect(eyeBtn).toHaveClass('sm:p-2')

    // Lock button
    const lockBtn = screen.getByLabelText('Lock controls')
    expect(lockBtn).toBeInTheDocument()
    expect(lockBtn).toHaveClass('p-1.5')
    expect(lockBtn).toHaveClass('sm:p-2')

    // Right controls container spacing
    const rightControlsContainer = eyeBtn.parentElement
    expect(rightControlsContainer).toHaveClass('gap-1.5')
    expect(rightControlsContainer).toHaveClass('sm:gap-2.5')
    expect(rightControlsContainer).toHaveClass('md:gap-3')

    // Speed button sizing
    const speedBtn = screen.getByRole('button', { name: '1x' })
    expect(speedBtn).toBeInTheDocument()
    expect(speedBtn).toHaveClass('px-2')
    expect(speedBtn).toHaveClass('sm:px-2.5')

    // Quality button sizing
    const qualityBtn = screen.getByRole('button', { name: /Auto/i })
    expect(qualityBtn).toBeInTheDocument()
    expect(qualityBtn).toHaveClass('px-2')
    expect(qualityBtn).toHaveClass('sm:px-2.5')

    // Fullscreen button
    const fsBtn = screen.getByLabelText('Enter Fullscreen')
    expect(fsBtn).toBeInTheDocument()
    expect(fsBtn).toHaveClass('p-1.5')
    expect(fsBtn).toHaveClass('sm:p-2')
  })

  it('speed menu opens above button with generous touch target items', () => {
    render(
      <ProtectedVideoPlayer
        videoId="test-video-speed"
        title="Physics Vectors"
      />
    )

    const speedBtn = screen.getByRole('button', { name: '1x' })
    fireEvent.click(speedBtn)

    // Check menu is open
    expect(screen.getByRole('button', { name: '1.5x' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2x' })).toBeInTheDocument()

    const item2x = screen.getByRole('button', { name: '2x' })
    expect(item2x).toHaveClass('py-1.5')
    expect(item2x).toHaveClass('sm:py-2')
  })
})
