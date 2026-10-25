# Backend Endpoint Technical Reference

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Protocol:** HTTPS / WSS  
**Data Format:** JSON (`application/json`) / XML (`application/xml`)  
**Security Headers:** `apikey`, `Authorization: Bearer <JWT>`, `x-webhook-secret`  

---

## 1. Authentication Endpoints (Supabase GoTrue)

### 1.1 `POST /auth/v1/signup`
- **Description:** Registers a new user account in `auth.users` and automatically fires `handle_new_user()` trigger.
- **Request Headers:**
  - `apikey`: Public anon key
  - `Content-Type`: `application/json`
- **Request Body:**
  ```json
  {
    "email": "student@example.com",
    "password": "SecretPassword123!",
    "data": {
      "full_name": "Rohan Sharma",
      "phone": "9876543210",
      "role": "student",
      "batch_id": "7b587a8f-8d26-47b1-9f5e-18e47db26a11",
      "parent_phone": "9876543211",
      "date_of_birth": "2008-05-15",
      "subjects": ["Physics", "Mathematics"]
    }
  }
  ```
- **Responses:**
  - `200 OK`: User created and session issued (if email auto-confirm enabled).
  - `400 Bad Request`: Validation failure (weak password, invalid email format).
  - `422 Unprocessable Entity`: Email address already registered.
- **Vulnerability Note (`SEC-001`):** Supplying `"role": "admin"` in `data` metadata elevates the user directly to superuser status without backend authentication check.

### 1.2 `POST /auth/v1/token?grant_type=password`
- **Description:** Authenticates user via email and password, returning JWT access token and refresh token.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecretPassword123!"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer",
    "expires_in": 3600,
    "refresh_token": "kLz8vO9P...",
    "user": { "id": "uuid", "email": "user@example.com" }
  }
  ```

---

## 2. Serverless Function Endpoints

### 2.1 `GET /.netlify/functions/youtube-playlist` (Dev Proxy: `/api/youtube-playlist`)
- **Description:** Proxies YouTube XML RSS feeds or scrapes playlist IDs from video watch pages to bypass CORS.
- **Query Parameters:**
  - `listId` (optional): YouTube playlist ID (e.g., `PL1234567890abcdef`)
  - `videoId` (optional): Individual video ID used to discover parent playlist ID
- **Headers Returned:**
  - `Content-Type`: `application/xml; charset=utf-8`
  - `Cache-Control`: `public, max-age=900`
  - `X-Discovered-Playlist-Id`: Discovered playlist ID string
- **Error Responses:**
  - `400 Bad Request`: `{"error": "Missing listId or discoverable videoId parameter"}`
  - `404 Not Found`: Upstream YouTube channel or playlist does not exist.
  - `500 Internal Server Error`: `{"error": "Internal proxy error"}`

### 2.2 `POST /functions/v1/send-push`
- **Description:** Deno Edge Function delivering browser Web Push alerts via VAPID.
- **Headers:**
  - `x-webhook-secret`: Shared secret header matching `WEBHOOK_SECRET` environment variable.
- **Request Body:**
  ```json
  {
    "type": "INSERT",
    "table": "notifications",
    "record": {
      "id": "uuid",
      "title": "Tomorrow's Class Rescheduled",
      "body": "Physics class will start at 10:00 AM instead of 9:00 AM.",
      "type": "announcement",
      "target_role": "student",
      "target_batch_id": "uuid",
      "created_by": "teacher-uuid"
    }
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "ok": true,
    "recipients": 42,
    "sent": 38
  }
  ```

---

## 3. PostgREST Core Table Operations

### 3.1 Fee Payment Submission (`POST /rest/v1/fee_records`)
- **Headers:** `Authorization: Bearer <student-jwt>`, `Prefer: return=representation`
- **Payload:**
  ```json
  {
    "student_id": "7b587a8f-8d26-47b1-9f5e-18e47db26a11",
    "batch_id": "3a127a8f-8d26-47b1-9f5e-18e47db26a22",
    "amount": 2500.00,
    "month": "October 2026",
    "payment_mode": "UPI",
    "utr_number": "428901234567",
    "status": "pending"
  }
  ```
- **Responses:**
  - `201 Created`: Fee record saved in `pending` state.
  - `403 Forbidden`: RLS policy denies insert if `auth.uid() != student_id`.

### 3.2 Fee Reconciliation Approval (`PATCH /rest/v1/fee_records?id=eq.{id}`)
- **Headers:** `Authorization: Bearer <admin-jwt>`
- **Payload:**
  ```json
  {
    "status": "approved",
    "verified_by": "admin-uuid",
    "verified_at": "2026-10-13T14:30:00Z"
  }
  ```
- **Response `200 OK`**: Record updated.

### 3.3 Study Card Creation (`POST /rest/v1/study_cards`)
- **Headers:** `Authorization: Bearer <teacher-or-admin-jwt>`
- **Payload:**
  ```json
  {
    "batch_id": "uuid",
    "chapter_id": "uuid",
    "title": "Newton's Third Law & Applications",
    "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "duration": 3420,
    "description": "Comprehensive analysis of action-reaction pairs with free body diagrams.",
    "is_published": true
  }
  ```
- **Responses:**
  - `201 Created`: Card created and visible to enrolled students.
  - `403 Forbidden`: Denied if teacher does not have `can_manage_study_cards = true` or is not assigned to the batch.
