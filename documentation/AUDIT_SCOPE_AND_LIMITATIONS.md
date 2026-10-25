# Audit Scope, Boundaries & Environmental Limitations

Audit Date: October 13, 2026  
Target Application: Graviton Academy (Coaching Institute Platform)

---

## 1. Audit Scope Boundaries

### In-Scope Dimensions
- Entire local project workspace located at `/home/thoughtful/Downloads/coaching-institute-last`.
- All source files in `src/` (components, pages, context, hooks, utils, lib, styles).
- Build systems, configurations (`vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `eslint.config.js`, `netlify.toml`, `package.json`).
- Serverless functions (`netlify/functions/youtube-playlist.js`, `supabase/functions/send-push/index.ts`).
- Database migrations 001 through 024 located in `supabase/migrations/`.
- Runtime verification of active dev server (`localhost:5173`) and PostgREST endpoints on the connected Supabase instance.
- Static accessibility, responsive layouts, OWASP security posture, dependency CVEs, and student concurrency modeling.

### Explicitly Out-of-Scope Dimensions
- Automated deployment to live Netlify production (`netlify deploy --prod`).
- Modifying production records in Supabase (inserting real users, updating live courses, dropping tables).
- Sending real SMS or transactional emails to real student phone numbers/inboxes.
- Dispatching real Web Push notifications to production subscribers.
- Stress testing the live Supabase instance with destructive denial-of-service load.

---

## 2. Environmental & Operational Limitations

| Dimension / Service | Status | Nature of Limitation | Audit Handling & Evidence |
|---|---|---|---|
| **Supabase Service Role Key** | Unavailable (Local env has Anon Key only) | Administrative database operations, raw SQL execution, and service-role webhooks could not be directly invoked from the CLI. | Inspected SQL migrations statically; verified public PostgREST endpoints and RLS with anon key. |
| **Supabase Edge Function (`send-push`)** | Hosted on Remote Supabase Edge | Cannot invoke edge function locally without Supabase CLI linking and Deno runtime credentials. | Analyzed TypeScript source code (`supabase/functions/send-push/index.ts`) statically; verified webhook payload formatting. |
| **Netlify Edge Environment** | Simulated locally via Vite plugin | Production Netlify environment variables and build logs are hosted in the Netlify Cloud console. | Tested Vite development proxy equivalent in `vite.config.js` and reviewed `netlify.toml` production headers. |
| **Web Push End-to-End Delivery** | Requires physical browser permission | Full push notification display requires a browser user clicking "Allow Notifications" in a supported context with active VAPID keys. | Verified service worker handler (`push-sw.js`), subscription logic in `push.js`, and database schema in `013_push_subscriptions.sql`. |
| **Payment Gateway Integration** | Non-existent in codebase | No third-party payment gateway SDK (Razorpay, Stripe, Cashfree) is installed. | Documented manual UPI reconciliation workflow and marked payment gateway as missing enhancement. |
| **Automated Test Coverage** | Zero existing test suites | No Jest, Vitest, Cypress, or Playwright setup was present in the codebase to run pre-existing unit tests. | Documented as critical testing gap (`TEST-001`); created manual test matrix and recommended test plan. |
