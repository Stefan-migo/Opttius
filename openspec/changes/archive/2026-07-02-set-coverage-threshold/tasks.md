# Tasks: Set Vitest Coverage Thresholds

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~10–15 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Add coverage thresholds to `vitest.config.ts` | PR 1 | Single file, ~10–15 lines, one logical change |

## Phase 1: Configuration

- [ ] 1.1 Add `thresholds` block under `coverage` in `vitest.config.ts` with `lines: 50`, `branches: 40`, `functions: 45`, `statements: 50`

## Phase 2: Verification

- [ ] 2.1 Run `vitest run --coverage` and confirm exit 0
- [ ] 2.2 Verify threshold violation appears when coverage drops below set values (e.g., temporarily lower a threshold to test the error message)
