# Infrastructure Asset & Cloud Vendor Inventory

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Lead Auditor:** Principal DevOps & Infrastructure Engineer  

---

## 1. Master Cloud Infrastructure Inventory

| Component / Subsystem | Cloud Provider | Geolocation / Region | Runtime / Platform | Service Tier | Estimated Cost |
|---|---|:---:|---|---|:---:|
| **Frontend Web Hosting** | Netlify | Global Edge Anycast | Vite SPA / Static CDN | Free Starter | \$0 / mo |
| **YouTube Proxy Function** | Netlify | AWS Lambda (us-east-1) | Node.js 20 Serverless | Included (125k reqs) | \$0 / mo |
| **Core Relational DB** | Supabase (AWS) | Mumbai (`ap-south-1`) | PostgreSQL 15.6 | Free / Pro | \$0 - \$25 / mo |
| **PostgREST API Gateway** | Supabase | Mumbai (`ap-south-1`) | PostgREST 12+ | Included with DB | \$0 / mo |
| **GoTrue Identity Auth** | Supabase | Mumbai (`ap-south-1`) | GoTrue Go Service | Included (50k MAU) | \$0 / mo |
| **Realtime Pub/Sub** | Supabase | Mumbai (`ap-south-1`) | Phoenix / Elixir | Included (200 CCU) | \$0 / mo |
| **Push Dispatcher** | Supabase | Global Edge Network | Deno Edge Function | Included (500k runs) | \$0 / mo |
| **Video CDN Streaming** | Google / YouTube | Global CDN | YouTube Iframe Player | Public Cloud Video | \$0 / mo |
| **Course Notes & PDFs** | Google Drive | Global Google CDN | Drive Thumbnail CDN | Public Drive Share | \$0 / mo |
| **Push Notification Gateways**| FCM / APNs | Global Push Relays | Web Push Protocol RFC 8292 | Public OS Push | \$0 / mo |
| **Total Operating Cost** | | | | | **\$0 - \$25 / mo** |

---

## 2. Infrastructure Resilience & Failover Architecture

1. **Edge CDN Failover:** Netlify Anycast dynamically routes incoming traffic around localized edge data center outages.
2. **Database Recovery:** Supabase manages automated physical storage backups to AWS S3. Point-in-time recovery (PITR) is provisioned on the Pro tier.
3. **PWA Offline Resilience:** Client browser Service Worker (`vite-plugin-pwa`) precaches 62 application shell assets (1,821 KiB), allowing students with spotty internet connectivity to open the app and view cached notes without cellular signal.
