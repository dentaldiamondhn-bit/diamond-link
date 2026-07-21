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
| `posthog-js` | ^1.405 | Product analytics, session replays, error tracking (free tier: 1M events/mo) |
| `@tanstack/react-query` | ^5 | Data fetching & caching (dedup, auto-refetch) |
| `@next/bundle-analyzer` | ^15 | Bundle size visualization (`npm run analyze`) |
| `sharp` | ^0.33 | Production image optimization for `next/image` |

### next.config.js Flags
- `experimental.optimizePackageImports` set for `react-icons` and `lucide-react` — tree-shakes unused icon imports
- `swcMinify: true` — default in Next 15, confirmed

## Next Steps

- Set up PostHog: create a free account at https://posthog.com, get an API key, enter it in the system settings page
- Wrap the app with `<QueryClientProvider>` from `@tanstack/react-query` and migrate data fetches to `useQuery`/`useMutation`
- Run `npm run analyze` to verify bundle composition; check `puppeteer`, `groq-sdk`, `lottie-web` aren't leaking into client chunks

---
