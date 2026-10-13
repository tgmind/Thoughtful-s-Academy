# Remaining Technical Risks & Architectural Recommendations

While all critical and high-priority findings confirmed in Phase 2 have been remediated in source code, migrations, and local tests, this document details remaining operational and technical risks, compensating controls, and recommended next steps for production deployment.

---

## 1. Remote Database Migration Execution Requirement

- **Risk:**
  The forward-only database migration `supabase/migrations/026_security_and_integrity_hardening.sql` is authored and committed to the repository, but must be applied to the remote Supabase project database (`lrjjmpdoohllnohoccvf.supabase.co`) via `supabase db push` or the Supabase SQL Editor.
- **Impact if Unapplied:**
  If the application is deployed while the remote database has not executed migration 026, the PostgreSQL triggers enforcing role and salary immutability will not be active on the database engine level, leaving the backend reliant on client-side constraints.
- **Compensating Control:**
  Client-side changes in `Register.jsx` enforce that only `'student'` or `'teacher'` are submitted, and `VITE_ADMIN_CODE` has been stripped from the bundles.
- **Remediation Action Required:**
  Apply `026_security_and_integrity_hardening.sql` to the production database before opening public traffic.

---

## 2. Content Security Policy (CSP) & Defense-in-Depth

- **Risk:**
  While `DOMPurify` effectively sanitizes batch descriptions rendered via `dangerouslySetInnerHTML`, the application's Netlify/HTML headers do not yet enforce a strict Content Security Policy (`script-src 'self'`).
- **Potential Attack Vector:**
  If future developers introduce unsanitized markup elsewhere in the application, a strict CSP acts as an essential secondary defense barrier preventing unauthorized script execution.
- **Compensating Control:**
  All instances of `dangerouslySetInnerHTML` in the repository have been inspected; only `BatchDetails.jsx` uses it, and it is guarded by `DOMPurify`.
- **Recommendation:**
  Add a strict `Content-Security-Policy` header in `netlify.toml` allowing only trusted domains for scripts, styles, and media embeds (e.g., YouTube iframes, Google Drive previews).

---

## 3. Rate Limiting on Authentication Endpoints

- **Risk:**
  Authentication and password reset endpoints rely on Supabase Auth default rate limits. Attackers could attempt brute-force credential stuffing or spam password reset emails.
- **Compensating Control:**
  Supabase Auth includes IP-based rate limiting on `auth.signUp` (typically 30 signups per hour per IP) and password reset emails (typically 3 emails per 15 minutes per IP).
- **Recommendation:**
  Configure custom rate limits or Cloudflare Turnstile / reCAPTCHA on the public `Login.jsx` and `Register.jsx` forms for high-scale enterprise deployments.

---

## 4. YouTube API Quota Management & Playlist Syncing

- **Risk:**
  The platform utilizes a dev-proxy / Netlify function to scrape or query YouTube RSS feeds (`/api/youtube-playlist`). If YouTube changes RSS feed formatting or imposes strict IP-based rate limiting, playlist title hydration may fall back to default `Lecture #1, Lecture #2` labels.
- **Compensating Control:**
  In-app `ProtectedVideoPlayer` dynamically updates video titles during playback when the YouTube iframe player fires its `onReady` and `onStateChange` events, providing local self-healing hydration.
- **Recommendation:**
  Provide an optional server-side YouTube Data API v3 key with a Redis cache layer for high-volume automated playlist synchronization.

---

## 5. Web Push Notification Private Key Hygiene

- **Risk:**
  `VITE_VAPID_PUBLIC_KEY` is present in `.env.local` as an empty placeholder. The corresponding VAPID private key must never be added to frontend code or `.env.local`.
- **Compensating Control:**
  Documentation and `.env.local` explicitly warn against committing private keys.
- **Recommendation:**
  Store the VAPID private key strictly within Supabase Edge Function secrets (`supabase secrets set VAPID_PRIVATE_KEY=...`).
