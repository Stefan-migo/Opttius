# Proposal: Set Vitest Coverage Thresholds

## Intent

Prevent coverage regression by establishing a baseline threshold in vitest config. Currently coverage is gathered but never enforced — nothing prevents a PR from dropping coverage. This sets a low floor that passes today, then can be raised iteratively.

## Scope

### In Scope
- Add `thresholds` block under `coverage` in `vitest.config.ts`
- Set global thresholds at 50% lines, 40% branches, 45% functions, 50% statements
- Each threshold has ~9% buffer below current numbers

### Out of Scope
- Adding `--coverage` to CI (`test:ci`) — follow-up change
- Fixing uncovered files (security, redis, rate-limiting, etc.)
- Per-module or per-file thresholds — global only
- Updating `openspec/config.yaml` `coverage_threshold` — that field is for verify-phase gate, unrelated to vitest thresholds

## Capabilities

### New Capabilities
None — config-only change, no business capability introduced.

### Modified Capabilities
None — no spec-level behavior changes.

## Approach

Add a `thresholds` object inside the existing `coverage` config in `vitest.config.ts`:

```ts
thresholds: {
  lines: 50,
  branches: 40,
  functions: 45,
  statements: 50,
},
```

These pass current coverage (lines 59.93%, branches 49.23%, functions 54.45%, statements 58.77%). The ~9% buffer absorbs minor fluctuations without breaking `vitest run --coverage`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `vitest.config.ts` | Modified | Add `thresholds` under `coverage` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Threshold too high breaks `vitest run --coverage` | Low | Set at ~9% below current numbers — verified they pass |
| Devs unaware thresholds exist, surprised by failures | Low | Thresholds are low enough to pass; communicate in team standup |
| Future code drops coverage below threshold | Medium | That's the intent — catch it in local dev before CI |

## Rollback Plan

Revert the single `thresholds` block addition in `vitest.config.ts`. One-line removal, zero functional impact.

## Dependencies

None.

## Success Criteria

- [ ] `vitest run --coverage` exits 0 after applying thresholds
- [ ] `vitest run --coverage` output shows threshold violations if coverage drops below 50/40/45/50
