# Frontend Defects, Usability Gaps & UI Technical Debt

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Scope:** Complete catalog of all client-side bugs, UX defects, rendering glitches, accessibility violations, and architectural anti-patterns identified in the frontend codebase (`src/`).  
**Total Defects Documented:** 10 Frontend Defects (`FED-001` through `FED-010`)  

---

## 1. Master Frontend Defects Register

| Defect ID | Severity | Category | Location | Title / Summary |
|---|:---:|---|---|---|
| `FED-001` | **P0 Critical** | Security / Rendering | `src/pages/BatchDetails.jsx:532` | Unsanitized `dangerouslySetInnerHTML` in Batch Curriculum View |
| `FED-002` | **P1 High** | Architecture / Perf | Multiple (`TeacherStudySection.jsx`, etc.) | Megalithic Component Debt (>1,000 LOC Single-File State Hubs) |
| `FED-003` | **P1 High** | Accessibility | `src/index.css:42` (`.btn-primary`) | Severe WCAG AA Color Contrast Failure on Primary Saffron Buttons |
| `FED-004` | **P2 Medium** | Mobile UX | `src/pages/teacher/StudySection.jsx` | Sub-Standard Touch Targets on Chapter Tree Accordion Chevrons |
| `FED-005` | **P2 Medium** | Accessibility | `DashboardShell.jsx`, `ProtectedVideoPlayer.jsx` | Missing `aria-label` Attributes on Critical Icon-Only Controls |
| `FED-006` | **P2 Medium** | Accessibility | `src/pages/teacher/StudySection.jsx` | Inlined Modal Dialogs Lack Keyboard Focus Trapping |
| `FED-007` | **P2 Medium** | UX / Video Player | `src/components/shared/ProtectedVideoPlayer.jsx` | YouTube Buffering Blackout & Lack of Recovery Spinner |
| `FED-008` | **P3 Low** | UX / Error Handling | Form handlers throughout `src/pages/` | Raw PostgREST Database Exceptions Leaked in UI Toasts |
| `FED-009` | **P3 Low** | UX / Data Loss | Inlined Modal Dialogs in Teacher Portal | Form State Lost Immediately on Inadvertent Backdrop Click |
| `FED-010` | **P2 Medium** | Reliability | `src/App.jsx` & Page Trees | Absence of Granular Component Error Boundaries |

---

## 2. Forensic Defect Profiles

### 2.1 `FED-001`: Unsanitized `dangerouslySetInnerHTML` in Batch Curriculum View
- **File:** `src/pages/BatchDetails.jsx` line 532
- **Evidence:**
  ```jsx
  <div 
    className="prose max-w-none text-slate-700"
    dangerouslySetInnerHTML={{ __html: activeBatch.detailed_info }} 
  />
  ```
- **Impact:** Any user capable of injecting HTML into `batches.detailed_info` (via Admin Batch Manager or compromised admin account) can execute arbitrary JavaScript in the browsers of visiting prospective students and parents, enabling session hijacking and credential harvesting.
- **Remediation:** Install `dompurify` and sanitize the input before injection:
  ```jsx
  import DOMPurify from 'dompurify'
  // ...
  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeBatch.detailed_info) }} />
  ```

### 2.2 `FED-002`: Megalithic Component Debt (>1,000 LOC Single-File State Hubs)
- **Files:**
  - `src/pages/teacher/StudySection.jsx` (1,948 LOC)
  - `src/components/shared/ProtectedVideoPlayer.jsx` (1,607 LOC)
  - `src/pages/student/StudentDashboard.jsx` (1,391 LOC)
  - `src/pages/student/StudySection.jsx` (1,190 LOC)
  - `src/pages/Home.jsx` (1,066 LOC)
  - `src/pages/student/WatchLecture.jsx` (1,007 LOC)
- **Impact:** Excessive re-render cascades, poor garbage collection on mobile devices, difficult code reviews, and high risk of regression when modifying isolated features.
- **Remediation:** Refactor monolithic files into focused, composable feature modules with separate data containers and presentation components.

### 2.3 `FED-003`: Severe WCAG AA Color Contrast Failure on Primary Saffron Buttons
- **File:** `src/index.css:42` (`.btn-primary`)
- **Evidence:** White text (`#ffffff`) rendered over saffron accent (`#f59e0b`).
- **Contrast Measured:** 2.14 : 1 (Minimum WCAG AA requirement: 4.5 : 1 for regular text).
- **Impact:** Users with low vision, color vision deficiencies, or using devices in bright sunlight struggle to read primary CTA text.
- **Remediation:** Change button text color to `text-slate-950` or `text-navy-900` for an 8.9:1 compliant contrast ratio.

### 2.4 `FED-004`: Sub-Standard Touch Targets on Chapter Tree Accordion Chevrons
- **File:** `src/pages/teacher/StudySection.jsx`
- **Measurement:** Chevron collapse/expand touch target measures 28px x 28px.
- **Guideline:** Material Design guidelines recommend minimum 48px x 48px touch targets for mobile accessibility.
- **Impact:** Instructors using smartphones frequently miss the toggle button, inadvertently triggering chapter selection or card navigation instead.
- **Remediation:** Add `p-2.5 -m-2.5` padding wrapper to increase hit box to 48px without changing visual icon dimensions.

### 2.5 `FED-007`: YouTube Buffering Blackout & Lack of Recovery Spinner
- **File:** `src/components/shared/ProtectedVideoPlayer.jsx`
- **Symptom:** When network latency spikes or YouTube throttles data streaming, the video player iframe freezes on a black screen. Because the player uses a custom UI overlay that hides standard YouTube controls, users are given no visual indication that the video is buffering.
- **Remediation:** Listen for `YT.PlayerState.BUFFERING` event and render a localized pulsing loading spinner until `YT.PlayerState.PLAYING` fires.

### 2.6 `FED-010`: Absence of Granular Component Error Boundaries
- **Location:** `src/App.jsx`
- **Issue:** The application only implements a top-level error boundary. If a minor component crashes (e.g., SVG chart parsing error in `AttendanceChart.jsx` due to null data or unexpected YouTube API initialization failure in `ProtectedVideoPlayer.jsx`), the entire page crashes to the generic 500 error screen.
- **Remediation:** Wrap individual complex feature blocks in localized `<ErrorBoundary fallback={<WidgetErrorFallback />}>` components.
