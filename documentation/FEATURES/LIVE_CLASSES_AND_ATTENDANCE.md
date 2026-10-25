# Live Classes & Attendance Tracking Deep Dive

Audit Date: 2026-10-13  
Platform: Graviton Academy  
Feature IDs: FEAT-011, FEAT-012

---

## 1. Live Class Broadcasting System (FEAT-011)

- **Teacher Launcher:** `src/pages/teacher/LiveClass.jsx` (299 LOC)
- **Student Receiver:** `src/pages/student/LiveClass.jsx` (127 LOC), `src/components/shared/LiveClassBanner.jsx` (87 LOC)
- **Workflow:**
  1. Teacher enters title, selects platform (`zoom`, `google_meet`, `other`), inputs meeting join link and optional password, and targets a specific batch or "All Batches".
  2. Clicking "Start Class" creates a row in `live_classes` with `is_active = true`.
  3. Supabase Realtime broadcasts this insertion to all enrolled students over channel `live_class_{batchId}`.
  4. The client's `useLiveClass` hook detects the new active session and triggers an 880Hz sine wave audio alert via the Web Audio API.
  5. An animated red pulsing "Live Class Active" banner mounts across the top of the student's dashboard.
  6. When the class ends, the teacher clicks "End Class" (`is_active = false`), instantly unmounting the banner on student screens.

---

## 2. Daily Self-Attendance & Consistency Engine (FEAT-012)

- **Components:** `src/pages/student/Attendance.jsx` (445 LOC), `src/pages/student/StudentDashboard.jsx` (1,392 LOC)
- **Database Table:** `attendance` with constraint `UNIQUE(student_id, date)`.
- **One-Click Check-In:**
  * Student clicks "Mark Present Today" on the dashboard.
  * System records `{ student_id: user.id, batch_id, date: todayISO(), status: 'present', marked_by: user.id }`.
  * The button transforms into a green checkmark: *"Marked Present"*.
- **Streak Calculation Logic (`calculateStreak()`):**
  * Reads the student's historical attendance records.
  * Builds a calendar map of dates.
  * If today is not marked yet, checks backward from yesterday (so streaks do not prematurely drop in the early morning).
  * Iterates day-by-day in local calendar time; increments streak while `status IN ('present', 'late')`.
  * Renders a vibrant flame badge with motivational tiers:
    * 2+ days: *"Great momentum!"*
    * 5+ days: *"On fire! Keep it up!"*
    * 10+ days: *"Unstoppable! 🚀"*
- **Attendance Percentage Gauge:**
  * Animated circular SVG ring rendering `((present + late * 0.5) / total_marked) * 100`.
  * Color-coded: Green (≥75%), Amber (50–74%), Red (<50%).
- **Monthly Heatmap:**
  * Calendar grid displaying daily status colors (Green = Present, Amber = Late, Red = Absent).
  * Allows navigating backward across past academic months.
