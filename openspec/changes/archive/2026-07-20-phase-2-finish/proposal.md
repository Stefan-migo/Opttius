# Proposal: Phase 2 Finish — Structural Debt (Remaining)

## Intent

Complete Phase 2 of the Production Readiness Roadmap by splitting the top-10 largest non-test files (each > 680 lines, target < 400) and removing duplicate response builders in `src/lib/api/errors.ts` that mirror the standard `response.ts` API.

## Scope

### In Scope

- **2.4** — Split 10 files by extracting cohesive sections into dedicated modules
- **2.5** — Remove 4 dead duplicate functions from `errors.ts`, migrate 1 external caller, update barrel exports

### Out of Scope

- Behavioral changes, logic rewrites, or refactors beyond extraction
- Splitting the remaining 400–680 line files (deferred to future debt cycles)
- Any spec-level capability changes (pure structural refactor)

## Capabilities

**New Capabilities**: None (pure refactor)
**Modified Capabilities**: None (no spec-level behavior changes)

## Approach

| Item    | Approach                                                                                                                                                                                                                                                                                                                                                  | Est. |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| **2.4** | Per file: extract cohesive blocks (types, helpers, sub-components, sub-routes, constants) into co-located `_components/`, `_types/`, `_helpers/` files. Keep orchestrator/entry logic in the original file with re-exports. Target < 400 lines each. Group by pattern: AI tools (3), admin UI components (3), security/payments (2), help/bulk pages (2). | 2-3d |
| **2.5** | Delete `createErrorResponse`, `createSuccessResponse`, `withErrorHandler`, `asyncHandler` from `errors.ts`. Migrate the 1 caller (`src/app/api/admin/users/route.ts`) to use `response.ts` equivalents. Update `errors.test.ts`. Clean barrel exports in `src/lib/api/index.ts`.                                                                          | 4h   |

## Affected Areas

| Area                                             | Impact   | Description                                       |
| ------------------------------------------------ | -------- | ------------------------------------------------- |
| 10 large files (see findings)                    | Modified | Each extracted, shrunk to < 400 lines             |
| `src/lib/api/errors.ts`                          | Modified | Remove 4 duplicate response builders              |
| `src/lib/api/index.ts`                           | Modified | Clean barrel exports                              |
| `src/app/api/admin/users/route.ts`               | Modified | Migrate `asyncHandler` → `response.ts` equivalent |
| `src/__tests__/unit/lib/api/errors.test.ts`      | Modified | Remove tests for deleted functions                |
| New `_components/`, `_types/`, `_helpers/` files | Created  | Extracted chunks from large files                 |

## Risks

| Risk                                                    | Likelihood | Mitigation                                                                                                      |
| ------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------- |
| Extracted module re-exports miss callers we didn't find | Low        | Grep each export, verify no broken imports post-extraction                                                      |
| `asyncHandler` migration changes error response shape   | Low        | `response.ts` error handling already produces same `{ success, error }` shape — verify with existing test suite |

## Rollback Plan

- **2.4**: Revert each split file via `git checkout -- <file>` — no data/schema impact
- **2.5**: Restore `errors.ts` + `index.ts` + `route.ts` + test file from git
- Full rollback: `git revert <merge-commit>` — all changes isolated to `src/`

## Dependencies

- None (pure refactor of existing code)

## Success Criteria

- [ ] Each of the 10 target files < 400 lines after extraction
- [ ] `createErrorResponse`, `createSuccessResponse`, `withErrorHandler`, `asyncHandler` no longer defined in `errors.ts`
- [ ] `grep -r "from.*errors.*import.*(createErrorResponse|createSuccessResponse|withErrorHandler)" src/` returns 0 results
- [ ] `src/app/api/admin/users/route.ts` imports responses from `response.ts` (not `errors.ts`)
- [ ] All existing tests pass, build succeeds
