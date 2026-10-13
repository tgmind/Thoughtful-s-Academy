# Dependency Inventory & Software Bill of Materials (SBOM)

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Package Manager:** NPM 10.8.2 / Node.js 18+  
**Manifest:** `package.json`  

---

## 1. Production Dependencies Inventory (`dependencies`)

| Package Name | Specified Version | Resolved Version | Primary Architectural Role | License |
|---|:---:|:---:|---|:---:|
| `@supabase/supabase-js` | `^2.45.4` | `2.45.4` | PostgREST client, GoTrue auth, Realtime WebSocket manager | MIT |
| `react` | `^18.3.1` | `18.3.1` | Core UI library & Virtual DOM reconciliation | MIT |
| `react-dom` | `^18.3.1` | `18.3.1` | DOM renderer for React | MIT |
| `react-router-dom` | `^6.26.2` | `6.26.2` | Client-side SPA routing and route guards | MIT |
| `framer-motion` | `^11.11.11`| `11.11.11` | UI animations, modal transitions, and route animations | MIT |
| `lucide-react` | `^0.454.0` | `0.454.0` | Comprehensive iconography system across portals | ISC |
| `date-fns` | `^4.1.0` | `4.1.0` | Modern, tree-shakeable date formatting and arithmetic | MIT |
| `react-hot-toast` | `^2.4.1` | `2.4.1` | Floating notification alerts and feedback toasts | MIT |
| `canvas-confetti` | `^1.9.3` | `1.9.3` | Gamified celebration animations on fee payment / streak | ISC |
| `html2canvas` | `^1.4.1` | `1.4.1` | DOM-to-canvas rendering for client fee receipt generation | MIT |
| `jspdf` | `^2.5.2` | `2.5.2` | Client-side PDF generation for receipts and reports | MIT |
| `qrcode` | `^1.5.4` | `1.5.4` | Dynamic UPI QR code SVG/canvas generator | MIT |

---

## 2. Development Dependencies Inventory (`devDependencies`)

| Package Name | Specified Version | Resolved Version | Role in Toolchain | License |
|---|:---:|:---:|---|:---:|
| `vite` | `^5.4.9` | `5.4.9` | Next-generation frontend build tool and dev server | MIT |
| `@vitejs/plugin-react` | `^4.3.3` | `4.3.3` | Fast Refresh and JSX transformation | MIT |
| `vite-plugin-pwa` | `^0.20.5` | `0.20.5` | Zero-config PWA Workbox service worker generator | MIT |
| `tailwindcss` | `^3.4.14` | `3.4.14` | Utility-first CSS framework | MIT |
| `postcss` | `^8.4.47` | `8.4.47` | CSS transformation engine | MIT |
| `autoprefixer` | `^10.4.20` | `10.4.20` | Vendor prefix parser for cross-browser CSS | MIT |
| `eslint` | `^9.13.0` | `9.13.0` | Pluggable static code linter | MIT |
| `@eslint/js` | `^9.13.0` | `9.13.0` | ESLint JavaScript rule configurations | MIT |
| `eslint-plugin-react-hooks` | `^5.0.0` | `5.0.0` | Enforces React Hooks rules (`exhaustive-deps`) | MIT |
| `eslint-plugin-react-refresh`| `^0.4.14` | `0.4.14` | Hot Module Replacement verification | MIT |
| `globals` | `^15.11.0` | `15.11.0` | Browser and Node global identifiers | MIT |

---

## 3. License & Compliance Review

- **Open Source License Risk:** 100% of direct dependencies are distributed under permissive open-source licenses (**MIT** or **ISC**).
- **Copyleft Encroachment:** Zero GPL, AGPL, or restrictive copyleft dependencies exist in the project tree, ensuring full commercial autonomy.
