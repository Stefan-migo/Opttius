# Design: fix-supabase-typed-clients

## Technical Approach

Add `<typeof Database>` generic parameter to all 14 Supabase client factory calls across 12 wrapper files + 2 middleware calls. Add an ESLint `no-restricted-imports` guard to prevent future untyped direct imports. No runtime changes — pure type narrowing.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Generic value | `typeof Database` (not `Database`) | `Database`, custom `GenericSchema` | `typeof` avoids importing the type as a value; Supabase's schema param expects a type constructor that `typeof Database` provides |
| Import path | `@/types/supabase` | `@/types/supabase.generated`, `@/database.types` | Existing convention — all wrapper files that already import it use this path |
| ESLint strategy | `no-restricted-imports` with `paths` | Only `import/no-restricted-paths`, manual PR reviews | Zero-config, blocks at lint-time, test overrides already exist in `.eslintrc.json` |
| `service-role.ts` files | No changes needed | Add generic there too | Both `service-role.ts` files are re-exports from `server.ts` — the actual factory call lives in `server.ts` and is already counted |

## Data Flow

No data flow change. Before: client returns `GenericSchema` (all rows `unknown`). After: client returns typed rows matching the `Database` generated types. All queries, mutations, and subscriptions downstream receive typed results automatically.

## File Changes

### Group A — `src/lib/supabase/` (6 files, 7 calls)

| File | Line | Change |
|------|------|--------|
| `client.ts` | — | Add `import type { Database } from "@/types/supabase"` |
| `client.ts:4` | 4 | `createBrowserClient(` → `createBrowserClient<Database>(` |
| `server.ts:12` | 12 | `createServerClient(` → `createServerClient<Database>(` (import already present) |
| `server.ts:59` | 59 | `createSupabaseClient(` → `createSupabaseClient<Database>(` (Bearer token path) |
| `server.ts:99` | 99 | `createSupabaseClient(` → `createSupabaseClient<Database>(` (service role) |
| `cron.ts` | — | Add `import type { Database } from "@/types/supabase"` |
| `cron.ts:15` | 15 | `createClient(` → `createClient<Database>(` |
| `root-admin.ts` | — | Add `import type { Database } from "@/types/supabase"` |
| `root-admin.ts:16` | 16 | `createClient(` → `createClient<Database>(` |
| `webhook.ts` | — | Add `import type { Database } from "@/types/supabase"` |
| `webhook.ts:15` | 15 | `createClient(` → `createClient<Database>(` |

### Group B — `src/utils/supabase/` (6 files, 7 calls)

Identical changes as Group A — same file names, same call patterns. These are separate files (not symlinks), both need fixing.

### Group C — `src/middleware.ts` (2 calls)

| File | Line | Change |
|------|------|--------|
| `middleware.ts` | — | Add `import type { Database } from "@/types/supabase"` |
| `middleware.ts:87` | 87 | `createClient(` → `createClient<Database>(` |
| `middleware.ts:156` | 156 | `createServerClient(` → `createServerClient<Database>(` |

### Group D — ESLint guard

| File | Change |
|------|--------|
| `.eslintrc.json` | Add `@supabase/ssr` and `@supabase/supabase-js` to `no-restricted-imports` paths |

## Interfaces / Contracts

No new types. The existing `Database` type from `@/types/supabase` is applied via generic parameter:

```typescript
// Before
createBrowserClient(url, anonKey)  // → GenericSchema → unknown rows
// After
createBrowserClient<Database>(url, anonKey)  // → Database → typed rows
```

## Import Status (verified by reading each file)

| File | Needs `Database` import? |
|------|------------------------|
| `src/lib/supabase/client.ts` | Yes (no existing import) |
| `src/lib/supabase/server.ts` | **No** — already imports `import type { Database } from "@/types/supabase"` |
| `src/lib/supabase/cron.ts` | Yes |
| `src/lib/supabase/root-admin.ts` | Yes |
| `src/lib/supabase/webhook.ts` | Yes |
| `src/utils/supabase/client.ts` | Yes |
| `src/utils/supabase/server.ts` | **No** — already imports |
| `src/utils/supabase/cron.ts` | Yes |
| `src/utils/supabase/root-admin.ts` | Yes |
| `src/utils/supabase/webhook.ts` | Yes |
| `src/middleware.ts` | Yes |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Type-check | All factory calls accept `Database` generic | `npx tsc --noEmit` — expect TS18046 count drops from 1,691 to ~550 |
| Lint | Direct imports of `@supabase/ssr` / `@supabase/supabase-js` blocked | `npm run lint` — must pass 0 errors |
| Build | Full production build | `npm run build` — must pass |

## Migration / Rollout

No migration required. Pure type-only change — no data, no runtime, no schema changes. Apply as a single PR.

## ESLint Rule

```json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "paths": [
        {
          "name": "@supabase/ssr",
          "message": "Use @/lib/supabase/client or @/lib/supabase/server instead"
        },
        {
          "name": "@supabase/supabase-js",
          "message": "Use @/lib/supabase/* wrappers instead"
        }
      ]
    }]
  }
}
```

## Verification

```bash
npx tsc --noEmit 2>&1 | grep -c "TS18046"  # Expected: ~550 (baseline: 1,691)
npx tsc --noEmit 2>&1 | grep -c "error TS"  # Expected: ~2,122
npm run lint                                  # Expected: 0 errors
npm run build                                 # Expected: pass
```

## Rollback

`git checkout` on all changed files. No data risk, no migration, no runtime change.
