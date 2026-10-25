# Environment Variables & Configuration Registry

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Configuration Scopes:** Vite Frontend Build, Netlify Hosting Environment, and Supabase Edge Secrets  

---

## 1. Master Configuration Matrix

| Variable Name | Environment Scope | Exposure Type | Purpose / Description | Security Status |
|---|---|:---:|---|:---:|
| `VITE_SUPABASE_URL` | Frontend Client | **Public** | Supabase Project API Gateway URL | Safe (Public endpoint) |
| `VITE_SUPABASE_ANON_KEY` | Frontend Client | **Public** | Supabase Anonymous Client API Key | Safe (Constrained by RLS) |
| `VITE_ADMIN_CODE` | Frontend Client | **Public** | Admin Registration Bypass Secret | **VULNERABLE (`SEC-004`)** |
| `NODE_VERSION` | Netlify Build | **Build-Time**| Node.js Runtime Version (`20`) | Safe |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge | **Secret** | Master PostgreSQL Admin Access Key | Secure (Never in Git/Client) |
| `VAPID_PUBLIC_KEY` | Supabase Edge | **Secret** | Web Push VAPID Public Key | Safe |
| `VAPID_PRIVATE_KEY` | Supabase Edge | **Secret** | Web Push VAPID Cryptographic Private Key| Secure (Never in Git/Client) |
| `VAPID_SUBJECT` | Supabase Edge | **Secret** | Administrative Contact Email for Push | Safe |
| `WEBHOOK_SECRET` | Supabase Edge | **Secret** | Shared Secret Header for DB Webhook | Secure (Never in Git/Client) |

---

## 2. In-Depth Configuration Profiles

### 2.1 Frontend Client Variables (`.env`)
```bash
# Production Supabase Connection (Publicly readable)
VITE_SUPABASE_URL="https://<project-id>.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# VULNERABLE: Must be removed from client-side bundles!
# VITE_ADMIN_CODE="THOUGHTFUL_ADMIN_2026"
```

> [!WARNING]
> **Security Advisory on `VITE_ADMIN_CODE`:** Because Vite compiles all variables prefixed with `VITE_` directly into client JavaScript chunks, any secret assigned to `VITE_ADMIN_CODE` is exposed in plaintext to anyone who downloads the frontend app.

### 2.2 Supabase Edge Function Secrets Configuration
Edge Function secrets are provisioned via Supabase CLI:
```bash
supabase secrets set   VAPID_PUBLIC_KEY="BEl62iUYgUivxIkv..."   VAPID_PRIVATE_KEY="s2g8s_..."   VAPID_SUBJECT="mailto:principal@thoughtfulacademy.com"   WEBHOOK_SECRET="whsec_89d2f09a1e8c4..."
```
