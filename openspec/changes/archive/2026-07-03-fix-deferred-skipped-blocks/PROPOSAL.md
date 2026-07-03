# Proposal: fix-deferred-skipped-blocks

## Intent

Re-enable 7 test blocks skipped during the initial `fix-core-functionality-test` pass. These are simple/medium assertion mismatches, mock updates, and import path fixes. Delete 1 test file whose modules are speculative (phase3-security).

## Scope

### In Scope
- Fix 7 skipped test blocks (2 simple: useQuoteForm, useAvailability; 5 medium: phase1-security, useScheduleSettings, AppointmentDetails, CustomerSelection, nowpayments)
- Delete `phase3-security.test.ts` permanently
- Remove `// ponytail: skipped` comments from fixed files

### Out of Scope
- 3 complex blocks deferred: analytics_tools, phase2-security, flow.test
- No source code changes
- No broader test refactoring

## Capabilities

None — pure test fix. No spec-level behavior changes.

## Approach

Per-block fix from exploration analysis:

| # | File | Fix |
|---|------|-----|
| 5 | `useQuoteForm.test.ts` | Add `customer_own_near_frame: false` to expected `toEqual()` |
| 9 | `useAvailability.test.ts` | Unskip — add missing mock fields if needed |
| 2 | `phase1-security.test.ts` | Fix `isRateLimited` return assertion + mock order |
| 6 | `useScheduleSettings.test.ts` | Update mock data, auth context, header format |
| 7 | `AppointmentDetails.test.tsx` | Fix selectors for shadcn/ui Select + portal |
| 8 | `CustomerSelection.test.tsx` | Update toggle expectations + search threshold |
| 11 | `nowpayments.test.ts` | Add `vi.mock` for subpath imports + webhook client |

Delete:

| # | File | Action |
|---|------|--------|
| 4 | `phase3-security.test.ts` | Remove file (speculative modules) |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/admin/CreateQuoteForm/__tests__/useQuoteForm.test.ts` | Modified | Add missing field to expected object |
| `src/components/admin/CreateAppointmentForm/__tests__/useAvailability.test.ts` | Modified | Unskip, add mock fields |
| `src/__tests__/security/phase1-security.test.ts` | Modified | Fix assertion + mock order |
| `src/components/admin/CreateAppointmentForm/__tests__/useScheduleSettings.test.ts` | Modified | Update mock data + auth + headers |
| `src/components/admin/CreateAppointmentForm/__tests__/AppointmentDetails.test.tsx` | Modified | Fix query selectors for Radix Select |
| `src/components/admin/CreateAppointmentForm/__tests__/CustomerSelection.test.tsx` | Modified | Update toggle + threshold assertions |
| `src/__tests__/integration/api/webhooks/nowpayments.test.ts` | Modified | Add missing mocks |
| `src/__tests__/security/phase3-security.test.ts` | Deleted | Remove permanently |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Mock/import iteration per file | High | Run tests after each fix; revert single file if stuck |

## Rollback Plan

Revert the commit. All changes are test-only with zero production impact.

## Dependencies

None.

## Success Criteria

- [ ] All 7 unskipped test blocks pass
- [ ] `phase3-security.test.ts` deleted
- [ ] No remaining `ponytail: skipped` comments in touched files
