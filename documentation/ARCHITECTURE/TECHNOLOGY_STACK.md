# Technology Stack & Dependency Inventory

Audit Date: 2026-10-13  
Platform: Graviton Academy

---

## 1. Runtime & Language Specification

| Technology | Category | Version | Location / Source | Verification Level |
|---|---|---|---|---|
| **JavaScript (ESM)** | Language | ECMAScript 2022+ | `package.json` (`"type": "module"`) | Verified |
| **Node.js** | Build & Dev Runtime | v20.x LTS | `netlify.toml` line 16 | Verified |
| **TypeScript (Deno)** | Edge Runtime | Deno 1.x | `supabase/functions/send-push/index.ts` | Verified |
| **PostgreSQL** | Database Engine | PostgreSQL 15 | Supabase Managed Cloud | Verified |
| **HTML5 / CSS3** | Markup / Styling | Modern W3C Standard | `index.html`, `src/index.css` | Verified |

---

## 2. Production Dependencies (`package.json`)

| Package Name | Installed Version | Purpose / Architectural Role | Chunk / Bundle Impact |
|---|---|---|---|
| `react` | `^18.3.1` | Core UI library | `vendor-react.js` (84.17 kB gz) |
| `react-dom` | `^18.3.1` | React DOM renderer | `vendor-react.js` |
| `react-router-dom` | `^6.28.0` | Client-side routing, guards, and link handling | `vendor-react.js` |
| `@supabase/supabase-js` | `^2.45.4` | PostgREST, Auth, and Realtime WebSocket client | `vendor-supabase.js` (54.47 kB gz) |
| `@supabase/auth-ui-react` | `^0.4.7` | Supabase auth UI components | Included in vendor dependencies |
| `@supabase/auth-ui-shared`| `^0.1.8` | Supabase auth UI themes | Included in vendor dependencies |
| `@tanstack/react-query` | `^5.59.20` | Server-state caching and async management | Available in bundle |
| `framer-motion` | `^11.11.11` | Micro-animations, page transitions, slide drawers | `vendor-ui.js` (37.77 kB gz) |
| `lucide-react` | `^0.460.0` | SVG Iconography across portals | `vendor-ui.js` |
| `recharts` | `^2.13.3` | SVG charts for analytics and attendance trends | `vendor-charts.js` (98.46 kB gz) |
| `react-calendar-heatmap` | `^1.9.0` | GitHub-style daily attendance heatmap | `vendor-charts.js` |
| `date-fns` | `^4.1.0` | Date manipulation and formatting | Included in bundle |
| `react-hot-toast` | `^2.4.1` | User feedback toast notifications | Main bundle |
| `@radix-ui/react-avatar` | `^1.1.1` | Headless avatar primitive | Shared UI |
| `@radix-ui/react-dialog` | `^1.1.2` | Headless modal dialog primitive | Shared UI |
| `@radix-ui/react-dropdown-menu` | `^2.1.2` | Headless dropdown primitive | Shared UI |
| `@radix-ui/react-select` | `^2.1.2` | Headless select primitive | Shared UI |
| `@radix-ui/react-switch` | `^1.1.1` | Headless toggle switch primitive | Shared UI |
| `@radix-ui/react-tabs` | `^1.1.1` | Headless tab primitive | Shared UI |
| `@radix-ui/react-tooltip`| `^1.1.3` | Headless tooltip primitive | Shared UI |
| `class-variance-authority`| `^0.7.1` | Type-safe component variant generation | Shared UI |
| `clsx` | `^2.1.1` | Conditional className concatenation utility | Shared UI |
| `tailwind-merge` | `^2.5.4` | Conflict-free Tailwind class merging | Shared UI |
| `@netlify/blobs` | `^11.0.1` | Netlify blob storage access (candidate unused) | Serverless |

---

## 3. Development Dependencies & Bundling Tools

| Package Name | Version | Role in Toolchain |
|---|---|---|
| `vite` | `^5.4.10` | Bundler, HMR dev server, chunk optimizer |
| `@vitejs/plugin-react` | `^4.3.3` | Babel fast-refresh plugin for Vite |
| `vite-plugin-pwa` | `^1.3.0` | Workbox service worker generator and PWA manifest builder |
| `tailwindcss` | `^3.4.14` | Utility-first CSS engine |
| `postcss` | `^8.4.47` | CSS transformation pipeline |
| `autoprefixer` | `^10.4.20` | CSS vendor prefix generator |
| `eslint` | `^9.13.0` | Flat configuration static code analysis engine |
| `eslint-plugin-react` | `^7.37.2` | React lint rules |
| `eslint-plugin-react-hooks` | `^5.0.0` | React hooks dependency checks |
| `eslint-plugin-react-refresh` | `^0.4.14` | Fast Refresh HMR compatibility linting |
| `@types/react` | `^18.3.12` | React TypeScript ambient typings |
| `@types/react-dom` | `^18.3.1` | React DOM ambient typings |
