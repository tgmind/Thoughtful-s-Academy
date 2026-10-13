# Master External Integration Registry

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Total External Services Integrated:** 5 Primary Gateways  

---

## 1. Master External Integrations Directory

| Integration Name | Vendor / Provider | Protocol / SDK | Purpose in Architecture | Security Boundary |
|---|---|:---:|---|---|
| **YouTube Video Player** | Google / YouTube | Iframe API & RSS | Lecture video streaming and playlist syndication | Unlisted video URLs wrapped in canvas watermarks |
| **Google Drive CDN** | Google Workspace | HTTPS REST | Document, lecture PDF, and image thumbnail resolver | Public view URLs converted to streaming links |
| **Browser Web Push** | FCM / Mozilla / APNs | VAPID RFC 8292 | Native device background notifications | End-to-end encrypted push payloads |
| **Netlify Edge Platform** | Netlify | HTTPS / Anycast | Global SPA asset hosting and serverless proxy | Automatic SSL and security header injection |
| **Supabase Cloud BaaS** | Supabase (AWS Mumbai)| HTTPS / WSS | PostgreSQL, Auth, PostgREST, and Realtime engine | Row Level Security (RLS) policies |
