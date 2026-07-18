# Proposal: Fix Complex Skipped Blocks

## Intent

Fix 3 test blocks that were skipped during earlier phases due to complexity — analytics AI tools, security monitoring, and Flow payment webhooks. These tests were deferred as "later" debt and now block full test suite confidence (67 tests still skipped overall).

## Scope

### In Scope
- Block 1 — `analytics_tools.test.ts`: Clean mock setup per tool, add `organizationId` to context
- Block 2 — `phase2-security.test.ts`: Extract helpers, fix `logEvent` signatures (3-arg), dynamic severity assertions, remove magic numbers
- Block 3 — `flow.test.ts`: Rewrite mocks following `paypal.test.ts` pattern, fix route path assertions

### Out of Scope
- Other 67 skipped tests across the suite
- Fauna media test files
- Adding new test coverage beyond these 3 files
- Modifying production code

## Capabilities

### New Capabilities
None — test-only change, no new spec-level capabilities.

### Modified Capabilities
None — no requirements change at the spec level.

## Approach

1. **Block 1 (analytics_tools)**: Model mock setup after passing AI tool tests. Ensure `organizationId` in context. Clean per-tool mocks, remove competing mock strategies.
2. **Block 2 (phase2-security)**: Extract shared helpers for logEvent, severity assertions, alert checks. Fix all `logEvent(...)` calls to 3-arg signature. Replace magic numbers with named constants. Use dynamic severity assertions.
3. **Block 3 (flow.test)**: Rewrite mocks targeting actual module paths. Update route assertions to match real response shape and HTTP methods. Follow `paypal.test.ts` patterns.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/__tests__/unit/lib/ai/tools/analytics_tools.test.ts` | Modified | Fix mock setup, add org ID |
| `src/__tests__/security/phase2-security.test.ts` | Modified | Extract helpers, fix assertions |
| `src/__tests__/integration/api/webhooks/flow.test.ts` | Modified | Rewrite mocks, fix route asserts |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| False positives (tests pass but assert wrong thing) | Low | Review assertions match actual behavior |
| Flow webhook route shape changed since skip | Low | Read actual route handlers before fixing |

## Rollback Plan

`git revert` the merge commit. If tests introduce false positives or regressions, revert immediately — no production code is affected.

## Dependencies

None — test-only changes, no external dependencies.

## Success Criteria

- [ ] All 3 test blocks execute (not skipped) and pass
- [ ] `npx vitest run` shows 0 failures across full suite
- [ ] No production code modified
