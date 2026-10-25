# Deployment Architecture & Production Topology

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Hosting Provider (Frontend & Serverless Functions):** Netlify Cloud Edge  
**Hosting Provider (Database, Auth, Realtime & Edge Functions):** Supabase Cloud  
**Primary Database Region:** AWS Mumbai (`ap-south-1`)  
**CDN & Edge Network:** Netlify High-Performance Global CDN  

---

## 1. Multi-Tier Production Topology

```mermaid
graph TD
    User[End-User Devices: PWA Mobile / Desktop]
    
    subgraph Netlify Edge Network
        CDN[Global Anycast CDN Edge Nodes]
        SPA[Pre-Rendered SPA Assets: HTML / CSS / JS Chunks]
        NetlifyFunc[Netlify Serverless: /.netlify/functions/youtube-playlist]
    end
    
    subgraph Supabase Cloud Infrastructure [AWS ap-south-1 Mumbai]
        PostgREST[PostgREST 12+ HTTP Data Gateway]
        GoTrue[Supabase GoTrue Auth Service]
        Realtime[Phoenix Channels Realtime WebSocket Gateway]
        DenoEdge[Deno Edge Function: send-push]
        PostgresDB[(PostgreSQL 15.6 Engine + WAL Replication)]
    end
    
    subgraph Third-Party External Gateways
        YouTube[YouTube Global CDN Video Streaming]
        GDrive[Google Drive Document CDN Proxy]
        PushRelays[FCM / Mozilla / Apple APNs Push Relays]
    end

    User -->|HTTPS Request| CDN
    CDN --> SPA
    CDN -->|Rewrite /api/youtube-playlist| NetlifyFunc
    NetlifyFunc -->|XML RSS Proxy| YouTube
    
    User -->|RESTful CRUD (Bearer JWT)| PostgREST
    User -->|Auth Login / Signup| GoTrue
    User -->|Persistent WSS Connection| Realtime
    User -->|Embedded Video Stream| YouTube
    User -->|Embedded Notes & Thumbnails| GDrive
    
    PostgREST --> PostgresDB
    GoTrue --> PostgresDB
    PostgresDB -->|WAL Replication Stream| Realtime
    PostgresDB -->|Database Webhooks| DenoEdge
    DenoEdge -->|VAPID Signed Push| PushRelays
    PushRelays -->|Native Push Notification| User
```

---

## 2. Frontend Hosting Configuration (`netlify.toml`)

The application deployment is controlled deterministically via `netlify.toml`:
- **Build Command:** `npm run build` (Executed in Node.js 20 environment).
- **Publish Directory:** `dist`
- **SPA Routing Fallback:** All non-static asset routes rewrite to `/index.html` with HTTP 200:
  ```toml
  [[redirects]]
    from = "/*"
    to = "/index.html"
    status = 200
  ```
- **Serverless Function Proxy Rewrite:** Seamlessly forwards `/api/youtube-playlist` calls to the serverless function:
  ```toml
  [[redirects]]
    from = "/api/youtube-playlist"
    to = "/.netlify/functions/youtube-playlist"
    status = 200
  ```
- **Security Headers Injection:** Enforces `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
- **Cache Optimization:** Immutable 1-year browser caching on versioned Vite assets:
  `Cache-Control: public, max-age=31536000, immutable`.

---

## 3. High-Availability & Redundancy

- **Frontend Availability:** 99.99% SLA backed by Netlify's globally distributed multi-cloud Anycast network.
- **Database Availability:** Managed by Supabase on AWS Mumbai with automated storage volume auto-scaling and managed daily snapshots.
