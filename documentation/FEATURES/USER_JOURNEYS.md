# End-to-End User Journeys

Audit Date: 2026-10-13  
Platform: Thoughtful's Academy

---

## 1. Student User Journey

```mermaid
journey
    title Student End-to-End Daily Learning Experience
    section Discovery & Onboarding
      Browse Homepage & Batch Posters: 5: Student
      Register Account & Choose Batch: 4: Student
      Receive 2-Day Free Trial & Roll Number: 5: Student
    section Daily Morning Check-in
      Log In to Portal: 5: Student
      Mark Self-Attendance: 5: Student
      View Updated Streak Flame & Progress Gauge: 5: Student
    section Academic Study
      Hear Live Class Chime & Join Live Session: 4: Student
      Open Batch Study Section: 5: Student
      Stream Lecture in Protected Player: 5: Student
      Submit Timestamped Doubt on Video: 4: Student
    section Homework & Fees
      Submit Homework Drive Link: 4: Student
      Review Teacher Grade & Feedback: 5: Student
      Pay Monthly Fee via UPI QR & Submit UTR: 3: Student
```

### Detailed Steps:
1. **Onboarding:** Student visits `/`, navigates running batches, views batch syllabus on `/batch-details`, clicks "Register", inputs personal details, and selects batch subjects. The database creates a `student_profiles` row with a generated roll number (`2026-JEE-001`) and sets `trial_ends_at` to 48 hours in the future.
2. **Daily Routine:** Student logs in, checks in attendance via one click on `/student/dashboard`. If the student attended yesterday, the streak counter increments by 1.
3. **Classroom & Video:** Student opens `/student/study`, selects a subject chapter, and enters `/student/watch/:cardId`. The video plays with custom speed (1.5x) and clean mode enabled. If a doubt arises at 14:32, the student types a question in the "Ask Doubt" tab; this creates a message with timestamp `[14:32]` sent directly to the assigned teacher.
4. **Homework Submission:** Student opens `/student/homework`, finds the active assignment, pastes their Google Drive link, and submits. Once graded by faculty, an in-app announcement notification pops up alerting them to review feedback.
5. **Fee Payment:** Student navigates to `/student/pay-fee`, scans the institute's UPI QR code using PhonePe, transfers ₹2,500, inputs the 12-digit UTR reference ID, and submits for verification.

---

## 2. Faculty / Teacher User Journey

```mermaid
journey
    title Faculty Teaching & Content Management Workflow
    section Onboarding & Schedule
      Log In to Teacher Portal: 5: Teacher
      Review Assigned Batches: 5: Teacher
    section Live Session Delivery
      Launch Live Class (Enter Zoom URL): 4: Teacher
      Broadcast Instant Realtime Alert: 5: Teacher
      Conclude Class Session: 4: Teacher
    section Content & Assignments
      Add New Study Card (YouTube Playlist / PDF): 4: Teacher
      Assign Chapter Homework with Due Date: 4: Teacher
      Open Homework Submissions Drawer: 4: Teacher
      Assign Grades & Inline Feedback: 5: Teacher
    section Doubt Support & Payroll
      Answer Student Doubts in Chat: 5: Teacher
      Review Monthly Salary Status & Payment Reference: 4: Teacher
```

---

## 3. Administrator Governance Journey

```mermaid
journey
    title Institute Administrator Governance Workflow
    section Operations
      Review Daily Stats & At-Risk Attendance: 4: Admin
      Create New Academic Batch & Upload Poster: 4: Admin
      Assign Multiple Teachers to Batch: 4: Admin
    section Financial Control
      Audit Pending Fee Submissions: 4: Admin
      Cross-Check UTR with Bank Statement: 3: Admin
      Approve Legitimate Fee Records: 5: Admin
      Reject Fraudulent Submissions with Reason: 4: Admin
      Disburse Faculty Salaries & Record UTR: 4: Admin
    section Governance
      Broadcast Institute Announcement: 5: Admin
      Inspect Batch Activity Audit Logs: 5: Admin
      Inspect 30-Day Attendance Trends: 5: Admin
```
