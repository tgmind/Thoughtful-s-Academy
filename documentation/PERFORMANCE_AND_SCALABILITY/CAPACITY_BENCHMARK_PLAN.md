# Platform Load Testing & Capacity Benchmark Plan

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Tooling Recommendation:** k6 Open-Source Load Tester / Artillery  
**Target Environments:** Staging / Isolated Supabase Preview Branch  

---

## 1. Load Testing Scenarios & SLA Thresholds

| Scenario Identifier | Simulated Traffic Profile | Target Virtual Users (VUs) | Ramp-Up Profile | Target SLA Thresholds |
|---|---|:---:|---|---|
| **SCEN-01: Morning Check-In Spike** | Students loading dashboard & marking attendance | 500 VUs | 0 to 500 VUs over 3 mins, hold 5 mins | p95 < 250ms, Error rate < 0.05% |
| **SCEN-02: Live Broadcast Ingress** | Students opening active live class stream room | 1,000 VUs | Sudden spike: 0 to 1,000 VUs in 60s | p95 < 400ms, Error rate < 0.1% |
| **SCEN-03: Registration Rush** | Prospective students submitting enrollment form | 50 VUs | 50 VUs concurrent POST requests | Zero roll number collisions |

---

## 2. k6 Automated Benchmark Script (`benchmark-attendance.js`)

```javascript
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '2m', target: 200 }, // Warm-up to 200 users
    { duration: '5m', target: 500 }, // Peak morning rush: 500 users
    { duration: '2m', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% of requests under 300ms
    http_req_failed: ['rate<0.01'],    // Under 1% failures
  },
}

const BASE_URL = 'https://<supabase-project-id>.supabase.co/rest/v1'
const ANON_KEY = '<SUPABASE_ANON_KEY>'

export default function () {
  const headers = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
  }

  // 1. Fetch public active batches
  const batchesRes = http.get(`${BASE_URL}/batches?select=id,name&is_active=eq.true`, { headers })
  check(batchesRes, { 'batches status 200': (r) => r.status === 200 })

  // 2. Fetch public study cards
  const cardsRes = http.get(`${BASE_URL}/study_cards?select=id,title,duration&is_published=eq.true&limit=10`, { headers })
  check(cardsRes, { 'cards status 200': (r) => r.status === 200 })

  sleep(Math.random() * 2 + 1) // Human think time: 1-3 seconds
}
```

---

## 3. Failure Diagnostic & Threshold Matrix

During benchmark execution, monitor Supabase Database Metrics in the Dashboard:
- **Connection Pool Exhaustion:** If `Active Client Connections` reaches 200 and requests queue with `504 Gateway Timeout`, increase pooler limit or deploy TanStack Query caching.
- **CPU Spike (> 80%):** Indicates high sequential scan activity. Query `pg_stat_statements` to identify missing indexes.
- **Memory Pressure:** If cache hit ratio drops below 98%, database buffers are spilling to disk; upgrade database compute instance.
