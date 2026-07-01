# Apply Progress — webhook-signature-verification

**Mode**: Strict TDD
**PR boundary**: PR 2 of 2 — stacked-to-main (branch: feat/webhook-signature-verification-resend-flow)
**Delivery strategy**: auto-chain

## Completed Tasks

- [x] 2.1 — Add Svix signature verification to Resend webhook (src/app/api/webhooks/resend/route.ts)
- [x] 2.2 — Make Flow signature verification mandatory in production (src/lib/payments/flow/gateway.ts)
- [x] 2.3 — Add Resend webhook tests (src/**tests**/unit/webhooks/resend-webhook.test.ts)
- [x] 2.4 — Add Flow mandatory signature tests (src/**tests**/unit/lib/payments/flow-gateway.test.ts)
- [x] 2.5 — RESEND_WEBHOOK_SECRET in .env.example (already present)

## TDD Cycle Evidence

| Task      | Test File              | Layer | Safety Net        | RED                     | GREEN             | TRIANGULATE             | REFACTOR |
| --------- | ---------------------- | ----- | ----------------- | ----------------------- | ----------------- | ----------------------- | -------- |
| 2.1 + 2.3 | resend-webhook.test.ts | Unit  | ✅ 6/7 baseline   | ✅ Written              | ✅ Passed (7/7)   | ✅ 4+ cases             | ✅ Clean |
| 2.2 + 2.4 | flow-gateway.test.ts   | Unit  | ✅ 10/10 baseline | ✅ Written (prod throw) | ✅ Passed (12/12) | ✅ 2 cases (prod + dev) | ✅ Clean |

## Test Summary

- **Total tests written**: 9 (7 resend + 2 flow)
- **Total tests passing**: 19 (7 new + 12 existing)
- **Layers used**: Unit (19)
- **Approval tests**: None — new behavior, no refactoring

## Key Discoveries

- `vi.fn(() => ({...}))` with arrow function cannot be used with `new` — arrow functions aren't constructors. Must use `vi.fn(function() {...})` for constructor mocks.
- `request.clone().text()` in jsdom/vitest environment caused issues with subsequent `request.json()`. Switched to single `request.text()` + `JSON.parse()` for cleaner body handling.

## Deviations from Design

- Refactored Resend route to read body once (text→JSON.parse) instead of clone().text()→json() to fix test environment body consumption issue.
- No other deviations.

## Files Changed

| File                                                 | Action   | What Was Done                                              |
| ---------------------------------------------------- | -------- | ---------------------------------------------------------- |
| src/app/api/webhooks/resend/route.ts                 | Modified | Added Svix signature verification, refactored body reading |
| src/lib/payments/flow/gateway.ts                     | Modified | Made signature verification mandatory in production        |
| src/**tests**/unit/webhooks/resend-webhook.test.ts   | Created  | Unit tests for Resend webhook Svix verification            |
| src/**tests**/unit/lib/payments/flow-gateway.test.ts | Modified | Added mandatory signature tests                            |

## Commits

1. `2a642c4` chore(deps): add svix package for Resend webhook verification
2. `250d61c` feat(resend): add Svix webhook signature verification
3. `a7696a9` fix(flow): make HMAC signature mandatory in production
