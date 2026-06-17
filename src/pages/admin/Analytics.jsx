import { useState } from 'react'
import AttendanceChart from '../../components/analytics/AttendanceChart'
import FeeChart        from '../../components/analytics/FeeChart'

const TABS = ['Attendance', 'Fees']

export default function Analytics() {
  const [tab, setTab] = useState('Attendance')
  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <div className="flex gap-2">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab===t?'bg-blue-950 text-white':'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {t} Analytics
          </button>
        ))}
      </div>
      {tab === 'Attendance' ? <AttendanceChart /> : <FeeChart />}
    </div>
  )
}
