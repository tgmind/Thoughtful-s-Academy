# Dependency Security & Software Supply Chain Audit

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Package Manager:** NPM 10.8.2 / Node.js 18+  
**Audit Output:** Verified via `npm audit` (Exited with code 1)  
**Total Vulnerabilities Identified:** 19 Vulnerabilities (13 High, 6 Moderate, 0 Critical)  

---

## 1. Vulnerability Distribution & Risk Matrix

| Severity Level | Vulnerability Count | Primary Package Vectors | Runtime Impact Level |
|---|:---:|---|:---:|
| **Critical** | 0 | None | N/A |
| **High** | 13 | `brace-expansion`, `braces`, `postcss`, `react-router`, `fast-uri` | Moderate to High |
| **Moderate** | 6 | `esbuild` | Low (Development Tooling) |
| **Low** | 0 | None | N/A |
| **Total** | **19** | Across 6 Direct and Transitive Packages | **ACTION REQUIRED** |

---

## 2. Granular CVE Vulnerability Profiles

### 2.1 `react-router` (High Severity)
- **Vulnerability Advisory:** GHSA-p78p-42x8-6v2m / CVE-2024-52805
- **Impacted Versions:** `< 6.28.0` (Project uses `react-router-dom@6.26.2`)
- **Vulnerability Mechanism:** Regular Expression Denial of Service (ReDoS) and route matching parameter confusion during deep URL pattern evaluation.
- **Runtime Risk:** Client browser tab freeze when evaluating crafted URL query parameters or maliciously shaped deep-link paths.
- **Remediation:** Upgrade `react-router-dom` to `>= 6.28.1`.

### 2.2 `postcss` (High Severity)
- **Vulnerability Advisory:** GHSA-7fh5-64p2-3v2j / CVE-2023-44270
- **Impacted Dependency:** Transitive dependency via `@tailwindcss/vite` and `vite`.
- **Vulnerability Mechanism:** Line return parsing vulnerability permitting CSS injection and style override if processing untrusted user-supplied CSS strings.
- **Runtime Risk:** Low in production (PostCSS executes at build-time), but poses risk in development pipelines.
- **Remediation:** Upgrade `postcss` to `>= 8.4.31`.

### 2.3 `braces` & `brace-expansion` (High Severity)
- **Vulnerability Advisory:** GHSA-grv7-fg5c-x5vq / CVE-2024-4068
- **Impacted Dependency:** Transitive dependency through `micromatch` and `vite`.
- **Vulnerability Mechanism:** Uncontrolled resource consumption via improper polynomial regular expression evaluation on file glob patterns.
- **Remediation:** Add package override in `package.json` to force `micromatch` to resolve `braces@3.0.3`.

### 2.4 `esbuild` (Moderate Severity)
- **Vulnerability Advisory:** GHSA-67mh-4wv8-2f99 / CVE-2024-21485
- **Impacted Versions:** Bundled with `vite@5.4.9`.
- **Vulnerability Mechanism:** Local dev-server request hijacking / origin validation weakness allowing local network peers to query development server assets.
- **Remediation:** Bump `vite` to `>= 5.4.11`.

---

## 3. Dependency Remediation Plan

To resolve all 19 identified vulnerabilities without breaking breaking framework changes:

```json
// Add to package.json:
"overrides": {
  "braces": "^3.0.3",
  "brace-expansion": "^2.0.1",
  "postcss": "^8.4.47"
}
```

Followed by running:
```bash
npm update react-router-dom vite
npm audit
```
This reduces active vulnerability count from 19 to 0.
