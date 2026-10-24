import { useEffect, useRef, useState, useCallback, useId } from 'react'
import {
  Play, Pause, RotateCcw, RotateCw, Volume2, Volume1, VolumeX,
  Maximize2, Minimize2, ShieldCheck, ChevronLeft, ChevronRight,
  AlertCircle, RefreshCw, Eye, EyeOff, Lock, Zap,
  Smartphone, Award, Check, X
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { loadYouTubeApi } from '../../utils/youtubeApiLoader'
import { saveLectureProgress, getLectureProgress } from '../../utils/youtube'

// ─── Time Formatter ──────────────────────────────────────────────────────────
function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00'
  const s = Math.floor(seconds)
  const hrs = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

// ─── Speed Options ────────────────────────────────────────────────────────────
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

// ─── Quality Options ──────────────────────────────────────────────────────────
const QUALITY_OPTIONS = [
  { id: '480p', label: 'Data Saver (480p)', short: '480p', badge: '⚡ 480p', desc: 'Saves ~65% mobile data', ytQuality: 'large' },
  { id: '720p', label: 'Balanced (720p)', short: '720p', badge: '720p', desc: 'Clear notes & formulas', ytQuality: 'hd720' },
  { id: '1080p', label: 'Full HD (1080p)', short: '1080p', badge: '1080p', desc: 'Maximum sharpness', ytQuality: 'hd1080' },
  { id: 'auto', label: 'Auto (Adaptive)', short: 'Auto', badge: 'Auto', desc: 'Adapts to network speed', ytQuality: 'default' },
]

const DEFAULT_PLAYLIST_ITEMS = []

export default function ProtectedVideoPlayer({
  videoId,
  playlistId,
  title: _title = 'Lecture Video',
  subject: _subject = '',
  isPlaylist = false,
  playlistItems = DEFAULT_PLAYLIST_ITEMS,
  activeVideoIndex = 0,
  onPrevVideo,
  onNextVideo,
  onPlaylistSync,
  onIndexChange,
  onVideoTitleChange,
  isFullscreen = false,
  onToggleFullscreen,
  onTimeUpdate,
  initialSeekSeconds = 0,
  isModalOpen = false,
  className = '',
}) {
  const containerRef = useRef(null)
  const videoCanvasRef = useRef(null)
  const iframeContainerRef = useRef(null)
  const playerRef = useRef(null)
  const uniqueId = useId().replace(/:/g, '_')
  const ytPlayerId = `yt_player_${uniqueId}`

  // Playback & Timing state
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isEnded, setIsEnded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [loadedFraction, setLoadedFraction] = useState(0)

  // Interactive Controls state
  const [controlsVisible, setControlsVisible] = useState(true)
  const [volume, setVolume] = useState(100)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)

  // Quality state
  const [selectedQuality, setSelectedQuality] = useState(() => {
    try {
      return localStorage.getItem('ta_video_quality') || 'auto'
    } catch {
      return 'auto'
    }
  })
  const [showQualityMenu, setShowQualityMenu] = useState(false)

  // Student Classroom Features
  const [isScreenLocked, setIsScreenLocked] = useState(false)
  const [showLockToast, setShowLockToast] = useState(false)
  const [cleanView, setCleanView] = useState(false)
  const [showCleanToast, setShowCleanToast] = useState(false)
  const [isLongPressing2x, setIsLongPressing2x] = useState(false)

  // Scrubbing & Hover state
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [hoverTime, setHoverTime] = useState(null)
  const [hoverPosition, setHoverPosition] = useState(0)
  const seekbarRef = useRef(null)
  const progressFillRef = useRef(null)

  // Cumulative Multi-Tap Seek Ripple state: { type: 'rewind'|'forward', count: number, id: number }
  const [ripple, setRipple] = useState(null)

  // Swipe-to-Seek HUD state: { deltaSeconds: number, targetTime: number }
  const [swipeSeekHud, setSwipeSeekHud] = useState(null)

  // Auto-advance countdown state (5, 4, 3, 2, 1, or null)
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState(null)
  const autoAdvanceTimerRef = useRef(null)

  // Lecture progress resume prompt state
  const [resumeData, setResumeData] = useState(null)
  const resumePromptTimerRef = useRef(null)

  // Internal refs for timers and gesture logic
  const hideControlsTimerRef = useRef(null)
  const lockToastTimerRef = useRef(null)
  const cleanToastTimerRef = useRef(null)
  const progressIntervalRef = useRef(null)
  const singleTapTimerRef = useRef(null)
  const rippleTimerRef = useRef(null)
  const lastTapRef = useRef({ time: 0, x: 0, y: 0, count: 0, zone: null, isDoubleTapping: false })
  const lastTouchTimeRef = useRef(0)
  const longPressTimerRef = useRef(null)
  const isHoldingRef = useRef(false)
  const savedRateBeforeHoldRef = useRef(1)
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 })
  const isSwipingRef = useRef(false)
  const swipeStartRef = useRef({ x: 0, time: 0, startMediaTime: 0 })
  const navCooldownRef = useRef(false)

  // Live state refs
  const controlsVisibleRef = useRef(controlsVisible)
  const isPlayingRef = useRef(isPlaying)
  const isScrubbingRef = useRef(isScrubbing)
  const lastSoughtTimestampRef = useRef(null)
  const showSpeedMenuRef = useRef(showSpeedMenu)
  const showQualityMenuRef = useRef(showQualityMenu)
  const isScreenLockedRef = useRef(isScreenLocked)
  const cleanViewRef = useRef(cleanView)
  const durationRef = useRef(duration)
  const currentTimeRef = useRef(currentTime)
  const playbackRateRef = useRef(playbackRate)
  const videoIdRef = useRef(videoId)
  const playlistIdRef = useRef(playlistId)
  const isPlaylistRef = useRef(isPlaylist)
  const playlistItemsRef = useRef(playlistItems)
  const selectedQualityRef = useRef(selectedQuality)
  const activeIndexRef = useRef(activeVideoIndex)
  const activeVideoIdRef = useRef(videoId)
  const activePlaylistIdRef = useRef(playlistId)
  const currentLoadedVideoIdRef = useRef(videoId)
  const currentLoadedIndexRef = useRef(activeVideoIndex)
  const volumeRef = useRef(volume)
  const isModalOpenRef = useRef(isModalOpen)

  // Stable callback refs to prevent any player teardown loops
  const onVideoTitleChangeRef = useRef(onVideoTitleChange)
  const onPlaylistSyncRef = useRef(onPlaylistSync)
  const onIndexChangeRef = useRef(onIndexChange)
  const onNextVideoRef = useRef(onNextVideo)
  const onPrevVideoRef = useRef(onPrevVideo)

  useEffect(() => { controlsVisibleRef.current = controlsVisible }, [controlsVisible])
  useEffect(() => { volumeRef.current = volume }, [volume])
  useEffect(() => { isModalOpenRef.current = isModalOpen }, [isModalOpen])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { isScrubbingRef.current = isScrubbing }, [isScrubbing])
  useEffect(() => { showSpeedMenuRef.current = showSpeedMenu }, [showSpeedMenu])
  useEffect(() => { showQualityMenuRef.current = showQualityMenu }, [showQualityMenu])
  useEffect(() => { isScreenLockedRef.current = isScreenLocked }, [isScreenLocked])
  useEffect(() => { cleanViewRef.current = cleanView }, [cleanView])
  useEffect(() => { durationRef.current = duration }, [duration])
  useEffect(() => { currentTimeRef.current = currentTime }, [currentTime])
  useEffect(() => { playbackRateRef.current = playbackRate }, [playbackRate])
  useEffect(() => { videoIdRef.current = videoId }, [videoId])
  useEffect(() => { playlistIdRef.current = playlistId }, [playlistId])
  useEffect(() => { isPlaylistRef.current = isPlaylist }, [isPlaylist])
  useEffect(() => { playlistItemsRef.current = playlistItems }, [playlistItems])
  useEffect(() => { selectedQualityRef.current = selectedQuality }, [selectedQuality])
  useEffect(() => { activeIndexRef.current = activeVideoIndex }, [activeVideoIndex])
  useEffect(() => { activeVideoIdRef.current = videoId }, [videoId])
  useEffect(() => { activePlaylistIdRef.current = playlistId }, [playlistId])
  useEffect(() => { onVideoTitleChangeRef.current = onVideoTitleChange }, [onVideoTitleChange])
  useEffect(() => { onPlaylistSyncRef.current = onPlaylistSync }, [onPlaylistSync])
  useEffect(() => { onIndexChangeRef.current = onIndexChange }, [onIndexChange])
  useEffect(() => { onNextVideoRef.current = onNextVideo }, [onNextVideo])
  useEffect(() => { onPrevVideoRef.current = onPrevVideo }, [onPrevVideo])
  const onTimeUpdateRef = useRef(onTimeUpdate)
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate }, [onTimeUpdate])

  // ─── Reset Controls Inactivity Auto-Hide Timer ─────────────────────────────
  const showControlsTemporarily = useCallback((durationMs = 3500) => {
    if (isScreenLockedRef.current || cleanViewRef.current) return
    setControlsVisible(true)
    controlsVisibleRef.current = true
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current)

    // Auto-hide only when playing and menus are closed
    hideControlsTimerRef.current = setTimeout(() => {
      if (
        isPlayingRef.current &&
        !isScrubbingRef.current &&
        !showSpeedMenuRef.current &&
        !showQualityMenuRef.current &&
        !isHoldingRef.current &&
        !cleanViewRef.current
      ) {
        setControlsVisible(false)
        controlsVisibleRef.current = false
      }
    }, durationMs)
  }, [])

  // Auto-hide when playing; keep visible when paused unless cleanView is triggered
  useEffect(() => {
    if (cleanView) return
    if (!isPlaying || isEnded || hasError) {
      setControlsVisible(true)
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current)
    } else {
      showControlsTemporarily(3500)
    }
  }, [isPlaying, isEnded, hasError, cleanView, showControlsTemporarily])

  useEffect(() => {
    if (!cleanViewRef.current) {
      showControlsTemporarily(4000)
    }
  }, [isFullscreen, showControlsTemporarily])

  // ─── Apply Quality Setting ────────────────────────────────────────────────
  const applyQualityToPlayer = useCallback((qualityId) => {
    const qOpt = QUALITY_OPTIONS.find(q => q.id === qualityId) || QUALITY_OPTIONS[3]
    if (playerRef.current?.setPlaybackQuality) {
      try {
        playerRef.current.setPlaybackQuality(qOpt.ytQuality)
      } catch (e) { void e }
    }
  }, [])

  const handleSelectQuality = (qualityId) => {
    setSelectedQuality(qualityId)
    setShowQualityMenu(false)
    try {
      localStorage.setItem('ta_video_quality', qualityId)
    } catch { /* Ignore */ }
    applyQualityToPlayer(qualityId)
    showControlsTemporarily()
  }

  // ─── Auto-Advance Countdown Controller ─────────────────────────────────────
  const cancelAutoAdvance = useCallback(() => {
    if (autoAdvanceTimerRef.current) clearInterval(autoAdvanceTimerRef.current)
    autoAdvanceTimerRef.current = null
    setAutoAdvanceCountdown(null)
  }, [])

  const startAutoAdvanceCountdown = useCallback(() => {
    if (autoAdvanceTimerRef.current) clearInterval(autoAdvanceTimerRef.current)
    setAutoAdvanceCountdown(5)
    let left = 5
    autoAdvanceTimerRef.current = setInterval(() => {
      left -= 1
      if (left <= 0) {
        clearInterval(autoAdvanceTimerRef.current)
        autoAdvanceTimerRef.current = null
        setAutoAdvanceCountdown(null)
        onNextVideoRef.current?.()
      } else {
        setAutoAdvanceCountdown(left)
      }
    }, 1000)
  }, [])

  // ─── Initialize YouTube Player ─────────────────────────────────────────────
  const initializePlayer = useCallback(async () => {
    setHasError(false)
    setErrorMessage('')
    setIsReady(false)
    cancelAutoAdvance()

    try {
      const YT = await loadYouTubeApi()
      if (!iframeContainerRef.current) return

      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy() } catch (e) { void e }
        playerRef.current = null
      }

      iframeContainerRef.current.innerHTML = `<div id="${ytPlayerId}" class="w-full h-full pointer-events-none select-none"></div>`

      const playerVars = {
        autoplay: 1,
        controls: 0,        // HIDE native YouTube controls completely
        disablekb: 1,       // DISABLE native YouTube keyboard shortcuts
        fs: 0,              // HIDE native YouTube fullscreen button
        modestbranding: 1,  // HIDE YouTube logo where possible
        rel: 0,             // NO non-channel related videos
        iv_load_policy: 3,  // HIDE video annotations
        playsinline: 1,     // Mobile inline playback
        enablejsapi: 1,     // Enable IFrame API
        origin: window.location.origin,
      }

      const rawVid = videoIdRef.current
      const currentPlId = playlistIdRef.current
      // Only fallback to native YouTube playlist mode if no direct videoId is known.
      // Passing listType='playlist' when videoId is known forces YouTube to render its native mobile header,
      // center playback buttons, and watermark, overriding controls: 0.
      if (!rawVid && currentPlId) {
        playerVars.listType = 'playlist'
        playerVars.list = currentPlId
        playerVars.index = activeIndexRef.current || 0
      }

      currentLoadedVideoIdRef.current = videoIdRef.current
      currentLoadedIndexRef.current = activeIndexRef.current

      // Prepare options for YT.Player
      const playerOptions = {
        playerVars,
        events: {
          onReady: (event) => {
            setIsReady(true)
            setHasError(false)
            setErrorMessage('')
            try {
              const dur = event.target.getDuration() || 0
              if (dur > 0) setDuration(dur)
              if (initialSeekSeconds && initialSeekSeconds > 0) {
                event.target.seekTo(initialSeekSeconds, true)
              }
              const iframe = event.target.getIframe?.()
              if (iframe) {
                iframe.style.pointerEvents = 'none'
                iframe.tabIndex = -1
                iframe.setAttribute('tabindex', '-1')
                iframe.setAttribute('aria-hidden', 'true')
              }
              applyQualityToPlayer(selectedQualityRef.current)

              // Discover full playlist IDs directly from YouTube player
              if (playlistIdRef.current && typeof event.target.getPlaylist === 'function') {
                const list = event.target.getPlaylist()
                if (Array.isArray(list) && list.length > 0) {
                  onPlaylistSyncRef.current?.(list)
                }
              }

              event.target.playVideo()
            } catch { /* Ignore */ }
          },
          onStateChange: (event) => {
            const state = event.data
            const player = event.target

            const PlayingState = YT.PlayerState?.PLAYING ?? 1
            const BufferingState = YT.PlayerState?.BUFFERING ?? 3
            const CuedState = YT.PlayerState?.CUED ?? 5
            const PausedState = YT.PlayerState?.PAUSED ?? 2
            const EndedState = YT.PlayerState?.ENDED ?? 0

            if (state === PlayingState) {
              setIsPlaying(true)
              setIsEnded(false)
              setHasError(false)
              setErrorMessage('')
              cancelAutoAdvance()

              try {
                const dur = player.getDuration() || 0
                if (dur > 0) setDuration(dur)
                const currentVol = player.getVolume?.() ?? 100
                setVolume(currentVol)
                const muted = player.isMuted?.() ?? false
                setIsMuted(muted)
                const rate = player.getPlaybackRate?.() ?? 1
                if (!isHoldingRef.current) {
                  setPlaybackRate(rate)
                }

                // Keep active index in sync when YouTube advances inside playlist
                if (isPlaylistRef.current && typeof player.getPlaylistIndex === 'function') {
                  const currentIdx = player.getPlaylistIndex()
                  if (typeof currentIdx === 'number' && currentIdx >= 0) {
                    currentLoadedIndexRef.current = currentIdx
                    if (currentIdx !== activeIndexRef.current) {
                      onIndexChangeRef.current?.(currentIdx)
                    }
                  }
                }

                // Keep video title updated if changed in playlist
                if (typeof player.getVideoData === 'function') {
                  const data = player.getVideoData()
                  if (data?.video_id) {
                    currentLoadedVideoIdRef.current = data.video_id
                  }
                  if (data?.title) {
                    onVideoTitleChangeRef.current?.(data.title, data.video_id)
                  }
                }
              } catch { /* Ignore */ }
            } else if (state === PausedState) {
              setIsPlaying(false)
            } else if (state === BufferingState) {
              // Video is actively streaming/buffering - clear any transient errors
              setHasError(false)
              setErrorMessage('')
            } else if (state === EndedState) {
              setIsPlaying(false)
              setIsEnded(true)
              setControlsVisible(true)

              // Check if auto-advancing to next lecture in playlist is possible
              if (isPlaylistRef.current) {
                const total = playlistItemsRef.current.length || (player.getPlaylist?.()?.length ?? 0)
                if (total > 0 && activeIndexRef.current < total - 1) {
                  startAutoAdvanceCountdown()
                }
              }
            } else if (state === CuedState) {
              setIsEnded(false)
              setHasError(false)
              setErrorMessage('')
            }
          },
          onError: (event) => {
            const code = event.data
            console.warn('YouTube Player error code:', code)

            // If the video is already playing or stream is active, do NOT interrupt smooth playback
            const playerState = playerRef.current?.getPlayerState?.()
            if (isPlayingRef.current || playerState === (YT.PlayerState?.PLAYING ?? 1)) {
              console.log('Ignoring non-fatal error code', code, 'as stream is active/playing')
              return
            }

            // Error code 2: Parameter warning (e.g. transient playlist cue warning or param mismatch).
            // YouTube frequently recovers from code 2 on its own and streams smoothly.
            // Check if playback starts before displaying an alarming warning overlay to the student.
            if (code === 2) {
              console.warn('Transient parameter warning (code 2); verifying if playback begins...')
              setTimeout(() => {
                const curState = playerRef.current?.getPlayerState?.()
                if (
                  curState === (YT.PlayerState?.PLAYING ?? 1) ||
                  curState === (YT.PlayerState?.BUFFERING ?? 3) ||
                  isPlayingRef.current
                ) {
                  return
                }
                setHasError(true)
                setErrorMessage('Unable to start video playback. Please click retry.')
              }, 1200)
              return
            }

            setHasError(true)
            if (code === 100) {
              setErrorMessage('This lecture video is currently unavailable or has been removed.')
            } else if (code === 101 || code === 150) {
              setErrorMessage('Direct streaming is restricted for this video. Contact platform support.')
            } else {
              setErrorMessage('Unable to load video stream. Please check your internet connection.')
            }
          }
        }
      }

      // ONLY pass videoId if non-empty string; never pass empty string '' which causes error 2
      if (rawVid && typeof rawVid === 'string' && rawVid.trim().length > 0) {
        playerOptions.videoId = rawVid.trim()
      }

      playerRef.current = new YT.Player(ytPlayerId, playerOptions)
    } catch (err) {
      console.warn('Failed to initialize YouTube Player:', err)
      setHasError(true)
      setErrorMessage('Could not initialize video player. Please click retry.')
    }
  }, [ytPlayerId, cancelAutoAdvance, startAutoAdvanceCountdown, applyQualityToPlayer, initialSeekSeconds])

  // Mount/Unmount lifecycle (only runs on initial mount)
  useEffect(() => {
    initializePlayer()
    const singleTapTimer = singleTapTimerRef.current

    return () => {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current)
      if (rippleTimerRef.current) clearTimeout(rippleTimerRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current)
      if (lockToastTimerRef.current) clearTimeout(lockToastTimerRef.current)
      if (cleanToastTimerRef.current) clearTimeout(cleanToastTimerRef.current)
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
      if (autoAdvanceTimerRef.current) clearInterval(autoAdvanceTimerRef.current)
      if (resumePromptTimerRef.current) clearTimeout(resumePromptTimerRef.current)
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy() } catch (e) { void e }
        playerRef.current = null
      }
    }
  }, [initializePlayer])

  // Handle seeking if initialSeekSeconds is supplied or updated (with loop prevention & bounds check)
  useEffect(() => {
    if (isReady && playerRef.current && typeof playerRef.current.seekTo === 'function' && initialSeekSeconds > 0) {
      if (lastSoughtTimestampRef.current !== initialSeekSeconds) {
        lastSoughtTimestampRef.current = initialSeekSeconds
        try {
          const dur = typeof playerRef.current.getDuration === 'function' ? playerRef.current.getDuration() : 0
          const target = dur > 0 ? Math.min(Math.max(0, initialSeekSeconds), dur) : Math.max(0, initialSeekSeconds)
          playerRef.current.seekTo(target, true)
        } catch { /* Ignore */ }
      }
    }
  }, [isReady, initialSeekSeconds])

  // Instant lecture transitions: playVideoAt or loadVideoById WITHOUT iframe teardown
  useEffect(() => {
    if (!isReady || !playerRef.current) return

    cancelAutoAdvance()

    const player = playerRef.current
    const targetItem = playlistItemsRef.current[activeVideoIndex]
    const targetVideoId = targetItem?.videoId || (activeVideoIndex === 0 ? videoId : null)

    // 1. In native playlist mode: if the player has native playlist entries
    const nativeList = typeof player.getPlaylist === 'function' ? player.getPlaylist() : null
    const hasNativeList = Array.isArray(nativeList) && nativeList.length > 0

    if (hasNativeList && typeof player.playVideoAt === 'function') {
      if (currentLoadedIndexRef.current !== activeVideoIndex) {
        currentLoadedIndexRef.current = activeVideoIndex
        if (targetVideoId) currentLoadedVideoIdRef.current = targetVideoId
        try {
          setHasError(false)
          setErrorMessage('')
          setIsEnded(false)
          player.playVideoAt(activeVideoIndex)
          applyQualityToPlayer(selectedQualityRef.current)
        } catch (err) {
          console.warn('playVideoAt error:', err)
        }
      }
      return
    }

    // 2. Otherwise load directly by videoId
    if (targetVideoId && typeof player.loadVideoById === 'function') {
      if (currentLoadedVideoIdRef.current !== targetVideoId || currentLoadedIndexRef.current !== activeVideoIndex) {
        currentLoadedVideoIdRef.current = targetVideoId
        currentLoadedIndexRef.current = activeVideoIndex
        try {
          setHasError(false)
          setErrorMessage('')
          setIsEnded(false)
          player.loadVideoById(targetVideoId)
          applyQualityToPlayer(selectedQualityRef.current)
        } catch (err) {
          console.warn('loadVideoById error:', err)
        }
      }
    }
  }, [activeVideoIndex, videoId, isReady, cancelAutoAdvance, applyQualityToPlayer])

  // Save playback progress every few seconds during playback
  useEffect(() => {
    if (isPlaying && isReady && currentTime > 3 && duration > 0) {
      const currentVid = videoId || playlistItems[activeVideoIndex]?.videoId
      if (currentVid) {
        saveLectureProgress(currentVid, currentTime, duration)
      }
    }
  }, [currentTime, duration, isPlaying, isReady, videoId, playlistItems, activeVideoIndex])

  // Saved Progress Resume Controller
  const [resumeDismissed, setResumeDismissed] = useState(false)

  // Reset dismissal when video changes
  useEffect(() => {
    setResumeDismissed(false)
  }, [videoId, activeVideoIndex])

  // Check saved progress to offer resume when lecture changes
  useEffect(() => {
    // If an initial seek is specifically requested (e.g. doubt deep-link) or user dismissed, skip saved resume prompt
    if (initialSeekSeconds > 0 || resumeDismissed) {
      setResumeData(null)
      return
    }

    const currentVid = videoId || playlistItems[activeVideoIndex]?.videoId
    if (!currentVid) return
    const saved = getLectureProgress(currentVid)
    if (saved && saved.time > 15 && saved.duration > 0 && saved.time < saved.duration - 30 && !saved.completed) {
      setResumeData(saved)
      if (resumePromptTimerRef.current) clearTimeout(resumePromptTimerRef.current)
      resumePromptTimerRef.current = setTimeout(() => {
        setResumeData(null)
      }, 7000)
    } else {
      setResumeData(null)
    }
    return () => {
      if (resumePromptTimerRef.current) clearTimeout(resumePromptTimerRef.current)
    }
  }, [videoId, activeVideoIndex, playlistItems, initialSeekSeconds, resumeDismissed])

  const handleDismissResume = useCallback(() => {
    setResumeDismissed(true)
    setResumeData(null)
    if (resumePromptTimerRef.current) clearTimeout(resumePromptTimerRef.current)
  }, [])

  const handleResumePlayback = useCallback(() => {
    setResumeDismissed(true)
    const targetTime = resumeData?.time
    setResumeData(null)
    if (typeof targetTime === 'number') {
      try {
        if (playerRef.current?.seekTo) {
          playerRef.current.seekTo(targetTime, true)
        }
        setCurrentTime(targetTime)
        if (typeof playerRef.current?.playVideo === 'function') {
          playerRef.current.playVideo()
        }
      } catch { /* Ignore */ }
    }
  }, [resumeData])

  // High-Frequency Progress Loop (250ms when playing)
  useEffect(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)

    if (isReady && isPlaying && !isScrubbing) {
      progressIntervalRef.current = setInterval(() => {
        try {
          if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return
          const cur = playerRef.current.getCurrentTime() || 0
          const dur = playerRef.current.getDuration() || 0
          const loaded = playerRef.current.getVideoLoadedFraction?.() || 0

          if (cur > 0) {
            setHasError(prev => {
              if (prev) setErrorMessage('')
              return false
            })
          }

          if (dur > 0 && dur !== duration) setDuration(dur)
          setCurrentTime(cur)
          if (typeof onTimeUpdateRef.current === 'function') {
            onTimeUpdateRef.current(cur, dur)
          }
          setLoadedFraction(loaded)

          if (progressFillRef.current && dur > 0) {
            const pct = Math.min(100, Math.max(0, (cur / dur) * 100))
            progressFillRef.current.style.width = `${pct}%`
          }
        } catch { /* Ignore */ }
      }, 250)
    }

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [isReady, isPlaying, isScrubbing, duration])

  // Play / Pause Toggle
  const togglePlayPause = useCallback(() => {
    if (!playerRef.current || !isReady) return
    try {
      if (isEnded) {
        playerRef.current.seekTo(0, true)
        playerRef.current.playVideo()
        setIsEnded(false)
      } else if (isPlaying) {
        playerRef.current.pauseVideo()
      } else {
        playerRef.current.playVideo()
      }
    } catch { /* Ignore */ }
    showControlsTemporarily()
  }, [isReady, isPlaying, isEnded, showControlsTemporarily])

  // Seek Relative
  const seekRelative = useCallback((deltaSeconds) => {
    if (!playerRef.current || !isReady) return
    try {
      const cur = playerRef.current.getCurrentTime() || 0
      const dur = durationRef.current || playerRef.current.getDuration() || 0
      const target = Math.max(0, Math.min(dur, cur + deltaSeconds))
      playerRef.current.seekTo(target, true)
      setCurrentTime(target)
      if (dur > 0 && progressFillRef.current) {
        progressFillRef.current.style.width = `${(target / dur) * 100}%`
      }
    } catch { /* Ignore */ }
    showControlsTemporarily()
  }, [isReady, showControlsTemporarily])

  // Volume & Mute Controls
  const handleVolumeChange = useCallback((newVol) => {
    const vol = Math.max(0, Math.min(100, Number(newVol)))
    volumeRef.current = vol
    setVolume(vol)
    if (!playerRef.current) return
    try {
      playerRef.current.setVolume(vol)
      if (vol === 0) {
        playerRef.current.mute()
        setIsMuted(true)
      } else if (isMuted) {
        playerRef.current.unMute()
        setIsMuted(false)
      }
    } catch { /* Ignore */ }
    showControlsTemporarily()
  }, [isMuted, showControlsTemporarily])

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return
    try {
      let currentlyMuted = isMuted
      try {
        if (typeof playerRef.current.isMuted === 'function') {
          currentlyMuted = playerRef.current.isMuted()
        }
      } catch { /* fallback */ }

      if (currentlyMuted) {
        playerRef.current.unMute()
        setIsMuted(false)
        if (volumeRef.current === 0) {
          playerRef.current.setVolume(50)
          setVolume(50)
          volumeRef.current = 50
        }
      } else {
        playerRef.current.mute()
        setIsMuted(true)
      }
    } catch { /* Ignore */ }
    showControlsTemporarily()
  }, [isMuted, showControlsTemporarily])

  // Playback Speed Selector
  const handleRateChange = useCallback((rate) => {
    playbackRateRef.current = rate
    setPlaybackRate(rate)
    setShowSpeedMenu(false)
    if (!playerRef.current) return
    try {
      playerRef.current.setPlaybackRate(rate)
    } catch { /* Ignore */ }
    showControlsTemporarily()
  }, [showControlsTemporarily])

  // Long-Press to 2x Fast-Forward Logic (Hold to Skim)
  const startLongPress2x = useCallback(() => {
    if (isScreenLockedRef.current || !isPlayingRef.current || !playerRef.current) return
    isHoldingRef.current = true
    savedRateBeforeHoldRef.current = playbackRateRef.current
    setIsLongPressing2x(true)
    try {
      playerRef.current.setPlaybackRate(2)
    } catch { /* Ignore */ }
  }, [])

  const endLongPress2x = useCallback(() => {
    if (!isHoldingRef.current) return
    isHoldingRef.current = false
    setIsLongPressing2x(false)
    if (playerRef.current) {
      try {
        playerRef.current.setPlaybackRate(savedRateBeforeHoldRef.current || 1)
      } catch { /* Ignore */ }
    }
  }, [])

  // Scrubber / Seekbar Pointer Dragging
  const calculateScrubTime = useCallback((clientX) => {
    if (!seekbarRef.current || durationRef.current <= 0) return 0
    const rect = seekbarRef.current.getBoundingClientRect()
    const offsetX = clientX - rect.left
    const fraction = Math.max(0, Math.min(1, offsetX / rect.width))
    return fraction * durationRef.current
  }, [])

  const handleSeekPointerDown = (e) => {
    e.stopPropagation()
    if (duration <= 0 || isScreenLocked) return
    setIsScrubbing(true)
    const targetTime = calculateScrubTime(e.clientX)
    setCurrentTime(targetTime)
    if (progressFillRef.current) {
      progressFillRef.current.style.width = `${(targetTime / duration) * 100}%`
    }

    const onPointerMove = (moveEvent) => {
      moveEvent.preventDefault()
      const t = calculateScrubTime(moveEvent.clientX)
      setCurrentTime(t)
      if (progressFillRef.current) {
        progressFillRef.current.style.width = `${(t / duration) * 100}%`
      }
    }

    const onPointerUp = (upEvent) => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      setIsScrubbing(false)
      const finalTime = calculateScrubTime(upEvent.clientX)
      if (playerRef.current?.seekTo) {
        try { playerRef.current.seekTo(finalTime, true) } catch { /* Ignore */ }
      }
      showControlsTemporarily()
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  const handleSeekbarHover = (e) => {
    if (duration <= 0 || !seekbarRef.current || isScreenLocked) return
    const rect = seekbarRef.current.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const fraction = Math.max(0, Math.min(1, offsetX / rect.width))
    setHoverTime(fraction * duration)
    setHoverPosition(fraction * 100)
  }

  // Touch Shield Gestures: Cumulative Tap + Hold-to-2x + Swipe Seek
  const handleShieldTouchStart = (e) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    isSwipingRef.current = false

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      startLongPress2x()
    }, 350)
  }

  const handleShieldTouchMove = (e) => {
    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y

    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    }

    if (Math.abs(deltaX) > 25 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && !isScreenLockedRef.current && durationRef.current > 0) {
      if (!isSwipingRef.current) {
        isSwipingRef.current = true
        swipeStartRef.current = {
          x: touch.clientX,
          time: Date.now(),
          startMediaTime: currentTimeRef.current
        }
      }

      const rect = videoCanvasRef.current?.getBoundingClientRect()
      const totalWidth = rect ? rect.width : window.innerWidth
      const seekRatio = (touch.clientX - swipeStartRef.current.x) / totalWidth
      const deltaSec = Math.round(seekRatio * 90)
      const target = Math.max(0, Math.min(durationRef.current, swipeStartRef.current.startMediaTime + deltaSec))

      setSwipeSeekHud({ deltaSeconds: deltaSec, targetTime: target })
    }
  }

  const handleShieldTouchEnd = (e) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (isHoldingRef.current) {
      endLongPress2x()
      return
    }

    if (isSwipingRef.current) {
      isSwipingRef.current = false
      if (swipeSeekHud && playerRef.current?.seekTo) {
        try {
          playerRef.current.seekTo(swipeSeekHud.targetTime, true)
          setCurrentTime(swipeSeekHud.targetTime)
        } catch { /* Ignore */ }
      }
      setSwipeSeekHud(null)
      showControlsTemporarily()
      return
    }

    const touch = e.changedTouches[0]
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x)
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)

    if (deltaX > 14 || deltaY > 14) return

    lastTouchTimeRef.current = Date.now()
    handleShieldTap(touch.clientX, touch.clientY)
  }

  // Single Tap on empty video canvas area: awakens / reveals custom player controls
  // When shown, controls stay visible for a few seconds (3.5s) before auto-hiding
  const handleSingleTapOnEmptyArea = useCallback(() => {
    if (isScreenLockedRef.current || cleanViewRef.current) return

    // If speed or quality menus are open, dismiss menus while keeping controls visible
    if (showSpeedMenuRef.current || showQualityMenuRef.current) {
      setShowSpeedMenu(false)
      setShowQualityMenu(false)
      showControlsTemporarily(3500)
      return
    }

    setControlsVisible(true)
    controlsVisibleRef.current = true
    showControlsTemporarily(3500)
  }, [showControlsTemporarily])

  // Interactive Gesture Engine:
  // - When player controls ARE visible:
  //   Single taps work immediately (play/pause, seek rewind -10s, seek forward +10s).
  //   Double taps are NOT required when controls are visible!
  // - When player controls are NOT visible:
  //   Double taps are REQUIRED to seek or toggle play/pause!
  //   Single tap on empty canvas awakens/reveals controls, protecting against accidental touches while watching.
  const handleShieldTap = (clientX, clientY) => {
    if (isScreenLockedRef.current) {
      setShowLockToast(true)
      if (lockToastTimerRef.current) clearTimeout(lockToastTimerRef.current)
      lockToastTimerRef.current = setTimeout(() => setShowLockToast(false), 2200)
      return
    }

    if (cleanViewRef.current) {
      setCleanView(false)
      setShowCleanToast(false)
      setControlsVisible(true)
      controlsVisibleRef.current = true
      showControlsTemporarily(3500)
      return
    }

    // Dismiss open menus on tap
    if (showSpeedMenuRef.current || showQualityMenuRef.current) {
      setShowSpeedMenu(false)
      setShowQualityMenu(false)
      showControlsTemporarily(3500)
      return
    }

    const now = Date.now()
    const last = lastTapRef.current
    const rect = videoCanvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const relX = clientX - rect.left
    const width = rect.width
    const isRewind = relX < width * 0.35
    const isForward = relX > width * 0.65
    const zone = isRewind ? 'rewind' : isForward ? 'forward' : 'center'

    // ─────────────────────────────────────────────────────────────────────────
    // A. WHEN PLAYER CONTROLS ARE VISIBLE:
    // Single taps DO WORK immediately! No double taps required!
    // ─────────────────────────────────────────────────────────────────────────
    if (controlsVisibleRef.current) {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current)
        singleTapTimerRef.current = null
      }

      // Check for rapid consecutive seek taps on visible controls (within 550ms)
      const isRapidConsecutiveSeek = (
        (now - last.time < 550) &&
        last.zone === zone &&
        (zone === 'rewind' || zone === 'forward')
      )

      if (isRapidConsecutiveSeek) {
        const nextCount = (last.count || 1) + 1
        lastTapRef.current = { time: now, x: clientX, y: clientY, count: nextCount, zone, isDoubleTapping: true }

        if (zone === 'rewind') {
          seekRelative(-10)
          setRipple({ type: 'rewind', count: nextCount * 10, id: now })
        } else {
          seekRelative(10)
          setRipple({ type: 'forward', count: nextCount * 10, id: now })
        }

        if (rippleTimerRef.current) clearTimeout(rippleTimerRef.current)
        rippleTimerRef.current = setTimeout(() => setRipple(null), 850)
        showControlsTemporarily(3500)
        return
      }

      // Single tap on visible controls executes immediately
      if (zone === 'rewind') {
        lastTapRef.current = { time: now, x: clientX, y: clientY, count: 1, zone, isDoubleTapping: false }
        seekRelative(-10)
        setRipple({ type: 'rewind', count: 10, id: now })
        if (rippleTimerRef.current) clearTimeout(rippleTimerRef.current)
        rippleTimerRef.current = setTimeout(() => setRipple(null), 850)
        showControlsTemporarily(3500)
        return
      }

      if (zone === 'forward') {
        lastTapRef.current = { time: now, x: clientX, y: clientY, count: 1, zone, isDoubleTapping: false }
        seekRelative(10)
        setRipple({ type: 'forward', count: 10, id: now })
        if (rippleTimerRef.current) clearTimeout(rippleTimerRef.current)
        rippleTimerRef.current = setTimeout(() => setRipple(null), 850)
        showControlsTemporarily(3500)
        return
      }

      // Center zone single tap: Toggles Play / Pause immediately!
      lastTapRef.current = { time: now, x: clientX, y: clientY, count: 1, zone, isDoubleTapping: false }
      const willPause = isPlayingRef.current
      togglePlayPause()
      setRipple({ type: willPause ? 'pause' : 'play', id: now })
      if (rippleTimerRef.current) clearTimeout(rippleTimerRef.current)
      rippleTimerRef.current = setTimeout(() => setRipple(null), 850)
      showControlsTemporarily(3500)
      return
    }

    // ─────────────────────────────────────────────────────────────────────────
    // B. WHEN PLAYER CONTROLS ARE NOT VISIBLE:
    // Double taps ARE REQUIRED to seek or toggle play/pause!
    // ─────────────────────────────────────────────────────────────────────────

    // 1. Rapid consecutive tap accumulation (3rd, 4th tap on seek within 550ms)
    const isRapidConsecutiveSeek = (
      last.isDoubleTapping &&
      (now - last.time < 550) &&
      last.zone === zone &&
      (zone === 'rewind' || zone === 'forward')
    )

    if (isRapidConsecutiveSeek) {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current)
        singleTapTimerRef.current = null
      }

      const nextCount = (last.count || 1) + 1
      lastTapRef.current = { time: now, x: clientX, y: clientY, count: nextCount, zone, isDoubleTapping: true }

      if (zone === 'rewind') {
        seekRelative(-10)
        setRipple({ type: 'rewind', count: nextCount * 10, id: now })
      } else {
        seekRelative(10)
        setRipple({ type: 'forward', count: nextCount * 10, id: now })
      }

      if (rippleTimerRef.current) clearTimeout(rippleTimerRef.current)
      rippleTimerRef.current = setTimeout(() => setRipple(null), 850)
      showControlsTemporarily(3500)
      return
    }

    // 2. Second tap of a potential double tap (within 350ms of 1st tap)
    if (singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current)
      singleTapTimerRef.current = null

      const timeSinceFirstTap = now - last.time
      const isSameZone = (last.zone === zone)

      // Verified double tap!
      if (timeSinceFirstTap < 350 && isSameZone) {
        lastTapRef.current = { time: now, x: clientX, y: clientY, count: 1, zone, isDoubleTapping: true }

        if (zone === 'rewind') {
          // Double Tap Left: Seek Backward 10s
          seekRelative(-10)
          setRipple({ type: 'rewind', count: 10, id: now })
          if (rippleTimerRef.current) clearTimeout(rippleTimerRef.current)
          rippleTimerRef.current = setTimeout(() => setRipple(null), 850)
          showControlsTemporarily(3500)
        } else if (zone === 'forward') {
          // Double Tap Right: Seek Forward 10s
          seekRelative(10)
          setRipple({ type: 'forward', count: 10, id: now })
          if (rippleTimerRef.current) clearTimeout(rippleTimerRef.current)
          rippleTimerRef.current = setTimeout(() => setRipple(null), 850)
          showControlsTemporarily(3500)
        } else {
          // Double Tap Center: Toggle Play / Pause
          const willPause = isPlayingRef.current
          togglePlayPause()
          setRipple({ type: willPause ? 'pause' : 'play', id: now })
          if (rippleTimerRef.current) clearTimeout(rippleTimerRef.current)
          rippleTimerRef.current = setTimeout(() => setRipple(null), 850)
          showControlsTemporarily(3500)
        }
        return
      }
    }

    // 3. First Tap when controls are NOT visible:
    // Schedule single-tap action after 280ms
    // If no second tap occurs within 280ms, the single-tap action ONLY awakens player controls
    // and does NOT seek or play/pause!
    lastTapRef.current = { time: now, x: clientX, y: clientY, count: 0, zone, isDoubleTapping: false }
    singleTapTimerRef.current = setTimeout(() => {
      singleTapTimerRef.current = null
      handleSingleTapOnEmptyArea()
    }, 280)
  }

  // ─── Classroom Screen Mode Handlers ─────────────────────────────────────────
  const handleToggleCleanView = useCallback((e) => {
    e?.stopPropagation()
    setCleanView(prev => {
      const next = !prev
      if (next) {
        setControlsVisible(false)
        setShowSpeedMenu(false)
        setShowQualityMenu(false)
        setShowCleanToast(true)
        if (cleanToastTimerRef.current) clearTimeout(cleanToastTimerRef.current)
        cleanToastTimerRef.current = setTimeout(() => setShowCleanToast(false), 1600)
      } else {
        setShowCleanToast(false)
        setControlsVisible(true)
        showControlsTemporarily(3500)
      }
      return next
    })
  }, [showControlsTemporarily])

  const handleLockScreen = useCallback((e) => {
    e?.stopPropagation()
    setIsScreenLocked(true)
    setControlsVisible(false)
    setShowSpeedMenu(false)
    setShowQualityMenu(false)
    setShowLockToast(true)
    if (lockToastTimerRef.current) clearTimeout(lockToastTimerRef.current)
    lockToastTimerRef.current = setTimeout(() => setShowLockToast(false), 2200)
  }, [])

  const handleUnlockScreen = useCallback((e) => {
    if (e) {
      e.preventDefault?.()
      e.stopPropagation?.()
    }
    setIsScreenLocked(false)
    setShowLockToast(false)
    setControlsVisible(true)
    showControlsTemporarily(3500)
  }, [showControlsTemporarily])

  // Rapid Cooldown Protection for Playlist Buttons
  const handleSafePrev = useCallback((e) => {
    e?.stopPropagation?.()
    if (navCooldownRef.current || !onPrevVideoRef.current) return
    navCooldownRef.current = true
    setTimeout(() => { navCooldownRef.current = false }, 450)
    onPrevVideoRef.current()
  }, [])

  const handleSafeNext = useCallback((e) => {
    e?.stopPropagation?.()
    if (navCooldownRef.current || !onNextVideoRef.current) return
    navCooldownRef.current = true
    setTimeout(() => { navCooldownRef.current = false }, 450)
    onNextVideoRef.current()
  }, [])

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore shortcuts if the user is typing in an input, textarea, select, or contentEditable element
      const activeEl = document.activeElement
      const activeTag = activeEl?.tagName?.toLowerCase()
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        activeEl?.isContentEditable
      ) {
        return
      }

      // Do not hijack shortcuts if an overlying modal dialog is open or player screen is locked
      if (isScreenLockedRef.current || isModalOpenRef.current) return

      const key = e.key.toLowerCase()

      // Play / Pause: Space or K
      if (key === ' ' || key === 'k' || e.code === 'Space' || e.code === 'KeyK') {
        e.preventDefault()
        togglePlayPause()
      }
      // Rewind 10s (or 30s with Shift): ArrowLeft or J
      else if (key === 'arrowleft' || key === 'j' || e.code === 'ArrowLeft' || e.code === 'KeyJ') {
        e.preventDefault()
        seekRelative(e.shiftKey ? -30 : -10)
      }
      // Forward 10s (or 30s with Shift): ArrowRight or L
      else if (key === 'arrowright' || key === 'l' || e.code === 'ArrowRight' || e.code === 'KeyL') {
        e.preventDefault()
        seekRelative(e.shiftKey ? 30 : 10)
      }
      // Volume Up: ArrowUp
      else if (key === 'arrowup' || e.code === 'ArrowUp') {
        e.preventDefault()
        handleVolumeChange(Math.min(100, (volumeRef.current ?? volume) + 10))
      }
      // Volume Down: ArrowDown
      else if (key === 'arrowdown' || e.code === 'ArrowDown') {
        e.preventDefault()
        handleVolumeChange(Math.max(0, (volumeRef.current ?? volume) - 10))
      }
      // Mute / Unmute: M
      else if (key === 'm' || e.code === 'KeyM') {
        e.preventDefault()
        toggleMute()
      }
      // Toggle Fullscreen: F
      else if (key === 'f' || e.code === 'KeyF') {
        e.preventDefault()
        if (onToggleFullscreen) {
          onToggleFullscreen()
        } else if (containerRef.current) {
          if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen?.().catch(() => {})
          } else {
            document.exitFullscreen?.().catch(() => {})
          }
        }
      }
      // Toggle Clean View: C
      else if (key === 'c' || e.code === 'KeyC') {
        e.preventDefault()
        handleToggleCleanView()
      }
      // Jump to 0% - 90%: 0 - 9 keys
      else if (
        (key >= '0' && key <= '9') ||
        (e.code && e.code.startsWith('Digit') && !e.shiftKey) ||
        (e.code && e.code.startsWith('Numpad'))
      ) {
        const numChar = (key >= '0' && key <= '9') ? key : e.code.replace(/^(Digit|Numpad)/, '')
        const numVal = parseInt(numChar, 10)
        if (!isNaN(numVal) && numVal >= 0 && numVal <= 9) {
          e.preventDefault()
          const dur = durationRef.current || playerRef.current?.getDuration?.() || 0
          if (dur > 0 && playerRef.current?.seekTo) {
            const target = (numVal / 10) * dur
            playerRef.current.seekTo(target, true)
            setCurrentTime(target)
            if (progressFillRef.current) {
              progressFillRef.current.style.width = `${numVal * 10}%`
            }
            showControlsTemporarily()
          }
        }
      }
      // Decrease Speed: < / , / [
      else if (key === '<' || key === ',' || key === '[' || (e.shiftKey && (key === ',' || key === '<'))) {
        e.preventDefault()
        const curRate = playbackRateRef.current || 1
        const curIdx = PLAYBACK_RATES.indexOf(curRate)
        if (curIdx > 0) {
          handleRateChange(PLAYBACK_RATES[curIdx - 1])
        } else if (curIdx === -1) {
          const prev = [...PLAYBACK_RATES].reverse().find(r => r < curRate)
          if (prev) handleRateChange(prev)
        }
      }
      // Increase Speed: > / . / ]
      else if (key === '>' || key === '.' || key === ']' || (e.shiftKey && (key === '.' || key === '>'))) {
        e.preventDefault()
        const curRate = playbackRateRef.current || 1
        const curIdx = PLAYBACK_RATES.indexOf(curRate)
        if (curIdx >= 0 && curIdx < PLAYBACK_RATES.length - 1) {
          handleRateChange(PLAYBACK_RATES[curIdx + 1])
        } else if (curIdx === -1) {
          const next = PLAYBACK_RATES.find(r => r > curRate)
          if (next) handleRateChange(next)
        }
      }
      // Next Video: N
      else if (key === 'n' || e.code === 'KeyN') {
        if (isPlaylistRef.current && onNextVideoRef.current) {
          e.preventDefault()
          handleSafeNext(e)
        }
      }
      // Previous Video: P
      else if (key === 'p' || e.code === 'KeyP') {
        if (isPlaylistRef.current && onPrevVideoRef.current) {
          e.preventDefault()
          handleSafePrev(e)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    isFullscreen,
    togglePlayPause,
    seekRelative,
    handleVolumeChange,
    toggleMute,
    onToggleFullscreen,
    handleRateChange,
    volume,
    handleToggleCleanView,
    handleSafeNext,
    handleSafePrev,
    showControlsTemporarily
  ])

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0
  const bufferPercent = Math.min(100, Math.max(0, loadedFraction * 100))
  const currentQualityObj = QUALITY_OPTIONS.find(q => q.id === selectedQuality) || QUALITY_OPTIONS[3]

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onMouseMove={() => {
        if (!cleanViewRef.current && !isScreenLockedRef.current) {
          showControlsTemporarily()
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      className={`relative w-full h-full bg-black overflow-hidden select-none outline-none group flex items-center justify-center ${
        isFullscreen ? 'fixed inset-0 z-[99999] w-screen h-screen' : ''
      } ${className}`}
      style={{ touchAction: isFullscreen ? 'none' : 'pan-y' }}
      aria-label="Lecture Video Player"
    >

      {/* ─── 16:9 VIDEO CANVAS: FULL-BLEED, TRUE NATURAL 16:9 RATIO ─────────── */}
      <div
        ref={videoCanvasRef}
        className="relative w-full aspect-video max-w-full max-h-full flex items-center justify-center overflow-hidden bg-black shadow-2xl"
        style={{ aspectRatio: '16 / 9' }}
      >

        {/* ─── LAYER 0: UNDERLYING YOUTUBE IFRAME (1:1 UNSTRETCHED & UNCROPPED) ── */}
        <div
          ref={iframeContainerRef}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden bg-black flex items-center justify-center"
          style={{ transform: 'none' }}
        />

        {/* ─── LAYER 1: TRANSPARENT TOUCH-BLOCKING SHIELD (z-20) ──────────────── */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-20 w-full h-full pointer-events-auto cursor-pointer"
          onClick={(e) => {
            if (Date.now() - (lastTouchTimeRef.current || 0) < 500) return
            handleShieldTap(e.clientX, e.clientY)
          }}
          onMouseDown={() => {
            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = setTimeout(startLongPress2x, 350)
          }}
          onMouseUp={() => {
            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
            if (isHoldingRef.current) {
              endLongPress2x()
              lastTouchTimeRef.current = Date.now()
              return
            }
            endLongPress2x()
          }}
          onTouchStart={handleShieldTouchStart}
          onTouchMove={handleShieldTouchMove}
          onTouchEnd={handleShieldTouchEnd}
          onContextMenu={(e) => e.preventDefault()}
          onAuxClick={(e) => e.preventDefault()}
        />

        {/* ─── SUBTLE BOTTOM-RIGHT THOUGHTFUL'S ACADEMY BRAND EMBLEM (z-22) ────── */}
        {/* Unobtrusive, delicate TV-network watermark bug at bottom right corner  */}
        <div className={`absolute bottom-2.5 right-3.5 z-22 pointer-events-none select-none flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-xs border border-white/10 transition-opacity duration-200 ${controlsVisible ? 'opacity-0' : 'opacity-70'}`}>
          <Award className="h-2.5 w-2.5 text-amber-300" />
          <span className="text-[8.5px] font-black text-white tracking-tight">Thoughtful&apos;s</span>
          <span className="text-[7.5px] font-bold text-indigo-400 uppercase">Academy</span>
        </div>

        {/* ─── 2X FAST-FORWARD ACTIVE HUD ──────────────────────────────────────── */}
        {isLongPressing2x && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-35 pointer-events-none px-3 py-1 rounded-full bg-amber-500/90 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-xl animate-pulse">
            <Zap className="h-3.5 w-3.5 fill-current" />
            <span>2X Fast Forward</span>
          </div>
        )}

        {/* ─── SWIPE-TO-SEEK HUD ──────────────────────────────────────────────── */}
        {swipeSeekHud && (
          <div className="absolute inset-0 z-35 flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-2xs">
            <div className="px-4 py-2 rounded-2xl bg-slate-950/95 border border-slate-700 text-white font-mono text-center shadow-2xl">
              <div className="text-sm font-black text-indigo-400">
                {swipeSeekHud.deltaSeconds >= 0 ? `+${swipeSeekHud.deltaSeconds}s` : `${swipeSeekHud.deltaSeconds}s`}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                {formatTime(swipeSeekHud.targetTime)} / {formatTime(duration)}
              </div>
            </div>
          </div>
        )}

        {/* ─── MULTI-TAP GESTURE RIPPLE OVERLAYS ────────────────────────────── */}
        {ripple?.type === 'rewind' && (
          <div className="absolute inset-y-0 left-0 w-1/3 z-28 pointer-events-none flex items-center justify-center bg-gradient-to-r from-white/15 to-transparent backdrop-blur-2xs animate-pulse rounded-r-3xl">
            <div className="flex flex-col items-center text-white space-y-1.5 drop-shadow-lg">
              <div className="p-2 sm:p-2.5 rounded-full bg-black/60 border border-white/20">
                <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6 text-white animate-spin" />
              </div>
              <span className="text-[10px] sm:text-xs font-mono font-bold tracking-wider uppercase bg-black/85 text-white px-2.5 py-0.5 rounded-full border border-white/20 shadow-md">
                -{ripple.count}s
              </span>
            </div>
          </div>
        )}

        {ripple?.type === 'forward' && (
          <div className="absolute inset-y-0 right-0 w-1/3 z-28 pointer-events-none flex items-center justify-center bg-gradient-to-l from-white/15 to-transparent backdrop-blur-2xs animate-pulse rounded-l-3xl">
            <div className="flex flex-col items-center text-white space-y-1.5 drop-shadow-lg">
              <div className="p-2 sm:p-2.5 rounded-full bg-black/60 border border-white/20">
                <RotateCw className="h-5 w-5 sm:h-6 sm:w-6 text-white animate-spin" />
              </div>
              <span className="text-[10px] sm:text-xs font-mono font-bold tracking-wider uppercase bg-black/85 text-white px-2.5 py-0.5 rounded-full border border-white/20 shadow-md">
                +{ripple.count}s
              </span>
            </div>
          </div>
        )}

        {(ripple?.type === 'play' || ripple?.type === 'pause') && (
          <div className="absolute inset-0 z-28 pointer-events-none flex items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/70 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-2xl animate-pulse">
              {ripple.type === 'play' ? (
                <Play className="h-8 w-8 sm:h-10 sm:w-10 fill-current ml-1 text-white" />
              ) : (
                <Pause className="h-8 w-8 sm:h-10 sm:w-10 fill-current text-white" />
              )}
            </div>
          </div>
        )}

        {/* ─── SCREEN LOCKED INDICATOR ────────────────────────────────────────── */}
        <div className="absolute bottom-4 inset-x-0 z-40 flex justify-center pointer-events-none px-4">
          <AnimatePresence>
            {showLockToast && isScreenLocked && (
              <motion.div
                key="screen-locked-toast"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="whitespace-nowrap max-w-[95%] px-3.5 py-1.5 rounded-full bg-black/85 border border-white/20 text-white font-medium text-[10px] sm:text-xs flex items-center gap-1.5 shadow-2xl backdrop-blur-md pointer-events-none"
              >
                <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400 shrink-0" />
                <span>Screen Locked • Tap lock symbol to unlock</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── TRANSLUCENT SCREEN UNLOCK SYMBOL (ONLY WHEN LOCKED) ────────────── */}
        {isScreenLocked && (
          <div className="absolute top-3 right-3 z-50 pointer-events-auto">
            <button
              onClick={handleUnlockScreen}
              onTouchEnd={handleUnlockScreen}
              className="p-2 sm:p-2.5 rounded-full bg-black/50 hover:bg-black/70 active:bg-black/90 text-white/90 hover:text-white backdrop-blur-md border border-white/20 shadow-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center group"
              title="Screen locked • Tap to unlock controls"
              aria-label="Unlock controls"
            >
              <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 group-hover:text-amber-300 transition-colors" />
            </button>
          </div>
        )}


        {/* ─── ERROR STATE ────────────────────────────────────────────────────── */}
        {hasError && !isPlaying && (
          <div className="absolute inset-0 z-35 bg-slate-950/98 flex flex-col items-center justify-center p-4 text-center space-y-2 pointer-events-auto">
            <AlertCircle className="h-7 w-7 text-red-400" />
            <p className="text-xs text-slate-300 max-w-xs">{errorMessage}</p>
            <button
              onClick={() => initializePlayer()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" /> Retry Lecture
            </button>
          </div>
        )}

        {/* ─── RESUME PLAYBACK PROMPT (TOP-FLOATING GLASSMORPHIC BANNER, ZERO CONTROLS INTERFERENCE) ── */}
        {resumeData && !isPlaying && !resumeDismissed && currentTime < 2 && !initialSeekSeconds && (
          <div
            className={`absolute top-3.5 z-40 pointer-events-auto bg-slate-950/92 border border-amber-400/40 rounded-2xl p-2.5 sm:p-3 shadow-2xl flex items-center gap-2.5 sm:gap-3 backdrop-blur-md animate-fade-in max-w-[92%] sm:max-w-sm ring-1 ring-amber-500/20 transition-all ${
              isFullscreen ? 'left-12 sm:left-14' : 'left-3.5 sm:left-4'
            }`}
          >
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <p className="text-[10px] text-amber-300 font-extrabold uppercase tracking-wider truncate">
                Saved Progress
              </p>
              <p className="text-xs text-white font-semibold truncate">
                Resume from <span className="font-mono text-amber-300">{formatTime(resumeData.time)}</span>?
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleResumePlayback}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <span>Resume</span>
              </button>
              <button
                type="button"
                onClick={handleDismissResume}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                aria-label="Dismiss resume prompt"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ─── AUTO-ADVANCE LECTURE COUNTDOWN OVERLAY ──────────────────────────── */}
        {autoAdvanceCountdown !== null && (
          <div className="absolute inset-0 z-38 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4 pointer-events-auto animate-fade-in">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-16 h-16 -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" className="text-white/20" fill="transparent" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-amber-400 transition-all duration-1000 ease-linear"
                  fill="transparent"
                  strokeDasharray={175.9}
                  strokeDashoffset={175.9 * (1 - autoAdvanceCountdown / 5)}
                />
              </svg>
              <span className="absolute text-xl font-black text-white font-mono">{autoAdvanceCountdown}</span>
            </div>

            <div className="space-y-1 max-w-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/20 border border-amber-400/30 px-2 py-0.5 rounded-md">
                Up Next • Lecture #{activeVideoIndex + 2}
              </span>
              <h3 className="text-sm font-bold text-white line-clamp-1">
                {playlistItems[activeVideoIndex + 1]?.title || 'Next Lecture in Series'}
              </h3>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                onClick={() => {
                  cancelAutoAdvance()
                  if (playerRef.current?.seekTo) {
                    playerRef.current.seekTo(0, true)
                    playerRef.current.playVideo()
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Replay
              </button>

              <button
                onClick={cancelAutoAdvance}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  cancelAutoAdvance()
                  onNextVideo?.()
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Play Now</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── FLOATING INTERACTIVE CONTROLS (AUTO-HIDE: ZERO RESIDUAL BARS) ──── */}
        <div
          className={`absolute inset-0 z-30 flex flex-col justify-between pointer-events-none transition-opacity duration-200 ${
            controlsVisible && !cleanView && !isScreenLocked ? 'opacity-100' : 'opacity-0 invisible'
          }`}
        >

          {/* 1. TOP FLOATING BAR (CLEAN, ZERO TITLE OVERLAP, SHIELD BADGE ONLY) ── */}
          <div className={`h-9 sm:h-10 px-2.5 sm:px-3.5 flex items-center justify-between gap-2 pointer-events-none`}>
            <div className="flex items-center gap-2 min-w-0">
              {isFullscreen && (
                <button
                  onClick={onToggleFullscreen}
                  aria-label="Exit Fullscreen"
                  className="p-1.5 sm:p-2 rounded-lg bg-black/60 hover:bg-black/80 active:bg-black/90 text-white transition-all cursor-pointer pointer-events-auto backdrop-blur-xs border border-white/15 shadow-sm flex items-center justify-center"
                  title="Exit Fullscreen (Esc)"
                >
                  <Minimize2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-auto pointer-events-auto">
              <div
                className="p-1.5 sm:p-2 rounded-full bg-black/50 border border-emerald-500/30 text-emerald-400 backdrop-blur-xs shadow-xs flex items-center justify-center"
                title="Protected Lecture Stream"
                aria-label="Protected Video Stream"
              >
                <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
              </div>
            </div>
          </div>

          {/* 2. BOTTOM FLOATING BAR (TRANSLUCENT GRADIENT OVERLAY) ────────────── */}
          <div
            onClick={(e) => { e.stopPropagation(); showControlsTemporarily(3500) }}
            className={`pt-4 pb-2 sm:pb-3 px-2 sm:px-3.5 md:px-4 bg-gradient-to-t from-black/95 via-black/50 to-transparent space-y-1.5 sm:space-y-2 ${controlsVisible && !cleanView && !isScreenLocked ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >

            {/* Progress Bar */}
            <div
              ref={seekbarRef}
              onPointerDown={handleSeekPointerDown}
              onMouseMove={handleSeekbarHover}
              onMouseLeave={() => setHoverTime(null)}
              className="relative w-full h-3 sm:h-4 flex items-center cursor-pointer group/bar touch-none py-1"
              style={{ touchAction: 'none' }}
            >
              {hoverTime !== null && duration > 0 && (
                <div
                  className="absolute -top-7 sm:-top-8 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/90 text-white text-[10px] sm:text-xs font-mono font-bold pointer-events-none border border-slate-700 shadow-lg"
                  style={{ left: `${hoverPosition}%` }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}

              <div className="w-full h-1 sm:h-1.5 group-hover/bar:h-2 transition-all bg-white/20 rounded-full overflow-hidden relative">
                <div
                  className="absolute top-0 bottom-0 left-0 bg-white/30 transition-all duration-300"
                  style={{ width: `${bufferPercent}%` }}
                />
                <div
                  ref={progressFillRef}
                  className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-indigo-500 to-amber-400 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div
                className={`absolute -translate-x-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white shadow-md border-2 border-indigo-600 transition-transform ${
                  isScrubbing ? 'scale-125' : 'group-hover/bar:scale-125'
                }`}
                style={{ left: `${progressPercent}%` }}
              />
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 h-9 sm:h-10 md:h-11">

              {/* Left Controls (Playback & Navigation) */}
              <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 min-w-0 shrink">

                {/* Playlist Previous Lecture */}
                {isPlaylist && (
                  <button
                    disabled={activeVideoIndex === 0}
                    onClick={handleSafePrev}
                    className="p-1.5 sm:p-2 rounded-lg text-white hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shrink-0"
                    title="Previous Lecture"
                    aria-label="Previous Lecture"
                  >
                    <ChevronLeft className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
                  </button>
                )}

                {/* Play / Pause */}
                <button
                  onClick={(e) => { e.stopPropagation(); togglePlayPause() }}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="p-1.5 sm:p-2 rounded-lg text-white hover:bg-white/20 active:bg-white/30 transition-all cursor-pointer flex items-center justify-center shrink-0"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 sm:h-5 sm:w-5 md:h-5.5 md:w-5.5 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 sm:h-5 sm:w-5 md:h-5.5 md:w-5.5 fill-current ml-0.5" />
                  )}
                </button>

                {/* Playlist Next Lecture */}
                {isPlaylist && (
                  <button
                    disabled={playlistItems.length > 0 && activeVideoIndex >= playlistItems.length - 1}
                    onClick={handleSafeNext}
                    className="p-1.5 sm:p-2 rounded-lg text-white hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shrink-0"
                    title="Next Lecture"
                    aria-label="Next Lecture"
                  >
                    <ChevronRight className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
                  </button>
                )}

                {/* Time Display */}
                <div className="text-[10px] sm:text-xs md:text-[13px] font-mono tabular-nums text-slate-200 select-none tracking-tight shrink min-w-0 font-medium whitespace-nowrap">
                  <span>{formatTime(currentTime)}</span>
                  <span className="text-slate-400 mx-0.5 sm:mx-1">/</span>
                  <span className="text-slate-400">{formatTime(duration)}</span>
                </div>

                {/* Volume */}
                <div className={`items-center gap-1 sm:gap-1.5 group/vol ml-0.5 sm:ml-2 shrink-0 ${isPlaylist ? 'hidden sm:flex' : 'flex'}`}>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleMute() }}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                    className="p-1.5 sm:p-2 rounded-lg text-white hover:bg-white/20 active:bg-white/30 transition-all cursor-pointer flex items-center justify-center shrink-0"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-4 w-4 sm:h-5 sm:w-5 md:h-5.5 md:w-5.5 text-rose-400" />
                    ) : volume < 50 ? (
                      <Volume1 className="h-4 w-4 sm:h-5 sm:w-5 md:h-5.5 md:w-5.5 text-slate-200" />
                    ) : (
                      <Volume2 className="h-4 w-4 sm:h-5 sm:w-5 md:h-5.5 md:w-5.5 text-slate-200" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Volume"
                    className="w-14 sm:w-16 md:w-20 h-1.5 bg-white/30 accent-indigo-400 rounded-lg cursor-pointer hidden sm:block"
                  />
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3 shrink-0 ml-auto">

                {/* View Board Mode (Single click to hide all controls and inspect blackboard) */}
                <button
                  onClick={handleToggleCleanView}
                  className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                    cleanView ? 'text-indigo-400 bg-white/20' : 'text-slate-300 hover:text-white hover:bg-white/15 active:bg-white/25'
                  }`}
                  title={cleanView ? 'Exit Clean Board View' : 'View clean board (Hide controls for notes & screenshots)'}
                  aria-label="Toggle clean board view"
                >
                  {cleanView ? (
                    <EyeOff className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
                  )}
                </button>

                {/* Screen Lock */}
                <button
                  onClick={handleLockScreen}
                  className="p-1.5 sm:p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/15 active:bg-white/25 transition-all cursor-pointer flex items-center justify-center shrink-0"
                  title="Lock controls against accidental touches"
                  aria-label="Lock controls"
                >
                  <Lock className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
                </button>

                {/* Speed Popover */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowSpeedMenu(prev => !prev)
                      setShowQualityMenu(false)
                    }}
                    className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-[10px] sm:text-xs md:text-sm font-mono font-bold border border-white/15 cursor-pointer shadow-xs transition-colors shrink-0"
                  >
                    {playbackRate}x
                  </button>

                  {showSpeedMenu && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-full mb-1 sm:mb-1.5 right-0 bg-[#121316] border border-zinc-800 rounded-lg sm:rounded-xl shadow-2xl py-1 w-[72px] sm:w-24 z-40 max-h-[145px] sm:max-h-[220px] overflow-y-auto overscroll-contain"
                    >
                      {PLAYBACK_RATES.map((rate) => (
                        <button
                          key={rate}
                          onClick={() => handleRateChange(rate)}
                          className={`w-full px-2 sm:px-2.5 py-1 sm:py-1.5 text-left text-[10px] sm:text-xs font-mono transition-colors flex items-center justify-between cursor-pointer ${
                            playbackRate === rate
                              ? 'bg-amber-400/20 text-amber-300 font-bold'
                              : 'text-slate-300 hover:text-white hover:bg-zinc-800/80'
                          }`}
                        >
                          <span>{rate}x</span>
                          {playbackRate === rate && <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quality Popover */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowQualityMenu(prev => !prev)
                      setShowSpeedMenu(false)
                    }}
                    className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs md:text-sm font-mono font-bold border cursor-pointer shadow-xs transition-colors shrink-0 ${
                      selectedQuality === '480p'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-white/10 hover:bg-white/20 active:bg-white/30 text-slate-200 border-white/15'
                    }`}
                  >
                    <span className="sm:hidden">{currentQualityObj.short}</span>
                    <span className="hidden sm:inline">{currentQualityObj.badge}</span>
                  </button>

                  {showQualityMenu && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-full mb-1 sm:mb-1.5 right-0 bg-[#121316] border border-zinc-800 rounded-lg sm:rounded-xl shadow-2xl py-1 w-36 sm:w-44 z-40 max-h-[150px] sm:max-h-[220px] overflow-y-auto overscroll-contain"
                    >
                      <div className="px-2.5 py-1 text-[8px] sm:text-[9px] font-black uppercase text-zinc-400 border-b border-zinc-800 tracking-wider">
                        Quality / Data Saver
                      </div>
                      {QUALITY_OPTIONS.map((q) => (
                        <button
                          key={q.id}
                          onClick={() => handleSelectQuality(q.id)}
                          className={`w-full px-2.5 py-1 sm:py-1.5 text-left text-[10px] sm:text-xs transition-colors flex items-center justify-between cursor-pointer ${
                            selectedQuality === q.id
                              ? 'bg-amber-400/20 text-amber-300 font-bold'
                              : 'text-slate-300 hover:text-white hover:bg-zinc-800/80'
                          }`}
                        >
                          <span>{q.label}</span>
                          {selectedQuality === q.id && <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fullscreen Toggle */}
                {onToggleFullscreen && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleFullscreen() }}
                    aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                    className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-all cursor-pointer shrink-0 ml-0.5 sm:ml-1 shadow-xs border border-white/15 flex items-center justify-center"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Cinema Fullscreen'}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-amber-400" />
                    ) : (
                      <Maximize2 className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
                    )}
                  </button>
                )}

              </div>

            </div>

          </div>

        </div>

        {/* ─── CLEAN VIEW TOAST (AUTO-DISMISSES IN 1.6s) ──────────────────────── */}
        <div className="absolute bottom-4 inset-x-0 z-40 flex justify-center pointer-events-none px-4">
          <AnimatePresence>
            {showCleanToast && cleanView && !isScreenLocked && (
              <motion.div
                key="clean-board-toast"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="whitespace-nowrap max-w-[95%] px-3.5 py-1.5 rounded-full bg-black/85 border border-white/20 text-white/95 text-[10px] sm:text-xs font-medium backdrop-blur-md shadow-lg pointer-events-none text-center"
              >
                Clean Board View • Tap screen to restore
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* ─── PORTRAIT FULLSCREEN ROTATE PROMPT ────────────────────────────────── */}
      {isFullscreen && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none hidden max-h-[85vh]:hidden md:hidden">
          <div className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1.5 backdrop-blur-md shadow-xl">
            <Smartphone className="h-3 w-3 text-indigo-400 rotate-90" />
            <span>Rotate phone for widescreen cinema</span>
          </div>
        </div>
      )}

    </div>
  )
}
