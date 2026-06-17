export default function LoadingSpinner({ fullScreen = false, size = 'md' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizes[size]} animate-spin rounded-full border-4 border-gray-200 border-t-blue-800`} />
      {size !== 'sm' && <span className="text-sm text-gray-500">Loading…</span>}
    </div>
  )
  if (fullScreen) return <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80">{spinner}</div>
  return <div className="flex items-center justify-center py-12">{spinner}</div>
}
