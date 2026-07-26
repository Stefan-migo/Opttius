# Design: ts-error-hardening

## Technical Approach

Zero-runtime-cost type-only refactor across 6 phases. The core insight: **655 `as unknown` casts are the root cause, and 75% of errors are downstream of them**. The Supabase client is already typed via `<Database>` generic — the casts destroy that inference. Fix: remove the destruction, don't add new types.

Postgrest query builders have complex nested generics that are not worth threading through polymorphic utilities (`addBranchFilter`, etc.). For those boundaries: `any` (explicit opt-out) replaces `unknown` (implicit destruction), which eliminates the `as unknown` cascade without fighting Supabase's type system.

## Architecture Decisions

### Decision: `addBranchFilter` / `applyBranchFilter` type boundary

| Option | Tradeoff |
|--------|----------|
| `unknown` param + `as unknown` callsites | Current state — breaks strict mode |
| Generic `<T>` threading Postgrest types | Correct but extremely complex; PostgrestQueryBuilder has 7+ type params |
| **`any` param + return** | Simple, no cascading casts, well-known internal utility |

**Choice**: `query: unknown` → `query: any` in `addBranchFilter`, `addBranchFilterForBranchScopedTable`, and all `applyBranchFilter` closures. The `any` is intentional: these are well-tested internal utilities where the polymorphic Postgrest type chain is not worth expressing.

```ts
// BEFORE
export function addBranchFilter(query: unknown, ...): unknown {
// AFTER
export function addBranchFilter(query: any, ...): any {
```

### Decision: `createClientFromRequest<T>` generic

| Option | Tradeoff |
|--------|----------|
| Keep `T = Database` default, thread it internally | Fixes the phantom generic |
| Remove the generic entirely | Breaking change for callers that pass `T` |

**Choice**: Thread `T` internally. Make `createClient()` accept `<T = Database>` too so both paths use `T`.

```ts
// BEFORE
export async function createClient() {
  return createServerClient<Database>(...);
}
export async function createClientFromRequest<T = Database>(request?: NextRequest) {
  const client = createSupabaseClient<Database>(...); // T ignored
  const client = await createClient(); // hardcoded Database
}

// AFTER
export async function createClient<T = Database>() {
  return createServerClient<T>(...);
}
export async function createClientFromRequest<T = Database>(request?: NextRequest) {
  const client = createSupabaseClient<T>(...);
  const client = await createClient<T>();
}
```

### Decision: Dynamic `.from(tableVariable)` table map

| Option | Tradeoff |
|--------|----------|
| Remove `as unknown` only (table literal already typed) | Fixes ~95% of Phase 5 — all hardcoded `"quotes"`, `"orders"` etc. |
| Create `fromTable()` typed helper | Needed for truly dynamic tables (backup-service, notification helper) |
| Both | Handles all cases |

**Choice**: Fix both. The typed client already handles `supabase.from("orders")` → remove `as unknown`. For the ~5 truly dynamic cases, add a helper:

```ts
type TableName = keyof Database["public"]["Tables"];
export function fromTable<T extends TableName>(supabase: SupabaseClient<Database>, table: T) {
  return supabase.from(table);
}
```

### Decision: RPC calls — no dedicated wrapper needed

The generated types already type RPC functions (e.g., `is_admin: { Args: { user_id?: string }; Returns: boolean }`). With a typed `<Database>` client, `supabase.rpc("is_admin", { user_id })` correctly returns `PostgrestSingleResponse<boolean>` — the `as unknown` was destroying this. **Phase 3 is solved by Phase 1**: remove `as unknown` from RPC calls.

The manual `IsAdminParams` / `RPCFunctionMap` in `supabase-rpc.ts` are valuable as fallbacks for RPCs not yet in generated types. No change needed there.

### Decision: Validation middleware `validatedData`

| Option | Tradeoff |
|--------|----------|
| `Record<string, unknown>` | 3-line change, fixes the cast, `data.body` still weakly typed |
| Zod-inferred union type | Correct types but complex; the handler already has proper types for each schema |
| **`z.infer` per schema path** | Handler params typed; `validatedData` stays as construction scratchpad |

**Choice**: Change `const validatedData: unknown = {}` to `const validatedData: Record<string, unknown> = {}`. This is the minimal fix — each property is set via `schema.parse()` which already returns the correct type for that key.

### Decision: `catch (error: unknown)` → type guard

The standard pattern: `catch (error: unknown)` → `error instanceof z.ZodError` / `error instanceof ValidationError`. The annotation is already correct — these are NOT errors. The TS error comes from code inside the catch block that accesses `error` directly. Root cause: 39 occurrences where `error: unknown` is used but then `error` is passed to `logger.error()` or similar as `unknown` where `Error` is expected.

**Choice**: Add `instanceof Error` guards where missing. The catch parameter stays `unknown` (correct per TS strict). No change needed for blocks that already guard.

## Data Flow

```
SupabaseClient<Database>.from("orders")  →  PostgrestQueryBuilder<OrdersRow>
  │
  ├─ .select(...).eq(...).single()  →  PostgrestSingleResponse<OrdersRow>
  │     │  (remove 'as unknown' → types flow through)
  │     └─ { data, error }  ←  data: OrdersRow | null
  │
  ├─ addBranchFilter(query, ...)  →  (query: any → returns: any)
  │     │  ('any' preserves chaining without cascading 'unknown')
  │     └─ .eq(...).single()  →  any → destructure works
  │
  └─ .rpc("is_admin", {...})  →  PostgrestSingleResponse<boolean>
        │  (generated types already define Args + Returns)
        └─ { data: isAdmin }  ←  data: boolean | null
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/types/supabase-helpers.ts` | Modify | Add `TableName` type and `fromTable()` helper |
| `src/lib/supabase/server.ts` | Modify | Thread `<T>` generic through `createClient()` and `createClientFromRequest()` |
| `src/lib/supabase/service-role.ts` | Modify | Thread `<T>` generic if same pattern exists |
| `src/lib/api/branch-middleware.ts` | Modify | `addBranchFilter`/`addBranchFilterForBranchScopedTable` param types: `unknown` → `any` |
| `src/lib/validation/middleware.ts` | Modify | `validatedData: unknown` → `Record<string, unknown>` |
| `src/lib/api/services/*.ts` | Modify | Remove ~180 `as unknown` casts (Phase 1) |
| `src/app/api/**/*.ts` | Modify | Remove ~200 `as unknown` casts (Phase 5) |
| `src/components/admin/**/*.ts` | Modify | Remove ~100 `as unknown` casts (Phase 5) |
| `src/lib/ai/**/*.ts` | Modify | Remove `as unknown` + add `@ts-expect-error` for dynamic LLM shapes |
| `src/lib/backup-service.ts` | Modify | Use `fromTable()` helper for dynamic table names |
| `src/lib/notifications/_helpers/create-notification.ts` | Modify | Use `fromTable()` helper |
| `next.config.js` | Modify | Remove `typescript: { ignoreBuildErrors: true }` (PR 12) |

## Interfaces / Contracts

```ts
// src/types/supabase-helpers.ts — additions
import type { Database, SupabaseClient } from "./supabase";

type TableName = keyof Database["public"]["Tables"];

export function fromTable<T extends TableName>(
  supabase: SupabaseClient<Database>,
  table: T,
) {
  return supabase.from(table);
}

// src/lib/supabase/server.ts — generic threading
export async function createClient<T = Database>() {
  return createServerClient<T>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { /* ... */ },
  );
}

export async function createClientFromRequest<T = Database>(
  request?: NextRequest,
): Promise<{
  client: SupabaseClient<T>;
  getUser: () => Promise<{ data: { user: User } | null; error: AuthError | null }>;
}> {
  // Bearer path
  const client = createSupabaseClient<T>(supabaseUrl, supabaseAnonKey, { /* ... */ });
  // Cookie path — createClient<T> now threads T
  const client = await createClient<T>();
}

// src/lib/api/branch-middleware.ts — type cleanup
export function addBranchFilter(query: any, branchId: string | null, isSuperAdmin: boolean, organizationId?: string | null): any {
```

All other changes are removals of `as unknown` and `@ts-expect-error` annotations — no new interfaces.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Type check | `npx tsc --noEmit` exits 0 | Run after each PR |
| Regression | Existing test suite | `npm run test:run` must pass |
| Safety | No runtime path changes | All changes are type-only — same JS output |

**PR validation gate**: Each PR runs `npx tsc --noEmit && npm run test:run`. PR 12 additionally verifies that removing `ignoreBuildErrors` is the final toggle.

## Migration / Rollout

12 stacked PRs per the proposal's PR slicing table. PR 1–5 (Phase 1, &as unknown; removal in services + components) and PR 9–10 (Phase 5, app/api routes) share the same code pattern — they differ only by directory scope.

PR order respects type dependencies: Phase 2 (`createClientFromRequest` generic) must precede Phase 1+5 because files importing `createClient` benefit from the generic fix. Similarly, Phase 4 (middleware) must precede consumers that use `withValidation`.

## Open Questions

- [ ] Will the PostgrestQueryBuilder types constraining `addBranchFilter` ever be worth threading (e.g., if we add a typed middleware layer later)? For now, `any` is definitive — re-evaluate only if a typed query middleware emerges.
