# Master Environment Variable & Secret Registry

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Total Cataloged Configuration Variables:** 9 Variables  

---

## 1. Master Environment Variables Registry

| Variable Name | Scope | Sensitivity | Purpose / Description | Security Status |
|---|---|:---:|---|:---:|
| `VITE_SUPABASE_URL` | Frontend Client | **Public** | Supabase Project API Gateway URL | Safe |
| `VITE_SUPABASE_ANON_KEY` | Frontend Client | **Public** | Anonymous Public Client API Key | Safe (Enforced via RLS) |
| `VITE_ADMIN_CODE` | Frontend Client | **Public** | Administrative Invite Bypass Secret | **VULNERABLE (`SEC-004`)** |
| `NODE_VERSION` | Netlify Build | **Build-Time**| Node.js Runtime Version (`20`) | Safe |
| `SUPABASE_SERVICE_ROLE_KEY`| Supabase Edge | **Secret** | Master PostgreSQL Admin Secret Key | Secure (Never in Git/Client) |
| `VAPID_PUBLIC_KEY` | Supabase Edge | **Secret** | Web Push VAPID Public Key | Safe |
| `VAPID_PRIVATE_KEY` | Supabase Edge | **Secret** | Web Push VAPID Private Key | Secure (Never in Git/Client) |
| `VAPID_SUBJECT` | Supabase Edge | **Secret** | Administrative Contact Email for Push | Safe |
| `WEBHOOK_SECRET` | Supabase Edge | **Secret** | Shared Secret Header for DB Webhook | Secure (Never in Git/Client) |
