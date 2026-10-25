# Master Documentation Index & Knowledge Base Sitemap

Last Updated: 2026-10-13  
Platform: Graviton Academy  
Coverage: 100% of discovered files, routes, tables, APIs, and findings

---

## 1. Top-Level Overview Documents

- [README.md](./README.md) — Knowledge base introduction and fast navigation
- [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) — Complete cross-referenced sitemap (this document)
- [ZERO_COST_300_USER_ARCHITECTURE_RESEARCH.md](./ZERO_COST_300_USER_ARCHITECTURE_RESEARCH.md) — Comprehensive zero-monthly-cost architecture research, 300-user concurrency benchmarks, and hybrid invalidation plan
- [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md) — Comprehensive technical overview, health, and executive findings
- [PLATFORM_BASELINE.md](./PLATFORM_BASELINE.md) — Authoritative baseline metrics, commit hashes, and status
- [AUDIT_METHODOLOGY.md](./AUDIT_METHODOLOGY.md) — Forensic audit criteria, tools, execution logs, and approach
- [AUDIT_SCOPE_AND_LIMITATIONS.md](./AUDIT_SCOPE_AND_LIMITATIONS.md) — Explicit boundaries, live vs mock checks, and third-party limitations
- [AUDIT_COMPLETION_REPORT.md](./AUDIT_COMPLETION_REPORT.md) — Final sign-off, resource verification, and shutdown protocol

---

## 2. Remediation & Independent Verification Reports (`REMEDIATION/`)

- [PHASE_3_INDEPENDENT_VERIFICATION_REPORT.md](./REMEDIATION/PHASE_3_INDEPENDENT_VERIFICATION_REPORT.md) — Independent security verification and 4-category deployment readiness gate report
- [REMEDIATION_EXECUTIVE_SUMMARY.md](./REMEDIATION/REMEDIATION_EXECUTIVE_SUMMARY.md) — High-level remediation outcomes, resolved vulnerabilities, and readiness
- [SECURITY_FINDINGS_STATUS.md](./REMEDIATION/SECURITY_FINDINGS_STATUS.md) — Forensic status matrix tracking SEC-001 through DATA-002
- [IMPLEMENTATION_LOG.md](./REMEDIATION/IMPLEMENTATION_LOG.md) — Step-by-step engineering changelog, migrations, diffs, and rationale
- [REGRESSION_TEST_RESULTS.md](./REMEDIATION/REGRESSION_TEST_RESULTS.md) — Automated Vitest test suite execution results, coverage, and evidence
- [REMAINING_RISKS.md](./REMEDIATION/REMAINING_RISKS.md) — Remaining technical risks, operational considerations, and defense-in-depth recommendations
- [DEPLOYMENT_AND_ROLLBACK.md](./REMEDIATION/DEPLOYMENT_AND_ROLLBACK.md) — Production deployment runbook, SQL migration application, and rollback steps

---

## 2.1. High-Capacity, Staging Validation & Realtime Optimization (`CAPACITY/`)

- [PHASE_6_FAST_RELEASE_READINESS_REPORT.md](./CAPACITY/PHASE_6_FAST_RELEASE_READINESS_REPORT.md) — Fast, zero-cost release readiness report for 300 concurrent users, verified fixes, and minimal manual checklist
- [PHASE_5_FINAL_VERIFICATION_AND_STAGING_READINESS.md](./CAPACITY/PHASE_5_FINAL_VERIFICATION_AND_STAGING_READINESS.md) — Comprehensive technical verification, 8-column object mapping, security regression audit, and staging readiness gate
- [STAGING_SETUP_AND_SAFETY.md](./CAPACITY/STAGING_SETUP_AND_SAFETY.md) — Staging isolation setup, production safety boundaries, and synthetic test cleanup
- [MIGRATION_027_VALIDATION.md](./CAPACITY/MIGRATION_027_VALIDATION.md) — Line-by-line index validation, schema integrity checks, and redundancy resolution
- [REALTIME_INTEGRATION_TEST_RESULTS.md](./CAPACITY/REALTIME_INTEGRATION_TEST_RESULTS.md) — Realtime channel multiplexing, role-based event isolation, and debouncing test evidence
- [LOAD_TEST_RESULTS.md](./CAPACITY/LOAD_TEST_RESULTS.md) — Staged concurrency load testing (5-100 users), query benchmarks, and acceptance criteria scorecard
- [SUPABASE_NETLIFY_QUOTA_AUDIT.md](./CAPACITY/SUPABASE_NETLIFY_QUOTA_AUDIT.md) — Authoritative free-tier quota inventory, measured consumption, and subsystem accounting
- [CAPACITY_BASELINE.md](./CAPACITY/CAPACITY_BASELINE.md) — Baseline architecture, current query bottlenecks, workload assumptions, and target matrix
- [REALTIME_ARCHITECTURE_AND_OPTIMIZATION.md](./CAPACITY/REALTIME_ARCHITECTURE_AND_OPTIMIZATION.md) — Realtime channel topology, multiplexing, event filters, and thundering herd mitigations
- [SUPABASE_FREE_TIER_CAPACITY_MODEL.md](./CAPACITY/SUPABASE_FREE_TIER_CAPACITY_MODEL.md) — Exact free-tier quotas, Little's Law modeling for 100-1000 users, and capacity ceilings
- [NETLIFY_PERFORMANCE_REPORT.md](./CAPACITY/NETLIFY_PERFORMANCE_REPORT.md) — Production bundle composition, cache control headers, edge caching, and 100GB bandwidth budget
- [OPTIMIZATION_CHANGELOG.md](./CAPACITY/OPTIMIZATION_CHANGELOG.md) — File-by-file changelog of all migrations, channel multiplexing, and config tweaks
- [CAPACITY_LIMITS_AND_RECOMMENDATIONS.md](./CAPACITY/CAPACITY_LIMITS_AND_RECOMMENDATIONS.md) — Maximum validated workloads, graceful degradation, and Pro scaling roadmap

---

## 3. Architecture & System Design (`ARCHITECTURE/`)

- [SYSTEM_OVERVIEW.md](./ARCHITECTURE/SYSTEM_OVERVIEW.md) — High-level system architecture, client-backend model, and topologies
- [TECHNOLOGY_STACK.md](./ARCHITECTURE/TECHNOLOGY_STACK.md) — Language, framework, bundler, and library versions
- [REPOSITORY_STRUCTURE.md](./ARCHITECTURE/REPOSITORY_STRUCTURE.md) — Directory layout, module boundaries, and file organization
- [APPLICATION_ENTRY_POINTS.md](./ARCHITECTURE/APPLICATION_ENTRY_POINTS.md) — Index.html, main.jsx, App.jsx, router roots, and lifecycle
- [COMPONENT_ARCHITECTURE.md](./ARCHITECTURE/COMPONENT_ARCHITECTURE.md) — Component hierarchy, layouts, design primitives, and state
- [FRONTEND_ARCHITECTURE.md](./ARCHITECTURE/FRONTEND_ARCHITECTURE.md) — State management, context providers, caching, and reactivity
- [BACKEND_ARCHITECTURE.md](./ARCHITECTURE/BACKEND_ARCHITECTURE.md) — PostgREST layer, Supabase Edge Functions, and Netlify Functions
- [REQUEST_LIFECYCLE.md](./ARCHITECTURE/REQUEST_LIFECYCLE.md) — End-to-end request flow from browser to PostgreSQL and CDN
- [DATA_FLOW.md](./ARCHITECTURE/DATA_FLOW.md) — Data flow patterns, mutation cycles, and websocket event propagation
- [AUTHENTICATION_AND_AUTHORIZATION.md](./ARCHITECTURE/AUTHENTICATION_AND_AUTHORIZATION.md) — Auth flow, JWT, session lifecycle, and RLS enforcement
- [EXTERNAL_INTEGRATIONS.md](./ARCHITECTURE/EXTERNAL_INTEGRATIONS.md) — YouTube, Web Push, Google Drive, and UPI integrations
- [BACKGROUND_JOBS_AND_EVENTS.md](./ARCHITECTURE/BACKGROUND_JOBS_AND_EVENTS.md) — Webhooks, push delivery, realtime broadcast channels
- [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE/ARCHITECTURE_DIAGRAMS.md) — Comprehensive collection of 12 Mermaid diagrams

---

## 3. Features & User Journeys (`FEATURES/`)

- [FEATURE_CATALOG.md](./FEATURES/FEATURE_CATALOG.md) — Master catalog of 24 identified features (FEAT-001 through FEAT-024)
- [FEATURE_STATUS_MATRIX.md](./FEATURES/FEATURE_STATUS_MATRIX.md) — Detailed status matrix with evidence and verification states
- [DOUBT_RESOLUTION_HUB.md](./FEATURES/DOUBT_RESOLUTION_HUB.md) — Authoritative system architecture, schema, role workflows, and verification for the Doubt Resolution Hub (FEAT-023)
- [USER_ROLES_AND_PERMISSIONS.md](./FEATURES/USER_ROLES_AND_PERMISSIONS.md) — Role definitions, matrix, and DB permission flags
- [USER_JOURNEYS.md](./FEATURES/USER_JOURNEYS.md) — Step-by-step journeys for Student, Teacher, Admin, and Guest
- [AUTHENTICATION_AND_ONBOARDING.md](./FEATURES/AUTHENTICATION_AND_ONBOARDING.md) — Deep dive into Sign-up, Sign-in, Password Reset, and Trial
- [STUDY_CARDS_AND_LECTURE_ROOM.md](./FEATURES/STUDY_CARDS_AND_LECTURE_ROOM.md) — Deep dive into Video Classroom, Saved Progress Resume, Playlists, and Doubts (FEAT-008, FEAT-009, FEAT-010, FEAT-024)
- [LIVE_CLASSES_AND_ATTENDANCE.md](./FEATURES/LIVE_CLASSES_AND_ATTENDANCE.md) — Deep dive into Live alerts, Self-check-in, Streaks, and Gauges
- [FEES_SALARIES_AND_ADMIN.md](./FEATURES/FEES_SALARIES_AND_ADMIN.md) — Deep dive into Manual UPI reconciliation and Payroll

---

## 4. Frontend Audit (`FRONTEND/`)

- [ROUTE_INVENTORY.md](./FRONTEND/ROUTE_INVENTORY.md) — Full route inventory (Public, Student, Teacher, Admin)
- [COMPONENT_INVENTORY.md](./FRONTEND/COMPONENT_INVENTORY.md) — Complete component catalog with line counts and dependencies
- [DESIGN_SYSTEM.md](./FRONTEND/DESIGN_SYSTEM.md) — Colors, typography, spacing, shadows, and design tokens
- [UI_UX_AUDIT.md](./FRONTEND/UI_UX_AUDIT.md) — Heuristic UX evaluation, friction points, and visual consistency
- [RESPONSIVE_BEHAVIOR.md](./FRONTEND/RESPONSIVE_BEHAVIOR.md) — Viewport audit (Mobile, Tablet, Desktop, Breakpoints)
- [ACCESSIBILITY_AUDIT.md](./FRONTEND/ACCESSIBILITY_AUDIT.md) — WCAG 2.2 AA audit, contrast, ARIA, and keyboard focus
- [FORM_AND_VALIDATION_INVENTORY.md](./FRONTEND/FORM_AND_VALIDATION_INVENTORY.md) — Input validation timing, regex, and error displays
- [FRONTEND_DEFECTS.md](./FRONTEND/FRONTEND_DEFECTS.md) — Catalog of UI bugs, broken states, and layout issues

---

## 5. Backend & Serverless Audit (`BACKEND/`)

- [API_CATALOG.md](./BACKEND/API_CATALOG.md) — Catalog of all PostgREST endpoints and serverless functions
- [ENDPOINT_REFERENCE.md](./BACKEND/ENDPOINT_REFERENCE.md) — Detailed HTTP request/response reference and input schemas
- [SERVICE_INVENTORY.md](./BACKEND/SERVICE_INVENTORY.md) — Client-side service modules and Supabase client abstractions
- [BUSINESS_LOGIC.md](./BACKEND/BUSINESS_LOGIC.md) — Business rules, validation boundaries, and transaction guarantees
- [ERROR_HANDLING.md](./BACKEND/ERROR_HANDLING.md) — Try/catch patterns, Supabase error parsing, and UI toasts
- [BACKGROUND_PROCESSING.md](./BACKEND/BACKGROUND_PROCESSING.md) — Edge function workers, triggers, and notification deliveries
- [BACKEND_DEFECTS.md](./BACKEND/BACKEND_DEFECTS.md) — Defect register for API, RPC, and backend logic

---

## 6. Database & Data Integrity (`DATABASE/`)

- [DATABASE_OVERVIEW.md](./DATABASE/DATABASE_OVERVIEW.md) — PostgreSQL engine, extensions, connection topology, and sizing
- [ENTITY_CATALOG.md](./DATABASE/ENTITY_CATALOG.md) — Comprehensive schema catalog for all 18 tables
- [RELATIONSHIPS_AND_CONSTRAINTS.md](./DATABASE/RELATIONSHIPS_AND_CONSTRAINTS.md) — Foreign keys, check constraints, and unique indices
- [ER_DIAGRAM.md](./DATABASE/ER_DIAGRAM.md) — Complete Mermaid Entity-Relationship Diagram
- [MIGRATION_HISTORY.md](./DATABASE/MIGRATION_HISTORY.md) — Audit of migrations 001 through 024, order, and idempotent patterns
- [DATA_INTEGRITY_AUDIT.md](./DATABASE/DATA_INTEGRITY_AUDIT.md) — Orphan records risk, denormalization, and cascade analysis
- [QUERY_AND_INDEX_AUDIT.md](./DATABASE/QUERY_AND_INDEX_AUDIT.md) — Index coverage, query patterns, and potential N+1 hotspots
- [DATA_LIFECYCLE.md](./DATABASE/DATA_LIFECYCLE.md) — Soft deletes vs hard deletes, retention, and archival policies

---

## 7. Security, Privacy & Compliance (`SECURITY/`)

- [SECURITY_OVERVIEW.md](./SECURITY/SECURITY_OVERVIEW.md) — Defensive posture, perimeter definition, and security score
- [THREAT_MODEL.md](./SECURITY/THREAT_MODEL.md) — STRIDE threat modeling and attack surfaces
- [AUTHORIZATION_AUDIT.md](./SECURITY/AUTHORIZATION_AUDIT.md) — Forensic audit of Row Level Security across all 18 tables
- [OWASP_REVIEW.md](./SECURITY/OWASP_REVIEW.md) — Evaluation against OWASP Top 10 Web Application Security Risks
- [PRIVACY_AND_DATA_PROTECTION.md](./SECURITY/PRIVACY_AND_DATA_PROTECTION.md) — Indian DPDP Act 2023 alignment, minor consent, and data retention
- [DEPENDENCY_SECURITY.md](./SECURITY/DEPENDENCY_SECURITY.md) — CVE analysis of the 19 reported npm vulnerabilities
- [SECURITY_FINDINGS.md](./SECURITY/SECURITY_FINDINGS.md) — Detailed register of vulnerabilities (SEC-001 through SEC-007)

---

## 8. Testing, QA & Coverage (`TESTING/`)

- [TESTING_OVERVIEW.md](./TESTING/TESTING_OVERVIEW.md) — State of QA infrastructure, missing frameworks, and risks
- [EXISTING_TEST_COVERAGE.md](./TESTING/EXISTING_TEST_COVERAGE.md) — Analysis of 0% automated test coverage in codebase
- [FEATURE_TEST_MATRIX.md](./TESTING/FEATURE_TEST_MATRIX.md) — Comprehensive manual test matrix covering 22 features
- [CRITICAL_USER_JOURNEYS.md](./TESTING/CRITICAL_USER_JOURNEYS.md) — Step-by-step verification flows for mission-critical paths
- [REGRESSION_TEST_PLAN.md](./TESTING/REGRESSION_TEST_PLAN.md) — Recommended regression suite for future releases
- [TEST_EXECUTION_RESULTS.md](./TESTING/TEST_EXECUTION_RESULTS.md) — Verified test results from live and static audit runs
- [KNOWN_TEST_GAPS.md](./TESTING/KNOWN_TEST_GAPS.md) — Prioritized register of test automation gaps (TEST-001)

---

## 9. Performance & Scalability (`PERFORMANCE_AND_SCALABILITY/`)

- [PERFORMANCE_BASELINE.md](./PERFORMANCE_AND_SCALABILITY/PERFORMANCE_BASELINE.md) — Bundle size, FCP, LCP, and memory footprint
- [BOTTLENECK_ANALYSIS.md](./PERFORMANCE_AND_SCALABILITY/BOTTLENECK_ANALYSIS.md) — Identified architectural and network bottlenecks
- [STUDENT_CAPACITY_ANALYSIS.md](./PERFORMANCE_AND_SCALABILITY/STUDENT_CAPACITY_ANALYSIS.md) — Concurrency tiers, database connection limits, and capacity
- [CONCURRENCY_MODEL.md](./PERFORMANCE_AND_SCALABILITY/CONCURRENCY_MODEL.md) — Realtime connection pooling, WebSocket limits, and PostgREST load
- [STORAGE_AND_BANDWIDTH.md](./PERFORMANCE_AND_SCALABILITY/STORAGE_AND_BANDWIDTH.md) — Video streaming bandwidth, Supabase Storage, and Netlify limits
- [SCALING_STRATEGY.md](./PERFORMANCE_AND_SCALABILITY/SCALING_STRATEGY.md) — Scale-up vs scale-out roadmap from 100 to 50,000 students
- [CAPACITY_BENCHMARK_PLAN.md](./PERFORMANCE_AND_SCALABILITY/CAPACITY_BENCHMARK_PLAN.md) — Load testing protocol (k6, Artillery) for future verification

---

## 10. Infrastructure & Operations (`INFRASTRUCTURE/` & `OPERATIONS/`)

- [DEPLOYMENT_ARCHITECTURE.md](./INFRASTRUCTURE/DEPLOYMENT_ARCHITECTURE.md) — Netlify CDN + Supabase BaaS deployment topology
- [ENVIRONMENT_CONFIGURATION.md](./INFRASTRUCTURE/ENVIRONMENT_CONFIGURATION.md) — Required environment variables, keys, and secret handling
- [INFRASTRUCTURE_INVENTORY.md](./INFRASTRUCTURE/INFRASTRUCTURE_INVENTORY.md) — Cloud services, external APIs, and domains
- [CI_CD_PIPELINE.md](./INFRASTRUCTURE/CI_CD_PIPELINE.md) — Build scripts, Netlify continuous deployment, and gaps
- [LOGGING_AND_MONITORING.md](./INFRASTRUCTURE/LOGGING_AND_MONITORING.md) — Activity logs, console telemetry, and lack of APM/Sentry
- [BACKUP_AND_RECOVERY.md](./INFRASTRUCTURE/BACKUP_AND_RECOVERY.md) — PostgreSQL WAL backups, disaster recovery, and RTO/RPO
- [OPERATIONAL_RUNBOOK.md](./INFRASTRUCTURE/OPERATIONAL_RUNBOOK.md) — Admin procedures, new batch onboarding, and emergency steps
- [LOCAL_DEVELOPMENT_SETUP.md](./OPERATIONS/LOCAL_DEVELOPMENT_SETUP.md) — Step-by-step local workstation setup guide
- [BUILD_AND_TEST_COMMANDS.md](./OPERATIONS/BUILD_AND_TEST_COMMANDS.md) — CLI reference for building, linting, and running
- [TROUBLESHOOTING.md](./OPERATIONS/TROUBLESHOOTING.md) — Common runtime and deployment errors with verified fixes
- [KNOWN_LIMITATIONS.md](./OPERATIONS/KNOWN_LIMITATIONS.md) — Platform architectural boundaries and constraints
- [HANDOVER_GUIDE.md](./OPERATIONS/HANDOVER_GUIDE.md) — Authoritative onboarding guide for developers and AI agents

---

## 11. Code Quality & Technical Debt (`CODE_QUALITY/`)

- [CODEBASE_HEALTH.md](./CODE_QUALITY/CODEBASE_HEALTH.md) — Static analysis, coupling, and modularity review
- [TECHNICAL_DEBT.md](./CODE_QUALITY/TECHNICAL_DEBT.md) — Quantified debt register, oversized components, and anti-patterns
- [DEPENDENCY_INVENTORY.md](./CODE_QUALITY/DEPENDENCY_INVENTORY.md) — Catalog of 37 dependencies and bundle impact
- [UNUSED_CODE_AND_ASSETS.md](./CODE_QUALITY/UNUSED_CODE_AND_ASSETS.md) — Analysis of unused shell scripts, orphaned assets, and dead paths
- [MAINTAINABILITY_RISKS.md](./CODE_QUALITY/MAINTAINABILITY_RISKS.md) — Risk factors affecting long-term upgrade velocity

---

## 12. Findings & Future Roadmap (`FINDINGS/` & `ROADMAP/`)

- [MASTER_FINDINGS_REGISTER.md](./FINDINGS/MASTER_FINDINGS_REGISTER.md) — Unified registry of all 32 findings across all categories
- [CRITICAL_AND_HIGH_PRIORITY.md](./FINDINGS/CRITICAL_AND_HIGH_PRIORITY.md) — High-risk vulnerabilities and release blockers
- [FUNCTIONAL_DEFECTS.md](./FINDINGS/FUNCTIONAL_DEFECTS.md) — Functional bugs and logic errors (BUG-001 - BUG-008)
- [SECURITY_FINDINGS.md](./FINDINGS/SECURITY_FINDINGS.md) — Security findings (SEC-001 - SEC-007)
- [PERFORMANCE_FINDINGS.md](./FINDINGS/PERFORMANCE_FINDINGS.md) — Performance findings (PERF-001 - PERF-005)
- [UX_FINDINGS.md](./FINDINGS/UX_FINDINGS.md) — User experience issues (UX-001 - UX-006)
- [PRIORITIZED_UPGRADE_ROADMAP.md](./ROADMAP/PRIORITIZED_UPGRADE_ROADMAP.md) — Phased implementation plan (P0 through P4)
- [ARCHITECTURAL_IMPROVEMENTS.md](./ROADMAP/ARCHITECTURAL_IMPROVEMENTS.md) — Architectural upgrade roadmap
- [UX_IMPROVEMENTS.md](./ROADMAP/UX_IMPROVEMENTS.md) — Visual polish and experience improvements
- [SECURITY_REMEDIATION.md](./ROADMAP/SECURITY_REMEDIATION.md) — Step-by-step remediation guide for vulnerabilities
- [SCALABILITY_ROADMAP.md](./ROADMAP/SCALABILITY_ROADMAP.md) — Capacity expansion milestones
- [REGRESSION_AND_RELEASE_GATES.md](./ROADMAP/REGRESSION_AND_RELEASE_GATES.md) — Quality gates required before future production releases

---

## 13. Master Registries (`REGISTRY/`)

- [MASTER_INVENTORY.md](./REGISTRY/MASTER_INVENTORY.md) — Comprehensive inventory of all codebase assets
- [ROUTE_REGISTRY.md](./REGISTRY/ROUTE_REGISTRY.md) — Registry of 27 distinct routes with role requirements
- [API_REGISTRY.md](./REGISTRY/API_REGISTRY.md) — Registry of all PostgREST and serverless API endpoints
- [COMPONENT_REGISTRY.md](./REGISTRY/COMPONENT_REGISTRY.md) — Registry of 73 components and shared widgets
- [DATABASE_REGISTRY.md](./REGISTRY/DATABASE_REGISTRY.md) — Registry of 18 tables, 6 RPC functions, and 24 migrations
- [INTEGRATION_REGISTRY.md](./REGISTRY/INTEGRATION_REGISTRY.md) — External third-party integrations and status
- [ENVIRONMENT_VARIABLE_REGISTRY.md](./REGISTRY/ENVIRONMENT_VARIABLE_REGISTRY.md) — Environment variable reference
- [DOCUMENTATION_COVERAGE.md](./REGISTRY/DOCUMENTATION_COVERAGE.md) — Audit completion and coverage validation matrix

---

## 14. Evidence Archive (`EVIDENCE/`)

- [EVIDENCE_INDEX.md](./EVIDENCE/EVIDENCE_INDEX.md) — Index of test logs and benchmarks
- [BUILD_LOG.txt](./EVIDENCE/TEST_LOGS/BUILD_LOG.txt) — Production build log
- [LINT_LOG.txt](./EVIDENCE/TEST_LOGS/LINT_LOG.txt) — Linter verification log
- [NPM_AUDIT_LOG.txt](./EVIDENCE/TEST_LOGS/NPM_AUDIT_LOG.txt) — Dependency vulnerability report
- [ROUTE_CURL_LOG.txt](./EVIDENCE/TEST_LOGS/ROUTE_CURL_LOG.txt) — HTTP route probe records
- [SUPABASE_RLS_LOG.txt](./EVIDENCE/TEST_LOGS/SUPABASE_RLS_LOG.txt) — Row Level Security test records
- [BUNDLE_ANALYSIS.txt](./EVIDENCE/BENCHMARKS/BUNDLE_ANALYSIS.txt) — Rollup bundle composition analysis
