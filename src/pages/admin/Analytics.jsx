import { useState } from 'react'
import { CalendarCheck, CreditCard, BarChart2, Sparkles } from 'lucide-react'
import AttendanceChart from '../../components/analytics/AttendanceChart'
import FeeChart        from '../../components/analytics/FeeChart'

const TABS = [
  { id: 'Attendance', label: 'Attendance Analytics', icon: CalendarCheck, pill: 'Live Telemetry' },
  { id: 'Fees',       label: 'Fees Analytics',       icon: CreditCard,    pill: 'Collections' },
]

export default function Analytics() {
  const [tab, setTab] = useState('Attendance')

  return (
    <div className="space-y-5 pb-28 sm:pb-32 lg:pb-12">
      {/* ── Executive Header Banner ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 sm:p-6 transition-all space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/70 text-indigo-700 text-[10px] font-black uppercase tracking-wider shadow-2xs">
              <BarChart2 className="h-3 w-3 text-indigo-600 shrink-0" />
              <span>Executive Intelligence Suite</span>
            </div>
            <h1 className="font-display font-black text-lg sm:text-2xl text-slate-900 tracking-tight mt-1.5 leading-snug">
              Institute Analytics & Attentiveness Command
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Live proctored attentiveness checks, retention alerts, and multi-term performance telemetry.
            </p>
          </div>
        </div>

        {/* ── Sleek Segmented Pill Control ── */}
        <div className="pt-1">
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/80 shadow-inner max-w-full overflow-x-auto no-scrollbar gap-1">
            {TABS.map(t => {
              const Icon = t.icon
              const isActive = tab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer select-none shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-950 via-indigo-950 to-blue-900 text-white shadow-sm shadow-blue-950/30'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-white/70'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span className="tracking-tight">{t.label}</span>
                  <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-white/20 text-white border border-white/20'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}>
                    {t.pill}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {tab === 'Attendance' ? <AttendanceChart /> : <FeeChart />}
    </div>
  )
}
