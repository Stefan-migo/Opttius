# Tasks: Add GitHub Actions CI

## Review Workload Forecast

| Field                   | Value      |
| ----------------------- | ---------- |
| Estimated changed lines | 80–120     |
| 400-line budget risk    | Low        |
| Chained PRs recommended | No         |
| Suggested split         | Single PR  |
| Delivery strategy       | auto-chain |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: CI Pipeline Fixes

- [x] 1.1 `.github/workflows/ci.yml` — Change `npm ci` to `npm ci --ignore-scripts` (line 36)
- [x] 1.2 `.github/workflows/ci.yml` — Add `npm run build` step after `npm run test:ci` in `quality` job
- [x] 1.3 `.github/workflows/ci.yml` — Replace `continue-on-error: true` on E2E job with `if: github.base_ref == 'main'` and `needs: [quality]`
- [x] 1.4 `.github/workflows/ci.yml` — Replace E2E install+run steps with: fetch Vercel preview URL via `actions/github-script@v7`, conditionally run Playwright if URL available, skip gracefully if none
- [x] 1.5 `.github/workflows/ci.yml` — Add `PLAYWRIGHT_SKIP_WEBSERVER=1` env var to E2E job (prevents local webServer fallback when using Vercel URL)

## Phase 2: Documentation

- [x] 2.1 `docs/CI-CD.md` — Create branch protection conventions doc: required checks (`quality`), PR required for main, no direct pushes, E2E running on PRs to main only

## Verification

- [ ] Push a test branch, verify `quality` job runs lint, type-check, test, build
- [ ] Create PR targeting `main`, verify E2E job runs with Vercel URL
- [ ] Create PR targeting non-main branch, verify E2E job is skipped
