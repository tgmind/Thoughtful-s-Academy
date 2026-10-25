# Backup, Disaster Recovery & Business Continuity Plan

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Lead Architect:** Principal Site Reliability Engineer  
**Target SLAs:** RPO < 1 Hour | RTO < 30 Minutes  

---

## 1. Recovery Objectives & Backup Schedule

| Objective | Target SLA | Implementation Mechanism |
|---|:---:|---|
| **Recovery Point Objective (RPO)** | **< 1 Hour** | Continuous WAL Archiving to AWS S3 (Supabase Pro) |
| **Recovery Time Objective (RTO)** | **< 30 Mins** | Automated Snapshot Restoration or `pg_restore` |
| **Code & Schema Recovery** | **Zero Loss** | Git Version Control on GitHub (`main` branch) |

---

## 2. Backup Architecture & Methodologies

### 2.1 Managed Physical Backups (Supabase Cloud)
- **Continuous Archiving:** PostgreSQL Write-Ahead Logs (WAL) are streamed continuously to S3.
- **Daily Snapshots:** Full automated daily volume snapshots maintained with 7-day rolling retention.
- **Point-in-Time Recovery (PITR):** Enables restoring the database to any specific second within the last 7 days.

### 2.2 Manual Logical Cold Backup Procedure
Institute administrators should execute an encrypted logical dump prior to major semester rollouts or bulk user imports:

```bash
# Export compressed PostgreSQL logical backup
pg_dump -h db.<supabase-project-id>.supabase.co   -U postgres   -d postgres   -F c   -b -v   -f thoughtful_academy_backup_$(date +%Y%m%d_%H%M%S).dump
```

---

## 3. Disaster Restoration Runbook

In the event of accidental database corruption, catastrophic table deletion, or compromised administrative credentials:

### Step 1: Provision Clean Database Target
If the primary project is compromised, provision a new Supabase project or local database container.

### Step 2: Restore Schema & Data
```bash
# Restore entire database from compressed archive
pg_restore -h db.<target-project-id>.supabase.co   -U postgres   -d postgres   -v   --clean   --if-exists   thoughtful_academy_backup_<timestamp>.dump
```

### Step 3: Verify Integrity & Consistency Post-Restore
Run verification queries to assert relational integrity:
```sql
SELECT 'profiles' AS tbl, count(*) FROM public.profiles
UNION ALL SELECT 'batches', count(*) FROM public.batches
UNION ALL SELECT 'study_cards', count(*) FROM public.study_cards
UNION ALL SELECT 'fee_records', count(*) FROM public.fee_records;
```

### Step 4: Re-point Frontend Environment Variables
Update `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify Site Configuration and trigger a redeploy.
