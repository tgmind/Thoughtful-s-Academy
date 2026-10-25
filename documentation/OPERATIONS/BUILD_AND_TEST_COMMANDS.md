# Build, Test & CLI Command Reference

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Package Manager:** NPM 10.8.2  
**Tooling:** Vite 5.4.9, Rollup, ESLint 9.13.0, Supabase CLI  

---

## 1. Primary NPM Scripts Reference

| NPM Command | Underlying Tooling | Primary Function | Expected Output / Exit Code |
|---|---|---|---|
| `npm run dev` | `vite` | Starts local HMR development server on port 5173 | Listens on `http://localhost:5173` |
| `npm run build` | `vite build` | Compiles production assets into `dist/` | Exits 0, outputs 54 Rollup chunks |
| `npm run lint` | `eslint .` | Runs static code analysis across all `.jsx` / `.js` files | Exits 0 with 0 errors / 0 warnings |
| `npm run preview` | `vite preview` | Boots local webserver serving production `dist/` bundle | Useful for pre-deploy PWA testing |
| `npm audit` | `npm audit` | Scans dependency tree for known CVE vulnerabilities | Exits 1 if unpatched CVEs detected |

---

## 2. Advanced Testing & Quality Commands

### 2.1 Post-Bootstrap Test Execution (Vitest & Playwright)
Once test dependencies are installed:
```bash
# Execute all fast unit and component tests
npm run test

# Execute unit tests with interactive file watching
npm run test:watch

# Generate code coverage matrix report
npm run test:coverage

# Execute Playwright End-to-End browser test suite
npx playwright test

# Launch Playwright interactive UI test runner
npx playwright test --ui
```

---

## 3. Database Administration Commands (Supabase CLI)

```bash
# Link local environment to Supabase remote project
supabase link --project-ref "<supabase-project-id>"

# Generate TypeScript type definitions from live database schema
supabase gen types typescript --project-id "<project-id>" > src/types/database.types.ts

# Apply pending migrations from supabase/migrations/
supabase db push

# Export remote database schema to local file
supabase db dump -f supabase/schema_dump.sql
```
