# OWASP Top 10 Security Verification & Risk Analysis

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Standard Evaluated:** OWASP Top 10:2021 Web Application Security Risks  
**Auditor:** Principal Cybersecurity Auditor  
**Overall Security Posture:** High Risk (3 Critical OWASP Violations Identified)  

---

## 1. OWASP Top 10 Compliance Scorecard

| OWASP Category | Vulnerability Identified | Compliance Status | Severity | Finding Reference |
|---|---|:---:|:---:|---|
| **A01: Broken Access Control** | Client-Controlled Role Assignment & Unconstrained Column Updates | **NON-COMPLIANT** | **P0 Critical** | `SEC-001`, `SEC-003`, `BUG-001` |
| **A02: Cryptographic Failures** | Public Bundle Leak of Administrative Invite Code Secret | **NON-COMPLIANT** | **P1 High** | `SEC-004` |
| **A03: Injection (XSS)** | Stored Cross-Site Scripting via `dangerouslySetInnerHTML` in Batch Details | **NON-COMPLIANT** | **P0 Critical** | `SEC-002` |
| **A04: Insecure Design** | Unlisted YouTube Embeds as Sole Anti-Piracy Architecture | **AT RISK** | **P2 Medium** | Architecture Section |
| **A05: Security Misconfiguration** | Unrestricted CORS (`*`) and Missing Rate Limits on Serverless Function | **NON-COMPLIANT** | **P2 Medium** | `BED-007` |
| **A06: Vulnerable & Outdated Components** | 19 Known CVEs in Project NPM Dependency Tree (13 High, 6 Moderate) | **NON-COMPLIANT** | **P1 High** | `SEC-007` |
| **A07: Identification & Auth Failures** | Absence of Multi-Factor Authentication (MFA) for Administrative Roles | **AT RISK** | **P2 Medium** | Auth Architecture |
| **A08: Software & Data Integrity Failures** | External YouTube Iframe Script Injection without Subresource Integrity (SRI) | **AT RISK** | **P3 Low** | `src/utils/youtubeApiLoader.js` |
| **A09: Security Logging & Monitoring Failures** | No Real-Time Security Incident Monitoring, SIEM, or Sentry Crash Reporting | **AT RISK** | **P2 Medium** | Infrastructure Section |
| **A10: Server-Side Request Forgery (SSRF)** | Netlify Serverless Proxy Performs Arbitrary Video ID Scrape on YouTube | **COMPLIANT** | **P3 Low** | Hardcoded YouTube Target URL |

---

## 2. Detailed OWASP Risk Analysis

### 2.1 A01: Broken Access Control
- **Analysis:** PostgREST database policies constitute the primary authorization perimeter. However, because `handle_new_user()` allows client-submitted roles, and `profiles: own update` allows updating the `role` column without restriction, any user can promote themselves to administrator.
- **Remediation:** Enforce server-side role assignment and deploy column protection triggers.

### 2.2 A02: Cryptographic Failures
- **Analysis:** Transport security is properly enforced via TLS/HTTPS, and password hashes use bcrypt via pgcrypto. However, the application bundles the administrative secret key `VITE_ADMIN_CODE` directly into the client-side JavaScript bundle, making it trivial to extract via simple string searches.
- **Remediation:** Remove `VITE_ADMIN_CODE` from the frontend environment; require invite tokens to be validated server-side against an administrative invite table.

### 2.3 A03: Injection (Stored XSS)
- **Analysis:** In `src/pages/BatchDetails.jsx` line 532, `activeBatch.detailed_info` is rendered directly into the DOM using `dangerouslySetInnerHTML`. Because administrators can enter raw HTML in `AdminBatchDetails.jsx`, any malicious script tag or event handler (`<img src=x onerror=...>`) stored in the database executes with full privileges in the browser of visiting students and administrators.
- **Remediation:** Sanitize all rich text payloads with `DOMPurify` prior to DOM injection.

### 2.4 A06: Vulnerable and Outdated Components
- **Analysis:** Execution of `npm audit` reveals 19 active vulnerabilities across production and development dependencies:
  - 13 High-severity vulnerabilities in `brace-expansion`, `braces`, `postcss`, `react-router`, and `fast-uri`.
  - 6 Moderate-severity vulnerabilities in `esbuild`.
- **Remediation:** Execute `npm update` and bump patched dependencies to clean the dependency tree.
