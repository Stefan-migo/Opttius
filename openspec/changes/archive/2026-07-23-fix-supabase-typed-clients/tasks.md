# Tasks: fix-supabase-typed-clients

Pure type infrastructure — add `<typeof Database>` generic to all 16 Supabase client factory calls across 13 files + ESLint guard. Zero runtime change.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 30–40 |
| 400-line budget risk | **Low** |
| Chained PRs recommended | Yes (forced by delivery config) |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

```
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low
```

### Suggested Work Units

| Unit | Goal | Likely PR | Base | Lines |
|------|------|-----------|------|-------|
| 1 | Type `src/lib/supabase/` factories (5 files, 7 calls) | PR 1 | main | ~10 |
| 2 | Type `src/utils/supabase/` factories (5 files, 7 calls) | PR 2 | main | ~10 |
| 3 | Type `src/middleware.ts` (2 calls) | PR 3 | main | ~3 |
| 4 | ESLint `no-restricted-imports` guard | PR 4 | main | ~15 |

Each PR is < 20 lines, independently mergable, and fully type-checkable. Stacked-to-main ordering.

---

## Phase 1: `src/lib/supabase/` factories (PR 1)

- [x] 1.1 `src/lib/supabase/client.ts` — add `import type { Database }` + `<Database>` to `createBrowserClient()`
- [x] 1.2 `src/lib/supabase/server.ts` — add `<Database>` to `createServerClient()` (l.12) + `createSupabaseClient()` (l.59, l.99); import already present
- [x] 1.3 `src/lib/supabase/cron.ts` — add `import type { Database }` + `<Database>` to `createClient()`
- [x] 1.4 `src/lib/supabase/root-admin.ts` — add `import type { Database }` + `<Database>` to `createClient()`
- [x] 1.5 `src/lib/supabase/webhook.ts` — add `import type { Database }` + `<Database>` to `createClient()`

## Phase 2: `src/utils/supabase/` factories (PR 2)

- [x] 2.1 `src/utils/supabase/client.ts` — add `import type { Database }` + `<Database>` to `createBrowserClient()`
- [x] 2.2 `src/utils/supabase/server.ts` — add `<Database>` to `createServerClient()` + `createSupabaseClient()` (×2); import already present
- [x] 2.3 `src/utils/supabase/cron.ts` — add `import type { Database` + `<Database>` to `createClient()`
- [x] 2.4 `src/utils/supabase/root-admin.ts` — add `import type { Database }` + `<Database>` to `createClient()`
- [x] 2.5 `src/utils/supabase/webhook.ts` — add `import type { Database }` + `<Database>` to `createClient()`

## Phase 3: Middleware (PR 3)

- [x] 3.1 `src/middleware.ts` — add `import type { Database }` + `<Database>` to `createClient()` and `createServerClient()`

## Phase 4: ESLint guard (PR 4 — must be last)

- [x] 4.1 `.eslintrc.json` — add `no-restricted-imports` blocking `@supabase/ssr` and `@supabase/supabase-js` with `overrides` exemption for wrapper files + middleware

## Verification

```bash
npx tsc --noEmit   # TS18046 count ≤ 550 (baseline: 1,691)
npm run lint       # 0 errors
npm run build      # pass
```
