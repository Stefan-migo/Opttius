# Archive Report: setup-ci-pipeline

**Archived**: 2026-06-30
**Archive path**: `openspec/changes/archive/2026-06-30-setup-ci-pipeline/`
**Verification**: PASS WITH WARNINGS ✅⚠️

---

## Intent

Add automated CI quality gates to Opttius. The project had 67+ test files (~3015 assertions) with zero automated execution on push or PR, creating risk of broken code reaching production. This change introduced two GitHub Actions workflows to enforce lint, type-check, and test execution on every push and PR.

## What Was Done

| File                              | Description                                                                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`        | Full CI on push/PR to `main` — checkout → setup-node → `npm ci` → lint → type-check → `test:ci` (+ optional e2e with `continue-on-error: true`) |
| `.github/workflows/pr-checks.yml` | Fast PR validation (any branch) — lint + type-check only, targeting < 3 min feedback                                                            |

### Key characteristics

- Node 20, `actions/checkout@v4`, `actions/setup-node@v4` with npm cache
- Next.js `.next/cache` via `actions/cache@v4` with package-lock hash keying
- Concurrency groups with `cancel-in-progress: true`
- E2E job in CI runs but does not block merge
- No Supabase, no Docker, no external services — tests use mocked client

## Verification Results

| Check                                                                | Result                  |
| -------------------------------------------------------------------- | ----------------------- |
| ci.yml exists with correct triggers (push/PR to main)                | ✅ PASS                 |
| pr-checks.yml exists with correct trigger (PR to any branch)         | ✅ PASS                 |
| YAML syntax valid (both files)                                       | ✅ PASS                 |
| CI step order: lint → type-check → test:ci                           | ✅ PASS                 |
| PR step order: lint → type-check (no tests, keeps < 3 min)           | ✅ PASS                 |
| Cache configuration correct (npm + Next.js)                          | ✅ PASS                 |
| Node 20, checkout@v4, setup-node@v4 consistent                       | ✅ PASS                 |
| Default shell bash configured                                        | ✅ PASS                 |
| Concurrency/cancel-in-progress configured                            | ✅ PASS                 |
| Test suite passes (exit 0)                                           | ✅ PASS WITH WARNING ⚠️ |
| — 1398 passed, 181 skipped, 2 todo, 0 failures                       |                         |
| — 1 transient flaky email integration test (pre-existing, unrelated) |                         |

### Post-deployment verification (cannot test offline)

- 3.1 Workflows appear in GitHub Actions tab (requires push)
- 3.2 Full CI green (requires push)
- 3.3 PR checks < 3 min (requires PR)
- 3.4 E2E non-blocking behavior (requires push)

## Known Limitations

| Limitation                               | Details                                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Cannot fully verify until push to GitHub | Workflow execution depends on GitHub Actions runners — offline validation confirmed YAML syntax and structure only |
| Pre-existing flaky test                  | 1 email integration test has intermittent timeout — unrelated to CI pipeline                                       |
| PR checks skip unit tests                | Intentional — keeps PR feedback under 3 min per tasks.md spec; full test suite runs in CI.yml                      |

## Stale-Resource Reconciliation

`- apply-progress` never updated the persisted tasks.md checkboxes. The verify-report provides clear proof of task completion (Phases 1–2 implemented, Phase 3 post-deployment). Checkboxes were reconciled at archive time as exceptional mechanical repair per sdd-archive Task Completion Gate rules.

## Archive Contents

| Artifact            | Status                                                                                |
| ------------------- | ------------------------------------------------------------------------------------- |
| `proposal.md`       | ✅                                                                                    |
| `tasks.md`          | ✅ (reconciled — 2/2 implementation tasks complete, 4 post-deployment tasks deferred) |
| `verify-report.md`  | ✅                                                                                    |
| `archive-report.md` | ✅ (this file)                                                                        |

## Conclusion

The CI pipeline change is implementation-complete and archived. All offline-verifiable criteria pass. The remaining Phase 3 verification tasks require a real push to GitHub to trigger workflow execution — structural prerequisites are fully met.
