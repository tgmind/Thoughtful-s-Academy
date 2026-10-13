# Frontend Component Inventory

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Scope:** Complete inventory of all React/JSX components across layouts, shared widgets, pages, modals, and charts.  
**Total Source Files:** 73 UI components/pages  
**Total Frontend Lines of Code:** 25,284 LOC  

---

## 1. Executive Summary & Component Categorization

The frontend UI is structured into modular layers built on **React 18.3.1**, styled with **Tailwind CSS 3.4.14**, animated with **Framer Motion 11.11.11**, and iconified with **Lucide React 0.454.0**. The component hierarchy is segmented into:

1. **Application Shells & Layouts:** Global topbars, collapsible desktop sidebars, bottom navigation drawers for mobile, and role-based route wrappers.
2. **Shared Interactive Widgets:** Custom video player with anti-piracy canvas overlays, Drive image converters, push notification opt-in banners, live class toast chime alerts.
3. **Analytics & Visualization:** SVG/Canvas and Tailwind-based attendance distribution and fee reconciliation charts.
4. **Form Controls & Modals:** Specialized select pickers, audit log inspector modals, and floating video player overlays.
5. **Page-Level Controllers (Megaliths):** High-density feature views containing inlined subcomponents, local modals, and data-fetching loops (several exceeding 1,000 LOC).

---

## 2. Layout & Shell Components

### 2.1 `src/components/layout/DashboardShell.jsx`
- **Lines of Code:** 804 LOC
- **Imports / Dependencies:** `react-router-dom`, `framer-motion`, `lucide-react`, `AuthContext`, `useNavBadges`, `push.js`, `NotificationPopup`, `EnablePushBanner`
- **Props Accepted:**
  - `navItems`: `Array<{ to: string, label: string, icon: LucideIcon, badgeKey?: string }>`
  - `pageTitle`: `string` (Title rendered in the topbar)
- **Hooks Used:** `useState` (sidebar collapsed, mobile drawer open, search query, profile dropdown), `useEffect` (screen resize listener, push sync), `useMemo` (search filtering), `useRef` (click-outside listeners), `useCallback`
- **Key Features:**
  - Responsive multi-layout support: Desktop persistent sidebar (expandable/collapsible between 64px and 256px) and Mobile bottom app bar + slide-over drawer (`z-50`).
  - Global Search Palette: In-app quick filter navigating between role-specific tabs.
  - Role Badge Indicator: Color-coded badge pills (`ROLE_COLORS` and `AVATAR_BG`) for Student (emerald/teal), Faculty (blue/indigo), Admin (purple/violet).
  - Bell Notification Popover & Push Notification Sync: Integrates `NotificationPopup` and triggers Web Push permissions.
- **Architectural Observations:** Highly optimized layout shell; cleanly encapsulates mobile bottom navigation and desktop side navigation into a single reusable boundary for all three user roles.

### 2.2 Role Layout Shells
- **`src/pages/student/StudentLayout.jsx`** (52 LOC): Injects 8 student navigation links (`/student`, `/student/study`, `/student/live`, `/student/homework`, `/student/attendance`, `/student/fees`, `/student/messages`, `/student/notifications`) into `DashboardShell`.
- **`src/pages/teacher/TeacherLayout.jsx`** (50 LOC): Injects 8 faculty navigation links (`/teacher`, `/teacher/cards`, `/teacher/study`, `/teacher/live`, `/teacher/homework`, `/teacher/fees`, `/teacher/messages`, `/teacher/notifications`) into `DashboardShell`.
- **`src/pages/admin/AdminLayout.jsx`** (66 LOC): Injects 11 administrative navigation links (`/admin`, `/admin/batches`, `/admin/students`, `/admin/teachers`, `/admin/fees`, `/admin/salaries`, `/admin/announcements`, `/admin/analytics`, `/admin/qr`, `/admin/messages`, `/admin/settings`) into `DashboardShell`.

---

## 3. Shared & Specialized Interactive Components

### 3.1 `src/components/shared/ProtectedVideoPlayer.jsx`
- **Lines of Code:** 1,607 LOC *(Second largest component in codebase)*
- **Primary Function:** YouTube iframe wrapper enforcing playback gatekeeping, dynamic anti-piracy canvas watermarks, custom speed controls, play/pause state synchronization, and doubt submission.
- **Props Accepted:**
  - `card`: Object containing `{ id, title, youtube_url, duration, batch_id }`
  - `user`: Authenticated profile object `{ id, full_name, roll_number, email }`
  - `onComplete`: Callback function triggered when video reaches 90% completion
  - `onClose`: Callback function closing modal/fullscreen view
- **Internal Mechanisms:**
  - **YouTube Iframe API Hook:** Uses dynamic script injection (`src/utils/youtubeApiLoader.js`) to attach to `YT.Player`.
  - **Anti-Piracy Dynamic Watermarking:** Renders an HTML5 `<canvas>` layered directly over the video (`z-20`, `pointer-events-none`). Generates moving text containing user's Full Name, Roll Number, and IP/Timestamp bouncing across screen coordinates every 8 seconds via `requestAnimationFrame` to deter screen recording.
  - **Overlay Click Hijack Protection:** Invisible click interceptor prevents users from right-clicking or tapping "Watch on YouTube" to extract unlisted URLs.
  - **In-Video Doubt Drawer:** Slide-in panel allowing students to post timestamped doubts (`current_timestamp_seconds`) directly linking to `study_doubts` table.
- **Defects & Technical Debt:** Megalithic code volume. Houses YouTube player lifecycle, canvas animation engine, custom controls bar, keyboard shortcuts, and doubt messaging panel in a single file. Should be decomposed into `VideoCanvasWatermark.jsx`, `VideoCustomControls.jsx`, and `VideoDoubtPanel.jsx`.

### 3.2 `src/components/shared/LiveClassBanner.jsx`
- **Lines of Code:** 88 LOC
- **Props:** None (Subscribes directly to `live_classes` table via Supabase Realtime).
- **Features:** Floating banner across top of dashboard when an instructor initiates a live class. Plays an audio chime (Web Audio API synthetic 880Hz sine wave tone) on state transition to active broadcast.

### 3.3 `src/components/shared/ActivityLogModal.jsx`
- **Lines of Code:** 275 LOC
- **Props:** `isOpen: boolean`, `onClose: () => void`, `targetUserId?: string`, `filterAction?: string`
- **Features:** Paginated administrative audit modal displaying timeline of user logins, role modifications, fee approvals, and card deletions from `activity_logs`. Includes search by actor name and action type filtering.

### 3.4 `src/components/shared/NotificationPopup.jsx`
- **Lines of Code:** 354 LOC
- **Props:** `isOpen: boolean`, `onClose: () => void`
- **Features:** Dropdown notification center. Fetches unread announcements and personal push alerts. Provides one-click "Mark All as Read" updating `notification_reads`.

### 3.5 `src/components/shared/DriveImage.jsx`
- **Lines of Code:** 92 LOC
- **Props:** `src: string`, `alt: string`, `className: string`, `fallback?: ReactNode`
- **Features:** Normalizes Google Drive sharing links (`drive.google.com/file/d/{id}/view`) into direct thumbnail streaming URLs (`drive.google.com/uc?export=view&id={id}` and `lh3.googleusercontent.com/d/{id}`). Features built-in error handling and skeleton shimmer placeholder.

### 3.6 PWA Installation Prompts
- **`src/components/InstallAppPrompt.jsx`** (324 LOC): Custom animated bottom drawer prompting mobile browsers to install PWA (`beforeinstallprompt` event capture). Contains platform-specific iOS Safari "Add to Home Screen" instructions.
- **`src/components/InstallHeaderButton.jsx`** (54 LOC): Minimalist topbar installation trigger displaying download icon when PWA is installable.

---

## 4. UI Primitives & Analytics Components

### 4.1 UI Primitives
- **`src/components/ui/CustomSelect.jsx`** (132 LOC): Accessible dropdown replacement built with custom popover logic. Supports keyboard arrow navigation, search filtering, and outside-click dismiss.
- **`src/components/shared/Skeleton.jsx`** (68 LOC): Shimmer loading primitives (`CardSkeleton`, `TableSkeleton`, `AvatarSkeleton`, `TextSkeleton`) using CSS linear-gradient animations.
- **`src/components/shared/LoadingSpinner.jsx`** (42 LOC): Reusable loading spinner with size and color variants.
- **`src/components/shared/RouteLoader.jsx`** (38 LOC): Centered full-screen animated splash screen used during React.lazy code chunk loading.

### 4.2 Analytics Visualizations
- **`src/components/analytics/AttendanceChart.jsx`** (161 LOC): SVG donut and bar breakdown visualizing student monthly presence vs absence rates and current active streaks.
- **`src/components/analytics/FeeChart.jsx`** (155 LOC): Monthly revenue bar chart comparing collection amounts across batches and payment modes (UPI vs Cash).

---

## 5. Comprehensive Page-Level Component Registry

| File Path | LOC | Category | Primary Function | Complexity |
|---|:---:|---|---|:---:|
| `src/pages/Home.jsx` | 1,066 | Public | Public landing page, hero section, course showcase, faculty grid, testimonial carousel, FAQ accordion, footer | High |
| `src/pages/BatchDetails.jsx` | 814 | Public | Public curriculum overview, faculty bios, batch pricing, schedule breakdown, registration CTA | High |
| `src/pages/Login.jsx` | 275 | Auth | Password and OTP login form, remember me, error handling, role-based redirect | Medium |
| `src/pages/Register.jsx` | 521 | Auth | Multi-step student onboarding, roll number generation, batch selection, admin invite code bypass | High |
| `src/pages/ResetPassword.jsx` | 138 | Auth | Supabase recovery token consumption, new password confirmation | Low |
| `src/pages/Dashboards.jsx` | 31 | Router | Smart traffic controller redirecting `/dashboard` to role layout (`/student`, `/teacher`, `/admin`) | Minimal |
| `src/pages/ErrorPages.jsx` | 84 | Error | 404 Not Found, 403 Forbidden, and 500 Generic Error layouts | Low |
| `src/pages/student/StudentDashboard.jsx` | 1,391 | Student | Student command center: live class banner, today's schedule, quick resume study card, attendance streak counter, fee status badge, recent notices | Very High |
| `src/pages/student/StudySection.jsx` | 1,190 | Student | Subject explorer, chapter hierarchical list, study card grid, search & topic filter, completion tracking | Very High |
| `src/pages/student/WatchLecture.jsx` | 1,007 | Student | Standalone video study room, player integration, notes markdown editor, doubt Q&A thread, homework download | Very High |
| `src/pages/student/LiveClass.jsx` | 126 | Student | Live broadcast viewer, active stream status, attendance mark button, live chat link | Medium |
| `src/pages/student/Homework.jsx` | 254 | Student | Assigned homework card deck, file attachments, submission status, grading feedback | Medium |
| `src/pages/student/Attendance.jsx` | 444 | Student | Monthly calendar attendance heat map, streak tracker, leave request form | High |
| `src/pages/student/PayFee.jsx` | 222 | Student | Institute QR code display, pending fee invoice breakdown, UTR transaction number submission form | Medium |
| `src/pages/student/Messages.jsx` | 379 | Student | Direct 1-on-1 chat interface between student and batch teachers, message history, unread counters | High |
| `src/pages/student/Notifications.jsx` | 424 | Student | Broadcast announcements and personal alerts stream with filter tabs | Medium |
| `src/pages/teacher/TeacherHome.jsx` | 214 | Faculty | Instructor command center: batch schedule, upcoming live class trigger, unread doubt alerts | Medium |
| `src/pages/teacher/StudySection.jsx` | 1,948 | Faculty | **Largest file in codebase:** Full curriculum CRUD, subject/chapter hierarchy builder, study card editor, YouTube playlist importer, lecture notes publisher | Critical |
| `src/pages/teacher/StudyCards.jsx` | 412 | Faculty | Card-level management view, ordering, publication toggle (draft vs published), analytics | High |
| `src/pages/teacher/LiveClass.jsx` | 299 | Faculty | Live broadcast broadcast studio: start/stop class, stream link broadcast, live attendee counter | Medium |
| `src/pages/teacher/Homework.jsx` | 375 | Faculty | Assignment authoring, deadline scheduling, student submission evaluation & grading | High |
| `src/pages/teacher/FeeRecords.jsx` | 169 | Faculty | Read-only fee collection status view for assigned batch students | Medium |
| `src/pages/teacher/SalaryStatus.jsx` | 282 | Faculty | Teacher monthly disbursement ledger, payslip review, advance request history | Medium |
| `src/pages/teacher/Messages.jsx` | 655 | Faculty | Multi-student inquiry inbox, conversation switcher, message composer | High |
| `src/pages/teacher/Notifications.jsx` | 597 | Faculty | Faculty announcements composer, push alert dispatcher, read receipt metrics | High |
| `src/pages/admin/AdminHome.jsx` | 365 | Admin | Institute KPI dashboard: revenue total, active enrolled students, faculty count, quick action cards | High |
| `src/pages/admin/BatchManager.jsx` | 336 | Admin | Batch CRUD, subject assignment, fee structure configuration, enrollment caps | High |
| `src/pages/admin/AdminBatchDetails.jsx` | 704 | Admin | Batch roster management, student enrollment transfers, schedule overrides, detailed HTML description editor | Very High |
| `src/pages/admin/StudentTracker.jsx` | 473 | Admin | Master student directory, roll number search, batch re-assignment, enrollment status toggle (active/suspended) | High |
| `src/pages/admin/TeacherManager.jsx` | 509 | Admin | Faculty directory, subject specialization mapping, base salary configuration, account status | High |
| `src/pages/admin/FeeManager.jsx` | 817 | Admin | Fee verification workbench: UTR manual matching, pending submission approvals/rejections, receipt generation | Very High |
| `src/pages/admin/SalaryManager.jsx` | 491 | Admin | Payroll disbursement console: monthly salary computation, bonus/deduction line items, payout confirmation | High |
| `src/pages/admin/Announcements.jsx` | 385 | Admin | Institute-wide announcement broadcast builder with push notification delivery triggers | High |
| `src/pages/admin/Analytics.jsx` | 240 | Admin | Historical revenue reports, batch attendance distributions, enrollment growth trajectories | High |
| `src/pages/admin/QRManager.jsx` | 145 | Admin | Institute UPI QR code image and VPA identifier configuration editor | Medium |
| `src/pages/admin/AdminMessages.jsx` | 745 | Admin | Omnichannel communication center: view and intervene in student-teacher chat threads, broadcast system messages | Very High |
| `src/pages/admin/AdminSettings.jsx` | 795 | Admin | Institute branding, academic year defaults, backup triggers, administrative user management | Very High |

---

## 6. Component Quality & Maintainability Assessment

### 6.1 Megalithic Components (> 700 LOC)
Eight components exceed 700 lines of code, indicating severe accumulation of UI state, data fetching, business logic, and markup inside single files:
1. `src/pages/teacher/StudySection.jsx` (1,948 LOC)
2. `src/components/shared/ProtectedVideoPlayer.jsx` (1,607 LOC)
3. `src/pages/student/StudentDashboard.jsx` (1,391 LOC)
4. `src/pages/student/StudySection.jsx` (1,190 LOC)
5. `src/pages/Home.jsx` (1,066 LOC)
6. `src/pages/student/WatchLecture.jsx` (1,007 LOC)
7. `src/pages/admin/FeeManager.jsx` (817 LOC)
8. `src/pages/BatchDetails.jsx` (814 LOC)
9. `src/components/layout/DashboardShell.jsx` (804 LOC)
10. `src/pages/admin/AdminSettings.jsx` (795 LOC)

### 6.2 Key Refactoring Recommendations
- **Extract Dialogs & Modals:** `TeacherStudySection.jsx` contains 4 distinct modals (Chapter Edit, Card Add, YouTube Playlist Sync, Study Note Upload) inlined in the return statement. Each should be separated into its own component.
- **Decompose `ProtectedVideoPlayer`:** Split out the canvas watermarking animation loop and doubt panel into decoupled subcomponents to prevent canvas rerenders on chat typing.
- **Shared Query Hooks:** Multiple components duplicate identical Supabase `.from("batches").select("*")` logic rather than consuming unified TanStack Query hooks.
