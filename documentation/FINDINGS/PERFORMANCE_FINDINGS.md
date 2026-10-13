# Performance Findings & Scalability Bottlenecks

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Total Documented Performance Findings:** 5 Findings (`PERF-001` through `PERF-005`)  

---

## 1. Master Performance Findings Summary

| Finding ID | Severity | Category | Component | Description & Impact |
|---|:---:|---|---|---|
| `PERF-001` | **P2 Medium** | Database Indexing | PostgreSQL Tables | Missing B-Tree indexes on foreign keys cause sequential scans |
| `PERF-002` | **P2 Medium** | DOM / Virtualization| `TeacherStudySection.jsx` | 1,000+ unvirtualized DOM nodes cause memory bloat on mobile |
| `PERF-003` | **P2 Medium** | Client Caching | Multiple Pages | Absence of TanStack Query causes duplicate network requests |
| `PERF-004` | **P2 Medium** | React State | `ProtectedVideoPlayer.jsx` | Doubt chat input re-renders canvas watermark animation loop |
| `PERF-005` | **P2 Medium** | Connection Pooling | PostgREST / Supavisor | 200 connection limit vulnerable to morning attendance check-in spikes |

---

## 2. Granular Profiles & Optimizations

### 2.1 `PERF-001`: Missing Foreign Key Indexes
- **Impact:** Slow queries on `student_profiles`, `study_cards`, and `fee_records` when filtering by `batch_id`.
- **Fix:** Deploy `025_add_performance_indexes.sql`.

### 2.2 `PERF-002`: Unvirtualized Curriculum DOM
- **Impact:** Scroll stuttering and 120+ MB RAM usage on mobile devices when opening large chapters.
- **Fix:** Implement `@tanstack/react-virtual` to mount only visible cards.

### 2.3 `PERF-004`: Video Watermark Canvas Re-renders
- **Impact:** Typing a doubt in the video sidebar re-renders the parent player component, causing micro-stutter in the dynamic watermarking animation loop.
- **Fix:** Extract doubt messaging panel into an isolated memoized subcomponent (`React.memo`).
