import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

/**
 * CustomSelect - Reusable Premium In-App Dropdown Component
 * Replaces native HTML <select> elements with an interactive, in-app dropdown.
 *
 * @param {Array} options - Array of items: string[] or { value, label, icon: Icon, badge }[]
 * @param {string|number} value - Currently selected value
 * @param {function} onChange - Callback function triggered with selected value
 * @param {string} placeholder - Fallback label if nothing is selected
 * @param {string} className - Extra Tailwind styling for trigger button
 * @param {string} dropdownClassName - Extra styling for dropdown popup
 */
export default function CustomSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select option...',
  className = '',
  dropdownClassName = '',
  disabled = false,
  icon: LeadingIcon = null
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  // Normalize options into { value, label, icon, badge }
  const normalizedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value ?? opt.id ?? '',
        label: opt.label ?? opt.name ?? String(opt.value ?? ''),
        icon: opt.icon || null,
        badge: opt.badge || null,
        raw: opt
      }
    }
    return {
      value: String(opt),
      label: String(opt),
      icon: null,
      badge: null,
      raw: opt
    }
  })

  // Selected item
  const selectedItem = normalizedOptions.find(o => String(o.value) === String(value)) || null

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative inline-block w-full text-left min-w-0">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/80 active:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between gap-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {LeadingIcon && <LeadingIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
          {selectedItem?.icon && (
            <selectedItem.icon className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          )}
          <span className="truncate">
            {selectedItem ? selectedItem.label : placeholder}
          </span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-blue-600' : ''}`} />
      </button>

      {/* Dropdown Menu Popup */}
      {open && (
        <div className={`absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-1.5 z-50 animate-scale-in max-h-60 overflow-y-auto space-y-1 backdrop-blur-md ${dropdownClassName}`}>
          {normalizedOptions.length === 0 ? (
            <div className="px-3 py-2 text-center text-xs text-slate-400">
              No options available
            </div>
          ) : (
            normalizedOptions.map(opt => {
              const active = String(opt.value) === String(value)
              const ItemIcon = opt.icon
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onChange(opt.value, opt.raw)
                    setOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                    active
                      ? 'bg-blue-50 border border-blue-200/80 text-blue-900 font-bold'
                      : 'hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {ItemIcon && <ItemIcon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} />}
                    <span className="truncate">{opt.label}</span>
                    {opt.badge && (
                      <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  {active && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0 ml-1.5" />}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
