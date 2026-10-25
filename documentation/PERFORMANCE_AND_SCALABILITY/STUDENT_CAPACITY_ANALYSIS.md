# Student Capacity Analysis & Scalability Thresholds

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Lead Auditor:** Principal Performance & Scalability Engineer  
**Objective:** Determine concurrent user thresholds and scaling ceilings across infrastructure tiers.  

---

## 1. Capacity Tiers & Sizing Matrix

| Infrastructure Tier | Monthly Cost | Max Enrolled Students | Peak Concurrent Users (CCU) | Database Disk / RAM | Connection Pooler Limit |
|---|:---:|:---:|:---:|:---:|:---:|
| **Tier 1: Free Starter** (Current) | $0 / mo | **500 - 1,000** | **150 - 200** | 500 MB / 1 GB RAM | 60 direct / 200 pooled |
| **Tier 2: Pro Production** | $25 / mo | **5,000 - 15,000** | **1,500 - 2,500** | 8 GB+ / 4 GB RAM | 250 direct / 500 pooled |
| **Tier 3: Enterprise Distributed**| $250+ / mo | **50,000+** | **10,000+** | Dedicated Compute | Auto-scaling Pooler + Replicas |

---

## 2. Resource Sizing & Load Mathematics

### 2.1 Database Storage Sizing per Student
Average annual storage consumption per enrolled student:
- `student_profiles`: 0.5 kB
- `attendance`: 200 school days x 0.15 kB = 30 kB / year
- `fee_records`: 12 months x 0.2 kB = 2.4 kB / year
- `homework_submissions`: 50 submissions x 0.4 kB = 20 kB / year
- `messages` & doubt threads: ~50 kB / year
- **Total Storage Consumption per Student:** $pprox \mathbf{105 	ext{ kB / student / year}}$.
- **Analysis:** A 500 MB database accommodates approximately **4,700 student-years** of relational data before reaching storage ceilings.

### 2.2 Network Bandwidth & Egress Calculations
Because video streaming is hosted on YouTube and PDFs are hosted on Google Drive:
- Average student API session generates approximately 15 PostgREST JSON queries $pprox$ 45 kB per active day.
- For 1,000 daily active students:
  $$1,000 	imes 45 	ext{ kB} = 45 	ext{ MB / day} pprox \mathbf{1.35 	ext{ GB / month}}$$
- **Result:** Well within the 5 GB free egress limit of Supabase.

---

## 3. Concurrency Ceiling: Morning Check-in Spike

### 3.1 Peak Traffic Modeling
- **Scenario:** 8:30 AM to 9:00 AM window where 500 students log into the mobile PWA to check schedules, enter attendance, and download daily assignments.
- **Connection Demand:** With 200 pooled connections in Supavisor, each query executing in ~25ms yields a throughput capacity of:
  $$	ext{Throughput} = rac{200 	ext{ connections}}{0.025 	ext{ seconds}} = \mathbf{8,000 	ext{ queries / second}}$$
- **Verdict:** The Supabase PostgREST layer is more than sufficient for 1,000 active students, provided composite indexes (`QUERY_AND_INDEX_AUDIT.md`) are deployed to prevent long-running sequential scans.
