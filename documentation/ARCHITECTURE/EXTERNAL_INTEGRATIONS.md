# External Integrations Architecture

Audit Date: 2026-10-13  
Platform: Graviton Academy

---

## 1. External Integrations Matrix

| Integration Name | Integration Type | Architecture & Implementation | Authentication / Credentials | Status |
|---|---|---|---|---|
| **Supabase Cloud** | Backend as a Service | PostgREST HTTP, Auth REST, Realtime WebSockets | Public Anon Key in `.env.local` (`VITE_SUPABASE_ANON_KEY`) | **VERIFIED WORKING** |
| **YouTube Video Embeds** | Media Delivery | `window.YT.Player` IFrame API (`youtubeApiLoader.js`) | None (Unlisted public videos) | **VERIFIED WORKING** |
| **YouTube RSS & Scraper** | Video Catalog Feed | Proxied via Netlify Function (`youtube-playlist.js`) | Scraped HTML & Public XML Feed | **VERIFIED WORKING** |
| **Web Push (VAPID)** | Browser Alert Gateway | Browser PushManager + Supabase Edge Function (`send-push`) | VAPID Key Pair (`VITE_VAPID_PUBLIC_KEY`, Deno private secret) | **IMPLEMENTED / UNVERIFIED LIVE** |
| **Google Drive** | Document & Image Storage | Links converted via `DriveImage.jsx` & `convertDriveUrl` | None (Publicly shared Drive links) | **VERIFIED WORKING** |
| **Zoom & Google Meet** | Live Video Conferencing | Meeting join URLs launched via external browser tab | None (Teacher supplies meeting URL & password) | **VERIFIED WORKING** |
| **UPI Payment Apps** | Financial Reconciliation | UPI Intent URI (`upi://pay?pa=...`) + QR code image | None (Offline manual reference verification) | **VERIFIED WORKING** |
| **Google Fonts** | Typography CDN | Preconnected font stylesheets for Inter and Poppins | None (Public Google CDN) | **VERIFIED WORKING** |

---

## 2. Integration Deep Dives

### 2.1 YouTube Video Player & Playlist Discovery
- **No YouTube Data API v3 Quota Dependency:** The platform deliberately avoids Google Cloud YouTube Data API keys.
- **Playlist Feed Discovery:** When a teacher provides a playlist URL or a video from a playlist, the Netlify function fetches `https://www.youtube.com/feeds/videos.xml?playlist_id={listId}`.
- **Player Shielding:** The custom player (`ProtectedVideoPlayer.jsx`) suppresses video titles, YouTube logos, and related video cards by applying CSS masking overlays and intercepting pause/end events.

### 2.2 Web Push Notification System (VAPID)
- **Client Side (`src/utils/push.js`):** Calls `navigator.serviceWorker.ready` and `registration.pushManager.subscribe()` using `applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY)`.
- **Database Storage (`push_subscriptions`):** Stores `endpoint`, `p256dh`, and `auth` keys indexed by `user_id`.
- **Edge Dispatcher (`supabase/functions/send-push/index.ts`):** Triggered by database webhooks to sign and dispatch encrypted payloads using `web-push`.

### 2.3 UPI Financial Reconciliation (No Payment Gateway)
- **Architectural Rationale:** Eliminates gateway setup delays, merchant KYC, and 2-3% transaction fees for the institute.
- **Workflow:** Admin uploads the institute's UPI QR code image and specifies `upi_id`. The student scans the QR code in PhonePe/GooglePay/Paytm, submits payment, copies the 12-digit UTR transaction ID, and pastes it into `PayFee.jsx`. The admin approves or rejects the record in `FeeManager.jsx`.
- **Limitation:** Susceptible to duplicate reference ID submission and fraud if admins fail to manually check the institute's bank statement before approving.
