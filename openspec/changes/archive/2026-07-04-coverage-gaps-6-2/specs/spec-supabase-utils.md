# Delta: Supabase Client Utilities — Unit Tests

**Change**: coverage-gaps-6-2 / add-unit-tests-supabase-utils
**Type**: New test coverage — no behavioral changes to production code.

## Test Target: `client.ts`

**File**: `src/__tests__/unit/supabase/client.test.ts`

### Function: `createClient()`

Returns a Supabase client configured via `createBrowserClient` from `@supabase/ssr`.

#### Scenario: returns client when env vars are set

- GIVEN `NEXT_PUBLIC_SUPABASE_URL` is set to `"https://test.supabase.co"`
- AND `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set to `"test-anon-key"`
- WHEN `createClient()` is called
- THEN it calls `createBrowserClient` with the URL and anon key
- AND returns the mocked client object

#### Scenario: uses non-null assertion (env vars undefined at runtime)

- GIVEN env vars are NOT set (undefined)
- WHEN `createClient()` is called
- THEN it still calls `createBrowserClient` (TypeScript `!` assertion — runtime may pass `undefined`)

### Mocks Required

- `@supabase/ssr` → `{ createBrowserClient: vi.fn(() => ({ browser: true })) }`
- `vi.stubEnv` for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Test Target: `server.ts`

**File**: `src/__tests__/unit/supabase/server.test.ts`

### Function: `createClient()` (no args)

Uses `cookies()` from `next/headers` + `createServerClient` from `@supabase/ssr`.

#### Scenario: returns server client when env vars are set

- GIVEN `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- AND `cookies()` mock returns `{ getAll: vi.fn(), set: vi.fn() }`
- WHEN `createClient()` is called
- THEN it calls `createServerClient` with URL, anon key, and cookies config
- AND returns the mocked client

#### Scenario: catches `setAll` errors from Server Components

- GIVEN `cookieStore.set()` throws (simulating Server Component context)
- WHEN `setAll` is invoked inside the cookies config
- THEN the error is silently caught (no throw)

### Function: `createClientFromRequest(request)`

Supports both Bearer token (API routes) and cookie (browser) auth.

#### Scenario: creates client from Bearer token

- GIVEN a `NextRequest` mock with `Authorization: Bearer valid-jwt`
- WHEN `createClientFromRequest(request)` is called
- THEN it creates a Supabase client with `global.headers.Authorization: Bearer valid-jwt`
- AND `autoRefreshToken: false`, `persistSession: false`
- AND `getUser()` calls `client.auth.getUser(valid-jwt)` with the token

#### Scenario: falls back to cookie auth when no Bearer header

- GIVEN a `NextRequest` mock with NO Authorization header
- WHEN `createClientFromRequest(request)` is called
- THEN it falls back to `createClient()` (cookie-based)
- AND `getUser()` calls `client.auth.getUser()` without token

#### Scenario: falls back to cookie auth when request is undefined

- GIVEN no request argument
- WHEN `createClientFromRequest()` is called
- THEN it falls back to cookie flow

#### Scenario: ignores non-Bearer Authorization header

- GIVEN a request with `Authorization: Basic base64stuff`
- WHEN `createClientFromRequest(request)` is called
- THEN it falls back to cookie flow (branch coverage for `authHeader?.startsWith("Bearer ")`)

### Function: `createServiceRoleClient()`

Creates admin client with `SUPABASE_SERVICE_ROLE_KEY`.

#### Scenario: creates service role client when key is set

- GIVEN `SUPABASE_SERVICE_ROLE_KEY` is set to a valid JWT
- WHEN `createServiceRoleClient()` is called
- THEN it creates a client with the service role key
- AND `autoRefreshToken: false`, `persistSession: false`

#### Scenario: throws when key is missing

- GIVEN `SUPABASE_SERVICE_ROLE_KEY` is NOT set (empty string)
- WHEN `createServiceRoleClient()` is called
- THEN it throws `"SUPABASE_SERVICE_ROLE_KEY is not configured"`

### Mocks Required

- `@supabase/ssr` → `{ createServerClient: vi.fn(() => ({ server: true })) }`
- `@supabase/supabase-js` → `{ createClient: vi.fn(() => ({ supabase: true })) }`
- `next/headers` → `{ cookies: vi.fn(() => ({ getAll: vi.fn(() => []), set: vi.fn() })) }`
- `vi.stubEnv` for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NextRequest` mock: use `new Request("http://localhost")` + `headers.set()` cast as `unknown as NextRequest`

---

## Test Target: `cron.ts`

**File**: `src/__tests__/unit/supabase/cron.test.ts`

### Function: `createCronClient()`

#### Scenario: returns cron client when key is set

- GIVEN `SUPABASE_SERVICE_ROLE_KEY` is set
- WHEN `createCronClient()` is called
- THEN it creates client with service role key
- AND `autoRefreshToken: false`, `persistSession: false`

#### Scenario: throws when key is missing

- GIVEN `SUPABASE_SERVICE_ROLE_KEY` is NOT set
- WHEN `createCronClient()` is called
- THEN it throws `"SUPABASE_SERVICE_ROLE_KEY is not configured for cron client"`

### Mocks Required

- `@supabase/supabase-js` → `{ createClient: vi.fn(() => ({ cron: true })) }`
- `vi.stubEnv` for env vars

---

## Test Target: `webhook.ts` (Expand)

**File**: `src/__tests__/unit/supabase/webhook.test.ts`

Existing tests cover: success + missing key. Add:

### Additional Scenarios

#### Scenario: passes URL and auth config correctly

- GIVEN both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_WEBHOOK_KEY` are set
- WHEN `createWebhookClient()` is called
- THEN `createClient` is called with `"https://test.supabase.co"`, the webhook key, and `{ auth: { autoRefreshToken: false, persistSession: false } }`

(Existing test verifies `createClient` call args but does not verify URL. Ensure explicit URL assertion.)

### Mocks Required

No new mocks — extend existing `vi.mock("@supabase/supabase-js")` pattern.

---

## Acceptance Criteria

- [ ] `npx vitest run src/__tests__/unit/supabase/client.test.ts` — passes
- [ ] `npx vitest run src/__tests__/unit/supabase/server.test.ts` — passes
- [ ] `npx vitest run src/__tests__/unit/supabase/cron.test.ts` — passes
- [ ] `npx vitest run src/__tests__/unit/supabase/webhook.test.ts` — passes (no regressions)
- [ ] `npx vitest run src/__tests__/unit/supabase/` — all 4 files pass
- [ ] `npm run test:unit` — no regressions
