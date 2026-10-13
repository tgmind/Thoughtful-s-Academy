# Capacity Limits, Graceful Degradation & Scale Recommendations

**Platform:** Thoughtful's Academy / Coaching Institute  
**Category:** Operational Engineering & Future Scaling Strategy  
**Date:** 2026-10-13  
**Target:** Long-term Stability, Quota Protection, and Graceful Degradation  

---

## 1. Validated Operational Envelope

Based on code-level optimizations, database indexing, and capacity modeling:

| Tier | Concurrent Users | Daily Active Users | Monthly Active Users | Free Tier Compatibility | Recommended Plan |
|---|---|---|---|---|---|
| **Tier 1** | Up to 100 users | Up to 500 DAU | Up to 2,500 MAU | **100% Free Tier** | Supabase Free + Netlify Free |
| **Tier 2** | Up to 200 users | Up to 1,500 DAU | Up to 10,000 MAU | **100% Free Tier (Ceiling)** | Supabase Free + Netlify Free |
| **Tier 3** | 200 to 500 users | Up to 3,500 DAU | Up to 25,000 MAU | **Requires Realtime Upgrade** | Supabase Pro ($25/mo) + Netlify Free |
| **Tier 4** | 500 to 1,000 users| Up to 7,500 DAU | Up to 50,000 MAU | **Requires Pro Tier** | Supabase Pro ($25/mo) + Netlify Pro ($19/mo optional) |

---

## 2. Graceful Degradation & Quota Failure Modes

### 2.1 The 200 Realtime Client Quota Ceiling
On the Supabase Free Tier, the Realtime server enforces a hard limit of 200 concurrent WebSocket connections.
- **What occurs at 201+ connections:** The 201st client attempting `supabase.channel(...).subscribe()` will experience a socket connection drop or handshake error.
- **Existing Client Behavior:** The client triggers Supabase's built-in exponential reconnect loop (`1s, 2s, 5s, 10s`).
- **Recommended User-Facing Circuit Breaker:**
  If the WebSocket connection fails repeatedly (e.g. 3 consecutive retries fail with `CHANNEL_ERROR` or `TIMED_OUT`), the frontend should gracefully transition to a "Quiet Mode":
  1. Display a subtle non-blocking indicator: `"Live updates temporarily paused due to high server load. Click here to check for updates."`
  2. Suspend aggressive WebSocket reconnect attempts for 60 seconds to avoid exacerbating server load.
  3. Allow standard manual navigation (which continues to function seamlessly via PostgREST HTTP queries).

### 2.2 Database Storage Soft & Hard Limits (500 MB)
If the database exceeds 500 MB, Supabase places the project into **read-only mode**, preventing new student registrations, attendance checks, and homework submissions.
- **Monitoring Trigger:** Administrators should review database size monthly in Supabase Dashboard → **Project Settings** → **Database** → **Usage**.
- **Alert Threshold:** Trigger archival or cleanup when database reaches **350 MB** (70% capacity).
- **Primary Data Accumulators:**
  1. `attendance` table: Accumulates ~250 records per student per academic year.
  2. `homework_submissions`: Accumulates metadata records.
- **Mitigation:** Run an annual archival job to export past academic year attendance to cold storage (CSV in Google Drive) and purge records older than 2 academic cycles.

---

## 3. Strict Rules for Preserving Free-Tier Efficiency

To maintain this high-capacity posture, development and administrative teams must strictly adhere to the following architectural rules:

1. **Rule 1: External Media Exemption (No Video in Database or Supabase Storage)**
   - All lecture video streams **must remain hosted on YouTube** (as unlisted videos) and embedded via `WatchLecture.jsx`.
   - All supplementary PDF notes and worksheets **must remain stored in Google Drive** with preview/download URLs stored in `study_cards`.
   - Storing video files directly in Supabase Storage would exhaust the 1 GB storage and 2 GB egress limits within hours.

2. **Rule 2: Never Re-introduce Monolithic Sync Handlers**
   - When adding new tables or features to the `StudentDashboard`, developers must create **isolated, debounced sync handlers** for the new entity.
   - Never call `fetchDashboardData()` from a WebSocket event listener.

3. **Rule 3: Enforce Channel Multiplexing**
   - New global UI components (e.g. chat widgets, live class alerts) must attach their listeners to the existing multiplexed user channel (`popup_channel_${user.id}`) rather than opening a new standalone channel.

4. **Rule 4: Always Use PostgREST / Supavisor Port 6543 for External Tools**
   - If connecting external analytics tools, BI dashboards, or backend scripts to PostgreSQL, always connect through port `6543` (Transaction Mode) rather than port `5432` (Session Mode) to prevent exhausting physical database process connections.

---

## 4. Upgrade Roadmap: When & How to Scale to Supabase Pro

### Trigger for Upgrade
Upgrade to Supabase Pro when:
- Peak simultaneous online student count routinely exceeds **175 active students**.
- Database storage approaches **400 MB**.
- Monthly egress approaches **1.7 GB**.

### Upgrade Benefits ($25/Month)
- **Realtime Connections:** Increases from 200 to **500 concurrent connections** (with ability to scale to thousands via compute add-ons).
- **Database Storage:** Increases from 500 MB to **8 GB** included.
- **Data Egress:** Increases from 2 GB to **250 GB / month** included.
- **Database Compute:** Dedicated compute resources, daily automated backups, and 7-day point-in-time recovery (PITR).

### Seamless Migration Path
Upgrading to Pro requires **zero code changes, zero downtime, and zero DNS reconfigurations**. The upgrade is toggled directly within the Supabase management console under **Project Settings** → **Billing** → **Change Plan**.
