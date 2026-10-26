import { useState, useEffect, useMemo } from 'react'
import { getDriveImageUrls } from '../../utils/formatters'

// Module-level cache of URLs that have successfully loaded, eliminating trial-and-error on repeated renders
const workingUrlCache = new Map()

export default function DriveImage({
  src,
  alt = 'Image',
  className = '',
  loading = 'lazy',
  fallback = null,
  onError = null,
  onLoad = null,
  priority = false,
  width = 700,
  ...props
}) {
  const initialCandidates = useMemo(() => {
    if (!src) return []
    const cached = workingUrlCache.get(src)
    if (cached) return [cached]
    return getDriveImageUrls(src, { width })
  }, [src, width])

  const [candidates, setCandidates] = useState(initialCandidates)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [failedAll, setFailedAll] = useState(initialCandidates.length === 0)

  useEffect(() => {
    const cached = workingUrlCache.get(src)
    const urls = cached ? [cached] : getDriveImageUrls(src, { width })
    setCandidates(urls)
    setCurrentIndex(0)
    setFailedAll(urls.length === 0)
  }, [src, width])

  const handleError = (e) => {
    if (currentIndex + 1 < candidates.length) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setFailedAll(true)
      if (onError) onError(e)
    }
  }

  const handleLoad = (e) => {
    if (candidates[currentIndex]) {
      workingUrlCache.set(src, candidates[currentIndex])
    }
    if (onLoad) onLoad(e)
  }

  if (failedAll || candidates.length === 0) {
    return fallback
  }

  return (
    <img
      src={candidates[currentIndex]}
      alt={alt}
      className={className}
      loading={priority ? 'eager' : loading}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  )
}
