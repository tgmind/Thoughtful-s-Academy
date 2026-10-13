# Study Cards & Lecture Room Deep Dive

Audit Date: 2026-10-13  
Platform: Thoughtful's Academy  
Feature IDs: FEAT-008, FEAT-009, FEAT-010

---

## 1. Study Cards & Workspaces (FEAT-008)

- **Components:** `src/pages/teacher/StudySection.jsx` (1,949 LOC), `src/pages/student/StudySection.jsx` (1,190 LOC)
- **Supported Study Card Types (`STUDY_CARD_TYPES`):**
  * `youtube_video`: Individual recorded video lecture.
  * `youtube_playlist`: Curated multi-lecture series automatically resolved into indexed queue items.
  * `google_drive`: Handwritten lecture notes, formula sheets, Daily Practice Problems (DPPs).
  * `external_link`: External reading, NCERT PDFs, or simulation tools.
- **Batch Assignment Model:**
  * Migration `008_study_cards_multi_batch.sql` introduced `batch_ids UUID[]` to allow assigning a single study card to multiple batches simultaneously.
  * Migration `021_fix_teacher_study_cards_permissions.sql` added RLS checks ensuring teachers can only modify cards assigned to batches they teach.

---

## 2. Protected Video Classroom Player (FEAT-009, FEAT-024)

- **Component:** `src/components/shared/ProtectedVideoPlayer.jsx`
- **Engine:** Custom integration of YouTube's IFrame API (`window.YT.Player`).
- **Core Video Protection & Learning Controls:**
  * **Distraction Shielding:** Hides YouTube's default controls, player branding, annotations, and recommendations using absolute CSS overlays and iframe clipping.
  * **Playback Rates:** Supports `[0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x]`.
  * **2x Long-Press Accelerator:** Holding down a tap or mouse click on the video automatically accelerates playback to 2x; releasing returns to the previous speed.
  * **Quality Selector:** Allows toggling between `480p` (Data Saver, saves ~65% mobile data), `720p` (Balanced formulas), `1080p` (Full HD notes), and `Auto`.
  * **Clean Mode:** Removes all secondary UI elements and darkens backgrounds for immersive study.
  * **Screen Lock:** Locks on-screen buttons to prevent accidental palm taps on mobile devices.
  * **Saved Playback Progress & Resume Mechanism (FEAT-024):**
    - Automatically saves lecture progress to `localStorage` under `ta_lecture_progress_v1`.
    - **Top-Floating Glassmorphic Banner:** Positioned at `top-3.5 left-3.5 sm:left-4 z-40` (with fullscreen-aware offset `left-12 sm:left-14`) so it never occludes the interactive seek timeline scrubber, play/pause controls, or time labels.
    - **Instant Resume Action:** Tapping "Resume" automatically seeks to `saved.time` and triggers immediate playback (`playVideo()`).
    - **Deep-Link Suppression:** When navigating via a Doubt timestamp deep-link (`initialSeekSeconds > 0`), the resume prompt is completely suppressed to prevent conflicting seeks.
    - **Stable Dismissal:** Prevents infinite re-render cycles using memoized default collections and explicit dismiss tracking.

---

## 3. In-Video Doubts, Tabs & Bookmarks (FEAT-010, FEAT-023)

- **Component:** `src/pages/student/WatchLecture.jsx`
- **Authoritative Doubt Architecture:**
  * In-video doubts are **never sent as ordinary chat messages**. Instead, doubts are authoritatively recorded in `public.doubts` via `src/services/doubtService.js` (Migration `028_doubt_resolution_hub.sql`).
  * Captures `currentTime` integer seconds (e.g. `11:43` -> `703s`), snapshotting `student_name`, `roll_number`, `batch_id`, `batch_name`, `subject`, and `lecture_title`.
  * Routed dynamically to dedicated hubs:
    - **Student Doubts Hub** (`/student/doubts`): Personal tracker, status filters, and instant self-study deletion.
    - **Teacher Doubts Hub** (`/teacher/doubts`): Subject/batch accordions with one-click resolution.
    - **Admin Doubts Central** (`/admin/doubts`): Teacher-wise and Subject/Batch-wise management.
- **Role-Based Interactive Classroom Visibility:**
  * **Enrolled Students:** See the "Ask Doubt at MM:SS" button and doubt creation modal. The classroom sidebar displays recent doubts with live status badges and quick self-study delete.
  * **Faculty & Administrators:** Never see student doubt creation forms. Instead, they see a "Manage Doubts Hub" button and an in-player **Educator Review Queue** with direct "Mark Addressed" and "Message Student" quick actions.
  * **Public / Demo Visitors:** "Landscape Cinema" view expands to full width (`w-full`) with doubt buttons hidden. The doubts tab renders an **Enrolled Feature Showcase** explaining exclusive enrolled benefits.
- **Single-Video Tab Optimization & Deduplication:**
  * For study cards with a single external/YouTube link (`!hasMultipleLectures`), the `Lectures` tab vanishes automatically; only `Notes` and `Doubts` tabs are displayed.
  * Redundant "Class Brief & Objectives" cards are removed; the description is anchored cleanly once in "Lecture Highlights & Outline".
- **Student Bookmarking:**
  * Clicking the bookmark heart icon inserts a record into `student_bookmarks` (`student_id`, `study_card_id`).
  * Bookmarked resources appear pinned at the top of the student's study section for fast revision.
- **Deep Reference:** See [Doubt Resolution Hub Specification](./DOUBT_RESOLUTION_HUB.md) for full architecture and RLS rules.
