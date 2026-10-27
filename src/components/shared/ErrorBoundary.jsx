import React from 'react'
import { applyAppUpdate } from '../../utils/versionManager'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled Application Error caught by ErrorBoundary:', error, errorInfo)
    this.setState({ errorInfo })

    // If dynamic chunk loading failed due to a new Netlify deployment, attempt instant self-healing
    const errStr = String(error?.message || error || '')
    const isChunkError = /loading chunk|dynamically imported module|failed to fetch dynamically imported|unexpected token ['"]?</i.test(errStr)
    if (isChunkError && typeof sessionStorage !== 'undefined') {
      const key = 'eb_chunk_reload_stamp'
      const last = sessionStorage.getItem(key)
      const now = Date.now()
      if (!last || now - parseInt(last, 10) > 8000) {
        sessionStorage.setItem(key, now.toString())
        applyAppUpdate()
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error)
      }

      const errStr = String(this.state.error?.message || this.state.error || '')
      const isChunkError = /loading chunk|dynamically imported module|failed to fetch dynamically imported|unexpected token ['"]?</i.test(errStr)

      return (
        <div className="min-h-screen bg-[#09090b] text-white p-6 flex flex-col items-center justify-center font-sans">
          <div className="max-w-xl w-full bg-[#141417] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="text-2xl">✨</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {isChunkError ? 'New Release Deployed' : 'Something went wrong'}
              </h2>
              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                {isChunkError
                  ? 'A fresh live update was just published. Refresh now to load the latest modules and interface.'
                  : 'An unexpected application condition occurred. You can safely reload the page to continue.'}
              </p>
            </div>

            {!isChunkError && (
              <div className="bg-black/40 p-4 rounded-xl text-left text-xs font-mono text-red-300 overflow-x-auto border border-white/5 max-h-36">
                {this.state.error?.toString()}
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => applyAppUpdate()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
              >
                <span>Refresh Application</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
