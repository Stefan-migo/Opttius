# Proposal: Service Role Reduction — AI Agent

## Intent

The AI Agent uses `createServiceRoleClient()` in 6 files bypassing RLS. The user is already authenticated in the route handler — propagate that RLS-scoped client instead, reducing service_role blast radius.

## Scope

### In Scope
- Replace `createServiceRoleClient()` with the authenticated client in all AI Agent internals
- Pass auth'd client from route handler down through: memory loop, session history, memory init, tool executor, tools
- Drop redundant imports in `appointments.ts` and `importBulk.ts`

### Out of Scope
- service_role usage outside AI Agent (webhooks, cron, backups — separate changes)
- Behavioral changes to agent output or memory logic
- Removing `createServiceRoleClient()` entirely

## Capabilities

**New Capabilities**: None (pure security refactor)
**Modified Capabilities**: None

## Approach

1. **`route.ts`** — pass existing auth'd `supabase` (line 35) to `executeMemoryLoop` instead of creating service_role
2. **`agent.ts`** — use `this.supabaseForUsageLog` in `loadSessionHistory()`; pass it to memory-init and tool-executor
3. **`memory-init.ts`** — accept optional `supabase` param; drop internal service_role creation
4. **`tool-executor.ts`** — accept `supabase` from caller; already passes as `context.supabase`
5. **`appointments.ts`** — remove `createServiceRoleClient()`, use `context.supabase`
6. **`importBulk.ts`** — remove `createServiceRoleClient()`, use `context.supabase`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/api/agent/chat/route.ts` | Mod | Pass auth'd supabase to memory loop |
| `src/lib/ai/agent/agent.ts` | Mod | Use auth'd client for history + memory + tools |
| `src/lib/ai/agent/memory-init.ts` | Mod | Accept supabase param |
| `src/lib/ai/agent/tool-executor.ts` | Mod | Accept supabase from caller |
| `src/lib/ai/tools/appointments.ts` | Mod | Remove service_role import |
| `src/lib/ai/tools/importBulk.ts` | Mod | Remove service_role import |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| RLS blocks legitimate tool access | Low | Tools already org-scoped; RLS mirrors same checks |
| Storage ops fail with scoped client | Low | Verify `import-temp` bucket policies |
| Agent response changes | Low | RLS enforces same org/branch scope |

## Rollback Plan

1. Revert 6 files to `createServiceRoleClient()` — one import change each
2. No DB migration to revert, no data loss risk

## Dependencies

None.

## Success Criteria

- [ ] Zero `createServiceRoleClient()` in `src/lib/ai/` (6 files, 7 call sites → 0)
- [ ] Agent chat flows return same responses (regression)
- [ ] Tools execute successfully with RLS-scoped client
- [ ] `agent-loop.ts` receives auth'd client from route handler
