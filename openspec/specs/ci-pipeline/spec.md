# CI Pipeline Specification

## Purpose

Automated quality gates for pushes to `main` and pull requests targeting `main`. Every change MUST pass lint, type-check, test, and build before merging. E2E tests run conditionally on PRs.

## Requirements

### Requirement: CI Workflow Execution

A GitHub Actions workflow MUST run on push to `main` and on pull requests targeting `main`. It MUST execute these steps sequentially on `ubuntu-latest` with Node 20.x:

1. `npm ci --ignore-scripts` (clean install, skip husky prepare)
2. `npm run lint`
3. `npm run type-check`
4. `npm run test:ci`
5. `npm run build`

The workflow MUST cache `~/.npm` for faster subsequent runs. Build artifacts MUST NOT be deployed.

#### Scenario: Happy path — all steps pass on PR

- GIVEN a pull request targeting `main` with valid code
- WHEN the CI workflow triggers
- THEN all five steps execute in order
- AND each step reports success via GitHub Checks API

#### Scenario: Lint failure blocks the pipeline

- GIVEN a pull request targeting `main` with lint violations
- WHEN the CI workflow runs
- THEN the `lint` step fails
- AND subsequent steps (`type-check`, `test:ci`, `build`) are skipped
- AND the PR status shows a failing check

#### Scenario: Build failure on push to main

- GIVEN a push to `main` with code that fails `next build`
- WHEN the CI workflow runs
- THEN the `build` step fails
- AND the commit shows a failing status

#### Scenario: Dependency install with broken husky

- GIVEN the project has no `.husky/` directory and husky `prepare` would crash
- WHEN `npm ci --ignore-scripts` runs
- THEN the install completes successfully
- AND subsequent steps execute normally

### Requirement: Conditional E2E Workflow

A Playwright E2E workflow SHOULD run only on pull requests targeting `main` and MUST depend on the CI workflow passing first. It SHOULD use the Vercel preview deployment URL as the base URL. If the Vercel preview URL is unavailable, E2E MUST be skipped gracefully.

#### Scenario: E2E runs on PR targeting main

- GIVEN a PR targeting `main` with CI passing
- WHEN the E2E workflow triggers
- THEN it extracts the Vercel preview URL from the deployment
- AND runs Playwright tests against that URL
- AND reports results as a PR check

#### Scenario: E2E skipped when Vercel preview unavailable

- GIVEN a PR targeting `main` with CI passing
- AND no Vercel preview URL is available
- WHEN the E2E workflow triggers
- THEN it skips the Playwright run with a clear log message
- AND does NOT report a failure

#### Scenario: E2E skipped on non-main PR

- GIVEN a pull request targeting a branch other than `main`
- WHEN the workflow evaluates the condition
- THEN the E2E job is not scheduled

### Requirement: Branch Protection Conventions

The project MUST document branch protection conventions for `main`: require CI status checks to pass before merging, require PRs for all changes, and prevent direct pushes.

#### Scenario: Protection rules are documented

- GIVEN a developer setting up branch protection in GitHub UI
- WHEN they consult the project documentation
- THEN they find clear guidance on required checks and PR requirements

### Requirement: Secrets & Security

Workflow files MUST NOT hardcode secrets. All sensitive values MUST use GitHub Secrets (`${{ secrets.* }}`). The `--ignore-scripts` flag MUST be used on `npm ci` to prevent the broken husky `prepare` hook from failing the build.

#### Scenario: Secrets loaded from GitHub Secrets

- GIVEN a workflow step that needs an API token
- WHEN the step references `secrets.*`
- THEN the value is resolved from the repository's Secrets configuration
- AND never appears in workflow logs or files
