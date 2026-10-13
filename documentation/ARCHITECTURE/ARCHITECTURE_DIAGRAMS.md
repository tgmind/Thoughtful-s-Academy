# Comprehensive Architecture Diagrams

Audit Date: 2026-10-13  
Platform: Thoughtful's Academy

---

## 1. System Context Diagram (C4 Level 1)

```mermaid
graph TD
    UserStudent[Student User] -->|Browse, stream lectures, mark attendance, submit fees| App[Thoughtful's Academy Platform]
    UserTeacher[Faculty / Teacher] -->|Publish study cards, grade homework, start live classes| App
    UserAdmin[Administrator] -->|Manage batches, verify fees, disburse salaries, audit logs| App
    UserPublic[Prospective Visitor] -->|Browse batches, preview lectures, self-register| App

    App -->|BaaS, PostgreSQL, Auth, Realtime| Supabase[Supabase Cloud]
    App -->|Video Streaming & CDN| YouTube[YouTube Video Infrastructure]
    App -->|Background Web Push| WebPush[Browser Web Push Gateways]
    App -->|Static Web Hosting & CDN| Netlify[Netlify Edge Cloud]
    App -->|Meeting URLs| LiveVideo[Zoom / Google Meet]
```

---

## 2. Container Diagram (C4 Level 2)

```mermaid
graph TD
    subgraph ClientContainer["Client Tier"]
        SPA["React 18 Single Page Application (Vite Bundled)"]
        SW["Service Worker (Workbox + push-sw.js)"]
    end

    subgraph NetlifyContainer["Hosting Tier"]
        CDN["Netlify Global CDN Edge"]
        NetlifyFn["Serverless Function: youtube-playlist.js"]
    end

    subgraph SupabaseContainer["BaaS Tier (Supabase Cloud)"]
        GoTrue["Supabase GoTrue (Auth)"]
        PostgREST["PostgREST (REST API)"]
        Realtime["Realtime (Phoenix WebSockets)"]
        Storage["Supabase Storage (Buckets: qr-codes, teacher-qr)"]
        EdgeWorker["Deno Edge Function (send-push)"]
        PostgresDB[("PostgreSQL 15 Database (18 Tables)")]
    end

    SPA -->|Fetch HTML, JS, CSS| CDN
    SPA -->|Resolve Playlists / XML Feeds| NetlifyFn
    SPA -->|Authentication & JWT Sessions| GoTrue
    SPA -->|Data Queries & Mutations (RLS)| PostgREST
    SPA -->|Subscribe to Live Changes| Realtime
    SPA -->|Upload QR Images| Storage
    SW -->|Offline Cache Interception| SPA

    PostgREST --> PostgresDB
    GoTrue --> PostgresDB
    Realtime --> PostgresDB
    Storage --> PostgresDB
    PostgresDB -->|Database Webhooks| EdgeWorker
```

---

## 3. Component Diagram (C4 Level 3)

```mermaid
graph TD
    subgraph ClientCore["Core Application Components"]
        AppRoot[App.jsx]
        AuthContext[AuthContext.jsx]
        RoleGuard[roleGuard.jsx]
        Shell[DashboardShell.jsx]
    end

    subgraph Portals["Portal Modules"]
        PublicViews["Public Views: Home, BatchDetails, Login, Register"]
        StudentViews["Student Views: Dashboard, WatchLecture, Attendance, PayFee"]
        TeacherViews["Teacher Views: TeacherHome, StudySection, Homework, LiveClass"]
        AdminViews["Admin Views: AdminHome, StudentTracker, FeeManager, BatchManager"]
    end

    subgraph SharedWidgets["Shared Interactive Widgets"]
        Player[ProtectedVideoPlayer.jsx]
        ActivityLog[ActivityLogModal.jsx]
        LiveBanner[LiveClassBanner.jsx]
        CustomSel[CustomSelect.jsx]
    end

    AppRoot --> AuthContext
    AuthContext --> RoleGuard
    RoleGuard --> PublicViews
    RoleGuard --> Shell
    Shell --> StudentViews
    Shell --> TeacherViews
    Shell --> AdminViews

    StudentViews --> Player
    TeacherViews --> ActivityLog
    StudentViews --> LiveBanner
    AdminViews --> CustomSel
```

---

## 4. Deployment Topology Diagram

```mermaid
graph LR
    subgraph NetlifyEdge["Netlify Edge Network (Global)"]
        EdgeDNS["DNS & Anycast Edge"]
        StaticAssets["Static Storage (HTML, JS, CSS, PWA Assets)"]
        NodeFn["Node.js 20 Serverless Lambda (youtube-playlist)"]
    end

    subgraph SupabaseCloud["Supabase Managed Cloud (AWS eu-central / ap-south)"]
        LB["Kong API Gateway"]
        DenoEdge["Deno Edge Network (send-push)"]
        DBInstances["PostgreSQL 15 Database Cluster with PgBouncer"]
        S3Storage["AWS S3 Backed Supabase Storage"]
    end

    subgraph ClientBrowsers["End-User Client Devices"]
        MobileClient["Mobile Android / iOS (PWA Installed)"]
        DesktopClient["Desktop Web Browsers (Chrome / Edge / Firefox)"]
    end

    ClientBrowsers -->|HTTPS / WSS| EdgeDNS
    EdgeDNS --> StaticAssets
    EdgeDNS --> NodeFn
    ClientBrowsers -->|HTTPS / WSS direct| LB
    LB --> DBInstances
    LB --> S3Storage
    DBInstances -->|Internal HTTP Call| DenoEdge
```

---

## 5. Live Class Event Flow

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher
    participant TView as Teacher LiveClass.jsx
    participant PostgREST as PostgREST API
    participant PG as PostgreSQL Database
    participant Realtime as Phoenix Realtime WebSocket
    actor Student as Student
    participant SView as Student LiveClass.jsx / Banner
    participant Audio as Web Audio API

    Teacher->>TView: Enter Meeting URL, Platform (Zoom), Batch ID & Click "Go Live"
    TView->>PostgREST: INSERT INTO live_classes (title, platform, join_url, is_active=true)
    PostgREST->>PG: Insert Row
    PG->>Realtime: WAL Insert Event Broadcast
    Realtime->>SView: WebSocket Payload: { eventType: 'INSERT', new: { ... } }
    SView->>Audio: Play 880Hz Sine Wave Chime
    SView->>Student: Display Live Class Banner ("Join Class Now")
    Student->>SView: Click "Join Class"
    SView->>Student: Open Zoom / Google Meet in new tab
```

---

## 6. Offline UPI Fee Reconciliation Flow

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student
    participant PayFee as PayFee.jsx
    participant UPI as Mobile UPI App (GPay/PhonePe)
    participant PostgREST as PostgREST API
    participant PG as PostgreSQL Database
    actor Admin as Administrator
    participant FeeManager as FeeManager.jsx

    Student->>PayFee: Open "Pay Fee" tab
    PayFee->>Student: Display Active Institute QR Code & UPI ID
    Student->>UPI: Scan QR, transfer fee, copy UTR Transaction Reference ID
    Student->>PayFee: Enter Month, Amount, UTR ID & submit
    PayFee->>PostgREST: INSERT INTO fee_records (status: 'pending', reference_id: '...')
    PostgREST->>PG: Insert pending record
    PayFee->>Student: Toast: "Payment submitted for verification!"
    Admin->>FeeManager: Open "Pending Verifications" tab
    FeeManager->>PostgREST: SELECT * FROM fee_records WHERE status = 'pending'
    PostgREST-->>FeeManager: Return pending records
    Admin->>Admin: Verify UTR in institute bank account statement
    alt Payment Verified
        Admin->>FeeManager: Click "Verify"
        FeeManager->>PostgREST: UPDATE fee_records SET status = 'verified' WHERE id = ...
        PostgREST->>PG: Update status to verified
    else Invalid / Fraudulent UTR
        Admin->>FeeManager: Click "Reject" with reason
        FeeManager->>PostgREST: UPDATE fee_records SET status = 'rejected' WHERE id = ...
        PostgREST->>PG: Update status to rejected
    end
```
