# Playwright E2E Roadmap

## Decision

Treat the current Playwright work as **Phase 1: foundation complete with follow-ups**, not as a proven E2E suite. The next implementation slice is limited to deterministic authentication/data setup and a small smoke path. Do not expand to the full application suite until that slice is reproducible locally and in CI.

This roadmap takes Opttius from its current Playwright foundation to reliable, reviewable full-app E2E coverage with two supported modes:

- **Automatic:** repeatable CI runs with controlled data, bounded runtime, and failure artifacts.
- **Assisted/manual:** UI, headed, debug, and project-scoped runs for investigation and exploratory checks.

## Current Status

| Area                     | Current state                                                                                              | Confidence                      | Next action                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------ |
| Playwright configuration | `.env.local` then optional `.env.e2e` override; local `webServer`; default `http://127.0.0.1:3000`         | Configured, not executed        | Verify local and preview environment contracts         |
| Test projects            | `public`, `admin`, and `setup`; admin depends on setup                                                     | Configured, not executed        | Prove project selection and dependency behavior        |
| Admin authentication     | `e2e/global.setup.ts` logs in through the UI and writes `.playwright/.auth/admin.json`                     | Implemented locally, not proven | Make credentials and data deterministic                |
| Test discovery           | 22 tests across 8 files were statically discovered                                                         | Discovery only                  | Run focused smoke checks after prerequisites are ready |
| Existing coverage        | `agent-bubble`, `auth`, `import-csv`, `import-wizard`, `onboarding`, `pos-checkout`, `quote-workorder-pos` | Mixed quality, unproven         | Remove stale routes and strengthen assertions          |
| Test data                | `supabase/config.toml` has `db.seed.enabled=false`                                                         | Not reproducible                | Define an explicit E2E data lifecycle                  |
| Isolation                | Tests write shared data without cleanup                                                                    | Unsafe for reliable CI          | Add unique identifiers and cleanup/isolation           |
| Browsers                 | Chromium only                                                                                              | Narrow                          | Add Firefox/WebKit after Chromium is stable            |
| Repository hygiene       | Stale tracked `e2e/storageState/admin.json` deleted; `.playwright/` and `.env.e2e` ignored                 | Correct direction               | Keep generated auth out of source control              |

## Quick Path

Future commands below are documentation only. They were **not run while creating this roadmap**.

### Assisted/manual runs

```bash
# Generate the admin storage state through the setup project.
npx playwright test --project=setup

# Run public tests without the admin setup dependency.
npx playwright test --project=public

# Run authenticated admin tests; Playwright resolves the setup dependency.
npx playwright test --project=admin

# Observe the browser, use the Playwright UI, or pause in the inspector.
npx playwright test --headed
npx playwright test --ui
npx playwright test --debug

# Narrow investigation to one project or one file.
npx playwright test --project=admin e2e/pos-checkout.spec.ts
npx playwright test e2e/auth.spec.ts
```

The required environment contract is `PLAYWRIGHT_BASE_URL` when targeting a running local, preview, or deployed environment, plus the documented admin credentials. Prefer `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD`; retain fallbacks only while existing tests are migrated to the canonical names.

### Automatic CI run

```bash
# CI must provide the application URL and E2E credentials as protected secrets.
npx playwright test
```

CI should run against a dedicated E2E environment, not a developer database or production. The configuration already enables CI retries, one worker, `forbidOnly`, HTML reporting, screenshots on failure, video on failure, and traces on first retry. The pipeline still needs to publish those artifacts and enforce the data/auth prerequisites before this command is treated as a release gate.

## Operating Rules

| Rule                  | Required behavior                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Generated auth        | Create `.playwright/.auth/admin.json` only through setup; never commit or hand-edit storage state                   |
| Environment loading   | Use `.env.local` for local defaults and optional `.env.e2e` for E2E overrides; never place secrets in tracked files |
| Base URL              | Use `127.0.0.1` or `localhost` for local auto-start; use an explicit `PLAYWRIGHT_BASE_URL` for preview/remote runs  |
| Public/admin boundary | Keep auth and onboarding tests independent of generated admin state; authenticated suites depend on setup           |
| Selectors             | Prefer stable roles, labels, and test-specific contracts; remove selectors tied to stale routes or incidental text  |
| Assertions            | Verify user-visible outcomes and relevant persisted state, not only navigation or absence of errors                 |
| Data                  | Use a known E2E organization and unique per-run identifiers; never depend on a developer's current records          |
| Cleanup               | Delete or isolate records created by the test, including related orders, quotes, work orders, and inventory changes |
| Failure evidence      | Preserve report, trace, screenshot, video, console, and network evidence where available                            |

## Phased Roadmap

Every phase has an explicit gate. Verification describes future work only; no verification command in this document has been executed as part of this roadmap.

### Phase 1 - Foundation

**Status: complete with follow-ups; not proven.**

| Gate                | Definition                                                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective           | Establish a safe Playwright structure that separates public flows from authenticated admin flows                                                                              |
| Scope               | `playwright.config.ts`, `e2e/global.setup.ts`, generated auth state, local/remote base URL behavior, existing eight-file inventory                                            |
| Entry criteria      | Playwright dependency exists and current E2E files are discoverable                                                                                                           |
| Implementation work | Already implemented locally: layered env loading, local-only `webServer`, `public`/`admin` projects, setup dependency, UI login, `/admin` validation, ignored generated state |
| Verification        | Future: run setup, public, and one admin smoke project separately; confirm generated auth is recreated and no tracked storage state is required                               |
| Exit criteria       | Configuration loads in supported environments, setup fails clearly without valid credentials, public tests do not require auth, and admin tests use generated state only      |
| Deliverable         | This roadmap plus the existing Playwright configuration and setup project                                                                                                     |

Follow-ups are mandatory before calling the foundation reliable: canonicalize credentials, define data prerequisites, remove stale routes, and prove at least one public and one authenticated smoke path.

### Phase 2 - Deterministic Environment and Auth

| Gate                | Definition                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective           | Make every run start from a known application, Supabase, organization, user, and permission state                                                                                                                                                                                                                                                                             |
| Scope               | Local E2E environment, preview contract, admin account, seed/reset strategy, environment validation                                                                                                                                                                                                                                                                           |
| Entry criteria      | Phase 1 configuration is present and the target environment can be started independently                                                                                                                                                                                                                                                                                      |
| Implementation work | Decide whether E2E uses a dedicated local project or isolated remote project; enable or replace the current disabled seed path; create a stable E2E organization/branch/admin fixture; make setup use `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`; validate required URLs and credentials before browser work; document how preview data is provisioned without destructive resets |
| Verification        | Future: provision a clean environment twice; run setup from an empty generated-state directory; confirm the same account reaches `/admin`; verify missing variables fail before test execution                                                                                                                                                                                |
| Exit criteria       | A new run does not depend on developer data, setup is reproducible, credentials are canonical, and local/preview prerequisites are documented and checkable                                                                                                                                                                                                                   |
| Deliverable         | E2E environment contract, fixture/seed procedure, and authenticated setup readiness check                                                                                                                                                                                                                                                                                     |

### Phase 3 - Public Smoke

| Gate                | Definition                                                                                                                                                                                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective           | Protect unauthenticated entry points and onboarding redirects with fast, high-signal checks                                                                                                                                                                                            |
| Scope               | Login page, invalid login behavior, public landing/entry behavior, onboarding choice and redirect rules                                                                                                                                                                                |
| Entry criteria      | Phase 2 provides a deterministic environment; public tests can run without admin state                                                                                                                                                                                                 |
| Implementation work | Align `auth.spec.ts` with canonical credential names; update assertions to current routes and accessible UI; keep authenticated login success in setup or a focused auth smoke test; cover the root-to-login and protected-route redirect contract without creating uncontrolled users |
| Verification        | Future: run `--project=public` in a clean environment and repeat it; inspect failures with `--ui` or `--debug` rather than expanding scope                                                                                                                                             |
| Exit criteria       | Public smoke is stable, fast, independent of generated admin auth, and asserts visible outcomes plus expected URLs                                                                                                                                                                     |
| Deliverable         | A small public smoke gate suitable for every CI run                                                                                                                                                                                                                                    |

### Phase 4 - Authenticated Navigation

| Gate                | Definition                                                                                                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective           | Prove that a generated admin session can load the application shell and reach the highest-value admin areas                                                                                                                         |
| Scope               | `/admin`, navigation, dashboard, branch context, inventory/products entry, quotes, work orders, POS entry, and sign-out/session expiry boundaries where applicable                                                                  |
| Entry criteria      | Admin setup is reproducible and Phase 3 public smoke is stable                                                                                                                                                                      |
| Implementation work | Add route smoke checks based on current navigation configuration; verify loading/error states and key headings; use route contracts rather than clicking every menu item; separate authorization failures from application failures |
| Verification        | Future: run the admin project with setup dependency; repeat navigation in headed mode for visual diagnosis; verify a fresh generated state is sufficient                                                                            |
| Exit criteria       | Critical admin entry points load without console/page errors, unauthorized access is distinguishable from missing data, and the smoke set stays bounded                                                                             |
| Deliverable         | Authenticated navigation smoke suite and route inventory with owners                                                                                                                                                                |

### Phase 5 - Critical Business Workflows

| Gate                | Definition                                                                                                                                                                                                                                                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective           | Cover business outcomes that cross UI, API, database, and branch-scoped state                                                                                                                                                                                                                                                                             |
| Scope               | Product import, quote to work order to POS, POS checkout, payment status, and the minimum onboarding/demo flow needed by the product                                                                                                                                                                                                                      |
| Entry criteria      | Authenticated navigation is stable and deterministic fixture data exists                                                                                                                                                                                                                                                                                  |
| Implementation work | Change import tests from stale `/admin/products/import` to the current `/admin/products/bulk`; define valid input fixtures; replace hard waits with locator/network/state-based waits; strengthen POS and quote assertions to verify totals, statuses, identifiers, and persisted relationships; keep payment assertions aligned with Cash-First behavior |
| Verification        | Future: run one workflow at a time against a clean or isolated dataset; inspect database/API evidence only as supporting verification, while retaining user-visible assertions; do not start by running the full suite                                                                                                                                    |
| Exit criteria       | Each selected workflow proves a meaningful business outcome, uses current routes/selectors, avoids arbitrary sleeps, and can be repeated without manual repair                                                                                                                                                                                            |
| Deliverable         | Focused workflow specs, fixture inputs, and a workflow-to-data impact map                                                                                                                                                                                                                                                                                 |

### Phase 6 - Isolation and Cleanup

| Gate                | Definition                                                                                                                                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective           | Prevent tests from contaminating one another or a shared E2E environment                                                                                                                                                                                                              |
| Entry criteria      | Phase 5 identifies every record and side effect created by each workflow                                                                                                                                                                                                              |
| Implementation work | Use run-scoped names/keys; isolate by organization or dedicated test account where feasible; add cleanup for customers, products, quotes, work orders, orders, payments, and related stock; make cleanup safe on partial failure; define ownership for records that cannot be deleted |
| Verification        | Future: run the same test twice, in reverse order where possible, and after an interrupted run; compare relevant counts and verify no cross-organization visibility; validate cleanup separately without using production data                                                        |
| Exit criteria       | Tests pass from a clean state and after prior runs, cleanup is idempotent, and no shared fixture is mutated unexpectedly                                                                                                                                                              |
| Deliverable         | Isolation/cleanup policy, fixture lifecycle helpers only where needed, and a contamination check                                                                                                                                                                                      |

### Phase 7 - Cross-Browser and CI

| Gate                | Definition                                                                                                                                                                                                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective           | Make the reliable smoke/workflow set automatic and representative across supported browser engines                                                                                                                                                                                                                     |
| Entry criteria      | Phases 2-6 are stable on Chromium with bounded runtime and useful failure evidence                                                                                                                                                                                                                                     |
| Implementation work | Add Firefox and WebKit projects deliberately; classify browser-specific exclusions rather than hiding failures; configure CI environment provisioning, protected secrets, application readiness, artifact upload, retries, timeout budgets, and failure annotations; compare local and CI base URL/auth/data contracts |
| Verification        | Future: run the CI command on a clean runner; run each browser project selectively; verify reports, traces, screenshots, and videos are retained for failures; measure runtime over repeated runs                                                                                                                      |
| Exit criteria       | CI is the same logical suite as local, browser failures are actionable, artifacts are available, and runtime stays within the agreed budget                                                                                                                                                                            |
| Deliverable         | CI workflow, browser matrix, artifact retention policy, and runbook for failed builds                                                                                                                                                                                                                                  |

### Phase 8 - Maintenance and Coverage Growth

| Gate                | Definition                                                                                                                                                                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective           | Keep E2E coverage aligned with product behavior without turning every route into an end-to-end test                                                                                                                                                                               |
| Entry criteria      | CI smoke/workflow gates have stable ownership and reporting                                                                                                                                                                                                                       |
| Implementation work | Add tests by business risk; review route and selector changes with affected specs; remove redundant tests; track flake rate, runtime, and failure causes; update fixtures when schema or permission rules change; use lower-level tests for logic that does not require a browser |
| Verification        | Future: review the status checklist each release; sample failed runs and flaky-test history; confirm new features have a chosen test layer and owner                                                                                                                              |
| Exit criteria       | Coverage growth is risk-driven, stale tests are removed promptly, and maintenance cost is visible rather than hidden in retries                                                                                                                                                   |
| Deliverable         | Living coverage map, ownership list, flake/runtime dashboard or report, and release checklist                                                                                                                                                                                     |

## Next Slice

Implement only this slice next:

1. **Auth contract:** make `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` canonical in setup and align `auth.spec.ts`; document any temporary fallback and its removal point.
2. **Data contract:** choose the dedicated E2E organization/branch/account and define how it is created or reset. Resolve the current `db.seed.enabled=false` gap without relying on a developer's database.
3. **Smoke readiness:** fix the import route reference to `/admin/products/bulk`, then prepare one public smoke and one admin navigation smoke for a future focused run.
4. **Readiness review:** confirm credentials, base URL, data, generated auth path, and cleanup ownership before executing those focused checks.

Do not run the full suite immediately. Existing POS, quote, and import coverage still has known route, assertion, wait, and shared-data risks.

## Reliability Acceptance Criteria

Call the suite reliable only when every item below is true:

- [ ] No stale routes or selectors remain; the import flow targets `/admin/products/bulk`.
- [ ] Admin authentication is generated by setup for the current run; no tracked or hand-edited storage state is required.
- [ ] Credentials use the canonical E2E names and are supplied through protected environment configuration.
- [ ] Local and CI environments have reproducible application, Supabase, organization, branch, role, and fixture data.
- [ ] Tests do not depend on a developer's existing records or a previous test's mutations.
- [ ] Created records and side effects are isolated and cleaned up, including partial-failure paths.
- [ ] Assertions prove meaningful user-visible and business outcomes, not merely URL changes or successful clicks.
- [ ] Waits are bounded and state-based; arbitrary hard waits are absent from critical workflows.
- [ ] Runtime is measured and remains within the agreed CI budget with retries not masking systemic flakiness.
- [ ] Failure artifacts are published and sufficient to diagnose browser, application, data, and auth failures.
- [ ] Local and CI runs use the same logical projects, credentials contract, base URL rules, and data assumptions.
- [ ] Chromium is stable before Firefox/WebKit are added, and browser-specific behavior is explicit.

## Risks and Mitigations

| Risk                                            | Impact                                                   | Mitigation                                                                             |
| ----------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Shared or mutable E2E data                      | Order-dependent failures and false positives             | Dedicated data ownership, run-scoped identifiers, cleanup, and contamination checks    |
| Auth account loses admin access or expires      | Setup failure blocks all admin coverage                  | Validate account/role before browser work and manage it as an E2E fixture              |
| Preview environment differs from local          | Green local runs do not predict CI/preview behavior      | Explicit `PLAYWRIGHT_BASE_URL`, documented provisioning, and parity checks             |
| UI routes/selectors change without test updates | Stale tests fail late or, worse, assert the wrong screen | Keep route smoke current and review impacted specs with navigation changes             |
| Hard waits and weak assertions                  | Flaky tests and false confidence                         | Locator/state waits plus outcome and persisted-state assertions                        |
| Disabled database seed path                     | New environments start incomplete                        | Choose and automate an explicit fixture/seed lifecycle before workflow expansion       |
| CI retries hide flakiness                       | Slow, misleading release signal                          | Track retry rate and quarantine only with an owner and removal criterion               |
| Cross-browser differences                       | Browser-specific regressions remain invisible            | Add browser projects after Chromium reliability and classify intentional differences   |
| Credentials or generated state leak             | Security exposure                                        | Protected CI secrets, ignored local files, no storage-state commits, and redacted logs |

## Non-Goals

- Proving the current suite by running it as part of this documentation change.
- Running Playwright, test, seed, reset, or database commands while creating this roadmap.
- Covering every admin route or every UI permutation in one pass.
- Replacing unit, integration, API, security, or database tests with browser tests.
- Using production data, production credentials, or destructive database resets for E2E.
- Adding a custom test framework, abstraction layer, or new dependency before the existing Playwright setup demonstrates a concrete need.
- Treating retries, screenshots, or test counts as evidence of correctness without deterministic data and meaningful assertions.

## Update Checklist

Update this table after each roadmap slice or release review.

| Check                                  | Owner | Status                       | Evidence/date                            |
| -------------------------------------- | ----- | ---------------------------- | ---------------------------------------- |
| Phase 1 configuration reviewed         |       | [x] Complete with follow-ups | Local implementation; no suite execution |
| Deterministic auth/data contract       |       | [ ] Not started              |                                          |
| Public smoke gate                      |       | [ ] Not started              |                                          |
| Authenticated navigation smoke         |       | [ ] Not started              |                                          |
| Critical workflow assertions/routes    |       | [ ] Not started              |                                          |
| Isolation and cleanup                  |       | [ ] Not started              |                                          |
| CI artifacts and runtime budget        |       | [ ] Not started              |                                          |
| Firefox/WebKit coverage                |       | [ ] Not started              |                                          |
| Maintenance ownership and flake review |       | [ ] Not started              |                                          |

## Related Documentation

- `docs/07-testing/E2E_TESTING.md` - existing Playwright setup and command reference; update it when the environment contract changes.
- `docs/07-testing/TESTING_GUIDE.md` - module-level testing terminology and critical business flows.
- `docs/07-testing/PLAN_TESTING_IMPLEMENTATION.md` - earlier testing implementation context.
- `docs/07-testing/README.md` - testing documentation index.
- `playwright.config.ts` - current project, environment, web server, and artifact configuration.
- `e2e/global.setup.ts` - current UI-based admin authentication setup.
- `supabase/config.toml` - current local seed setting and database configuration.
