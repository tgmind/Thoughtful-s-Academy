# Thoughtful's Academy — Platform Audit & Technical Knowledge Base

Welcome to the definitive forensic technical documentation repository for **Thoughtful's Academy** (formerly Coaching Institute Platform). This knowledge base was authored during a comprehensive, evidence-backed platform audit on **October 13, 2026**.

---

## 1. Quick Navigation

- **[Phase 5 Final Verification & Staging Readiness](./CAPACITY/PHASE_5_FINAL_VERIFICATION_AND_STAGING_READINESS.md):** Definitive technical verification, 8-column object mapping, security regression audit, and staging readiness gate.
- **[Capacity & Realtime Optimization](./CAPACITY/CAPACITY_BASELINE.md):** Complete high-capacity engineering guide, load model, channel multiplexing, and free-tier limits.
- **[Phase 3 Verification & Deployment Gate](./REMEDIATION/PHASE_3_INDEPENDENT_VERIFICATION_REPORT.md):** Evidence-based security verification, test results, and 4-category deployment readiness gate.
- **[Remediation Executive Summary](./REMEDIATION/REMEDIATION_EXECUTIVE_SUMMARY.md):** High-level remediation outcomes, resolved vulnerabilities, and readiness.
- **[Executive Summary](./EXECUTIVE_SUMMARY.md):** High-level architectural overview, current platform health, key operational risks, and executive decisions.
- **[Platform Baseline](./PLATFORM_BASELINE.md):** The authoritative technical snapshot (commit, stack, verified counts, operational readiness).
- **[Documentation Index & Sitemap](./DOCUMENTATION_INDEX.md):** Exhaustive directory and cross-link map for all documentation modules.
- **[Master Findings Register](./FINDINGS/MASTER_FINDINGS_REGISTER.md):** Categorized index of all security, functional, architectural, and performance findings.
- **[Prioritized Upgrade Roadmap](./ROADMAP/PRIORITIZED_UPGRADE_ROADMAP.md):** Dependency-aware, phased implementation plan (P0 through P4).
- **[Developer & AI Handover Guide](./OPERATIONS/HANDOVER_GUIDE.md):** Step-by-step instructions for human engineers and AI coding agents resuming work.

---

## 2. Directory Structure

```
documentation/
├── README.md                                # Landing page and knowledge base overview
├── DOCUMENTATION_INDEX.md                   # Navigable index of all audit files
├── EXECUTIVE_SUMMARY.md                     # High-level architecture, verified state, critical risks
├── PLATFORM_BASELINE.md                     # Technical baseline at audit timestamp
├── AUDIT_METHODOLOGY.md                     # Forensic testing & evidence collection methodology
├── AUDIT_SCOPE_AND_LIMITATIONS.md           # Boundaries of testing and unverified third-party items
├── AUDIT_COMPLETION_REPORT.md               # Final audit sign-off and shutdown report
├── CAPACITY/                                # High-capacity & realtime optimization reports and models
├── REMEDIATION/                             # Phase 2 remediation reports, test results & runbooks
├── ARCHITECTURE/                            # System design, data flows, and diagrams
├── FEATURES/                                # Feature catalog, status matrix, and workflows
├── FRONTEND/                                # Route, component, UI/UX, and accessibility audits
├── BACKEND/                                 # PostgREST APIs, Netlify & Edge functions, and services
├── DATABASE/                                # Schema, ER diagrams, migrations, and data integrity
├── SECURITY/                                # Threat model, RLS audit, OWASP, and CVEs
├── TESTING/                                 # Test coverage analysis, gaps, and regression plan
├── PERFORMANCE_AND_SCALABILITY/             # Load estimates, student capacity, and bottleneck analysis
├── INFRASTRUCTURE/                          # Deployment topology, PWA, Netlify, and runbooks
├── CODE_QUALITY/                            # Technical debt, unused code, and maintainability risks
├── FINDINGS/                                # Detailed findings registers (SEC, BUG, UX, PERF, ARCH)
├── ROADMAP/                                 # P0-P4 prioritized upgrade roadmap
├── OPERATIONS/                              # Local dev setup, commands, troubleshooting, handover
├── REGISTRY/                                # Central cross-reference registries (Routes, APIs, DB, Envs)
└── EVIDENCE/                                # Raw logs, benchmark runs, and curl execution records
```

---

## 3. Platform Synopsis

| Attribute | Observed / Verified Value |
|---|---|
| **Platform Name** | Thoughtful's Academy (`INSTITUTE_NAME`) |
| **Domain Type** | EdTech Hybrid Coaching Institute Management System |
| **Frontend Stack** | React 18.3.1, Vite 5.4.10, Tailwind CSS 3.4.14, Lucide React, Framer Motion |
| **Backend / DB** | Supabase Cloud (PostgreSQL 15, PostgREST 12, Supabase Auth, WebSockets) |
| **Serverless Services** | Netlify Functions (`youtube-playlist.js`), Supabase Edge Function (`send-push`) |
| **Client Type** | Single Page Application (SPA) + Progressive Web App (PWA with Workbox) |
| **Active Portals** | Public Portal, Student Portal, Teacher Portal, Admin Central |
| **Total Source Lines** | 25,519 LOC (Frontend JavaScript/JSX) + 27 SQL Migrations |
| **Build Status** | **VERIFIED PASSING** (`npm run build` completed cleanly) |
| **Automated Test Coverage** | **VERIFIED PASSING** (80 automated tests across 9 test suites via Vitest) |

---

## 4. Key Architectural Conclusions

1. **Client-Heavy Architecture:** The frontend directly interacts with PostgreSQL via PostgREST and `@supabase/supabase-js`. Business logic, role checks, and UI rendering are predominantly client-side, making **PostgreSQL Row Level Security (RLS)** the sole security boundary.
2. **Critical Privilege Escalation Flaw:** The Supabase Auth registration trigger (`handle_new_user`) trusts the client-provided `raw_user_meta_data->>'role'`, allowing unauthorized creation of Admin accounts (see [SEC-001](./SECURITY/SECURITY_FINDINGS.md#SEC-001)).
3. **Manual Financial Workflow:** Fee payments and teacher salaries utilize offline UPI reference reconciliation (UTR matching + QR code upload) rather than an automated payment gateway webhook.
4. **YouTube Embedding Model:** Video delivery uses a custom iframe wrapper (`ProtectedVideoPlayer.jsx`) with custom controls and YouTube RSS feeds proxied via Netlify Functions. Videos are hosted on unlisted YouTube playlists rather than custom S3/CloudFront HLS streams.
