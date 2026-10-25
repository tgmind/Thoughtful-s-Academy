# Codebase Health & Static Analysis Report

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Lead Auditor:** Principal Software Architect & QA Automation Engineer  
**Static Linter:** ESLint 9.13.0 with `@eslint/js` & `eslint-plugin-react-hooks`  
**Total Source Lines of Code:** 25,284 LOC across 73 UI components + utilities  

---

## 1. Executive Code Quality Scorecard

| Health Metric | Measurement / Value | Target Benchmark | Grade / Evaluation |
|---|:---:|:---:|:---:|
| **Lint Adherence** | **0 Errors, 0 Warnings** | 0 Violations | **A+ (EXCELLENT)** |
| **Build Stability** | Exited 0 in 10.19s | Exited 0 (< 30s) | **A (EXCELLENT)** |
| **Component Modularization**| 8 Files > 700 LOC | Max 300 LOC / file | **D (UNSATISFACTORY)** |
| **Automated Test Coverage** | **0.00%** | > 80.00% | **F (CRITICAL DEFICIT)**|
| **Dependency Hygiene** | 19 Active CVEs | 0 Active CVEs | **C (NEEDS WORK)** |
| **Type Safety** | Pure JavaScript (No TS) | TypeScript Strict | **C (DYNAMIC RISK)** |
| **Overall Codebase Health** | **71 / 100** | > 85 / 100 | **MODERATE** |

---

## 2. Code Smells & Architectural Anti-Patterns

### 2.1 The "God Component" Anti-Pattern
Six components exceed 1,000 lines of code:
- `TeacherStudySection.jsx` (1,948 LOC)
- `ProtectedVideoPlayer.jsx` (1,607 LOC)
- `StudentDashboard.jsx` (1,391 LOC)
- `StudentStudySection.jsx` (1,190 LOC)
- `Home.jsx` (1,066 LOC)
- `WatchLecture.jsx` (1,007 LOC)
- **Problem:** These files manage local state, Supabase queries, Realtime subscriptions, complex business logic, and UI markup in a single scope. Modifying a modal in `TeacherStudySection` risks triggering regressions across unrelated card ordering features.

### 2.2 Duplicated Query Logic
Identical PostgREST query calls (`supabase.from('batches').select('*')` and `supabase.from('profiles').select('*')`) are duplicated across more than 12 independent page components rather than being centralized into custom React hooks.

### 2.3 Untyped Database Payloads
The codebase is authored in standard JSX/JavaScript (`.jsx`). Supabase client calls do not utilize auto-generated TypeScript schema types (`supabase gen types typescript`). As a consequence:
- Typos in table column names (e.g. `roll_no` vs `roll_number`) fail only at runtime rather than at compile time.
- Refactoring database columns provides no automated compiler safety across UI views.
