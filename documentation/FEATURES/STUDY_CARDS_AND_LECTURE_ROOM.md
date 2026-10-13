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

## 2. Protected Video Classroom Player (FEAT-009)

- **Component:** `src/components/shared/ProtectedVideoPlayer.jsx` (1,607 LOC)
- **Engine:** Custom integration of YouTube's IFrame API (`window.YT.Player`).
- **Core Video Protection & Learning Controls:**
  * **Distraction Shielding:** Hides YouTube's default controls, player branding, annotations, and recommendations using absolute CSS overlays and iframe clipping.
  * **Playback Rates:** Supports `[0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x]`.
  * **2x Long-Press Accelerator:** Holding down a tap or mouse click on the video automatically accelerates playback to 2x; releasing returns to the previous speed.
  * **Quality Selector:** Allows toggling between `480p` (Data Saver, saves ~65% mobile data), `720p` (Balanced formulas), `1080p` (Full HD notes), and `Auto`.
  * **Clean Mode:** Removes all secondary UI elements and darkens backgrounds for immersive study.
  * **Screen Lock:** Locks on-screen buttons to prevent accidental palm taps on mobile devices.
  * **Progress Persistence:** Debounces and saves playback progress to `localStorage` key `ta_lecture_progress_v1`, allowing students to resume lectures from where they stopped.

---

## 3. In-Video Doubts & Bookmarks (FEAT-010)

- **Component:** `src/pages/student/WatchLecture.jsx`
- **Doubt Submission Workflow:**
  * Right-hand classroom sidebar includes a "Doubts" tab.
  * While playing a video, clicking "Ask Doubt" captures `currentTime` (e.g. `12:45`).
  * When submitted, it creates a row in `messages` sent to the batch teacher with body:
    `[Timestamp: 12:45] "Sir, why did we take g = 9.8 instead of 10 here?"`
  * The teacher can click the timestamp link in their messaging portal to jump directly to that video moment.
- **Student Bookmarking:**
  * Clicking the bookmark heart icon inserts a record into `student_bookmarks` (`student_id`, `study_card_id`).
  * Bookmarked resources appear pinned at the top of the student's study section for fast revision.
