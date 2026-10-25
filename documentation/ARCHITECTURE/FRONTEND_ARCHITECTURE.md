# Frontend Architecture & State Management

Audit Date: 2026-10-13  
Platform: Graviton Academy

---

## 1. Architectural Style & Rendering Mode

Graviton Academy is structured as a **Pure Client-Side Rendered (CSR)** React Single Page Application (SPA).
- **Hosting Strategy:** Hosted statically on Netlify CDN edge nodes.
- **Initial Load:** Returns minimal `index.html` followed by critical bundles (`vendor-react.js`, `vendor-ui.js`, `vendor-supabase.js`, `index.css`).
- **Subsequent Routing:** Navigated purely in the browser history state via `react-router-dom` v6 with zero server round-trips for HTML.
- **Offline / PWA Capability:** Service Worker (`dist/sw.js`) precaches static assets, serving cached app shells when connectivity drops.

---

## 2. State Management Architecture

The platform relies on a combination of **React Context**, **Custom Hooks**, and **Local Browser Storage**:

```mermaid
graph TD
    subgraph GlobalState["Global React Context"]
        AuthCtx[AuthContext.jsx]
        AuthUser[user: Supabase User Object]
        AuthProfile[profile: DB Profile Row]
        AuthRole[role: student | teacher | admin]
    end

    subgraph HooksState["Reactivity Hooks"]
        NavBadges[useNavBadges.js - Realtime Unread Dots]
        LiveHook[useLiveClass.js - Live Class Beep & Active Banner]
        UnreadHook[useUnreadMessages.js - Unread Message Count]
    end

    subgraph LocalPersistence["Browser Local Storage"]
        DashCache[student_dash_cache_v2_userId: 24-Hour Cache]
        VideoProgress[ta_lecture_progress_v1: Timestamp per Card]
        VideoQuality[ta_video_quality: Auto, 720p, 1080p]
    end

    subgraph ComponentLocalState["Component-Level State (useState/useReducer)"]
        FormState[Input Values, Field Errors]
        DrawerState[Open / Closed Drawers, Modals]
        FilterState[Batch Filter, Subject Selection, Search]
    end

    AuthCtx --> NavBadges
    AuthCtx --> LiveHook
    AuthCtx --> UnreadHook
    AuthCtx --> DashCache
```

### 2.1 Global Authentication State (`AuthContext.jsx`)
- Stores authenticated user session, PostgreSQL profile record (`full_name`, `email`, `role`, `is_active`), authentication status, and exposed methods (`signOut()`, `refreshProfile()`).
- Any state consumer across the app accesses auth attributes via the `useAuth()` custom hook.

### 2.2 Live Badge & Realtime Hooks (`useNavBadges.js`, `useRealtime.js`)
- `useNavBadges` subscribes to PostgreSQL changes on `messages`, `notifications`, `live_classes`, and `homework`.
- Computes boolean badge map (`{ '/student/messages': true, '/student/notifications': false }`) dynamically so sidebar tabs display red dots upon incoming items.
- Automatically clears the badge dot once the student navigates to the matching URL path.

### 2.3 Dashboard Cache Pattern
- `StudentDashboard.jsx` implements a 24-hour cache in `localStorage` (`student_dash_cache_v2_${userId}`).
- On initial page visit, cached stats, attendance records, and streak counts render immediately to eliminate layout shift, while fresh Supabase queries run in the background to update the cache.

---

## 3. Data Fetching & Caching Strategy

- **Direct BaaS Ingestion:** Components call `supabase.from('table_name').select(...)` directly inside `useEffect` hooks.
- **Query Cancellation:** `useEffect` hooks utilize closure flags (`let cancelled = false; ... return () => { cancelled = true; }`) to prevent memory leaks and state updates on unmounted views.
- **TanStack Query Availability:** While `@tanstack/react-query` is installed in `package.json`, the majority of views rely on native `useEffect` + `supabase.from()` fetching rather than centralized React Query hooks.
- **Error Handling Pattern:** Errors returned by Supabase queries trigger UI feedback via `react-hot-toast` (`toast.error(error.message)`).
