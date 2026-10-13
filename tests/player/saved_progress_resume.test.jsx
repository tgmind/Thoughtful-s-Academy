import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProtectedVideoPlayer from '../../src/components/shared/ProtectedVideoPlayer'
import * as youtubeUtils from '../../src/utils/youtube'

describe('ProtectedVideoPlayer: Saved Progress & Resume Mechanism', () => {
  const mockSeekTo = vi.fn()
  const mockPlayVideo = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    window.YT = {
      Player: vi.fn().mockImplementation((id, config) => {
        return {
          seekTo: mockSeekTo,
          playVideo: mockPlayVideo,
          pauseVideo: vi.fn(),
          getCurrentTime: () => 0,
          getDuration: () => 1800,
          getPlayerState: () => -1,
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

  it('renders resume playback prompt when saved progress is detected', async () => {
    vi.spyOn(youtubeUtils, 'getLectureProgress').mockReturnValue({
      time: 703, // 11:43
      duration: 1800,
      completed: false,
    })

    render(
      <ProtectedVideoPlayer
        videoId="test-video-123"
        title="Physics Motion Lecture"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Saved Progress')).toBeInTheDocument()
      expect(screen.getByText(/Resume from/)).toBeInTheDocument()
      expect(screen.getByText('11:43')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Resume$/i })).toBeInTheDocument()
    })
  })

  it('clicking Resume seeks to saved timestamp, triggers playback, and hides prompt', async () => {
    vi.spyOn(youtubeUtils, 'getLectureProgress').mockReturnValue({
      time: 703,
      duration: 1800,
      completed: false,
    })

    render(
      <ProtectedVideoPlayer
        videoId="test-video-123"
        title="Physics Motion Lecture"
      />
    )

    await waitFor(() => {
      expect(window.YT.Player).toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /^Resume$/i })).toBeInTheDocument()
    })

    const resumeBtn = screen.getByRole('button', { name: /^Resume$/i })
    fireEvent.click(resumeBtn)

    await waitFor(() => {
      expect(mockSeekTo).toHaveBeenCalledWith(703, true)
      expect(mockPlayVideo).toHaveBeenCalled()
      expect(screen.queryByText('Saved Progress')).not.toBeInTheDocument()
    })
  })

  it('clicking dismiss X removes the resume prompt', async () => {
    vi.spyOn(youtubeUtils, 'getLectureProgress').mockReturnValue({
      time: 703,
      duration: 1800,
      completed: false,
    })

    render(
      <ProtectedVideoPlayer
        videoId="test-video-123"
        title="Physics Motion Lecture"
      />
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Dismiss resume prompt')).toBeInTheDocument()
    })

    const dismissBtn = screen.getByLabelText('Dismiss resume prompt')
    fireEvent.click(dismissBtn)

    await waitFor(() => {
      expect(screen.queryByText('Saved Progress')).not.toBeInTheDocument()
    })
  })

  it('does NOT show resume prompt when initialSeekSeconds is explicitly provided (doubt deep-link)', async () => {
    vi.spyOn(youtubeUtils, 'getLectureProgress').mockReturnValue({
      time: 703,
      duration: 1800,
      completed: false,
    })

    render(
      <ProtectedVideoPlayer
        videoId="test-video-123"
        title="Physics Motion Lecture"
        initialSeekSeconds={180}
      />
    )

    expect(screen.queryByText('Saved Progress')).not.toBeInTheDocument()
    expect(screen.queryByText('Resume from 11:43?')).not.toBeInTheDocument()
  })
})
