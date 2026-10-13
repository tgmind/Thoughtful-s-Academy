# User Experience & Accessibility (UX/a11y) Upgrade Plan

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Lead Product Designer:** Senior Product Designer & Accessibility Specialist  
**Design Standard:** WCAG 2.2 Level AA Compliance & Material Design 3 Mobile Ergonomics  

---

## 1. UX Upgrade Specifications by Milestone

### 1.1 Milestone 1: Instant Accessibility & Visual Polish
- **Primary Button Contrast (`UX-001`):**
  Update `src/index.css`:
  ```css
  /* Before (2.14:1 contrast - FAILS WCAG AA): */
  .btn-primary { @apply text-white bg-brand-400 ...; }

  /* After (8.9:1 contrast - PASSES WCAG AA): */
  .btn-primary { @apply text-slate-950 bg-brand-400 font-bold ...; }
  ```
- **Accessible Screen Reader Names (`UX-003`):**
  Add explicit `aria-label` attributes to all icon-only buttons across `DashboardShell.jsx`, `ProtectedVideoPlayer.jsx`, and modals.

### 1.2 Milestone 2: Mobile Ergonomics & Focus Management
- **Touch Targets on Chapter Trees (`UX-002`):**
  Wrap the 28px chevron buttons in `TeacherStudySection` with a 48px hit area (`p-2.5 -m-2.5`) to eliminate mis-taps on mobile touchscreens.
- **Modal Focus Trapping (`UX-004`):**
  Integrate `focus-trap-react` around all modal dialogs to trap keyboard Tab navigation within active dialogs and prevent background focus leakage.

### 1.3 Milestone 3: Operational Faculty Efficiency (`UX-006`)
- **"Mark All Present" One-Click Action:**
  Add a primary action button at the top of `src/pages/student/Attendance.jsx` allowing instructors to mark the entire batch present in a single click, allowing them to selectively flip only the 2-3 absent students.

### 1.4 Milestone 4: Form Validation & Buffering Recovery
- **Inline Contextual Errors:** Replace floating toast notifications with inline red helper text below input fields with `aria-invalid="true"` associations.
- **Video Buffering Overlay (`BUG-004`):** Listen for `YT.PlayerState.BUFFERING` and display a centered pulsing spinner over the video frame during slow network connectivity.
