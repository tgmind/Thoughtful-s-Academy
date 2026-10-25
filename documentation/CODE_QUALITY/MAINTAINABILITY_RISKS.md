# Long-Term Maintainability & Engineering Fragility Risks

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Lead Auditor:** Principal Software Architect  
**Maintainability Index Score:** 62 / 100 (High Risk of Engineering Slowdown as Team Grows)  

---

## 1. Master Maintainability Risk Matrix

| Risk ID | Category | Root Cause | Engineering Impact | Severity |
|---|---|---|---|:---:|
| `MAINT-001` | **Cognitive Load** | Megalithic components (>1,000 LOC) housing UI, fetch, and logic | New engineers take 3-5x longer to safely locate and patch bugs | **HIGH** |
| `MAINT-002` | **Type Fragility** | Pure JavaScript without Supabase TypeScript definitions | Column typos or schema alterations fail silently at runtime | **HIGH** |
| `MAINT-003` | **Refactoring Fear**| 0.00% automated test coverage | Developers avoid refactoring complex modules due to regression fear | **CRITICAL** |
| `MAINT-004` | **Architecture Lock**| Direct browser-to-PostgREST coupling across 37 pages | Introducing custom business logic requires duplicating SQL policies | **MEDIUM** |
| `MAINT-005` | **State Fragmentation**| Dozens of scattered `useState` hooks without global store | Synchronizing badge counters and real-time state causes prop drilling | **MEDIUM** |

---

## 2. In-Depth Engineering Fragility Profiles

### 2.1 The "Refactoring Fear" Trap (`MAINT-003`)
- Because the platform has zero unit or integration tests, any major modification (e.g., refactoring `ProtectedVideoPlayer.jsx` to optimize canvas watermarking) requires manual QA verification across every possible edge case (fullscreen mode, doubt submission, speed changes, completion triggers).
- **Consequence:** Teams tend to accumulate technical debt by appending "quick fixes" rather than cleaning underlying architectures, causing codebase entropy over time.

### 2.2 Direct PostgREST Coupling vs Clean Architecture (`MAINT-004`)
- Currently, UI components execute database queries directly:
  ```jsx
  const { data } = await supabase.from('batches').select('*, teacher_profiles(*)')...
  ```
- **Consequence:** Database schema changes ripple directly through to presentation components. There is no repository layer or API abstraction layer to buffer UI components from database migrations.
- **Target Target:** Introduce a lightweight API service layer (`src/services/batchService.js`, `src/services/curriculumService.js`) returning typed domain models.
