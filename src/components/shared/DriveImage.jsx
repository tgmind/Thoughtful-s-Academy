import { useState, useEffect } from 'react'
import { getDriveImageUrls } from '../../utils/formatters'

export default function DriveImage({
  src,
  alt = 'Image',
  className = '',
  loading = 'lazy',
  fallback = null,
  onError = null,
  onLoad = null,
  ...props
}) {
  const [candidates, setCandidates] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [failedAll, setFailedAll] = useState(false)

  useEffect(() => {
    const urls = getDriveImageUrls(src)
    setCandidates(urls)
    setCurrentIndex(0)
    setFailedAll(urls.length === 0)
  }, [src])

  const handleError = (e) => {
    if (currentIndex + 1 < candidates.length) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setFailedAll(true)
      if (onError) onError(e)
    }
  }

  if (failedAll || candidates.length === 0) {
    return fallback
  }

  return (
    <img
      src={candidates[currentIndex]}
      alt={alt}
      className={className}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={handleError}
      onLoad={onLoad}
      {...props}
    />
  )

}
