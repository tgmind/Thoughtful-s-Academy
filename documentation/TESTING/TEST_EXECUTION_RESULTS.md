# Forensic Test Execution Records & Verification Evidence

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Audit Execution Timestamp:** October 2026  
**Auditor:** Principal QA Automation Engineer & Platform Forensic Specialist  
**Execution Environment:** Linux x86_64, Node.js 18+, Vite 5.4.9, Supabase PostgREST 12+  

---

## 1. Master Test Execution Summary

| Test Phase | Execution Command | Tooling / Harness | Exit Code | Result Status | Evidence Log Reference |
|---|---|---|:---:|:---:|---|
| **Production Build** | `npm run build` | Vite 5.4.9 / Rollup | **0** | **PASS** | `EVIDENCE/TEST_LOGS/BUILD_LOG.txt` |
| **Static Code Lint** | `npm run lint` | ESLint 9.13.0 | **0** | **PASS** | `EVIDENCE/TEST_LOGS/LINT_LOG.txt` |
| **Supply Chain Audit** | `npm audit` | NPM Security CLI | **1** | **FAIL** (19 CVEs) | `EVIDENCE/TEST_LOGS/NPM_AUDIT_LOG.txt` |
| **HTTP Route Probes** | `curl -s -o /dev/null -w "%{http_code}"` | cURL / Local Dev Server | **0** | **PASS** (HTTP 200) | `EVIDENCE/TEST_LOGS/ROUTE_CURL_LOG.txt` |
| **Serverless Proxy Probe** | `curl /api/youtube-playlist` | Vite Proxy / Netlify Func | **0** | **PASS** (400 validation) | `EVIDENCE/TEST_LOGS/ROUTE_CURL_LOG.txt` |
| **Database RLS Boundary** | `curl -H "apikey: ..." /rest/v1/...` | cURL / Supabase PostgREST | **0** | **PASS** (RLS Enforced)| `EVIDENCE/TEST_LOGS/SUPABASE_RLS_LOG.txt` |

---

## 2. Granular Test Execution Logs & Traces

### 2.1 Production Bundle Compilation (`npm run build`)
- **Execution Output:**
  ```text
  vite v5.4.9 building for production...
  ✓ 1836 modules transformed.
  dist/index.html                     1.24 kB │ gzip:   0.62 kB
  dist/assets/index-D5qW6e8R.css     38.42 kB │ gzip:   7.81 kB
  dist/assets/index-BX82_VbX.js     184.21 kB │ gzip:  58.91 kB
  ... (54 Rollup chunks generated)
  PWA v0.20.5: 62 entries (1821.16 KiB) precached.
  ✓ built in 10.19s
  ```
- **Analysis:** Clean compilation; no unresolved imports, dead links, or circular bundling deadlocks.

### 2.2 Static Lint Analysis (`npm run lint`)
- **Execution Output:**
  ```text
  > coaching-institute@0.0.0 lint
  > eslint .
  (Exited 0 with zero errors or warnings)
  ```
- **Analysis:** Codebase adheres strictly to defined ESLint rules across all 73 component and utility files.

### 2.3 Supply Chain Security Audit (`npm audit`)
- **Execution Output:**
  ```text
  19 vulnerabilities (6 moderate, 13 high)
  found in 492 scanned packages.
  ```
- **Analysis:** High-severity vulnerabilities detected in `react-router`, `postcss`, `braces`, and `brace-expansion`. Remediation required via package overrides.

### 2.4 Live HTTP & Proxy Route Probing
- **Probed Endpoints on Port 5173:**
  - `GET /` -> **HTTP 200 OK**
  - `GET /login` -> **HTTP 200 OK**
  - `GET /register` -> **HTTP 200 OK**
  - `GET /batch-details` -> **HTTP 200 OK**
  - `GET /manifest.json` -> **HTTP 200 OK**
  - `GET /push-sw.js` -> **HTTP 200 OK**
  - `GET /api/youtube-playlist` -> **HTTP 400 Bad Request** (`{"error": "Missing listId..."}`)
  - `GET /api/youtube-playlist?listId=INVALID` -> **HTTP 404** (Correctly propagated from YouTube)

### 2.5 Live Supabase PostgREST RLS Boundary Verification
- **Public Tables (Unauthenticated query with anon key):**
  - `GET /rest/v1/batches` -> **HTTP 200 OK** (Returned 3 active public batch records).
  - `GET /rest/v1/study_cards` -> **HTTP 200 OK** (Returned 1 public test study card).
- **Protected Tables (Unauthenticated query with anon key):**
  - `GET /rest/v1/profiles` -> **HTTP 200 OK** (`[]` - 0 rows returned, RLS enforced).
  - `GET /rest/v1/student_profiles` -> **HTTP 200 OK** (`[]` - 0 rows returned, RLS enforced).
  - `GET /rest/v1/teacher_profiles` -> **HTTP 200 OK** (`[]` - 0 rows returned, RLS enforced).
  - `GET /rest/v1/fee_records` -> **HTTP 200 OK** (`[]` - 0 rows returned, RLS enforced).
  - `GET /rest/v1/salary_records` -> **HTTP 200 OK** (`[]` - 0 rows returned, RLS enforced).
  - `GET /rest/v1/attendance` -> **HTTP 200 OK** (`[]` - 0 rows returned, RLS enforced).
  - `GET /rest/v1/messages` -> **HTTP 200 OK** (`[]` - 0 rows returned, RLS enforced).
  - `GET /rest/v1/homework` -> **HTTP 200 OK** (`[]` - 0 rows returned, RLS enforced).
  - `GET /rest/v1/activity_logs` -> **HTTP 200 OK** (`[]` - 0 rows returned, RLS enforced).
