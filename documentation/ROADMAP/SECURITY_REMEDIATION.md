# Security Remediation Playbook & Code Fixes

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Lead Security Engineer:** Principal Cybersecurity Auditor  
**Scope:** Ready-to-apply SQL migration scripts and frontend code patches for `SEC-001` through `SEC-007`.  

---

## 1. Remediation Patch for `SEC-001` & `SEC-003` (`025_security_hardening.sql`)

Execute the following migration in Supabase to eliminate client role injection and unconstrained column updates:

```sql
-- ============================================================
-- 025_security_hardening.sql
-- Fixes SEC-001 (Client role injection) and SEC-003 (Unconstrained updates)
-- ============================================================

-- 1. Patch handle_new_user() to disallow client-supplied admin role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta          JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role        TEXT  := 'student'; -- Enforce immutable student role for public signups!
  v_full_name   TEXT  := COALESCE(NULLIF(meta->>'full_name', ''), split_part(NEW.email, '@', 1));
  v_subjects    TEXT[];
  v_batch_id    UUID;
  v_seq         INT;
  v_year        TEXT;
  v_batch_pref  TEXT;
  v_roll_number TEXT := NULL;
BEGIN
  -- Insert base profile strictly with student role
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (NEW.id, v_full_name, NEW.email, NULLIF(meta->>'phone', ''), v_role)
  ON CONFLICT (id) DO NOTHING;

  SELECT COALESCE(array_agg(value), '{}')
    INTO v_subjects
    FROM jsonb_array_elements_text(COALESCE(meta->'subjects', '[]'::jsonb)) AS value;

  v_batch_id := NULLIF(meta->>'batch_id', '')::uuid;

  IF v_batch_id IS NOT NULL THEN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    SELECT UPPER(SUBSTRING(REPLACE(name, ' ', ''), 1, 3)) INTO v_batch_pref
    FROM public.batches WHERE id = v_batch_id;

    SELECT COUNT(*) + 1 INTO v_seq
    FROM public.student_profiles WHERE batch_id = v_batch_id;

    v_roll_number := v_year || '-' || COALESCE(v_batch_pref, 'B') || '-' || LPAD(v_seq::text, 3, '0');
  END IF;

  INSERT INTO public.student_profiles (id, batch_id, roll_number, parent_phone, date_of_birth, subjects)
  VALUES (
    NEW.id,
    v_batch_id,
    v_roll_number,
    NULLIF(meta->>'parent_phone', ''),
    NULLIF(meta->>'date_of_birth', '')::date,
    v_subjects
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Deploy column protection triggers for profiles (Fixes SEC-003)
CREATE OR REPLACE FUNCTION protect_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role <> OLD.role AND NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized attempt to modify role column.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_columns();

-- 3. Deploy column protection triggers for teacher_profiles (Fixes SEC-003)
CREATE OR REPLACE FUNCTION protect_teacher_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.salary_amount <> OLD.salary_amount OR
      NEW.can_manage_study_cards <> OLD.can_manage_study_cards OR
      NEW.can_view_fee_records <> OLD.can_view_fee_records) AND NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized attempt to alter faculty compensation or permissions.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_teacher_profile_columns ON public.teacher_profiles;
CREATE TRIGGER trg_protect_teacher_profile_columns
  BEFORE UPDATE ON public.teacher_profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_teacher_profile_columns();
```

---

## 2. Frontend Remediation Patches

### 2.1 Patch for `SEC-002` (Stored XSS in `BatchDetails.jsx`)
```bash
npm install dompurify
```

In `src/pages/BatchDetails.jsx`:
```jsx
// Line 12: Add import
import DOMPurify from 'dompurify'

// Line 532: Replace vulnerable rendering
<div 
  className="prose max-w-none text-slate-700"
  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeBatch.detailed_info) }} 
/>
```

### 2.2 Patch for `SEC-006` / `BUG-001` (Protected Video Route in `App.jsx`)
In `src/App.jsx` line 92:
```jsx
// Before:
<Route path="/watch/:cardId" element={<WatchLecture />} />

// After:
<Route element={<RoleRoute allowedRoles={['student', 'teacher', 'admin']} />}>
  <Route path="/watch/:cardId" element={<WatchLecture />} />
</Route>
```

### 2.3 Patch for `SEC-007` (NPM Dependency Vulnerabilities)
In `package.json`, add overrides:
```json
"overrides": {
  "braces": "^3.0.3",
  "brace-expansion": "^2.0.1",
  "postcss": "^8.4.47"
}
```
Run `npm update react-router-dom vite` and `npm audit`.
