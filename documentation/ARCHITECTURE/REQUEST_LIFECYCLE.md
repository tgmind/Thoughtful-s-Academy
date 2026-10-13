# Request & Response Lifecycle

Audit Date: 2026-10-13  
Platform: Thoughtful's Academy

---

## 1. End-to-End Request Lifecycles

### 1.1 Data Fetching Request (e.g. Student Loading Dashboard)

```mermaid
sequenceDiagram
    autonumber
    actor User as Student Browser
    participant App as React Dashboard (StudentDashboard.jsx)
    participant Client as Supabase Client (lib/supabase.js)
    participant PostgREST as PostgREST API
    participant PG as PostgreSQL Database

    User->>App: Navigate to /student/dashboard
    App->>App: Render cached data from localStorage (Instant UI)
    App->>Client: supabase.from('attendance').select('*').eq('student_id', user.id)
    Client->>PostgREST: GET /rest/v1/attendance?student_id=eq.{id}
    Note over Client,PostgREST: Headers: apikey, Authorization: Bearer <JWT>
    PostgREST->>PG: SELECT * FROM attendance WHERE student_id = $1
    Note over PostgREST,PG: Evaluates RLS: (auth.uid() = student_id)
    PG-->>PostgREST: 200 OK (Row Set)
    PostgREST-->>Client: 200 OK (JSON Array)
    Client-->>App: { data: [...], error: null }
    App->>App: Compute streaks, gauges, update cache & re-render
```

### 1.2 Data Mutation Request (e.g. Marking Attendance)

```mermaid
sequenceDiagram
    autonumber
    actor User as Student Browser
    participant App as React Dashboard
    participant Client as Supabase Client
    participant PostgREST as PostgREST API
    participant PG as PostgreSQL Database
    participant Realtime as Supabase Realtime Engine

    User->>App: Click "Mark Present Today"
    App->>Client: supabase.from('attendance').insert({ student_id, batch_id, date, status: 'present' })
    Client->>PostgREST: POST /rest/v1/attendance
    PostgREST->>PG: INSERT INTO attendance ...
    Note over PostgREST,PG: Validates UNIQUE(student_id, date) & RLS WITH CHECK
    PG-->>PostgREST: 201 Created (Inserted Row)
    PG->>Realtime: WAL Record Inserted Event
    Realtime->>App: WebSocket Broadcast on channel 'attendance'
    PostgREST-->>Client: 201 Created
    Client-->>App: Success Response
    App->>User: Toast "Attendance marked!" & update UI button
```

### 1.3 Message Send & Push Notification Flow

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student Browser
    participant App as React Messages
    participant PostgREST as PostgREST API
    participant PG as PostgreSQL Database
    participant Webhook as Database Webhook Trigger
    participant EdgeFn as Edge Function (send-push)
    participant PushService as Web Push Gateway (FCM/Apple)
    actor Teacher as Teacher Device

    Student->>App: Send message "Sir, I have a doubt in Q4"
    App->>PostgREST: POST /rest/v1/messages
    PostgREST->>PG: INSERT INTO messages (sender_id, receiver_id, content)
    PG-->>PostgREST: 201 Created
    PG->>Webhook: Trigger HTTP POST on INSERT
    Webhook->>EdgeFn: POST /functions/v1/send-push (Payload: record)
    EdgeFn->>PG: SELECT * FROM push_subscriptions WHERE user_id = receiver_id
    PG-->>EdgeFn: Return active push endpoints
    EdgeFn->>PushService: webpush.sendNotification(endpoint, encrypted_payload)
    PushService->>Teacher: Native OS Notification: "💬 Ravi: Sir, I have a doubt..."
```
