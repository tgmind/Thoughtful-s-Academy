// ============================================================
// src/lib/constants.js
// App-wide constants — edit to match your institute
// ============================================================

export const INSTITUTE_NAME    = import.meta.env.VITE_INSTITUTE_NAME    || 'Coaching Institute'
export const INSTITUTE_TAGLINE = import.meta.env.VITE_INSTITUTE_TAGLINE || 'Learn. Grow. Succeed.'
export const CONTACT_EMAIL     = import.meta.env.VITE_CONTACT_EMAIL     || ''
export const CONTACT_PHONE     = import.meta.env.VITE_CONTACT_PHONE     || ''

// User roles — must match CHECK constraint in profiles table
export const ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN:   'admin',
}

// Role display labels
export const ROLE_LABELS = {
  student: 'Student',
  teacher: 'Teacher',
  admin:   'Admin',
}

// Notification types — must match DB CHECK constraint
export const NOTIFICATION_TYPES = {
  GENERAL:      'general',
  FEE:          'fee',
  LIVE_CLASS:   'live_class',
  HOMEWORK:     'homework',
  ANNOUNCEMENT: 'announcement',
}

// Attendance statuses
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT:  'absent',
  LATE:    'late',
}

// Fee statuses
export const FEE_STATUS = {
  PENDING:  'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
}

// Study card types
export const STUDY_CARD_TYPES = {
  YOUTUBE_VIDEO:    'youtube_video',
  YOUTUBE_PLAYLIST: 'youtube_playlist',
  GOOGLE_DRIVE:     'google_drive',
  EXTERNAL_LINK:    'external_link',
}

// Live class platforms
export const LIVE_CLASS_PLATFORMS = {
  ZOOM:        'zoom',
  GOOGLE_MEET: 'google_meet',
  OTHER:       'other',
}

// Pagination defaults
export const PAGE_SIZE = 20

// Colour map for notification types (Tailwind border/bg classes)
export const NOTIFICATION_COLORS = {
  fee:          { border: 'border-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' },
  live_class:   { border: 'border-red-500',   bg: 'bg-red-50',   text: 'text-red-700'   },
  announcement: { border: 'border-blue-500',  bg: 'bg-blue-50',  text: 'text-blue-700'  },
  homework:     { border: 'border-purple-500',bg: 'bg-purple-50',text: 'text-purple-700'},
  general:      { border: 'border-gray-400',  bg: 'bg-gray-50',  text: 'text-gray-700'  },
}
