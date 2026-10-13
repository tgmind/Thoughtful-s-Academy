# Privacy, PII Protection & DPDP Act 2023 Compliance Audit

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Jurisdiction:** Republic of India  
**Regulatory Standard:** Digital Personal Data Protection (DPDP) Act, 2023  
**Auditor:** Legal-Tech & Data Privacy Compliance Auditor  
**Compliance Rating:** Partially Compliant (Mandatory Enhancements Required for Minor Data)  

---

## 1. Personally Identifiable Information (PII) Inventory

The platform processes sensitive educational and financial personal data across multiple database entities:

| Data Subject | PII Attribute | Database Location | Sensitivity Level | Purpose of Processing |
|---|---|---|:---:|---|
| **Student (Minor)** | Full Legal Name | `public.profiles.full_name` | Moderate | Academic identification |
| **Student (Minor)** | Date of Birth | `public.student_profiles.date_of_birth` | High | Age verification / Class eligibility |
| **Student (Minor)** | Personal & Guardian Phone | `profiles.phone`, `student_profiles.parent_phone` | High | SMS/WhatsApp attendance alerts & emergency contact |
| **Student (Minor)** | Residential Postal Address | `public.student_profiles.address` | High | Enrollment records & study kit dispatch |
| **Student (Minor)** | Attendance & Progress Records | `public.attendance`, `user_card_progress` | Moderate | Academic tracking & streak calculations |
| **Student / Parent** | UPI UTR Transaction Reference | `public.fee_records.utr_number` | Moderate | Tuition fee payment reconciliation |
| **Faculty (Teacher)** | Bank Account & IFSC Code | `public.teacher_profiles.account_number` | High | Monthly salary direct bank disbursement |
| **Faculty (Teacher)** | Faculty UPI VPA | `public.teacher_profiles.upi_id` | Moderate | Payout reconciliation |

---

## 2. DPDP Act 2023 Section 9 Compliance: Processing Children's Personal Data

Section 9 of the DPDP Act 2023 establishes stringent statutory mandates for platforms serving individuals under 18 years of age:

### 2.1 Verifiable Parental Consent (Section 9(1))
- **Statutory Mandate:** A Data Fiduciary must obtain verifiable consent from the parent or lawful guardian before processing any personal data of a child.
- **Current Audit Finding:** **NON-COMPLIANT.** The student registration form (`src/pages/Register.jsx`) allows any student to sign up directly by providing an email and parent phone number. No SMS OTP verification, guardian digital signature, or consent agreement checkbox is implemented.
- **Remediation:** Introduce an SMS OTP verification step sent to `parent_phone` during onboarding to establish verifiable parental consent.

### 2.2 Prohibition on Tracking & Behavioral Monitoring (Section 9(2))
- **Statutory Mandate:** A Data Fiduciary shall not undertake tracking or behavioral monitoring of children or direct targeted advertising at them.
- **Current Audit Finding:** **COMPLIANT.** The platform does not incorporate third-party advertising SDKs, tracking pixels (e.g., Meta Pixel, Google Analytics remarketing), or behavioral profiling algorithms. Analytics are strictly internal academic performance metrics.

---

## 3. Data Protection Principles & Rights of Data Principals

### 3.1 Right to Erasure & Correction (Section 12)
- Students and parents have the statutory right to request erasure of their personal data.
- **Finding:** While the admin interface allows deleting student profiles, the deletion fails to cascade to Supabase `auth.users` (`DATA-001`), leaving the student's email address permanently retained in internal auth tables.

### 3.2 Security Safeguards (Section 8(5))
- **Encryption in Transit:** Enforced via TLS 1.3 across all endpoints.
- **Encryption at Rest:** Enforced at the hardware and volume layer (AES-256) on Supabase AWS Mumbai infrastructure.
- **Access Restrictions:** Strict RLS policies ensure that students cannot view peer residential addresses, guardian phone numbers, or fee transaction histories.

---

## 4. Privacy Roadmap & Legal Action Items

1. **Publish Privacy Policy & Terms:** Author and link a formal DPDP-compliant Privacy Policy on `/privacy` and the landing page footer.
2. **Guardian Verification Gate:** Require parent phone OTP confirmation during student account creation.
3. **Data Protection Officer (DPO) Contact:** Publish a grievance redressal contact email in platform footers as mandated by Indian law.
