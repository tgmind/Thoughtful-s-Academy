# Operational Runbook & Site Reliability Procedures

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Target Audience:** Institute DevOps Engineers, Technical Administrators & SREs  

---

## 1. Procedure 01: Deploying a New Database Migration Safely

1. **Author Migration File:** Create `supabase/migrations/025_<feature_name>.sql` using `IF NOT EXISTS` on tables/columns and `DROP POLICY IF EXISTS ... CREATE POLICY` on RLS policies.
2. **Local Smoke Verification:** Test DDL syntax locally against a staging database.
3. **Execute via Supabase Dashboard SQL Editor:**
   - Open Supabase Project -> **SQL Editor** -> **New query**.
   - Paste the SQL script and execute.
4. **Assert Table Grants & RLS:**
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
   ```
   Verify that `rowsecurity = true` for all tables.

---

## 2. Procedure 02: Resolving Student "Permission Denied" (RLS 403) Reports

When a student reports being unable to view lecture cards or submit homework:
1. **Identify User UUID & Role:**
   Query `public.profiles` by student email:
   ```sql
   SELECT id, full_name, role, is_active FROM public.profiles WHERE email = 'student@example.com';
   ```
2. **Check Batch Enrollment:**
   Query `public.student_profiles` to verify `batch_id`:
   ```sql
   SELECT id, batch_id, roll_number, is_trial, trial_ends_at FROM public.student_profiles WHERE id = '<student-uuid>';
   ```
3. **Common Causes & Quick Fixes:**
   - *Cause A:* Student has no `batch_id` assigned -> Admin assigns student to batch via Student Tracker (`/admin/students`).
   - *Cause B:* Free trial expired (`trial_ends_at < NOW()`) -> Admin extends trial or clears pending fee.
   - *Cause C:* Account suspended (`is_active = false`) -> Toggle `is_active` back to `true`.

---

## 3. Procedure 03: Rotating Web Push VAPID Encryption Keys

If VAPID keys are compromised or need scheduled rotation:
1. **Generate New VAPID Keypair:**
   ```bash
   npx web-push generate-vapid-keys
   ```
2. **Update Supabase Edge Secrets:**
   ```bash
   supabase secrets set      VAPID_PUBLIC_KEY="<new-public-key>"      VAPID_PRIVATE_KEY="<new-private-key>"
   ```
3. **Prune Stale Subscriptions:**
   Because client browsers encrypted their push endpoints with the old public key, existing subscriptions must be pruned to force clients to re-subscribe:
   ```sql
   DELETE FROM public.push_subscriptions;
   ```
   Active users will automatically re-register upon their next visit via `useNavBadges.js` / `syncPush()`.

---

## 4. Procedure 04: Troubleshooting YouTube Playlist Sync Failures

When a faculty member reports "Failed to import YouTube playlist":
1. **Test Proxy Health:**
   ```bash
   curl -i "https://<your-domain>/api/youtube-playlist?listId=<playlist-id>"
   ```
2. **Check Status Code:**
   - If HTTP 400: Verify playlist ID starts with `PL`.
   - If HTTP 404: The YouTube playlist is set to **Private** (must be set to **Unlisted** or **Public** on YouTube).
   - If HTTP 500: Check Netlify Function execution logs for XML parsing errors.
