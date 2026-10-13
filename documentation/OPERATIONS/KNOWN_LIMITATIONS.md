# Known Platform Limitations & Architectural Boundaries

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Lead Architect:** Principal Systems Architect  

---

## 1. Architectural Boundaries & Structural Trade-Offs

| Boundary Area | Limitation Description | Root Cause / Trade-Off | Workaround / Future State |
|---|---|---|---|
| **Video Anti-Piracy** | Video links can be extracted via DevTools inspection | Architecture wraps unlisted YouTube videos rather than using DRM HLS | Canvas dynamic watermark deters casual screen recording |
| **Payment Model** | Payment clearing requires manual admin bank check | Relying on offline UPI UTR entry instead of automated payment gateway | Integrated Razorpay/Cashfree webhooks planned in Phase 3 |
| **Concurrency Ceiling**| Supabase Free Tier pooler caps at 200 concurrent connections | Free tier hardware boundaries on managed Supabase instance | Upgrade to Pro tier ($25/mo) allows 5,000+ students |
| **iOS Push Notifications**| Background Web Push requires iOS 16.4+ and PWA installation | Apple APNs restrictions on mobile Safari web pages | `InstallAppPrompt.jsx` guides iOS users to "Add to Home Screen" |
| **Email Address Reuse** | Deleted students cannot re-register with identical email | Deleting from `profiles` leaves orphaned record in `auth.users` | Admin must toggle `is_active = false` instead of hard deleting |

---

## 2. In-Depth Boundary Evaluations

### 2.1 Video Piracy Protection Boundaries
- **Protection Provided:** The platform's custom player (`ProtectedVideoPlayer.jsx`) effectively prevents casual screen recording by superimposing an animated canvas displaying the viewer's student name, roll number, and timestamp. It also hides native YouTube controls and blocks context menus.
- **Architectural Boundary:** Because YouTube delivers the stream via an iframe, any student with developer tools can inspect DOM iframe attributes or network traffic to discover the underlying video ID. True cryptographic DRM requires Widevine/FairPlay licensing and AWS CloudFront signed cookies.

### 2.2 Payment Clearing Latency
- **Limitation:** In the manual UPI model, a student submitting a UTR on Friday evening may experience access delays until an administrator reconciles the transaction against the institute's bank statement on Saturday morning.
- **Remediation:** Automating fee clearing via a webhook-enabled payment gateway eliminates administrative friction completely.
