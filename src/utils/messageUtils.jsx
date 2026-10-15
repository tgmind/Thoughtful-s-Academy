export const PALETTE = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500',
  'bg-amber-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500',
]

export function avatarBg(str = '') {
  const n = [...(str || '')].reduce((a, c) => a + c.charCodeAt(0), 0)
  return PALETTE[n % PALETTE.length]
}

export function initials(name = '') {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || '?'
}

export function isSameCalendarDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function shortTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (isSameCalendarDay(d, now)) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }
  if (now - d < 604800000) {
    return d.toLocaleDateString('en-IN', { weekday: 'short' })
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function sepLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameCalendarDay(d, now)) return 'Today'
  if (isSameCalendarDay(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Safely parse and render message text with clickable links.
 */
export function renderMessageContent(content = '', isMine = false) {
  if (!content) return null
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g
  const parts = content.split(urlRegex)
  if (parts.length === 1) return content

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline break-all font-medium ${
            isMine ? 'text-violet-100 hover:text-white' : 'text-violet-600 hover:text-violet-800'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      )
    }
    return part
  })
}
