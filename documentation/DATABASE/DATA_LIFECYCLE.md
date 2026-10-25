# Data Lifecycle, Retention & Archival Policies

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Regulatory Context:** India Digital Personal Data Protection (DPDP) Act 2023 & Indian Income Tax Act (Sec 44AA)  
**Database Engine:** PostgreSQL 15.6  

---

## 1. Current Deletion Architecture vs Regulatory Mandates

### 1.1 Existing System Behavior
The current database relies predominantly on **Hard Deletions (`ON DELETE CASCADE`)**:
- Deleting an enrolled student immediately wipes their entire historical attendance logs and fee receipts from the database.
- Deleting a batch immediately purges all associated curriculum study cards, homework assignments, and activity logs.

### 1.2 Statutory Compliance Conflict
- **Financial Audit Requirements:** Under Indian commercial law, fee collection receipts and payroll disbursements must be preserved for a minimum of **7 financial years**. Hard deleting `fee_records` or `salary_records` creates immediate regulatory non-compliance.
- **DPDP Act 2023:** Requires platforms to provide data erasure upon request ("Right to Erasure"), but permits retention of financial transaction records for statutory obligations.

---

## 2. Recommended Data Lifecycle & Retention Matrix

| Entity Category | Recommended Retention Period | Target Deletion Mode | Justification |
|---|:---:|:---:|---|
| **Fee & Salary Records** | **7 Years** | Immutable Soft-Delete | Statutory Indian tax audit & financial dispute resolution |
| **Attendance Records** | **3 Years** | Soft-Delete -> Archive | Academic verification, certificate issuance |
| **Curriculum & Study Cards** | Permanent / Active | Soft-Delete (`is_active = false`) | Course re-use across academic years |
| **Student Homework Submissions** | 1 Academic Year | Automated Cold Storage Purge | Minimize object storage costs |
| **Direct Messages (Chats)** | 1 Year | Soft-Delete | Child safety compliance & inquiry audit trail |
| **System Activity Logs** | 90 Days | Automated Rotation Table | Operational security monitoring & incident response |
| **Push Subscriptions** | Ephemeral / Active | Hard Delete on HTTP 404/410 | Self-healing dead endpoint pruning |

---

## 3. Backup & Disaster Recovery Strategy

### 3.1 Automated Managed Backups
- **Continuous WAL Archiving:** Managed by Supabase Cloud via `WAL-G` to AWS S3.
- **Daily Snapshots:** Full daily database volume snapshots with 7-day retention on standard tiers (30-day on Enterprise).

### 3.2 Manual Disaster Recovery Logical Dump
To export a disaster recovery snapshot locally:
```bash
pg_dump -h db.<supabase-project-id>.supabase.co   -U postgres   -d postgres   -F c   -b -v   -f thoughtful_academy_backup_$(date +%Y%m%d).dump
```
