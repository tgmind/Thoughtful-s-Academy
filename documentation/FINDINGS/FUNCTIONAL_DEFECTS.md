# Functional Defects & Runtime Bugs Register

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Total Documented Bugs:** 8 Functional Defects (`BUG-001` through `BUG-008`)  

---

## 1. Master Functional Defects Register

| Bug ID | Severity | Category | Location | Summary / Description |
|---|:---:|---|---|---|
| `BUG-001` | **P1 High** | Auth Bypass | `src/App.jsx:92` | Direct URL `/watch/:cardId` bypasses student role authorization guard |
| `BUG-002` | **P1 High** | Data Integrity | `AdminSettings.jsx:412` | Deleting student profile leaves orphan in `auth.users`, locking email |
| `BUG-003` | **P2 Medium** | Concurrency | `014_handle_new_user.sql` | Concurrent batch signups crash with unique roll number collision |
| `BUG-004` | **P2 Medium** | UX / Video Player | `ProtectedVideoPlayer.jsx` | YouTube buffering freezes player on black canvas without loading indicator |
| `BUG-005` | **P2 Medium** | Reliability | `src/App.jsx` | Missing component error boundaries; single error crashes entire dashboard |
| `BUG-006` | **P3 Low** | Data Loss | Teacher Study Modals | Clicking modal backdrop destroys entered form data without draft preservation |
| `BUG-007` | **P3 Low** | Info Leakage | Client Form Handlers | Raw PostgREST database exceptions surfaced directly in user toasts |
| `BUG-008` | **P3 Low** | Data Drift | `study_cards` Table | Dual columns `batch_id` and `batch_ids` can drift out of sync |

---

## 2. Granular Bug Profiles & Remediation Steps

### 2.1 `BUG-001`: Direct URL Access Bypasses Role Gate on Video Player
- **Symptom:** Navigating directly to `http://localhost:5173/watch/<uuid>` mounts `WatchLecture.jsx` even when unauthenticated or logged in as an unrelated user.
- **Root Cause:** In `src/App.jsx`, the route `/watch/:cardId` was defined at top level outside `<RoleRoute allowedRoles={['student']}>`.
- **Fix:** Wrap the route inside `<RoleRoute allowedRoles={['student', 'teacher', 'admin']}>`.

### 2.2 `BUG-004`: Video Player Buffering Blackout
- **Symptom:** On slow 4G connections, when YouTube buffers, the video screen turns pitch black without any loading spinner.
- **Fix:** Add a state listener on YouTube API event `YT.PlayerState.BUFFERING` that toggles an animated loading spinner overlay.

### 2.3 `BUG-006`: Modal Form State Loss on Inadvertent Backdrop Click
- **Symptom:** An instructor entering a 200-word lecture description accidentally clicks outside the modal backdrop; the modal closes and all text is cleared.
- **Fix:** Add confirmation prompt or persist draft form state to `sessionStorage`.
