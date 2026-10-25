# Engineering Optimization Changelog

**Platform:** Graviton Academy / Coaching Institute  
**Phase:** High-Capacity & Realtime-Preserving Optimization  
**Date:** 2026-10-13  
**Status:** Implemented, Tested, and Bundled  

---

## 1. Overview of Changes

This changelog records all architectural modifications, database schema migrations, component refactorings, caching header adjustments, and automated test additions executed to maximize concurrent capacity within the Supabase and Netlify free tiers while preserving real-time push functionality.

---

## 2. File-by-File Detailed Changelog

### 2.1 Database Schema Migration
**File:** `supabase/migrations/027_capacity_and_realtime_optimizations.sql` (NEW)
- **Rationale:** Eliminate sequential table scans across high-traffic tables, accelerate array containment lookups, and support high-concurrency read queries without exhausting database CPU.
- **Changes Applied:**
  - `idx_notifications_active_created`: Composite index on `notifications(is_active, created_at DESC)`.
  - `idx_notifications_target_role_batch`: Partial composite index on `notifications(target_role, target_batch_id) WHERE is_active = true`.
  - `idx_notification_reads_user_notif`: Composite covering index on `notification_reads(user_id, notification_id)`.
  - `idx_homework_batch_active_created`: Composite index on `homework(batch_id, is_active, created_at DESC)`.
  - `idx_homework_submissions_student_hw`: Composite index on `homework_submissions(student_id, homework_id)`.
  - `idx_homework_submissions_hw_created`: Composite index on `homework_submissions(homework_id, submitted_at DESC)`.
  - `idx_study_cards_batch_ids_gin`: **GIN index** on `study_cards USING GIN (batch_ids)` to accelerate `.contains('batch_ids', [studentBatchId])` array queries.
  - `idx_study_cards_active_created`: Composite index on `study_cards(is_active, is_public, created_at DESC)`.
  - `idx_student_profiles_batch_id`: Foreign key lookup index on `student_profiles(batch_id)`.
  - `idx_fee_records_month_status`: Composite index on `fee_records(payment_month, status)`.
  - `idx_fee_records_student_status`: Composite index on `fee_records(student_id, status)`.
  - `idx_live_classes_active_created`: Composite index on `live_classes(is_active, created_at DESC)`.
  - `idx_messages_unread_receiver`: Partial index on `messages(receiver_id) WHERE is_read = false`.
  - `idx_attendance_student_status_date`: Composite index on `attendance(student_id, status, date DESC)`.

---

### 2.2 Shell Realtime Channel Multiplexing
**File:** `src/components/shared/NotificationPopup.jsx` (MODIFIED)
- **Rationale:** Prior implementation opened three separate WebSocket channels per student (`notif_popup`, `msg_popup`, `lc_popup`), tripling server-side channel count and hitting the 200 connection limit at only ~66 users.
- **Changes Applied:**
  - Consolidated all 3 listeners into a single user-scoped channel: `popup_channel_${user.id}`.
  - Multi-listener registration using `.on('postgres_changes', ...)` chained calls.
  - Single teardown on unmount via `supabase.removeChannel(channel)`.

---

### 2.3 Ephemeral Channel Naming & Leak Elimination
**File:** `src/pages/teacher/LiveClass.jsx` (MODIFIED)
- **Rationale:** Channel naming incorporated a timestamp (`Date.now()`), instantiating new uncleaned channels on re-renders.
- **Changes Applied:**
  - Changed channel identifier to static idempotent name: `lc_manage_${user.id}`.

---

### 2.4 WebSocket Channel Teardown on Sign Out
**File:** `src/context/AuthContext.jsx` (MODIFIED)
- **Rationale:** Sockets remained open until socket timeout or garbage collection when users signed out.
- **Changes Applied:**
  - Added `await supabase.removeAllChannels()` to the `signOut` handler.

---

### 2.5 Thundering Herd Mitigation in Student Dashboard
**File:** `src/pages/student/StudentDashboard.jsx` (MODIFIED)
- **Rationale:** Monolithic `handleDynamicSync` re-executed all 11 dashboard queries simultaneously on any database change across any table, causing severe query bursts on batch announcements.
- **Changes Applied:**
  - Implemented 6 table-specific sync methods: `syncNotifications()`, `syncHomework()`, `syncStudyCards()`, `syncMessages()`, `syncFees()`, `syncAttendance()`.
  - Added a 250ms debouncing map (`debounceTimersRef`) to prevent redundant query executions during rapid burst mutations.
  - Reduced query fanout by 90.9% on broadcast events.

---

### 2.6 Unbounded Historical Query Bounding
**File:** `src/pages/admin/FeeManager.jsx` (MODIFIED)
- **Rationale:** Unconstrained `select('*')` on `fee_records` downloaded all historical records across past years.
- **Changes Applied:**
  - Bounded initial fee query with `.in('payment_month', MONTHS)` to restrict query scope to the current academic calendar.

---

### 2.7 Edge CDN Caching & Serverless Invocations
**File:** `netlify/functions/youtube-playlist.js` (MODIFIED)
- **Rationale:** Every playlist request triggered a cold serverless execution against the 125k/mo allowance.
- **Changes Applied:**
  - Set `Cache-Control: public, max-age=900, s-maxage=3600` on successful RSS/XML responses to enable Netlify Edge CDN caching.

---

### 2.8 Netlify HTTP Cache Control Headers
**File:** `netlify.toml` (MODIFIED)
- **Rationale:** Prevent stale PWA service worker traps while enabling long-term caching of hashed assets.
- **Changes Applied:**
  - Added `Cache-Control: no-cache, no-store, must-revalidate` for `/index.html`, `/sw.js`, and `/push-sw.js`.
  - Configured `Cache-Control: public, max-age=31536000, immutable` for `/assets/*`.

---

### 2.9 Browser API Storage Sanitation
**File:** `vite.config.js` (MODIFIED)
- **Rationale:** Workbox `runtimeCaching` previously cached authenticated Supabase API queries in browser `CacheStorage`, posing cross-user data bleeding risks on shared hardware.
- **Changes Applied:**
  - Removed `supabase-cache` from Workbox `runtimeCaching`.

---

### 2.10 Automated Capacity & Load Model Test Suite
**File:** `tests/capacity/capacity_model.test.js` (NEW)
- **Rationale:** Provide automated, reproducible mathematical verification of Little's Law queues, connection pool limits, channel multiplexing ratios, and free-tier quotas.
- **Changes Applied:**
  - 7 test cases covering 100, 200, 250, 500, and 1,000 user scenarios.
  - Automated verification of 66.7% channel reduction and 90.9% thundering herd reduction.
