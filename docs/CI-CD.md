# CI/CD Conventions

## Branch Protection

The `main` branch requires branch protection rules configured in the GitHub UI.

### Required Checks

| Check                      | Workflow                 | Required          |
| -------------------------- | ------------------------ | ----------------- |
| `Lint & Type-check & Test` | `ci.yml` — `quality` job | ✅ Always         |
| `E2E (PRs to main only)`   | `ci.yml` — `e2e` job     | ✅ When triggered |

### Rules

- **Pull request required** — every change to `main` must go through a PR.
- **No direct pushes** — `main` is write-protected. All pushes happen via PRs.
- **`quality` must pass** — lint, type-check, and tests must succeed before merge.
- **E2E runs only on PRs targeting `main`** — the `e2e` job is conditional on `github.base_ref == 'main'`.
- **E2E requires Vercel preview** — the job fetches the Vercel preview URL from deployment statuses. If no preview URL is available, E2E is skipped gracefully (not a failure).

## Workflow Overview

### `ci.yml` — Full CI pipeline

Triggered on push to `main` or PR targeting `main`.

1. `quality` job (always runs): lint → type-check → test → build
2. `e2e` job (PR → main only, depends on `quality`): fetch Vercel preview URL → run Playwright if available

### `pr-checks.yml` — Fast PR feedback

Triggered on any PR (any branch). Runs lint and type-check only — a lightweight subset for quick feedback.

## Vercel Integration

E2E tests run against the Vercel preview deployment. The workflow:

1. Queries the GitHub Deployments API for a deployment with environment `Preview` matching the commit SHA.
2. Checks for a deployment status with state `success` or `ready`.
3. Extracts `environment_url` as `PLAYWRIGHT_BASE_URL`.
4. Sets `PLAYWRIGHT_SKIP_WEBSERVER=1` to prevent Playwright from falling back to a local server.
5. If no preview URL is found, the E2E step is skipped — the job exits cleanly, not as a failure.

## Adding or Changing Checks

1. Edit `.github/workflows/ci.yml` or `.github/workflows/pr-checks.yml`.
2. Update this document if the change affects required checks or branch protection rules.
3. Update the branch protection rules in the GitHub UI (Settings → Branches) if adding/removing required checks.
