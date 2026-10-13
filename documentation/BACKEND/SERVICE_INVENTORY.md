# Backend Services & Subsystem Inventory

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Architecture:** Serverless BaaS (Supabase Cloud + Netlify Serverless Functions)  
**Database Engine:** PostgreSQL 15.6 with PostgREST 12+  
**Authentication Engine:** Supabase GoTrue (JWT-based OAuth2 / Resource Owner)  

---

## 1. Master Subsystem Matrix

| Service Identifier | Runtime / Provider | Protocol / Port | Role & Responsibility | Criticality |
|---|---|:---:|---|:---:|
| **PostgreSQL Database** | Supabase Managed | PostgreSQL / 5432 | Primary ACID storage, relational constraints, RLS policies, trigger logic | **Tier 0 (Fatal)** |
| **PostgREST HTTP API** | Supabase Gateway | HTTPS / 443 | Auto-generated RESTful API translating HTTP requests to SQL queries | **Tier 0 (Fatal)** |
| **GoTrue Auth Service** | Supabase Auth | HTTPS / 443 | User credential validation, session issuance, password hashing | **Tier 0 (Fatal)** |
| **Realtime Engine** | Supabase (Elixir) | WSS / 443 | WebSocket pub/sub streaming database changes to active browser tabs | **Tier 1 (High)** |
| **Edge Function (`send-push`)** | Supabase (Deno) | HTTPS / 443 | Webhook-driven push notification dispatcher delivering Web Push via VAPID | **Tier 1 (High)** |
| **Netlify Serverless Proxy** | Netlify (Node.js 18) | HTTPS / 443 | Scrapes and proxies YouTube RSS playlist feeds to bypass browser CORS | **Tier 2 (Medium)** |
| **YouTube Iframe Service** | Google / YouTube | HTTPS / 443 | Video hosting and playback streaming infrastructure | **Tier 1 (High)** |
| **Web Push Gateways** | FCM / Mozilla / APNs | HTTPS / 443 | Third-party push notification relays delivering background alerts to devices | **Tier 2 (Medium)** |
| **Drive CDN Resolver** | Google Drive / UserContent | HTTPS / 443 | Direct streaming proxy for course notes, lecture PDFs, and assignment images | **Tier 2 (Medium)** |

---

## 2. Granular Service Profiles

### 2.1 Supabase PostgreSQL Database Service
- **Hosting:** AWS Mumbai (`ap-south-1`) via Supabase Cloud.
- **Extensions Active:** `uuid-ossp` (UUID v4 generation), `pgcrypto` (cryptographic hashing).
- **Security Posture:** 100% of public tables enforce Row Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`). Zero tables operate without RLS policies.
- **Automated Procedures:**
  - `handle_new_user()`: Triggers upon user creation in `auth.users`, populating `profiles` and generating student roll numbers.
  - `is_admin()`: Helper function returning boolean based on `profiles.role = 'admin'`.
  - `get_my_role()`: Helper function returning user role from `profiles`.

### 2.2 Supabase PostgREST Gateway
- **Functionality:** Provides zero-code CRUD over HTTP. Maps query string parameters directly to SQL AST representations.
- **Caching & Connection Pooling:** Uses Supavisor connection pooler in transaction mode.
- **Fail-Safe Mechanism:** Rejects all queries that violate RLS policies, returning HTTP `403 Forbidden` or empty result sets (`[]`) rather than throwing fatal database connection errors.

### 2.3 Supabase Realtime WebSocket Gateway
- **Channels Subscribed by Client:**
  - `public:live_classes`: Broadcasts class start/stop events across student portals.
  - `public:notifications`: Dispatches real-time broadcast alerts.
  - `public:messages`: In-app chat synchronization.
- **Reliability:** Built on Phoenix Channels (Elixir). Automatically reconnects on mobile network handover (WiFi to 4G/5G).

### 2.4 Supabase Edge Function (`send-push`)
- **Runtime:** Deno on Supabase Edge Network.
- **Libraries:** `@supabase/supabase-js`, `web-push@3.6.7`.
- **Trigger Source:** Configured via Supabase Database Webhook listening for `INSERT` events on `notifications` and `messages`.
- **Dead Subscription Garbage Collection:** Automatically catches HTTP `404 Not Found` and `410 Gone` errors from push relays, deleting stale subscriptions from `push_subscriptions` table.

### 2.5 Netlify Serverless Function (`youtube-playlist`)
- **Runtime:** Node.js 18 ESM on AWS Lambda (via Netlify).
- **Architecture:** Zero dependency HTTP handler using native `fetch`.
- **Caching:** Sets `Cache-Control: public, max-age=900` (15-minute edge caching) to prevent excessive requests to YouTube servers.
