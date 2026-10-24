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

  const setupPlayer = async (props = {}, startPlaying = true) => {
    let stateChangeHandler = null
    window.YT.Player = vi.fn().mockImplementation((_id, config) => {
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
      if (config?.events?.onReady) {
        config.events.onReady({ target: instance })
      }
      if (config?.events?.onStateChange) {
        stateChangeHandler = config.events.onStateChange
      }
      return instance
    })

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

    if (startPlaying && stateChangeHandler) {
      act(() => {
        stateChangeHandler({ data: 1 })
      })
    }

    return utils
  }

  // ─── A. WHEN CONTROLS ARE VISIBLE: SINGLE TAPS DO WORK ──────────────────────
  it('when controls are visible: single tap on center area toggles play/pause immediately', async () => {
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

    const controlsContainer = container.querySelector('.z-30')
    expect(controlsContainer.className).toContain('opacity-100')

    mockPlayVideo.mockClear()
    mockPauseVideo.mockClear()

    // Single click on center area (clientX = 150)
    fireEvent.click(shield, { clientX: 150, clientY: 100 })

    // Single tap works immediately without needing a double tap!
    expect(mockPlayVideo.mock.calls.length + mockPauseVideo.mock.calls.length).toBe(1)
  })

  it('when controls are visible: single tap on left side seeks backward 10s immediately', async () => {
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

    mockSeekTo.mockClear()

    // Single click on left area (clientX = 40 < 300 * 0.35 = 105)
    fireEvent.click(shield, { clientX: 40, clientY: 100 })

    // Single tap seeks backward 10s immediately (from 120s to 110s)
    expect(mockSeekTo).toHaveBeenCalledWith(110, true)
    expect(screen.getByText('-10s')).toBeInTheDocument()
  })

  it('when controls are visible: single tap on right side seeks forward 10s immediately', async () => {
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

    mockSeekTo.mockClear()

    // Single click on right area (clientX = 260 > 300 * 0.65 = 195)
    fireEvent.click(shield, { clientX: 260, clientY: 100 })

    // Single tap seeks forward 10s immediately (from 120s to 130s)
    expect(mockSeekTo).toHaveBeenCalledWith(130, true)
    expect(screen.getByText('+10s')).toBeInTheDocument()
  })

  // ─── B. WHEN CONTROLS ARE NOT VISIBLE: DOUBLE TAPS ARE REQUIRED ─────────────
  it('when controls are NOT visible: single tap does NOT trigger play/pause or seek, only awakens controls', async () => {
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

    const controlsContainer = container.querySelector('.z-30')
    expect(controlsContainer.className).toContain('opacity-100')

    // Advance 4000ms so controls auto-hide during playback
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(controlsContainer.className).toContain('opacity-0')

    mockPlayVideo.mockClear()
    mockPauseVideo.mockClear()
    mockSeekTo.mockClear()

    // Single click on empty canvas when controls are not visible
    fireEvent.click(shield, { clientX: 150, clientY: 100 })

    // Advance 300ms for single-tap timer to fire
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // It MUST NOT seek and MUST NOT toggle play/pause!
    expect(mockSeekTo).not.toHaveBeenCalled()
    expect(mockPauseVideo).not.toHaveBeenCalled()
    expect(mockPlayVideo).not.toHaveBeenCalled()

    // Controls must awaken/become visible!
    expect(controlsContainer.className).toContain('opacity-100')
  })

  it('when controls are NOT visible: double tap on left side (<=35%) triggers seek backward 10s with ripple', async () => {
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

    // Advance 4000ms so controls auto-hide
    act(() => {
      vi.advanceTimersByTime(4000)
    })

    mockSeekTo.mockClear()

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

  it('when controls are NOT visible: double tap on right side (>=65%) triggers seek forward 10s with ripple', async () => {
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

    // Advance 4000ms so controls auto-hide
    act(() => {
      vi.advanceTimersByTime(4000)
    })

    mockSeekTo.mockClear()

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

  it('when controls are NOT visible: double tap on center area toggles play/pause with center pulse ripple', async () => {
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

    // Advance 4000ms so controls auto-hide
    act(() => {
      vi.advanceTimersByTime(4000)
    })

    mockPlayVideo.mockClear()
    mockPauseVideo.mockClear()

    // Tap 1 on center (clientX = 150)
    fireEvent.click(shield, { clientX: 150, clientY: 100 })

    // Tap 2 on center within 100ms
    act(() => {
      vi.advanceTimersByTime(100)
    })
    fireEvent.click(shield, { clientX: 150, clientY: 100 })

    // Double tap center toggles play/pause
    expect(mockPlayVideo.mock.calls.length + mockPauseVideo.mock.calls.length).toBe(1)
  })

  it('when controls are NOT visible: triple tap on left side accumulates -20s seek', async () => {
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

    // Advance 4000ms so controls auto-hide
    act(() => {
      vi.advanceTimersByTime(4000)
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
