# Tasks: Consolidate Branches to Main

## Review Workload Forecast

| Field                   | Value                                              |
| ----------------------- | -------------------------------------------------- |
| Estimated changed lines | ~30-50 (git operations only)                       |
| 400-line budget risk    | Low                                                |
| Chained PRs recommended | No                                                 |
| Suggested split         | Single PR                                          |
| Delivery strategy       | single-pr (operational merge, no review threshold) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal                                       | Likely PR | Notes                                                                         |
| ---- | ------------------------------------------ | --------- | ----------------------------------------------------------------------------- |
| 1    | Merge feat/agent-harness-phase-1-ui → main | Single PR | 81 commits, 355 changed files, git operations only. No code review threshold. |

## Phase 1: Prepare Working Tree

- [ ] 1.1 `git add openspec/changes/archive/` and `openspec/changes/database-consolidation-qa/` — preserve SDD artifacts in the commit
- [ ] 1.2 `git rm -r .qoder/` — remove deprecated directory from tracking and filesystem
- [ ] 1.3 `git rm scripts/` for all deleted (` D`) scripts — the user confirmed they were intentionally deleted. Exclude `scripts/create-demo-super-admin.js` and `scripts/sql-utils/create-demo-super-admin.sql` (marked ` M`, modified not deleted)
- [ ] 1.4 `git add` untracked files (agent-harness components, tests, API routes, hooks, etc.) — only intentional new files, NOT build artifacts
- [ ] 1.5 Verify no remaining staged deletions of openspec/ or other intentional artifacts
- [ ] 1.6 Commit: `chore: prepare working tree for branch consolidation — preserve SDD artifacts, remove .qoder/ and stale scripts`

## Phase 2: Sync with Main

- [ ] 2.1 `git merge main` — bring mainline changes into `feat/agent-harness-phase-1-ui`
- [ ] 2.2 Resolve any merge conflicts if they arise (low likelihood — verify per-file)
- [ ] 2.3 Commit merge result (preserve default merge message)
- [ ] 2.4 `npm run build` — verify build succeeds post-merge
- [ ] 2.5 `npm run test:all` — verify test suite passes

## Phase 3: Merge to Main

- [ ] 3.1 Create PR from `feat/agent-harness-phase-1-ui` → `main` (user decides on PR vs direct merge)
- [ ] 3.2 `git checkout main && git merge feat/agent-harness-phase-1-ui` — merge commit
- [ ] 3.3 Verify `openspec/changes/archive/` and `openspec/changes/consolidate-branches-to-main/` arrived intact
- [ ] 3.4 Push main to both remotes: `origin/main` and `opttius/main`

## Phase 4: Cleanup Branches

- [ ] 4.1 Delete local branches: `feat/import-unification`, `feat/import-unification-01-unit`, `feat/import-unification-02-service`, `feat/import-unification-03-e2e`, `feat/import-unification-04-release`, `feature/frontend-redesign`, `feature/identity-migration-lujo-tecnologico`, `feat/identity-luxury-tech-migration`, `refactor/create-appointment-form`, `local`
- [ ] 4.2 Delete remote branches: `origin/feat/import-unification`, `origin/feat/import-unification-01-unit`, `origin/feat/import-unification-02-service`, `origin/feat/import-unification-03-e2e`, `origin/feat/import-unification-04-release`, `origin/feat/identity-luxury-tech-migration`, `origin/refactor/create-appointment-form`

## Phase 5: Verify

- [ ] 5.1 `npm run build` — confirm production build succeeds on main
- [ ] 5.2 `npm run test:all` — confirm test suite passes on main
- [ ] 5.3 Verify lens logic (ópticos y contacto) is intact — grep for key lens-related types and services
- [ ] 5.4 Verify Agent Harness is present — check for agent harness UI components and API routes
- [ ] 5.5 Verify `consolidated/` migrations are in place
- [ ] 5.6 Verify `import-mapping.ts` and `import-service.ts` exist (even if inconclusos)
- [ ] 5.7 Confirm no dangling references to deleted branches in docs or config
