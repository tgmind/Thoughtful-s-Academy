# System Bottleneck Analysis & Performance Profiling

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Lead Auditor:** Principal Performance & Scalability Engineer  
**Scope:** Client Virtual DOM, Network Ingestion, API Gateway, and Database Query Contention  

---

## 1. Master Bottleneck Register

| Bottleneck ID | Layer | Root Cause | Impact | Severity |
|---|---|---|---|:---:|
| `BN-001` | **Database** | Missing Secondary Indexes on `batch_id` foreign keys | Full table sequential scans on every curriculum load | **HIGH** |
| `BN-002` | **Frontend** | Monolithic DOM trees without list virtualization | Mobile browser memory bloat and scroll stutter in Study Section | **HIGH** |
| `BN-003` | **Network / Client**| Absence of React Query / Global Data Caching | Redundant PostgREST network calls on every route transition | **MEDIUM** |
| `BN-004` | **Database** | `handle_new_user()` roll number sequence locking | Transaction latency spikes during concurrent batch signups | **MEDIUM** |
| `BN-005` | **Client Video UI** | Watermark Canvas & Chat State in Same Component | Re-rendering doubt typing triggers unnecessary canvas redraws | **MEDIUM** |

---

## 2. In-Depth Bottleneck Profiling

### 2.1 Database Sequential Scan Bottleneck (`BN-001`)
- **Query Pattern:**
  ```javascript
  supabase.from('study_cards').select('*').eq('batch_id', activeBatchId).order('created_at', { ascending: false })
  ```
- **Execution Plan:** In the absence of an index on `(batch_id, created_at DESC)`, PostgreSQL performs a **Filter on Seq Scan**.
- **Impact at Scale:** As the institute adds hundreds of lecture cards across academic sessions, query latency scales linearly ($O(N)$), consuming database CPU and memory buffers.
- **Resolution:** Deploy composite index `idx_study_cards_batch_created`.

### 2.2 Client-Side DOM Bloat in Teacher Studio (`BN-002`)
- **Location:** `src/pages/teacher/StudySection.jsx` (1,948 LOC).
- **Issue:** The component renders the complete batch curriculum (all subjects, chapters, cards, notes, and 4 inlined modals) inside a single unvirtualized React tree.
- **Impact:** Memory allocation exceeds 120 MB on low-end Android mobile devices, leading to frame drops during drag-and-drop or card accordion expansions.
- **Resolution:** Implement `@tanstack/react-virtual` to render only cards currently in the viewport.

### 2.3 Redundant Network Fetching (`BN-003`)
- **Observation:** `batches` metadata is independently fetched across `StudentDashboard`, `StudySection`, `Attendance`, and `DashboardShell` without shared memory caching.
- **Resolution:** Wrap data fetching in **TanStack React Query** with `staleTime: 5 * 60 * 1000` (5-minute cache).
