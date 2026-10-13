# Backend Error Handling & Exception Management

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Scope:** PostgREST error codes, Edge function status codes, Netlify proxy exceptions, client-side error propagation, and security implications of leaked database errors.  

---

## 1. PostgREST Error Taxonomy & HTTP Status Mapping

When frontend queries execute against the PostgREST gateway, database exceptions are translated into structured JSON responses:

```json
{
  "code": "42501",
  "details": null,
  "hint": null,
  "message": "permission denied for table profiles"
}
```

### 1.1 Common Database & RLS Error Codes Encountered

| PostgREST / Postgres Code | HTTP Status | Root Cause | Client Handling Behavior |
|---|:---:|---|---|
| `PGRST301` | `401 Unauthorized` | JWT token expired or invalid signature | Clears local storage session and redirects to `/login` |
| `42501` | `403 Forbidden` | RLS policy rejection on INSERT / UPDATE / SELECT | Displays toast: "Permission denied" or raw error text |
| `23505` | `409 Conflict` | Unique constraint violation (e.g., duplicate roll number) | Displays generic insertion failure |
| `PGRST116` | `406 Not Acceptable` | `.single()` called but query returned 0 or >1 rows | Causes runtime JavaScript exception if unhandled |
| `23503` | `409 Conflict` | Foreign key violation (e.g., deleting batch with enrolled students) | Blocks deletion and returns DB constraint name |

---

## 2. Serverless Function Error Management

### 2.1 Netlify YouTube Proxy (`netlify/functions/youtube-playlist.js`)
```javascript
try {
  // Playlist resolution & YouTube RSS fetch...
} catch (err) {
  return new Response(JSON.stringify({ error: err.message || 'Internal proxy error' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  })
}
```
- **Strengths:** Gracefully catches scraping failures when searching for playlist IDs from video watch pages.
- **Resilience:** Propagates upstream YouTube status codes (e.g., 404 if playlist deleted) so client can display clear "Playlist Not Found" messaging.

### 2.2 Supabase Edge Function (`supabase/functions/send-push/index.ts`)
```typescript
try {
  await webpush.sendNotification(...)
  sent++
} catch (err: any) {
  const code = err?.statusCode
  // 404 / 410 -> Subscription expired or uninstalled; automatically garbage collect
  if (code === 404 || code === 410) {
    await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
  } else {
    console.error('push send error', code, err?.body || err?.message)
  }
}
```
- **Self-Healing Design:** Dead browser push endpoints (cleared site data, uninstalled PWA) return HTTP 410 or 404 from browser push gateways. The function automatically deletes these dead rows, preventing database bloat and wasted VAPID dispatch calls.

---

## 3. Client-Side Error Propagation Defect (`BED-004`)

### 3.1 Raw Database Exception Exposure
In multiple frontend form handlers (e.g., `src/pages/Register.jsx` and `src/pages/admin/AdminSettings.jsx`), errors are caught and surfaced directly to user notifications:

```jsx
// Problematic Pattern:
const { data, error } = await supabase.from('profiles').update(...)
if (error) {
  toast.error(error.message) // Leaks internal table names and policy names
}
```

### 3.2 Security Risk
Surfacing internal PostgreSQL policy violations (such as `new row violates row-level security policy for table "teacher_profiles"`) leaks internal schema topologies and policy names to potential adversaries.

### 3.3 Recommended Remediation
Implement an error mapping utility (`src/utils/errorMapper.js`) that translates PostgREST error codes into user-friendly localized messages:
```javascript
export function mapDatabaseError(error) {
  if (!error) return 'An unexpected error occurred.'
  switch (error.code) {
    case '23505': return 'This record already exists. Please verify roll number or email.'
    case '42501': return 'You do not have permission to perform this action.'
    case 'PGRST301': return 'Your session has expired. Please log in again.'
    default: return 'Operation could not be completed. Please contact support.'
  }
}
```
