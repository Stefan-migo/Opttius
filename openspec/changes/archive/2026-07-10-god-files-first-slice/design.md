# Design: God Files — First Slice

## Technical Approach

Two independent mechanical extractions across two megafauna files, split into 4 stacked PRs to stay within 400-line budget. Zero behavioral changes. Verify by `tsc --noEmit`.

**Codebase findings (vs proposal)**:
- `supabase.ts` helpers span 164 lines (not ~100), and `getColumns`/`CompositeSelectableColumns`/`TablesRelations` do **not exist** in the codebase — the actual exports are `Tables`, `TablesInsert`, `TablesUpdate`, `Enums`, `CompositeTypes`, and `Constants`.
- `SystemAdminContent.tsx` inline dialogs are **not** named SystemConfig/FormOptionsConfig/WebhookMonitor/NotificationSettings/BackupConfig/SecurityLogs — those are all **imported** components from `../components/`. The actual inline dialogs are 6 backup/restore/security dialogs at lines 554-1393.
- All 3 consumers of `@/types/supabase` import only `{ Database }` — so re-export from supabase.ts means **zero consumer changes** needed.

---

## Architecture Decisions

### Decision: File structure for extracted dialogs

**Choice**: Flat files in `_dialogs/` directory, one per dialog, standard React functional components receiving all state as props.

**Rationale**: Each dialog has unique local state (`securityAuditResults`, `systemStatusReport`, `backupResult`, etc.) currently living in the parent. Passing them as props is the minimal change — no custom hooks, no context, no behavioral refactor. Follows the existing project pattern (see `_components/OrganizationInfoCard.tsx`, `ConfigItem.tsx`).

### Decision: Re-export vs update consumers for supabase helpers

**Choice**: Re-export helpers from `supabase.ts` via `export * from './supabase-helpers'`. No consumer import updates.

**Rationale**: Zero consumer changes, zero risk. All 3 consuming files import only `{ Database }` from `@/types/supabase` — the re-export is invisible to them. The 4 files importing `Tables` from `@/types/database` are on a completely separate type system.

### Decision: Chained PR split (400-line budget)

| PR | Content | New Lines | Risk |
|----|---------|-----------|------|
| 1 | supabase-helpers extraction | ~169 | Minimal — isolated type-only change |
| 2 | SecurityAuditDialog + SystemStatusDialog | ~243 | Low — pure JSX extraction |
| 3 | BackupDialog + RestoreDialog | ~293 | Low — pure JSX extraction |
| 4 | RestoreResultsDialog + DeleteBackupDialog | ~299 | Low — pure JSX extraction |

**Rationale**: PR 1 is independent and merges first. PRs 2-4 are sequential (each modifies the same parent file) and stacked onto PR 2's branch, then to main.

---

## File Changes

### File A: supabase.ts helpers

| File | Action | Lines |
|------|--------|-------|
| `src/types/supabase-helpers.ts` | **Create** | ~164 |
| `src/types/supabase.ts` | **Modify** | ~5 (remove helpers, add re-export) |

**Extraction boundary**: Lines 8367–8530 from `supabase.ts`:
- `type DatabaseWithoutInternals` (private, l.8367)
- `type DefaultSchema` (private, l.8369)
- `export type Tables<>` (l.8374)
- `export type TablesInsert<>` (l.8403)
- `export type TablesUpdate<>` (l.8428)
- `export type Enums<>` (l.8453)
- `export type CompositeTypes<>` (l.8470)
- `export const Constants` (l.8487)

**Modification to supabase.ts**: Replace lines 8367–8530 with:
```ts
export * from './supabase-helpers';
```

**Consumers affected**: **Zero** — all 3 consumers import only `{ Database }`.

### File B: SystemAdminContent.tsx dialogs

| File | Action | Lines |
|------|--------|-------|
| `_components/_dialogs/SecurityAuditDialog.tsx` | **Create** | ~69 |
| `_components/_dialogs/SystemStatusDialog.tsx` | **Create** | ~174 |
| `_components/_dialogs/BackupDialog.tsx` | **Create** | ~177 |
| `_components/_dialogs/RestoreDialog.tsx` | **Create** | ~116 |
| `_components/_dialogs/RestoreResultsDialog.tsx` | **Create** | ~189 |
| `_components/_dialogs/DeleteBackupDialog.tsx` | **Create** | ~110 |
| `SystemAdminContent.tsx` | **Modify** | ~50 |

**Extraction boundaries**:

| Dialog | Lines | State Dependencies |
|--------|-------|--------------------|
| SecurityAuditDialog | 555–622 | `securityAuditResults`, `setShowSecurityAuditDialog` |
| SystemStatusDialog | 625–797 | `systemStatusReport`, `setShowSystemStatusDialog` |
| BackupDialog | 800–975 | `backupResult`, `setShowBackupDialog`, `handleDownloadBackup` |
| RestoreDialog | 978–1092 | `selectedBackup`, `isRestoring`, `setShowRestoreDialog`, `confirmRestoreBackup` |
| RestoreResultsDialog | 1095–1282 | `restoreResults`, `setShowRestoreResultsDialog` |
| DeleteBackupDialog | 1285–1393 | `selectedBackup`, `isDeleting`, `setShowDeleteBackupDialog`, `confirmDeleteBackup` |

**Props interface pattern** (example):
```tsx
// SecurityAuditDialog.tsx
interface SecurityAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  securityAuditResults: { issues: string[]; issues_count: number } | null;
}
```

**Modification to SystemAdminContent.tsx**:
1. Remove inline `<Dialog>` blocks (lines 554–1393)
2. Add imports from `_dialogs/`
3. Replace each dialog block with `<SecurityAuditDialog ... />` etc.
4. Props pass-through — no logic changes

---

## Interfaces / Contracts

### supabase-helpers.ts

```ts
// Re-exported types (identical to current supabase.ts exports)
export type Tables<...> = ...;
export type TablesInsert<...> = ...;
export type TablesUpdate<...> = ...;
export type Enums<...> = ...;
export type CompositeTypes<...> = ...;
export const Constants = { ... };
```

### Dialog Components

```tsx
// All follow the same pattern:
interface {Name}DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // plus dialog-specific data and callbacks
}
```

---

## Validation Plan

| Check | Command | Expected |
|-------|---------|----------|
| TypeScript compilation | `npx tsc --noEmit` | Zero errors |
| Existing tests | `npm run test:all` | All green |
| Imports correct | `rg "from.*types/supabase" src/` | 3 entries, unchanged |
| No re-export breakage | `rg "from.*supabase-helpers" src/` | Only the re-export in supabase.ts |
| Dialog count match | `grep -c "Dialog" _dialogs/*.tsx` | 6 files |
| Dialog call sites | `grep -c "<Dialog" SystemAdminContent.tsx` | 0 (all extracted) |

---

## PR Split Recommendation

4 stacked PRs, forced-chain to `main`:

| # | Branch | Content | Est. Changed Lines |
|---|--------|---------|--------------------|
| 1 | `refactor/supabase-helpers-extract` | supabase.ts → supabase-helpers.ts | ~169 |
| 2 | `refactor/extract-dialogs-1` | SecurityAuditDialog + SystemStatusDialog | ~243 |
| 3 | `refactor/extract-dialogs-2` | BackupDialog + RestoreDialog | ~293 |
| 4 | `refactor/extract-dialogs-3` | RestoreResultsDialog + DeleteBackupDialog | ~299 |

Branch strategy: PR 1 → main. PR 2 (stacked on main after PR 1) → main. PR 3 (stacked on main after PR 2) → main. PR 4 (stacked on main after PR 3) → main.

---

## Task Breakdown

### Task 1: Extract supabase.ts helpers
- Create `src/types/supabase-helpers.ts` with lines 8367–8530
- Replace those lines in `supabase.ts` with `export * from './supabase-helpers'`
- Verify: `tsc --noEmit`, `npm run test:all`

### Task 2: Extract SecurityAuditDialog + SystemStatusDialog
- Create `_dialogs/SecurityAuditDialog.tsx` and `_dialogs/SystemStatusDialog.tsx`
- Update imports in `SystemAdminContent.tsx`, replace inline blocks
- Verify: `tsc --noEmit`

### Task 3: Extract BackupDialog + RestoreDialog
- Create `_dialogs/BackupDialog.tsx` and `_dialogs/RestoreDialog.tsx`
- Update imports in `SystemAdminContent.tsx`, replace inline blocks
- Verify: `tsc --noEmit`

### Task 4: Extract RestoreResultsDialog + DeleteBackupDialog
- Create `_dialogs/RestoreResultsDialog.tsx` and `_dialogs/DeleteBackupDialog.tsx`
- Update imports in `SystemAdminContent.tsx`, replace inline blocks
- Verify: `tsc --noEmit`

---

## Open Questions

- None. All boundaries confirmed by reading the actual codebase.
