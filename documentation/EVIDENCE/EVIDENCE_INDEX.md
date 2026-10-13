# Evidence Index

Last Updated: 2026-10-13  
Platform: Thoughtful's Academy (Coaching Institute Portal)  
Repository: `/home/thoughtful/Downloads/coaching-institute-last`

---

## 1. Directory Overview

This directory preserves sanitized raw outputs, CLI execution logs, test outputs, and diagnostic traces captured during the platform audit. All secrets, private keys, database tokens, and personal student data have been redacted in accordance with the audit security protocol.

| Evidence File | Description | Execution Command | Result Status |
|---|---|---|---|
| [`TEST_LOGS/BUILD_LOG.txt`](./TEST_LOGS/BUILD_LOG.txt) | Full production build log from Vite & PWA bundler | `npm run build` | PASSED (0) |
| [`TEST_LOGS/LINT_LOG.txt`](./TEST_LOGS/LINT_LOG.txt) | ESLint static analysis run | `npm run lint` | PASSED (0) |
| [`TEST_LOGS/NPM_AUDIT_LOG.txt`](./TEST_LOGS/NPM_AUDIT_LOG.txt) | NPM package security audit and CVE report | `npm audit` | FAILED (1) - 19 CVEs |
| [`TEST_LOGS/ROUTE_CURL_LOG.txt`](./TEST_LOGS/ROUTE_CURL_LOG.txt) | Local HTTP endpoint and proxy curl probes | `curl -s -i ...` | VERIFIED |
| [`TEST_LOGS/SUPABASE_RLS_LOG.txt`](./TEST_LOGS/SUPABASE_RLS_LOG.txt) | Live PostgREST REST API and RLS verification log | `node -e "..."` | VERIFIED |
| [`BENCHMARKS/BUNDLE_ANALYSIS.txt`](./BENCHMARKS/BUNDLE_ANALYSIS.txt) | Rollup chunk size and gzip compression breakdown | `vite build` asset analysis | VERIFIED |

---

## 2. Verification Protocol

- **Build Tool:** Vite 5.4.10, Rollup 4.24.0, `@vitejs/plugin-react` 4.3.3
- **Linter:** ESLint 9.13.0 flat config with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`
- **Node.js Environment:** Linux x86_64, Node v20+
- **Database Engine:** Supabase PostgreSQL 15 via PostgREST / Realtime WebSocket
