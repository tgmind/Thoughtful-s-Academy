# Engineering Team Handover & Onboarding Guide

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Lead Architect:** Principal Software Architect  
**Audience:** Incoming Engineering Team, DevOps Engineers & Maintainers  

---

## 1. Quick Technical Orientation

Graviton Academy is a modern, serverless EdTech platform designed for coaching institutes:
- **Frontend Architecture:** React 18 SPA bundled via Vite 5.4.9, styled with Tailwind CSS 3.4.14, and animated with Framer Motion.
- **Backend Architecture:** BaaS model using Supabase PostgREST for data access, Supabase GoTrue for JWT authentication, and Phoenix Channels for real-time WebSocket updates.
- **Serverless Compute:** Netlify serverless proxy (`youtube-playlist.js`) and Deno Edge function (`send-push.ts`).
- **Media Engine:** YouTube unlisted embeds protected by client-side dynamic canvas watermarking and Google Drive CDN asset resolution.

---

## 2. Directory Navigation & Mental Model

```text
src/
├── components/
│   ├── analytics/        # SVG Attendance and Fee charts
│   ├── layout/           # DashboardShell.jsx (unified multi-role layout)
│   ├── shared/           # ProtectedVideoPlayer, ActivityLogModal, PushBanner
│   └── ui/               # CustomSelect, Skeleton loaders
├── context/              # AuthContext.jsx (session, profile, role state)
├── hooks/                # useNavBadges.js, useRealtime.js
├── lib/                  # supabase.js, constants.js, activityLogger.js
├── pages/
│   ├── admin/            # 13 administrative console pages
│   ├── student/          # 10 student portal pages
│   └── teacher/          # 10 faculty portal pages
└── utils/                # youtube.js, formatters.js, push.js, roleGuard.jsx
```

---

## 3. Golden Rules & Invariants for Developers

1. **Never Disable RLS:** Every table in PostgreSQL must have Row Level Security enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`). Never execute queries using the `service_role` key from client-side code.
2. **Never Commit Secrets:** The frontend environment (`.env`) must strictly contain `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never add private service role keys or database passwords to client bundles.
3. **Always Run Release Verification:**
   Before submitting a pull request, run:
   ```bash
   npm run lint && npm run build
   ```
   Both commands must exit cleanly with code 0.
4. **Idempotent SQL Migrations:** All new database migrations added to `supabase/migrations/` must be idempotent (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS ... CREATE POLICY`).
