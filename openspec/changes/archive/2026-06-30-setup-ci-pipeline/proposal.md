# Proposal: setup-ci-pipeline

## Intent

Opttius has 67+ test files (~3015 assertions) across vitest (unit/integration) and Playwright (e2e). Zero run on push or PR. Critical finding C5 from 2026-06-30 audit: broken code ships because nobody knows tests are red until they run them locally — and most don't.

## Scope

### In Scope

- `.github/workflows/ci.yml` — runs on push to `main` and PRs targeting `main`: checkout → node setup → `npm ci` → lint → type-check → `test:ci`
- `.github/workflows/pr-checks.yml` — runs on PR only: fast subset (lint + type-check + unit tests only) for < 3 min feedback
- Playwright e2e as optional job in CI (continue-on-error: true)

### Out of Scope

- Deployment pipeline — separate change
- Vercel integration / preview deploys
- Branch protection rules — configured manually in GitHub repo settings
- Supabase local setup in CI — not needed, tests use mocked client

## Capabilities

### New Capabilities

- `ci-pipeline`: automated quality gates — lint, type-check, and test execution on every push/PR

### Modified Capabilities

None — no behavioral or spec-level changes.

## Approach

Two workflow files, npm-based (package-lock.json detected):

**ci.yml** (full gate — ~5-10 min):

```yaml
- actions/checkout@v4
- actions/setup-node@v4 with node-version: 20, cache: npm
- npm ci
- npm run lint
- npm run type-check
- npm run test:ci
# Optional e2e job (continue-on-error: true) — Playwright browsers + npm run test:e2e
```

**pr-checks.yml** (fast gate — ~2-3 min):

```yaml
# Same setup, runs only: lint + type-check + vitest unit tests
- npm run lint
- npm run type-check
- vitest run src/__tests__/unit --reporter=verbose
```

No `supabase start` or DB setup needed — tests mock Supabase client. Node 20 (LTS at project `>=18` constraint).

## Affected Areas

| Area                              | Impact | Description                   |
| --------------------------------- | ------ | ----------------------------- |
| `.github/workflows/ci.yml`        | New    | Full CI on push to main + PRs |
| `.github/workflows/pr-checks.yml` | New    | Fast PR validation            |

## Risks

| Risk                                     | Likelihood | Mitigation                                                    |
| ---------------------------------------- | ---------- | ------------------------------------------------------------- |
| Integration test timeout on first CI run | Low        | `npm ci` + cache; tests pass locally                          |
| E2E flaky in headless                    | Med        | continue-on-error: true — blocks nothing                      |
| Secrets needed for some tests            | Low        | None expected (mocked Supabase); add `.env.example` if needed |

## Rollback Plan

Delete the two workflow files:

```bash
rm -rf .github/workflows/
```

GitHub stops running them immediately. No code changes to revert.

## Dependencies

- GitHub repo has Actions enabled (default)
- Node 20 on ubuntu-latest runner (matches engine `>=18`)
- Playwright browsers installed in e2e job: `npx playwright install --with-deps chromium`

## Success Criteria

- [ ] Push to `main` triggers CI workflow — lint, type-check, `test:ci` all green
- [ ] PR to `main` triggers PR workflow — finishes in < 3 min
- [ ] E2E job runs but does NOT block merge if it fails
- [ ] All existing tests still pass in CI (regression check)
