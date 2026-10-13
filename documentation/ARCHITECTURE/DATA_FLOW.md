# Data Flow & Mutation Architecture

Audit Date: 2026-10-13  
Platform: Thoughtful's Academy

---

## 1. Primary Data Flow Patterns

The platform implements three primary data flow patterns across its domain:

```mermaid
graph TD
    subgraph Pattern1["1. Direct PostgREST Query Flow"]
        P1Client[React View] -->|select() / order() / limit()| P1API[PostgREST Engine]
        P1API -->|SQL with RLS| P1DB[(PostgreSQL)]
        P1DB -->|JSON Result| P1Client
    end

    subgraph Pattern2["2. Realtime WebSocket Broadcast Flow"]
        P2Writer[Mutating User / Trigger] -->|insert / update / delete| P2DB[(PostgreSQL)]
        P2DB -->|WAL Logical Replication| P2RT[Realtime Server]
        P2RT -->|WSS Event| P2Sub[Subscribed Client Hooks]
        P2Sub -->|Audio Beep / Toast / Re-fetch| P2UI[Active View Component]
    end

    subgraph Pattern3["3. Asynchronous Serverless Worker Flow"]
        P3DB[(PostgreSQL)] -->|Webhook on INSERT| P3Edge[Supabase Edge Function]
        P3Edge -->|Look up Subscriptions| P3Subs[push_subscriptions Table]
        P3Edge -->|RFC 8291 Web Push| P3FCM[Browser Notification Gateway]
        P3FCM -->|Push Event| P3SW[Service Worker push-sw.js]
    end
```

---

## 2. Ingestion & Mutation Pathways

| Entity / Table | Ingestion Mechanism | Mutating Component | Side Effects & Downstream Events |
|---|---|---|---|
| **`profiles`** | PostgREST INSERT / UPDATE | `Register.jsx`, `handle_new_user()` | Trigger `update_updated_at` fires on update. |
| **`batches`** | PostgREST INSERT / UPDATE / DELETE | `BatchManager.jsx`, `AdminBatchDetails.jsx` | Updates batch posters, teacher IDs array. |
| **`attendance`** | PostgREST INSERT | `StudentDashboard.jsx` (Self check-in), `StudentTracker.jsx` | Realtime channel `attendance` updates streak & gauge. |
| **`study_cards`** | PostgREST INSERT / UPDATE / DELETE | `StudySection.jsx` (Teacher / Admin) | Logs activity in `activity_logs` via `logActivity()`. |
| **`messages`** | PostgREST INSERT / UPDATE | `Messages.jsx` (Student, Teacher, Admin) | Fires webhook to `send-push` Edge Function; updates unread dot. |
| **`fee_records`** | PostgREST INSERT / UPDATE | `PayFee.jsx` (Student submit), `FeeManager.jsx` (Admin verify) | Realtime badge updates for Admin `fees` navigation item. |
| **`live_classes`**| PostgREST INSERT / UPDATE / DELETE | `TeacherLiveClass.jsx` (Teacher drop class) | Broadcasts WSS event, triggers Web Audio 880Hz chime in students. |
| **`notifications`**| PostgREST INSERT / UPDATE / DELETE | `Announcements.jsx` (Admin) | Fires webhook to `send-push` Edge Function; displays `NotificationPopup`. |
| **`homework`** | PostgREST INSERT / UPDATE / DELETE | `TeacherHomework.jsx` | Batch students receive homework unread notification dot. |
| **`homework_submissions`**| PostgREST INSERT / UPDATE | `StudentHomework.jsx`, `TeacherHomework.jsx` | Trigger `handle_homework_graded()` creates student notification when graded. |
| **`salary_records`**| PostgREST INSERT / UPDATE | `SalaryManager.jsx` (Admin mark paid) | Teacher sees paid status badge in `SalaryStatus.jsx`. |
| **`activity_logs`** | PostgREST INSERT | `activityLogger.js` (`logActivity`) | Appears in `ActivityLogModal.jsx` within 24-hour window. |
| **`push_subscriptions`** | PostgREST INSERT / DELETE | `push.js` (`syncPush`), `send-push` cleanup | Stored endpoints used for VAPID push delivery. |
