# Proposal: fix-core-functionality-test

## Intent

52 vitest worker crashes make the test suite unreliable, 20 test blocks stay skipped from past SDD cycles, and 2 placeholder assertions pass without validation. This blocks CI trust, slows development, and masks regressions.

## Scope

### In Scope
- **Infra**: vitest pool/worker config (`pool: 'forks'`, `maxWorkers: 3`), per-environment (`node` vs `jsdom`), delete duplicate `src/tests/security/phase2-security.test.ts`, delete corrupt root-level file
- **Group A skipped tests** (5 blocks): fix inline assertion updates for InsightCard, schemas, generator, insights-generation, template-variables
- **Placeholder assertions** (2): replace `expect(true).toBe(true)` in tier-config and phase1-security
- **Import timeout reduction**: `.import.test.tsx` 30s → 10s (3 files)

### Out of Scope
- Groups B+D (12 skipped blocks) — deferred to follow-up change
- Large test file splitting (`.char.test.ts` files)
- Mock-that-tests-itself patterns in service tests
- Full `expect.any()` audit across all 28 instances

## Capabilities

### New Capabilities
None — no new spec-level capabilities are introduced.

### Modified Capabilities
None — pure test-infrastructure and test-repair work. No spec-level behavior changes.

## Approach

1. **Infrastructure**: `pool: 'forks'`, `maxWorkers: 3`, per-environment config in `vitest.config.ts`. Delete duplicate + corrupt files. All 52 crashes addressed at source.
2. **Assertion fixes**: Fix Group A (5 blocks) and placeholders (2). Reduce import test timeouts.
3. **Opportunistic tightening**: Replace `expect.any(String/Number)` with specific values in files already touched for Group A.

## Affected Areas

| Area | Impact |
|------|--------|
| `vitest.config.ts` | Modified — pool, workers, per-env config |
| `src/tests/security/phase2-security.test.ts` | Deleted — duplicate |
| Corrupt root-level file | Deleted — encoding damage |
| 5 Group A test files | Modified — fix skipped assertions |
| 2 placeholder test files | Modified — real validation |
| 3 `.import.test.tsx` files | Modified — timeout 30s → 10s |

## Risks

| Risk | Mitigation |
|------|------------|
| Pool config doesn't fix all 52 crashes | Document remaining OOM for follow-up change |
| Fixed skipped tests fail on current code | Verify each fix; rollback per file |
| `node` env breaks jsdom-reliant tests | Only pure-util tests use `node` |

## Rollback Plan

- Config: `git checkout vitest.config.ts`
- Deleted files: `git checkout <path>`
- Assertion changes: `git checkout` per file — each is independent

## Dependencies

None — all changes are self-contained (config + test file edits).

## Success Criteria

- [ ] Zero worker crashes on full `npx vitest run --reporter=verbose`
- [ ] All 5 Group A skipped tests pass (previously `.skip`)
- [ ] Both placeholder assertions pass with real validation
- [ ] Duplicate + corrupt files deleted without breaking test discovery
- [ ] `.import.test.tsx` files complete in under 15s each
