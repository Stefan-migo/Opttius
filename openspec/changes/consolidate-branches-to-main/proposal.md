# Proposal: Consolidate Branches to Main

## Intent

Bring 81 commits of parallel work from `feat/agent-harness-phase-1-ui` into `main` while cleaning up the accumulated branch debris (11 local, 7 remote) and restoring a clean working tree. The branch contains agent harness UI, DB consolidation, audits, and refactors — all independently verified and ready for integration.

## Scope

### In Scope

- Stash or commit working tree changes (openspec archive/ preservation, scripts/ deletion, .qoder/ removal)
- Sync `feat/agent-harness-phase-1-ui` with `main` (merge main → feature branch)
- Merge feature branch → `main`
- Delete 11 stale local branches
- Delete 7 stale remote branches (origin/\*)
- Verify build and tests pass post-merge

### Out of Scope

- Removing the `feat/import-unification` branch content from the working tree (1 commit, empty tracker init — handled inline)
- Refactoring, fixing, or reviewing the agent harness, DB consolidations, or audit code itself
- Any changes to the `main` branch before merge (no cherry-picking, no squashing)
- Deleting `feat/import-unification` locally (it will be removed alongside all stale branches)

## Capabilities

### New Capabilities

None — this is a branch consolidation and cleanup operation, not a feature change.

### Modified Capabilities

None — no spec-level behavior changes.

## Approach

### Phase 0 — Prepare Working Tree

1. `git add openspec/changes/archive/` and `openspec/changes/database-consolidation-qa/` (preserve SDD artifacts)
2. `git add` the 44 untracked files that are intentional (agent-harness components, tests, API routes, hooks)
3. `git rm -r .qoder/` — remove deprecated directory
4. `git checkout -- scripts/` — discard script deletions that are already resolved (or verify intent)
5. Commit as `chore: prepare working tree for branch consolidation — preserve SDD artifacts, remove .qoder/`

### Phase 1 — Sync Feature Branch with Main

1. `git checkout feat/agent-harness-phase-1-ui`
2. `git merge main` — bring in any mainline changes since branch diverged
3. Resolve conflicts if any (none detected in tree diff, but verify)
4. Commit merge

### Phase 2 — Merge to Main

1. `git checkout main`
2. `git merge feat/agent-harness-phase-1-ui` (fast-forward or merge commit)
3. Push main to both remotes: `origin/main` and `opttius/main`

### Phase 3 — Branch Cleanup

1. Delete local branches (all stale):
   - `feat/identity-luxury-tech-migration`
   - `feat/import-unification`
   - `feat/import-unification-01-unit`
   - `feat/import-unification-02-service`
   - `feat/import-unification-03-e2e`
   - `feat/import-unification-04-release`
   - `feature/frontend-redesign`
   - `feature/identity-migration-lujo-tecnologico`
   - `local`
   - `refactor/create-appointment-form`
2. Delete remote branches:
   - `origin/feat/identity-luxury-tech-migration`
   - `origin/feat/import-unification`
   - `origin/feat/import-unification-01-unit`
   - `origin/feat/import-unification-02-service`
   - `origin/feat/import-unification-03-e2e`
   - `origin/feat/import-unification-04-release`
   - `origin/refactor/create-appointment-form`

### Phase 4 — Verification

1. `npm run build` — verify production build succeeds
2. `npm run test:all` — verify all tests pass
3. Verify `openspec/changes/archive/` content is intact post-merge
4. Confirm no dangling references to deleted branches

## Affected Areas

| Area                                             | Impact            | Description                  |
| ------------------------------------------------ | ----------------- | ---------------------------- |
| `.qoder/`                                        | Removed           | Deprecated directory         |
| `scripts/`                                       | Removed (cleaned) | Stale/unused scripts deleted |
| `openspec/changes/`                              | Preserved         | Archived SDD artifacts kept  |
| `openspec/changes/consolidate-branches-to-main/` | New               | This proposal                |
| Local branches                                   | 11 deleted        | All stale feature branches   |
| Remote branches                                  | 7 deleted         | Stale origin/\* branches     |

## Risks

| Risk                                               | Likelihood | Mitigation                                                                           |
| -------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------ |
| Untracked files include unwanted build artifacts   | Low        | Review untracked list before staging — only agent-harness, test, and API files go in |
| Script deletions (staged) include intentional ones | Low        | `checkout -- scripts/` to restore, then selectively re-remove known stale scripts    |
| Merge conflict during sync                         | Low        | No overlapping changes detected; if any emerge, resolve per-file                     |
| Verification fails post-merge                      | Low        | Tests and build pass on the branch currently; merge should not break them            |
| `feat/import-unification` tracker orphan           | Low        | Single empty-init commit, safe to delete                                             |

## Rollback Plan

If the merge to main breaks something:

1. `git reset --hard ORIG_HEAD` on main
2. Force-push main to both remotes (coordinated — notify team)
3. The feature branch is untouched and can be re-merged after fixes
4. Deleted branches are redeemable from reflog for 90 days

## Dependencies

- Write access to `origin/` and `opttius/` remotes
- Clean CI pipeline on main (no pending deployments)

## Success Criteria

- [ ] Working tree clean with no staged deletions of openspec/ or intentional files
- [ ] `.qoder/` removed from git tracking and filesystem
- [ ] `main` branch contains all commits from `feat/agent-harness-phase-1-ui`
- [ ] All 11 stale local branches deleted
- [ ] All 7 stale remote branches deleted
- [ ] `npm run build` passes
- [ ] Test suite passes
