# Security Findings Register & Vulnerability Index

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Cross-Reference:** See `documentation/SECURITY/SECURITY_FINDINGS.md` for complete CVSS attack vectors.  
**Total Documented Vulnerabilities:** 7 Security Findings (`SEC-001` through `SEC-007`)  

---

## 1. Master Security Findings Summary

| Finding ID | Severity | CVSS v3.1 | Title / Summary | Vulnerable Component |
|---|:---:|:---:|---|---|
| `SEC-001` | **P0 Critical** | **9.8** | Client-Controlled Role Assignment via User Metadata | `014_handle_new_user.sql` |
| `SEC-002` | **P0 Critical** | **9.0** | Stored Cross-Site Scripting (XSS) in Batch Details | `BatchDetails.jsx:532` |
| `SEC-003` | **P0 Critical** | **9.1** | Unconstrained Column Updates via PostgREST RLS Policies | `002_rls_policies.sql:64` |
| `SEC-004` | **P1 High** | **7.5** | Bundled Administrative Invite Secret in Public JS Bundle | `Register.jsx:18` |
| `SEC-005` | **P2 Medium** | **5.3** | Absence of Rate Limiting on Netlify Proxy Endpoint | `youtube-playlist.js` |
| `SEC-006` | **P1 High** | **7.5** | Insecure Direct Access to Private Video Study Rooms | `App.jsx:92` (`/watch/:cardId`) |
| `SEC-007` | **P1 High** | **7.5** | 19 Unpatched Known Vulnerabilities in NPM Dependency Tree | `package.json` |

---

## 2. Immediate Remediation Action Plan

1. **Sprint 1 (Immediate Hotfix):**
   - Modify `handle_new_user()` to strictly ignore user metadata for role assignment (`SEC-001`).
   - Sanitize `activeBatch.detailed_info` via `DOMPurify` (`SEC-002`).
   - Deploy `BEFORE UPDATE` column protection triggers on `profiles` and `teacher_profiles` (`SEC-003`).
2. **Sprint 2 (Release Gate):**
   - Remove `VITE_ADMIN_CODE` from the frontend environment (`SEC-004`).
   - Wrap `/watch/:cardId` in `<RoleRoute>` (`SEC-006`).
   - Update `package.json` overrides to patch all 19 NPM vulnerabilities (`SEC-007`).
