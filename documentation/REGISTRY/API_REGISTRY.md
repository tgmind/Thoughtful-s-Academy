# Master Backend API Interface Registry

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Total Cataloged API Endpoints:** 22 Interfaces  

---

## 1. Master API Interface Registry

| Endpoint Path | Gateway / Runtime | Supported Methods | Primary Table / Target | Auth Scheme |
|---|---|:---:|---|---|
| `/auth/v1/signup` | Supabase GoTrue | POST | `auth.users` | Anon Key |
| `/auth/v1/token` | Supabase GoTrue | POST | `auth.users` | Anon Key |
| `/rest/v1/profiles` | PostgREST | GET, PATCH | `public.profiles` | Bearer JWT |
| `/rest/v1/student_profiles` | PostgREST | GET, PATCH | `public.student_profiles` | Bearer JWT |
| `/rest/v1/teacher_profiles` | PostgREST | GET, PATCH | `public.teacher_profiles` | Bearer JWT |
| `/rest/v1/batches` | PostgREST | GET, POST, PATCH, DELETE | `public.batches` | Anon (GET) / Admin |
| `/rest/v1/study_cards` | PostgREST | GET, POST, PATCH, DELETE | `public.study_cards` | Anon (GET) / Faculty |
| `/rest/v1/student_bookmarks` | PostgREST | GET, POST, DELETE | `public.student_bookmarks` | Bearer JWT |
| `/rest/v1/attendance` | PostgREST | GET, POST, PATCH | `public.attendance` | Bearer JWT |
| `/rest/v1/fee_records` | PostgREST | GET, POST, PATCH | `public.fee_records` | Bearer JWT |
| `/rest/v1/salary_records` | PostgREST | GET, POST, PATCH | `public.salary_records` | Bearer JWT |
| `/rest/v1/live_classes` | PostgREST | GET, POST, PATCH | `public.live_classes` | Bearer JWT |
| `/rest/v1/notifications` | PostgREST | GET, POST, PATCH, DELETE | `public.notifications` | Bearer JWT |
| `/rest/v1/notification_reads`| PostgREST | GET, POST | `public.notification_reads`| Bearer JWT |
| `/rest/v1/messages` | PostgREST | GET, POST, PATCH | `public.messages` | Bearer JWT |
| `/rest/v1/homework` | PostgREST | GET, POST, PATCH, DELETE | `public.homework` | Bearer JWT |
| `/rest/v1/homework_submissions`| PostgREST | GET, POST, PATCH | `public.homework_submissions`| Bearer JWT |
| `/rest/v1/push_subscriptions`| PostgREST | GET, POST, DELETE | `public.push_subscriptions`| Bearer JWT |
| `/rest/v1/activity_logs` | PostgREST | GET, POST | `public.activity_logs` | Bearer JWT |
| `/rest/v1/qr_settings` | PostgREST | GET, PATCH | `public.qr_settings` | Bearer JWT |
| `/.netlify/functions/youtube-playlist` | Netlify (Node 20) | GET | YouTube RSS Feeds | Public / Open |
| `/functions/v1/send-push` | Supabase (Deno) | POST | Web Push VAPID Relays | `x-webhook-secret` |
