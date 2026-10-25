# Architectural Improvements & Clean Code Refactoring Plan

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Lead Architect:** Principal Software Architect  
**Objective:** Transform monolithic React components into a modular, testable, and maintainable layered architecture.  

---

## 1. Target Multi-Layer Clean Architecture

```mermaid
graph TD
    subgraph Presentation Layer [React 18 UI Components]
        V1[Views & Pages: Max 200 LOC]
        V2[UI Primitives & Modals: Max 150 LOC]
    end
    subgraph State & Query Layer [TanStack Query & Hooks]
        Q1[useBatches / useCurriculum Hooks]
        Q2[Optimistic Mutations & Cache Invalidation]
    end
    subgraph Domain Service Layer [Business Logic & Repositories]
        S1[BatchService.ts]
        S2[CurriculumService.ts]
        S3[AttendanceService.ts]
    end
    subgraph Gateway Layer [Client SDK & Transport]
        G1[Typed Supabase Client with Generated Database Schema]
    end
    Presentation Layer --> State & Query Layer
    State & Query Layer --> Domain Service Layer
    Domain Service Layer --> Gateway Layer
```

---

## 2. Megalith Decomposition Blueprints

### 2.1 Refactoring `TeacherStudySection.jsx` (1,948 LOC -> 6 Modular Components)
The monolithic file is broken down into clean, isolated components:
1. `TeacherStudySectionView.jsx` (~180 LOC): Container layout and subject tabs.
2. `ChapterAccordionTree.jsx` (~150 LOC): Collapsible chapter listing with drag re-ordering.
3. `StudyCardDeck.jsx` (~160 LOC): Grid of published and draft study cards.
4. `AddCardModal.jsx` (~120 LOC): Card creation form with YouTube URL validation.
5. `YouTubeSyncModal.jsx` (~110 LOC): Playlist synchronization interface.
6. `NotesUploadModal.jsx` (~90 LOC): PDF and Google Drive link attachment form.

### 2.2 Refactoring `ProtectedVideoPlayer.jsx` (1,607 LOC -> 4 Focused Modules)
1. `ProtectedPlayerContainer.jsx` (~180 LOC): YouTube iframe lifecycle and keyboard listeners.
2. `WatermarkCanvas.jsx` (~95 LOC): HTML5 dynamic canvas animation loop running on `requestAnimationFrame`.
3. `PlayerCustomControls.jsx` (~140 LOC): Play/pause buttons, seek bar, volume knob, playback speed picker.
4. `InVideoDoubtPanel.jsx` (~160 LOC): Timestamped doubt thread submission and instructor replies.

---

## 3. Incremental TypeScript Migration Strategy

1. **Step 1: Type Generation:**
   ```bash
   npx supabase gen types typescript --project-id "<project-id>" > src/types/database.types.ts
   ```
2. **Step 2: Type Typed Supabase Client:**
   ```typescript
   import { createClient } from '@supabase/supabase-js'
   import { Database } from './types/database.types'
   
   export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
   ```
3. **Step 3: Migrate Leaf Utilities:**
   Convert `src/utils/formatters.js`, `youtube.js`, and `clipboard.js` to `.ts`.
4. **Step 4: Migrate Components:**
   Convert components to `.tsx`, establishing strict props interfaces.
