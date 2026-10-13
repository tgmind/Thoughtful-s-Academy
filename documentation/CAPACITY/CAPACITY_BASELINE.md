# Platform Capacity Baseline & Bottleneck Forensics

**Platform:** Thoughtful's Academy / Coaching Institute  
**Commit Baseline:** `b6b2d2803d976e3470d903555394b198731660b2` (Branch `main`)  
**Audit Date:** 2026-10-13  
**Target Environment:** Supabase Free Tier + Netlify Starter / Free Tier  
**Verification Target:** Support highest practical concurrent student/teacher volume without paid plan upgrades or degrading real-time push synchronization.

---

## 1. Executive Summary: Capacity Objectives & Constraints

Thoughtful's Academy is an EdTech single-page application built on React 18, Vite, Supabase (PostgreSQL 15 + PostgREST + GoTrue + Realtime), and Netlify CDN with edge serverless functions.

### The Engineering Challenge
The platform operates under free-tier operational quotas:
- **Supabase Free Tier:**
  - 500 MB database storage
  - 60 direct PostgreSQL connections / ~200 transaction pooler connections (Supavisor port 6543)
  - 200 concurrent Realtime client connections
  - 2,000,000 Realtime messages / month
  - 2 GB bandwidth egress / month
  - 50,000 Monthly Active Users (MAU)
- **Netlify Starter / Free Tier:**
  - 100 GB bandwidth / month
  - 300 build minutes / month
  - 125,000 serverless function invocations / month

Prior to capacity remediation, the application suffered from structural design bottlenecks that restricted effective concurrent capacity to under 50–70 users before risking connection pool exhaustion, duplicate WebSocket overhead, and thundering herd query bursts.

---

## 2. Baseline Architecture & Workload Assumptions

### 2.1 User Persona & Session Profile Assumptions

A typical coaching institute daily session profile during peak hours (e.g., 6:00 PM – 9:00 PM IST) exhibits the following behavioral characteristics:

| Parameter | Value | Rationale |
|---|---|---|
| **Student : Staff Ratio** | 9 : 1 (90% students, 10% teachers & admins) | Typical batch sizes of 30–50 students per instructor |
| **Average Session Length** | 45 minutes | Duration of an active class or revision study session |
| **User Activity Rate** | 1 navigation / interaction every 90 seconds (~40 queries/user/hour) | Inspecting study cards, reading notices, checking homework |
| **Broadcast Event Frequency** | 4 to 6 events / hour | Teacher launches live class, posts homework, sends urgent batch notice |
| **Average Query Payload** | 1.8 KB (compressed JSON) | PostgREST structured response across typical relation queries |
| **Passive Polling** | 0 queries | Fully push-first WebSocket architecture (no `setInterval` queries) |

---

## 3. Discovered Pre-Optimization Bottlenecks

### 3.1 Bottleneck B1: Realtime Channel Proliferation (3x Multiplier per Client)
In the baseline shell component (`src/components/shared/NotificationPopup.jsx`), every connected student opened **three separate Supabase Realtime channels**:
```javascript
// PRE-OPTIMIZATION (NotificationPopup.jsx):
const notifChannel = supabase.channel('notif_popup')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, ...)
  .subscribe();

const msgChannel = supabase.channel('msg_popup')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ...)
  .subscribe();

const lcChannel = supabase.channel('lc_popup')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_classes' }, ...)
  .subscribe();
```
- **Impact:** Each user consumed 3 active Realtime channel subscriptions on the Supabase Realtime cluster.
- **Capacity Ceiling:** With Supabase's hard cap of 200 concurrent client connections, running un-multiplexed channels wasted server-side topic router memory and increased channel lifecycle handshake traffic by 300%. Furthermore, in `LiveClass.jsx`, dynamic non-idempotent channel names (`lc_manage_${user.id}_${Date.now()}`) caused connection leaks on re-renders.

### 3.2 Bottleneck B2: Broadcast Thundering Herd in Student Dashboard (11x Fanout)
In `src/pages/student/StudentDashboard.jsx`, the real-time event subscriber listened to changes across 6 database tables (`notifications`, `homework`, `study_cards`, `messages`, `fee_records`, `attendance`). Whenever *any* single event arrived (e.g., a teacher posted a single announcement to a batch of 100 students), the baseline triggered `handleDynamicSync`:
```javascript
// PRE-OPTIMIZATION (StudentDashboard.jsx):
const handleDynamicSync = (payload) => {
  fetchDashboardData(); // Executes ALL 11 dashboard queries simultaneously!
};
```
- **Impact:** 1 announcement $\times$ 100 students triggered $100 \times 11 = 1,100$ concurrent database SELECT queries against PostgreSQL within milliseconds.
- **Risk:** Complete exhaustion of the PostgreSQL connection pool, spike in query queueing latency, and 504 gateway timeouts.

### 3.3 Bottleneck B3: Missing Composite & Partial Database Indexes
Review of the database queries against schema migration `001` through `026` revealed critical missing indexes on high-frequency tables:
1. `notifications`: Filtered on `(is_active = true, created_at DESC)` and `(target_role, target_batch_id)`. Required full table scans.
2. `notification_reads`: Filtered on `(user_id, notification_id)` on every student notification render.
3. `homework`: Filtered on `(batch_id, is_active, created_at DESC)`.
4. `study_cards`: `batch_ids` stored as `UUID[]` (array). Queries used `.contains('batch_ids', [studentBatchId])`. Without a GIN index on `batch_ids`, PostgreSQL performed full table sequential scans across every study card row.
5. `fee_records`: Filtered on `(payment_month, status)` and `(student_id, status)`. In `FeeManager.jsx`, unconstrained `select('*')` downloaded all historical years on page load.
6. `messages`: Filtered on `(receiver_id) WHERE is_read = false`.
7. `attendance`: Filtered on `(student_id, status, date DESC)`.

### 3.4 Bottleneck B4: Workbox Service Worker Caching Authenticated API Data
In `vite.config.js`, Workbox was configured with:
```javascript
{
  urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
  handler: 'NetworkFirst',
  options: {
    cacheName: 'supabase-cache',
    expiration: { maxEntries: 50, maxAgeSeconds: 300 },
  },
}
```
- **Impact:** Authenticated API responses containing sensitive student and administrative records were cached in browser `CacheStorage`. On shared or classroom computers, subsequent users could view stale or leaked student data.
- **Capacity Impact:** NetworkFirst still hit the network first, offering 0 bandwidth reduction on successful connections while introducing cache invalidation bugs when real-time updates occurred.

### 3.5 Bottleneck B5: Uncached Netlify Edge Functions
The YouTube playlist proxy (`netlify/functions/youtube-playlist.js`) did not specify an Edge CDN cache instruction (`s-maxage`). Every student viewing study playlists triggered a separate execution against the 125,000 monthly serverless function allowance.

---

## 4. Baseline Metrics Summary

| Dimension | Baseline State | Bottleneck / Risk Level | Remediated In |
|---|---|---|---|
| **Realtime Channel Topology** | 3 independent channels per client | **CRITICAL**: Tripled WebSocket channel count | Migration 027 + NotificationPopup.jsx |
| **Broadcast Fanout Ratio** | 1:11 query multiplication on any event | **CRITICAL**: Thundering herd query spike | StudentDashboard.jsx debounced handlers |
| **Study Cards Array Scan** | Sequential table scan on `batch_ids` array | **HIGH**: CPU spikes as study card library grows | GIN Index in Migration 027 |
| **Notifications Read Lookup** | Sequential scan on `notification_reads` | **HIGH**: Degrades as read logs accumulate | Composite Index in Migration 027 |
| **Fee Historical Query** | Unbounded `select('*')` over all time | **MEDIUM**: Unnecessary egress and memory | Bounded Query in FeeManager.jsx |
| **Edge Function Caching** | No CDN cache header (`s-maxage`) | **MEDIUM**: Serverless quota waste | `s-maxage=3600` in Edge Function |
| **Browser API Cache Storage** | Authenticated Supabase responses cached | **HIGH**: Cross-user data bleed risk | Removed from `vite.config.js` |

---

## 5. Capacity Baseline Target Matrix

| Concurrency Tier | Target Status | Free-Tier Feasibility | Primary Constraint |
|---|---|---|---|
| **100 Concurrent Users** | Fully Supported | 100% within all quotas | None — optimal operating sweet spot |
| **200 Concurrent Users** | Supported | Exact Free Tier Realtime Connection Cap | Supabase 200 WebSocket client ceiling |
| **250 Concurrent Users** | Over Free Realtime Cap | Requires Supabase Pro or staggered connection tier | 200 Realtime concurrent client quota |
| **500 Concurrent Users** | Scaled Target | Requires Pro Plan ($25/mo) for 500 Realtime clients | Realtime connection quota (DB pooler handles load easily) |
| **1000 Concurrent Users** | High Stress Target | Requires Pro Plan + 2GB Egress expansion | Realtime connections & 2GB egress quota |
