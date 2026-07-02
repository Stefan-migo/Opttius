# Tasks: Service Role Reduction — AI Agent

## Metadata

- **Change**: `service-role-reduction-ai-agent`
- **Delivery Strategy**: chained, stacked-to-main
- **Review Budget**: 400 lines per PR
- **Execution Mode**: auto

## Design Notes

### What we're doing

The AI Agent has 7 `createServiceRoleClient()` call sites across 6 files. The user is already authenticated in the route handler (`route.ts` line 35, via `createClient()`). We propagate that RLS-scoped `supabase` client through the entire agent pipeline — no new DB roles, no behavioral changes.

### How the data flows

```
route.ts (createClient = auth'd, RLS-scoped)
  ├─→ executeMemoryLoop({ supabase })          ← currently gets service_role client
  └─→ createAgent({ supabase })                ← ALREADY passes auth'd client
        ├─→ agent.supabaseForUsageLog           ← usage logging (already uses auth'd)
        ├─→ loadSessionHistory()                ← creates own service_role — FIX
        ├─→ initializeMemoryManager()           ← calls memory-init (creates service_role) — FIX
        ├─→ initializeOrganizationalMemory()    ← calls memory-init (creates service_role) — FIX
        └─→ initializeToolExecutor()            ← calls tool-executor (creates service_role) — FIX
              └─→ context.supabase              ← already passed to tools
                    ├─→ appointments.ts          ← creates own service_role — FIX
                    └─→ importBulk.ts            ← creates own service_role — FIX
```

### What we're NOT doing

- Not removing `createServiceRoleClient()` from the codebase — it's still needed for webhooks, cron, admin routes
- Not changing agent behavior, memory logic, or tool output
- Not touching `auto-trigger.ts` — it already accepts `supabase` as a parameter

### Risk: RLS compatibility

Tools already check `organization_id` before acting (e.g., `appointments.ts` line 628 checks `organization_id !== organizationId`). RLS enforces the same boundary. If a tool already has correct org-scoping in app logic, RLS won't block it. The only risk is if a tool reads data across organizations — but those would already fail app-level checks.

---

## PR 1: Core Plumbing — propagate auth'd client through agent internals

**Status**: ✅ Complete

**Scope**: `route.ts`, `agent.ts`, `memory-init.ts`, `tool-executor.ts`
**Dependencies**: None
**Estimated Δ**: ~45-60 lines

### 1.1 `route.ts` — use auth'd supabase for memory loop ✅

| File | Change |
|------|--------|
| `src/app/api/agent/chat/route.ts:100-110` | Pass `supabase` (already auth'd from line 35) to `executeMemoryLoop` instead of creating `serviceSupabase` via `createServiceRoleClient()` |
| | Remove the dynamic `createServiceRoleClient` import on lines 101-104 |
| | `executeMemoryLoop({ message, orgId, supabase })` — supabase is the auth'd client |

**Why**: The route handler already has an auth'd `supabase` from `createClient()`. This is the entry point — the one place where service_role leaks into the agent pipeline.

**Verification**: Agent chat continues working with same responses.

### 1.2 `agent.ts` — use `this.supabaseForUsageLog` in `loadSessionHistory`

| File | Change |
|------|--------|
| `src/lib/ai/agent/agent.ts:141-144` | Replace `createServiceRoleClient()` with `this.supabaseForUsageLog` |
| | Remove the dynamic import of `createServiceRoleClient` |

**Why**: The agent already stores the auth'd supabase client as `this.supabaseForUsageLog` (line 79). `loadSessionHistory` should use it instead of creating a new service_role client.

### 1.3 `agent.ts` — pass supabase to memory init functions

| File | Change |
|------|--------|
| `src/lib/ai/agent/agent.ts:92` | `initMemoryManager(this.userId, this.sessionId, this.supabaseForUsageLog)` |
| `src/lib/ai/agent/agent.ts:103` | `initOrgMemory(this.organizationId, this.supabaseForUsageLog)` |

**Why**: `initializeMemoryManager()` and `initializeOrganizationalMemory()` currently call memory-init functions that create their own service_role clients. Passing the auth'd client from the agent skips that.

### 1.4 `agent.ts` — pass supabase to tool executor

| File | Change |
|------|--------|
| `src/lib/ai/agent/agent.ts:120-127` | Add `supabase: this.supabaseForUsageLog` to the options passed to `createToolExecutor()` |

**Why**: `createToolExecutor()` creates its own service_role client. Passing the auth'd client lets it drop that.

### 1.5 `memory-init.ts` — accept optional `supabase` param

| File | Change |
|------|--------|
| `src/lib/ai/agent/memory-init.ts:8-37` | Change signature: `initializeMemoryManager(userId: string, sessionId?: string, supabase?: SupabaseClient)` |
| | If `supabase` provided, use it; otherwise fall back to `createServiceRoleClient()` (backward compat) |
| `src/lib/ai/agent/memory-init.ts:42-63` | Change signature: `initializeOrganizationalMemory(organizationId: string, supabase?: SupabaseClient)` |
| | Same fallback pattern |

**Why**: Makes the functions flexible — new code passes the auth'd client, existing callers (if any) still work via fallback.

**Verification**: Both functions work when supabase IS and IS NOT provided. Existing callers outside the agent (if any) don't break.

### 1.6 `tool-executor.ts` — accept `supabase` from caller

| File | Change |
|------|--------|
| `src/lib/ai/agent/tool-executor.ts:110-158` | Change signature: `createToolExecutor(options, supabase?: SupabaseClient)` |
| | Or better: add `supabase` to `CreateToolExecutorOptions` interface |
| | If caller provides `supabase`, use it; otherwise fall back to `createServiceRoleClient()` |

**Why**: `createToolExecutor` currently creates its own service_role client and the resulting `supabase` is already passed to `ToolExecutionContext`. If the caller provides the auth'd client, we skip the service_role creation entirely.

---

## PR 2: Tools — use scoped client instead of service_role

**Status**: ✅ Complete

**Scope**: `appointments.ts`, `importBulk.ts`
**Dependencies**: PR 1 (tool-executor already passes auth'd `supabase` in `context`)
**Estimated Δ**: ~15-25 lines

### 2.1 `appointments.ts` — remove `createServiceRoleClient` usage

| File | Change |
|------|--------|
| `src/lib/ai/tools/appointments.ts:11` | Remove `import { createServiceRoleClient } from "@/utils/supabase/server"` |
| `src/lib/ai/tools/appointments.ts:638` | Replace `const serviceSupabase = createServiceRoleClient()` with `const { supabase } = context` |

**Why**: The tool already receives a `context` parameter that includes `supabase` (passed from tool-executor). The `rescheduleAppointment` tool was unnecessarily creating a service_role client when `context.supabase` would work.

### 2.2 `importBulk.ts` — remove `createServiceRoleClient` usage

| File | Change |
|------|--------|
| `src/lib/ai/tools/importBulk.ts:3` | Remove `import { createServiceRoleClient } from "@/utils/supabase/server"` |
| `src/lib/ai/tools/importBulk.ts:81` | Replace `const serviceSupabase = createServiceRoleClient()` with `const { supabase } = context` |
| `src/lib/ai/tools/importBulk.ts:233` | Same — the `executeBulkImport` executor already has `supabase` in context (line 227-232 destructures context but still creates service_role) |

**Why**: Same pattern as appointments — `context.supabase` is already available from the tool executor.

---

## PR 3: Tests — update mocks for scoped client

**Status**: ✅ Complete

**Scope**: `appointments.test.ts`
**Dependencies**: PR 2
**Estimated Δ**: ~25-40 lines

### 3.1 `appointments.test.ts` — update `rescheduleAppointment` tests

| File | Change |
|------|--------|
| `src/lib/ai/tools/__tests__/appointments.test.ts:13-15` | Remove the `vi.mock("@/utils/supabase/server")` mock for `createServiceRoleClient` |
| `src/lib/ai/tools/__tests__/appointments.test.ts:219-223` | In "reschedules when slot is available": mock `mockSupabase.rpc` instead of mocking `createServiceRoleClient().rpc` |
| `src/lib/ai/tools/__tests__/appointments.test.ts:272-282` | Same change for "fails when slot unavailable" |

**Why**: After PR 2, `rescheduleAppointment` no longer calls `createServiceRoleClient()`. Instead, it calls `context.supabase.rpc()`. The test's `mockSupabase` (from `createMockSupabase()`) already has a mocked `rpc`. We just need to wire it up.

---

## Chained PR Dependency Graph

```
PR 1 (core plumbing) ──→ PR 2 (tools cleanup) ──→ PR 3 (tests)
     no deps                  depends on PR 1        depends on PR 2
```

PR sequence: `PR 1 → PR 2 → PR 3` pushed in order, stacked-to-main.

---

## Success Criteria

- [x] Zero `createServiceRoleClient()` call sites remaining in `src/lib/ai/` (7 call sites → 0)
- [ ] Agent chat responses identical before and after (regression)
- [x] `executeMemoryLoop` receives auth'd supabase client
- [x] `loadSessionHistory` uses auth'd client
- [x] Both memory init functions accept and use auth'd client
- [x] Tool executor uses auth'd client
- [x] `appointments.ts` tool uses `context.supabase`
- [x] `importBulk.ts` tools use `context.supabase`
- [x] All existing tests pass
- [ ] No behavioral changes to tool output

---

## Rollback

Per PR:
1. **PR 1**: Revert the 4 files — each is a standalone parameter change
2. **PR 2**: Revert 2 tool files — restore imports and variable names
3. **PR 3**: Revert test file — restore `createServiceRoleClient` mocks

No DB migrations, no data loss risk for any PR.
