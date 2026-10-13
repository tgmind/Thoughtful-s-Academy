# Known Testing Gaps & Quality Assurance Deficit Analysis

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Lead Auditor:** Principal QA Automation Engineer & Platform Forensic Specialist  
**Deficit Summary:** 100% Manual Testing Dependency across all 22 Platform Features  

---

## 1. Master Testing Gaps Register

| Gap ID | Severity | Category | Area / Subsystem | Risk Description |
|---|:---:|---|---|---|
| `TEST-001` | **P1 High** | Unit Testing | Utility functions, hooks, math | Zero unit tests for formatters, roll number parsers, video timestamp calculations |
| `TEST-002` | **P1 High** | Integration Testing | PostgREST & Database Triggers | No automated tests validating `handle_new_user()` roll number sequence behavior |
| `TEST-003` | **P1 High** | End-to-End Testing | Critical User Journeys | No Playwright tests covering student enrollment, UTR fee submissions, or grading |
| `TEST-004` | **P2 Medium** | Load & Concurrency | PostgREST / Supabase Pooling | No load testing validating 500+ concurrent morning attendance check-ins |
| `TEST-005` | **P2 Medium** | Security Automation | RLS Policies & Injection | No automated test asserting that unauthorized users are blocked from table writes |
| `TEST-006` | **P2 Medium** | Accessibility Automation | WCAG 2.2 Level AA | No automated `axe-core` CI checks verifying color contrast and missing ARIA labels |
| `TEST-007` | **P3 Low** | Visual Regression | Responsive Layouts | No automated screenshot comparison testing across mobile, tablet, and desktop |

---

## 2. In-Depth Quality Risk Analysis

### 2.1 Lack of Unit Tests for Core Calculations (`TEST-001`)
- **Vulnerable Code:** `src/utils/formatters.js`, `src/utils/youtube.js`, `src/hooks/useNavBadges.js`.
- **Consequence:** Refactoring date parsing, Indian currency formatting (e.g., `₹ 2,500`), or YouTube duration parsing could break UI calculations silently without triggering compiler errors.

### 2.2 Lack of End-to-End Test Automation (`TEST-003`)
- **Vulnerable Workflows:** Registration -> Login -> Batch Selection -> Fee Payment -> Admin Approval.
- **Consequence:** Manual smoke testing requires approximately 45-60 minutes per release. Any emergency hotfix risks deploying broken user journeys to live students.

---

## 3. Targeted Test Harness Implementation Blueprint

```mermaid
graph TD
    subgraph Phase 1 [Immediate Bootstrap]
        P1[Install Vitest & React Testing Library]
        P2[Unit Tests for utils/formatters.js & youtube.js]
        P3[Component Tests for CustomSelect & Skeleton]
    end
    subgraph Phase 2 [Integration & Security]
        P4[Supabase Local Test DB with Supabase CLI]
        P5[Automated RLS Policy Verification Tests]
        P6[Roll Number Concurrency Tests]
    end
    subgraph Phase 3 [End-to-End Automation]
        P7[Install Playwright]
        P8[E2E Suite: CUJ-01 Student Enrollment]
        P9[E2E Suite: CUJ-02 Fee Payment & Reconciliation]
    end
    Phase 1 --> Phase 2 --> Phase 3
```
