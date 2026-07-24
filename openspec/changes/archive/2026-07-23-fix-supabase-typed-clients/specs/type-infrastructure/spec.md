# Spec: fix-supabase-typed-clients — Type Infrastructure

## Context

1,691 TS18046 errors (`'x' is of type 'unknown'`) flood the codebase because 12 Supabase client factory functions and `middleware.ts` create clients without the `<Database>` generic. Supabase v2 defaults to `GenericSchema` where every Row is `Record<string, unknown>`. Adding `<typeof Database>` to every factory call eliminates ~1,141 errors (67% of TS18046) with zero runtime impact.

## ADDED Requirements

### Requirement: Client factory typing — src/lib/supabase/ and src/utils/supabase/

Every `createBrowserClient()`, `createServerClient()`, `createServiceRoleClient()`, and `createClient()` call in the 12 factory files MUST receive `<typeof Database>` as a type parameter. Each factory file MUST import `type { Database }` from the generated types module.

#### Scenario: Typed client from lib/client

- GIVEN `src/lib/supabase/client.ts`
- WHEN it calls `createBrowserClient(supabaseUrl, supabaseAnonKey)`
- THEN the call MUST be `createBrowserClient<typeof Database>(supabaseUrl, supabaseAnonKey)`
- AND `Database` MUST be imported as a type from the generated schema

#### Scenario: Typed service role client from lib/server

- GIVEN `src/lib/supabase/server.ts`
- WHEN it calls `createServerClient()` and `createServiceRoleClient()`
- THEN both calls MUST pass `<typeof Database>`
- AND if `Database` is already imported but unused, the existing import suffices

#### Scenario: Typed cron, root-admin, webhook clients

- GIVEN `src/lib/supabase/cron.ts`, `root-admin.ts`, `webhook.ts`
- AND their `src/utils/supabase/` counterparts
- WHEN they call `createClient()`
- THEN each call MUST pass `<typeof Database>`
- AND each file MUST add `import type { Database } from '...'` if missing

### Requirement: Middleware typing — src/middleware.ts

Direct `createServerClient()` and `createClient()` calls in `middleware.ts` bypass the wrapper files and MUST also pass `<typeof Database>`.

#### Scenario: Typed server client in middleware

- GIVEN `src/middleware.ts`
- WHEN it calls `createServerClient()` with `@supabase/ssr`
- THEN the call MUST be `createServerClient<typeof Database>(...)`

#### Scenario: Typed service role client in middleware

- GIVEN `src/middleware.ts`
- WHEN it calls `createClient()` with `@supabase/supabase-js`
- THEN the call MUST be `createClient<typeof Database>(...)`

### Requirement: ESLint regression guard

A `no-restricted-imports` rule in `.eslintrc.json` MUST block direct imports from `@supabase/ssr` and `@supabase/supabase-js` outside the allowed wrapper files, using `allowImportPaths` to exempt the factory files and middleware.

#### Scenario: Blocked direct import in application code

- GIVEN a file outside the allowed wrapper set
- WHEN it contains `import { createClient } from '@supabase/supabase-js'`
- THEN ESLint MUST fail with a `no-restricted-imports` error

#### Scenario: Allowed import in wrapper files

- GIVEN `src/lib/supabase/server.ts`, `src/middleware.ts`, or any factory file
- WHEN it imports from `@supabase/ssr` or `@supabase/supabase-js`
- THEN ESLint MUST NOT report a `no-restricted-imports` error

## Non-Functional Requirements

- NFR1: Zero runtime behavior change — every modification is type-only (imports, generic parameters, ESLint config)
- NFR2: After fix, `npx tsc --noEmit 2>&1 | grep -c "TS18046"` MUST return ≤ 550 (baseline: 1,691)
- NFR3: `npm run build` MUST pass after all changes

## Not In Scope

- Remaining ~550 TS18046 (catch blocks, `request.body`, deliberate `unknown`) — separate change
- Other TS error categories (TS2339, TS2345, etc.)
- Merging or deduplicating `src/lib/supabase/` and `src/utils/supabase/` parallel hierarchies
- Adding `Database` type to `import type { SupabaseClient }` declarations (type-only, no factory call)
