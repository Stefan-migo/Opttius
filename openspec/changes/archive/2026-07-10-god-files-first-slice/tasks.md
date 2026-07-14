# Tasks: God Files — First Slice

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,004 (4 stacked PRs) |
| 400-line budget risk | Medium per-PR, Low overall (each PR ≤ 299 lines) |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (169) → PR 2 (243) → PR 3 (293) → PR 4 (299) |
| Delivery strategy | force-chained (auto-chain) |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Extract supabase.ts helpers to supabase-helpers.ts | PR 1 | Independent, merges to main first |
| 2 | Extract SecurityAuditDialog + SystemStatusDialog | PR 2 | Modifies SystemAdminContent.tsx, stacks on main after PR 1 |
| 3 | Extract BackupDialog + RestoreDialog | PR 3 | Modifies same parent file, stacks on main after PR 2 |
| 4 | Extract RestoreResultsDialog + DeleteBackupDialog | PR 4 | Modifies same parent file, stacks on main after PR 3 |

---

## PR 1: supabase-helpers extraction (~169 lines)

- [x] 1.1 Create `src/types/supabase-helpers.ts` with lines 8367–8530 from `src/types/supabase.ts` (types `DatabaseWithoutInternals`, `DefaultSchema`, `Tables`, `TablesInsert`, `TablesUpdate`, `Enums`, `CompositeTypes`, `Constants`)
- [x] 1.2 Replace lines 8367–8530 in `src/types/supabase.ts` with `export * from './supabase-helpers'`
- [x] 1.3 Verify: `npx tsc --noEmit` passes (zero new errors), tests 2687✅/67 skipped, 3 consumer imports unchanged, 1 re-export in supabase.ts

## PR 2: SecurityAuditDialog + SystemStatusDialog (~243 lines)

- [ ] 2.1 Create `src/app/admin/system/_components/_dialogs/SecurityAuditDialog.tsx` — extract `<Dialog>` block (original lines 554–622), receives `open`, `onOpenChange`, `securityAuditResults` as props
- [ ] 2.2 Create `src/app/admin/system/_components/_dialogs/SystemStatusDialog.tsx` — extract `<Dialog>` block (original lines 625–797), receives `open`, `onOpenChange`, `systemStatusReport` as props
- [ ] 2.3 In `SystemAdminContent.tsx`: add imports for both dialogs, replace inline blocks (lines 554–622 and 625–797) with `<SecurityAuditDialog>` and `<SystemStatusDialog>` calls
- [ ] 2.4 Verify: `npx tsc --noEmit` passes

## PR 3: BackupDialog + RestoreDialog (~293 lines)

- [ ] 3.1 Create `src/app/admin/system/_components/_dialogs/BackupDialog.tsx` — extract `<Dialog>` block (original lines 800–975), receives `open`, `onOpenChange`, `backupResult`, `handleDownloadBackup` as props
- [ ] 3.2 Create `src/app/admin/system/_components/_dialogs/RestoreDialog.tsx` — extract `<Dialog>` block (original lines 978–1092), receives `open`, `onOpenChange`, `selectedBackup`, `isRestoring`, `confirmRestoreBackup` as props
- [ ] 3.3 In `SystemAdminContent.tsx`: add imports, replace inline blocks (lines 800–975 and 978–1092) with `<BackupDialog>` and `<RestoreDialog>`
- [ ] 3.4 Verify: `npx tsc --noEmit` passes

## PR 4: RestoreResultsDialog + DeleteBackupDialog (~299 lines)

- [x] 4.1 Create `src/app/admin/system/_components/_dialogs/RestoreResultsDialog.tsx` — extract `<Dialog>` block (original lines 1095–1282), receives `open`, `onOpenChange`, `restoreResults` as props
- [x] 4.2 Create `src/app/admin/system/_components/_dialogs/DeleteBackupDialog.tsx` — extract `<Dialog>` block (original lines 1285–1393), receives `open`, `onOpenChange`, `selectedBackup`, `isDeleting`, `confirmDeleteBackup` as props
- [x] 4.3 In `SystemAdminContent.tsx`: add imports, replace inline blocks (lines 1095–1282 and 1285–1393) with `<RestoreResultsDialog>` and `<DeleteBackupDialog>`; remove unused imports
- [x] 4.4 Verify: `npx tsc --noEmit` passes, tests pass

## Validation (all PRs)

| Check | Command |
|-------|---------|
| TypeScript | `npx tsc --noEmit` — zero errors |
| Existing tests | `npm run test:all` — all green |
| Imports stable | `rg "from.*types/supabase" src/` — 3 entries, unchanged |
| No re-export leak | `rg "from.*supabase-helpers" src/` — only re-export in supabase.ts |
| Dialogs count | 6 files in `_dialogs/` |
| No inline dialogs | 0 `<Dialog` in `SystemAdminContent.tsx` |
