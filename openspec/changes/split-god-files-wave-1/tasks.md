# Tasks: Split God Files — Wave 1

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~6,500 total across 5 PRs (all pure extract — code moves, not new) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 5 stacked PRs (File 5 → 4 → 2 → 1 → 3) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Extract OrganizationDetailsContent tabs | PR 1 | Base: main. Lowest risk, isolated file. |
| 2 | Delete dead CreateAppointmentForm | PR 2 | Base: main. Trivial deletion, -1,272 lines. |
| 3 | Extract agent.ts sub-modules | PR 3 | Base: main. Partial extraction already exists. |
| 4 | Extract ProfilePageContent tab components | PR 4 | Base: main. Isolated component. |
| 5 | Extract AdminShell hooks + nav config | PR 5 | Base: main. Highest merge conflict risk → last. |

## Phase 1: PR 1 — Extract OrganizationDetailsContent Tabs

- [x] 1.1 Create `OrgBranchesTab.tsx` — extract branches state, handlers, table JSX, dialogs from OrganizationDetailsContent (~350 lines)
- [x] 1.2 Create `OrgUsersTab.tsx` — extract users state, handlers, table JSX, dialogs (~350 lines)
- [x] 1.3 Modify `OrganizationDetailsContent.tsx` — replace extracted blocks with tab imports, keep org detail + tab state (~300 lines)
- [x] 1.4 Verify: `npm run test:run` passes (84/84 files, 1398 tests), pre-existing build error confirmed unchanged

## Phase 2: PR 2 — Delete Dead CreateAppointmentForm

- [ ] 2.1 Delete `src/components/admin/CreateAppointmentForm.tsx` (1,272 lines — dead code)
- [ ] 2.2 Verify: `src/components/admin/CreateAppointmentForm/index.tsx` (340 lines) is the active module
- [ ] 2.3 Verify: `npm run build` passes, all 3 dynamic consumers resolve correctly

## Phase 3: PR 3 — Extract agent.ts Sub-Modules

- [ ] 3.1 Create `src/lib/ai/agent/initializers.ts` — extract `initializeMemoryManager`, `initializeOrganizationalMemory`, `initializeToolExecutor` (~80 lines)
- [ ] 3.2 Create `src/lib/ai/agent/knowledge-context.ts` — extract `getKnowledgeBaseContext`, `extractRecentActions`, `extractKeyInformation` as exported functions (~100 lines)
- [ ] 3.3 Modify `agent.ts` — replace extracted blocks with imports, keep Agent class, `streamChat`, session management (~450 lines)
- [ ] 3.4 Verify: `npm run build` + `npm run test:run` pass, agent integration tests in `src/__tests__/integration/agent/` resolve

## Phase 4: PR 4 — Extract ProfilePageContent Tab Components

- [ ] 4.1 Create `src/components/profile/tabs/OverviewTab.tsx` — extract overview tab JSX + inline handlers (~180 lines)
- [ ] 4.2 Create `src/components/profile/tabs/PersonalInfoTab.tsx` — extract personal info form (~160 lines)
- [ ] 4.3 Create `src/components/profile/tabs/AddressTab.tsx` — extract address form (~160 lines)
- [ ] 4.4 Create `src/components/profile/tabs/PreferencesTab.tsx` — extract settings/preferences tab (~200 lines)
- [ ] 4.5 Modify `ProfilePageContent.tsx` — replace `TabsContent` blocks with tab component imports, keep tab state + header (~200 lines)
- [ ] 4.6 Verify: `npm run build` passes, profile page renders all tabs correctly

## Phase 5: PR 5 — Extract AdminShell Hooks and Config

- [ ] 5.1 Create `src/config/admin-navigation.ts` — extract `NavItem`/`NavGroup` interfaces + nav config data (~30 lines)
- [ ] 5.2 Create `src/app/admin/_hooks/useOrganizationState.ts` — extract organization state + `checkOrganization` useEffect (~130 lines)
- [ ] 5.3 Create `src/app/admin/_hooks/useAdminStats.ts` — extract stats state + fetch useEffect (~90 lines)
- [ ] 5.4 Create `src/app/admin/_hooks/useAdminCheck.ts` — extract admin check + redirect logic, keep `signOutInProgress`/`redirectInProgress` refs intact (~160 lines)
- [ ] 5.5 Modify `AdminShell.tsx` — replace extracted blocks with hook imports, keep layout JSX + loading/redirect screens (~350 lines)
- [ ] 5.6 Verify: `npm run build` passes, admin shell renders, sign-out + redirect flow works
