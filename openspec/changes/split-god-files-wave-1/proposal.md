# Proposal: Split God Files — Wave 1

## Intent

5 files exceed 1000 lines (5,896 total), creating cognitive load, merge conflicts, and review bottlenecks. Wave 1 reduces each to <400 lines via pure extract + compose — zero behavioral changes. Improves maintainability, unblocks parallel work, and makes code review tractable.

## Scope

### In Scope

| # | File | Lines | Strategy |
|---|------|-------|----------|
| 1 | `src/components/profile/ProfilePageContent.tsx` | 1,194 | Extract 5 tab sub-components (overview, personal, address, subscription, settings) → thin orchestrator with tab state |
| 2 | `src/lib/ai/agent/agent.ts` | 1,039 | Extract tool setup → existing tool modules, memory init → memory module, knowledge base context → knowledge module. Main Agent keeps chat orchestration |
| 3 | `src/app/admin/AdminShell.tsx` | 1,031 | Extract nav config → data file (interfaces + nav items), extract state/effect blocks → custom hooks (useOrganizationState, useAdminStats). Shell keeps layout orchestration |
| 4 | `src/components/admin/CreateAppointmentForm.tsx` | 1,272 | Extract CustomerSearchSection, AvailabilitySlotsSection, ScheduleSettingsSection, FormFieldsSection. Main form keeps state orchestration |
| 5 | `src/app/admin/saas-management/organizations/[id]/_components/OrganizationDetailsContent.tsx` | 1,360 | Extract OrgBranchesTab (inline ~100 lines) and OrgUsersTab (inline ~100 lines). Overview tab already extracted |

### Out of Scope
- Files 6+ (lower priority / already planned)
- Behavioral changes, style refactors, or business logic fixes
- Test additions (existing coverage should remain green)

## Capabilities

### New Capabilities
None — pure refactor, no new spec-level behavior introduced.

### Modified Capabilities
None — existing behavior unchanged at spec level.

## Approach

**Pattern**: Extract sub-components/hooks from the god file into co-located files (`_components/`, `_hooks/`). The original file re-imports and composes them. Zero behavioral change — same props, same state, same renders.

1. **File 1** — `ProfilePageContent.tsx`: 5 tabs already clearly bounded by `TabsContent` blocks. Each tab's JSX + handlers → separate file, parent orchestrates `value`/`onValueChange`.
2. **File 2** — `agent.ts`: Tool setup (`getAllTools`, `convertToolsToLLMTools`) already exists in `../tools/`. Memory init (`MemoryManager`, `OrganizationalMemory`) → extract into init functions. Knowledge base loading → extract into KB module.
3. **File 3** — `AdminShell.tsx`: Nav items config → `@/config/admin-navigation.ts`. Organization state, admin check, and stats logic → 3 custom hooks.
4. **File 4** — `CreateAppointmentForm.tsx`: Customer search, availability slots, schedule settings, form fields → sub-components. Form holds only state orchestration + submission.
5. **File 5** — `OrganizationDetailsContent.tsx`: Branches tab and users tab inline JSX/state → `OrgBranchesTab` and `OrgUsersTab` sub-components.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/profile/ProfilePageContent.tsx` | Modified | 1,194→~200, imports extracted sub-components |
| `src/components/profile/_components/` | New | 5 tab files (~150-200 lines each) |
| `src/lib/ai/agent/agent.ts` | Modified | 1,039→~400, extracted tool/memory/kb setup |
| `src/lib/ai/agent/` | New | Sub-modules for memory init, kb context |
| `src/app/admin/AdminShell.tsx` | Modified | 1,031→~300, extracted nav config + 3 hooks |
| `src/config/admin-navigation.ts` | New | Nav items data (interfaces + arrays) |
| `src/components/admin/CreateAppointmentForm.tsx` | Modified | 1,272→~350, extracted sections |
| `src/components/admin/create-appointment/` | New | 4 section components |
| `src/app/admin/saas-management/organizations/[id]/_components/OrganizationDetailsContent.tsx` | Modified | 1,360→~300, extracted 2 tabs |
| `src/app/admin/saas-management/organizations/[id]/_components/OrgBranchesTab.tsx` | New | Branches tab |
| `src/app/admin/saas-management/organizations/[id]/_components/OrgUsersTab.tsx` | New | Users tab |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Accidental behavioral change from split | Low | Each PR is pure extract — same imports, same render tree. Verify with `git diff --stat` and manual smoke |
| Import path errors in new files | Low | TypeScript compilation catches all missing exports |
| Merge conflicts from active branch (File 3, 4) | Med | Apply during low-activity window. Chained PRs reduce overlap window |

## Rollback Plan

Each file split = 1 PR. Rollback per PR: `git revert <merge-commit>` restores the exact previous state. No data migration, no schema changes, no behavioral toggles.

## Dependencies

- None — self-contained refactor

## Success Criteria

- [ ] All 5 files <400 lines each after split
- [ ] `npm run build` passes (TypeScript + Next.js)
- [ ] `npm run test:all` passes (existing tests green)
- [ ] No changes to public APIs, component props, or exported types
- [ ] All git diffs are pure moves/reorganizations with no behavioral changes
