# Tasks: Setup CI Pipeline

## Review Workload Forecast

| Field                   | Value           |
| ----------------------- | --------------- |
| Estimated changed lines | ~80 (YAML only) |
| 400-line budget risk    | Low             |
| Chained PRs recommended | No              |
| Suggested split         | Single PR       |
| Delivery strategy       | single-pr       |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal                                                | Likely PR | Notes                                 |
| ---- | --------------------------------------------------- | --------- | ------------------------------------- |
| 1    | Create `.github/workflows/ci.yml` + `pr-checks.yml` | Single PR | Both files independent, single commit |

## Phase 1: Create CI Workflow

- [x] 1.1 Create `.github/workflows/ci.yml`:
  - Trigger: `push` to `main`, `pull_request` to `main`
  - `actions/checkout@v4`, `actions/setup-node@v4` (node-version: 20, cache: npm)
  - `npm ci` → `npm run lint` → `npm run type-check` → `npm run test:ci`
  - Cache: node_modules (via setup-node cache), Next.js `.next/cache`
  - Timeout: 15 min
  - Optional e2e job: `npx playwright install --with-deps chromium` → `npm run test:e2e`, `continue-on-error: true`

## Phase 2: Create PR Checks Workflow

- [x] 2.1 Create `.github/workflows/pr-checks.yml`:
  - Trigger: `pull_request` to any branch
  - Same checkout + node setup + npm ci + cache
  - Steps: `npm run lint` → `npm run type-check`
  - Target: < 3 min feedback per PR

## Phase 3: Verify (Post-Deployment — skipped offline, per verify-report)

- [ ] 3.1 Push branch to GitHub and confirm both workflows appear in Actions tab `⏭️ post-deployment`
- [ ] 3.2 Verify CI workflow completes lint, type-check, and `test:ci` green `⏭️ post-deployment`
- [ ] 3.3 Verify PR checks workflow completes in < 3 min (lint + type-check) `⏭️ post-deployment`
- [ ] 3.4 Verify e2e job runs but does NOT block merge on failure `⏭️ post-deployment`
