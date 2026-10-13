# User Experience & Accessibility (UX/a11y) Findings

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Total Documented UX Findings:** 6 Findings (`UX-001` through `UX-006`)  

---

## 1. Master UX Findings Summary

| Finding ID | Severity | Category | Location | Summary / Description |
|---|:---:|---|---|---|
| `UX-001` | **P1 High** | Accessibility | `src/index.css` (`.btn-primary`) | 2.14:1 Contrast Ratio fails WCAG 2.2 AA minimum standard (4.5:1) |
| `UX-002` | **P2 Medium** | Mobile Ergonomics | `TeacherStudySection.jsx` | 28px x 28px accordion touch target fails 48px touch guidelines |
| `UX-003` | **P2 Medium** | Screen Readers | `DashboardShell.jsx`, etc. | Missing `aria-label` on notification bells and close buttons |
| `UX-004` | **P2 Medium** | Keyboard a11y | `TeacherStudySection.jsx` | Inlined modal dialogs allow keyboard tab focus to bleed to background |
| `UX-005` | **P2 Medium** | Process Friction | Student & Admin Fees | Manual 12-digit UTR verification creates reconciliation delays |
| `UX-006` | **P3 Low** | Efficiency | `Attendance.jsx` | Lack of "Mark All Present" button forces tedious individual clicking |

---

## 2. Granular UX Profiles & Actionable Recommendations

### 2.1 `UX-001`: Primary Button Contrast Remediation
- **Issue:** White text on saffron `#f59e0b` provides poor visual contrast.
- **Fix:** Update `.btn-primary` in `src/index.css` to use `text-slate-950` or `text-navy-900`, raising the contrast ratio to a fully compliant **8.9:1**.

### 2.2 `UX-005`: UPI Payment Friction Loop
- **Issue:** Students manually type 12-digit UTR reference numbers from banking apps into `PayFee.jsx`. A single typo causes payment rejection and back-and-forth disputes.
- **Fix:** Provide automated UPI intent links (`upi://pay?...`) on mobile devices that pre-populate transaction references, or integrate an automated payment gateway.

### 2.3 `UX-006`: Faculty Attendance Efficiency
- **Issue:** In large batches of 60+ students, instructors must click each student individually to mark attendance.
- **Fix:** Add a single "Mark All Present" button at the top of the roster, allowing teachers to mark the entire batch present in 1 click and selectively flip only absent students.
