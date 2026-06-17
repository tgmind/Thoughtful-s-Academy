// src/components/shared/LiveClassBanner.jsx
import { useState } from 'react'
import { X, Copy, Eye, EyeOff, Link as LinkIcon } from 'lucide-react'
import { copyToClipboard } from '../../utils/clipboard'
import { normalizeUrl } from '../../utils/formatters'

const PLATFORM_LABELS = { zoom: '🎥 Zoom', google_meet: '📹 Google Meet', other: '🔗 Link' }

export default function LiveClassBanner({ liveClass, onDismiss }) {
  const [showPw, setShowPw] = useState(false)

  if (!liveClass) return null

  const joinUrl = normalizeUrl(liveClass.join_url)
  const copyPw  = () => copyToClipboard(liveClass.password, 'Password copied!')
  const copyLink = () => copyToClipboard(joinUrl, 'Class link copied!')

  return (
    <div className="w-full bg-gradient-to-r from-red-600 to-red-500 rounded-2xl p-4 text-white shadow-lg animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="flex items-center gap-1.5 bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> Live Now
            </span>
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
              {PLATFORM_LABELS[liveClass.platform] || '🔗 Online'}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-bold text-lg leading-snug">{liveClass.title}</h3>
          {liveClass.profiles?.full_name && (
            <p className="text-red-100 text-sm mt-0.5">by {liveClass.profiles.full_name}</p>
          )}

          {/* Password */}
          {liveClass.password && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-red-100">Password:</span>
              <span className="font-mono bg-white/20 px-2 py-0.5 rounded text-sm">
                {showPw ? liveClass.password : '••••••'}
              </span>
              <button onClick={() => setShowPw(s => !s)} className="text-red-100 hover:text-white">
                {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button onClick={copyPw} className="text-red-100 hover:text-white">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Class link — visible + copyable */}
          {joinUrl && (
            <div className="flex items-center gap-2 mt-3">
              <LinkIcon className="h-3.5 w-3.5 flex-shrink-0 text-red-100" />
              <a href={joinUrl} target="_blank" rel="noopener noreferrer"
                className="font-mono text-xs bg-white/20 px-2 py-1 rounded truncate hover:bg-white/30 transition-colors min-w-0"
                title={joinUrl}>
                {joinUrl}
              </a>
              <button onClick={copyLink} className="flex-shrink-0 text-red-100 hover:text-white" title="Copy link">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Join button */}
          <a href={joinUrl} target="_blank" rel="noopener noreferrer"
            className="inline-block mt-3 px-5 py-2 bg-white text-red-600 font-bold rounded-xl text-sm hover:bg-red-50 transition-colors shadow">
            Join Class →
          </a>
        </div>

        {/* Dismiss */}
        {onDismiss && (
          <button onClick={onDismiss} className="flex-shrink-0 p-1 text-red-200 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}
