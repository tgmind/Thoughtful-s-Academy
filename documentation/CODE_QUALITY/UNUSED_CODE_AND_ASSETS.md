# Unused Code, Dead Assets & Redundancy Audit

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Lead Auditor:** Senior Full-Stack Engineer & Refactoring Specialist  

---

## 1. Identified Dead Code & Redundant Components

| Item / File Path | LOC / Size | Category | Redundancy Assessment | Recommended Action |
|---|:---:|---|---|---|
| `src/pages/Dashboards.jsx` | 31 LOC | Router Wrapper | Trivial redirect component evaluating `profile?.role` and forwarding | Inline into `App.jsx` using declarative `<Navigate to={...} />` |
| `src/utils/studyHelpers.js` | 114 LOC | Utilities | Several helper functions (`groupCardsByChapter`, `filterPublished`) are duplicated inside `TeacherStudySection.jsx` | Consolidate and import from `studyHelpers.js` |
| Scalar columns `teacher_id` & `batch_id` | Database Schema | SQL Columns | Legacy scalar columns made obsolete by `teacher_ids` and `batch_ids` arrays | Deprecate and drop scalar columns in migration `026` |
| Inline modal states in `TeacherStudySection` | ~400 LOC | UI Markup | Modal markup inlined in parent return statement | Extract into 4 standalone modal components |

---

## 2. Public Static Asset Inspection (`public/`)

```text
public/
├── favicon.ico
├── icon-192.png
├── icon-512.png
├── manifest.json
└── push-sw.js
```
- **Asset Health:** All static assets located in `public/` are actively consumed:
  - `manifest.json` is referenced by `index.html` and `InstallAppPrompt.jsx`.
  - `push-sw.js` is imported by Workbox in `vite.config.js` via `importScripts: ['/push-sw.js']` to handle Web Push notifications.
  - Icons `icon-192.png` and `icon-512.png` are referenced in PWA splash screens.
- **Dead Asset Findings:** Zero orphaned images or orphan media files detected in `public/`.
