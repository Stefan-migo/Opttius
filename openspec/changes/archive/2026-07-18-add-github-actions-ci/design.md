# Design: Add GitHub Actions CI

## Technical Approach

Modify the existing `.github/workflows/ci.yml` (from previous `setup-ci-pipeline` cycle) to fix three gaps: (1) add `--ignore-scripts` for broken husky, (2) add `npm run build` step, (3) make E2E conditional on PRs targeting `main` using Vercel preview URL. Document branch protection conventions in `docs/CI-CD.md`. The existing `pr-checks.yml` stays untouched — it's a fast subset for quick PR feedback.

## Architecture Decisions

### Decision: Modify existing ci.yml vs create new

| Option          | Tradeoff                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------- |
| Modify existing | Diff is ~20 changed lines. Preserves existing patterns (caching, concurrency, env vars). |
| Create new      | Duplicates 80% of existing file. Breaks PR history.                                      |

**Choice**: Modify existing `.github/workflows/ci.yml`. The skeleton is correct — only needs targeted fixes.

### Decision: Single workflow vs split CI/E2E

| Option               | Tradeoff                                                                  |
| -------------------- | ------------------------------------------------------------------------- |
| Single file (modify) | E2E depends on `needs: [quality]`. One status check group. ~15 line diff. |
| Split files          | Separate PR checks. More files, more maintenance.                         |

**Choice**: Single file, E2E as second job with `needs: [quality]`. The existing structure already has both jobs — splitting adds zero value for a 2-person team.

### Decision: Vercel preview URL for E2E

| Option                                        | Tradeoff                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| GitHub API via `github-script`                | Zero new deps. Official action. Queries Deployments API for `environment_url`. |
| Community action (e.g., `vercel-preview-url`) | Convenient but third-party risk.                                               |
| Keep Playwright webServer                     | Works but doesn't test actual deployment.                                      |

**Choice**: `actions/github-script@v7` to fetch the Vercel preview URL from deployment statuses. If unavailable → skip E2E with clear log message. This satisfies the spec's "SHOULD use Vercel URL, MUST skip gracefully."

### Decision: Branch protection docs location

| Option          | Tradeoff                                         |
| --------------- | ------------------------------------------------ |
| `docs/CI-CD.md` | One file. Alongside existing docs. Easy to find. |
| In-repo ADR     | Overkill for 5 conventions.                      |
| GitHub wiki     | Separate from code. Drifts.                      |

**Choice**: `docs/CI-CD.md`. Single source of truth in the repo.

## Data Flow

```
Push to main / PR to main
        │
        ▼
  ┌──────────────────────────┐
  │ Job: quality (always)    │
  │  1. checkout             │
  │  2. setup-node@v4 (20)   │
  │  3. npm ci --ignore-scripts│
  │  4. Cache .next/cache    │
  │  5. npm run lint         │
  │  6. npm run type-check   │
  │  7. npm run test:ci      │
  │  8. npm run build        │
  └───────────┬──────────────┘
              │ if: github.base_ref == 'main'
              ▼
  ┌──────────────────────────┐
  │ Job: e2e (PR→main only)  │
  │  1. checkout             │
  │  2. Fetch Vercel preview │
  │     URL via GitHub API   │
  │  3. If URL: run PW       │
  │     If none: skip ✓      │
  └──────────────────────────┘
```

### Vercel URL extraction flow

```
github.rest.repos.listDeployments({ sha, environment:'preview' })
  → filter state === 'success' or 'ready'
  → extract environment_url
  → set as PLAYWRIGHT_BASE_URL + PLAYWRIGHT_SKIP_WEBSERVER=1
  → if none: echo "No Vercel preview URL" && exit 0
```

## File Changes

| File                       | Action | Description                                                                               |
| -------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml` | Modify | 3 changes: `npm ci --ignore-scripts`, add build step, fix E2E conditional with Vercel URL |
| `docs/CI-CD.md`            | Create | Branch protection conventions (required checks, PR requirement, no direct pushes)         |

## Changes to `.github/workflows/ci.yml`

**Diff summary** (~20 lines changed):

1. Line 36: `npm ci` → `npm ci --ignore-scripts`
2. After test step: add `- name: Build\n run: npm run build`
3. E2E job: replace `continue-on-error: true` with `if: github.base_ref == 'main'` and `needs: [quality]`
4. E2E steps: replace Playwright install+run with Vercel URL fetch + conditional Playwright run

## Testing Strategy

| Layer    | What to Test                 | Approach                                                                  |
| -------- | ---------------------------- | ------------------------------------------------------------------------- |
| CI       | Workflow triggers on push/PR | Push a branch, verify checks appear in GitHub UI                          |
| E2E      | Conditional execution        | Create PR→main (should run E2E), PR→other (should skip)                   |
| Husky    | --ignore-scripts             | Verify `npm ci --ignore-scripts` completes in CI (already proven locally) |
| Rollback | Revert ci.yml                | Delete workflow file → GitHub stops running it immediately                |

## Migration / Rollout

No migration required. The workflow activates as soon as `ci.yml` is on the default branch. Existing PRs will pick it up on next push. Document branch protection in `docs/CI-CD.md` — actual enforcement is manual via GitHub UI settings.

## Open Questions

None. All decisions are resolved.
