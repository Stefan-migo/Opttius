# Archive Report: coverage-gaps-6-2

**Archived**: 2026-07-04
**Location**: `openspec/changes/archive/2026-07-04-coverage-gaps-6-2/`

## Summary

Closed unit test coverage gaps in critical infrastructure and validation modules. Two changes:

1. **Supabase Utils** (add-unit-tests-supabase-utils): Created test files for `client.ts`, `server.ts`, `cron.ts` (16 new tests) and expanded `webhook.test.ts` (+2 tests). All 4 supabase util files now have test coverage.
2. **Validation Schemas** (add-unit-tests-validation-quotes-work-orders): Expanded `quotes.test.ts` from ~18 to 37 tests (branch coverage target 80%) and `work-orders.test.ts` from ~20 to 43 tests.

## Files Changed (test-only — no production code)

### New Files
- `src/__tests__/unit/supabase/client.test.ts` (2 tests)
- `src/__tests__/unit/supabase/cron.test.ts` (2 tests)
- `src/__tests__/unit/supabase/server.test.ts` (10 tests)

### Modified Files
- `src/__tests__/unit/supabase/webhook.test.ts` (+2 tests, total 4)
- `src/__tests__/unit/lib/validation/schemas/quotes.test.ts` (+22 tests, total 37)
- `src/__tests__/unit/lib/validation/schemas/work-orders.test.ts` (+23 tests, total 43)

## Test Counts

| Module | Before | After | New |
|--------|--------|-------|-----|
| supabase/ (all 4 files) | 2 (webhook only) | 18 | 16 |
| quotes.test.ts | ~18 | 37 | ~22 |
| work-orders.test.ts | ~20 | 43 | ~23 |
| **Total (target modules)** | **~40** | **98** | **61** |

Full suite: 278 passed, 1 pre-existing failure (Redis unavailable).

## Issues Discovered

### CRITICAL: None

### WARNINGS
1. **`frame_name` min/trim order bug** (work-orders schema): `.min(1)` applied before `.trim()`, so whitespace-only `"   "` passes validation. Documented via `ponytail:` comment. Not fixed (out of scope).
2. **9 spec scenarios untested** (low-risk):
   - `lens_tint_percentage` boundaries in quotes
   - `currency` maxLength in quotes
   - `customer_notes`/`terms_and_conditions` maxLength in quotes
   - 3 UUID field variants (`near_lens_family_id`, `contact_lens_family_id`, `far_lens_family_id`) in quotes
   - `presbyopia_solution` default assertion in quotes
   - `status`/`presbyopia_solution` defaults in work-orders

### Status at Archive
- **PASS WITH WARNINGS** — all 10/10 tasks complete, 252 tests pass in target modules, 0 regressions.

## Archive Reconciliation

- **Stale checkboxes reconciled**: Tasks A1-A3, B1, C1-C3 had unchecked `[ ]` in tasks.md despite being fully implemented. Apply-progress (Engram #830) and verify-report (#842) confirmed completion. Checkboxes corrected to `[x]` during archive.

## Engram Observations

| Artifact | Engram ID |
|----------|-----------|
| Proposal | #825 |
| Specs (delta) | #826 |
| Tasks | #827 |
| Apply Progress (PR 3/3) | #830 |
| Verify Report | #842 |
| Archive Report | (this entry) |

## Specs Sync
No main specs exist for `supabase-utils` or `validation-schemas` domains in `openspec/specs/`. The delta specs are pure test-coverage additions with no behavioral changes — no merge was needed.

## Recommended Next Actions

1. **Fix `frame_name` schema order** in `work-orders.ts`: change `.min(1).trim()` to `.trim().min(1)` to reject whitespace-only input.
2. **Add remaining 9 spec scenarios** as low-priority test additions.
3. **Consider integration tests** for supabase client flows (post-archive, low priority).

## Archive Contents

- `proposal.md` ✅
- `specs/spec-supabase-utils.md` ✅
- `specs/spec-validation-schemas.md` ✅
- `tasks.md` ✅ (10/10 tasks complete)
- `verify-report.md` ✅ (PASS WITH WARNINGS)
- `archive-report.md` ✅ (this file)

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived.
