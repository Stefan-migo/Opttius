# Proposal: Add GitHub Actions CI Pipeline

## Intent

Zero automated quality gates on push/PR — both audits flag this as the #1 production blocker. Every push goes straight to main/deploy with no lint, type-check, test, or build verification. This proposal adds a CI pipeline to catch regressions before they land.

## Scope

### In Scope

- **GitHub Actions CI workflow** (`.github/workflows/ci.yml`) on push to `main` and on PRs: `npm ci` → `npm run lint` → `npm run type-check` → `npm run test:ci` → `npm run build`
- **Playwright E2E** on PRs targeting `main` (conditional, uses Vercel preview URL)
- **Branch protection conventions** documented (not enforced via API)
- **Vercel Preview Deployment** integration (standard Vercel GitHub app — just docs)

### Out of Scope

- Fixing `ignoreDuringBuilds` / `ignoreBuildErrors` in `next.config.js` (roadmap 1.2/1.3)
- Fixing Husky pre-commit hooks (roadmap 1.4)
- Adding new tests or fixing existing ones
- Any changes outside `.github/workflows/`

## Capabilities

### New Capabilities

- `ci-pipeline`: GitHub Actions CI with lint, type-check, test, and build gates on push/PR. Includes conditional Playwright E2E on PRs targeting `main`.

### Modified Capabilities

- None

## Approach

Single workflow file at `.github/workflows/ci.yml` with two jobs:

1. **CI** (always runs): `npm ci` → `lint` → `type-check` → `test:ci` → `build`. Runs on `ubuntu-latest`, Node 20, with dependency caching.
2. **E2E** (PR only, base = `main`): deploys via Vercel preview URL, runs Playwright against it. Uses `playwright.yml`-style conditional to skip non-`main` PRs.

Vercel preview deployments are handled by the existing Vercel GitHub app — no config needed in this repo.

Branch protection: documented in an ADR or the proposal itself — not enforced via API (that's a GitHub settings UI task).

## Affected Areas

| Area                        | Impact | Description                      |
| --------------------------- | ------ | -------------------------------- |
| `.github/workflows/ci.yml`  | New    | Main CI pipeline workflow        |
| `.github/workflows/e2e.yml` | New    | Conditional Playwright E2E on PR |

## Risks

| Risk                                                                   | Likelihood | Mitigation                                                                                                                        |
| ---------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint` fails on existing violations (358 files over 300 lines) | High       | CI runs lint, we note failures are expected until roadmap 1.2 fixes them. CI must pass eventually — this is the forcing function. |
| `npm run build` fails (has `ignoreBuildErrors` set)                    | High       | Build step documents that it may fail. Intent is to make the team fix the errors (roadmap 1.3).                                   |
| npm install fails (husky `prepare` script broken, no `.husky/` dir)    | High       | Use `--ignore-scripts` in `npm ci` to skip husky prepare.                                                                         |

## Rollback Plan

Delete the `.github/workflows/` directory or disable the workflow in GitHub UI. No code changes to revert.

## Dependencies

- GitHub repository already connected to Vercel (confirmed — vercel.json exists)
- `HUSKY=0` env var or `--ignore-scripts` flag for `npm ci` (husky `prepare` will fail without `.husky/` directory)

## Success Criteria

- [ ] CI workflow runs automatically on push to `main` and on every PR
- [ ] All 5 CI steps execute in sequence: install → lint → type-check → test → build
- [ ] Workflow results visible in GitHub PR status checks
- [ ] Playwright E2E runs on PRs targeting `main` (skipped for other branches)
- [ ] Build does NOT fail due to husky (mitigated via `--ignore-scripts`)
