import { Link } from 'react-router-dom'
import { AlertTriangle, ShieldAlert, Home, ArrowLeft } from 'lucide-react'

function ErrorShell({ icon, iconBg, code, title, message, cta, ctaLink, ctaVariant = 'primary' }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <div className="text-center max-w-sm w-full">
        {/* Decorative ring */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className={`w-24 h-24 rounded-3xl ${iconBg} flex items-center justify-center shadow-lg`}>
            {icon}
          </div>
          <div className={`absolute inset-0 rounded-3xl ${iconBg} opacity-20 scale-110 blur-lg`} />
        </div>

        {code && (
          <p className="text-7xl font-display font-black text-gray-200 leading-none mb-2 select-none">{code}</p>
        )}
        <h1 className="font-display font-bold text-2xl text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">{message}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to={ctaLink}
            className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all hover:-translate-y-0.5 shadow-sm
              ${ctaVariant === 'primary'
                ? 'bg-amber-400 hover:bg-amber-500 text-white shadow-amber-200'
                : 'border-2 border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white'
              }`}>
            <Home className="h-4 w-4" /> {cta}
          </Link>
          <button onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-gray-500 hover:text-gray-700 hover:bg-white border border-gray-200 transition-all hover:-translate-y-0.5">
            <ArrowLeft className="h-4 w-4" /> Go Back
          </button>
        </div>
      </div>
    </div>
  )
}

export function NotFound() {
  return (
    <ErrorShell
      icon={<AlertTriangle className="h-10 w-10 text-amber-500" />}
      iconBg="bg-amber-100"
      code="404"
      title="Page Not Found"
      message="The page you're looking for doesn't exist or has been moved."
      cta="Go to Home"
      ctaLink="/"
      ctaVariant="primary"
    />
  )
}

export function Unauthorized() {
  return (
    <ErrorShell
      icon={<ShieldAlert className="h-10 w-10 text-red-500" />}
      iconBg="bg-red-100"
      code="403"
      title="Access Denied"
      message="You don't have permission to view this page. Please log in with the correct account."
      cta="Back to Home"
      ctaLink="/"
      ctaVariant="primary"
    />
  )
}

export function AccountSuspended() {
  return (
    <ErrorShell
      icon={<ShieldAlert className="h-10 w-10 text-amber-600" />}
      iconBg="bg-amber-100"
      code={null}
      title="Account Suspended"
      message="Your account has been temporarily suspended. Please contact the institute administration for further information."
      cta="Go to Home"
      ctaLink="/"
      ctaVariant="outline"
    />
  )
}
