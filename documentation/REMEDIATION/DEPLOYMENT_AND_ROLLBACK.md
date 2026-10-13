# Deployment & Rollback Strategy

This runbook guides DevOps engineers and platform administrators through deploying the Phase 2 remediations to staging and production environments, along with emergency rollback procedures.

---

## 1. Pre-Deployment Verification Checklist

Before deploying changes, run the local verification suite:

```bash
# 1. Run all unit and regression tests
npm test

# 2. Run ESLint static analysis
npm run lint

# 3. Verify clean production bundling
npm run build

# 4. Verify no administrative secrets in generated chunks
grep -i "ADMIN_CODE" dist/assets/*.js || echo "Clean"
```

All four checks must exit with return code `0`.

---

## 2. Production Deployment Steps

### Step 2.1: Apply Database Migrations (Forward-Only)
The schema updates in `supabase/migrations/026_security_and_integrity_hardening.sql` and `supabase/migrations/027_capacity_and_realtime_optimizations.sql` must be applied to the target Supabase PostgreSQL instance:

**Option A — Supabase CLI:**
```bash
supabase db push
```

**Option B — Supabase Web Console:**
1. Navigate to your Supabase project dashboard → **SQL Editor**.
2. Run `supabase/migrations/026_security_and_integrity_hardening.sql` (if not previously applied).
3. Open or paste the full contents of `supabase/migrations/027_capacity_and_realtime_optimizations.sql`.
4. Click **Run**.
5. Confirm all 14 composite, partial, and GIN indexes are created without error.

### Step 2.2: Frontend Deployment (Netlify)
1. Commit the changes to your deployment branch (`main` or staging):
   ```bash
   git add .
   git commit -m "fix(security): resolve SEC-001, SEC-002, SEC-003, SEC-004, SEC-006, DATA-001, DATA-002"
   git push origin main
   ```
2. In Netlify dashboard:
   - Ensure environment variables do **NOT** include `VITE_ADMIN_CODE`.
   - Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured.
3. Monitor the build logs:
   - Verify `npm run build` completes cleanly.
   - Verify PWA service worker precaches static assets.

---

## 3. Post-Deployment Smoke Verification

Execute the following post-deployment checks:

1. **Public Landing & Lectures:**
   - Open `/` in an incognito window. Verify hero, features, and sample lectures render.
   - Open `/watch/:cardId` for a private lecture. Verify "Enrolled Student Access Required" is displayed with a "Sign In to Watch" button.
   - Open `/watch/:cardId` for a public lecture. Verify the video player plays normally.
2. **Student Self-Registration:**
   - Open `/register`. Verify only "Student" and "Teacher" role cards are visible.
   - Confirm there is NO "Admin" option or "Admin Invite Code" field.
   - Register a test student and verify smooth redirect to login.
3. **Batch Details Sanitization:**
   - Open `/batch-details` and verify rich text formatting renders properly without unescaped HTML or script errors.
4. **Admin Dashboard:**
   - Log in with existing administrative credentials.
   - Verify Student Tracker, Teacher Manager, Fee Manager, and Batch Manager functions load correctly.

---

## 4. Rollback Strategy

In the event of an unforeseen production regression, follow the rollback steps below.

### 4.1: Frontend Rollback
1. In Netlify Dashboard → **Deploys**.
2. Locate the previous stable deploy commit prior to this release.
3. Click **Publish Deploy**. Netlify instantly rolls back static assets globally within seconds.

### 4.2: Database Migration Rollback (If Required)

#### Reverting Migration 027 (Capacity & Realtime Indexes):
If you need to drop the capacity optimization indexes, execute the following down-migration script:
```sql
-- ── ROLLBACK MIGRATION 027 ──────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_notifications_active_created;
DROP INDEX IF EXISTS idx_notifications_target_role_batch;
DROP INDEX IF EXISTS idx_notification_reads_notif_id;
DROP INDEX IF EXISTS idx_notification_reads_user_notif;
DROP INDEX IF EXISTS idx_homework_batch_active_created;
DROP INDEX IF EXISTS idx_homework_submissions_student_hw;
DROP INDEX IF EXISTS idx_homework_submissions_hw_created;
DROP INDEX IF EXISTS idx_study_cards_batch_ids_gin;
DROP INDEX IF EXISTS idx_study_cards_active_created;
DROP INDEX IF EXISTS idx_student_profiles_batch_id;
DROP INDEX IF EXISTS idx_fee_records_month_status;
DROP INDEX IF EXISTS idx_fee_records_student_status;
DROP INDEX IF EXISTS idx_live_classes_active_created;
DROP INDEX IF EXISTS idx_messages_unread_receiver;
DROP INDEX IF EXISTS idx_attendance_student_status_date;
```

#### Reverting Migration 026 (Security & Integrity Hardening):
If you need to revert migration `026_security_and_integrity_hardening.sql`, execute the following down-migration script in the Supabase SQL Editor:

```sql
-- ── ROLLBACK MIGRATION 026 ──────────────────────────────────────────────────

-- 1. Drop integrity triggers
DROP TRIGGER IF EXISTS trg_enforce_profile_role_integrity ON public.profiles;
DROP FUNCTION IF EXISTS public.enforce_profile_role_integrity();

DROP TRIGGER IF EXISTS trg_enforce_teacher_profile_integrity ON public.teacher_profiles;
DROP FUNCTION IF EXISTS public.enforce_teacher_profile_integrity();

DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_profile_deleted();

-- 2. Restore baseline fee_records RLS policy
DROP POLICY IF EXISTS "fee_records: student insert" ON public.fee_records;
CREATE POLICY "fee_records: student insert"
  ON public.fee_records FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- 3. Restore baseline homework_submissions RLS policy
DROP POLICY IF EXISTS "submissions: student insert" ON public.homework_submissions;
CREATE POLICY "submissions: student insert"
  ON public.homework_submissions FOR INSERT
  WITH CHECK (auth.uid() = student_id);
```

> [!NOTE]
> Reverting the database triggers will re-open column updates to non-admins. Dropping indexes will increase query latency back to sequential scans. Roll back database changes only if an unexpected compatibility issue occurs, and immediately re-apply after resolving the underlying defect.
