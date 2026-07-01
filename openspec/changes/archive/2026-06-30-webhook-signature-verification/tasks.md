# Tasks: Webhook Signature Verification

## Review Workload Forecast

| Field                   | Value                                      |
| ----------------------- | ------------------------------------------ |
| Estimated changed lines | ~245 (PR 1: ~125, PR 2: ~120)              |
| 400-line budget risk    | Low                                        |
| Chained PRs recommended | Yes                                        |
| Suggested split         | PR 1: PayPal → PR 2: Resend + Flow + tests |
| Delivery strategy       | auto-chain                                 |
| Chain strategy          | stacked-to-main                            |

```
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low
```

### Suggested Work Units

| Unit | Goal                                  | Likely PR | Notes                                                                      |
| ---- | ------------------------------------- | --------- | -------------------------------------------------------------------------- |
| 1    | PayPal webhook signature verification | PR 1      | Base = main; includes gateway function, route wiring, tests                |
| 2    | Resend + Flow mandatory signature     | PR 2      | Base = main (independent of PR 1); includes Svix verify, Flow guard, tests |

## PR 1: PayPal Webhook Signature (~125 lines)

- [x] 1.1 Add `svix` dep and `PAYPAL_WEBHOOK_ID`/`RESEND_WEBHOOK_SECRET` to `package.json` and `.env.local`
- [x] 1.2 Add `validateWebhookSignature(rawBody, headers)` module-level function + cert URL cache Map in `src/lib/payments/paypal/gateway.ts`
- [x] 1.3 Update `src/app/api/webhooks/paypal/route.ts` — read raw body via `request.text()`, call `validateWebhookSignature()` before `processWebhookEvent`, return 401 on failure
- [x] 1.4 Remove `describe.skip` on `validateWebhookSignature` in paypal-gateway.test.ts — add real tests: success, invalid sig, API-down (mock global.fetch)
- [x] 1.5 Remove `describe.skip` on integration test in paypal.test.ts — update mocks to include validation step

## PR 2: Resend + Flow Mandatory Signature (~120 lines)

- [x] 2.1 Update `src/app/api/webhooks/resend/route.ts` — read raw body, verify via `new Webhook(RESEND_WEBHOOK_SECRET).verify(rawBody, headers)`, return 401 on failure; skip in dev when secret missing
- [x] 2.2 Update `src/lib/payments/flow/gateway.ts` — replace `if (signature)` guard with mandatory check: fail in production when s missing, warn-skip in dev
- [x] 2.3 Create `src/__tests__/unit/lib/payments/resend-webhook.test.ts` — Svix tests: valid sig, missing header, invalid sig, missing secret in dev
- [x] 2.4 Add missing signature tests in flow-gateway.test.ts — missing sig in production → throw, missing sig in dev → warn and process
