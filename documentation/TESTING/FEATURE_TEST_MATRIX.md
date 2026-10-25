# Feature Test Matrix & Verification Coverage Mapping

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Scope:** Complete QA test case mapping across all 22 cataloged platform features (`FEAT-001` through `FEAT-022`).  

---

## 1. Master Feature QA Verification Matrix

| Feature ID | Feature Name | Critical Test Types | Test Case ID | Key Assertion Points / Test Invariants | Priority |
|---|---|---|---|---|:---:|
| `FEAT-001` | Public Marketing & Landing | Unit, E2E | `TC-001-A` | Course cards render correctly; CTA redirects to registration | P2 |
| `FEAT-002` | User Registration & Roll No | Integration, Security | `TC-002-A` | `handle_new_user()` generates formatted Roll No; client admin role rejected | **P0** |
| `FEAT-003` | Authentication & JWT Session | Integration, Unit | `TC-003-A` | Valid credentials issue JWT; session persists on refresh | **P0** |
| `FEAT-004` | Role-Based Access Control | Integration, Security | `TC-004-A` | Students blocked from `/admin/*`; RLS policies deny unauthorized writes | **P0** |
| `FEAT-005` | Student Command Center | Unit, Integration | `TC-005-A` | Resume lecture progress loads; active streak counter calculates properly | P1 |
| `FEAT-006` | Curriculum Explorer | Unit, Integration | `TC-006-A` | Chapters and study cards filter by subject; completed cards display badge | P1 |
| `FEAT-007` | Protected Video Player | Unit, E2E | `TC-007-A` | Dynamic watermark canvas animates; 90% watch fires completion trigger | **P0** |
| `FEAT-008` | In-Video Timestamped Doubts | Integration | `TC-008-A` | Doubt posts with video current timestamp; teacher reply updates thread | P1 |
| `FEAT-009` | Live Broadcast & Audio Chime | Integration, E2E | `TC-009-A` | WebSocket broadcasts stream start; synthetic 880Hz audio tone plays | P1 |
| `FEAT-010` | Student Attendance Heatmap | Unit, Integration | `TC-010-A` | Monthly calendar highlights present/absent dates; leave requests post | P1 |
| `FEAT-011` | Student Homework Submissions| Integration | `TC-011-A` | File link attaches properly; submission updates status to submitted | P1 |
| `FEAT-012` | Offline UPI Fee Payment | Integration, Security | `TC-012-A` | Exactly 12-digit UTR accepted; pending record created for admin review | **P0** |
| `FEAT-013` | 1-on-1 Student-Faculty Chat | Integration, Realtime| `TC-013-A` | Chat messages synchronize via WebSocket; unread counter increments | P1 |
| `FEAT-014` | Faculty Command Center | Unit, Integration | `TC-014-A` | Batch schedule renders; pending doubt count displays accurately | P1 |
| `FEAT-015` | Faculty Curriculum Studio | E2E, Integration | `TC-015-A` | Adding chapter updates hierarchy; study card creation saves YouTube ID | **P0** |
| `FEAT-016` | YouTube Playlist Auto-Sync | Integration, Proxy | `TC-016-A` | Netlify proxy returns parsed XML; cards bulk created without duplicates | P1 |
| `FEAT-017` | Faculty Live Stream Studio | Integration | `TC-017-A` | Teacher with `can_drop_live_class` initializes stream row | P1 |
| `FEAT-018` | Faculty Homework Evaluation | Integration | `TC-018-A` | Teacher grades student submission; grade and feedback persist | P1 |
| `FEAT-019` | Admin Institute KPI Dashboard | Unit, Integration | `TC-019-A` | Total student headcount, revenue aggregate, and batch metrics compute | P1 |
| `FEAT-020` | Admin Fee Reconciliation | Integration, E2E | `TC-020-A` | Admin approves UTR; student fee status updates; rejection requires note | **P0** |
| `FEAT-021` | Admin Faculty Payroll | Integration | `TC-021-A` | Monthly salary slip calculates base + bonus - deductions; paid state locks | P1 |
| `FEAT-022` | Web Push Alerts & Broadcasts| Integration, Edge | `TC-022-A` | Deno edge function resolves batch recipients; VAPID delivers push alert | P1 |

---

## 2. Test Execution Priority Classification

1. **Tier 1 (P0 - Security & Financial Gates):** `TC-002-A` (Role assignment), `TC-004-A` (RBAC), `TC-007-A` (Video gating), `TC-012-A` (Fee submissions), `TC-020-A` (Fee reconciliation).
2. **Tier 2 (P1 - Core Academic Workflows):** `TC-006-A` (Curriculum), `TC-009-A` (Live streaming), `TC-010-A` (Attendance), `TC-013-A` (Chat messaging), `TC-015-A` (Curriculum studio).
3. **Tier 3 (P2 - Informational & Landing):** `TC-001-A` (Landing UI), `TC-019-A` (Analytics rendering).
