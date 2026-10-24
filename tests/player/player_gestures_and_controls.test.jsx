import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ProtectedVideoPlayer from '../../src/components/shared/ProtectedVideoPlayer'

describe('ProtectedVideoPlayer: Double-Tap Gestures & Single-Tap Controls Toggle', () => {
  let mockSeekTo = vi.fn()
  let mockPlayVideo = vi.fn()
  let mockPauseVideo = vi.fn()
  let mockPlayerState = 1 // PLAYING

  beforeEach(() => {
    vi.useFakeTimers()
    mockSeekTo = vi.fn()
    mockPlayVideo = vi.fn().mockImplementation(() => { mockPlayerState = 1 })
    mockPauseVideo = vi.fn().mockImplementation(() => { mockPlayerState = 2 })
    mockPlayerState = 1

    window.YT = {
      Player: vi.fn().mockImplementation((_id, config) => {
        const instance = {
          seekTo: mockSeekTo,
          playVideo: mockPlayVideo,
          pauseVideo: mockPauseVideo,
          getCurrentTime: () => 120,
          getDuration: () => 1800,
          getPlayerState: () => mockPlayerState,
          getVideoLoadedFraction: () => 0.6,
          destroy: vi.fn(),
        }
        // Synchronously call onReady so player is ready
        if (config?.events?.onReady) {
          config.events.onReady({ target: instance })
        }
        return instance
      }),
      PlayerState: {
        PLAYING: 1,
        PAUSED: 2,
        BUFFERING: 3,
        ENDED: 0,
      },
    }
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  const setupPlayer = async (props = {}) => {
    const utils = render(
      <ProtectedVideoPlayer
        videoId="test-gesture"
        title="Physics Vectors"
        {...props}
      />
    )
    // Flush microtasks for initializePlayer async call
    await act(async () => {
      await Promise.resolve()
    })
    return utils
  }

  it('single tap on empty canvas does NOT trigger play/pause or seek gestures', async () => {
    const { container } = await setupPlayer()

    const shield = container.querySelector('.cursor-pointer')
    expect(shield).toBeInTheDocument()

    vi.spyOn(shield.parentElement, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 300,
      height: 200,
      right: 300,
      bottom: 200,
    })

    mockPlayVideo.mockClear()
    mockPauseVideo.mockClear()
    mockSeekTo.mockClear()

    // Single click on left area (clientX = 40)
    fireEvent.click(shield, { clientX: 40, clientY: 100 })

    // Advance 300ms so single tap fires
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // It MUST NOT seek and MUST NOT toggle play/pause!
    expect(mockSeekTo).not.toHaveBeenCalled()
    expect(mockPauseVideo).not.toHaveBeenCalled()
    expect(mockPlayVideo).not.toHaveBeenCalled()
  })

  it('single tap on empty canvas toggles custom controls visibility', async () => {
    const { container } = await setupPlayer()

    const shield = container.querySelector('.cursor-pointer')
    vi.spyOn(shield.parentElement, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 300,
      height: 200,
      right: 300,
      bottom: 200,
    })

    // Controls container
    const controlsContainer = container.querySelector('.z-30')
    expect(controlsContainer).toBeInTheDocument()
    expect(controlsContainer.className).toContain('opacity-100')

    // Single click on center area
    fireEvent.click(shield, { clientX: 150, clientY: 100 })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Controls toggled off (hidden)
    expect(controlsContainer.className).toContain('opacity-0')

    // Second single click brings controls back
    fireEvent.click(shield, { clientX: 150, clientY: 100 })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(controlsContainer.className).toContain('opacity-100')
  })

  it('double tap on left side (<=35%) triggers seek backward 10s with ripple', async () => {
    const { container } = await setupPlayer()

    const shield = container.querySelector('.cursor-pointer')
    vi.spyOn(shield.parentElement, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 300,
      height: 200,
      right: 300,
      bottom: 200,
    })

    // Tap 1 on left (clientX = 50 < 300 * 0.35 = 105)
    fireEvent.click(shield, { clientX: 50, clientY: 100 })

    // Tap 2 on left within 100ms
    act(() => {
      vi.advanceTimersByTime(100)
    })
    fireEvent.click(shield, { clientX: 50, clientY: 100 })

    // Should seek relative -10s (from currentTime 120s to 110s)
    expect(mockSeekTo).toHaveBeenCalledWith(110, true)

    // Rewind ripple with "-10s" should be visible in the DOM
    expect(screen.getByText('-10s')).toBeInTheDocument()
  })

  it('double tap on right side (>=65%) triggers seek forward 10s with ripple', async () => {
    const { container } = await setupPlayer()

    const shield = container.querySelector('.cursor-pointer')
    vi.spyOn(shield.parentElement, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 300,
      height: 200,
      right: 300,
      bottom: 200,
    })

    // Tap 1 on right (clientX = 250 > 300 * 0.65 = 195)
    fireEvent.click(shield, { clientX: 250, clientY: 100 })

    // Tap 2 on right within 100ms
    act(() => {
      vi.advanceTimersByTime(100)
    })
    fireEvent.click(shield, { clientX: 250, clientY: 100 })

    // Should seek relative +10s (from currentTime 120s to 130s)
    expect(mockSeekTo).toHaveBeenCalledWith(130, true)

    // Forward ripple with "+10s" should be visible in the DOM
    expect(screen.getByText('+10s')).toBeInTheDocument()
  })

  it('double tap on center area toggles play/pause with center pulse ripple', async () => {
    const { container } = await setupPlayer()

    const shield = container.querySelector('.cursor-pointer')
    vi.spyOn(shield.parentElement, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 300,
      height: 200,
      right: 300,
      bottom: 200,
    })

    // Tap 1 on center (clientX = 150)
    fireEvent.click(shield, { clientX: 150, clientY: 100 })

    // Tap 2 on center within 100ms
    act(() => {
      vi.advanceTimersByTime(100)
    })
    fireEvent.click(shield, { clientX: 150, clientY: 100 })

    // Double tap center toggles play/pause
    expect(mockPlayVideo.mock.calls.length + mockPauseVideo.mock.calls.length).toBeGreaterThan(0)
  })

  it('triple tap on left side accumulates -20s seek', async () => {
    const { container } = await setupPlayer()

    const shield = container.querySelector('.cursor-pointer')
    vi.spyOn(shield.parentElement, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 300,
      height: 200,
      right: 300,
      bottom: 200,
    })

    // Tap 1 & 2 (double tap)
    fireEvent.click(shield, { clientX: 45, clientY: 100 })
    act(() => { vi.advanceTimersByTime(100) })
    fireEvent.click(shield, { clientX: 45, clientY: 100 })

    expect(screen.getByText('-10s')).toBeInTheDocument()

    // Tap 3 within 200ms
    act(() => { vi.advanceTimersByTime(150) })
    fireEvent.click(shield, { clientX: 45, clientY: 100 })

    // Accumulates to -20s
    expect(screen.getByText('-20s')).toBeInTheDocument()
  })

  it('clicking control bar play/pause button toggles immediately on single click', async () => {
    await setupPlayer()

    const playPauseBtn = screen.getByRole('button', { name: /^Play$|^Pause$/i })
    expect(playPauseBtn).toBeInTheDocument()

    // Single click on the button itself
    fireEvent.click(playPauseBtn)

    // Fires instantly without double-tap delay!
    expect(mockPlayVideo.mock.calls.length + mockPauseVideo.mock.calls.length).toBeGreaterThan(0)
  })
})
