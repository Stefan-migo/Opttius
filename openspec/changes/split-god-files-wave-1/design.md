# Design: Split God Files — Wave 1

## Technical Approach

Pure extract + compose — zero behavioral change. Each god file's bounded sections (tabs, hooks, data config, dialogs) move to co-located files. The original file becomes a thin orchestrator that imports and composes them. One PR per file, stacked main-ward.

## Key Discovery

**File 4 is already done.** `src/components/admin/CreateAppointmentForm.tsx` (1,272 lines) is dead code — all 3 consumers dynamically import `@/components/admin/CreateAppointmentForm`, which resolves to the refactored `index.tsx` (340 lines) in the directory-based module. The task for File 4 is: delete the dead `.tsx` file, verify the index is already under the target.

## File-by-File Plan

### File 1: ProfilePageContent.tsx (1,194 → ~200 lines)

| File | Action | Est. Lines |
|------|--------|-----------|
| `src/components/profile/ProfilePageContent.tsx` | Modify | ~200 |
| `src/components/profile/tabs/OverviewTab.tsx` | Create | ~180 |
| `src/components/profile/tabs/PersonalInfoTab.tsx` | Create | ~160 |
| `src/components/profile/tabs/AddressTab.tsx` | Create | ~160 |
| `src/components/profile/tabs/PreferencesTab.tsx` | Create | ~200 |

**Parent keeps**: tab state, `TabsList`/`TabsTrigger` rendering, `TabsContent` shell for each tab (becomes an `activeTab` switch or inline import), loading/redirect guards, `ProfileHeaderCard`, `SubscriptionManagementSection` import.

**Extract**: Each `TabsContent` block's JSX + inline handlers. The overview tab JSX (~260 lines), personal tab form (~165 lines), address tab form (~165 lines), settings/preferences tab (~200 lines — ProfilePasswordSection is already extracted).

**Prop contracts** (passing down, not new types):
- `OverviewTab`: `profile`, `user`, `variant`, `adminData`, `subscriptionData`, `dataLoading`, `needsOnboarding`, `hasOrganization`, `memberSince`, `onNavigateTab` 
- `PersonalInfoTab`: `profile`, `personalForm`, `isEditingPersonal`, `isLoading`, `onToggle`, `onSubmit`, `onCancel`
- `AddressTab`: `profile`, `addressForm`, `isEditingAddress`, `isLoading`, `onToggle`, `onSubmit`, `onCancel`
- `PreferencesTab`: `profile`, `preferences`, `branches`, `isLoading`, `onUpdate`

### File 2: src/lib/ai/agent/agent.ts (1,039 → ~450 lines)

| File | Action | Est. Lines |
|------|--------|-----------|
| `src/lib/ai/agent/agent.ts` | Modify | ~450 |
| `src/lib/ai/agent/initializers.ts` | Create | ~80 |
| `src/lib/ai/agent/knowledge-context.ts` | Create | ~100 |

**Parent keeps**: Agent class with constructor, `streamChat()`, `chat()`, `streamChatStructured()`, session management (`loadSessionHistory`, `hasLoadedHistory`, `getMessages`, `clearMessages`, `addMessage`), `loadOrganizationalContext()` (tightly coupled to streamChat logic).

**Extract to `initializers.ts`**: `initializeMemoryManager()`, `initializeOrganizationalMemory()`, `initializeToolExecutor()`. These are async factory methods with no class state mutation beyond setting `this.memoryManager` / `this.organizationalMemory` / `this.toolExecutor`. Extract as standalone async functions that return the initialized instance, the Agent calls them and assigns the result.

**Extract to `knowledge-context.ts`**: `getKnowledgeBaseContext()`, `extractRecentActions()`, `extractKeyInformation()`. These are pure KB helper methods that depend on `this.messages`, `this.userId`, `this.organizationId`, `this.userData`. Extract as a class or exported functions accepting those params.

**Stay in agent.ts**: `screenContextToPrompt()` (~8 lines) — too small to extract.

### File 3: AdminShell.tsx (1,031 → ~350 lines)

| File | Action | Est. Lines |
|------|--------|-----------|
| `src/app/admin/AdminShell.tsx` | Modify | ~350 |
| `src/config/admin-navigation.ts` | Create | ~30 |
| `src/app/admin/_hooks/useOrganizationState.ts` | Create | ~130 |
| `src/app/admin/_hooks/useAdminStats.ts` | Create | ~90 |
| `src/app/admin/_hooks/useAdminCheck.ts` | Create | ~160 |

**Extract `admin-navigation.ts`**: `NavItem` and `NavGroup` interfaces (used by `AdminSidebar`, defined here for lack of a better home).

**Extract `useOrganizationState`**: The `organizationState` declaration (lines 161-180) + `checkOrganization` useEffect (229-417) + associated `adminRole` state. Returns `organizationState`, `adminRole`, `isChecking`.

**Extract `useAdminStats`**: The `stats` state declaration (183-204) + fetch stats useEffect (420-495). Returns `stats`.

**Extract `useAdminCheck`**: The `adminState` declaration (145-155) + `isAdminCheckInProgress` state (207) + check-admin-status effect (497-651) + redirect logic (653-728) + redirect refs (210-221). Returns `adminState`, `isAdminChecking`, `handleSignOut`.

**Parent keeps**: layout JSX, `AuthContext` user/profile/loading usage, `handleSignOut`, loading screen (749-787), redirect screen (794-836), main return (852-1028). Imports 3 hooks + config.

### File 4: CreateAppointmentForm.tsx (1,272 → delete)

| File | Action | Est. Lines |
|------|--------|-----------|
| `src/components/admin/CreateAppointmentForm.tsx` | Delete | -1,272 |
| `src/components/admin/CreateAppointmentForm/index.tsx` | Verify existing | 340 — under target |

The `index.tsx` is already at 340 lines, well under the 400-line target. The old `.tsx` file at the parent level is dead code — confirmed by grepping all 3 consumers that dynamically import `@/components/admin/CreateAppointmentForm` (directory index wins resolution).

### File 5: OrganizationDetailsContent.tsx (1,360 → ~300 lines)

| File | Action | Est. Lines |
|------|--------|-----------|
| `src/app/admin/saas-management/organizations/[id]/_components/OrganizationDetailsContent.tsx` | Modify | ~300 |
| `src/app/admin/saas-management/organizations/[id]/_components/OrgBranchesTab.tsx` | Create | ~350 |
| `src/app/admin/saas-management/organizations/[id]/_components/OrgUsersTab.tsx` | Create | ~350 |

**Extract `OrgBranchesTab`**: All branch-related state (branches, showBranchDialog, editingBranch, branchFormData, deleteBranchConfirmId) + handlers (fetchBranches, handleCreateBranch, handleUpdateBranch, handleDeleteBranchClick, handleDeleteBranchConfirm) + branches table JSX (648-748) + branch create/edit dialog (849-978) + branch delete confirm dialog (1299-1327). Accepts `orgId` as prop, handles its own data fetching.

**Extract `OrgUsersTab`**: All user-related state (users, showUserDialog, editingUser, userFormData, deleteUserConfirmId) + handlers (fetchUsers, handleCreateUser, handleUpdateUser, handleDeleteUserClick, handleDeleteUserConfirm) + users table JSX (751-846) + user create/edit dialog (980-1115) + user delete confirm dialog (1329-1357). Accepts `orgId` as prop, handles its own data fetching.

**Parent keeps**: organization fetch state, edit org dialog (1117-1205), delete org dialog (1207-1297), tab state + TabsList, OrgBasicInfo/OrgDetailHeader/OrgSubscriptionInfo/OrgActivityLog imports, loading/error states.

## Key Interfaces

All types already exist. File 5's `OrganizationDetails` interface (line 62) stays in the parent. The tab components receive typed props via existing types plus their `orgId` string.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Build | TypeScript compilation | `npm run build` catches all import/export errors |
| Build | Lint | `npm run lint` |
| Existing tests | All modules | `npm run test` — zero behavioral change = zero new test gaps |
| Integration | Agent tests | `src/__tests__/integration/agent/` files import Agent class, must still resolve |
| Manual smoke | Each PR branch | Verify the parent component renders the same tabs/sections |

## Risks

| Risk | Likelihood | File | Mitigation |
|------|------------|------|-----------|
| Import resolution | Low | 2 | Dynamic imports (`createServiceRoleClient`) are resilient; static imports verified by TS |
| Merge conflicts | Medium | 3, 4 | AdminShell + CreateAppointmentForm are active files — chained PRs minimize window |
| Dead code left behind | Low | 4 | After deleting old `.tsx`, verify `npm run build` passes and the 3 consumers work |
| Tab handler closure bugs | Low | 1, 5 | Extract handlers alongside JSX, pass bound callbacks as props — same closure scope |
| `useAdminCheck` refs | Low | 3 | `signOutInProgress.current` and `redirectInProgress.current` are refs — must not lose ref identity |

## Chained PR Strategy

PR 1 → File 5 (OrgDetailsContent — lowest risk, mostly isolated)
PR 2 → File 4 (delete dead file — trivial)
PR 3 → File 2 (agent.ts — partially split already, moderate risk)
PR 4 → File 1 (ProfilePageContent — isolated)
PR 5 → File 3 (AdminShell — highest merge conflict risk, do last)

Each PR targets `main`. Stack order minimizes conflict surface.

## Open Questions

- [x] File 4 is already done — verify with a build pass, then just delete the dead file.
- [ ] File 3: should `useAdminCheck` include the redirect effect (653-728) or keep it in AdminShell? *Recommend: extract together since they share `redirectInProgress` and `signOutInProgress` refs.*
- [ ] File 2: should `loadOrganizationalContext()` move out too? It's called from outside the class by tests. *Recommend: keep in Agent for now — it's only 55 lines and tightly coupled to `this.messages[0]`.*
