# Performance & Stability Improvements

## Installed (✅)

| Package | Version | Purpose |
|---|---|---|
| `@vercel/speed-insights` | v2 | Real user speed metrics |
| `@vercel/analytics` | v1 | Visitor analytics |
| `zod` | v4 | Runtime schema validation |
| `date-fns` | v4 | Performent date utilities |
| `react-window` + `react-virtualized-auto-sizer` | latest | Virtualized lists |
| ESLint + TypeScript | latest | Code quality |

## Missing — Consider Installing

### 1. `@sentry/nextjs` — Error Tracking & Performance Monitoring
- Captures unhandled exceptions, promise rejections, and API errors in production
- Traces slow server components, API routes, and database queries
- Biggest gap: currently no visibility into production crashes

### 2. `@tanstack/react-query` — Data Fetching & Caching
- Deduplicates API/Supabase calls — multiple components requesting the same data hit cache instead of making N requests
- Auto-refetch on stale, background sync, optimistic updates
- Directly reduces redundant fetches at the component level

### 3. `@next/bundle-analyzer` — Bundle Size Analysis
- Run `ANALYZE=true next build` to visualize JS bundle composition
- Useful to verify heavy packages (`puppeteer`, `groq-sdk`, `lottie-web`) aren't leaking into client chunks

### 4. Verify `next.config.js` Flags
- `swcMinify: true` (default in Next 15, confirm)
- Consider `sharp` for production image optimization (`next/image` recommends it)
- Ensure `experimental.optimizePackageImports` is configured for big icon libs (`lucide-react`, `react-icons`)

---

*Revisit target: after current UI and backend improvements are complete.*
