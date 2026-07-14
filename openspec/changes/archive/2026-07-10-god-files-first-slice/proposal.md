# Proposal: God Files — First Slice

## Intent

2 megafauna files (~9,926 combined lines) create cognitive load, slow type-checking, and block parallel work. First slice of Fase 6.1 consolidation: mechanically extract helpers and inline dialogs to reduce both files under 400 lines. Zero behavioral changes.

## Scope

### In Scope

| # | File | Lines | Strategy |
|---|------|-------|----------|
| A | `src/types/supabase.ts` | 8,530 | Phase 1: Extract ~100 lines of helpers (`Tables<>`, `Enums<>`, `getColumns`) → `src/types/supabase-helpers.ts`. Main `Database` type + domain types stay. |
| B | `src/app/admin/system/_components/SystemAdminContent.tsx` | 1,396 | Extract 6 inline dialogs (SystemConfig, FormOptionsConfig, WebhookMonitor, NotificationSettings, BackupConfig, SecurityLogs) each 150–300 lines → `_dialogs/` subdirectory. Parent imports them back. |

### Out of Scope
- supabase.ts Phase 2 (domain splits) — deferred to future slice
- Other 3 megafauna files (WorkOrderDetailContent, AnalyticsContent, AppointmentsContent)
- Any behavioral changes, logic fixes, or test additions

## Capabilities

### New Capabilities
None — pure refactor, no new spec-level behavior.

### Modified Capabilities
None — existing behavior unchanged.

## Approach

**Pattern**: Extract → import back. Mechanical moves verified by TypeScript compilation.

1. **File A** — Grep for all helper exports in `supabase.ts`, move them to `supabase-helpers.ts`. Update the 3 known consumers (`server.ts`, `products/types.ts`, `products/service.ts`) to import from the new path. Re-export from `supabase.ts` for backward compat.
2. **File B** — Each `*Dialog` block in `SystemAdminContent.tsx` gets its own file under `_dialogs/` with the same props interface. Parent imports and renders them at the same call site. Pure file split — same props, same renders.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/types/supabase.ts` | Modified | Shrinks ~100 lines (helpers extracted) |
| `src/types/supabase-helpers.ts` | New | ~100 lines of type helpers |
| `src/types/server.ts` | Modified | Import path update |
| `src/types/products/types.ts` | Modified | Import path update |
| `src/types/products/service.ts` | Modified | Import path update |
| `src/app/admin/system/_components/SystemAdminContent.tsx` | Modified | Shrinks ~600 lines, imports 6 dialogs |
| `src/app/admin/system/_components/_dialogs/` | New | 6 dialog component files |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing consumer of supabase.ts helpers | Low | Grep entire codebase, not just known imports. TypeScript catches all errors. |
| Accidental behavioral change | Low | Pure file moves — same props, same render tree. Verify with `tsc --noEmit` + smoke test. |
| Import path errors in new files | Low | TypeScript compilation catches all missing exports. |

## Rollback Plan

Single PR (or 2 stacked if >400 lines). Rollback: `git revert <merge-commit>`. No data, no schema, no behavioral toggles.

## Dependencies

- None — self-contained refactor

## Success Criteria

- [ ] `src/types/supabase.ts` shrinks by ~100 lines (helpers extracted)
- [ ] `SystemAdminContent.tsx` shrinks below 500 lines (6 dialogs extracted)
- [ ] `npm run build` passes (TypeScript + Next.js)
- [ ] `npm run test:all` passes (existing tests green)
- [ ] No changes to public APIs, component props, or exported types
- [ ] All diffs are pure reorganizations — zero behavioral changes
