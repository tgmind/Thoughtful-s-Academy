# Horizontal & Vertical Scaling Strategy

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Target Growth Horizon:** 500 to 50,000+ Active Students  
**Lead Architect:** Principal Systems Architect & Performance Specialist  

---

## 1. Multi-Phase Scaling Architecture

```mermaid
graph TD
    subgraph Phase 1 [0 - 1,000 Students: Free Tier Optimized]
        P1[Deploy B-Tree Secondary Indexes]
        P2[Client TanStack Query Caching]
        P3[Fix Roll Number Concurrency Race]
    end
    subgraph Phase 2 [1,000 - 5,000 Students: Pro Compute]
        P4[Upgrade to Supabase Pro $25/mo]
        P5[Virtualize Teacher DOM Lists]
        P6[Automated 90-Day Log Archival]
    end
    subgraph Phase 3 [5,000 - 25,000 Students: Hybrid BaaS]
        P7[Integrate Razorpay Webhooks]
        P8[Upstash Redis for Public Catalog Cache]
        P9[Deno Edge Microservices for Heavy Aggs]
    end
    subgraph Phase 4 [25,000+ Students: High-Availability]
        P10[PostgreSQL Read Replicas]
        P11[Multi-Region Disaster Recovery]
    end
    Phase 1 --> Phase 2 --> Phase 3 --> Phase 4
```

---

## 2. Phase-by-Phase Technical Execution Matrix

### 2.1 Phase 1: Immediate Optimization (0 - 1,000 Students)
- **Primary Goal:** Eliminate sequential table scans and client request redundancy without increasing operational expenditure.
- **Actions:**
  1. Apply `025_add_performance_indexes.sql` to index foreign keys (`batch_id`, `student_id`).
  2. Implement TanStack Query in the React SPA to cache `.from('batches')` queries in memory for 5 minutes.
  3. Replace `COUNT(*) + 1` in `handle_new_user()` with advisory locks or sequences.

### 2.2 Phase 2: Compute Expansion (1,000 - 5,000 Students)
- **Primary Goal:** Prevent connection starvation during morning check-ins and eliminate mobile rendering lag.
- **Actions:**
  1. Upgrade to Supabase Pro Tier (\$25/month) to unlock 250 direct / 500 pooled connections and daily automated WAL-G backups.
  2. Refactor `TeacherStudySection.jsx` using `@tanstack/react-virtual` to limit active DOM nodes to visible viewports.
  3. Partition `activity_logs` by academic quarter and purge historical entries beyond 90 days.

### 2.3 Phase 3: Automated Financial Infrastructure (5,000 - 25,000 Students)
- **Primary Goal:** Remove administrative human bottlenecks in tuition fee reconciliation.
- **Actions:**
  1. Transition from manual UPI UTR matching to automated payment gateway webhooks (Razorpay / Cashfree / PhonePe Payment Gateway).
  2. Webhook triggers an Edge Function that automatically marks `fee_records` as `approved` and sends instant Web Push confirmation.
  3. Introduce server-side Redis caching for public course catalogs and batch schedules.

### 2.4 Phase 4: High-Availability & Read Replication (25,000+ Students)
- **Primary Goal:** 99.99% uptime with sub-50ms query response times across pan-India geographies.
- **Actions:**
  1. Deploy PostgreSQL read replicas to serve student query traffic (reading study cards, attendance history, homework instructions), preserving primary database compute strictly for writes.
  2. Enable Point-In-Time Recovery (PITR) with continuous S3 WAL streaming.
